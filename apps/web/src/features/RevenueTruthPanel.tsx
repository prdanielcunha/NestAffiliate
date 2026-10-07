import { useCallback,useEffect,useMemo,useState } from 'react';
import { canWrite, type Campaign } from '@nestaffiliate/core';
import { parseAffiliateStatement,summarizeAffiliateResults,type AffiliateResult,type PerformanceDaily } from '@nestaffiliate/analytics';
import { deriveRevenueCohortObservation } from '@nestaffiliate/learning';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n-context';
import { listAffiliateResults,saveAffiliateResults } from '../services/affiliateResultsRepository';

const examples='marketplace,transactionId,status,commission,observedAt,currency,trackingCode,channel';
export function RevenueTruthPanel({organizationId,campaigns,performance}:{
  organizationId:string;campaigns:Campaign[];performance:PerformanceDaily[];
}){
  const {t,locale}=useI18n();
  const identity=useAuth();
  const [records,setRecords]=useState<AffiliateResult[]>([]);
  const [csv,setCsv]=useState('');
  const [statementId,setStatementId]=useState('');
  const [state,setState]=useState<'loading'|'idle'|'saving'|'error'|'saved'>('loading');
  const [error,setError]=useState('');
  const [preview,setPreview]=useState<AffiliateResult[]|null>(null);
  const summary=useMemo(()=>summarizeAffiliateResults(records),[records]);
  const cohort=useMemo(()=>deriveRevenueCohortObservation(campaigns,performance,records),[campaigns,performance,records]);
  const money=(amount:number)=>new Intl.NumberFormat(locale,{style:'currency',currency:'BRL'}).format(amount);
  const refresh=useCallback(async()=>{
    if(!db)throw new Error('FIRESTORE_NOT_CONFIGURED');
    const rows=await listAffiliateResults(db,organizationId);
    setRecords(rows);
  },[organizationId]);
  useEffect(()=>{
    let active=true;
    void refresh().then(()=>{if(active)setState('idle');})
      .catch(()=>{if(active){setState('error');setError('DATA_UNAVAILABLE');}});
    return ()=>{active=false;};
  },[refresh]);
  function prepare(){
    try{
      const parsed=parseAffiliateStatement({
        csv,organizationId,statementId,
        knownCampaigns:campaigns.map((campaign)=>({
          id:campaign.id,
          trackingCode:campaign.rankingContext?.trackingCode,
        })),
      });
      if(parsed.length>400)throw new Error('IMPORT_BATCH_TOO_LARGE');
      setPreview(parsed);setError('');setState('idle');
    }catch(err){
      setPreview(null);
      setError(err instanceof Error?err.message:'IMPORT_INVALID');
      setState('error');
    }
  }
  async function persist(){
    if(!preview||!db||!identity.role||!canWrite(identity.role))return;
    setState('saving');setError('');
    try{
      await saveAffiliateResults(db,organizationId,preview);
      await refresh();
      setPreview(null);setCsv('');setStatementId('');
      setState('saved');
    }catch(err){
      setError(err instanceof Error?err.message:'IMPORT_FAILED');
      setState('error');
    }
  }
  return <section className="surface revenue-truth-panel">
    <p className="eyebrow">{t('r3RevenueTruth')}</p>
    <h2>{t('r3RevenueHeadline')}</h2>
    <p className="muted">{t('r3RevenueNote')}</p>
    <div className="metric-grid revenue-truth-metrics">
      <div className="metric-card"><span>{t('r3ApprovedReported')}</span><strong>{money(summary.approved)}</strong></div>
      <div className="metric-card"><span>{t('r3PendingReported')}</span><strong>{money(summary.pending)}</strong></div>
      <div className="metric-card"><span>{t('r3ReversedReported')}</span><strong>{money(summary.reversed)}</strong></div>
      <div className="metric-card"><span>{t('r3UnknownAttribution')}</span><strong>{summary.unknownAttribution}</strong></div>
    </div>
    {state==='loading'&&<p role="status">{t('r3ImportLoading')}</p>}
    {state==='saved'&&<p role="status">{t('r3ImportSaved')}</p>}
    {state==='error'&&<p role="alert" className="field-error">{t('r3ImportFailed')}: {error}</p>}
    {identity.role&&canWrite(identity.role)&&<div className="revenue-import-form">
      <details>
        <summary>{t('r3ImportTitle')}</summary>
        <p className="muted">{t('r3ImportInstruction')}</p>
        <code>{examples}</code>
        <label>{t('r3StatementId')}
          <input value={statementId} onChange={(event)=>{setStatementId(event.target.value);setPreview(null);}} placeholder="2026-10-provider-export" />
        </label>
        <label>{t('r3PasteCSV')}
          <textarea rows={7} value={csv} onChange={(event)=>{setCsv(event.target.value);setPreview(null);}} placeholder={examples} />
        </label>
        <button type="button" className="button secondary" onClick={prepare} disabled={!csv.trim()||!statementId.trim()}>{t('r3PreviewImport')}</button>
        {preview && <div className="notice" role="status">
          <strong>{t('r3PreviewCount',{n:preview.length})}</strong>
          <p>{t('r3ImportReview')}</p>
          <button type="button" className="button primary" disabled={state==='saving'} onClick={()=>void persist()}>{t('r3ConfirmImport')}</button>
        </div>}
      </details>
    </div>}
    <section className="revenue-assessment">
      <strong>{t('r3ExperimentTitle')}</strong>
      {cohort.status==='LOW_SAMPLE'
        ? <p>{t('r3ExperimentLowSample')} · {t('r3ExperimentSample',{n:cohort.matchedCampaigns})}</p>
        : <p>{t('r3ExperimentObservation',{id:cohort.observedLeaderId ?? '',value:money(cohort.revenuePerClick ?? 0)})}</p>}
      <p>{t('r3ExperimentCaveat')}</p>
    </section>
    {records.length ? <details className="revenue-truth-history">
      <summary>{t('r3History')} ({records.length})</summary>
      <div className="revenue-truth-records">
        {records.slice(0,25).map((item)=><div key={item.id} className="revenue-truth-row">
          <strong>{item.marketplace} · {item.status}</strong>
          <span>{money(item.commission)}</span>
          <small>{item.observedAt} · {item.attribution==='UNKNOWN'?t('r3UnknownAttribution'):t('r3ExactAttribution')}</small>
        </div>)}
      </div>
    </details>:<p className="muted">{t('r3NoCommissionData')}</p>}
  </section>;
}
