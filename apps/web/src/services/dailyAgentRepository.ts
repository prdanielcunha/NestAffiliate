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
