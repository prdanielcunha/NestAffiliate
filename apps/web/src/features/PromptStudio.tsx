import { useMemo, useState } from 'react';
import type { Campaign } from '@nestaffiliate/core';
import { buildPromptPackage, routeAI } from '@nestaffiliate/ai-router';
import { useI18n } from '../lib/i18n-context';

export function PromptStudio({campaigns}:{campaigns:Campaign[]}){
  const { t } = useI18n();
  const [campaignId,setCampaignId]=useState(campaigns[0]?.id ?? '');
  const [instruction,setInstruction]=useState('Crie três ângulos de campanha Pinterest, mantendo linguagem premium e prática.');
  const [copied,setCopied]=useState(false);
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
  </div>;
}
