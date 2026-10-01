import { describe, expect, it } from 'vitest';
import { deriveLearning, historicalScoreAdjustment } from '../../packages/learning/src/index';
import type { Campaign } from '../../packages/core/src/index';
import type { PerformanceDaily } from '../../packages/analytics/src/index';

const now=new Date().toISOString();

function campaign(id:string, status:Campaign['status']='PUBLISHED', template='Editorial Premium', board='Cozinha Pequena e Organizada'):Campaign{
  return {
    id,organizationId:'o',status,marketplace:'MELI',
    score:{score:80,confidence:'medium',reasons:[],risks:[],version:'1.0',dimensions:{trend:14,intent:14,visual:12,yield:10,quality:10,competition:8,creative:7,seasonality:3,dataConfidence:2}},
    currentVersion:{id:`${id}-v1`,campaignId:id,version:1,createdAt:now,reason:'initial',
      product:{productId:`p-${id}`,organizationId:'o',marketplace:'MELI',externalId:`x-${id}`,title:{value:'Organizador de cozinha',source:'f',observedAt:now},url:{value:'https://example.com',source:'f',observedAt:now},currency:{value:'BRL',source:'f',observedAt:now},availability:{value:'available',source:'f',observedAt:now},assetRights:'UNKNOWN'},
      narrative:{headline:'H',pinterestTitle:'T',description:'D',disclosure:'afiliado',altText:'A',cta:'C'},boardName:board,keyword:'organizador cozinha',template},
    history:[],
  };
}

function metric(id:string):PerformanceDaily{
  return {
    id:`m-${id}`,organizationId:'o',campaignId:id,date:'2026-09-30',
    impressions:1000,engagements:90,saves:35,pinClicks:70,outboundClicks:45,
    sales:6,revenue:120,commission:18,source:'MANUAL',observedAt:now,
  };
}

describe('learning engine', () => {
  it('refuses to overlearn from tiny samples', () => {
    const insights=deriveLearning([campaign('c1')],[]);
    expect(insights.some(i=>i.confidence==='insufficient')).toBe(true);
    expect(insights.find(i=>i.type==='PRODUCT_DNA')?.scoreAdjustment).toBe(0);
  });

  it('derives all DNA classes after repeated evidence', () => {
    const campaigns=Array.from({length:12},(_,i)=>campaign(`c${i}`));
    const metrics=campaigns.map((c)=>metric(c.id));
    const insights=deriveLearning(campaigns,metrics);
    expect(insights.some(i=>i.type==='CREATIVE_DNA' && i.confidence==='established')).toBe(true);
    expect(insights.some(i=>i.type==='PRODUCT_DNA' && i.confidence==='established')).toBe(true);
    expect(insights.some(i=>i.type==='AUDIENCE_DNA' && i.confidence==='established')).toBe(true);
    expect(insights.some(i=>i.type==='PREFERENCE' && i.confidence==='established')).toBe(true);
  });

  it('only adjusts score after a statistically safer minimum sample', () => {
    const campaigns=Array.from({length:12},(_,i)=>campaign(`c${i}`));
    const metrics=campaigns.map((c)=>metric(c.id));
    const adjustment=historicalScoreAdjustment(campaigns,metrics,{productTheme:'cozinha'});
    expect(adjustment.confidence).toBe('established');
    expect(adjustment.evidenceCount).toBe(12);
    expect(adjustment.adjustment).toBeGreaterThanOrEqual(-6);
    expect(adjustment.adjustment).toBeLessThanOrEqual(6);
  });
});
