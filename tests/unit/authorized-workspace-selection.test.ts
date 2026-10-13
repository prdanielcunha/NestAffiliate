import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {workspaceCandidates,hasNestAffiliateEntitlement} from '../../apps/web/src/lib/workspaceCandidates';

describe('recover access from stale active organization safely',()=>{
 it('tries all existing candidate organizations in original priority, without duplication',()=>{
  expect(workspaceCandidates({
   activeOrganizationId:'unsubscribed-org',
   organizationId:'unsubscribed-org',
   primaryOrganizationId:'eligible-org',
   defaultOrganizationId:'other-org',
   organizations:['eligible-org','other-org','last-org'],
  })).toEqual(['unsubscribed-org','eligible-org','other-org','last-org']);
 });
 it('ignores invalid untrusted org identifiers and caps lookups',()=>{
  expect(workspaceCandidates({
   activeOrganizationId:'',
   organizationId:{id:'forged-org'},
   organizations:['valid-org',null,undefined,42,...Array.from({length:25},(_,i)=>'org-'+i)],
  })).toHaveLength(12);
 });
 it('does not authorize nonexistent, inactive or expired app entitlements',()=>{
  expect(hasNestAffiliateEntitlement({apps:{nestaffiliate:{status:'expired'}}})).toBe(false);
  expect(hasNestAffiliateEntitlement({apps:{nestaffiliate:{status:'cancelled'}}})).toBe(false);
  expect(hasNestAffiliateEntitlement({apps:{nestaffiliate:false}})).toBe(false);
  expect(hasNestAffiliateEntitlement({apps:{}})).toBe(false);
  expect(hasNestAffiliateEntitlement({apps:{nestaffiliate:true}})).toBe(true);
  expect(hasNestAffiliateEntitlement({apps:{nestaffiliate:{status:'trialing'}}})).toBe(true);
  expect(hasNestAffiliateEntitlement({apps:{nestaffiliate:{enabled:true}}})).toBe(true);
 });
 it('still requires an active verified member or global system role',()=>{
  const src=readFileSync('apps/web/src/lib/auth.tsx','utf8');
  expect(src).toContain('for (const organizationId of workspaceCandidates(profile))');
  expect(src).toContain('if (!hasNestAffiliateEntitlement(orgSnap.data()');
  expect(src).toContain("'members',user.uid");
  expect(src).toContain("['active','ativo'].includes");
  expect(src).toContain('if (privileged) return');
 });
});
