import {describe,it,expect} from 'vitest';
import type { CampaignVersion, ProductTruth } from '../../packages/core/src/index';
import {createReelKit} from '../../packages/creative-engine/src/reelKit';
const d='2026-10-07T10:00:00Z';
const product:ProductTruth={
  productId:'1',organizationId:'a',marketplace:'MELI',externalId:'1',
  title:{value:'Organizador',source:'test',observedAt:d},url:{value:'https://example.com',source:'test',observedAt:d},
  currency:{value:'BRL',source:'test',observedAt:d},availability:{value:'available',source:'test',observedAt:d},assetRights:'UNKNOWN',
};
const version:CampaignVersion={
  id:'1',campaignId:'1',version:1,createdAt:d,reason:'test',product,keyword:'cozinha',
  narrative:{headline:'!',pinterestTitle:'A',description:'B',disclosure:'Affiliate',altText:'A',cta:'C'},boardName:'Organização',template:'Minimal',
};
describe('Reel Kit compliance',()=>{
  it.each(['pt-BR','en','es'] as const)('creates honest manual only script in %s',(locale)=>{
    const kit=createReelKit(version,locale);
    expect(kit.format).toBe('VERTICAL_9_16');
    expect(kit.shotList).toHaveLength(3);
    expect(kit.assetRequirement).toBe('ORIGINAL_OR_AUTHORIZED_FOOTAGE');
    expect(kit.publishingMode).toBe('GUIDED_ONLY');
    expect(kit.disclosure.length).toBeGreaterThan(20);
    expect(JSON.stringify(kit)).not.toContain('R$');
  });
});
