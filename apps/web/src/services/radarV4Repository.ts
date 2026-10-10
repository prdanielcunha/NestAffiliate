import { collection, doc, getDocs, limit, orderBy, query, writeBatch, serverTimestamp, type Firestore } from 'firebase/firestore';
import type { OpportunityV4Assessment } from '@nestaffiliate/radar';
import { buildRadarFunnelV4 } from '@nestaffiliate/radar';

export interface SourceCoverageRunV4 {
  runId:string;
  organizationId:string;
  query:string;
  provider:'ALL'|'MELI'|'SHOPEE';
  providerStatuses:Record<string,'OK'|'RATE_LIMITED'|'AUTH_REQUIRED'|'UNAVAILABLE'>;
  examined:number;
  assessed:number;
  report:ReturnType<typeof buildRadarFunnelV4>;
  finishedAt:string;
}
/** Research snapshots only; historical campaigns/scores remain immutable. */
export async function saveRadarV4Coverage(input:{
  db:Firestore;organizationId:string;query:string;provider:SourceCoverageRunV4['provider'];
  providerStatuses:SourceCoverageRunV4['providerStatuses'];
  examined:number;assessments:Record<string,OpportunityV4Assessment>;
}):Promise<string>{
  if(!input.organizationId||input.query.length>250)throw new Error('V4_COVERAGE_INPUT_INVALID');
  const now=new Date().toISOString();
  const runId='v4-'+now.replace(/[^0-9]/g,'').slice(0,14)+'-'+crypto.randomUUID().slice(0,8);
  const list=Object.entries(input.assessments).slice(0,48);
  const {db,organizationId}=input;
  const path=['organizations',organizationId,'products','nestaffiliate'] as const;
  const batch=writeBatch(db);
  const snapshot:SourceCoverageRunV4={
    runId,organizationId,query:input.query,provider:input.provider,providerStatuses:input.providerStatuses,
    examined:input.examined,assessed:list.length,
    report:buildRadarFunnelV4(list.map(([,a])=>a),input.examined),
    finishedAt:now,
  };
  batch.set(doc(db,...path,'sourceCoverageRuns',runId),{
    ...snapshot,createdAt:serverTimestamp(),
  });
  for(const [id,assessment] of list){
    const safeId=id.replace(/[^\w:-]/g,'_').slice(0,100);
    batch.set(doc(db,...path,'opportunityAssessmentsV4',runId+'_'+safeId),{
      ...assessment,organizationId,opportunityId:id,runId,createdAt:now,
    });
  }
  await batch.commit();
  return runId;
}

/** Latest completed manual Radar research, never presented as a background sync. */
export async function loadLatestRadarV4Coverage(db:Firestore,organizationId:string):Promise<SourceCoverageRunV4|null>{
  if(!organizationId || organizationId.includes('/'))return null;
  const ref=collection(db,'organizations',organizationId,'products','nestaffiliate','sourceCoverageRuns');
  const rows=await getDocs(query(ref,orderBy('finishedAt','desc'),limit(5)));
  for(const row of rows.docs){
    const data=row.data() as SourceCoverageRunV4;
    if(data.organizationId===organizationId && typeof data.finishedAt==='string' && data.runId)return data;
  }
  return null;
}
export function primaryRadarBlocker(run:SourceCoverageRunV4|null):{reason:string;count:number}|null{
  if(!run?.report?.byReason)return null;
  const sorted=Object.entries(run.report.byReason)
    .filter(([,n])=>typeof n==='number' && n>0)
    .sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0]));
  const first=sorted[0];
  return first?{reason:first[0],count:first[1]}:null;
}

/** Read-only historical research drill-down, scoped to the current organization. */
export async function listRadarV4Research(db:Firestore,organizationId:string):Promise<SourceCoverageRunV4[]>{
  if(!organizationId || organizationId.includes('/'))return [];
  const rows=await getDocs(query(collection(db,'organizations',organizationId,'products','nestaffiliate','sourceCoverageRuns'),orderBy('finishedAt','desc'),limit(30)));
  return rows.docs.map(row=>row.data() as SourceCoverageRunV4).filter(run=>run.organizationId===organizationId && !!run.runId);
}
export interface StoredRadarAssessmentV4 {
  opportunityId:string;runId:string;organizationId:string;
  [key:string]:unknown;
}
export async function listRadarV4Assessments(db:Firestore,organizationId:string,runId:string):Promise<StoredRadarAssessmentV4[]>{
  if(!organizationId || organizationId.includes('/') || !runId || runId.includes('/'))return [];
  const rows=await getDocs(query(collection(db,'organizations',organizationId,'products','nestaffiliate','opportunityAssessmentsV4'),limit(500)));
  return rows.docs.map(row=>row.data() as StoredRadarAssessmentV4).filter(item=>item.organizationId===organizationId && item.runId===runId);
}
