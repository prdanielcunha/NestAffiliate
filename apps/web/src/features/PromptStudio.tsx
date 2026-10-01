import { useMemo, useState } from 'react';
import type { Campaign } from '@nestaffiliate/core';
import { nextCampaignVersion } from '@nestaffiliate/core';
import { buildPromptPackage, routeAI } from '@nestaffiliate/ai-router';
import { CREATIVE_TEMPLATES } from '@nestaffiliate/creative-engine';
import { useI18n } from '../lib/i18n-context';

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
  const cleaned=raw.trim().replace(/^\`\`\`(?:json)?\s*/i,'').replace(/\s*\`\`\`$/,'');
  const parsed=JSON.parse(cleaned) as Record<string,unknown>;
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

export function PromptStudio({
  campaigns,
  editable,
  onUpdate,
}:{
  campaigns:Campaign[];
  editable:boolean;
  onUpdate:(campaign:Campaign)=>void;
}){
  const { t } = useI18n();
  const [campaignId,setCampaignId]=useState(campaigns[0]?.id ?? '');
  const [instruction,setInstruction]=useState('Crie três ângulos de campanha Pinterest, mantendo linguagem premium e prática.');
  const [copied,setCopied]=useState(false);
  const [aiResult,setAiResult]=useState('');
  const [importState,setImportState]=useState<'idle'|'ok'|'error'>('idle');
  const campaign=campaigns.find((item)=>item.id===campaignId) ?? campaigns[0];

  const pkg=useMemo(()=>{
    if(!campaign) return null;
    const p=campaign.currentVersion.product;
    const provider=routeAI('copy_generation');
    return buildPromptPackage({
      capability:'copy_generation',
      provider,
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

  async function copy(){
    if(!pkg) return;
    await navigator.clipboard.writeText(`${pkg.system}\n\n${pkg.prompt}`);
    setCopied(true);
    window.setTimeout(()=>setCopied(false),1500);
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
      const next=nextCampaignVersion(
        campaign,
        {
          narrative,
          template:allowedTemplate?.label ?? current.template,
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
    <header className="page-title"><p className="eyebrow">PROMPT STUDIO</p><h1>{t('promptTitle')}</h1><p>{t('promptSub')}</p></header>
    <section className="surface">
      <div className="form-grid">
        <label className="span-2">{t('campaign')}<select value={campaignId} onChange={(e)=>setCampaignId(e.target.value)}>{campaigns.map((c)=><option value={c.id} key={c.id}>{c.currentVersion.keyword} · v{c.currentVersion.version}</option>)}</select></label>
        <label className="span-2">{t('whatChange')}<textarea value={instruction} onChange={(e)=>setInstruction(e.target.value)} rows={4}/></label>
      </div>
      {!campaign && <p className="muted">{t('promptEmpty')}</p>}
      {pkg && <>
        <div className="prompt-meta"><span>{t('providerSuggested')}: {pkg.provider}</span><span>{t('privacyRedactions')}: {pkg.privacyRedactions.length}</span><span>{t('requiredCost')}: R$ 0</span></div>
        <pre className="prompt-box">{pkg.system}{'\n\n'}{pkg.prompt}</pre>
        <button className="button primary" onClick={()=>void copy()}>{copied?t('copied'):t('copyPackage')}</button>
      </>}
    </section>

    <section className="surface">
      <p className="eyebrow">IMPORT AI RESULT</p>
      <h2>{t('aiResult')}</h2>
      <p className="muted">{t('truthSafeImport')}</p>
      <textarea
        className="ai-result-input"
        disabled={!editable || !campaign}
        rows={10}
        value={aiResult}
        onChange={(e)=>{setAiResult(e.target.value);setImportState('idle');}}
        placeholder={'{"headline":"...","pinterestTitle":"...","description":"...","altText":"...","cta":"...","template":"Minimal"}'}
      />
      <div className="import-result-row">
        <button className="button secondary" disabled={!editable || !campaign || !aiResult.trim()} onClick={importResult}>{t('importAiResult')}</button>
        {importState==='ok' && <span className="success-text">{t('importedAiResult')}</span>}
        {importState==='error' && <span className="field-error">{t('invalidAiResult')}</span>}
      </div>
    </section>
  </div>;
}
