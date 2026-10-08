import {describe,expect,it} from 'vitest';
import {summarizePerformance,type PerformanceDaily} from '../../packages/analytics/src/index';
const base:PerformanceDaily={id:'x',organizationId:'o',campaignId:'c',date:'2026-10-08',
 impressions:1000,outboundClicks:40,saves:10,engagements:30,pinClicks:50,sales:0,revenue:0,commission:0,
 source:'PINTEREST_CSV',salesKnown:false,observedAt:'2026-10-08T00:00:00Z'};
describe('Measured versus unknown business outcomes',()=>{
 it('never turns Pinterest traffic-only data into proven zero commission',()=>{
  const x=summarizePerformance([base]);
  expect(x.financialKnown).toBe(false);
  expect(x.epm).toBeNull();
  expect(x.ctr).toBe(0.04);
 });
 it('does not dilute measured financial conversion with unmonetized social impression counts',()=>{
  const x=summarizePerformance([base,{...base,id:'known',impressions:100,outboundClicks:10,sales:2,revenue:100,commission:10,source:'MANUAL',salesKnown:true}]);
  expect(x.financialKnown).toBe(true);
  expect(x.conversionRate).toBe(0.2);
  expect(x.epm).toBe(1000);
 });
});
