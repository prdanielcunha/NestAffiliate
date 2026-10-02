import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import type { ApprovalEvent, Campaign, ProductTruth, PublicationPackage, PublicationSchedule } from '@nestaffiliate/core';
import { campaignVersions, canWrite, nextCampaignVersion, publicationScheduleStatus, restoreCampaignVersion, validateScheduledFor, type Role } from '@nestaffiliate/core';
import { maxDuplicateSimilarity, runPublishingGuard, type FreshValidationResult, type PublicationFingerprint } from '@nestaffiliate/compliance';
import { MercadoLivrePublicAdapter } from '@nestaffiliate/integrations';
import { buildOpportunity, buildSearchSignal, signalResolverFromSnapshots, shortlist, type CommerceSignal, type Opportunity, type OpportunitySignals } from '@nestaffiliate/radar';
import type { PerformanceDaily } from '@nestaffiliate/analytics';
import { deriveLearning } from '@nestaffiliate/learning';
import { campaignFilename, CREATIVE_TEMPLATES, renderPin } from '@nestaffiliate/creative-engine';
import { FEATURE_FLAGS, KILL_SWITCHES, automationEnabled, canAttemptPinterestPublish } from '@nestaffiliate/config';
import { type Locale } from './lib/i18n';
import { I18nProvider, useI18n } from './lib/i18n-context';
import { demoCampaigns, initialBoards } from './lib/demo';
import { useAuth } from './lib/auth';
import { db } from './lib/firebase';
import { listCampaigns, saveCampaign } from './services/campaignRepository';
import { listPerformance, savePerformance } from './services/performanceRepository';
import { appendAudit } from './services/auditRepository';
import { persistCampaignIntelligence } from './services/intelligenceRepository';
import { appendApprovalEvent, markPublication, markPublicationScheduled, saveFreshComplianceCheck, savePublicationPackage } from './services/lifecycleRepository';
import { saveLearningInsights } from './services/learningRepository';
import { listApprovalEvents } from './services/approvalRepository';
import { ManualProductImport } from './features/ManualProductImport';
import { OfficialSignalImport } from './features/OfficialSignalImport';
import { PerformancePanel } from './features/PerformancePanel';
import { PromptStudio } from './features/PromptStudio';
import { ConnectionCenter } from './features/ConnectionCenter';
import { ensureNestAffiliateWorkspace } from './services/workspaceBootstrap';
import { defaultPreferences, loadUserPreferences, saveUserPreferences, type UserPreferences } from './services/preferencesRepository';
import { recordRadarSignal } from './services/radarRepository';
import { loadPublicationFrequency, type PublicationFrequencyState } from './services/publicationRepository';
import { SettingsPanel } from './features/SettingsPanel';
import { runDailyAgentCycle, type DailyAgentReport } from './services/dailyAgent';
import { freshValidateProduct } from './services/freshValidation';
import { completePublicationSchedule, listPublicationSchedules, savePublicationSchedule } from './services/publicationScheduleRepository';
import { listMarketSignals, saveMarketSignals } from './services/marketSignalRepository';

const marketplaceAdapter = new MercadoLivrePublicAdapter();
const STORAGE_PREFIX = 'nestaffiliate_campaigns_v1';

function useCampaignStore(organizationId: string | null, actorId: string | null, role: Role | null) {
  const demoEnabled =
    import.meta.env.VITE_DEMO_DATA_ENABLED === 'true' ||
    import.meta.env.VITE_E2E_MOCK_AUTH === 'true';
  const storageKey = `${STORAGE_PREFIX}:${organizationId ?? 'pending'}`;
  const [campaigns, setCampaigns] = useState<Campaign[]>(demoEnabled ? demoCampaigns : []);
  const [syncError,setSyncError]=useState<'conflict'|'generic'|null>(null);

  useEffect(() => {
    if (!organizationId) return;
    let active = true;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setCampaigns(JSON.parse(stored) as Campaign[]);
      } else {
        setCampaigns(
          demoEnabled
            ? demoCampaigns.map((campaign) => ({ ...campaign, organizationId }))
            : [],
        );
      }
    } catch {
      localStorage.removeItem(storageKey);
    }

    if (db && !demoEnabled) {
      void listCampaigns(db, organizationId)
        .then((remote) => {
          if (active && remote.length) setCampaigns(remote);
        })
        .catch(() => undefined);
    }
    return () => {
      active = false;
    };
  }, [organizationId, storageKey, demoEnabled]);

  useEffect(() => {
    if (!organizationId) return;
    localStorage.setItem(storageKey, JSON.stringify(campaigns));
  }, [campaigns, organizationId, storageKey]);

  const persist = (campaign: Campaign, action: string) => {
    if (db && organizationId && actorId && !demoEnabled) {
      const currentDb = db;
      setSyncError(null);
      void saveCampaign(currentDb, organizationId, campaign)
        .then(() => persistCampaignIntelligence(currentDb, organizationId, campaign))
        .then(() => appendAudit(currentDb, {
          organizationId,
          actorId,
          action,
          entityType: 'campaign',
          entityId: campaign.id,
          metadata: { status: campaign.status, version: campaign.currentVersion.version },
        }))
        .catch(async (error:unknown) => {
          const conflict=error instanceof Error && error.message.includes('STALE_CAMPAIGN_WRITE');
          setSyncError(conflict ? 'conflict' : 'generic');
          try{
            const remote=await listCampaigns(currentDb,organizationId);
            setCampaigns(remote);
          }catch{
            // Keep the explicit sync error visible if even recovery fails.
          }
        });
    }
  };

  const update = (campaign: Campaign) => {
    if (!role || !canWrite(role)) return;
    setCampaigns((items) =>
      items.map((item) => (item.id === campaign.id ? campaign : item)),
    );
    persist(campaign, 'campaign.updated');
  };

  const add = (campaign: Campaign) => {
    if (!role || !canWrite(role)) return;
    setCampaigns((items) => [campaign, ...items]);
    persist(campaign, 'campaign.created');
  };

  return { campaigns, update, add, syncError, clearSyncError:()=>setSyncError(null) };
}

function usePerformanceStore(organizationId: string | null, actorId: string | null, role: Role | null) {
  const demoEnabled =
    import.meta.env.VITE_DEMO_DATA_ENABLED === 'true' ||
    import.meta.env.VITE_E2E_MOCK_AUTH === 'true';
  const key = `nestaffiliate_performance_v1:${organizationId ?? 'pending'}`;
  const [rows, setRows] = useState<PerformanceDaily[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(key) ?? '[]') as PerformanceDaily[];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!organizationId) return;
    let active = true;
    try {
      setRows(JSON.parse(localStorage.getItem(key) ?? '[]') as PerformanceDaily[]);
    } catch {
      localStorage.removeItem(key);
      setRows([]);
    }
    if (db && !demoEnabled) {
      void listPerformance(db, organizationId)
        .then((remote) => {
          if (active && remote.length) setRows(remote);
        })
        .catch(() => undefined);
    }
    return () => { active = false; };
  }, [organizationId, key, demoEnabled]);

  useEffect(() => {
    if (organizationId) localStorage.setItem(key, JSON.stringify(rows));
  }, [rows, organizationId, key]);

  const save = (row: PerformanceDaily) => {
    if (!role || !canWrite(role)) return;
    setRows((current) => [row, ...current.filter((item) => item.id !== row.id)]);
    if (db && organizationId && actorId && !demoEnabled) {
      const currentDb = db;
      void savePerformance(currentDb, organizationId, row)
        .then(() => appendAudit(currentDb, {
          organizationId,
          actorId,
          action: 'performance.recorded',
          entityType: 'performanceDaily',
          entityId: row.id,
          metadata: { campaignId: row.campaignId, date: row.date },
        }))
        .catch(() => undefined);
    }
  };

  return { rows, save };
}

function usePreferencesStore(
  organizationId:string | null,
  userId:string | null,
  role:Role | null,
  locale:Locale,
){
  const key=`nestaffiliate_preferences_v1:${organizationId ?? 'pending'}:${userId ?? 'anonymous'}`;
  const fallback=defaultPreferences(organizationId ?? 'pending',userId ?? 'anonymous',locale);
  const [preferences,setPreferences]=useState<UserPreferences>(()=>{
    try{
      const stored=localStorage.getItem(key);
      return stored ? {...fallback,...JSON.parse(stored)} as UserPreferences : fallback;
    }catch{
      return fallback;
    }
  });

  useEffect(()=>{
    if(!organizationId || !userId) return;
    let active=true;
    const nextFallback=defaultPreferences(organizationId,userId,locale);
    try{
      const stored=localStorage.getItem(key);
      setPreferences(stored ? {...nextFallback,...JSON.parse(stored)} as UserPreferences : nextFallback);
    }catch{
      localStorage.removeItem(key);
      setPreferences(nextFallback);
    }
    if(db){
      const currentDb=db;
      void loadUserPreferences(currentDb,organizationId,userId,locale)
        .then((remote)=>{ if(active) setPreferences(remote); })
        .catch(()=>undefined);
    }
    return ()=>{active=false;};
  },[organizationId,userId,locale,key]);

  useEffect(()=>{
    if(organizationId && userId) localStorage.setItem(key,JSON.stringify(preferences));
  },[organizationId,userId,key,preferences]);

  const update=(next:UserPreferences)=>{
    if(!role || !canWrite(role)) return;
    setPreferences(next);
    if(db && organizationId && userId){
      const currentDb=db;
      void saveUserPreferences(currentDb,{...next,organizationId,userId}).catch(()=>undefined);
    }
  };

  return {preferences,update};
}

