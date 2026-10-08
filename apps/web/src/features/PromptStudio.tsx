import { useMemo, useState } from 'react';
import type { Campaign, CreativeAsset, PinterestCreativePack } from '@nestaffiliate/core';
import { nextCampaignVersion } from '@nestaffiliate/core';
import {
  buildPinterestCreativePack,
  versionPinterestCreativePack,
} from '@nestaffiliate/creative-engine';
import { CREATIVE_TEMPLATES } from '@nestaffiliate/creative-engine';
import { buildPromptPackage } from '@nestaffiliate/ai-router';
import { useI18n } from '../lib/i18n-context';
import { useAuth } from '../lib/auth';
import { analyzeAffiliateProduct, generateAffiliatePinCopy, type AffiliateProductAnalysis } from '../services/nestAiClient';
import { AIImageImport } from './AIImageImport';
import { CreativeConceptPicker } from './CreativeConceptPicker';
import { ImagePromptPanel } from './ImagePromptPanel';
import type { ReferencePreview } from '../services/productReferenceRepository';

interface AIEditorialResult {
  headline?:string;
  subheadline?:string;
  pinterestTitle?:string;
  description?:string;
  disclosure?:string;
  altText?:string;
  cta?:string;
  template?:string;
}

function parseEditorialResult(raw:string):AIEditorialResult{
  let cleaned=raw.trim();
  const fence=String.fromCharCode(96).repeat(3);
  if(cleaned.startsWith(fence)){
    const firstBreak=cleaned.indexOf('\n');
    cleaned=firstBreak>=0 ? cleaned.slice(firstBreak+1) : cleaned.slice(3);
    if(cleaned.trimEnd().endsWith(fence)) cleaned=cleaned.trimEnd().slice(0,-3);
  }
  const parsed=JSON.parse(cleaned.trim()) as Record<string,unknown>;
  const text=(key:string)=>typeof parsed[key]==='string' ? String(parsed[key]).trim() : undefined;
  return {
    headline:text('headline'),
    subheadline:text('subheadline'),
    pinterestTitle:text('pinterestTitle'),
    description:text('description'),
    disclosure:text('disclosure'),
    altText:text('altText'),
    cta:text('cta'),
    template:text('template'),
  };
}

function ephemeralPack(campaign:Campaign,locale:'pt-BR'|'en'|'es'){
  return campaign.currentVersion.creativePack ?? buildPinterestCreativePack({
    organizationId:campaign.organizationId,
    campaignId:campaign.id,
    campaignVersion:campaign.currentVersion.version,
    product:campaign.currentVersion.product,
    keyword:campaign.currentVersion.keyword,
    boardName:campaign.currentVersion.boardName,
    locale,
    existingNarrative:campaign.currentVersion.narrative,
    editorialContext:'Prompt Studio 2.0',
  });
}

