import { describe, expect, it } from 'vitest';
import { deriveLearning } from '../../packages/learning/src/index';
import type { Campaign } from '../../packages/core/src/index';

describe('learning engine', () => {
  it('refuses to overlearn from tiny samples', () => {
    const campaign={
      id:'c1',organizationId:'o',status:'PUBLISHED',marketplace:'MELI',
      score:{score:80,confidence:'medium',reasons:[],risks:[],version:'1.0',dimensions:{trend:14,intent:14,visual:12,yield:10,quality:10,competition:8,creative:7,seasonality:3,dataConfidence:2}},
      currentVersion:{id:'v1',campaignId:'c1',version:1,createdAt:new Date().toISOString(),reason:'initial',
        product:{productId:'p',organizationId:'o',marketplace:'MELI',externalId:'x',title:{value:'P',source:'f',observedAt:new Date().toISOString()},url:{value:'https://example.com',source:'f',observedAt:new Date().toISOString()},currency:{value:'BRL',source:'f',observedAt:new Date().toISOString()},availability:{value:'available',source:'f',observedAt:new Date().toISOString()},assetRights:'UNKNOWN'},
        narrative:{headline:'H',pinterestTitle:'T',description:'D',disclosure:'afiliado',altText:'A',cta:'C'},boardName:'B',keyword:'K',template:'Minimal'},
      history:[]
    } satisfies Campaign;
    const insights=deriveLearning([campaign],[]);
    expect(insights.some(i=>i.confidence==='insufficient')).toBe(true);
  });
});
