import {describe,it,expect} from 'vitest';
import type {Campaign} from '@nestaffiliate/core';
import type {PerformanceDaily} from '@nestaffiliate/analytics';
import {normalizePerformanceInput,summarizePerformance} from '../../packages/analytics/src/index';
import {buildAffiliateActionPlan} from '../../apps/web/src/lib/commercialActionPlan';

const now=new Date('2026-10-14T20:00:00Z');
const campaign=(id:string,status:Campaign['status']='PUBLISHED')=>({id,status}) as Campaign;
const metric=(id:string,impressions=2000,clicks=3,date='2026-10-12'):PerformanceDaily=>({
 id:'m-'+id,organizationId:'org',campaignId:id,date,impressions,
 outboundClicks:clicks,pinClicks:clicks,saves:15,engagements:26,
 sales:0,revenue:0,commission:0,source:'PINTEREST_CSV',salesKnown:false,observedAt:now.toISOString(),
});

describe('Evidence-based affiliate coaching',()=>{
 it('sends a beginner to discovery when nothing has been published',()=>{
   expect(buildAffiliateActionPlan([],[],now).map(a=>a.type)).toEqual(['START']);
 });
 it('asks for actual metrics instead of guessing why a Pin sold or failed',()=>{
   const actions=buildAffiliateActionPlan([campaign('c1')],[],now);
   expect(actions.map(a=>a.type)).toContain('IMPORT_METRICS');
   expect(actions.some(a=>a.type==='TEST_CREATIVE')).toBe(false);
 });
 it('uses observed impressions for an editorial test, without pretending clicks are revenue',()=>{
   const actions=buildAffiliateActionPlan([campaign('c1')],[metric('c1')],now);
   expect(actions.map(a=>a.type)).toContain('VERIFY_REVENUE');
   expect(actions.map(a=>a.type)).not.toContain('IMPORT_METRICS');
 });
 it('prompts a report refresh when only aged observations exist',()=>{
   const actions=buildAffiliateActionPlan([campaign('c1')],[metric('c1',500,4,'2026-07-01')],now);
   expect(actions.map(a=>a.type)).toContain('CHECK_DATA_FRESHNESS');
 });
 it('never treats empty manual sales fields as verified zeros',()=>{
   const missing=normalizePerformanceInput({organizationId:'org',campaignId:'c1',impressions:800,source:'MANUAL',salesKnown:false});
   const zero=normalizePerformanceInput({organizationId:'org',campaignId:'c1',impressions:800,source:'MANUAL',salesKnown:true,sales:0});
   expect(missing.salesKnown).toBe(false);
   expect(summarizePerformance([missing]).financialKnown).toBe(false);
   expect(summarizePerformance([missing]).epm).toBeNull();
   expect(zero.salesKnown).toBe(true);
   expect(summarizePerformance([zero]).financialKnown).toBe(true);
   const pinterest=normalizePerformanceInput({organizationId:'org',campaignId:'c1',source:'PINTEREST_API',outboundClicks:100});
   expect(pinterest.salesKnown).toBe(false);
 });
});
