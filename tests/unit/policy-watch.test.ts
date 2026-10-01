import { describe,expect,it } from 'vitest';
import {
  POLICY_BASELINES,
  isPolicySnapshotStale,
  policyWatchStatus,
  policyWatchSummary,
} from '../../packages/compliance/src/index';

describe('policy watch',()=>{
  it('ships only official https source references',()=>{
    expect(POLICY_BASELINES.length).toBeGreaterThanOrEqual(5);
    for(const policy of POLICY_BASELINES){
      expect(policy.sourceUrl?.startsWith('https://')).toBe(true);
      expect(policy.reviewedAt).toBeTruthy();
      expect(policy.reviewAfter).toBeTruthy();
    }
  });

  it('flags stale policy snapshots',()=>{
    const policy=POLICY_BASELINES[0]!;
    expect(isPolicySnapshotStale(policy,new Date('2026-10-01T12:00:00Z'))).toBe(false);
    expect(isPolicySnapshotStale(policy,new Date('2026-11-01T00:00:00Z'))).toBe(true);
    expect(policyWatchStatus(policy,new Date('2026-11-01T00:00:00Z'))).toBe('REVIEW_DUE');
  });

  it('summarizes review risk without hiding it',()=>{
    const summary=policyWatchSummary(new Date('2026-11-01T00:00:00Z'));
    expect(summary.reviewDue).toBeGreaterThan(0);
    expect(summary.current+summary.reviewSoon+summary.reviewDue).toBe(POLICY_BASELINES.length);
  });
});
