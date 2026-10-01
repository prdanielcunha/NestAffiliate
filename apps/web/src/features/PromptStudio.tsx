import { useMemo, useState } from 'react';
import type { Campaign } from '@nestaffiliate/core';
import { buildPromptPackage, routeAI } from '@nestaffiliate/ai-router';

export function PromptStudio({campaigns}:{campaigns:Campaign[]}){
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
    <header className="page-title"><p className="eyebrow">PROMPT STUDIO</p><h1>IA sem prender o produto a uma API.</h1><p>Use o pacote no ChatGPT/Gemini manualmente. Fatos comerciais continuam bloqueados e separados da narrativa.</p></header>
    <section className="surface">
      <div className="form-grid">
        <label className="span-2">Campanha<select value={campaignId} onChange={(e)=>setCampaignId(e.target.value)}>{campaigns.map((c)=><option value={c.id} key={c.id}>{c.currentVersion.keyword} · v{c.currentVersion.version}</option>)}</select></label>
        <label className="span-2">O que você quer mudar<textarea value={instruction} onChange={(e)=>setInstruction(e.target.value)} rows={4}/></label>
      </div>
      {!campaign && <p className="muted">Crie uma campanha no Radar para gerar um Prompt Package.</p>}
      {pkg && <>
        <div className="prompt-meta"><span>Provider sugerido: {pkg.provider}</span><span>Redações de privacidade: {pkg.privacyRedactions.length}</span><span>Custo obrigatório: R$ 0</span></div>
        <pre className="prompt-box">{pkg.system}{'\n\n'}{pkg.prompt}</pre>
        <button className="button primary" onClick={()=>void copy()}>{copied?'Copiado':'Copiar pacote'}</button>
      </>}
    </section>
  </div>;
}
