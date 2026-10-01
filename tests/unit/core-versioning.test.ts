import { describe, expect, it } from 'vitest';
import { nextCampaignVersion, restoreCampaignVersion, campaignVersions, type Campaign } from '../../packages/core/src/index';

const now=new Date().toISOString();
const base:Campaign={
  id:'c',organizationId:'o',status:'READY',marketplace:'MELI',
  score:{score:80,confidence:'medium',reasons:[],risks:[],version:'1.0',dimensions:{trend:14,intent:14,visual:12,yield:10,quality:10,competition:8,creative:7,seasonality:3,dataConfidence:2}},
  currentVersion:{id:'c-v1',campaignId:'c',version:1,createdAt:now,reason:'initial',
    product:{productId:'p',organizationId:'o',marketplace:'MELI',externalId:'x',title:{value:'P',source:'f',observedAt:now},url:{value:'https://example.com',source:'f',observedAt:now},currency:{value:'BRL',source:'f',observedAt:now},availability:{value:'available',source:'f',observedAt:now},assetRights:'UNKNOWN'},
    narrative:{headline:'H',pinterestTitle:'T',description:'D',disclosure:'afiliado',altText:'A',cta:'C'},boardName:'B',keyword:'K',template:'Minimal'},
  history:[]
};

describe('campaign versioning',()=>{
  it('keeps previous versions and can restore without deleting history',()=>{
    const v2=nextCampaignVersion(base,{template:'Editorial Premium'},'edit');
    const restored=restoreCampaignVersion(v2,1);
    expect(restored.currentVersion.version).toBe(3);
    expect(restored.currentVersion.template).toBe('Minimal');
    expect(campaignVersions(restored).map(v=>v.version)).toEqual([3,2,1]);
  });
});


it('links every new version to its exact parent and gives it a unique id',()=>{
  const v2a=nextCampaignVersion(base,{template:'Minimal'},'edit a');
  const v2b=nextCampaignVersion(base,{template:'Problem → Solution'},'edit b');
  expect(v2a.currentVersion.parentVersionId).toBe(base.currentVersion.id);
  expect(v2b.currentVersion.parentVersionId).toBe(base.currentVersion.id);
  expect(v2a.currentVersion.id).not.toBe(v2b.currentVersion.id);
  expect(v2a.currentVersion.version).toBe(2);
  expect(v2b.currentVersion.version).toBe(2);
});
