import type {Campaign} from '@nestaffiliate/core';
import type {PerformanceDaily} from '@nestaffiliate/analytics';

export type AffiliateActionType='START'|'PUBLISH_READY'|'IMPORT_METRICS'|'CHECK_DATA_FRESHNESS'|'VERIFY_REVENUE'|'TEST_CREATIVE'|'BUILD_SAMPLE';
export interface AffiliateAction {
  type:AffiliateActionType;
  to:string;
  campaignId?:string;
  detail?:string;
  evidenceCount:number;
  observedImpressions?:number;
  observedClicks?:number;
}

/** Suggest next steps from real campaign states and dated, attributable observations.
 * Editorial hypotheses are not validated experiments or conversion predictions.
 */
export function buildAffiliateActionPlan(campaigns:Campaign[],rows:PerformanceDaily[],now=new Date()):AffiliateAction[]{
  const published=campaigns.filter(c=>c.status==='PUBLISHED');
  const ready=campaigns.find(c=>c.status==='PUBLICATION_READY');
  const maxActions=2;
  const actions:AffiliateAction[]=[];
  if(!published.length){
    if(ready) actions.push({type:'PUBLISH_READY',to:'/publish/'+encodeURIComponent(ready.id),campaignId:ready.id,evidenceCount:0});
    actions.push({type:'START',to:'/radar',evidenceCount:0});
    return actions.slice(0,maxActions);
  }
  const publishedIds=new Set(published.map(c=>c.id));
  const valid=rows.filter(r=>publishedIds.has(r.campaignId) && Number.isFinite(r.impressions) &&
    r.impressions>=0 && r.source!=='MARKETPLACE' &&
    Number.isFinite(Date.parse(r.observedAt)) &&
    Date.parse(r.observedAt)<=now.getTime()+60000);
  const covered=new Set(valid.map(r=>r.campaignId));
  const firstMissing=published.find(c=>!covered.has(c.id));
  if(firstMissing)actions.push({type:'IMPORT_METRICS',to:'/results',campaignId:firstMissing.id,evidenceCount:covered.size});
  const recent=valid.filter(r=>{const day=Date.parse(r.date+'T00:00:00Z');return Number.isFinite(day) && day>=now.getTime()-35*86400000 && day<=now.getTime();});
  if(valid.length&&!recent.length)actions.push({type:'CHECK_DATA_FRESHNESS',to:'/results',evidenceCount:valid.length});
  const observedIds=new Set(valid.filter(r=>r.impressions>0).map(r=>r.campaignId));
  const socialClicks=valid.reduce((sum,r)=>sum+Math.max(0,r.outboundClicks),0);
  const financialStatements=rows.filter(r=>publishedIds.has(r.campaignId)&&r.source==='MARKETPLACE'&&r.salesKnown!==false);
  if(socialClicks>0&&!financialStatements.length)actions.push({
    type:'VERIFY_REVENUE',to:'/results',evidenceCount:valid.length,observedClicks:socialClicks,
  });
  const eligible=published.flatMap(c=>{
    const captured=valid.filter(r=>r.campaignId===c.id);
    const impressions=captured.reduce((sum,r)=>sum+Math.max(0,r.impressions),0);
    const clicks=captured.reduce((sum,r)=>sum+Math.max(0,r.outboundClicks),0);
    return impressions>=1500?[{id:c.id,impressions,clicks}]:[];
  });
  const investigate=eligible.find(v=>v.impressions>=1500&&v.clicks/v.impressions<0.005);
  if(investigate)actions.push({
    type:'TEST_CREATIVE',to:'/review/'+encodeURIComponent(investigate.id),
    campaignId:investigate.id,evidenceCount:eligible.length,
    observedImpressions:investigate.impressions,observedClicks:investigate.clicks,
  });
  if(observedIds.size<12)actions.push({type:'BUILD_SAMPLE',to:'/radar',evidenceCount:observedIds.size});
  if(ready && actions.length<maxActions)actions.push({type:'PUBLISH_READY',to:'/publish/'+encodeURIComponent(ready.id),campaignId:ready.id,evidenceCount:0});
  return actions.slice(0,maxActions);
}
