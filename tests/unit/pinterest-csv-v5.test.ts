import {describe,expect,it} from 'vitest';
import {parsePinterestMetricsCSV} from '../../packages/analytics/src/pinterestCsv';
const base={organizationId:'org-a',publishedCampaignIds:['ca'],now:new Date('2026-10-08T12:00:00Z')};
describe('Pinterest reporting CSV',()=>{
 const csv='date,campaignId,impressions,pinClicks,outboundClicks,saves,engagements\n2026-10-07,ca,120,10,7,4,15';
 it('ingests observed Pinterest-only metrics with unknown sales, not claimed zeros',()=>{
  const x=parsePinterestMetricsCSV({...base,csv});
  expect(x.rows[0]!.outboundClicks).toBe(7);
  expect(x.rows[0]!.salesKnown).toBe(false);
  expect(x.unknownSales).toBe(1);
 });
 it('blocks foreign or unpublished campaigns',()=>{
  expect(()=>parsePinterestMetricsCSV({...base,csv:csv.replace(',ca,',',foreign,')})).toThrow('PINTEREST_CAMPAIGN_NOT_PUBLISHED_OR_NOT_OWNED');
 });
 it('blocks duplicate dates to avoid double counting',()=>{
  expect(()=>parsePinterestMetricsCSV({...base,csv:csv+'\n2026-10-07,ca,120,10,7,4,15'})).toThrow('PINTEREST_CSV_DUPLICATE_DAY');
 });
 it('rejects invalid negative or invented metric input',()=>{
  expect(()=>parsePinterestMetricsCSV({...base,csv:csv.replace(',120,',',-120,')})).toThrow('PINTEREST_METRIC_INVALID');
 });
 it('generates stable ids for replace-not-add reimports',()=>{
  const a=parsePinterestMetricsCSV({...base,csv,now:new Date('2026-10-08T12:00:00Z')});
  const b=parsePinterestMetricsCSV({...base,csv,now:new Date('2026-10-08T14:00:00Z')});
  expect(a.rows[0]!.id).toBe(b.rows[0]!.id);
 });
});