function usePublicationScheduleStore(
  organizationId:string | null,
  actorId:string | null,
  role:Role | null,
){
  const demoEnabled=
    import.meta.env.VITE_DEMO_DATA_ENABLED==='true' ||
    import.meta.env.VITE_E2E_MOCK_AUTH==='true';
  const key=`nestaffiliate_schedules_v1:${organizationId ?? 'pending'}`;
  const [schedules,setSchedules]=useState<PublicationSchedule[]>(()=>{
    try{
      return (JSON.parse(localStorage.getItem(key) ?? '[]') as PublicationSchedule[])
        .map((item)=>({...item,status:publicationScheduleStatus(item)}));
    }catch{
      return [];
    }
  });

  useEffect(()=>{
    if(!organizationId) return;
    let active=true;
    try{
      const stored=(JSON.parse(localStorage.getItem(key) ?? '[]') as PublicationSchedule[])
        .map((item)=>({...item,status:publicationScheduleStatus(item)}));
      setSchedules(stored);
    }catch{
      localStorage.removeItem(key);
      setSchedules([]);
    }
    if(db && !demoEnabled){
      const currentDb=db;
      void listPublicationSchedules(currentDb,organizationId)
        .then((remote)=>{if(active)setSchedules(remote);})
        .catch(()=>undefined);
    }
    return ()=>{active=false;};
  },[organizationId,key,demoEnabled]);

  useEffect(()=>{
    if(!organizationId) return;
    const normalized=schedules.map((item)=>({...item,status:publicationScheduleStatus(item)}));
    localStorage.setItem(key,JSON.stringify(normalized));
  },[organizationId,key,schedules]);

  const add=(schedule:PublicationSchedule)=>{
    if(!role || !canWrite(role)) return;
    setSchedules((items)=>[schedule,...items.filter((item)=>item.id!==schedule.id)]);
    if(db && organizationId && actorId && !demoEnabled){
      const currentDb=db;
      void savePublicationSchedule(currentDb,schedule)
        .then(()=>appendAudit(currentDb,{
          organizationId,
          actorId,
          action:'publication.scheduled',
          entityType:'publicationSchedule',
          entityId:schedule.id,
          metadata:{campaignId:schedule.campaignId,scheduledFor:schedule.scheduledFor,mode:schedule.mode},
        }))
        .catch(()=>undefined);
    }
  };

  const complete=(campaignId:string,campaignVersion:number)=>{
    const matches=schedules.filter((item)=>
      item.campaignId===campaignId &&
      item.campaignVersion===campaignVersion &&
      !['COMPLETED','CANCELLED'].includes(item.status),
    );
    if(!matches.length) return;
    setSchedules((items)=>items.map((item)=>
      matches.some((match)=>match.id===item.id)
        ? {...item,status:'COMPLETED',updatedAt:new Date().toISOString()}
        : item
    ));
    if(db && organizationId && !demoEnabled){
      const currentDb=db;
      for(const match of matches){
        void completePublicationSchedule(currentDb,organizationId,match.id).catch(()=>undefined);
      }
    }
  };

  return {schedules,add,complete};
}

function useDailyAgent(input:{
  authState:string;
  organizationId:string|null;
  actorId:string|null;
  editable:boolean;
  campaigns:Campaign[];
  updateCampaign:(campaign:Campaign)=>void;
}){
  const reportKey=`nestaffiliate_daily_agent_report:${input.organizationId ?? 'pending'}`;
  const runKey=`nestaffiliate_daily_agent_last_run:${input.organizationId ?? 'pending'}`;
  const [report,setReport]=useState<DailyAgentReport|null>(()=>{
    try{
      const stored=localStorage.getItem(reportKey);
      return stored ? JSON.parse(stored) as DailyAgentReport : null;
    }catch{
      return null;
    }
  });
  const running=useRef(false);

  useEffect(()=>{
    const demoEnabled=
      import.meta.env.VITE_DEMO_DATA_ENABLED==='true' ||
      import.meta.env.VITE_E2E_MOCK_AUTH==='true';
    if(
      input.authState!=='ready' ||
      !input.organizationId ||
      !input.actorId ||
      !input.editable ||
      demoEnabled ||
      !automationEnabled() ||
      running.current
    ) return;

    const lastRun=Number(localStorage.getItem(runKey) ?? '0');
    if(Number.isFinite(lastRun) && Date.now()-lastRun<30*60_000) return;

    running.current=true;
    localStorage.setItem(runKey,String(Date.now()));
    void runDailyAgentCycle({
      organizationId:input.organizationId,
      campaigns:input.campaigns,
      updateCampaign:input.updateCampaign,
      maxProductsPerCycle:3,
      minAgeMinutes:60,
    }).then((next)=>{
      setReport(next);
      localStorage.setItem(reportKey,JSON.stringify(next));
      if(db){
        const currentDb=db;
        void appendAudit(currentDb,{
          organizationId:input.organizationId!,
          actorId:input.actorId!,
          action:'daily_agent.completed',
          entityType:'systemCycle',
          entityId:next.completedAt,
          metadata:{
            checked:next.checked,
            changed:next.changed,
            blocked:next.blocked,
            errors:next.errors,
          },
        }).catch(()=>undefined);
      }
    }).finally(()=>{
      running.current=false;
    });
  },[
    input.authState,
    input.organizationId,
    input.actorId,
    input.editable,
    input.campaigns,
    input.updateCampaign,
    reportKey,
    runKey,
  ]);

  return report;
}

function campaignFingerprint(campaign:Campaign):PublicationFingerprint{
  const version=campaign.currentVersion;
  return {
    productId:version.product.productId,
    imageUrl:version.product.imageUrl?.value,
    headline:version.narrative.headline,
    description:version.narrative.description,
    template:version.template,
    board:version.boardName,
    keyword:version.keyword,
    publishedAt:campaign.status==='PUBLISHED' ? version.createdAt : undefined,
  };
}

function campaignDuplicateSimilarity(candidate:Campaign,campaigns:Campaign[]){
  const recent=campaigns
    .filter((item)=>item.id!==candidate.id && item.status==='PUBLISHED')
    .map(campaignFingerprint);
  return maxDuplicateSimilarity(campaignFingerprint(candidate),recent);
}

function SyncErrorBanner({
  kind,
  onDismiss,
}:{
  kind:'conflict'|'generic'|null;
  onDismiss:()=>void;
}){
  const {t}=useI18n();
  if(!kind) return null;
  return <div className="global-sync-error" role="alert">
    <span>{kind==='conflict' ? t('syncConflict') : t('syncError')}</span>
    <button className="text-button" onClick={onDismiss}>{t('dismiss')}</button>
  </div>;
}

function Login() {
  const { t } = useI18n();
  const { state, signIn, switchAccount, user, authError, authPending, clearAuthError } = useAuth();
  if (state === 'ready') return <Navigate to="/" replace />;

  const authErrorMessage = authError === 'auth/configuration-unavailable'
    ? t('authConfigError')
    : authError === 'auth/unauthorized-domain'
      ? t('authDomainError')
      : ['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/web-storage-unsupported'].includes(authError ?? '')
        ? t('authPopupError')
        : authError
          ? t('authGenericError')
          : null;
  return (
    <main className="login-shell">
      <section className="login-brand">
        <div className="brand-mark large">N</div>
        <p className="eyebrow">AFFILIATE INTELLIGENCE BY MILLIONSNEST</p>
        <h1>{t('loginTitle')}</h1>
        <p>{t('loginDescription')}</p>
        <div className="signal-line"><span /> Intelligence → Creation → Approval → Learning</div>
      </section>
      <section className="login-card">
        <div className="status-orb" />
        <h2>{state === 'loading' ? t('loadingAccount') : t('enterContinue')}</h2>
        <p className="muted">{t('loginPrivacy')}</p>
        {authErrorMessage && <div className="notice danger" role="alert">{authErrorMessage}</div>}
        {state === 'denied' ? (
          <>
            <div className="notice danger">{t('accessDenied')}</div>
            <button
              className="button primary"
              disabled={authPending}
              onClick={() => { clearAuthError(); void switchAccount().catch(() => undefined); }}
            >
              {authPending ? t('openingGoogle') : t('tryAnother')}
            </button>
          </>
        ) : (
          <button
            className="button primary"
            disabled={authPending || state === 'loading'}
            onClick={() => { clearAuthError(); void signIn().catch(() => undefined); }}
          >
            {authPending ? t('openingGoogle') : t('continueGoogle')}
          </button>
        )}
        <a className="button secondary" href={import.meta.env.VITE_HUB_URL || 'https://www.millionsnest.com'}>
          {t('openHub')}
        </a>
        <nav className="login-legal-links" aria-label="Legal">
          <a href="/privacy">{t('privacy')}</a>
          <a href="/terms">{t('terms')}</a>
          <a href="/data-deletion">{t('dataDeletion')}</a>
        </nav>
        {user?.email && <small className="muted">{user.email}</small>}
      </section>
    </main>
  );
}

