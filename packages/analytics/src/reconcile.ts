import type {AffiliateResult} from './affiliateResults';

export interface ReconciliationPreview {
 toWrite:AffiliateResult[];
 added:number;
 updates:number;
 unchanged:number;
 reversed:number;
 /** Never silently overwrite contradictory or older financial evidence. */
 conflicts:Array<{transactionId:string;code:string}>;
}

/** Stable ledger upsert without erasing later approvals with an older CSV.
 * The incoming statement is still HUMAN-REPORTED; it is never official API verification.
 */
export function reconcileAffiliateImport(
 existing:AffiliateResult[],incoming:AffiliateResult[],
):ReconciliationPreview{
 const byId=new Map(existing.map(row=>[row.id,row]));
 const result:ReconciliationPreview={toWrite:[],added:0,updates:0,unchanged:0,reversed:0,conflicts:[]};
 const seen=new Set<string>();
 for(const row of incoming){
  if(seen.has(row.id)){result.conflicts.push({transactionId:row.transactionId,code:'DUPLICATE_IMPORT_ROW'});continue;}
  seen.add(row.id);
  const prior=byId.get(row.id);
  if(!prior){result.added++;result.toWrite.push(row);continue;}
  if(prior.organizationId!==row.organizationId||prior.marketplace!==row.marketplace||prior.transactionId!==row.transactionId){
   result.conflicts.push({transactionId:row.transactionId,code:'TRANSACTION_IDENTITY_CONFLICT'});continue;
  }
  if(prior.campaignId && row.campaignId && prior.campaignId!==row.campaignId){
   result.conflicts.push({transactionId:row.transactionId,code:'CAMPAIGN_ATTRIBUTION_CONFLICT'});continue;
  }
  if(prior.trackingCode && row.trackingCode && prior.trackingCode!==row.trackingCode){
   result.conflicts.push({transactionId:row.transactionId,code:'TRACKING_ATTRIBUTION_CONFLICT'});continue;
  }
  const same=prior.status===row.status&&prior.commission===row.commission&&
   prior.campaignId===row.campaignId&&prior.trackingCode===row.trackingCode&&
   prior.channel===row.channel&&prior.attribution===row.attribution;
  if(same){result.unchanged++;continue;}
  const earlier=Date.parse(row.observedAt)<Date.parse(prior.observedAt);
  if(earlier || (row.observedAt===prior.observedAt && prior.statementId===row.statementId)){
   result.conflicts.push({transactionId:row.transactionId,code:earlier?'STALE_PROVIDER_STATEMENT':'CHANGED_SAME_STATEMENT'});continue;
  }
  if((prior.status==='APPROVED'||prior.status==='REVERSED')&&row.status==='PENDING'){
   result.conflicts.push({transactionId:row.transactionId,code:'FINANCIAL_STATUS_REGRESSION'});continue;
  }
  if(prior.status==='REVERSED'&&row.status!=='REVERSED'){
   result.conflicts.push({transactionId:row.transactionId,code:'REVERSED_ORDER_REACTIVATION_REVIEW'});continue;
  }
  result.updates++;if(row.status==='REVERSED'&&prior.status!=='REVERSED')result.reversed++;
  result.toWrite.push({
   ...row, // Keep earlier explicit campaign association; never lose it on a later export.
   campaignId:row.campaignId??prior.campaignId,
   trackingCode:row.trackingCode??prior.trackingCode,
   attribution:row.attribution==='EXACT'||prior.attribution==='EXACT'?'EXACT':'UNKNOWN',
  });
 }
 return result;
}
