import { useMemo, useState } from 'react';
import type { ApprovalEvent, Campaign } from '@nestaffiliate/core';
import { normalizePerformanceInput, summarizePerformance, parsePinterestMetricsCSV, type PinterestMetricsPreview, type PerformanceDaily } from '@nestaffiliate/analytics';
import { deriveLearning } from '@nestaffiliate/learning';
import { useI18n } from '../lib/i18n-context';
import { useAuth } from '../lib/auth';
import { canWrite } from '@nestaffiliate/core';

export function PerformancePanel({
  organizationId,campaigns,rows,approvalEvents,onSave,onImport,
}:{
  organizationId:string;
  campaigns:Campaign[];
  rows:PerformanceDaily[];
  approvalEvents:ApprovalEvent[];
  onSave:(row:PerformanceDaily)=>void;
  onImport:(rows:PerformanceDaily[])=>Promise<void>;
}){
  const { t, locale } = useI18n();
  const auth=useAuth();const editable=Boolean(auth.role&&canWrite(auth.role));
  const [csv,setCsv]=useState('');
  const [importError,setImportError]=useState('');
  const [importSuccess,setImportSuccess]=useState(false);
  const [importPreview,setImportPreview]=useState<PinterestMetricsPreview|null>(null);
  const [importing,setImporting]=useState(false);
  const published=campaigns.filter((c)=>c.status==='PUBLISHED');
  const [campaignId,setCampaignId]=useState(published[0]?.id ?? '');
  const [form,setForm]=useState({impressions:'',engagements:'',saves:'',pinClicks:'',outboundClicks:'',sales:'',revenue:'',commission:''});
  const summary=useMemo(()=>summarizePerformance(rows),[rows]);
  const insights=useMemo(()=>deriveLearning(campaigns,rows,approvalEvents),[campaigns,rows,approvalEvents]);

  function prepareImport(){
    try{setImportPreview(parsePinterestMetricsCSV({csv,organizationId,publishedCampaignIds:published.map(c=>c.id)}));setImportError('');setImportSuccess(false);}
    catch(error){setImportError(error instanceof Error?error.message:'PINTEREST_CSV_INVALID');setImportPreview(null);}
  }
  async function commitImport(){
    if(!editable||!importPreview)return;
    setImporting(true);setImportError('');
    try{await onImport(importPreview.rows);setCsv('');setImportPreview(null);setImportSuccess(true);}
    catch(error){setImportError(error instanceof Error?error.message:'IMPORT_FAILED');}
    finally{setImporting(false);}
  }

  function save(){
    if(!campaignId || !editable) return;
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
      <div className="metric-card"><span>{t('revenue')}</span><strong>{summary.financialKnown?new Intl.NumberFormat(locale,{style:'currency',currency:'BRL'}).format(summary.revenue):'—'}</strong></div>
      <div className="metric-card"><span>EPM</span><strong>{summary.epm===null?'—':new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(summary.epm)}</strong></div>
      <div className="metric-card"><span>{t('outboundClicks')}</span><strong>{summary.outboundClicks}</strong></div>
      <div className="metric-card"><span>{t('sales')}</span><strong>{rows.length && rows.every(row=>row.salesKnown===false)?'—':summary.sales}</strong></div>
    </div>

    <section className="surface pinterest-csv-import">
      <p className="eyebrow">PINTEREST · RELATÓRIO AUTORIZADO</p>
      <h2>{locale==='pt-BR'?'Importar métricas do Pinterest':locale==='es'?'Importar métricas de Pinterest':'Import Pinterest metrics'}</h2>
      <p className="muted">{locale==='pt-BR'?'Use um CSV exportado/autorizado. Impressões, saves e cliques são dados de distribuição; vendas e comissões só aparecem quando comprovadas em relatórios do marketplace.':locale==='es'?'Importe solo datos autorizados. Los clics no prueban ventas.':'Use an authorized export. Clicks do not prove sales or commissions.'}</p>
      <code>date,campaignId,impressions,pinClicks,outboundClicks,saves,engagements</code>
      <p className="muted">{locale==='pt-BR'?'Associe o campaignId exato de uma campanha publicada. Uma linha por campanha e data; importar novamente substitui os mesmos registros.':locale==='es'?'Use el campaignId exacto de una campaña publicada.':'Use the exact campaignId of a published campaign. Reimport replaces matching rows.'}</p>
      <input type="file" accept=".csv,text/csv" aria-label="Pinterest CSV" disabled={!editable} onChange={e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>100000){setImportError('PINTEREST_CSV_SIZE');return;}void file.text().then(text=>{setCsv(text);setImportPreview(null);setImportError('');}).catch(()=>setImportError('PINTEREST_CSV_READ_FAILED'));}} />
      <textarea rows={5} aria-label="Pinterest CSV paste" value={csv} disabled={!editable} onChange={e=>{setCsv(e.target.value);setImportPreview(null);setImportSuccess(false);}} placeholder="date,campaignId,impressions,pinClicks,outboundClicks,saves,engagements" />
      <button type="button" className="button secondary" disabled={!editable||!csv.trim()||importing} onClick={prepareImport}>{locale==='pt-BR'?'Conferir dados antes de importar':locale==='es'?'Revisar antes de importar':'Review before import'}</button>
      {importPreview&&<div className="csv-preview" role="status"><strong>{importPreview.rows.length} {locale==='pt-BR'?'registros válidos':'valid rows'}</strong><span>{importPreview.period.from} — {importPreview.period.to}</span><p>{locale==='pt-BR'?'Vendas e comissões: desconhecidas neste relatório.':locale==='es'?'Ventas y comisiones: no verificadas.':'Sales and commissions: unknown in this report.'}</p><button type="button" className="button primary" disabled={!editable||importing} onClick={()=>void commitImport()}>{importing?'…':locale==='pt-BR'?'Confirmar importação':locale==='es'?'Confirmar importación':'Confirm import'}</button></div>}
      {importError&&<p className="field-error" role="alert">{importError}</p>}
      {importSuccess&&<p role="status">{locale==='pt-BR'?'Importação registrada sem duplicar campanha/data.':locale==='es'?'Importación realizada sin duplicados.':'Import saved without duplicate campaign/date rows.'}</p>}
    </section>

    <section className="surface">
      <p className="eyebrow">{t('importResult')}</p>
      <h2>{t('recordMetrics')}</h2>
      <p className="muted">{t('recordMetricsSub')}</p>
      <div className="form-grid">
        <label className="span-2">{t('campaign')}<select value={campaignId} onChange={(e)=>setCampaignId(e.target.value)}><option value="">{t('select')}</option>{published.map((c)=><option value={c.id} key={c.id}>{c.currentVersion.keyword} · v{c.currentVersion.version}</option>)}</select></label>
        {Object.entries(form).map(([key,value])=><label key={key}>{key}<input inputMode="decimal" value={value} onChange={(e)=>setForm((old)=>({...old,[key]:e.target.value}))} /></label>)}
      </div>
      <button className="button primary" disabled={!campaignId||!editable} onClick={save}>{t('saveResult')}</button>
    </section>

    <section className="surface">
      <p className="eyebrow">{t('learningEngine')}</p>
      <h2>{t('whatLearned')}</h2>
      <div className="learning-list">{insights.map((insight)=><article key={insight.id} className="learning-row"><div><b>{insight.title}</b><p>{insight.explanation}</p></div><span>{insight.confidence}</span></article>)}</div>
    </section>
  </div>;
}
