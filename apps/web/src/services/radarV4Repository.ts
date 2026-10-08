import { doc, writeBatch, serverTimestamp, type Firestore } from 'firebase/firestore';
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
