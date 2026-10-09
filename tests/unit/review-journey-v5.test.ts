import {describe,it,expect} from 'vitest';
import {runPublishingGuard} from '../../packages/compliance/src/index';
import {demoCampaigns} from '../../apps/web/src/lib/demo';
import {reviewBlockers} from '../../apps/web/src/lib/reviewReadiness';
import {getCampaignJourney} from '../../apps/web/src/features/CampaignJourney';
import type {Campaign} from '../../packages/core/src/index';
const sample=demoCampaigns[0]!;
function guard(c:Campaign){
 const v=c.currentVersion;
 return runPublishingGuard({
   product:v.product,disclosure:v.narrative.disclosure,
   destinationUrl:v.product.affiliateUrl?.value??v.product.url.value,
   headline:v.narrative.headline,description:v.narrative.description,
   creativeAsset:v.creativeAsset,
   requireAffiliateAttestation:Boolean(c.rankingContext?.v4ResearchDraft),
 });
}
describe('Transparent step-by-step campaign approval',()=>{
 it('shows what the user must do and does not change campaign status',()=>{
  const c:Campaign={...sample,organizationId:'real-tenant',rankingContext:{v4ResearchDraft:true},currentVersion:{...sample.currentVersion,product:{...sample.currentVersion.product,organizationId:'real-tenant',affiliateUrl:undefined}}};
  const before=JSON.stringify(c);
  const issues=reviewBlockers(c,guard(c));
  expect(issues.map(x=>x.key)).toContain('creative-pack');
  expect(issues.map(x=>x.key)).toContain('creative-image');
  expect(issues.map(x=>x.key)).toContain('guard-affiliate-link');
  expect(issues.every(x=>x.target.startsWith('#review-'))).toBe(true);
  expect(JSON.stringify(c)).toBe(before);
  expect(c.status).toBe('READY');
 });
 it('shows exactly which step is missing after a product is chosen',()=>{
  const c:Campaign={...sample,organizationId:'real-tenant',currentVersion:{...sample.currentVersion,product:{...sample.currentVersion.product,organizationId:'real-tenant',affiliateUrl:undefined}}};
  const steps=getCampaignJourney(c,'pt-BR');
  expect(steps.map(x=>x.name)).toEqual(['Escolher produto','Conferir link','Títulos e descrição','Imagem com ChatGPT','Aprovar o Pin','Publicar no Pinterest']);
  expect(steps[0]?.done).toBe(true);
  expect(steps[1]?.done).toBe(false);
  expect(steps[5]?.done).toBe(false);
 });
 it('does not treat a normal marketplace URL or tracking as commission proof',()=>{
  const c:Campaign={...sample,organizationId:'real-tenant'};
  expect(getCampaignJourney(c,'pt-BR')[1]?.done).toBe(false);
 });
 it('preserves historical demo smoke behavior while requiring finished images in real drafts',()=>{
  expect(reviewBlockers(sample,guard(sample))).toHaveLength(0);
  const real={...sample,organizationId:'live-org',currentVersion:{...sample.currentVersion,product:{...sample.currentVersion.product,organizationId:'live-org'}}};
  expect(reviewBlockers(real,guard(real)).map(x=>x.key)).toContain('creative-image');
 });
});
