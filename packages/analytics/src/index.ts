export interface PerformanceDaily {
  id: string;
  organizationId: string;
  campaignId: string;
  publicationId?: string;
  date: string;
  impressions: number;
  engagements: number;
  saves: number;
  pinClicks: number;
  outboundClicks: number;
  sales: number;
  revenue: number;
  commission: number;
  source: 'PINTEREST_API' | 'PINTEREST_CSV' | 'MARKETPLACE' | 'MANUAL';
  /** False for a Pinterest-only report: zero is NOT evidence of no sales. */
  salesKnown?: boolean;
  observedAt: string;
}

export interface PerformanceSummary {
  impressions:number;
  engagements:number;
  saves:number;
  pinClicks:number;
  outboundClicks:number;
  sales:number;
  revenue:number;
  commission:number;
  ctr:number;
  saveRate:number;
  conversionRate:number;
  epm:number | null;
}

export function summarizePerformance(rows: PerformanceDaily[]): PerformanceSummary {
  const total=rows.reduce((acc,row)=>({
    impressions:acc.impressions+Math.max(0,row.impressions),
    engagements:acc.engagements+Math.max(0,row.engagements),
    saves:acc.saves+Math.max(0,row.saves),
    pinClicks:acc.pinClicks+Math.max(0,row.pinClicks),
    outboundClicks:acc.outboundClicks+Math.max(0,row.outboundClicks),
    sales:acc.sales+Math.max(0,row.sales),
    revenue:acc.revenue+Math.max(0,row.revenue),
    commission:acc.commission+Math.max(0,row.commission),
  }),{impressions:0,engagements:0,saves:0,pinClicks:0,outboundClicks:0,sales:0,revenue:0,commission:0});
  return {
    ...total,
    ctr: total.impressions ? total.outboundClicks/total.impressions : 0,
    saveRate: total.impressions ? total.saves/total.impressions : 0,
    conversionRate: total.outboundClicks ? total.sales/total.outboundClicks : 0,
    epm: total.impressions ? (total.revenue/total.impressions)*1000 : null,
  };
}

export function normalizePerformanceInput(input: Partial<PerformanceDaily> & Pick<PerformanceDaily,'organizationId'|'campaignId'>): PerformanceDaily {
  const num=(value:unknown)=>Number.isFinite(Number(value)) ? Math.max(0,Number(value)) : 0;
  const date=input.date ?? new Date().toISOString().slice(0,10);
  return {
    id:input.id ?? `${input.campaignId}:${date}:manual`,
    organizationId:input.organizationId,
    campaignId:input.campaignId,
    publicationId:input.publicationId,
    date,
    impressions:num(input.impressions),
    engagements:num(input.engagements),
    saves:num(input.saves),
    pinClicks:num(input.pinClicks),
    outboundClicks:num(input.outboundClicks),
    sales:num(input.sales),
    revenue:num(input.revenue),
    commission:num(input.commission),
    source:input.source ?? 'MANUAL',
    observedAt:input.observedAt ?? new Date().toISOString(),
  };
}

export * from './affiliateResults';

export * from './pinterestCsv';