export function PromptStudio({
  campaigns,
  editable,
  onUpdate,
}:{
  campaigns:Campaign[];
  editable:boolean;
  onUpdate:(campaign:Campaign)=>void;
}){
  const { t, locale } = useI18n();
  const { user, organizationId } = useAuth();
  const [campaignId,setCampaignId]=useState(campaigns[0]?.id ?? '');
  const [reference,setReference]=useState<ReferencePreview|null>(null);
  const [tab,setTab]=useState<'image'|'copy'|'analysis'>('image');
  const [instruction,setInstruction]=useState('Crie três ângulos de campanha Pinterest, mantendo linguagem premium e prática.');
  const [copied,setCopied]=useState(false);
  const [aiResult,setAiResult]=useState('');
  const [importState,setImportState]=useState<'idle'|'ok'|'error'>('idle');
  const [nestAiState,setNestAiState]=useState<'idle'|'loading'|'ready'|'fallback'>('idle');
  const [productAnalysis,setProductAnalysis]=useState<AffiliateProductAnalysis|null>(null);
  const [analysisLoading,setAnalysisLoading]=useState(false);
  const campaign=campaigns.find((item)=>item.id===campaignId) ?? campaigns[0];

  const pack=useMemo(()=>campaign?ephemeralPack(campaign,locale):null,[campaign,locale]);

  const copyPkg=useMemo(()=>{
    if(!campaign) return null;
    const p=campaign.currentVersion.product;
    return buildPromptPackage({
      capability:'copy_generation',
      provider:'RULE_ENGINE',
      instruction,
      facts:{
        title:p.title.value,
        marketplace:p.marketplace,
        price:p.price?.value,
        currency:p.currency.value,
        seller:p.sellerName?.value,
        availability:p.availability.value,
        sourceNotes:[p.title.source,p.price?.source,p.url.source].filter(Boolean) as string[],
      },
    });
  },[campaign,instruction]);

  function ensureVersionedPack(source:PinterestCreativePack,nextVersion:number,conceptId?:string){
    return versionPinterestCreativePack(source,nextVersion,conceptId);
  }

  function selectConcept(conceptId:string){
    if(!campaign || !pack || !editable) return;
    const nextPack=ensureVersionedPack(pack,campaign.currentVersion.version+1,conceptId);
    const next=nextCampaignVersion(campaign,{creativePack:nextPack},'Prompt Studio concept changed');
    onUpdate(next);
    setCampaignId(next.id);
  }

  function importImage(asset:CreativeAsset){
    if(!campaign || !pack || !editable) return;
    const nextPack=ensureVersionedPack(pack,campaign.currentVersion.version+1);
    const selected=nextPack.imageConcepts.find((item)=>item.id===nextPack.recommendedConceptId) ?? nextPack.imageConcepts[0];
    const nextAsset={...asset,conceptId:selected?.id,promptPackageId:selected?.imagePrompt.id};
    const next=nextCampaignVersion(campaign,{
      creativePack:nextPack,
      creativeAsset:nextAsset,
      template:'Lifestyle + Headline',
    },'Prompt Studio generated image imported');
    onUpdate(next);
    setCampaignId(next.id);
  }

  async function copyPackage(){
    if(!copyPkg) return;
    await navigator.clipboard.writeText(copyPkg.system+'\n\n'+copyPkg.prompt);
    setCopied(true);
    window.setTimeout(()=>setCopied(false),1500);
  }

  async function generateNestAiDraft(){
    if(!campaign || !pack || !user || !organizationId || nestAiState==='loading') return;
    setNestAiState('loading');
    setImportState('idle');
    try{
      const p=campaign.currentVersion.product;
      const result=await generateAffiliatePinCopy({
        user,
        organizationId,
        locale,
        instruction,
        product:{
          title:p.title.value,
          marketplace:p.marketplace,
          ...(p.price?.value !== undefined ? {price:p.price.value} : {}),
          currency:p.currency.value,
          ...(p.sellerName?.value ? {seller:p.sellerName.value} : {}),
          availability:p.availability.value,
          sourceNotes:[p.title.source,p.price?.source,p.url.source].filter(Boolean) as string[],
        },
        deterministicPack:{
          primaryKeyword:pack.copy.primaryKeyword,
          keywords:pack.copy.keywords,
          recommendedAngle:pack.imageConcepts.find((item)=>item.id===pack.recommendedConceptId)?.title,
        },
      });
      setAiResult(JSON.stringify({
        pinterestTitle:result.title,
        description:result.description,
      },null,2));
      setNestAiState('ready');
    }catch{
      setNestAiState('fallback');
    }
  }

  async function analyzeWithNestAi(){
    if(!campaign || !user || !organizationId || analysisLoading) return;
    setAnalysisLoading(true);
    try{
      const p=campaign.currentVersion.product;
      const result=await analyzeAffiliateProduct({
        user,
        organizationId,
        locale,
        product:{
          title:p.title.value,
          marketplace:p.marketplace,
          ...(p.price?.value !== undefined ? {price:p.price.value} : {}),
          currency:p.currency.value,
          ...(p.sellerName?.value ? {seller:p.sellerName.value} : {}),
          availability:p.availability.value,
          ...(p.rating?.value !== undefined ? {rating:p.rating.value} : {}),
          ...(p.reviewCount?.value !== undefined ? {reviewCount:p.reviewCount.value} : {}),
          sources:[p.title.source,p.price?.source,p.url.source].filter(Boolean),
        },
      });
      setProductAnalysis(result);
    }finally{
      setAnalysisLoading(false);
    }
  }

  function importResult(){
    if(!campaign || !editable) return;
    try{
      const result=parseEditorialResult(aiResult);
      const current=campaign.currentVersion;
      const narrative={
        ...current.narrative,
        ...(result.headline ? {headline:result.headline} : {}),
        ...(result.subheadline ? {subheadline:result.subheadline} : {}),
        ...(result.pinterestTitle ? {pinterestTitle:result.pinterestTitle} : {}),
        ...(result.description ? {description:result.description} : {}),
        ...(result.disclosure ? {disclosure:result.disclosure} : {}),
        ...(result.altText ? {altText:result.altText} : {}),
        ...(result.cta ? {cta:result.cta} : {}),
      };
      const allowedTemplate=CREATIVE_TEMPLATES.find((template)=>
        template.label.toLowerCase()===result.template?.toLowerCase() ||
        template.id===result.template?.toLowerCase().replace(/[^a-z0-9]+/g,'-')
      );
      const patchPack=current.creativePack
        ? ensureVersionedPack(current.creativePack,current.version+1)
        : undefined;
      const next=nextCampaignVersion(
        campaign,
        {
          narrative,
          template:allowedTemplate?.label ?? current.template,
          ...(patchPack?{creativePack:patchPack}:{}),
        },
        'manual AI result import',
      );
      onUpdate(next);
      setCampaignId(next.id);
      setImportState('ok');
    }catch{
      setImportState('error');
    }
  }

  return <div className="page">
    <header className="page-title"><p className="eyebrow">PROMPT STUDIO 2.0</p><h1>{t('promptTitle')}</h1><p>{t('promptSub')}</p></header>
    <section className="surface">
      <div className="form-grid">
        <label className="span-2">{t('campaign')}<select value={campaignId} onChange={(e)=>setCampaignId(e.target.value)}>{campaigns.map((c)=><option value={c.id} key={c.id}>{c.currentVersion.keyword} · v{c.currentVersion.version}</option>)}</select></label>
      </div>
      {!campaign && <p className="muted">{t('promptEmpty')}</p>}
      {campaign && pack && <>
        <div className="tabs prompt-studio-tabs">
          <button className={tab==='image'?'active':''} onClick={()=>setTab('image')}>{t('image')}</button>
          <button className={tab==='copy'?'active':''} onClick={()=>setTab('copy')}>{t('copy')}</button>
          <button className={tab==='analysis'?'active':''} onClick={()=>setTab('analysis')}>{t('analysis')}</button>
        </div>

        {tab==='image' && <div className="prompt-studio-pane">
          <div className="prompt-studio-product">
            <div>
              <p className="eyebrow">{t('product')}</p>
              <h2>{campaign.currentVersion.product.title.value}</h2>
              <p>{pack.creativeDirection.roomOrEnvironment}</p>
            </div>
            <strong>1000 × 1500 · 2:3</strong>
          </div>
          <CreativeConceptPicker pack={pack} disabled={!editable} onSelect={selectConcept} />
          <ImagePromptPanel key={campaign.currentVersion.product.externalId} pack={pack} product={campaign.currentVersion.product} reference={reference} onReferenceChange={setReference} />
          <AIImageImport
             product={campaign.currentVersion.product}
             reference={reference}
            organizationId={campaign.organizationId}
            campaignId={campaign.id}
            pack={pack}
            disabled={!editable}
            onImported={importImage}
          />
        </div>}

        {tab==='copy' && <div className="prompt-studio-pane">
          <div className="copy-option-grid prompt-copy-grid">
            <div><h3>{t('pinTitles')}</h3>{pack.copy.titles.map((value)=><p className="copy-readonly" key={value}>{value}</p>)}</div>
            <div><h3>{t('descriptions')}</h3>{pack.copy.descriptions.map((value)=><p className="copy-readonly" key={value}>{value}</p>)}</div>
          </div>
          <div className="prompt-meta">
            <span>{t('providerSuggested')}: NestAI</span>
            <span>{t('requiredCost')}: R$ 0</span>
            <span>{t('keywords')}: {pack.copy.keywords.length}</span>
          </div>
          <label className="prompt-instruction">{t('whatChange')}<textarea value={instruction} onChange={(e)=>setInstruction(e.target.value)} rows={3}/></label>
          {copyPkg && <>
            <pre className="prompt-box">{copyPkg.system}{'\n\n'}{copyPkg.prompt}</pre>
            <div className="import-result-row">
              <button
                className="button"
                disabled={!editable || !user || !organizationId || nestAiState==='loading'}
                onClick={()=>void generateNestAiDraft()}
              >
                {nestAiState==='loading' ? t('generatingWithNestAi') : t('generateWithNestAi')}
              </button>
              <button className="button secondary" onClick={()=>void copyPackage()}>{copied?t('copied'):t('copyPackage')}</button>
            </div>
            {nestAiState==='ready' && <span className="success-text">{t('nestAiDraftReady')}</span>}
            {nestAiState==='fallback' && <span className="field-error">{t('nestAiFallback')}</span>}
          </>}

          <div className="prompt-import-copy">
            <p className="eyebrow">{t('importResult')}</p>
            <h2>{t('aiResult')}</h2>
            <p className="muted">{t('truthSafeImport')}</p>
            <textarea
              className="ai-result-input"
              disabled={!editable || !campaign}
              rows={8}
              value={aiResult}
              onChange={(e)=>{setAiResult(e.target.value);setImportState('idle');}}
              placeholder={'{"headline":"...","pinterestTitle":"...","description":"...","altText":"...","cta":"...","template":"Editorial Clean"}'}
            />
            <div className="import-result-row">
              <button className="button secondary" disabled={!editable || !aiResult.trim()} onClick={importResult}>{t('importAiResult')}</button>
              {importState==='ok' && <span className="success-text">{t('importedAiResult')}</span>}
              {importState==='error' && <span className="field-error">{t('invalidAiResult')}</span>}
            </div>
          </div>
        </div>}

        {tab==='analysis' && <div className="prompt-studio-pane analysis-grid">
          <article>
            <p className="eyebrow">{t('nestAiAnalysis')}</p>
            <h3>NestAI</h3>
            <button className="button secondary" disabled={!user || !organizationId || analysisLoading} onClick={()=>void analyzeWithNestAi()}>
              {analysisLoading?t('generatingWithNestAi'):t('analyzeWithNestAi')}
            </button>
            {productAnalysis && <>
              <p>{productAnalysis.facts.join(' · ')}</p>
              <ul>{productAnalysis.opportunities.map((item)=><li key={item}>{item}</li>)}</ul>
              {productAnalysis.unknowns.length>0 && <small>{productAnalysis.unknowns.join(' · ')}</small>}
            </>}
          </article>
          <article><p className="eyebrow">{t('environment')}</p><h3>{pack.creativeDirection.roomOrEnvironment}</h3><p>{pack.imageConcepts[0]?.sceneProfile.explanation}</p></article>
          <article><p className="eyebrow">{t('recommendedAngle')}</p><h3>{pack.imageConcepts.find((item)=>item.id===pack.recommendedConceptId)?.title}</h3><p>{pack.imageConcepts.find((item)=>item.id===pack.recommendedConceptId)?.rationale}</p></article>
          <article><p className="eyebrow">PRODUCT TRUTH</p><h3>{t('truthRestrictions')}</h3><ul>{pack.truthConstraints.map((item)=><li key={item}>{item}</li>)}</ul></article>
          <article><p className="eyebrow">SEO</p><h3>{pack.copy.primaryKeyword}</h3><div className="keyword-cloud">{pack.copy.keywords.map((keyword)=><span key={keyword}>{keyword}</span>)}</div></article>
          <article><p className="eyebrow">{t('packQuality')}</p><h3>{pack.qualityScore}/100</h3><ul>{pack.qualityExplanation.map((item)=><li key={item}>{item}</li>)}</ul></article>
          <article><p className="eyebrow">{t('publicationReadiness')}</p><h3>{campaign.currentVersion.creativeAsset?t('finalImageReady'):t('waitingImport')}</h3><ul>{pack.publicationChecklist.map((item)=><li key={item}>{item}</li>)}</ul></article>
        </div>}
      </>}
    </section>
  </div>;
}
