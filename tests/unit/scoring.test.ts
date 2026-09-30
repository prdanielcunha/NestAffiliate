import { describe, expect, it } from 'vitest';
import { calculateNestScore } from '../../packages/scoring/src/index';

describe('NestScore', () => {
  it('returns an explainable 0-100 score', () => {
    const result = calculateNestScore({
      trend: 18, intent: 16, visual: 14, yield: 14, quality: 12,
      competition: 10, creative: 8, seasonality: 4, dataConfidence: 4,
    });
    expect(result.score).toBe(100);
    expect(result.confidence).toBe('high');
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('clamps invalid values', () => {
    const result = calculateNestScore({
      trend: 999, intent: -2, visual: 14, yield: 14, quality: 12,
      competition: 10, creative: 8, seasonality: 4, dataConfidence: 4,
    });
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.dimensions.intent).toBe(0);
  });
});
