import { useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { buildAffiliateActionPlan,type AffiliateActionType } from '../lib/commercialActionPlan';
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
  const actionPlan=useMemo(()=>buildAffiliateActionPlan(campaigns,rows),[campaigns,rows]);
  const actionLabels:Record<AffiliateActionType,[string,string,string]>={
    START:['Pesquisar meu primeiro produto','Explore my first product','Buscar mi primer producto'],
    PUBLISH_READY:['Publicar campanha já aprovada','Publish an approved campaign','Publicar campaña aprobada'],
    IMPORT_METRICS:['Importar métricas que faltam','Import missing performance data','Importar métricas que faltan'],
    CHECK_DATA_FRESHNESS:['Atualizar métricas antigas','Refresh older metrics','Actualizar métricas antiguas'],
    VERIFY_REVENUE:['Conferir comissões com o programa','Verify commissions with provider','Verificar comisiones con el programa'],
    TEST_CREATIVE:['Testar outro ângulo criativo','Test a different creative angle','Probar otro enfoque creativo'],
    BUILD_SAMPLE:['Construir histórico antes de otimizar','Build evidence before optimizing','Reunir datos antes de optimizar'],
  };
  const actionDetails:Record<AffiliateActionType,[string,string,string]>={
    START:['Escolha uma necessidade, compare produtos e prepare seu primeiro Pin.','Start with a buyer problem, then compare before preparing a Pin.','Busca una necesidad, compara y prepara tu primer Pin.'],
    PUBLISH_READY:['Já existe uma campanha aprovada. Confirme link e publicação no fluxo guiado.','An approved campaign is ready for the guided publishing checklist.','Una campaña aprobada espera el proceso de publicación.'],
    IMPORT_METRICS:['Há publicação sem métricas vinculadas. Importe um CSV autorizado com o ID exato da campanha.','A published campaign has no attributed metrics. Import an authorized CSV.','Hay una campaña sin métricas. Importa un CSV autorizado.'],
    CHECK_DATA_FRESHNESS:['Suas observações são antigas. Atualize os relatórios antes de concluir que um Pin melhorou ou piorou.','Data is old. Refresh reports before comparing campaign performance.','Los datos son antiguos. Actualízalos antes de comparar.'],
    VERIFY_REVENUE:['Existem cliques reais, mas nenhum relatório de vendas do marketplace foi associado. Cliques não comprovam receita.','Clicks exist, but no marketplace sales statement is attached. Traffic does not prove revenue.','Hay clics, pero no reporte del programa. Los clics no prueban ventas.'],
    TEST_CREATIVE:['Uma campanha tem pelo menos 1.500 impressões e menos de 0,5% de cliques de saída. Isso é um convite a testar título, imagem ou pasta — não um diagnóstico de causa.','A campaign has 1,500+ impressions and under 0.5% outbound clicks. Try a distinct creative hypothesis, without assuming causality.','Una campaña tiene 1.500+ impresiones y menos del 0,5% de clics de salida. Prueba otra variante sin suponer causalidad.'],
    BUILD_SAMPLE:['Menos de 12 campanhas têm impressões observadas. O sistema evita declarar padrões vencedores com amostras pequenas.','Fewer than 12 campaigns have observed impressions, so there is not enough evidence for a winning pattern.','Menos de 12 campañas tienen impresiones observadas; aún no hay base para patrones ganadores.'],
  };

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
    const financialDeclared=[form.sales,form.revenue,form.commission].some(value=>value.trim().length>0);
    const row=normalizePerformanceInput({
      organizationId,campaignId,source:'MANUAL',salesKnown:financialDeclared,
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

    <section className="surface radar8-learning-actions" aria-label={locale==='pt-BR'?'Próximos passos para melhorar os resultados':locale==='es'?'Próximos pasos con datos reales':'Next steps from observed evidence'}>
      <p className="eyebrow">{locale==='pt-BR'?'INTELIGÊNCIA COM EVIDÊNCIA':locale==='es'?'INTELIGENCIA CON EVIDENCIA':'EVIDENCE-LED INTELLIGENCE'}</p>
      <h2>{locale==='pt-BR'?'O que fazer agora para evoluir?':locale==='es'?'¿Qué hacer ahora para mejorar?':'What should you do next?'}</h2>
      <p className="muted">{locale==='pt-BR'?'Recomendações baseadas no estado das campanhas e nos relatórios existentes. Não são promessas de vendas nem conclusões de IA sem dados.':locale==='es'?'Sugerencias basadas en campañas y datos registrados, no promesas de ventas.':'Suggestions use recorded campaign states and measured observations, not revenue predictions.'}</p>
      <div className="radar8-action-grid">{actionPlan.length?actionPlan.map(action=>{
        const index=locale==='en'?1:locale==='es'?2:0;
        const href=action.to==='/results'?'#pinterest-metrics-import':action.to;
        const title=actionLabels[action.type][index];
        return <article key={action.type} className="radar8-action">
          <strong>{title}</strong>
          <p>{actionDetails[action.type][index]}</p>
          {action.observedImpressions!==undefined&&<small>{new Intl.NumberFormat(locale).format(action.observedImpressions)} {locale==='pt-BR'?'impressões observadas':locale==='es'?'impresiones observadas':'observed impressions'} · {action.observedClicks} {locale==='pt-BR'?'cliques de saída':locale==='es'?'clics de salida':'outbound clicks'}</small>}
          {href.startsWith('#')?<a href={href} className="button secondary">{title} →</a>:<NavLink className="button secondary" to={href}>{title} →</NavLink>}
        </article>;
      }):<p>{locale==='pt-BR'?'Você já tem um histórico consistente. Continue acompanhando dados reais e testando hipóteses, uma mudança de cada vez.':locale==='es'?'Sigue midiendo datos reales y probando cambios individualmente.':'Keep monitoring real outcomes and testing one change at a time.'}</p>}</div>
    </section>
    <section id="pinterest-metrics-import" className="surface pinterest-csv-import">
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
      <p className="muted">{locale==='pt-BR'
        ? 'Vendas, receita e comissão em branco significam dados desconhecidos, não zero vendas. Para registrar zero informado, digite 0. Estes valores são declarações manuais, não comprovantes do marketplace.'
        : locale==='es'
          ? 'Ventas, ingresos y comisión en blanco son desconocidos, no cero. Introduzca 0 solo si el resultado es conocido. Los valores manuales no son prueba del marketplace.'
          : 'Blank sales, revenue and commission mean unknown, not zero. Enter 0 only for a known result. Manual entries are not verified marketplace statements.'}</p>
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
