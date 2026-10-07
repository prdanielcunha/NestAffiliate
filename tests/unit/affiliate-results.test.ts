import {describe,it,expect} from 'vitest';
import {parseAffiliateStatement,summarizeAffiliateResults} from '../../packages/analytics/src/affiliateResults';

const common={organizationId:'org-a',statementId:'report-20261007',knownCampaigns:[{id:'c1',trackingCode:'NA_ML_ORG_C1'}],now:new Date('2026-10-07T12:00:00Z')};
const header='marketplace,transactionId,status,commission,observedAt,currency,trackingCode,channel';
describe('Revenue Truth CSV import',()=>{
  it('recognizes pending, approved and reversed separately and only exact attribution',()=>{
    const csv=[header,
      'MELI,a1,APPROVED,"10,50",2026-10-05,BRL,NA_ML_ORG_C1,PINTEREST',
      'SHOPEE,a2,PENDING,3.25,2026-10-06,BRL,,UNKNOWN',
      'MELI,a3,REVERSED,4.90,2026-10-06,BRL,,FACEBOOK_REELS'].join('\n');
    const entries=parseAffiliateStatement({...common,csv});
    const summary=summarizeAffiliateResults(entries);
    expect(summary).toEqual({approved:10.5,pending:3.25,reversed:4.9,unknownAttribution:2,transactions:3});
    expect(entries[0]!.campaignId).toBe('c1');
    expect(entries[1]!.attribution).toBe('UNKNOWN');
  });
  it('idempotently summarizes repeated imports by stable identifier',()=>{
    const csv=[header,'MELI,order-1,APPROVED,12,2026-10-05,BRL,,UNKNOWN'].join('\n');
    const a=parseAffiliateStatement({...common,csv});
    const b=parseAffiliateStatement({...common,csv,statementId:'other-statement'});
    expect(summarizeAffiliateResults([...a,...b]).approved).toBe(12);
  });
  it('fails closed on invalid price, unknown campaign and duplicate ID',()=>{
    expect(()=>parseAffiliateStatement({...common,csv:[header,'MELI,id1,APPROVED,broken,2026-10-05,BRL,,UNKNOWN'].join('\n')})).toThrow('COMMISSION_INVALID');
    expect(()=>parseAffiliateStatement({...common,csv:'marketplace,transactionId,status,commission,observedAt,campaignId\nMELI,id1,APPROVED,10,2026-10-05,not-my-org'})).toThrow('CAMPAIGN_OUTSIDE_ORGANIZATION');
    expect(()=>parseAffiliateStatement({...common,csv:[header,'MELI,id1,PENDING,1,2026-10-05,BRL,,UNKNOWN','MELI,id1,APPROVED,1,2026-10-05,BRL,,UNKNOWN'].join('\n')})).toThrow('DUPLICATE_TRANSACTION_IN_STATEMENT');
  });
});
