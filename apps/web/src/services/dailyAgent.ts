import type { Campaign, ProductTruth } from '@nestaffiliate/core';
import { nextCampaignVersion } from '@nestaffiliate/core';
import { buildOpportunity } from '@nestaffiliate/radar';
import { freshValidateProduct } from './freshValidation';

export interface DailyAgentReport {
  startedAt:string;
  completedAt:string;
  checked:number;
  changed:number;
  blocked:number;
  skipped:number;
  errors:number;
  messages:string[];
}

export interface DailyAgentOptions {
  organizationId:string;
  campaigns:Campaign[];
  updateCampaign:(campaign:Campaign)=>void;
  maxProductsPerCycle?:number;
  minAgeMinutes?:number;
  refresh?:(organizationId:string,approved:ProductTruth)=>ReturnType<typeof freshValidateProduct>;
  now?:Date;
}

function observedAt(product:ProductTruth){
  const values=[
    product.title.observedAt,
    product.url.observedAt,
    product.price?.observedAt,
    product.availability.observedAt,
  ].filter((value):value is string=>Boolean(value));
  const timestamps=values
    .map((value)=>new Date(value).getTime())
    .filter(Number.isFinite);
  return timestamps.length ? Math.min(...timestamps) : 0;
}

export async function runDailyAgentCycle(options:DailyAgentOptions):Promise<DailyAgentReport>{
  const started=options.now ?? new Date();
  const minAgeMinutes=Math.max(15,options.minAgeMinutes ?? 60);
  const maxProducts=Math.max(1,Math.min(options.maxProductsPerCycle ?? 3,12));
  const refresh=options.refresh ?? freshValidateProduct;
  const cutoff=started.getTime()-minAgeMinutes*60_000;

  const candidates=options.campaigns
    .filter((campaign)=>campaign.status==='READY' && campaign.marketplace==='MELI')
    .filter((campaign)=>observedAt(campaign.currentVersion.product)<=cutoff)
    .sort((a,b)=>observedAt(a.currentVersion.product)-observedAt(b.currentVersion.product))
    .slice(0,maxProducts);

  const report:DailyAgentReport={
    startedAt:started.toISOString(),
    completedAt:started.toISOString(),
    checked:0,changed:0,blocked:0,skipped:0,errors:0,messages:[],
  };

  for(const campaign of candidates){
    try{
      const {result,current}=await refresh(options.organizationId,campaign.currentVersion.product);
      report.checked+=1;

      if(result.outcome==='BLOCK'){
        const blocked:Campaign={...campaign,status:'BLOCKED'};
        options.updateCampaign(blocked);
        report.blocked+=1;
        report.messages.push(`${campaign.currentVersion.keyword}: produto indisponível ou bloqueado na validação fresca.`);
        continue;
      }

      if(result.outcome==='REVIEW_REQUIRED'){
        const versioned=nextCampaignVersion(
          campaign,
          {product:current},
          'daily agent refresh',
        );
        const rescored=buildOpportunity(current,versioned.currentVersion.keyword).score;
        options.updateCampaign({...versioned,score:rescored,status:'READY'});
        report.changed+=1;
        report.messages.push(`${campaign.currentVersion.keyword}: dados atualizados e campanha versionada novamente.`);
        continue;
      }

      report.skipped+=1;
    }catch{
      report.errors+=1;
      report.messages.push(`${campaign.currentVersion.keyword}: não foi possível atualizar agora; nenhuma alteração foi aplicada.`);
    }
  }

  report.completedAt=(options.now ?? new Date()).toISOString();
  return report;
}
