import { collection, getDocs, type Firestore } from 'firebase/firestore';

export interface DailyAgentReport {
  organizationId?: string;
  startedAt: string;
  completedAt: string;
  source?: 'github-actions' | 'client';
  status?: 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED';
  checked: number;
  changed: number;
  blocked: number;
  skipped: number;
  errors: number;
  signals?: number;
  opportunitiesAnalyzed?: number;
  opportunitiesPersisted?: number;
  campaignsCreated?: number;
  campaignsWaiting?: number;
  fallbackQueries?: number;
  opportunitiesExpired?: number;
  campaignsRevalidated?: number;
  verifiedBestSellerProducts?: number;
  categoriesCovered?: number;
  themesCovered?: number;
  topOpportunityScore?: number;
  topOpportunityKeyword?: string;
  queueMin?: number;
  queueTarget?: number;
  queueState?: 'FULL' | 'REFILLED' | 'NO_ELIGIBLE' | 'STABLE';
  nextExpectedAt?: string;
  messages: string[];
}

const collectionPath = (organizationId: string) => [
  'organizations', organizationId, 'products', 'nestaffiliate', 'dailyAgentRuns',
] as const;

export async function loadLatestDailyAgentReport(
  db: Firestore,
  organizationId: string,
): Promise<DailyAgentReport | null> {
  const snapshot = await getDocs(collection(db, ...collectionPath(organizationId)));
  const reports = snapshot.docs
    .map((item) => item.data() as DailyAgentReport)
    .filter((report) => !report.organizationId || report.organizationId === organizationId)
    .filter((report) => Boolean(report.completedAt))
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  return reports[0] ?? null;
}


export type DailyAgentHealth = 'HEALTHY' | 'DEGRADED' | 'STALE' | 'UNKNOWN';

export interface DailyAgentHealthState {
  status: DailyAgentHealth;
  ageMinutes: number | null;
  nextExpectedAt: string | null;
}

export function deriveDailyAgentHealth(
  report: DailyAgentReport | null,
  now = new Date(),
): DailyAgentHealthState {
  if (!report?.completedAt) return { status: 'UNKNOWN', ageMinutes: null, nextExpectedAt: null };

  const completedAt = new Date(report.completedAt).getTime();
  if (!Number.isFinite(completedAt)) return { status: 'UNKNOWN', ageMinutes: null, nextExpectedAt: null };

  const ageMinutes = Math.max(0, Math.round((now.getTime() - completedAt) / 60_000));
  const explicitNext = report.nextExpectedAt ? new Date(report.nextExpectedAt).getTime() : NaN;
  const nextExpectedMs = Number.isFinite(explicitNext) ? explicitNext : completedAt + 3 * 60 * 60_000;
  const nextExpectedAt = new Date(nextExpectedMs).toISOString();

  if (ageMinutes > 5 * 60) return { status: 'STALE', ageMinutes, nextExpectedAt };
  if (report.status === 'FAILED' || report.status === 'PARTIAL' || report.errors > 0) {
    return { status: 'DEGRADED', ageMinutes, nextExpectedAt };
  }
  return { status: 'HEALTHY', ageMinutes, nextExpectedAt };
}