function Shell({ children, locale, setLocale }: { children: React.ReactNode; locale: Locale; setLocale: (l: Locale) => void }) {
  const { t } = useI18n();
  const { logout, role } = useAuth();
  const [commandOpen, setCommandOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('na_theme') as 'dark' | 'light') || 'dark');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('na_theme', theme);
  }, [theme]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (event.key === 'Escape') setCommandOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const primary: Array<[string, string]> = [
    ['/', t('today')], ['/radar', t('radar')], ['/campaigns', t('campaigns')], ['/results', t('results')],
  ];
  const secondary: Array<[string, string]> = [
    ['/library', t('library')], ['/boards', t('boards')], ['/connections', t('connections')],
    ['/prompt-studio', t('promptStudio')], ['/ai-cost', t('cost')], ['/settings', t('settings')], ['/workspace', t('workspace')], ['/help', t('help')],
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink to="/" className="brand">
          <span className="brand-mark">N</span><span>NestAffiliate</span>
        </NavLink>
        <nav>{primary.map(([to,label]) => <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>)}</nav>
        <div className="nav-separator" />
        <nav className="secondary-nav">{secondary.map(([to,label]) => <NavLink key={to} to={to}>{label}</NavLink>)}</nav>
        <div className="sidebar-bottom">
          <span className="role-chip">{role ?? 'viewer'}</span>
          <button className="text-button" onClick={logout}>{t('signOut')}</button>
        </div>
      </aside>
      <div className="shell-main">
        <header className="topbar">
          <div className="automation-pill"><span className="status-orb" /> {t('automationActive')}</div>
          <div className="top-actions">
            <button className="icon-button" onClick={() => setCommandOpen(true)} aria-label="Command bar">⌘K</button>
            <button className="icon-button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Theme">{theme === 'dark' ? '☼' : '◐'}</button>
            <select value={locale} onChange={(e) => setLocale(e.target.value as Locale)} aria-label="Language">
              <option value="pt-BR">PT</option><option value="en">EN</option><option value="es">ES</option>
            </select>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
      <nav className="bottom-nav">
        {primary.map(([to,label]) => <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>)}
      </nav>
      {commandOpen && <CommandPalette close={() => setCommandOpen(false)} />}
    </div>
  );
}

function CommandPalette({ close }: { close: () => void }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const commands: Array<[string, string]> = [
    [t('today'), '/'], [t('showOpportunities'), '/radar'], [t('reviewCampaigns'), '/campaigns'],
    [t('viewResults'), '/results'], [t('connectPinterest'), '/connections'], [t('promptStudio'), '/prompt-studio'], [t('aiCosts'), '/ai-cost'], [t('settings'), '/settings'],
  ];
  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <div className="command" onMouseDown={(e) => e.stopPropagation()}>
        <input autoFocus placeholder={t('commandPlaceholder')} />
        {commands.map(([label,to]) => <button key={to} onClick={() => { navigate(to); close(); }}>{label}<span>↗</span></button>)}
      </div>
    </div>
  );
}

function Today({ campaigns, schedules, agentReport }: { campaigns: Campaign[]; schedules: PublicationSchedule[]; agentReport: DailyAgentReport|null }) {
  const { t, locale } = useI18n();
  const ready = campaigns.filter((c) => c.status === 'READY');
  const liveSchedules=schedules
    .map((item)=>({...item,status:publicationScheduleStatus(item)}))
    .filter((item)=>!['COMPLETED','CANCELLED','BLOCKED'].includes(item.status));
  const due=liveSchedules.filter((item)=>item.status==='DUE');
  const upcoming=liveSchedules.filter((item)=>item.status==='SCHEDULED').slice(0,3);
  const productCount = new Set(campaigns.map((c) => c.currentVersion.product.productId)).size;
  return (
    <div className="page">
      <section className="hero">
        <p className="eyebrow">{t('today').toUpperCase()}</p>
        <h1>{t('workedForYou')}</h1>
        <p className="hero-sub">{t('heroSub')}</p>
        <div className="stat-row">
          <Stat value={String(productCount)} label={t('productsInCampaigns')} />
          <Stat value={String(campaigns.length)} label={t('opportunitiesSaved')} />
          <Stat value={String(ready.length)} label={t('ready')} />
        </div>
        <NavLink to={ready[0] ? `/review/${ready[0].id}` : '/radar'} className="button primary hero-cta">
          {ready.length ? t('reviewCount',{n:ready.length}) : t('findOpportunities')}
        </NavLink>
      </section>
      <section className="section">
        <div className="section-heading"><h2>{t('needsYou')}</h2><span>{ready.length ? '~2 min' : t('allDone')}</span></div>
        {ready.length ? (
          <div className="campaign-grid">
            {ready.slice(0,3).map((campaign) => <CampaignCard key={campaign.id} campaign={campaign} />)}
          </div>
        ) : <Empty title={t('nothingNeeds')} body={t('nothingNeedsBody')} />}
      </section>
      {(due.length > 0 || upcoming.length > 0) && (
        <section className="section">
          {due.length > 0 && <>
            <div className="section-heading"><h2>{t('duePublications')}</h2><span>{due.length}</span></div>
            <div className="schedule-list">
              {due.map((schedule)=> {
                const campaign=campaigns.find((item)=>item.id===schedule.campaignId);
                if(!campaign) return null;
                return <NavLink className="schedule-card due" key={schedule.id} to={`/publish/${schedule.campaignId}`}>
                  <div><strong>{campaign.currentVersion.keyword}</strong><span>{new Date(schedule.scheduledFor).toLocaleString(locale)}</span></div>
                  <b>{t('openPublisher')} →</b>
                </NavLink>;
              })}
            </div>
          </>}
          {upcoming.length > 0 && <>
            <div className="section-heading schedule-upcoming-heading"><h2>{t('upcomingPublications')}</h2><span>{upcoming.length}</span></div>
            <div className="schedule-list">
              {upcoming.map((schedule)=>{
                const campaign=campaigns.find((item)=>item.id===schedule.campaignId);
                if(!campaign) return null;
                return <NavLink className="schedule-card" key={schedule.id} to={`/publish/${schedule.campaignId}`}>
                  <div><strong>{campaign.currentVersion.keyword}</strong><span>{new Date(schedule.scheduledFor).toLocaleString(locale)}</span></div>
                  <b>{t('scheduled')}</b>
                </NavLink>;
              })}
            </div>
          </>}
        </section>
      )}
      <section className="two-col">
        <div className="surface">
          <p className="eyebrow">{t('whileAway')}</p>
          <div className="timeline">
            <span><b>{agentReport?.checked ?? 0}</b> {t('productsChecked')}</span>
            <span><b>{agentReport?.changed ?? 0}</b> {t('productsChanged')}</span>
            <span><b>{agentReport?.blocked ?? 0}</b> {t('complianceBlocks')}</span>
            <span><b>{ready.length}</b> {t('campaignsWaiting')}</span>
            {agentReport?.completedAt && <small>{t('lastSync')}: {new Date(agentReport.completedAt).toLocaleString(locale)}</small>}
          </div>
        </div>
        <div className="surface">
          <p className="eyebrow">CUSTO</p>
          <h3>R$ 0,00</h3>
          <p className="muted">{t('paidServicesBlocked')}</p>
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return <div className="stat"><strong>{value}</strong><span>{label}</span></div>;
}

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const { t } = useI18n();
  const v = campaign.currentVersion;
  return (
    <NavLink className="campaign-card" to={`/review/${campaign.id}`}>
      <div className="mini-pin">
        <span>{v.keyword}</span><strong>{v.narrative.headline}</strong><em>Achados do Nest</em>
      </div>
      <div className="card-copy">
        <div className="score-line"><b>{campaign.score.score}</b><span>NestScore · {t('confidence')} {t(campaign.score.confidence as 'high'|'medium'|'low')}</span></div>
        <h3>{v.product.title.value}</h3>
        <p>{campaign.score.reasons[0]}</p>
        <span className="market-chip">{campaign.marketplace === 'MELI' ? 'Mercado Livre' : 'Shopee'}</span>
      </div>
    </NavLink>
  );
}

