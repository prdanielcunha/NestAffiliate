import { useState } from 'react';
import type { Campaign, CreativeAsset, PinterestCreativePack } from '@nestaffiliate/core';
import { nextCampaignVersion } from '@nestaffiliate/core';
import {
  buildPinterestCreativePack,
  versionPinterestCreativePack,
  compactPinText,
} from '@nestaffiliate/creative-engine';
import { db } from '../lib/firebase';
import { detectUnsupportedPinClaims } from '@nestaffiliate/compliance';
import { useI18n } from '../lib/i18n-context';
import { savePinterestCreativePack } from '../services/creativePackRepository';
import { AIImageImport } from './AIImageImport';
import { LocalPinComposer } from './LocalPinComposer';
import { CreativeConceptPicker,templateForConcept } from './CreativeConceptPicker';
import { ImagePromptPanel } from './ImagePromptPanel';
import type { ReferencePreview } from '../services/productReferenceRepository';

function packNarrative(pack:PinterestCreativePack, current:Campaign['currentVersion']['narrative']){
  return {
    ...current,
    headline:pack.copy.headline,
    subheadline:pack.copy.subheadline,
    pinterestTitle:pack.copy.titles[0] ?? current.pinterestTitle,
    description:pack.copy.descriptions[0] ?? current.description,
    disclosure:pack.copy.disclosure,
    altText:pack.copy.altText,
    cta:pack.copy.cta,
  };
}

function directionFromSelected(pack:PinterestCreativePack):PinterestCreativePack{
  const concept=pack.imageConcepts.find((item)=>item.id===pack.recommendedConceptId) ?? pack.imageConcepts[0];
  if(!concept) return pack;
  const scene=concept.sceneProfile;
  return {
    ...pack,
    creativeDirection:{
      ...pack.creativeDirection,
      productCategory:scene.category,
      useCase:scene.useCase,
      sceneType:scene.sceneType,
      roomOrEnvironment:scene.environment,
      visualStyle:scene.style,
      lighting:scene.lighting,
      composition:scene.composition,
      negativeSpace:scene.negativeSpace,
      productPlacement:scene.placement,
    },
  };
}

