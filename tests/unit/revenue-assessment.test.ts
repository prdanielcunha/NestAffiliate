import { describe,it,expect } from 'vitest';
import type { ProductTruth } from '../../packages/core/src/index';
import { assessRevenueOpportunity,revenueEvidence } from '../../packages/radar/src/revenueAssessment';
import { findComparableOffers } from '../../packages/radar/src/offerCompare';
import { buildSearchSignal, buildOpportunity,buildMeliTrendSignal } from '../../packages/radar/src/index';

const now=new Date('2026-10-07T15:00:00.000Z');
const observedAt='2026-10-07T14:00:00.000Z';
function makeProduct(marketplace:'MELI'|'SHOPEE'='MELI'):ProductTruth{
  return {
    organizationId:'org-a',productId:'id',externalId:'offer-a',marketplace,listingVerified:true,
    title:{value:'Organizador modular gaveta 30cm',source:'official',observedAt},
    url:{value:'https://example.com/product',source:'official',observedAt},
    affiliateUrl:{value:'https://example.com/affiliate',source:'official',observedAt},
    price:{value:50,source:'official',observedAt},
    currency:{value:'BRL',source:'official',observedAt},
    soldQuantity:{value:200,source:'official',observedAt},
    availability:{value:'available',source:'official',observedAt},
    imageUrl:{value:'https://example.com/img',source:'official',observedAt},
    assetRights:'AUTHORIZED',
  };
}
describe('Revenue Radar 3.0 evidence truth',()=>{
  it('never mistakes search offer density for demand proof',()=>{
    const signal=buildSearchSignal({marketplace:'MELI',keyword:'gaveta',resultCount:200,confidence:1,observedAt});
    const evidence=revenueEvidence(signal,now);
    expect(evidence.evidenceType).toBe('SUPPLY_DENSITY');
    const assessment=assessRevenueOpportunity(buildOpportunity(makeProduct(),'gaveta',{signals:[signal]}),now);
    expect(assessment.demandConfidence).toBe('LOW');
    expect(assessment.uncertainties).toContain('DEMAND_NOT_VERIFIED');
  });
  it('keeps commercial score historic and separates confidence',()=>{
    const opportunity=buildOpportunity(makeProduct(),'gaveta',{signals:[buildMeliTrendSignal({position:1,keyword:'gaveta',observedAt})]});
    const result=assessRevenueOpportunity(opportunity,now);
    expect(result.scoreVersion).toBe(opportunity.score.version);
    expect(result.baseNestScore).toBe(opportunity.score.score);
    expect(result.track).toBe('VALIDATED');
    expect(result.demandConfidence).toBe('MEDIUM');
    expect(result.revenueConfidence).toBe('UNKNOWN');
  });
  it('marks unknown sales exploratory, not verified',()=>{
    const p={...makeProduct(),soldQuantity:undefined};
    const result=assessRevenueOpportunity(buildOpportunity(p,'gaveta'),now);
    expect(result.track).toBe('EXPLORATORY');
    expect(result.uncertainties).toContain('UNKNOWN_SALES');
  });
  it('blocks unsafe destination',()=>{
    const p={...makeProduct(),url:{...makeProduct().url,value:'http://localhost:9090'}};
    const result=assessRevenueOpportunity(buildOpportunity(p,'gaveta'),now);
    expect(result.track).toBe('BLOCKED');
  });
  it('requires proof for attributed commission',()=>{
    const p=makeProduct('SHOPEE');
    const valid={...p,commissionRate:{value:0.1,source:'shopee-affiliate-open-api',observedAt}};
    expect(assessRevenueOpportunity(buildOpportunity(valid,'gaveta'),now).revenueConfidence).toBe('MEDIUM');
    expect(assessRevenueOpportunity(buildOpportunity({...valid,commissionRate:{...valid.commissionRate,source:'unknown'}},'gaveta'),now).revenueConfidence).toBe('UNKNOWN');
  });
});
describe('Equivalent offer comparison',()=>{
  it('compares only same organization, different marketplace, with review pending',()=>{
    const a=makeProduct();
    const b={...makeProduct('SHOPEE'),externalId:'offer-b'};
    const result=findComparableOffers(a,[a,b,{...b,organizationId:'org-b'}],now);
    expect(result).toHaveLength(1);
    expect(result[0]!.equivalence).toBe('REQUIRES_REVIEW');
    expect(result[0]!.estimatedCommissionPerSale).toBeNull();
  });
  it('never merges different declared sizes',()=>{
    const a=makeProduct();
    const b={...makeProduct('SHOPEE'),title:{...a.title,value:'Organizador modular gaveta 45cm'}};
    expect(findComparableOffers(a,[b],now)).toHaveLength(0);
  });
});
