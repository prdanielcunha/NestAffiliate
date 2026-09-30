import type { Campaign } from '@nestaffiliate/core';
import type { PerformanceDaily } from '@nestaffiliate/analytics';
import { summarizePerformance } from '@nestaffiliate/analytics';

export interface LearningInsight {
  id:string;
  type:'CREATIVE_DNA'|'PRODUCT_DNA'|'PREFERENCE';
  confidence:'insufficient'|'emerging'|'established';
  title:string;
  explanation:string;
  evidenceCount:number;
  recommendation?:string;
}

function confidence(count:number): LearningInsight['confidence'] {
  if (count < 5) return 'insufficient';
  if (count < 12) return 'emerging';
  return 'established';
}

export function deriveLearning(campaigns: Campaign[], metrics: PerformanceDaily[]): LearningInsight[] {
  const published=campaigns.filter((c)=>c.status==='PUBLISHED');
  const insights:LearningInsight[]=[];

  const byTemplate=new Map<string,{campaignIds:Set<string>;rows:PerformanceDaily[]}>();
  for (const campaign of published) {
    const key=campaign.currentVersion.template;
    const bucket=byTemplate.get(key) ?? {campaignIds:new Set(),rows:[]};
    bucket.campaignIds.add(campaign.id);
    bucket.rows.push(...metrics.filter((row)=>row.campaignId===campaign.id));
    byTemplate.set(key,bucket);
  }

  for (const [template,bucket] of byTemplate) {
    const count=bucket.campaignIds.size;
    const summary=summarizePerformance(bucket.rows);
    const level=confidence(count);
    insights.push({
      id:`creative:${template}`,
      type:'CREATIVE_DNA',
      confidence:level,
      title:`${template}: ${level === 'insufficient' ? 'ainda sem amostra suficiente' : 'padrão em formação'}`,
      explanation: level === 'insufficient'
        ? `Só existem ${count} campanhas publicadas com este template. O sistema não transforma isso em regra ainda.`
        : `Com ${count} campanhas, o template registra CTR de ${(summary.ctr*100).toFixed(2)}% e save rate de ${(summary.saveRate*100).toFixed(2)}%.`,
      evidenceCount:count,
      recommendation:level === 'established' && summary.ctr > 0.02 ? 'Manter como template forte para testes controlados.' : undefined,
    });
  }

  const approvals=campaigns.filter((c)=>['PUBLICATION_READY','PUBLISHED'].includes(c.status)).length;
  const rejections=campaigns.filter((c)=>['REJECTED','BLOCKED'].includes(c.status)).length;
  const decisionCount=approvals+rejections;
  insights.push({
    id:'preference:approval',
    type:'PREFERENCE',
    confidence:confidence(decisionCount),
    title:'Preferências de aprovação',
    explanation: decisionCount < 5
      ? 'Ainda há poucas decisões humanas; o NestAffiliate não vai inferir sua preferência cedo demais.'
      : `Foram observadas ${decisionCount} decisões humanas, com ${approvals} aprovações e ${rejections} rejeições.`,
    evidenceCount:decisionCount,
  });

  return insights;
}
