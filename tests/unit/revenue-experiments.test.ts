import {describe,it,expect} from 'vitest';
import {deriveRevenueCohortObservation} from '../../packages/learning/src/revenueExperiments';
import type {AffiliateResult,PerformanceDaily} from '../../packages/analytics/src/index';
describe('Revenue learning guards',()=>{
  it('will not declare a winner with zero evidence',()=>{
    const result=deriveRevenueCohortObservation([],[],[]);
    expect(result.status).toBe('LOW_SAMPLE');
    expect(result.observedLeaderId).toBeUndefined();
    expect(result.caveat).toBe('OBSERVATIONAL_NOT_CAUSAL');
  });
  it('does not invent attribution from clicks alone',()=>{
    const value=deriveRevenueCohortObservation([], [{organizationId:'o',campaignId:'1',outboundClicks:500} as PerformanceDaily],[{organizationId:'o',campaignId:'1',attribution:'UNKNOWN',commission:20,status:'APPROVED'} as AffiliateResult]);
    expect(value.status).toBe('LOW_SAMPLE');
    expect(value.revenuePerClick).toBeUndefined();
  });
});
