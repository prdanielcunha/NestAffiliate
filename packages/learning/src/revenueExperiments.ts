import type {Campaign} from '@nestaffiliate/core';
import type {PerformanceDaily,AffiliateResult} from '@nestaffiliate/analytics';
export interface RevenueCohortObservation {
  status:'LOW_SAMPLE'|'COMPARABLE';
  matchedCampaigns:number;
  attributedOrders:number;
  observedLeaderId?:string;
  revenuePerClick?:number;
  caveat:'OBSERVATIONAL_NOT_CAUSAL';
}
/**
 * This is an observational comparison, never a randomized A/B test or
 * a claim that one creative causes more revenue.
 */
export function deriveRevenueCohortObservation(
  campaigns:Campaign[],performance:PerformanceDaily[],transactions:AffiliateResult[],
):RevenueCohortObservation {
  const base:RevenueCohortObservation={status:'LOW_SAMPLE',matchedCampaigns:0,attributedOrders:0,caveat:'OBSERVATIONAL_NOT_CAUSAL'};
  const groups=new Map<string,{campaignId:string;clicks:number;orders:number;approved:number}[]>();
  for(const campaign of campaigns){
    const key=campaign.marketplace+':'+campaign.currentVersion.keyword.normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
    const orders=transactions.filter((row)=>row.organizationId===campaign.organizationId &&
      row.campaignId===campaign.id && row.attribution==='EXACT' && row.channel==='PINTEREST' && row.status==='APPROVED');
    const approved=orders.reduce((sum,row)=>sum+row.commission,0);
    const clicks=performance.filter((row)=>row.organizationId===campaign.organizationId&&row.campaignId===campaign.id)
      .reduce((sum,row)=>sum+Math.max(0,row.outboundClicks),0);
    const bucket=groups.get(key)??[];
    bucket.push({campaignId:campaign.id,clicks,orders:orders.length,approved});
    groups.set(key,bucket);
  }
  // Compare a cohort WITHIN one exact marketplace + keyword group only.
  // Never mix unrelated products/channels just to reach the sample minimum.
  const eligibleGroups=[...groups.values()]
    .map((group)=>group.filter((row)=>row.clicks>=100 && row.orders>=3))
    .filter((group)=>group.length>=2);
  const comparable=eligibleGroups.sort((a,b)=>b.length-a.length)[0]??[];
  const attributedOrders=comparable.reduce((sum,row)=>sum+row.orders,0);
  if(comparable.length<2)return {...base,matchedCampaigns:0,attributedOrders:0};
  const ordered=[...comparable].sort((a,b)=>b.approved/b.clicks-a.approved/a.clicks);
  return {
    status:'COMPARABLE',
    matchedCampaigns:comparable.length,
    attributedOrders,
    observedLeaderId:ordered[0]!.campaignId,
    revenuePerClick:Number((ordered[0]!.approved/ordered[0]!.clicks).toFixed(4)),
    caveat:'OBSERVATIONAL_NOT_CAUSAL',
  };
}