export function PinterestCreativePackPanel({
  campaign,
  editable,
  onUpdate,
}:{
  campaign:Campaign;
  editable:boolean;
  onUpdate:(campaign:Campaign)=>void;
}){
  const { t, locale }=useI18n();
  const [directionOffset,setDirectionOffset]=useState(0);
  const [saving,setSaving]=useState(false);
  const [saveError,setSaveError]=useState(false);
  const [reference,setReference]=useState<ReferencePreview|null>(null);
  const pack=campaign.currentVersion.creativePack;
  // Saved campaigns may contain old, unverified AI claims. Keep that version
  // in history but never offer the risky copy as an actionable choice.
  const safe=(text:string)=>detectUnsupportedPinClaims(text).length===0;
  const requiresLocalAlternatives=Boolean(pack && (
    pack.copy.descriptions.length<3 || pack.copy.titles.length<3 ||
    pack.copy.descriptions.some(text=>!safe(text)) ||
    pack.copy.titles.some(text=>!safe(text))
  ));
  const localAlternatives=requiresLocalAlternatives?buildPinterestCreativePack({
    organizationId:campaign.organizationId,campaignId:campaign.id,
    campaignVersion:campaign.currentVersion.version,product:campaign.currentVersion.product,
    keyword:campaign.currentVersion.keyword,boardName:campaign.currentVersion.boardName,locale,
  }):null;
  const titleOptions=pack?[...new Set([
    ...pack.copy.titles.filter(safe),...(localAlternatives?.copy.titles??[]).filter(safe)
  ])].slice(0,3):[];
  const copyOptions=pack?[...new Set([
    ...pack.copy.descriptions.filter(safe),...(localAlternatives?.copy.descriptions??[]).filter(safe)
  ])].slice(0,3):[];

  async function persist(nextPack:PinterestCreativePack){
    try{
      if(!db)throw new Error('FIRESTORE_UNAVAILABLE');
      await savePinterestCreativePack(db,campaign.organizationId,nextPack);
      setSaveError(false);
    }catch{
      // A failed save must not be displayed as confirmed synchronization.
      setSaveError(true);
    }finally{
      setSaving(false);
    }
  }

  function createPack(offset=directionOffset, refreshCopy=false){
    if(!editable||saving) return;
    const nextVersion=campaign.currentVersion.version+1;
    const generated=buildPinterestCreativePack({
      organizationId:campaign.organizationId,
      campaignId:campaign.id,
      campaignVersion:nextVersion,
      product:campaign.currentVersion.product,
      keyword:campaign.currentVersion.keyword,
      boardName:campaign.currentVersion.boardName,
      locale,
      existingNarrative:refreshCopy ? undefined : campaign.currentVersion.narrative,
      editorialContext:'Achados do Nest · Pinterest Creative Pack',
      directionOffset:offset,
    });
    // Visual generation does not silently replace already chosen/AI-approved copy.
    const nextPack=!refreshCopy&&pack?{...generated,copy:{...pack.copy,descriptions:copyOptions}}:generated;
    const next=nextCampaignVersion(campaign,{
      creativePack:nextPack,
      creativeAsset:undefined,
      narrative:refreshCopy||!pack?packNarrative(nextPack,campaign.currentVersion.narrative):campaign.currentVersion.narrative,
      boardName:refreshCopy||!pack?nextPack.copy.recommendedBoardName:campaign.currentVersion.boardName,
      template:templateForConcept(nextPack.imageConcepts.findIndex(item=>item.id===nextPack.recommendedConceptId)),
    },refreshCopy?'Pinterest copy refreshed with contextual hooks':offset===0?'Pinterest Creative Pack generated':'Pinterest Creative Pack alternate direction');
    onUpdate(next);
    setSaving(true);
    void persist(nextPack);
  }

  function selectConcept(conceptId:string){
    if(!pack || !editable || saving || pack.recommendedConceptId===conceptId) return;
    const nextVersion=campaign.currentVersion.version+1;
    const nextPack=directionFromSelected(versionPinterestCreativePack(pack,nextVersion,conceptId));
    const chosen=nextPack.imageConcepts.findIndex(item=>item.id===nextPack.recommendedConceptId);
    const next=nextCampaignVersion(campaign,{creativePack:nextPack,creativeAsset:undefined,template:templateForConcept(chosen),narrative:campaign.currentVersion.narrative},'creative concept changed');
    onUpdate(next);
    setSaving(true);
    void persist(nextPack);
  }

  function selectTitle(title:string){
    if(!pack || !editable || saving || !safe(title) || title===campaign.currentVersion.narrative.pinterestTitle) return;
    const nextVersion=campaign.currentVersion.version+1;
    const nextPack=versionPinterestCreativePack(pack,nextVersion);
    const narrative={...campaign.currentVersion.narrative,pinterestTitle:title,headline:compactPinText(title,57)};
    const next=nextCampaignVersion(campaign,{creativePack:nextPack,narrative},'Pinterest title selected');
    onUpdate(next);
    setSaving(true);
    void persist(nextPack);
  }

  function selectDescription(description:string){
    if(!pack || !editable || saving || !safe(description) || description===campaign.currentVersion.narrative.description) return;
    const nextVersion=campaign.currentVersion.version+1;
    const nextPack={...versionPinterestCreativePack(pack,nextVersion),copy:{...pack.copy,descriptions:copyOptions}};
    const narrative={...campaign.currentVersion.narrative,description};
    const next=nextCampaignVersion(campaign,{creativePack:nextPack,narrative},'Pinterest description selected');
    onUpdate(next);
    setSaving(true);
    void persist(nextPack);
  }

  function importAsset(asset:CreativeAsset){
    if(!pack || !editable || saving) return;
    const nextVersion=campaign.currentVersion.version+1;
    const nextPack=versionPinterestCreativePack(pack,nextVersion);
    const selected=nextPack.imageConcepts.find((item)=>item.id===nextPack.recommendedConceptId) ?? nextPack.imageConcepts[0];
    const versionedAsset:CreativeAsset={
      ...asset,
      conceptId:selected?.id,
      promptPackageId:selected?.imagePrompt.id,
    };
    const next=nextCampaignVersion(campaign,{
      creativePack:nextPack,
      creativeAsset:versionedAsset,
      template:campaign.currentVersion.template,
    },'generated image imported');
    onUpdate(next);
    setSaving(true);
    void persist(nextPack);
  }

  if(!pack){
    return <section className="creative-pack-empty">
      <div>
        <p className="eyebrow">{t('pinterestCreativePack')}</p>
        <h2>{t('preparePinTitle')}</h2>
        <p>{t('preparePinBody')}</p>
        <div className="pack-promise">
          <span>3× {t('pinTitles')}</span>
          <span>3× {t('visualConcepts')}</span>
          <span>3× {t('imagePrompts')}</span>
          <span>1000 × 1500 · 2:3</span>
          <span>R$ 0 {t('paidAiRequired')}</span>
        </div>
      </div>
      <button className="button primary prepare-pin-button" disabled={!editable} onClick={()=>createPack(0)}>
        {t('preparePin')}
      </button>
    </section>;
  }

  const selected=pack.imageConcepts.find((item)=>item.id===pack.recommendedConceptId) ?? pack.imageConcepts[0];
  const hasImage=Boolean(campaign.currentVersion.creativeAsset);

  return <section className="pinterest-creative-pack">
    <div className="copy-refresh-bar">
      <p>{locale==='pt-BR'
        ? 'Alternativas locais, sem IA: 3 títulos e 3 descrições baseados no nome do produto. A versão anterior permanece no histórico.'
        : locale==='es'
          ? '¿Textos genéricos? Renueva títulos y descripciones sin perder el historial.'
          : 'Generic copy? Refresh titles and descriptions without losing version history.'}</p>
      <button type="button" className="button secondary" disabled={!editable || saving}
        onClick={()=>createPack(directionOffset,true)}>
        {locale==='pt-BR'?'Gerar outras opções locais':locale==='es'?'Generar alternativas locales':'Regenerate local options'}
      </button>
    </div>
    <header className="creative-pack-header">
      <div>
        <p className="eyebrow">{t('pinterestCreativePack')}</p>
        <h2>{t('creativePackReady')}</h2>
        <p>{t('creativePackReadyBody')}</p>
      </div>
      <div className="pack-quality">
        <strong>{pack.qualityScore}</strong>
        <span>{t('packQuality')}<br/>{saving?t('saving'):saveError?(locale==='pt-BR'?'Falha na sincronização':locale==='es'?'Error de sincronización':'Sync failed'):t('saved')}</span>
      </div>
    </header>

    {saveError&&<div className="notice danger" role="alert">{locale==='pt-BR'?'Não foi possível sincronizar o Creative Pack. Suas opções continuam na tela.':'Creative Pack sync failed; current copy remains on screen.'}<button type="button" className="button secondary" disabled={saving} onClick={()=>{setSaving(true);void persist(pack);}}>{locale==='pt-BR'?'Tentar salvar novamente':'Retry save'}</button></div>}
    <details className="pack-advanced-details"><summary>{locale==='pt-BR'?'Ver dados, qualidade e SEO':locale==='es'?'Ver datos, calidad y SEO':'View data, quality and SEO'}</summary>
    <div className="pack-summary-grid">
      <div><span>{t('product')}</span><strong>{campaign.currentVersion.product.title.value}</strong></div>
      <div><span>{t('recommendedAngle')}</span><strong>{selected?.title}</strong></div>
      <div><span>{t('environment')}</span><strong>{pack.creativeDirection.roomOrEnvironment}</strong></div>
      <div><span>{t('board')}</span><strong>{pack.copy.recommendedBoardName}</strong></div>
      <div><span>{t('image')}</span><strong>{hasImage?t('readyStatus'):t('waitingImport')}</strong></div>
      <div><span>SEO</span><strong>{pack.copy.primaryKeyword}</strong></div>
    </div>
    </details>

    <div className="pack-section" id="review-copy-editor">
      <details className="pack-copy-details" open={campaign.currentVersion.creativeIntelligence?.origin!=='nestai'||detectUnsupportedPinClaims(campaign.currentVersion.narrative.pinterestTitle+' '+campaign.currentVersion.narrative.description).length>0}>
       <summary><strong>{locale==='pt-BR'?'Revisar e trocar textos do Pin':locale==='es'?'Revisar textos del Pin':'Review Pin copy'}</strong><span>{locale==='pt-BR'?'3 títulos e 3 descrições · escolha sem perder histórico':locale==='es'?'3 títulos y 3 descripciones':'3 titles and 3 descriptions'}</span></summary>
      <div className="copy-option-grid">
        <div>
          <h3>{t('pinTitles')} ({titleOptions.length})</h3>
          {titleOptions.map((title)=><button
            type="button"
            key={title}
            disabled={!editable || saving}
            className={title===campaign.currentVersion.narrative.pinterestTitle?'copy-option selected':'copy-option'}
            onClick={()=>selectTitle(title)}
          >{title}</button>)}
        </div>
        <div>
          <h3>{t('descriptions')} ({copyOptions.length})</h3>
          {copyOptions.map((description)=><button
            type="button"
            key={description}
            disabled={!editable || saving}
            className={description===campaign.currentVersion.narrative.description?'copy-option selected':'copy-option'}
            onClick={()=>selectDescription(description)}
          >{description}</button>)}
        </div>
      </div>
      </details>
    </div>

    <div className="pack-section">
      <div className="section-heading">
        <div><p className="eyebrow">{t('visualConcepts')}</p><h3>{t('chooseCreativeDirection')}</h3></div>
        <button type="button" className="text-button" disabled={!editable || saving} onClick={()=>{
          const next=directionOffset+1;
          setDirectionOffset(next);
          createPack(next);
        }}>{t('generateAnotherDirection')}</button>
      </div>
      <p className="field-hint" role="note">{locale==='pt-BR'?'Escolher um visual muda apenas a composição e o prompt da imagem; seus títulos e descrições continuam iguais.':locale==='es'?'Cambiar el diseño no modifica los títulos ni las descripciones.':'Choosing a visual changes only the image direction, never the selected copy.'}</p>
      <p className="field-hint">{locale==='pt-BR'?'No celular, deslize para comparar os três estilos.':'Swipe to compare all three visual styles on mobile.'}</p>
      <CreativeConceptPicker pack={pack} version={campaign.currentVersion} disabled={!editable || saving} onSelect={selectConcept} />
    </div>

    <div className="pack-section image-methods" id="review-images">
      <div className="section-heading">
        <div><p className="eyebrow">{locale==='pt-BR'?'ETAPA 4 · IMAGEM':locale==='es'?'PASO 4 · IMAGEN':'STEP 4 · IMAGE'}</p>
         <h3>{locale==='pt-BR'?'Como deseja preparar seu Pin?':locale==='es'?'¿Cómo crear la imagen?':'How would you like to prepare your Pin?'}</h3>
         <p>{locale==='pt-BR'?'Escolha um caminho. Os outros ficam guardados para quando precisar.':'Choose one path. Others remain available.'}</p>
        </div>
      </div>
      <details className="creative-image-method">
        <summary><strong>{locale==='pt-BR'?'Gerar imagem com ChatGPT':locale==='es'?'Crear con ChatGPT':'Create with ChatGPT'}</strong>
          <span>{locale==='pt-BR'?'Usar foto autorizada, copiar o prompt e importar o resultado':locale==='es'?'Foto autorizada, prompt y resultado':'Authorized photo, prompt and import'}</span></summary>
        <ImagePromptPanel key={campaign.currentVersion.product.externalId} pack={pack} product={campaign.currentVersion.product} reference={reference} onReferenceChange={setReference} referenceLockRequired={campaign.rankingContext?.v4ResearchDraft===true} />
      </details>
      <details className="creative-image-method">
        <summary><strong>{locale==='pt-BR'?'Compor imagem sem IA':locale==='es'?'Componer sin IA':'Compose without AI'}</strong>
          <span>{locale==='pt-BR'?'Foto licenciada e editor local 1000 × 1500':locale==='es'?'Foto autorizada y composición local':'Authorized photo and local compositor'}</span></summary>
        <LocalPinComposer campaign={campaign} pack={pack} reference={reference}
          disabled={!editable} onImported={importAsset}/>
      </details>
      <details className="creative-image-method">
        <summary><strong>{locale==='pt-BR'?'Importar imagem pronta':locale==='es'?'Importar imagen':'Import a finished image'}</strong>
          <span>{locale==='pt-BR'?'Envie, confira fidelidade e salve a versão final':locale==='es'?'Importa y comprueba el producto':'Upload, verify and save'}</span></summary>
        <AIImageImport
          organizationId={campaign.organizationId}
          campaignId={campaign.id}
          pack={pack}
          product={campaign.currentVersion.product}
          reference={reference}
          referenceLockRequired={campaign.rankingContext?.v4ResearchDraft===true}
          disabled={!editable}
          onImported={importAsset}
        />
      </details>
    </div>

    <details className="pack-technical-details">
      <summary>{locale==='pt-BR'?'Dados avançados · SEO e regras de fidelidade':locale==='es'?'Datos avanzados · SEO y verificación':'Advanced details · SEO and product rules'}</summary>
      <div className="pack-section pack-analysis">
      <div>
        <p className="eyebrow">{t('analysis')}</p>
        <h3>{t('whyThisDirection')}</h3>
        <p>{selected?.sceneProfile.explanation}</p>
        <ul>{selected?.scoreExplanation.map((reason)=><li key={reason}>{reason}</li>)}</ul>
      </div>
      <div>
        <p className="eyebrow">SEO</p>
        <h3>{t('keywords')}</h3>
        <div className="keyword-cloud">{pack.copy.keywords.filter(safe).map((keyword)=><span key={keyword}>{keyword}</span>)}</div>
      </div>
      <div>
        <p className="eyebrow">PRODUCT TRUTH</p>
        <h3>{t('truthRestrictions')}</h3>
        <ul>{pack.truthConstraints.map((item)=><li key={item}>{item}</li>)}</ul>
      </div>
    </div>
    </details>

    <footer className="creative-pack-footer">
      <span>{t('publicationReadiness')}: {hasImage?t('finalImageReady'):t('generateAndImportImage')}</span>
      <span>v{pack.campaignVersion} · {pack.promptTemplateVersion}</span>
    </footer>
  </section>;
}