function Radar({ addCampaign, organizationId, editable }: { addCampaign: (c: Campaign) => void; organizationId: string; editable: boolean }) {
  const { t, locale } = useI18n();
  const identity=useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('organizador cozinha pequena');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [marketSignals,setMarketSignals]=useState<CommerceSignal[]>([]);
  const [maxPrice,setMaxPrice]=useState('');
  const [requireImage,setRequireImage]=useState(false);
  const [state, setState] = useState<'idle'|'loading'|'error'>('idle');

  useEffect(()=>{
    if(!db || !organizationId) return;
    let active=true;
    const currentDb=db;
    void listMarketSignals(currentDb,organizationId)
      .then((signals)=>{if(active)setMarketSignals(signals);})
      .catch(()=>undefined);
    return ()=>{active=false;};
  },[organizationId]);

  async function search(signalOverride?:CommerceSignal[]) {
    setState('loading');
    try {
      const found = await marketplaceAdapter.search({ organizationId, query, limit: 25 });
      if(db && identity.user?.uid){
        const currentDb=db;
        void recordRadarSignal({db:currentDb,organizationId,query,products:found}).catch(()=>undefined);
      }
      const ceiling=maxPrice.trim() ? Number(maxPrice.replace(',','.')) : null;
      const snapshotResolver=signalResolverFromSnapshots(signalOverride ?? marketSignals);
      const ranked=shortlist(found,query,20,(product)=>{
        const stored=snapshotResolver(product,query);
        return {
          ...stored,
          signals:[
            ...stored.signals,
            buildSearchSignal({
              marketplace:product.marketplace,
              keyword:query,
              resultCount:found.length,
              confidence:0.76,
            }),
          ],
        };
      })
        .filter((opportunity)=>ceiling===null || !opportunity.product.price || opportunity.product.price.value<=ceiling)
        .filter((opportunity)=>!requireImage || Boolean(opportunity.product.imageUrl));
      setOpportunities(ranked.slice(0,12));
      setState('idle');
    } catch {
      setState('error');
    }
  }

  function create(
    product: ProductTruth,
    keywordOverride?: string,
    signalInput?:OpportunitySignals,
    rank?:number,
  ) {
    if (!editable) return;
    const campaignKeyword = keywordOverride?.trim() || query;
    const opportunity = buildOpportunity(product, campaignKeyword, signalInput ?? {signals:[]});
    const score = opportunity.score;
    const id = `campaign-${Date.now()}`;
    const campaign: Campaign = {
      id, organizationId, status: 'READY', marketplace: product.marketplace, score,
      rankingContext:{
        rank,
        trackingCode:opportunity.trackingCode,
        evidence:opportunity.rankingReasons,
        signalSources:opportunity.commercialSignals.map((signal)=>signal.source),
      },
      currentVersion: {
        id: `${id}-v1`, campaignId: id, version: 1, createdAt: new Date().toISOString(), reason: 'radar',
        product,
        narrative: {
          headline: `Uma ideia prática para ${campaignKeyword.toLowerCase()}`,
          subheadline: 'Curadoria simples para uma casa mais funcional.',
          pinterestTitle: `${campaignKeyword}: uma solução prática para o dia a dia`,
          description: 'Uma curadoria editorial para ajudar a organizar melhor a rotina. Antes de publicar, confirme o link afiliado.',
          disclosure: 'Conteúdo com link de afiliado. Posso receber comissão por compras qualificadas, sem custo adicional para você.',
          altText: `Ideia editorial relacionada a ${campaignKeyword}.`,
          cta: 'Ver a ideia',
        },
        boardName: campaignKeyword.includes('cozinha') ? initialBoards[0]! : initialBoards[7]!,
        keyword: campaignKeyword,
        template: 'Editorial Premium',
      },
      history: [],
    };
    addCampaign(campaign);
    if(db && signalInput?.signals.length){
      const currentDb=db;
      void saveMarketSignals(currentDb,organizationId,signalInput.signals)
        .then(()=>setMarketSignals((items)=>[
          ...items.filter((existing)=>!signalInput.signals.some((signal)=>signal.id===existing.id)),
          ...signalInput.signals,
        ]))
        .catch(()=>undefined);
    }
    navigate(`/review/${id}`);
  }

  function prepareAffiliate(opportunity:Opportunity){
    window.open(opportunity.product.url.value,'_blank','noopener,noreferrer');
    void navigator.clipboard.writeText(opportunity.product.url.value).catch(()=>undefined);
  }

  return (
    <div className="page">
      <PageTitle eyebrow="RADAR" title={t('opportunities')} subtitle={t('opportunitiesSub')} />
      <div className="search-box">
        <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void search()} placeholder="Ex.: organizador cozinha pequena" />
        <button className="button primary" onClick={() => void search()}>{t('analyzeProducts')}</button>
      </div>
      <div className="chips"><span>{t('home')}</span><span>{t('kitchen')}</span><span>Mercado Livre</span><span>{t('dedupeActive')}</span><span>{t('localSeasonality')}</span><span>{marketSignals.length ? t('officialSignals',{n:marketSignals.length}) : t('trendDataPending')}</span></div>
      <div className="radar-filters">
        <label>
          <span>{t('maxPrice')}</span>
          <input inputMode="decimal" value={maxPrice} onChange={(e)=>setMaxPrice(e.target.value)} placeholder={t('noLimit')} />
        </label>
        <label className="filter-check">
          <input type="checkbox" checked={requireImage} onChange={(e)=>setRequireImage(e.target.checked)} />
          <span>{t('withImageOnly')}</span>
        </label>
      </div>
      {state === 'loading' && <ProgressSteps />}
      {state === 'error' && <div className="notice danger">{t('radarError')}</div>}
      {!opportunities.length && state === 'idle' && <Empty title={t('radarEmpty')} body={t('radarEmptyBody')} />}
      {editable ? (
        <>
          <OfficialSignalImport onImported={async (signals)=>{
            const merged=[
              ...marketSignals.filter((existing)=>!signals.some((signal)=>signal.id===existing.id)),
              ...signals,
            ];
            if(db) await saveMarketSignals(db,organizationId,signals);
            setMarketSignals(merged);
            if(opportunities.length) void search(merged);
          }} />
          <ManualProductImport organizationId={organizationId} onImported={(product, keyword, signals) => create(product, keyword, signals)} />
        </>
      ) : (
        <div className="notice">{t('readOnlyRadar')}</div>
      )}
      <div className="opportunity-grid">
        {opportunities.map((opportunity,index) => {
          const product=opportunity.product;
          return (
          <article className="opportunity-card radar2-card" key={product.externalId}>
            <div className="product-image">
              {product.imageUrl ? <img src={product.imageUrl.value} alt="" /> : <span>{t('assetUnavailable')}</span>}
              <span className="rank-pill">#{index+1}</span>
              <span className="radar-score">{opportunity.score.score}</span>
            </div>
            <div className="opportunity-copy">
              <div className="opportunity-meta">
                <span className="market-chip">{product.marketplace==='MELI'?'Mercado Livre':'Shopee'}</span>
                <span>NestScore 2.0 · {t(opportunity.score.confidence as 'high'|'medium'|'low')}</span>
              </div>
              <h3>{product.title.value}</h3>
              <p className="price">{product.price ? new Intl.NumberFormat(locale,{style:'currency',currency:product.currency.value}).format(product.price.value) : t('priceUnknown')}</p>
              <div className="ranking-reasons">
                <strong>{t('whyRanked')}</strong>
                {opportunity.rankingReasons.slice(0,3).map((reason)=><span key={reason}>{reason}</span>)}
              </div>
              <div className="tracking-row"><code>{opportunity.trackingCode}</code><button className="text-button" onClick={()=>void navigator.clipboard.writeText(opportunity.trackingCode)}>{t('copyTracking')}</button></div>
              <div className="opportunity-actions">
                <a className="button secondary" href={product.url.value} target="_blank" rel="noreferrer">{t('openProduct')}</a>
                <button className="button secondary" onClick={()=>prepareAffiliate(opportunity)}>{t('affiliatePrep')}</button>
                <button className="button primary" disabled={!editable} onClick={() => create(product,query,{signals:opportunity.commercialSignals},index+1)}>{t('createCampaign')}</button>
              </div>
            </div>
          </article>
        )})}
      </div>
    </div>
  );
}

