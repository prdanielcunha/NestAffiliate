import {describe,it,expect} from 'vitest';
import {reconcileAffiliateImport} from '../../packages/analytics/src/reconcile';
import {parseAffiliateStatement} from '../../packages/analytics/src/affiliateResults';
const knownCampaigns=[{id:'c1',trackingCode:'track-1'},{id:'c2',trackingCode:'track-2'}];
function row(status:'PENDING'|'APPROVED'|'REVERSED'='PENDING',observedAt='2026-10-01',extra=''){
 return parseAffiliateStatement({csv:'marketplace,transactionId,status,commission,observedAt,trackingCode,channel'+
   '\nMELI,tx-1,'+status+',4.50,'+observedAt+',track-1,PINTEREST'+extra,
 organizationId:'org',statementId:'statement-1',knownCampaigns})[0]!;
}
describe('Affiliate revenue reconciliation',()=>{
 it('does not double-count same statement or duplicate same transaction',()=>{
  const one=row();const r=reconcileAffiliateImport([one],[one]);
  expect(r.unchanged).toBe(1);expect(r.toWrite).toEqual([]);
 });
 it('allows a later approval and legitimate reversal, no artificial revenue',()=>{
  const one=row('PENDING');
  const approval={...row('APPROVED','2026-10-02'),statementId:'statement-2'};
  const reviewed=reconcileAffiliateImport([one],[approval]);
  expect(reviewed.updates).toBe(1);
  const reversed={...row('REVERSED','2026-10-03'),statementId:'statement-3'};
  expect(reconcileAffiliateImport([approval],[reversed]).reversed).toBe(1);
 });
 it('rejects old reports from overwriting approvals and blocking a genuine refund',()=>{
  const approved=row('APPROVED','2026-10-02');
  expect(reconcileAffiliateImport([approved],[row('PENDING','2026-10-01')]).conflicts[0]!.code).toBe('STALE_PROVIDER_STATEMENT');
  expect(reconcileAffiliateImport([approved],[row('PENDING','2026-10-03')]).conflicts[0]!.code).toBe('FINANCIAL_STATUS_REGRESSION');
 });
 it('does not call a typed campaign ID exact attribution',()=>{
  const csv='marketplace,transactionId,status,commission,observedAt,campaignId,channel\nMELI,tx-2,APPROVED,5.00,2026-10-02,c1,PINTEREST';
  const [parsed]=parseAffiliateStatement({csv,organizationId:'org',statementId:'statement-2',knownCampaigns});
  expect(parsed!.campaignId).toBe('c1');
  expect(parsed!.attribution).toBe('UNKNOWN');
 });
 it('rejects ambiguous tracking identifiers',()=>{
  expect(()=>parseAffiliateStatement({csv:'marketplace,transactionId,status,commission,observedAt,trackingCode\nMELI,tx-3,APPROVED,5.00,2026-10-03,shared',organizationId:'org',statementId:'statement-3',knownCampaigns:[{id:'a',trackingCode:'shared'},{id:'b',trackingCode:'shared'}]})).toThrow('TRACKING_CODE_AMBIGUOUS');
 });
});
