import { describe, expect, it } from 'vitest';
import { normalizePerformanceInput, summarizePerformance } from '../../packages/analytics/src/index';

describe('analytics', () => {
  it('calculates EPM and rates', () => {
    const row=normalizePerformanceInput({
      organizationId:'o',campaignId:'c',impressions:1000,outboundClicks:50,saves:20,sales:5,revenue:120,commission:18
    });
    const sum=summarizePerformance([row]);
    expect(sum.epm).toBe(120);
    expect(sum.ctr).toBe(0.05);
    expect(sum.conversionRate).toBe(0.1);
  });

  it('never accepts negative metric totals', () => {
    const row=normalizePerformanceInput({organizationId:'o',campaignId:'c',impressions:-4,revenue:-10});
    expect(row.impressions).toBe(0);
    expect(row.revenue).toBe(0);
  });
});
