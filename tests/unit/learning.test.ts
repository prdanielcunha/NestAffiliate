import { describe, expect, it } from 'vitest';
import { deriveLearning, historicalScoreAdjustment } from '../../packages/learning/src/index';
import type { Campaign } from '../../packages/core/src/index';
import type { PerformanceDaily } from '../../packages/analytics/src/index';
import { buildPinterestCreativePack } from '../../packages/creative-engine/src/index';
import { buildPinterestCreativePack } from '../../packages/creative-engine/src/index';

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

  it('learns scene, angle and prompt performance only after enough comparable campaigns', () => {
    const campaigns=Array.from({length:12},(_,i)=>{
      const current=campaign('scene-'+i);
      const pack=buildPinterestCreativePack({
        organizationId:'o',
        campaignId:current.id,
        campaignVersion:1,
        product:current.currentVersion.product,
        keyword:current.currentVersion.keyword,
        boardName:current.currentVersion.boardName,
        locale:'pt-BR',
        createdAt:now,
      });
      return {
        ...current,
        currentVersion:{...current.currentVersion,creativePack:pack,template:'Lifestyle + Headline'},
      };
    });
    const metrics=campaigns.map((item)=>metric(item.id));
    const insights=deriveLearning(campaigns,metrics);
    const scene=insights.find((item)=>item.type==='CREATIVE_SCENE');
    expect(scene?.confidence).toBe('established');
    expect(scene?.dimensions?.sceneType).toBeTruthy();
    expect(scene?.dimensions?.angle).toBeTruthy();
    expect(scene?.dimensions?.promptVersion).toBe('1.0');
    expect(scene?.dimensions?.outboundClicks).toBeGreaterThan(0);
  });

  it('does not penalize 12 published campaigns when no performance was observed', () => {
    const published=Array.from({length:12},(_,i)=>campaign('empty-'+i));
    const adjustment=historicalScoreAdjustment(published,[],{productTheme:'cozinha'});
    expect(adjustment.adjustment).toBe(0);
    expect(adjustment.confidence).toBe('insufficient');
  });

  it('keeps Pinterest-only commission unknown rather than fabricating sales',()=>{
    const published=Array.from({length:12},(_,i)=>campaign('pin-only-'+i));
    const reports=published.map(c=>({...metric(c.id),sales:0,revenue:0,commission:0,source:'PINTEREST_CSV' as const,salesKnown:false}));
    const adjustment=historicalScoreAdjustment(published,reports,{productTheme:'cozinha'});
    expect(adjustment.adjustment).toBeGreaterThanOrEqual(-6);
    expect(adjustment.adjustment).toBeLessThanOrEqual(6);
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


  it('learns scene type, environment and creative angle only after repeated evidence', () => {
    const campaigns=Array.from({length:12},(_,i)=>{
      const item=campaign('visual-'+i);
      const pack=buildPinterestCreativePack({
        organizationId:item.organizationId,
        campaignId:item.id,
        campaignVersion:item.currentVersion.version,
        product:{...item.currentVersion.product,assetRights:'AUTHORIZED'},
        keyword:item.currentVersion.keyword,
        boardName:item.currentVersion.boardName,
        locale:'pt-BR',
        createdAt:now,
      });
      return {...item,currentVersion:{...item.currentVersion,creativePack:pack}};
    });
    const metrics=campaigns.map((item)=>metric(item.id));
    const insights=deriveLearning(campaigns,metrics);
    const contextual=insights.find((item)=>item.id.startsWith('creative-context:'));
    expect(contextual?.confidence).toBe('established');
    expect(contextual?.dimensions?.sceneType).toBeTruthy();
    expect(contextual?.dimensions?.environment).toBeTruthy();
    expect(contextual?.dimensions?.creativeAngle).toBeTruthy();
  });
});
