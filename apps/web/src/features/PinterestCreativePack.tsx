import { useState } from 'react';
import type { Campaign, CreativeAsset, PinterestCreativePack } from '@nestaffiliate/core';
import { nextCampaignVersion } from '@nestaffiliate/core';
import {
  buildPinterestCreativePack,
  versionPinterestCreativePack,
  compactPinText,
} from '@nestaffiliate/creative-engine';
import { db } from '../lib/firebase';
import { useI18n } from '../lib/i18n-context';
import { savePinterestCreativePack } from '../services/creativePackRepository';
import { AIImageImport } from './AIImageImport';
import { LocalPinComposer } from './LocalPinComposer';
import { CreativeConceptPicker,templateForConcept } from './CreativeConceptPicker';
import {narrativeForConcept} from '../lib/creativeDirection';
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
  const [reference,setReference]=useState<ReferencePreview|null>(null);
  const pack=campaign.currentVersion.creativePack;

  async function persist(nextPack:PinterestCreativePack){
    if(!db) return;
    await savePinterestCreativePack(db,campaign.organizationId,nextPack);
  }

  function createPack(offset=directionOffset, refreshCopy=false){
    if(!editable) return;
    const nextVersion=campaign.currentVersion.version+1;
    const nextPack=buildPinterestCreativePack({
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
    const next=nextCampaignVersion(campaign,{
      creativePack:nextPack,
      creativeAsset:undefined,
      narrative:packNarrative(nextPack,campaign.currentVersion.narrative),
      boardName:nextPack.copy.recommendedBoardName,
      template:templateForConcept(nextPack.imageConcepts.findIndex(item=>item.id===nextPack.recommendedConceptId)),
    },refreshCopy?'Pinterest copy refreshed with contextual hooks':offset===0?'Pinterest Creative Pack generated':'Pinterest Creative Pack alternate direction');
    onUpdate(next);
    setSaving(true);
    void persist(nextPack).finally(()=>setSaving(false));
  }

  function selectConcept(conceptId:string){
    if(!pack || !editable) return;
    const nextVersion=campaign.currentVersion.version+1;
    const nextPack=directionFromSelected(versionPinterestCreativePack(pack,nextVersion,conceptId));
    const chosen=nextPack.imageConcepts.findIndex(item=>item.id===nextPack.recommendedConceptId);
    const next=nextCampaignVersion(campaign,{creativePack:nextPack,creativeAsset:undefined,template:templateForConcept(chosen),narrative:narrativeForConcept(campaign.currentVersion,nextPack,chosen)},'creative concept changed');
    onUpdate(next);
    setSaving(true);
    void persist(nextPack).finally(()=>setSaving(false));
  }

  function selectTitle(title:string){
    if(!pack || !editable || title===campaign.currentVersion.narrative.pinterestTitle) return;
    const nextVersion=campaign.currentVersion.version+1;
    const nextPack=versionPinterestCreativePack(pack,nextVersion);
    const narrative={...campaign.currentVersion.narrative,pinterestTitle:title,headline:compactPinText(title,57)};
    const next=nextCampaignVersion(campaign,{creativePack:nextPack,narrative},'Pinterest title selected');
    onUpdate(next);
    setSaving(true);
    void persist(nextPack).finally(()=>setSaving(false));
  }

  function selectDescription(description:string){
    if(!pack || !editable || description===campaign.currentVersion.narrative.description) return;
    const nextVersion=campaign.currentVersion.version+1;
    const nextPack=versionPinterestCreativePack(pack,nextVersion);
    const narrative={...campaign.currentVersion.narrative,description};
    const next=nextCampaignVersion(campaign,{creativePack:nextPack,narrative},'Pinterest description selected');
    onUpdate(next);
    setSaving(true);
    void persist(nextPack).finally(()=>setSaving(false));
  }

  function importAsset(asset:CreativeAsset){
    if(!pack || !editable) return;
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
    void persist(nextPack).finally(()=>setSaving(false));
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
        ? 'Textos antigos e genéricos? Gere novamente 3 títulos e 2 descrições específicos para o produto, sem API paga. A versão anterior permanece no histórico.'
        : locale==='es'
          ? '¿Textos genéricos? Renueva títulos y descripciones sin perder el historial.'
          : 'Generic copy? Refresh titles and descriptions without losing version history.'}</p>
      <button type="button" className="button secondary" disabled={!editable || saving}
        onClick={()=>createPack(directionOffset,true)}>
        {locale==='pt-BR'?'Melhorar títulos e descrições':locale==='es'?'Mejorar títulos y descripciones':'Improve titles and descriptions'}
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
        <span>{t('packQuality')}<br/>{saving?t('saving'):t('saved')}</span>
      </div>
    </header>

    <div className="pack-summary-grid">
      <div><span>{t('product')}</span><strong>{campaign.currentVersion.product.title.value}</strong></div>
      <div><span>{t('recommendedAngle')}</span><strong>{selected?.title}</strong></div>
      <div><span>{t('environment')}</span><strong>{pack.creativeDirection.roomOrEnvironment}</strong></div>
      <div><span>{t('board')}</span><strong>{pack.copy.recommendedBoardName}</strong></div>
      <div><span>{t('image')}</span><strong>{hasImage?t('readyStatus'):t('waitingImport')}</strong></div>
      <div><span>SEO</span><strong>{pack.copy.primaryKeyword}</strong></div>
    </div>

    <div className="pack-section">
      <div className="section-heading">
        <div><p className="eyebrow">{t('visualConcepts')}</p><h3>{t('chooseCreativeDirection')}</h3></div>
        <button className="text-button" disabled={!editable} onClick={()=>{
          const next=directionOffset+1;
          setDirectionOffset(next);
          createPack(next);
        }}>{t('generateAnotherDirection')}</button>
      </div>
      <CreativeConceptPicker pack={pack} version={campaign.currentVersion} disabled={!editable} onSelect={selectConcept} />
    </div>

    <div className="pack-section">
      <ImagePromptPanel key={campaign.currentVersion.product.externalId} pack={pack} product={campaign.currentVersion.product} reference={reference} onReferenceChange={setReference} referenceLockRequired={campaign.rankingContext?.v4ResearchDraft===true} />
    </div>

    <div className="pack-section">
      <LocalPinComposer campaign={campaign} pack={pack} reference={reference}
        disabled={!editable} onImported={importAsset}/>
    </div>
    <div className="pack-section">
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
    </div>

    <div className="pack-section">
      <p className="eyebrow">{t('copy')}</p>
      <div className="copy-option-grid">
        <div>
          <h3>{t('pinTitles')}</h3>
          {pack.copy.titles.map((title)=><button
            type="button"
            key={title}
            disabled={!editable}
            className={title===campaign.currentVersion.narrative.pinterestTitle?'copy-option selected':'copy-option'}
            onClick={()=>selectTitle(title)}
          >{title}</button>)}
        </div>
        <div>
          <h3>{t('descriptions')}</h3>
          {pack.copy.descriptions.map((description)=><button
            type="button"
            key={description}
            disabled={!editable}
            className={description===campaign.currentVersion.narrative.description?'copy-option selected':'copy-option'}
            onClick={()=>selectDescription(description)}
          >{description}</button>)}
        </div>
      </div>
    </div>

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
        <div className="keyword-cloud">{pack.copy.keywords.map((keyword)=><span key={keyword}>{keyword}</span>)}</div>
      </div>
      <div>
        <p className="eyebrow">PRODUCT TRUTH</p>
        <h3>{t('truthRestrictions')}</h3>
        <ul>{pack.truthConstraints.map((item)=><li key={item}>{item}</li>)}</ul>
      </div>
    </div>

    <footer className="creative-pack-footer">
      <span>{t('publicationReadiness')}: {hasImage?t('finalImageReady'):t('generateAndImportImage')}</span>
      <span>v{pack.campaignVersion} · {pack.promptTemplateVersion}</span>
    </footer>
  </section>;
}