function Review({ campaigns, update, editable }: { campaigns: Campaign[]; update: (c: Campaign) => void; editable: boolean }) {
  const { t, locale } = useI18n();
  const { id } = useParams();
  const identity = useAuth();
  const navigate = useNavigate();
  const campaign = campaigns.find((c) => c.id === id)!;
  const [command, setCommand] = useState('');
  const [saved, setSaved] = useState(true);
  const [affiliateDraft, setAffiliateDraft] = useState('');
  const [affiliateError, setAffiliateError] = useState('');
  const [swapOptions, setSwapOptions] = useState<ProductTruth[]>([]);
  const [swapLoading, setSwapLoading] = useState(false);
  const approvingRef = useRef(false);

  useEffect(() => {
    setAffiliateDraft(campaign?.currentVersion.product.affiliateUrl?.value ?? '');
    setAffiliateError('');
  }, [campaign?.currentVersion.id, campaign?.currentVersion.product.affiliateUrl?.value]);

  if (!campaign) return <Navigate to="/campaigns" replace />;
  const activeCampaign: Campaign = campaign;
  const v = activeCampaign.currentVersion;

  function recordDecision(
    decision:ApprovalEvent['decision'],
    target:Campaign,
    note?:string,
  ){
    if(!db || !identity.organizationId || !identity.user?.uid) return;
    const currentDb=db;
    void appendApprovalEvent(currentDb,{
      organizationId:identity.organizationId,
      campaign:target,
      actorId:identity.user.uid,
      decision,
      note,
    }).catch(()=>undefined);
  }

  function applyEdit(raw: string) {
    const text = raw.trim().toLowerCase();
    if (!text) return;
    let narrative = { ...v.narrative };
    let template = v.template;
    if (text.includes('premium')) {
      template = 'Editorial Premium';
      narrative.headline = `Uma escolha mais elegante para ${v.keyword}`;
      narrative.subheadline = 'Menos ruído. Mais função e intenção.';
    } else if (text.includes('headline') || text.includes('título') || text.includes('titulo')) {
      narrative.headline = `${v.keyword}: uma ideia que muda a rotina`;
    } else if (text.includes('menos texto') || text.includes('clean') || text.includes('limpo')) {
      template = 'Minimal';
      narrative.subheadline = 'Uma solução simples, visual e funcional.';
    } else if (text.includes('fundo')) {
      template = text.includes('claro') ? 'Editorial Light' : 'Editorial Premium';
    } else if (text.includes('refaz tudo')) {
      template = 'Problem → Solution';
      narrative = {
        ...narrative,
        headline: `Pouco espaço? Comece por ${v.keyword}`,
        subheadline: 'Um novo ângulo editorial para a mesma oportunidade.',
      };
    } else {
      narrative.subheadline = `Ajuste solicitado: ${raw.trim()}`;
    }
    const next=nextCampaignVersion(campaign, { narrative, template }, raw.trim());
    update(next);
    recordDecision(text.includes('refaz tudo') ? 'REGENERATED' : 'EDITED',next,raw.trim());
    setCommand('');
    setSaved(true);
  }

  function saveAffiliateLink() {
    try {
      const url = new URL(affiliateDraft.trim());
      if (url.protocol !== 'https:') throw new Error('https');
      const product: ProductTruth = {
        ...v.product,
        affiliateUrl: {
          value: url.toString(),
          source: 'user-provided',
          observedAt: new Date().toISOString(),
        },
      };
      const next=nextCampaignVersion(campaign, { product }, 'affiliate link updated');
      update(next);
      recordDecision('EDITED',next,'affiliate link updated');
      setAffiliateError('');
      setSaved(true);
    } catch {
      setAffiliateError(t('affiliateInvalid'));
    }
  }

  async function loadSwaps() {
    setSwapLoading(true);
    setSwapOptions([]);
    try {
      const alternatives = await marketplaceAdapter.search({
        organizationId: campaign.organizationId,
        query: v.keyword,
        limit: 8,
      });
      setSwapOptions(alternatives.filter((item) => item.externalId !== v.product.externalId));
    } catch {
      setAffiliateError(t('radarError'));
    } finally {
      setSwapLoading(false);
    }
  }

  function chooseSwap(product: ProductTruth) {
    const versioned = nextCampaignVersion(
      campaign,
      { product: { ...product, organizationId: campaign.organizationId } },
      'product swap',
    );
    const next={ ...versioned, marketplace: product.marketplace };
    update(next);
    recordDecision('SWAPPED',next,'product swap');
    setSwapOptions([]);
    setAffiliateDraft('');
  }

  function approve() {
    if (approvingRef.current) return;
    approvingRef.current = true;
    const destination = v.product.affiliateUrl?.value ?? v.product.url.value;
    const guard = runPublishingGuard({
      product: v.product,
      disclosure: v.narrative.disclosure,
      destinationUrl: destination,
      headline: v.narrative.headline,
      description: v.narrative.description,
      duplicateSimilarity: campaignDuplicateSimilarity(campaign,campaigns),
    });
    const next: Campaign = {
      ...campaign,
      status: guard.outcome === 'BLOCK' ? 'BLOCKED' : 'PUBLICATION_READY',
    };
    update(next);
    if (db && identity.organizationId && identity.user?.uid && guard.outcome !== 'BLOCK') {
      void appendApprovalEvent(db, {
        organizationId: identity.organizationId,
        campaign: next,
        actorId: identity.user.uid,
        decision: 'APPROVED',
      }).catch(() => undefined);
    }
    if (guard.outcome !== 'BLOCK') {
      navigate(`/publish/${campaign.id}`);
    } else {
      approvingRef.current = false;
    }
  }

  return (
    <div className="review-page">
      <div className="review-grid">
        <PinPreview campaign={activeCampaign} />
        <section className="decision-panel">
          <div className="review-header">
            <div><p className="eyebrow">{t('review')}</p><h1>{v.keyword}</h1></div>
            <div className="score-badge"><strong>{campaign.score.score}</strong><span>NestScore<br/>{t('confidence')} {t(campaign.score.confidence as 'high'|'medium'|'low')}</span></div>
          </div>
          <Disclosure title={t('product')} defaultOpen>
            <h3>{v.product.title.value}</h3>
            <p className="muted">{campaign.marketplace} · {v.product.sellerName?.value ?? t('sellerUnknown')}</p>
            <small>{t('source')}: {v.product.title.source} · {new Date(v.product.title.observedAt).toLocaleString(locale)}</small>
            <div className="affiliate-editor">
              <label>{campaign.marketplace === 'MELI' ? t('affiliateRequired') : t('affiliateOfficial')}</label>
              <div className="inline-editor">
                <input
                  value={affiliateDraft}
                  onChange={(e) => { setAffiliateDraft(e.target.value); setSaved(false); }}
                  placeholder="https://..."
                  inputMode="url"
                  aria-label="Link afiliado"
                />
                <button className="button secondary" onClick={saveAffiliateLink}>{t('validateLink')}</button>
              </div>
              {affiliateError && <p className="field-error">{affiliateError}</p>}
              {!v.product.affiliateUrl && campaign.marketplace === 'MELI' && (
                <p className="field-hint">{t('affiliateMissing')}</p>
              )}
            </div>
          </Disclosure>
          <Disclosure title={t('why')} defaultOpen>
            <ul>{(campaign.rankingContext?.evidence?.length ? campaign.rankingContext.evidence : campaign.score.reasons).map((reason) => <li key={reason}>{reason}</li>)}</ul>
            {campaign.rankingContext?.trackingCode && <div className="tracking-row"><code>{campaign.rankingContext.trackingCode}</code><button className="text-button" onClick={()=>void navigator.clipboard.writeText(campaign.rankingContext!.trackingCode!)}>{t('copyTracking')}</button></div>}
          </Disclosure>
          <Disclosure title={t('content')}>
            <label>{t('title')}</label><p>{v.narrative.pinterestTitle}</p>
            <label>{t('description')}</label><p>{v.narrative.description}</p>
            <label>Disclosure</label><p>{v.narrative.disclosure}</p>
          </Disclosure>
          <Disclosure title={t('pinterest')}>
            <label>{t('board')}</label>
            <select
              value={v.boardName}
              disabled={!editable}
              onChange={(e) => {
                const next=nextCampaignVersion(campaign,{boardName:e.target.value},'board changed');
                update(next);
                recordDecision('EDITED',next,`board:${e.target.value}`);
              }}
            >
              {initialBoards.map((board) => <option key={board} value={board}>{board}</option>)}
            </select>
            <label>{t('template')}</label>
            <select
              value={v.template}
              disabled={!editable}
              onChange={(e) => {
                const next=nextCampaignVersion(campaign,{template:e.target.value},'template changed');
                update(next);
                recordDecision('PREFERRED_VARIANT',next,`template:${e.target.value}`);
              }}
            >
              {CREATIVE_TEMPLATES.map((template) => <option key={template.id} value={template.label}>{template.label}</option>)}
            </select>
            <p><b>{t('alt')}:</b> {v.narrative.altText}</p>
          </Disclosure>
          <Disclosure title={t('historyUndo')}>
            <div className="version-list">
              {campaignVersions(campaign).map((version) => (
                <button
                  key={version.id}
                  className={version.id === v.id ? 'version-row current' : 'version-row'}
                  disabled={!editable || version.id === v.id}
                  onClick={() => {
                    const next=restoreCampaignVersion(campaign,version.version);
                    update(next);
                    recordDecision('RESTORED',next,`restore:v${version.version}`);
                  }}
                >
                  <span>v{version.version} · {version.reason}</span>
                  <small>{new Date(version.createdAt).toLocaleString(locale)}</small>
                </button>
              ))}
            </div>
          </Disclosure>
          <div className="save-state">{saved ? t('saved') : t('saving')} · v{v.version}</div>
          <div className="primary-actions">
            <button className="button primary" disabled={!editable} onClick={approve}>{t('approve')}</button>
            <button className="button secondary" disabled={!editable} onClick={() => document.getElementById('ai-edit')?.focus()}>{t('edit')}</button>
          </div>
          <div className="minor-actions">
            <button disabled={!editable} onClick={() => void loadSwaps()}>{swapLoading ? t('searching') : t('swap')}</button>
            <button disabled={!editable} onClick={() => applyEdit('Refaz tudo')}>{t('redo')}</button>
            <button disabled={!editable} onClick={() => {
              const rejected: Campaign = { ...campaign, status: 'REJECTED' };
              update(rejected);
              if (db && identity.organizationId && identity.user?.uid) {
                void appendApprovalEvent(db, {
                  organizationId: identity.organizationId,
                  campaign: rejected,
                  actorId: identity.user.uid,
                  decision: 'REJECTED',
                }).catch(() => undefined);
              }
            }}>{t('discard')}</button>
          </div>
          {swapOptions.length > 0 && (
            <div className="swap-panel">
              <div className="section-heading"><h3>{t('bestAlternatives')}</h3><button className="text-button" onClick={() => setSwapOptions([])}>{t('close')}</button></div>
              {swapOptions.slice(0, 4).map((product, index) => (
                <button className="swap-option" key={product.externalId} onClick={() => chooseSwap(product)}>
                  <span>{index === 0 ? t('recommended') : index === 1 ? t('cheaper') : t('alternative')}</span>
                  <strong>{product.title.value}</strong>
                  <em>{product.price ? new Intl.NumberFormat('pt-BR',{style:'currency',currency:product.currency.value}).format(product.price.value) : t('priceUnknown')}</em>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
      <div className="ai-bar">
        <span className="spark">✦</span>
        <input id="ai-edit" disabled={!editable} value={command} onChange={(e) => { setSaved(false); setCommand(e.target.value); }} onKeyDown={(e) => e.key === 'Enter' && applyEdit(command)} placeholder={editable ? t('askChange') : t('readOnly')} />
        <button disabled={!editable} onClick={() => applyEdit(command)}>{t('apply')}</button>
      </div>
    </div>
  );
}

function PinPreview({ campaign }: { campaign: Campaign }) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvasRef.current) void renderPin(canvasRef.current, campaign.currentVersion);
  }, [campaign.currentVersion]);
  return (
    <section className="preview-panel">
      <div className="preview-toolbar"><span>{t('pinPreview')}</span><span>1000 × 1500 · 2:3</span></div>
      <canvas ref={canvasRef} className="pin-canvas" aria-label="Prévia do Pin" />
    </section>
  );
}

function Disclosure({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return <details className="disclosure" open={defaultOpen}><summary>{title}<span>+</span></summary><div>{children}</div></details>;
}

function Publish({
  campaigns, update, preferences, onSchedule, completeSchedule,
}: {
  campaigns: Campaign[];
  update: (c: Campaign) => void;
  preferences: UserPreferences;
  onSchedule:(schedule:PublicationSchedule)=>void;
  completeSchedule:(campaignId:string,campaignVersion:number)=>void;
}) {
  const { t } = useI18n();
  const { id } = useParams();
  const identity = useAuth();
  const campaign = campaigns.find((c) => c.id === id);
  const [step, setStep] = useState(0);
  const [frequency,setFrequency]=useState<PublicationFrequencyState>({publications24h:0});
  const [freshState,setFreshState]=useState<'idle'|'loading'|'pass'|'review'|'block'|'manual'|'error'>('idle');
  const [freshResult,setFreshResult]=useState<FreshValidationResult|null>(null);
  const [manualFreshConfirmed,setManualFreshConfirmed]=useState(false);
  const [scheduledFor,setScheduledFor]=useState('');
  const [scheduleMessage,setScheduleMessage]=useState('');
  const [online,setOnline]=useState(()=>typeof navigator==='undefined' ? true : navigator.onLine);

  useEffect(()=>{
    const onOnline=()=>setOnline(true);
    const onOffline=()=>setOnline(false);
    window.addEventListener('online',onOnline);
    window.addEventListener('offline',onOffline);
    return ()=>{
      window.removeEventListener('online',onOnline);
      window.removeEventListener('offline',onOffline);
    };
  },[]);

  useEffect(()=>{
    if(!campaign || !db || !identity.organizationId) {
      setFrequency({publications24h:0});
      return;
    }
    const currentDb=db;
    void loadPublicationFrequency(currentDb,identity.organizationId)
      .then(setFrequency)
      .catch(()=>setFrequency({publications24h:0}));
  },[campaign,identity.organizationId]);

  useEffect(()=>{
    setFreshResult(null);
    setManualFreshConfirmed(false);
    if(!campaign || campaign.status!=='PUBLICATION_READY'){
      setFreshState('idle');
      return;
    }
    if(campaign.marketplace!=='MELI'){
      setFreshState('manual');
      return;
    }
    let active=true;
    setFreshState('loading');
    void freshValidateProduct(campaign.organizationId,campaign.currentVersion.product)
      .then(({result})=>{
        if(!active) return;
        setFreshResult(result);
        setFreshState(
          result.outcome==='PASS' ? 'pass' :
          result.outcome==='BLOCK' ? 'block' : 'review'
        );
        if(db && identity.organizationId){
          const currentDb=db;
          void saveFreshComplianceCheck(currentDb,{
            organizationId:identity.organizationId,
            campaign,
            outcome:result.outcome,
            changes:result.changes as unknown as Array<Record<string,unknown>>,
            validatedAt:result.validatedAt,
          }).catch(()=>undefined);
        }
      })
      .catch(()=>{
        if(active) setFreshState('error');
      });
    return ()=>{active=false;};
  },[campaign,identity.organizationId]);

  if (!campaign) return <Navigate to="/campaigns" replace />;
  const activeCampaign: Campaign = campaign;
  const v = activeCampaign.currentVersion;
  const destination = v.product.affiliateUrl?.value ?? v.product.url.value;
  const hasFrequencyPolicy=preferences.maxPublications24h!==null || preferences.minGapMinutes!==null;
  const guard = runPublishingGuard({
    product: v.product, disclosure: v.narrative.disclosure, destinationUrl: destination,
    headline: v.narrative.headline, description: v.narrative.description,
    duplicateSimilarity:campaignDuplicateSimilarity(activeCampaign,campaigns),
    frequencyPolicy:hasFrequencyPolicy ? {
      maxPublications24h:preferences.maxPublications24h ?? undefined,
      publications24h:frequency.publications24h,
      minGapMinutes:preferences.minGapMinutes ?? undefined,
      minutesSinceLastPublication:frequency.minutesSinceLastPublication,
    } : undefined,
  });
  const pkg: PublicationPackage = {
    campaignId: activeCampaign.id, version: v.version, filename: campaignFilename(v), width: 1000, height: 1500,
    title: v.narrative.pinterestTitle, description: v.narrative.description, disclosure: v.narrative.disclosure,
    destinationUrl: destination, boardName: v.boardName, topics: [v.keyword, 'casa organizada', 'ideias para casa'],
    altText: v.narrative.altText, compliance: guard.outcome,
  };
  const apiMode=preferences.publishingMode==='api_when_available' && canAttemptPinterestPublish();
  const manualFreshAllowed=!apiMode && ['manual','error'].includes(freshState) && manualFreshConfirmed;
  const freshReady=freshState==='pass' || manualFreshAllowed;
  const freshMaterialBlock=['review','block'].includes(freshState);
  const publisherBlocked=
    guard.outcome==='BLOCK' ||
    freshMaterialBlock ||
    ['idle','loading'].includes(freshState) ||
    (!freshReady && ['manual','error'].includes(freshState));

  const marketplaceSteps = activeCampaign.marketplace === 'SHOPEE'
    ? [[t('shopeeGuideTitle'), t('shopeeGuideBody')]]
    : [];
  const steps = [
    [t('guideDownloadTitle'), t('guideDownloadBody')],
    [t('guideOpenPinterestTitle'), t('guideOpenPinterestBody')],
    [t('guideUploadTitle'), pkg.filename],
    [t('guideCopyTitle'), t('guideCopyBody')],
    [t('guideLinkTitle'), pkg.destinationUrl],
    ...marketplaceSteps,
    [t('guideBoardTitle'), pkg.boardName],
    [t('guideReviewTitle'), t('guideReviewBody')],
    [t('guideMarkTitle'), t('guideMarkBody')],
  ];

  async function copy(text: string) { await navigator.clipboard.writeText(text); }

  function persistPackage() {
    if (db && identity.organizationId && activeCampaign.status === 'PUBLICATION_READY') {
      void savePublicationPackage(db, identity.organizationId, pkg).catch(() => undefined);
    }
  }

  function schedulePublication(){
    const parsed=validateScheduledFor(scheduledFor);
    if(!parsed.valid){
      setScheduleMessage(t('scheduleInvalid'));
      return;
    }
    const mode:'GUIDED'|'PINTEREST_API'=apiMode ? 'PINTEREST_API' : 'GUIDED';
    const now=new Date().toISOString();
    const schedule:PublicationSchedule={
      id:`${activeCampaign.id}-v${v.version}`,
      organizationId:activeCampaign.organizationId,
      campaignId:activeCampaign.id,
      campaignVersion:v.version,
      mode,
      scheduledFor:parsed.iso,
      timezone:Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
      status:'SCHEDULED',
      createdAt:now,
      updatedAt:now,
    };
    onSchedule(schedule);
    setScheduleMessage(t('scheduled'));
    if(db && identity.organizationId){
      const currentDb=db;
      void Promise.all([
        savePublicationPackage(currentDb,identity.organizationId,{...pkg,suggestedPublishAt:parsed.iso}),
        markPublicationScheduled(currentDb,{
          organizationId:identity.organizationId,
          campaign:activeCampaign,
          scheduledFor:parsed.iso,
          mode,
        }),
      ]).catch(()=>undefined);
    }
  }

  async function downloadImage() {
    persistPackage();
    const canvas = document.createElement('canvas');
    const dataUrl = await renderPin(canvas, v);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = pkg.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function markPublished() {
    if(publisherBlocked || !online) return;
    const published: Campaign = { ...activeCampaign, status: 'PUBLISHED' };
    update(published);
    completeSchedule(activeCampaign.id,v.version);
    if (db && identity.organizationId) {
      void markPublication(db, {
        organizationId: identity.organizationId,
        campaign: published,
        source: 'GUIDED',
      }).catch(() => undefined);
    }
  }

  return (
    <div className="page publish-page">
      <PageTitle eyebrow={t('publishEyebrow')} title={t('publishReady')} subtitle={t('publishSub')} />
      <div className="validation-row">
        {guard.checks.map((check) => <span key={check.key} className={`check ${check.outcome.toLowerCase()}`}>{check.outcome === 'PASS' ? '✓' : check.outcome === 'WARN' ? '!' : '×'} {check.key}</span>)}
      </div>
      {guard.outcome === 'BLOCK' && <div className="notice danger">{t('publishBlocked')}</div>}
      {!online && <div className="notice">{t('offlinePublishBlocked')}</div>}
      <section className={`fresh-validation ${freshState}`}>
        <div>
          <p className="eyebrow">{t('freshValidation')}</p>
          {freshState==='loading' && <strong>{t('validatingFresh')}</strong>}
          {freshState==='pass' && <strong>{t('freshOk')}</strong>}
          {freshState==='review' && <strong>{t('freshReview')}</strong>}
          {freshState==='block' && <strong>{t('freshBlocked')}</strong>}
          {['manual','error'].includes(freshState) && <strong>{t('freshUnavailable')}</strong>}
        </div>
        {freshResult?.changes.length ? (
          <ul>{freshResult.changes.map((change,index)=><li key={`${change.field}-${index}`}>{change.message}</li>)}</ul>
        ) : null}
        {['manual','error'].includes(freshState) && !apiMode && (
          <label className="manual-confirm">
            <input type="checkbox" checked={manualFreshConfirmed} onChange={(e)=>setManualFreshConfirmed(e.target.checked)} />
            <span>{t('manualFreshConfirm')}</span>
          </label>
        )}
        {freshMaterialBlock && <NavLink className="button secondary" to={`/review/${activeCampaign.id}`}>{t('returnReview')}</NavLink>}
      </section>
      <div className="publish-grid">
        <PinPreview campaign={campaign} />
        <section className="package-card">
          <button className="button primary download-button" onClick={() => void downloadImage()}>{t('downloadPng')}</button>
          <Field label={t('file')} value={pkg.filename} onCopy={() => copy(pkg.filename)} />
          <Field label={t('title')} value={pkg.title} onCopy={() => copy(pkg.title)} />
          <Field label={t('description')} value={pkg.description} onCopy={() => copy(`${pkg.description}\n\n${pkg.disclosure}`)} />
          <Field label="Link" value={pkg.destinationUrl} onCopy={() => copy(pkg.destinationUrl)} />
          <Field label={t('saveTo')} value={pkg.boardName} onCopy={() => copy(pkg.boardName)} />
          <Field label={t('altText')} value={pkg.altText} onCopy={() => copy(pkg.altText)} />
          {activeCampaign.rankingContext?.trackingCode && <Field label={t('trackingCode')} value={activeCampaign.rankingContext.trackingCode} onCopy={() => copy(activeCampaign.rankingContext!.trackingCode!)} />}
        </section>
      </div>
      <section className="schedule-panel">
        <div>
          <p className="eyebrow">{t('schedulePublication')}</p>
          <h2>{t('scheduleFor')}</h2>
          <p>{t('scheduleGuided')}</p>
          <small>{t('noUniversalTime')}</small>
        </div>
        <div className="schedule-controls">
          <input type="datetime-local" value={scheduledFor} onChange={(e)=>{setScheduledFor(e.target.value);setScheduleMessage('');}} />
          <button className="button secondary" onClick={schedulePublication}>{t('schedule')}</button>
          {scheduleMessage && <span className={scheduleMessage===t('scheduled')?'success-text':'field-error'}>{scheduleMessage}</span>}
        </div>
      </section>
      <section className="guided">
        <div className="guided-copy">
          <p className="eyebrow">{t('guidedMode')}</p>
          <h2>{steps[step]?.[0]}</h2>
          <p>{steps[step]?.[1]}</p>
          <div className="step-dots">{steps.map((_,i) => <span key={i} className={i === step ? 'active' : ''} />)}</div>
        </div>
        <div className="guided-actions">
          {step > 0 && <button className="button secondary" onClick={() => setStep(step - 1)}>{t('back')}</button>}
          {step < steps.length - 1 ? (
            <button className="button primary" disabled={publisherBlocked} onClick={() => { persistPackage(); setStep(step + 1); }}>{t('next')}</button>
          ) : (
            <button className="button primary" disabled={publisherBlocked || !online} onClick={markPublished}>{t('markPublished')}</button>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  const { t } = useI18n();
  return <div className="package-field"><label>{label}</label><p>{value}</p><button onClick={onCopy}>{t('copy')}</button></div>;
}

function Campaigns({ campaigns }: { campaigns: Campaign[] }) {
  const { t } = useI18n();
  const [tab,setTab] = useState<'READY'|'PUBLICATION_READY'|'PUBLISHED'|'REJECTED'>('READY');
  const map = { READY:t('toReview'), PUBLICATION_READY:t('approved'), PUBLISHED:t('published'), REJECTED:t('archived') };
  const visible = campaigns.filter((c) => c.status === tab || (tab === 'REJECTED' && c.status === 'BLOCKED'));
  return (
    <div className="page">
      <PageTitle eyebrow={t('campaigns').toUpperCase()} title={t('campaigns')} subtitle={t('campaignsSub')} />
      <div className="tabs">{Object.entries(map).map(([key,label]) => <button className={tab === key ? 'active' : ''} key={key} onClick={() => setTab(key as typeof tab)}>{label}</button>)}</div>
      <div className="campaign-grid">{visible.map((c) => <CampaignCard key={c.id} campaign={c} />)}</div>
      {!visible.length && <Empty title={t('nothingHere')} body={t('nothingHereBody')} />}
    </div>
  );
}

function Results({
  campaigns, organizationId, rows, onSave,
}:{
  campaigns:Campaign[];
  organizationId:string;
  rows:PerformanceDaily[];
  onSave:(row:PerformanceDaily)=>void;
}) {
  const { t } = useI18n();
  const identity=useAuth();
  const [approvalEvents,setApprovalEvents]=useState<ApprovalEvent[]>([]);
  const insights=useMemo(()=>deriveLearning(campaigns,rows,approvalEvents),[campaigns,rows,approvalEvents]);

  useEffect(()=>{
    if(!db || !organizationId){
      setApprovalEvents([]);
      return;
    }
    let active=true;
    const currentDb=db;
    void listApprovalEvents(currentDb,organizationId)
      .then((events)=>{if(active)setApprovalEvents(events);})
      .catch(()=>undefined);
    return ()=>{active=false;};
  },[organizationId]);

  useEffect(()=>{
    if(!db || !identity.user?.uid || !organizationId) return;
    const currentDb=db;
    void saveLearningInsights(currentDb,organizationId,insights).catch(()=>undefined);
  },[identity.user?.uid,organizationId,insights]);

  return (
    <div className="page">
      <PageTitle eyebrow={t('results').toUpperCase()} title={t('resultsTitle')} subtitle={t('resultsSub')} />
      <PerformancePanel organizationId={organizationId} campaigns={campaigns} rows={rows} approvalEvents={approvalEvents} onSave={onSave} />
    </div>
  );
}

function Connections() {
  return <ConnectionCenter />;
}

function AiCost() {
  const { t } = useI18n();
  return (
    <div className="page">
      <PageTitle eyebrow={t('cost').toUpperCase()} title={t('zeroCostTitle')} subtitle={t('zeroCostSub')} />
      <div className="cost-hero"><span className="live-dot" /><div><h2>{t('zeroCostActive')}</h2><p>{t('paidAiBlocked')}</p></div></div>
      <div className="metric-grid">
        <Metric label={t('aiCostToday')} value="R$ 0,00" />
        <Metric label="OpenAI API" value={FEATURE_FLAGS.OPENAI_API_ENABLED ? 'ON' : 'OFF'} />
        <Metric label={t('paidServices')} value={KILL_SWITCHES.PAID_SERVICES_DISABLED ? 'BLOQUEADO' : 'LIBERADO'} />
        <Metric label="Gemini Free" value={FEATURE_FLAGS.GEMINI_FREE_ENABLED ? 'DISPONÍVEL' : 'OFF'} />
      </div>
    </div>
  );
}

function Boards() { const { t }=useI18n(); return <SimpleList eyebrow={t('boards').toUpperCase()} title={t('boardsTitle')} subtitle={t('boardsSub')} rows={initialBoards.map((b,i) => [b, i < 2 ? t('priority') : t('readyStatus'), 'Casa & organização'])} />; }
function Library() { const { t }=useI18n(); return <SimpleList eyebrow={t('library').toUpperCase()} title={t('libraryTitle')} subtitle={t('librarySub')} rows={[[t('product'),'Product Truth',t('truthPreserved')],['Creatives','Creative Engine','Deterministic and exportable versions'],['Templates','10','Editorial · Problem → Solution · Minimal · Hero · Checklist · Before/After · Small Space · Routine · Collection · Seasonal']]} />; }
function Workspace() { const { t }=useI18n(); const { organizationId, role }=useAuth(); return <SimpleList eyebrow="WORKSPACE" title={t('workspace')} subtitle={t('workspaceSub')} rows={[[organizationId ?? '—','organizationId',t('tenantActive')],[role ?? 'viewer',t('role'),t('effectivePermission')],['Audit','Append-only','Critical events are append-only']]} />; }
function Help() { const { t }=useI18n(); return <SimpleList eyebrow={t('help').toUpperCase()} title={t('helpTitle')} subtitle={t('helpSub')} rows={[[t('publishPin'),t('stepByStep'),t('noDeadEndPublish')],[t('aiNoCost'),'Prompt Studio',t('noDeadEndAi')],[t('productUnavailable'),t('replacementFlow'),t('noDeadEndProduct')]]} />; }

function SimpleList({ eyebrow,title,subtitle,rows }: { eyebrow:string; title:string; subtitle:string; rows:string[][] }) {
  return <div className="page"><PageTitle eyebrow={eyebrow} title={title} subtitle={subtitle} /><div className="list-surface">{rows.map((r) => <div className="list-row" key={r[0]}><div><h3>{r[0]}</h3><p>{r[2]}</p></div><span>{r[1]}</span></div>)}</div></div>;
}

function Metric({ label,value }: { label:string; value:string }) { return <div className="metric-card"><span>{label}</span><strong>{value}</strong></div>; }
function Empty({ title,body }: { title:string; body:string }) { return <div className="empty"><span className="empty-orb" /><h3>{title}</h3><p>{body}</p></div>; }
function PageTitle({ eyebrow,title,subtitle }: { eyebrow:string; title:string; subtitle:string }) { return <header className="page-title"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{subtitle}</p></header>; }
function ProgressSteps() { const { t } = useI18n(); return <div className="progress-steps"><span>{t('comparing')}</span><span>{t('validatingFacts')}</span><span>{t('calculating')}</span></div>; }

export function App() {
  const auth = useAuth();
  const store = useCampaignStore(auth.organizationId, auth.user?.uid ?? null, auth.role);
  const performance = usePerformanceStore(auth.organizationId, auth.user?.uid ?? null, auth.role);
  const scheduleStore = usePublicationScheduleStore(auth.organizationId, auth.user?.uid ?? null, auth.role);
  const [locale,setLocale] = useState<Locale>(() => (localStorage.getItem('na_locale') as Locale) || 'pt-BR');
  const preferenceStore=usePreferencesStore(auth.organizationId,auth.user?.uid ?? null,auth.role,locale);
  const editable = auth.role ? canWrite(auth.role) : false;
  const dailyAgentReport=useDailyAgent({
    authState:auth.state,
    organizationId:auth.organizationId,
    actorId:auth.user?.uid ?? null,
    editable,
    campaigns:store.campaigns,
    updateCampaign:store.update,
  });
  useEffect(() => localStorage.setItem('na_locale', locale), [locale]);

  useEffect(() => {
    if (auth.state !== 'ready' || !db || !auth.organizationId || !auth.user?.uid || !editable) return;
    const currentDb = db;
    void ensureNestAffiliateWorkspace({
      db: currentDb,
      organizationId: auth.organizationId,
      userId: auth.user.uid,
      locale,
      boards: initialBoards,
      templates: CREATIVE_TEMPLATES,
    }).catch(() => undefined);
  }, [auth.state, auth.organizationId, auth.user?.uid, editable, locale]);

  if (auth.state !== 'ready') {
    return <I18nProvider locale={locale}><Login /></I18nProvider>;
  }
  const org = auth.organizationId ?? 'demo-org';

  return (
    <I18nProvider locale={locale}>
    <Shell locale={locale} setLocale={setLocale}>
      <SyncErrorBanner kind={store.syncError} onDismiss={store.clearSyncError} />
      <Routes>
        <Route path="/" element={<Today campaigns={store.campaigns} schedules={scheduleStore.schedules} agentReport={dailyAgentReport} />} />
        <Route path="/radar" element={<Radar addCampaign={store.add} organizationId={org} editable={editable} />} />
        <Route path="/campaigns" element={<Campaigns campaigns={store.campaigns} />} />
        <Route path="/review/:id" element={<Review campaigns={store.campaigns} update={store.update} editable={editable} />} />
        <Route path="/publish/:id" element={<Publish campaigns={store.campaigns} update={store.update} preferences={preferenceStore.preferences} onSchedule={scheduleStore.add} completeSchedule={scheduleStore.complete} />} />
        <Route path="/results" element={<Results campaigns={store.campaigns} organizationId={org} rows={performance.rows} onSave={performance.save} />} />
        <Route path="/connections" element={<Connections />} />
        <Route path="/prompt-studio" element={<PromptStudio campaigns={store.campaigns} editable={editable} onUpdate={store.update} />} />
        <Route path="/ai-cost" element={<AiCost />} />
        <Route path="/settings" element={<SettingsPanel preferences={preferenceStore.preferences} editable={editable} onChange={preferenceStore.update} />} />
        <Route path="/boards" element={<Boards />} />
        <Route path="/library" element={<Library />} />
        <Route path="/workspace" element={<Workspace />} />
        <Route path="/help" element={<Help />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
    </I18nProvider>
  );
}
