import { useMemo, useState } from 'react';
import type { Campaign } from '@nestaffiliate/core';
import { normalizePerformanceInput, summarizePerformance, type PerformanceDaily } from '@nestaffiliate/analytics';
import { deriveLearning } from '@nestaffiliate/learning';

export function PerformancePanel({
  organizationId,campaigns,rows,onSave,
}:{
  organizationId:string;
  campaigns:Campaign[];
  rows:PerformanceDaily[];
  onSave:(row:PerformanceDaily)=>void;
}){
  const published=campaigns.filter((c)=>c.status==='PUBLISHED');
  const [campaignId,setCampaignId]=useState(published[0]?.id ?? '');
  const [form,setForm]=useState({impressions:'',engagements:'',saves:'',pinClicks:'',outboundClicks:'',sales:'',revenue:'',commission:''});
  const summary=useMemo(()=>summarizePerformance(rows),[rows]);
  const insights=useMemo(()=>deriveLearning(campaigns,rows),[campaigns,rows]);

  function save(){
    if(!campaignId) return;
    const row=normalizePerformanceInput({
      organizationId,campaignId,source:'MANUAL',
      impressions:Number(form.impressions),engagements:Number(form.engagements),saves:Number(form.saves),
      pinClicks:Number(form.pinClicks),outboundClicks:Number(form.outboundClicks),sales:Number(form.sales),
      revenue:Number(form.revenue),commission:Number(form.commission),
    });
    onSave(row);
    setForm({impressions:'',engagements:'',saves:'',pinClicks:'',outboundClicks:'',sales:'',revenue:'',commission:''});
  }

  return <div className="performance-stack">
    <div className="metric-grid">
      <div className="metric-card"><span>Receita</span><strong>{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(summary.revenue)}</strong></div>
      <div className="metric-card"><span>EPM</span><strong>{summary.epm===null?'—':new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(summary.epm)}</strong></div>
      <div className="metric-card"><span>Cliques de saída</span><strong>{summary.outboundClicks}</strong></div>
      <div className="metric-card"><span>Vendas</span><strong>{summary.sales}</strong></div>
    </div>

    <section className="surface">
      <p className="eyebrow">IMPORTAR RESULTADO</p>
      <h2>Registrar métricas sem depender da API</h2>
      <p className="muted">Quando Pinterest/marketplace estiverem conectados, estes mesmos registros passam a vir dos adapters.</p>
      <div className="form-grid">
        <label className="span-2">Campanha<select value={campaignId} onChange={(e)=>setCampaignId(e.target.value)}><option value="">Selecione…</option>{published.map((c)=><option value={c.id} key={c.id}>{c.currentVersion.keyword} · v{c.currentVersion.version}</option>)}</select></label>
        {Object.entries(form).map(([key,value])=><label key={key}>{key}<input inputMode="decimal" value={value} onChange={(e)=>setForm((old)=>({...old,[key]:e.target.value}))} /></label>)}
      </div>
      <button className="button primary" disabled={!campaignId} onClick={save}>Salvar resultado</button>
    </section>

    <section className="surface">
      <p className="eyebrow">LEARNING ENGINE</p>
      <h2>O que o sistema aprendeu</h2>
      <div className="learning-list">{insights.map((insight)=><article key={insight.id} className="learning-row"><div><b>{insight.title}</b><p>{insight.explanation}</p></div><span>{insight.confidence}</span></article>)}</div>
    </section>
  </div>;
}
