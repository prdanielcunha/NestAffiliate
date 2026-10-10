import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import type { ApprovalEvent, Campaign, ProductTruth, PublicationPackage, PublicationSchedule } from '@nestaffiliate/core';
import { campaignVersions, canWrite, nextCampaignVersion, publicationScheduleStatus, restoreCampaignVersion, validateScheduledFor, type Role } from '@nestaffiliate/core';
import { maxDuplicateSimilarity, runPublishingGuard, inspectAffiliateAttestation, isPublicPinterestPinUrl, type FreshValidationResult, type PublicationFingerprint } from '@nestaffiliate/compliance';
import { assessOpportunityV4, buildRadarFunnelV4, buildOpportunity, buildSearchSignal, buildShopeeOfferSignals, isDiscoverableProduct, isSafeOfferUrl, isSafeAffiliateUrl, isCommerceReadyProduct, rankCandidatePoolV4, productPotentialBand, signalResolverFromSnapshots, shortlist, type CommerceSignal, type Opportunity, type OpportunitySignals } from '@nestaffiliate/radar';
import type { PerformanceDaily } from '@nestaffiliate/analytics';
import { deriveLearning } from '@nestaffiliate/learning';
import { campaignFilename, CREATIVE_TEMPLATES, renderPin,versionPinterestCreativePack } from '@nestaffiliate/creative-engine';
import { FEATURE_FLAGS, KILL_SWITCHES, canAttemptPinterestPublish } from '@nestaffiliate/config';
import { buildShopeePinterestSearchTerm, parseShopeeProductReference } from '@nestaffiliate/integrations';
import { type Locale } from './lib/i18n';
import { I18nProvider, useI18n } from './lib/i18n-context';
import { demoCampaigns, initialBoards } from './lib/demo';
import { useAuth } from './lib/auth';
import { db } from './lib/firebase';
import { listCampaigns, saveCampaign } from './services/campaignRepository';
import { listPerformance, savePerformance, savePerformanceBatch } from './services/performanceRepository';
import { appendAudit } from './services/auditRepository';
import { persistCampaignIntelligence } from './services/intelligenceRepository';
import { appendApprovalEvent, markPublication, markPublicationScheduled, saveFreshComplianceCheck, savePublicationPackage } from './services/lifecycleRepository';
import { saveLearningInsights } from './services/learningRepository';
import { listApprovalEvents } from './services/approvalRepository';
import { ManualProductImport } from './features/ManualProductImport';
import { ShopeeResearchBridge } from './features/ShopeeResearchBridge';
import { PerformancePanel } from './features/PerformancePanel';
import { PromptStudio } from './features/PromptStudio';
import { PinterestCreativePackPanel } from './features/PinterestCreativePack';
import { NestAiDraftReview, type PinCopyDraft } from './features/NestAiDraftReview';
import { resolveCreativeAssetUrl } from './services/creativePackRepository';
import { ConnectionCenter } from './features/ConnectionCenter';
import { ensureNestAffiliateWorkspace } from './services/workspaceBootstrap';
import { defaultPreferences, loadUserPreferences, saveUserPreferences, type UserPreferences } from './services/preferencesRepository';
import { recordRadarSignal } from './services/radarRepository';
import { loadPublicationFrequency, type PublicationFrequencyState } from './services/publicationRepository';
import { SettingsPanel } from './features/SettingsPanel';
import { deriveDailyAgentHealth, loadLatestDailyAgentReport, type DailyAgentReport } from './services/dailyAgentRepository';
import { freshValidateProduct } from './services/freshValidation';
import { completePublicationSchedule, listPublicationSchedules, savePublicationSchedule } from './services/publicationScheduleRepository';
import { listMarketSignals, saveMarketSignals } from './services/marketSignalRepository';
import { searchMercadoLivreBroker, searchMercadoLivreBrokerDetailed } from './services/mercadoLivreBroker';
import { getShopeeApiStatus, searchShopeeBroker, searchShopeeBrokerDetailed } from './services/shopeeBroker';
import { NextBestAction } from './features/NextBestAction';
import { ReelKitPanel } from './features/ReelKitPanel';
import { FacebookShopeeGuide } from './features/FacebookShopeeGuide';
import { RevenueTruthPanel } from './features/RevenueTruthPanel';
import { analyzeAffiliateProduct, type AffiliateProductAnalysis } from './services/nestAiClient';
import { assessRevenueOpportunity, findComparableOffers, type RevenueAssessment } from '@nestaffiliate/radar';
import './features/revenue3.css';
import { ProductSourceActions } from './features/ProductSourceActions';
import { loadLatestRadarV4Coverage, listRadarV4Research, listRadarV4Assessments, primaryRadarBlocker, saveRadarV4Coverage, type SourceCoverageRunV4, type StoredRadarAssessmentV4 } from './services/radarV4Repository';
import { validateStoredProductReference } from './services/productReferenceRepository';
import { OpportunityV4Panel, opportunityReasonLabel } from './features/OpportunityV4Panel';
import { ProblemIntentExplorer } from './features/ProblemIntentExplorer';
import { RadarProductImage } from './features/RadarProductImage';
import { WorkspaceLibrary } from './features/WorkspaceLibrary';
import { CampaignJourney } from './features/CampaignJourney';
import { reviewBlockers } from './lib/reviewReadiness';
import { publicationCalendarIcs } from './lib/publicationCalendar';
import { FinalPinPublicationGuide } from './features/FinalPinPublicationGuide';
import { generatePublishingZip } from './lib/publicationBundle';
import { planCreativeEdit, type CreativeEditPlan } from './lib/creativeEdit';

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

    let stopCloudRefresh = () => undefined;
    if (db && !demoEnabled) {
      const currentDb = db;
      const refreshCloud = () => {
        void listCampaigns(currentDb, organizationId)
          .then((remote) => {
            if (active) setCampaigns(remote);
          })
          .catch(() => undefined);
      };
      const onFocus = () => refreshCloud();
      const onVisibility = () => {
        if (document.visibilityState === 'visible') refreshCloud();
      };

      refreshCloud();
      const timer = window.setInterval(refreshCloud, 5 * 60_000);
      window.addEventListener('focus', onFocus);
      document.addEventListener('visibilitychange', onVisibility);
      stopCloudRefresh = () => {
        window.clearInterval(timer);
        window.removeEventListener('focus', onFocus);
        document.removeEventListener('visibilitychange', onVisibility);
      };
    }
    return () => {
      active = false;
      stopCloudRefresh();
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

  const importMany=async (incoming:PerformanceDaily[]):Promise<void>=>{
    if(!role || !canWrite(role))throw new Error('READ_ONLY');
    if(!organizationId || incoming.some(row=>row.organizationId!==organizationId))throw new Error('TENANT_MISMATCH');
    if(!demoEnabled){if(!db)throw new Error('FIRESTORE_NOT_CONFIGURED');await savePerformanceBatch(db,organizationId,incoming);}
    setRows(current=>{
      const items=new Map(current.map(row=>[row.id,row]));
      for(const row of incoming)items.set(row.id,row);
      return [...items.values()].sort((a,b)=>b.date.localeCompare(a.date));
    });
  };
  return { rows, save, importMany };
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
}){
  const reportKey=`nestaffiliate_daily_agent_report:${input.organizationId ?? 'pending'}`;
  const [report,setReport]=useState<DailyAgentReport|null>(()=>{
    try{
      const stored=localStorage.getItem(reportKey);
      return stored ? JSON.parse(stored) as DailyAgentReport : null;
    }catch{
      return null;
    }
  });

  useEffect(()=>{
    if(input.authState!=='ready' || !input.organizationId || !db) return;
    let active=true;
    const currentDb=db;
    const refresh=()=>{
      void loadLatestDailyAgentReport(currentDb,input.organizationId!)
        .then((next)=>{
          if(!active || !next) return;
          setReport(next);
          localStorage.setItem(reportKey,JSON.stringify(next));
        })
        .catch(()=>undefined);
    };
    const onFocus=()=>refresh();
    const onVisibility=()=>{ if(document.visibilityState==='visible') refresh(); };

    refresh();
    const timer=window.setInterval(refresh,5*60_000);
    window.addEventListener('focus',onFocus);
    document.addEventListener('visibilitychange',onVisibility);
    return ()=>{
      active=false;
      window.clearInterval(timer);
      window.removeEventListener('focus',onFocus);
      document.removeEventListener('visibilitychange',onVisibility);
    };
  },[input.authState,input.organizationId,reportKey]);

  return report;
}

function campaignFingerprint(campaign:Campaign):PublicationFingerprint{
  const version=campaign.currentVersion;
  return {
    productId:version.product.productId,
    imageUrl:version.creativeAsset?.hash ?? version.product.imageUrl?.value,
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

function Today({ campaigns, schedules, agentReport, organizationId }: { campaigns: Campaign[]; schedules: PublicationSchedule[]; agentReport: DailyAgentReport|null; organizationId:string }) {
  const { t, locale } = useI18n();
  const [latestResearch,setLatestResearch]=useState<SourceCoverageRunV4|null>(null);
  const [researchState,setResearchState]=useState<'loading'|'ready'|'unavailable'>('loading');
  useEffect(()=>{
    if(!FEATURE_FLAGS.RADAR_V4_SHADOW_ENABLED || !db){setResearchState('unavailable');return;}
    const currentDb=db;
    let mounted=true;
    setResearchState('loading');
    void loadLatestRadarV4Coverage(currentDb,organizationId)
      .then(run=>{if(mounted){setLatestResearch(run);setResearchState('ready');}})
      .catch(()=>{if(mounted)setResearchState('unavailable');});
    return ()=>{mounted=false;};
  },[organizationId]);
  const researchBlocker=primaryRadarBlocker(latestResearch);
  const ready = campaigns.filter((c) => c.status === 'READY');
  const liveSchedules=schedules
    .map((item)=>({...item,status:publicationScheduleStatus(item)}))
    .filter((item)=>!['COMPLETED','CANCELLED','BLOCKED'].includes(item.status));
  const due=liveSchedules.filter((item)=>item.status==='DUE');
  const upcoming=liveSchedules.filter((item)=>item.status==='SCHEDULED').slice(0,3);
  const productCount = new Set(campaigns.map((c) => c.currentVersion.product.productId)).size;
  const agentHealth = deriveDailyAgentHealth(agentReport);
  const agentHealthLabel =
    agentHealth.status === 'HEALTHY' ? t('agentHealthy') :
    agentHealth.status === 'DEGRADED' ? t('agentDegraded') :
    agentHealth.status === 'STALE' ? t('agentStale') :
    t('agentUnknown');
  const queueStateLabel =
    agentReport?.queueState === 'FULL' ? t('queueFull') :
    agentReport?.queueState === 'REFILLED' ? t('queueRefilled') :
    agentReport?.queueState === 'NO_ELIGIBLE' ? t('queueNoEligible') :
    t('queueStable');
  return (
    <div className="page">
      <section className="hero">
        <p className="eyebrow">{t('today').toUpperCase()}</p>
        <h1>{FEATURE_FLAGS.REVENUE_RADAR_3_ENABLED ? t('r3HomeTitle') : t('workedForYou')}</h1>
        <p className="hero-sub">{FEATURE_FLAGS.REVENUE_RADAR_3_ENABLED ? t('r3HomeSubtitle') : t('heroSub')}</p>
        {FEATURE_FLAGS.REVENUE_RADAR_3_ENABLED ? <NextBestAction campaigns={campaigns} schedules={schedules} agentReport={agentReport} /> : <>
        <div className="stat-row">
          <Stat value={String(productCount)} label={t('productsInCampaigns')} />
          <Stat value={String(campaigns.length)} label={t('opportunitiesSaved')} />
          <Stat value={String(ready.length)} label={t('ready')} />
        </div>
        <NavLink to={ready[0] ? `/review/${ready[0].id}` : '/radar'} className="button primary hero-cta">
          {ready.length ? t('reviewCount',{n:ready.length}) : t('findOpportunities')}
        </NavLink></>}
      </section>
      {FEATURE_FLAGS.RADAR_V4_SHADOW_ENABLED && <section className="today-research-section" aria-label={locale==='pt-BR'?'Evidências do Radar 4.0':locale==='es'?'Evidencia del Radar 4.0':'Radar 4.0 evidence'}>
        <div className="today-research-top">
          <div>
            <span className="eyebrow">RADAR 4.0 · RESEARCH INTELLIGENCE</span>
            <h2>{locale==='pt-BR'?'O que a última pesquisa realmente encontrou':locale==='es'?'Lo que encontró la última investigación':'What the last research actually found'}</h2>
            <p>{locale==='pt-BR'?'Pesquisa manual autenticada · os números não representam vendas ou lucro.':locale==='es'?'Investigación manual autenticada · no son ventas ni ganancias.':'Authenticated manual research · not sales or profit.'}</p>
          </div>
          <NavLink className="button secondary" to="/radar?history=1">{locale==='pt-BR'?'Abrir Radar':locale==='es'?'Abrir Radar':'Open Radar'} →</NavLink>
        </div>
        {researchState==='loading' ? <p className="muted">{locale==='pt-BR'?'Carregando pesquisa…':locale==='es'?'Cargando investigación…':'Loading research…'}</p>
        : researchState==='unavailable' ? <p className="muted">{locale==='pt-BR'?'Não foi possível consultar o relatório da organização. Os dados não foram presumidos como zero.':locale==='es'?'Informe no disponible. No se asumió cero.':'Report unavailable. Missing data was not counted as zero.'}</p>
        : !latestResearch ? <p className="muted">{locale==='pt-BR'?'Nenhuma pesquisa Radar 4.0 foi registrada para esta organização. Abra o Radar para começar.':locale==='es'?'Todavía no hay investigaciones registradas para esta organización.':'No Radar 4.0 research recorded for this organization yet.'}</p>
        : <>
          <NavLink to="/radar?history=1" className="button secondary">{locale==='pt-BR'?'Ver candidatos e histórico da pesquisa →':'View research candidates and history →'}</NavLink>
          <div className="today-research-metrics">
            <div><strong>{latestResearch.examined}</strong><span>{locale==='pt-BR'?'Candidatos examinados':locale==='es'?'Candidatos examinados':'Examined candidates'}</span></div>
            <div><strong>{latestResearch.report.discovery}</strong><span>{locale==='pt-BR'?'Em investigação':locale==='es'?'En investigación':'Research candidates'}</span></div>
            <div><strong>{latestResearch.report.resolvedListings}</strong><span>{locale==='pt-BR'?'Anúncios identificados':locale==='es'?'Anuncios identificados':'Identified listings'}</span></div>
            <div><strong>{latestResearch.report.promising}</strong><span>{locale==='pt-BR'?'Para investigar':locale==='es'?'Para investigar':'Worth investigating'}</span></div>
          </div>
          <div className="today-research-bottom">
            <div><strong>{locale==='pt-BR'?'Estado das fontes':locale==='es'?'Estado de las fuentes':'Provider status'}</strong>
              <p>{Object.entries(latestResearch.providerStatuses).map(([source,state])=>source+': '+(state==='OK'
                ? locale==='pt-BR'?'Disponível':locale==='es'?'Disponible':'Available'
                : state==='RATE_LIMITED'?locale==='pt-BR'?'Limite temporário':locale==='es'?'Límite temporal':'Rate limited'
                : state==='AUTH_REQUIRED'?locale==='pt-BR'?'Reconectar':locale==='es'?'Reconectar':'Reconnect'
                : locale==='pt-BR'?'Indisponível':locale==='es'?'No disponible':'Unavailable')).join(' · ') || '—'}</p></div>
            {researchBlocker&&<div><strong>{locale==='pt-BR'?'Maior pendência registrada':locale==='es'?'Principal pendiente':'Top recorded gap'}</strong><p>{opportunityReasonLabel(researchBlocker.reason,locale)} · {researchBlocker.count}</p></div>}
          </div>
          <p className="today-research-footnote">{locale==='pt-BR'?'Pesquisa concluída':locale==='es'?'Investigación completada':'Research completed'}: {new Date(latestResearch.finishedAt).toLocaleString(locale)} · {latestResearch.runId}</p>
        </>}
      </section>}
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
            <span><b>{agentHealthLabel}</b> {t('agentHealth')}</span>
            <span><b>{agentReport?.checked ?? 0}</b> {t('productsChecked')}</span>
            <span><b>{agentReport?.opportunitiesAnalyzed ?? 0}</b> {t('opportunitiesAnalyzed')}</span>
            <span><b>{agentReport?.campaignsCreated ?? 0}</b> {t('campaignsPrepared')}</span>
            <span><b>{agentReport?.campaignsWaiting ?? ready.length}</b> {t('campaignsWaiting')}</span>
            <span><b>{agentReport?.signals ?? 0}</b> {t('signalsProcessed')}</span>
            <span><b>{agentReport?.verifiedBestSellerProducts ?? 0}</b> {t('verifiedBestSellers')}</span>
            {agentReport && <small>{t('agentCycleDetails',{
              changed:agentReport.changed ?? 0,
              blocked:agentReport.blocked ?? 0,
              expired:agentReport.opportunitiesExpired ?? 0,
              revalidated:agentReport.campaignsRevalidated ?? 0,
            })}</small>}
            {FEATURE_FLAGS.RADAR_V4_SHADOW_ENABLED && typeof agentReport?.researchOnlyCandidates==='number' && <small>{
              locale==='pt-BR'?'Candidatos em pesquisa (sem publicação automática): '
              :locale==='es'?'Candidatos en investigación (sin publicación automática): '
              :'Research candidates (no automatic publishing): '
            }<b>{agentReport.researchOnlyCandidates}</b></small>}
            {FEATURE_FLAGS.RADAR_V4_SHADOW_ENABLED && typeof agentReport?.revalidationPending==='number' && <small>{
              locale==='pt-BR'?'Campanhas preservadas aguardando confirmação de dados: '
              :locale==='es'?'Campañas preservadas pendientes de verificación: '
              :'Preserved campaigns awaiting data verification: '
            }<b>{agentReport.revalidationPending}</b></small>}
            {agentReport && <small>{t('queueDecision')}: {queueStateLabel} · {t('categoriesCovered')}: {agentReport.categoriesCovered ?? 0} · {t('themesCovered')}: {agentReport.themesCovered ?? 0}</small>}
            {agentReport?.topOpportunityScore != null && <small>NestScore {agentReport.topOpportunityScore} · {agentReport.topOpportunityKeyword ?? '—'}</small>}
            {agentReport?.completedAt && <small>{t('lastSync')}: {new Date(agentReport.completedAt).toLocaleString(locale)} · {t('cloudAgent')}</small>}
            {agentHealth.nextExpectedAt && <small>{t('nextCycle')}: {new Date(agentHealth.nextExpectedAt).toLocaleString(locale)}</small>}
          </div>
        </div>
        <div className="surface">
          <p className="eyebrow">CUSTO</p>
          <h3>{FEATURE_FLAGS.PAID_SERVICES_DISABLED?'APIs pagas OFF':'Controle de custos'}</h3>
          <p className="muted">{t('paidServicesBlocked')} · {locale==='pt-BR'?'Infraestrutura sujeita às cotas do Firebase.':locale==='es'?'La infraestructura está sujeta a cuotas de Firebase.':'Infrastructure is subject to Firebase quotas.'}</p>
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
    <NavLink className="campaign-card" to={campaign.status==='PUBLICATION_READY'?`/publish/${campaign.id}`:`/review/${campaign.id}`}>
      <div className="mini-pin">
        <span>{v.keyword}</span><strong>{v.narrative.headline}</strong><em>Achados do Nest</em>
      </div>
      <div className="card-copy">
        <div className="score-line"><b>{campaign.score.score}</b><span>NestScore · {t('confidence')} {t(campaign.score.confidence as 'high'|'medium'|'low')}</span></div>
        <h3>{v.product.title.value}</h3>
        <p>{campaign.score.reasons[0]}</p>
        <span className="market-chip">{campaign.marketplace === 'MELI' ? 'Mercado Livre' : 'Shopee'}</span>
        <p className="campaign-card-handoff">{campaign.status==='PUBLICATION_READY'?'Ir para publicação →':campaign.status==='PUBLISHED'?'Revisar Pin publicado →':'Preparar imagem, textos e link →'}</p>
      </div>
    </NavLink>
  );
}

function RadarResearchHistory({organizationId}:{organizationId:string}){
  const {locale}=useI18n();
  const [runs,setRuns]=useState<SourceCoverageRunV4[]>([]);
  const [selected,setSelected]=useState<string|null>(null);
  const [items,setItems]=useState<StoredRadarAssessmentV4[]>([]);
  const [state,setState]=useState<'loading'|'ready'|'error'>('loading');
  useEffect(()=>{
    if(!db){setState('error');return;}
    let active=true;setState('loading');
    void listRadarV4Research(db,organizationId).then(data=>{
      if(active){setRuns(data);setSelected(data[0]?.runId??null);setState('ready');}
    }).catch(()=>{if(active)setState('error');});
    return()=>{active=false;};
  },[organizationId]);
  useEffect(()=>{
    if(!db||!selected){setItems([]);return;}
    let active=true;setState('loading');
    void listRadarV4Assessments(db,organizationId,selected).then(data=>{
      if(active){setItems(data);setState('ready');}
    }).catch(()=>{if(active)setState('error');});
    return()=>{active=false;};
  },[organizationId,selected]);
  const run=runs.find(item=>item.runId===selected);
  return <section className="radar-start-guide" aria-label="Histórico de pesquisas">
    <h2>{locale==='pt-BR'?'Pesquisas realizadas':'Research history'}</h2>
    <p>{locale==='pt-BR'?'Candidatos examinados não são necessariamente anúncios identificados. Consulte os registros e motivos antes de criar campanhas.':'Examined candidates are not necessarily identified listings.'}</p>
    {runs.length>0&&<label>{locale==='pt-BR'?'Execução':'Run'} <select value={selected??''} onChange={event=>setSelected(event.target.value)}>{runs.map(item=><option key={item.runId} value={item.runId}>{new Date(item.finishedAt).toLocaleString(locale)} · {item.query} · {item.examined}</option>)}</select></label>}
    {state==='loading'&&<p>Carregando registros…</p>}
    {state==='error'&&<p role="alert">Não foi possível consultar o histórico. Tente novamente.</p>}
    {state==='ready'&&!run&&<p>Nenhuma pesquisa registrada.</p>}
    {run&&<><p><strong>{run.examined}</strong> candidatos examinados · <strong>{run.assessed}</strong> avaliações armazenadas · <strong>{run.report.resolvedListings}</strong> anúncios identificados</p>
      {state==='ready'&&items.length===0&&<p>Esta execução não possui avaliações individuais armazenadas. Não é possível recuperar produtos apenas a partir do contador.</p>}
      {items.map((item,index)=>{
        const assessment=item as Record<string,unknown>;
        const reasons=Array.isArray(assessment.reasons)?assessment.reasons.filter(v=>typeof v==='string') as string[]:[];
        return <details key={item.opportunityId||index} className="revenue-assessment"><summary>{String(assessment.title??assessment.keyword??item.opportunityId??'Candidato')} · {String(assessment.status??assessment.stage??'Avaliado')}</summary>
          <p>{reasons.length?reasons.join(' · '):'Sem motivos individuais registrados.'}</p>
          <p>Identificador: {item.opportunityId}</p>
          <p>O anúncio original só pode ser aberto quando uma URL verificada estiver disponível na pesquisa de produtos.</p>
        </details>;
      })}
    </>}
  </section>;
}

function Radar({ addCampaign, organizationId, editable }: { addCampaign: (c: Campaign) => void; organizationId: string; editable: boolean }) {
  const { t, locale } = useI18n();
  const identity=useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('organizador cozinha pequena');
  const [marketplaceScope,setMarketplaceScope]=useState<'ALL'|'MELI'|'SHOPEE'>('ALL');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [comparisonProducts,setComparisonProducts]=useState<ProductTruth[]>([]);
  const [nestAiInsights,setNestAiInsights]=useState<Record<string,AffiliateProductAnalysis|{error:true}>>({});
  const [nestAiLoading,setNestAiLoading]=useState<string|null>(null);
  const [marketSignals,setMarketSignals]=useState<CommerceSignal[]>([]);
  const [maxPrice,setMaxPrice]=useState('');
  const [requireImage,setRequireImage]=useState(false);
  const [onlyValidated,setOnlyValidated]=useState(false);
  const [confirmedCommissionOnly,setConfirmedCommissionOnly]=useState(false);
  const [authorizedAssetsOnly,setAuthorizedAssetsOnly]=useState(false);
  const [v4StatusFilter,setV4StatusFilter]=useState<'ALL'|'READY_NOW'|'NEAR_READY'|'PROMISING'|'SOURCE_LIMITED'>('ALL');
  const v4FilterLabels={
    ALL:locale==='pt-BR'?'Todas':locale==='es'?'Todas':'All',
    READY_NOW:locale==='pt-BR'?'Prontas':locale==='es'?'Listas':'Ready',
    NEAR_READY:locale==='pt-BR'?'Quase prontas':locale==='es'?'Casi listas':'Nearly ready',
    PROMISING:locale==='pt-BR'?'Vale investigar':locale==='es'?'Vale investigar':'Investigate',
    SOURCE_LIMITED:locale==='pt-BR'?'Aguardando fonte':locale==='es'?'Datos limitados':'Source limited',
    UNDER_REVIEW:locale==='pt-BR'?'Em revisão':locale==='es'?'En revisión':'Under review',
    REJECTED:locale==='pt-BR'?'Não elegível':locale==='es'?'No elegible':'Not eligible',
    EXPIRED:locale==='pt-BR'?'Oferta expirada':locale==='es'?'Oferta vencida':'Expired',
  } as const;
  const [state, setState] = useState<'idle'|'loading'|'error'>('idle');
  const [errorCode,setErrorCode]=useState('');
  const [hasSearched,setHasSearched]=useState(false);
  const [activeIntentQuery,setActiveIntentQuery]=useState<string|null>(null);
  const [analysisNotice,setAnalysisNotice]=useState('');
  const [shopeeApiConfigured,setShopeeApiConfigured]=useState<boolean|null>(null);
  const [shopeeProviderFallback,setShopeeProviderFallback]=useState(false);
  const [providerDegraded,setProviderDegraded]=useState<Record<'MELI'|'SHOPEE',boolean>>({MELI:false,SHOPEE:false});
  const [sourceStatus,setSourceStatus]=useState<Record<'MELI'|'SHOPEE','OK'|'RATE_LIMITED'|'AUTH_REQUIRED'|'UNAVAILABLE'|null>>({MELI:null,SHOPEE:null});
  const v4ById=Object.fromEntries(opportunities.map(opp=>[opp.id,assessOpportunityV4({product:opp.product,keyword:opp.keyword,signals:opp.commercialSignals,legacyScore:opp.score.score,
    sourceLimited:providerDegraded[opp.product.marketplace==='MELI'?'MELI':'SHOPEE'],
  })]));
  const v4Funnel=buildRadarFunnelV4(Object.values(v4ById),opportunities.length);
  const visibleOpportunities=FEATURE_FLAGS.REVENUE_RADAR_3_ENABLED
    ? opportunities.filter((opportunity)=>{
        const assessment=assessRevenueOpportunity(opportunity);
        if(onlyValidated && assessment.track!=='VALIDATED')return false;
        if(confirmedCommissionOnly && assessment.revenueConfidence==='UNKNOWN')return false;
        if(authorizedAssetsOnly && !['AUTHORIZED','PLATFORM_PROVIDED','USER_PROVIDED','GENERATED'].includes(opportunity.product.assetRights))return false;
        return true;
      })
    : opportunities;
  const shownOpportunities=FEATURE_FLAGS.RADAR_V4_SHADOW_ENABLED && v4StatusFilter!=='ALL'
    ? visibleOpportunities.filter(opp=>v4ById[opp.id]?.status===v4StatusFilter)
    : visibleOpportunities;
  const [searchMeta,setSearchMeta]=useState<{
    provider:'MELI'|'SHOPEE'|'ALL';
    query:string;
    catalogTotal:number;
    candidates:number;
    usable:number;
    visible:number;
    minSoldQuantity:number;
    rejectedUnavailable:number;
    rejectedLowSales:number;
    rejectedUnverified:number;
    observedAt:string;
    staleObservation?:boolean;
  }|null>(null);

  useEffect(()=>{
    if(!analysisNotice) return;
    const timer=window.setTimeout(()=>setAnalysisNotice(''),7000);
    return ()=>window.clearTimeout(timer);
  },[analysisNotice]);

  useEffect(()=>{
    if(!db || !organizationId) return;
    let active=true;
    const currentDb=db;
    void listMarketSignals(currentDb,organizationId)
      .then((signals)=>{if(active)setMarketSignals(signals);})
      .catch(()=>undefined);
    return ()=>{active=false;};
  },[organizationId]);

  useEffect(()=>{
    if(!identity.user || !organizationId){
      setShopeeApiConfigured(null);
      return;
    }
    let active=true;
    void getShopeeApiStatus({user:identity.user,organizationId})
      .then((status)=>{if(active)setShopeeApiConfigured(status.configured);})
      .catch(()=>{if(active)setShopeeApiConfigured(null);});
    return ()=>{active=false;};
  },[identity.user,organizationId]);

  const suggestedQueries=useMemo(()=>{
    const current=query.trim();
    const normalized=current
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .toLowerCase();
    const currentTokens=new Set(normalized.split(/\s+/).filter((token)=>token.length>3));
    const official=marketSignals
      .map((signal)=>signal.keyword?.trim())
      .filter((value):value is string=>Boolean(value && value.length>5))
      .filter((value)=>{
        const signalTokens=value
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g,'')
          .toLowerCase()
          .split(/\s+/)
          .filter((token)=>token.length>3);
        return signalTokens.some((token)=>currentTokens.has(token));
      });
    const related=current ? [
      t('radarRelatedCompact',{q:current}),
      t('radarRelatedSmall',{q:current}),
      t('radarRelatedKit',{q:current}),
      t('radarRelatedNoDrill',{q:current}),
      t('radarRelatedMultiuse',{q:current}),
    ] : [];
    const fallbacks=[
      t('radarSuggestion1'),
      t('radarSuggestion2'),
      t('radarSuggestion3'),
      t('radarSuggestion4'),
      t('radarSuggestion5'),
      t('radarSuggestion6'),
    ];
    return [...new Set([...official,...related,...fallbacks])]
      .filter((value)=>value.toLowerCase()!==current.toLowerCase())
      .slice(0,6);
  },[marketSignals,query,t]);

  const latestSignalAt=useMemo(()=>{
    const values=marketSignals
      .map((signal)=>Date.parse(signal.observedAt))
      .filter((value)=>Number.isFinite(value));
    return values.length ? Math.max(...values) : null;
  },[marketSignals]);

  const marketInsights=useMemo(()=>{
    const seen=new Set<string>();
    return [...marketSignals]
      .filter((signal)=>Boolean(signal.keyword?.trim()))
      .sort((a,b)=>(b.strength*b.confidence)-(a.strength*a.confidence))
      .filter((signal)=>{
        const key=signal.keyword!.trim().toLowerCase();
        if(seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0,8);
  },[marketSignals]);

  function marketSignalLabel(signal:CommerceSignal){
    if(signal.source==='MELI_BEST_SELLER') return t('marketBestSeller');
    if(signal.source==='MELI_TREND_GROWTH') return t('marketGrowing');
    if(signal.source==='MELI_TREND_DESIRED') return t('marketHighlySearched');
    if(signal.source==='SHOPEE_SEARCH_ASSISTED') return t('shopeeSearchAssisted');
    if(signal.source==='SHOPEE_EXTRA_COMMISSION') return t('shopeeExtraCommission');
    if(signal.source==='SHOPEE_TOP_SALES') return t('shopeeTopSales');
    if(signal.source==='SHOPEE_RECOMMENDATION') return t('shopeeRecommendation');
    return t('marketPopular');
  }

  async function search(queryOverride?:string,signalOverride?:CommerceSignal[]) {
    const effectiveQuery=(queryOverride ?? query).trim();
    if(!effectiveQuery) return;
    setQuery(effectiveQuery);
    setErrorCode('');

    if(marketplaceScope==='SHOPEE' && (shopeeApiConfigured===false || shopeeProviderFallback)){
      setHasSearched(false);
      setOpportunities([]);
      setSearchMeta(null);
      setState('idle');
      setAnalysisNotice(t('shopeeQuickModeNotice'));
      window.requestAnimationFrame(()=>{
        document.getElementById('shopee-quick-mode')?.scrollIntoView({behavior:'smooth',block:'start'});
      });
      return;
    }

    setAnalysisNotice('');
    setState('loading');

    try {
      if(!identity.user) throw new Error('UNAUTHENTICATED');

      type ProviderResult={
        provider:'MELI'|'SHOPEE';
        degraded?:boolean;
        products:ProductTruth[];
        observedAt:string;
        meta:{
          catalogTotal:number;
          candidates:number;
          usable:number;
          minSoldQuantity:number;
          rejectedUnavailable:number;
          rejectedLowSales:number;
          rejectedUnverified:number;
          staleObservation?:boolean;
        };
      };
      const providerResults:ProviderResult[]=[];
      const providerErrors:Array<{provider:'MELI'|'SHOPEE';error:Error}>=[];

      if(marketplaceScope==='MELI' || marketplaceScope==='ALL'){
        try{
          const result=await searchMercadoLivreBrokerDetailed({
            user:identity.user,
            organizationId,
            query:effectiveQuery,
            limit:20,
            researchMode:FEATURE_FLAGS.RADAR_V4_DISCOVERY_ENABLED,
          });
          providerResults.push({
            provider:'MELI',
            degraded:result.degraded===true,
            products:result.products,
            observedAt:result.observedAt,
            meta:result.meta,
          });
        }catch(error){
          providerErrors.push({provider:'MELI',error:error instanceof Error ? error : new Error('MELI_BROKER_UNAVAILABLE')});
        }
      }

      if((marketplaceScope==='SHOPEE' || marketplaceScope==='ALL') && shopeeApiConfigured!==false){
        try{
          const result=await searchShopeeBrokerDetailed({
            user:identity.user,
            organizationId,
            query:effectiveQuery,
            limit:20,
          });
          providerResults.push({
            provider:'SHOPEE',
            products:result.products,
            observedAt:result.observedAt,
            meta:result.meta,
          });
        }catch(error){
          const normalized=error instanceof Error ? error : new Error('SHOPEE_BROKER_UNAVAILABLE');
          providerErrors.push({provider:'SHOPEE',error:normalized});
          if(marketplaceScope==='SHOPEE') throw normalized;
        }
      }

      if(!providerResults.length){
        if(FEATURE_FLAGS.RADAR_V4_SHADOW_ENABLED && db){
          const statuses:Record<string,'OK'|'RATE_LIMITED'|'AUTH_REQUIRED'|'UNAVAILABLE'>={};
          for(const failed of providerErrors){
            const code=failed.error.message.toUpperCase();
            statuses[failed.provider]=code.includes('429')||code.includes('RATE_LIMITED')?'RATE_LIMITED'
              :code.includes('403')||code.includes('401')||code.includes('TOKEN')?'AUTH_REQUIRED':'UNAVAILABLE';
          }
          void saveRadarV4Coverage({
            db,organizationId,query:effectiveQuery,provider:marketplaceScope,
            providerStatuses:statuses,examined:0,assessments:{},
          }).catch(()=>undefined);
        }
        throw providerErrors[0]?.error ?? new Error('RADAR_PROVIDERS_UNAVAILABLE');
      }

      const found=providerResults.flatMap((result)=>
        result.products.filter((product)=>FEATURE_FLAGS.RADAR_V4_DISCOVERY_ENABLED
           ? isDiscoverableProduct(product)
           : FEATURE_FLAGS.REVENUE_RADAR_3_ENABLED
          ? Boolean(product.url?.value && product.title?.value && product.availability?.value!=='unavailable')
          : isCommerceReadyProduct(product,result.meta.minSoldQuantity))
      );
      if(FEATURE_FLAGS.REVENUE_RADAR_3_ENABLED) setComparisonProducts(found);

      if(db && identity.user?.uid && found.length){
        const currentDb=db;
        void recordRadarSignal({db:currentDb,organizationId,query:effectiveQuery,products:found}).catch(()=>undefined);
      }

      const ceiling=maxPrice.trim() ? Number(maxPrice.replace(',','.')) : null;
      const snapshotResolver=signalResolverFromSnapshots(signalOverride ?? marketSignals);
      const ranked=shortlist(found,effectiveQuery,FEATURE_FLAGS.RADAR_V4_DISCOVERY_ENABLED?48:20,(product)=>{
        const stored=snapshotResolver(product,effectiveQuery);
        const officialShopeeSignals=product.marketplace==='SHOPEE'
          ? buildShopeeOfferSignals({
              keyword:effectiveQuery,
              productExternalId:product.externalId,
              sales:product.soldQuantity?.value,
              commissionRate:product.commissionRate?.value,
              observedAt:product.title.observedAt,
            })
          : [];
        return {
          ...stored,
          commissionRate:product.commissionRate?.value ?? stored.commissionRate,
          signals:[
            ...stored.signals,
            ...officialShopeeSignals,
            buildSearchSignal({
              marketplace:product.marketplace,
              keyword:effectiveQuery,
              resultCount:found.length,
              confidence:product.marketplace==='SHOPEE' ? 0.98 : 0.76,
              observedAt:product.title.observedAt,
            }),
          ],
        };
      })
        .filter((opportunity)=>ceiling===null || !opportunity.product.price || opportunity.product.price.value<=ceiling)
        .filter((opportunity)=>!requireImage || Boolean(opportunity.product.imageUrl));

      const rankAssessments=Object.fromEntries(ranked.map(opp=>[opp.id,assessOpportunityV4({
        product:opp.product,keyword:opp.keyword,signals:opp.commercialSignals,legacyScore:opp.score.score,
        sourceLimited:providerResults.find(result=>result.provider===opp.product.marketplace)?.degraded===true,
      })]));
      const visible=FEATURE_FLAGS.RADAR_V4_DISCOVERY_ENABLED
        ? rankCandidatePoolV4(ranked,rankAssessments).slice(0,36)
        : ranked.slice(0,12);
      const provider:ProviderResult['provider']|'ALL'=
        providerResults.length>1 ? 'ALL' : providerResults[0]!.provider;
      const observedAt=providerResults
        .map((result)=>result.observedAt)
        .sort((a,b)=>Date.parse(b)-Date.parse(a))[0] ?? new Date().toISOString();
      const aggregate=providerResults.reduce((acc,result)=>({
        catalogTotal:acc.catalogTotal+result.meta.catalogTotal,
        candidates:acc.candidates+result.meta.candidates,
        usable:acc.usable+result.meta.usable,
        rejectedUnavailable:acc.rejectedUnavailable+result.meta.rejectedUnavailable,
        rejectedLowSales:acc.rejectedLowSales+result.meta.rejectedLowSales,
        rejectedUnverified:acc.rejectedUnverified+result.meta.rejectedUnverified,
      }),{
        catalogTotal:0,
        candidates:0,
        usable:0,
        rejectedUnavailable:0,
        rejectedLowSales:0,
        rejectedUnverified:0,
      });
      const meliResult=providerResults.find((result)=>result.provider==='MELI');
      if(FEATURE_FLAGS.RADAR_V4_SHADOW_ENABLED && db){
        const providerStatuses:Record<string,'OK'|'RATE_LIMITED'|'AUTH_REQUIRED'|'UNAVAILABLE'>={};
        for(const current of providerResults)providerStatuses[current.provider]=current.degraded===true?'UNAVAILABLE':'OK';
        for(const failed of providerErrors){
          const code=failed.error.message.toUpperCase();
          const status=code.includes('429')||code.includes('RATE_LIMITED')?'RATE_LIMITED'
            :code.includes('403')||code.includes('401')||code.includes('TOKEN')?'AUTH_REQUIRED':'UNAVAILABLE';
          providerStatuses[failed.provider]=status;
        }
        void saveRadarV4Coverage({
          db,organizationId,query:effectiveQuery,provider,
          providerStatuses,examined:aggregate.candidates,assessments:rankAssessments,
        }).catch(()=>undefined);
      }

      const resolvedStatus=(provider:'MELI'|'SHOPEE')=>{
        const successful=providerResults.find(item=>item.provider===provider);
        if(successful)return successful.degraded ? 'UNAVAILABLE' as const : 'OK' as const;
        const failed=providerErrors.find(item=>item.provider===provider);
        if(!failed)return null;
        const code=failed.error.message.toUpperCase();
        return code.includes('429')||code.includes('RATE_LIMITED')?'RATE_LIMITED' as const
          :code.includes('403')||code.includes('401')||code.includes('TOKEN')?'AUTH_REQUIRED' as const
          :'UNAVAILABLE' as const;
      };
      const meliStatus=resolvedStatus('MELI');
      const shopeeStatus=resolvedStatus('SHOPEE');
      setSourceStatus({MELI:meliStatus,SHOPEE:shopeeStatus});
      setProviderDegraded({
        MELI:meliStatus!==null && meliStatus!=='OK',
        SHOPEE:shopeeStatus!==null && shopeeStatus!=='OK',
      });
      setOpportunities(visible);
      if(provider==='SHOPEE' || provider==='ALL') setShopeeProviderFallback(false);
      setNestAiInsights({});
      setSearchMeta({
        provider,
        query:effectiveQuery,
        ...aggregate,
        visible:visible.length,
        minSoldQuantity:meliResult?.meta.minSoldQuantity ?? 0,
        staleObservation:meliResult?.meta.staleObservation===true,
        observedAt,
      });
      setHasSearched(true);
      setAnalysisNotice(
        meliResult?.meta.staleObservation===true
          ? (locale==='pt-BR'
            ? `A API do Mercado Livre está limitada. Mostrando ${visible.length} produtos observados anteriormente, somente para pesquisa. Confirme preço, estoque, foto e link afiliado no anúncio antes de publicar.`
            : locale==='es'
              ? `API limitada. ${visible.length} productos de observaciones anteriores, solo investigación. Comprueba precios y enlaces.`
              : `Marketplace temporarily restricted. Showing ${visible.length} prior official research products. Verify price, stock, image and affiliate URL before publishing.`)
        : visible.length
          ? FEATURE_FLAGS.RADAR_V4_DISCOVERY_ENABLED
            ? locale==='pt-BR'
              ? `${visible.length} candidatos oficiais em pesquisa. Vendas desconhecidas continuam como desconhecidas; publicação depende de revisão.`
              : `${visible.length} research candidates. Unknown sales remain unknown; publishing requires review.`
            : provider==='SHOPEE'
            ? t('radarShopeeAnalysisSuccess',{n:visible.length})
            : provider==='MELI'
              ? t('radarAnalysisSuccess',{n:visible.length,min:meliResult?.meta.minSoldQuantity ?? 0})
              : t('radarProductsShown',{n:visible.length})
          : provider==='SHOPEE'
            ? t('radarNoProductsBody')
            : t('radarAnalysisNoQualified',{min:meliResult?.meta.minSoldQuantity ?? 0})
      );
      setState('idle');
    } catch (error) {
      const code=error instanceof Error ? error.message : 'UNKNOWN';
      if(code.includes('SHOPEE_API_NOT_CONNECTED')){
        setShopeeApiConfigured(false);
        setShopeeProviderFallback(true);
        setHasSearched(false);
        setOpportunities([]);
        setSearchMeta(null);
        setErrorCode('');
        setAnalysisNotice(t('shopeeQuickModeNotice'));
        setState('idle');
        window.requestAnimationFrame(()=>{
          document.getElementById('shopee-quick-mode')?.scrollIntoView({behavior:'smooth',block:'start'});
        });
        return;
      }
      if(marketplaceScope==='SHOPEE' && code.includes('SHOPEE_')){
        setShopeeProviderFallback(true);
      }
      setHasSearched(true);
      setAnalysisNotice('');
      setOpportunities([]);
      setSearchMeta(null);
      setErrorCode(code);
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
    const v4=FEATURE_FLAGS.RADAR_V4_DISCOVERY_ENABLED ? assessOpportunityV4({
      product,keyword:campaignKeyword,signals:opportunity.commercialSignals,
    }) : null;
    const score = opportunity.score;
    const id = `campaign-${Date.now()}`;
    const campaign: Campaign = {
      id, organizationId, status: 'READY', marketplace: product.marketplace, score,
      rankingContext:{
        rank,
        trackingCode:opportunity.trackingCode,
        evidence:opportunity.rankingReasons,
        signalSources:opportunity.commercialSignals.map((signal)=>signal.source),
        ...(v4 ? {v4ResearchDraft:v4.status!=='READY_NOW',v4AssessmentVersion:v4.version} : {}),
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
    const product=opportunity.product;
    const destination=isSafeAffiliateUrl(product.affiliateUrl?.value,product.marketplace)
      ? product.affiliateUrl!.value
      :isSafeOfferUrl(product.url.value,product.marketplace)?product.url.value:null;
    if(!destination){
      setAnalysisNotice(locale==='pt-BR'?'Confira uma URL HTTPS oficial antes de continuar.':locale==='es'?'Compruebe la URL oficial HTTPS.':'Verify a safe official HTTPS URL first.');
      return;
    }
    window.open(destination,'_blank','noopener,noreferrer');
    void navigator.clipboard.writeText(destination).catch(()=>undefined);
  }

  return (
    <div className="page">
      <PageTitle eyebrow="RADAR" title={t('opportunities')} subtitle={t('opportunitiesSub')} />
      <RadarResearchHistory organizationId={organizationId} />
      <section className="radar-start-guide" aria-label={locale==='pt-BR'?'Como escolher um produto e criar um Pin':'How to select a product'}>
        <strong>{locale==='pt-BR'?'Como começar: 1. Pesquise → 2. Escolha um produto → 3. Prepare o Pin → 4. Publique':locale==='es'?'Cómo empezar: buscar → elegir producto → preparar Pin → publicar':'Start: search → choose product → prepare Pin → publish'}</strong>
        <p>{locale==='pt-BR'?'Quando gostar de um produto, clique em “Escolher produto e preparar Pin”. Você será levado à revisão guiada, com título, descrição, prompt do ChatGPT, imagem e link afiliado.':locale==='es'?'Elige un producto para abrir la revisión guiada.':'Choose a product to open its guided creative review, image prompt and affiliate link confirmation.'}</p>
      </section>
      <div className="marketplace-scope" role="group" aria-label={t('marketplaceFilter')}>
        <span>{t('marketplaceFilter')}</span>
        <div>
          {(['ALL','MELI','SHOPEE'] as const).map((value)=><button
            key={value}
            type="button"
            className={marketplaceScope===value ? 'active' : ''}
            aria-pressed={marketplaceScope===value}
            onClick={()=>{
              setMarketplaceScope(value);
              setOpportunities([]);
              setSearchMeta(null);
              setHasSearched(false);
              setAnalysisNotice('');
              setActiveIntentQuery(null);
              setShopeeProviderFallback(false);
            }}
          >{value==='ALL' ? t('marketplaceAll') : value==='MELI' ? t('marketplaceMeli') : t('marketplaceShopee')}</button>)}
        </div>
      </div>

      <ProblemIntentExplorer
        busy={state==='loading'}
        onSearch={q=>{setActiveIntentQuery(q);void search(q);}}
        feedback={activeIntentQuery&&query===activeIntentQuery&&hasSearched&&state==='error'
          ? {query:activeIntentQuery,phase:'error',detail:locale==='pt-BR'?'A fonte pode estar indisponível, limitada ou sem permissão para pesquisar.':'Provider unavailable, restricted or lacking search permission.'}
          : activeIntentQuery&&query===activeIntentQuery&&state==='loading'
            ? {query:activeIntentQuery,phase:'searching'}
            : activeIntentQuery&&query===activeIntentQuery&&hasSearched&&state==='idle'
              ? {query:activeIntentQuery,
                phase:searchMeta?.visible
                  ? (Object.values(sourceStatus).some(value=>value&&value!=='OK')?'partial':'success')
                  : 'empty',
                count:searchMeta?.visible??0}
              : null}
      />
      <div className="search-box">
        <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void search()} placeholder={t('radarSearchPlaceholder')} />
        <button className="button primary" disabled={state==='loading'} onClick={() => void search()}>
          {state==='loading'
            ? t('analyzingProducts')
            : marketplaceScope==='SHOPEE' && (shopeeApiConfigured===false || shopeeProviderFallback)
              ? t('shopeeUseQuickMode')
              : marketplaceScope==='SHOPEE'
                ? t('searchShopeeOfficial')
                : t('analyzeProducts')}
        </button>
      </div>

      {marketplaceScope==='SHOPEE' && (shopeeApiConfigured===false || shopeeProviderFallback) && <>
        <ShopeeResearchBridge query={query} degraded={shopeeProviderFallback && shopeeApiConfigured===true} />
        {editable
          ? <ManualProductImport
              organizationId={organizationId}
              featured
              defaultMarketplace="SHOPEE"
              seedKeyword={query}
              onImported={(product, keyword, signals) => create(product, keyword, signals)}
            />
          : <div className="notice">{t('readOnlyRadar')}</div>}
      </>}

      <div className="radar-suggestions">
        <span>{t('suggestedSearches')}</span>
        <div className="suggestion-buttons">
          {suggestedQueries.map((suggestion)=><button key={suggestion} type="button" onClick={()=>void search(suggestion)}>{suggestion}</button>)}
        </div>
      </div>

      <div className="radar-status-row">
        <details className="market-intelligence">
          <summary>
            <span className="health-dot" />
            <div>
              <strong>{
                marketplaceScope==='SHOPEE'
                  ? (shopeeApiConfigured===true && !shopeeProviderFallback ? t('shopeeApiConnected') : t('shopeeQuickModeActive'))
                  : marketplaceScope==='ALL'
                    ? t('radarProvidersStatus')
                    : t('officialAutomationOn')
              }</strong>
              <span>{
                marketplaceScope==='SHOPEE'
                  ? (shopeeApiConfigured===true && !shopeeProviderFallback ? t('radarShopeeStatusBody') : t('radarShopeeFallbackBody'))
                  : marketplaceScope==='ALL'
                    ? t('radarProvidersStatusBody')
                    : t('officialAutomationBody')
              }{marketplaceScope!=='SHOPEE' && latestSignalAt ? ` · ${t('updatedAt')} ${new Intl.DateTimeFormat(locale,{dateStyle:'short',timeStyle:'short'}).format(latestSignalAt)}` : ''}</span>
            </div>
            <b>{t('viewMarketIntelligence')}</b>
          </summary>
          <div className="market-intelligence-body">
            <div className="market-intelligence-head">
              <div>
                <strong>{t('marketIntelligenceTitle')}</strong>
                <span>{t('marketIntelligenceBody',{n:marketSignals.length})}</span>
              </div>
            </div>
            <div className="market-insight-grid">
              {marketInsights.length ? marketInsights.map((signal)=>(
                <button key={signal.id} type="button" onClick={()=>signal.keyword && void search(signal.keyword)}>
                  <span>{marketSignalLabel(signal)}</span>
                  <strong>{signal.keyword}</strong>
                  {signal.rank ? <small>#{signal.rank}</small> : null}
                </button>
              )) : <p>{t('marketIntelligencePending')}</p>}
            </div>
          </div>
        </details>
        <div className="chips compact"><span>{t('noDuplicates')}</span><span>{t('seasonalityOn')}</span></div>
      </div>
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
      {FEATURE_FLAGS.RADAR_V4_SHADOW_ENABLED && <div className="v4-status-filters">
        <div className="v4-filter-heading"><strong>{locale==='pt-BR'?'O que vale sua atenção':'What needs your attention'}</strong><small>{shownOpportunities.length} / {opportunities.length}</small></div>
        <div className="v4-filter-options">
          {(['ALL','READY_NOW','NEAR_READY','PROMISING','SOURCE_LIMITED'] as const).map(s=>
            <button key={s} type="button" aria-pressed={v4StatusFilter===s}
              className={v4StatusFilter===s?'active':''} onClick={()=>setV4StatusFilter(s)}>{
                v4FilterLabels[s]
              }</button>)}
          {v4StatusFilter!=='ALL'&&<button type="button" className="text-button" onClick={()=>setV4StatusFilter('ALL')}>{locale==='pt-BR'?'Limpar filtros':locale==='es'?'Limpiar filtros':'Clear filters'}</button>}
        </div>
      </div>}
      {FEATURE_FLAGS.REVENUE_RADAR_3_ENABLED && <div className="radar-filters r3-filters">
        <label className="filter-check"><input type="checkbox" checked={onlyValidated} onChange={(e)=>setOnlyValidated(e.target.checked)}/><span>{t('r3OnlyValidated')}</span></label>
        <label className="filter-check"><input type="checkbox" checked={confirmedCommissionOnly} onChange={(e)=>setConfirmedCommissionOnly(e.target.checked)}/><span>{t('r3OnlyConfirmedCommission')}</span></label>
        <label className="filter-check"><input type="checkbox" checked={authorizedAssetsOnly} onChange={(e)=>setAuthorizedAssetsOnly(e.target.checked)}/><span>{t('r3OnlyAuthorizedAssets')}</span></label>
      </div>}
      {state === 'loading' && <ProgressSteps />}
      {analysisNotice && state==='idle' && <div className="radar-analysis-success" role="status" aria-live="polite">
        <span className="radar-success-mark">✓</span>
        <div><strong>{t('radarAnalysisDone')}</strong><span>{analysisNotice}</span></div>
      </div>}
      {state === 'error' && <div className="notice danger radar-error">
        <div>
          <strong>{t('radarErrorTitle')}</strong>
          <span>{
            errorCode.includes('SHOPEE_API_NOT_CONNECTED') ? t('radarShopeeErrorReconnect') :
            errorCode.includes('SHOPEE_CREDENTIALS_STALE') || errorCode.includes('SHOPEE_CREDENTIALS_REJECTED') ? t('radarShopeeErrorStale') :
            errorCode.includes('SHOPEE_') ? t('radarShopeeErrorGeneric') :
            errorCode.includes('MELI_RATE_LIMITED') || errorCode.includes('429') ? (locale==='pt-BR'?'Limite temporário da fonte: suas oportunidades não foram rejeitadas. Aguarde o horário permitido pelo provedor e tente novamente.':locale==='es'?'Límite temporal de la fuente. Reintente cuando el proveedor lo permita.':'Provider rate limit. Retry after the provider cooldown; offers were not rejected.') :
            errorCode.includes('MELI_PROVIDER_SEARCH_RESTRICTED_403')
              ? (locale==='pt-BR'?'O Mercado Livre bloqueou a pesquisa oficial (403). Não é uma falha de produto nem de sua conta. Use a pesquisa no site e traga o link do anúncio; integrar a busca automática depende de permissão do provedor.':locale==='es'?'Mercado Libre bloqueó la búsqueda oficial (403). Busque en la web e importe el enlace del anuncio.':'Mercado Livre denied the official search (403). Search on its website and import the listing link.') :
            errorCode.includes('MELI_PROVIDER_TOKEN_DENIED_401')
              ? (locale==='pt-BR'?'O Mercado Livre recusou o token da API. Verifique a conexão e renove as permissões no painel de integrações.':locale==='es'?'Mercado Libre rechazó el token; compruebe la conexión.':'Mercado Livre rejected the API token; review the connection.') :
            errorCode.includes('MELI_NOT_CONNECTED') ? t('radarErrorReconnect') :
            errorCode.includes('MELI_TOKEN_STALE') ? t('radarErrorRefreshing') :
            errorCode.includes('FORBIDDEN') || errorCode.includes('NESTAFFILIATE_NOT_ENABLED') ? t('radarErrorAccess') :
            marketplaceScope==='SHOPEE' ? t('radarShopeeErrorGeneric') :
            marketplaceScope==='ALL' ? t('radarProvidersError') :
            t('radarError')
          }</span>
        </div>
        {errorCode.includes('SHOPEE_API_NOT_CONNECTED')
          ? <NavLink className="button secondary" to="/connections">{t('connections')}</NavLink>
          : <button className="button secondary" type="button" onClick={()=>void search()}>{t('radarRetry')}</button>}
      </div>}
      {(marketplaceScope==='MELI' || marketplaceScope==='ALL') && hasSearched &&
        ((state==='error' && !errorCode.startsWith('SHOPEE_')) || (state==='idle' && sourceStatus.MELI && sourceStatus.MELI!=='OK')) &&
        <section className="surface meli-manual-research" role="region" aria-label={locale==='pt-BR'?'Pesquisa alternativa Mercado Livre':'Mercado Livre fallback research'}>
          <p className="eyebrow">MERCADO LIVRE · PESQUISA ASSISTIDA</p>
          <h3>{locale==='pt-BR'?'Continue pesquisando, mesmo sem a API':locale==='es'?'Siga investigando aunque falle la API':'Keep researching when the API is unavailable'}</h3>
          <p>{locale==='pt-BR'?'Abra a pesquisa no Mercado Livre, escolha um anúncio verdadeiro e cole o endereço no formulário abaixo. O NestAffiliate não inventa preço, fotos ou comissões.':locale==='es'?'Abre la búsqueda oficial, elige un anuncio auténtico e importa su enlace.':'Open the marketplace search, choose a real listing and import its link.'}</p>
          <a className="button primary" target="_blank" rel="noopener noreferrer"
            href={'https://lista.mercadolivre.com.br/'+encodeURIComponent(query.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'-').slice(0,100))}>
            {locale==='pt-BR'?'Pesquisar no site do Mercado Livre ↗':locale==='es'?'Buscar en Mercado Libre ↗':'Search Mercado Livre website ↗'}
          </a>
          {editable&&<ManualProductImport organizationId={organizationId} defaultMarketplace="MELI" seedKeyword={query} onImported={(product,keyword,signals)=>create(product,keyword,signals)}/>}
        </section>}
      {hasSearched && state==='idle' && Object.values(sourceStatus).some(s=>s&&s!=='OK') && <section className="notice radar-source-limited" role="status">
        <strong>{searchMeta?.staleObservation===true ? (locale==='pt-BR'?'Dados anteriores — confirme a oferta':locale==='es'?'Datos anteriores — verificar oferta':'Prior research data — verify listing') : locale==='pt-BR'?'Fonte temporariamente limitada':locale==='es'?'Fuente temporalmente limitada':'Temporarily limited source'}</strong>
        {searchMeta?.staleObservation===true&&<p>{locale==='pt-BR'
          ? 'Estes produtos vêm de observações oficiais anteriores, não de uma pesquisa ao vivo. Preços, vendas, estoque e comissão foram removidos até nova confirmação.'
          : locale==='es'
            ? 'Son observaciones oficiales anteriores, no datos en vivo. Precio, ventas, stock y comisiones requieren verificación.'
            : 'These are prior official observations, not live listings. Price, sales, stock and commission are withheld until verified.'}</p>}
        <p>{locale==='pt-BR'?'Os dados que faltaram não foram tratados como sinal negativo do produto. Investigue as ofertas existentes ou tente novamente quando a fonte estiver disponível.':locale==='es'?'Los datos faltantes no significan mala calidad. Examine las ofertas existentes o reintente cuando vuelva la fuente.':'Missing provider data is not evidence of a poor product. Review existing offers or retry once the provider recovers.'}</p>
        <small>{Object.entries(sourceStatus).filter(([,s])=>s&&s!=='OK').map(([name,status])=>name+': '+status).join(' · ')}</small>
      </section>}
      {FEATURE_FLAGS.RADAR_V4_SHADOW_ENABLED && hasSearched && state==='idle' && <section className="v4-funnel">
        <p className="eyebrow">RADAR 4.0 · EVIDENCE</p>
        <h3>{locale==='pt-BR'?'Investigação, não volume artificial':'Evidence-first investigation'}</h3>
        <div className="v4-funnel-metrics">
          <div><strong>{searchMeta?.candidates??v4Funnel.examined}</strong><span>{locale==='pt-BR'?'Candidatos':locale==='es'?'Candidatos':'Candidates'}</span></div>
          <div><strong>{v4Funnel.discovery}</strong><span>{locale==='pt-BR'?'Em pesquisa':locale==='es'?'En investigación':'In research'}</span></div>
          <div><strong>{v4Funnel.resolvedListings}</strong><span>{locale==='pt-BR'?'Anúncios identificados':locale==='es'?'Anuncios identificados':'Identified listings'}</span></div>
          <div><strong>{v4Funnel.promising}</strong><span>{locale==='pt-BR'?'Para investigar':locale==='es'?'Para investigar':'Worth investigating'}</span></div>
        </div>
        <p className="muted">{locale==='pt-BR'?'Este Radar identifica ofertas para pesquisa. Aprovação, imagem, link de comissão e publicação são confirmados depois, na campanha.':locale==='es'?'El Radar identifica ofertas para investigación. La publicación se valida después en la campaña.':'This Radar finds research candidates; creative, commission link, approval and publication are checked later.'}</p>
      </section>}
      {searchMeta && state==='idle' && <section className="radar-search-summary">
        <div>
          <span className="eyebrow">{t('radarSearchResult')}</span>
          <strong>{searchMeta.visible>0
            ? t('radarProductsShown',{n:searchMeta.visible})
            : t('radarNoProductsShown')}</strong>
          <p>{t('radarSearchStats',{
            catalog:searchMeta.catalogTotal,
            analyzed:searchMeta.candidates,
            usable:searchMeta.usable,
          })}</p>
          <small>{searchMeta.provider==='SHOPEE'
            ? t('radarShopeeQualityGate',{
                unavailable:searchMeta.rejectedUnavailable,
                unverified:searchMeta.rejectedUnverified,
              })
            : t('radarQualityGate',{
                min:searchMeta.minSoldQuantity,
                unavailable:searchMeta.rejectedUnavailable,
                lowSales:searchMeta.rejectedLowSales,
                unverified:searchMeta.rejectedUnverified,
              })}</small>
          <small className="ranking-order-note">{t('radarRankingOrder')}</small>
          {FEATURE_FLAGS.RADAR_V4_DISCOVERY_ENABLED && <small role="status">
            {locale==='pt-BR'
              ? 'Radar 4.0: produtos são pesquisados sem exigir 100 vendas. Fonte, estoque, comissão e imagem podem estar pendentes; nenhum dado desconhecido é considerado confirmado.'
              : 'Radar 4.0: no 100-sales discovery threshold. Stock, commissions and image rights may remain unknown.'}
          </small>}
        </div>
        <span className="search-source">{searchMeta.provider==='SHOPEE'
          ? t('shopeeOfficialApiSource')
          : searchMeta.provider==='ALL'
            ? `Mercado Livre + ${t('shopeeOfficialApiSource')}`
            : 'Mercado Livre'} · {new Intl.DateTimeFormat(locale,{timeStyle:'short'}).format(Date.parse(searchMeta.observedAt))}</span>
      </section>}
      {!hasSearched && !opportunities.length && state === 'idle' && <Empty title={t('radarEmpty')} body={t('radarEmptyBody')} />}
      {hasSearched && !opportunities.length && state==='idle' && <section className="radar-zero-results">
        <strong>{searchMeta?.usable
          ? t('radarFilteredEmptyTitle')
          : t('radarNoProductsTitle')}</strong>
        <p>{searchMeta?.usable
          ? t('radarFilteredEmptyBody')
          : t('radarNoProductsBody')}</p>
        <div className="suggestion-buttons">
          {suggestedQueries.slice(0,4).map((suggestion)=><button key={`empty-${suggestion}`} type="button" onClick={()=>void search(suggestion)}>{suggestion}</button>)}
        </div>
      </section>}
      {(marketplaceScope==='SHOPEE' && (shopeeApiConfigured===false || shopeeProviderFallback)) || ((marketplaceScope==='MELI' || marketplaceScope==='ALL') && hasSearched && ((state==='error' && !errorCode.startsWith('SHOPEE_')) || (state==='idle' && sourceStatus.MELI && sourceStatus.MELI!=='OK'))) ? null : editable ? (
        <ManualProductImport organizationId={organizationId} onImported={(product, keyword, signals) => create(product, keyword, signals)} />
      ) : (
        <div className="notice">{t('readOnlyRadar')}</div>
      )}
      {FEATURE_FLAGS.REVENUE_RADAR_3_ENABLED && hasSearched && opportunities.length>0 && visibleOpportunities.length===0 && <Empty title={t('r3FilterNoMatch')} body={t('r3FilterClearHelp')}/>}
      <div className="opportunity-grid">
        {shownOpportunities.map((opportunity,index) => {
          const product=opportunity.product;
          // A partial rollout must never allow unverified research items into a campaign.
          const assessment=FEATURE_FLAGS.REVENUE_RADAR_3_ENABLED ? assessRevenueOpportunity(opportunity) : null;
          const comparisons=FEATURE_FLAGS.CROSS_MARKET_OFFER_COMPARE_ENABLED
            ? findComparableOffers(product,comparisonProducts) : [];
          const potential=productPotentialBand(opportunity);
          const potentialLabel=potential==='EXCEPTIONAL' ? t('potentialExceptional') :
            potential==='VERY_HIGH' ? t('potentialVeryHigh') :
            potential==='HIGH' ? t('potentialHigh') :
            t('potentialValidated');
          return (
          <article className="opportunity-card radar2-card" key={product.externalId}>
            <div className="product-image">
              <RadarProductImage product={product} />
              <span className="rank-pill">#{index+1}</span>
              {FEATURE_FLAGS.RADAR_V4_SHADOW_ENABLED&&v4ById[opportunity.id]
                ? <span className="radar-score radar-score-v4" title={locale==='pt-BR'?'Faixa provisória do potencial editorial':'Provisional editorial potential range'}>{v4ById[opportunity.id]!.potential.lower}–{v4ById[opportunity.id]!.potential.upper}</span>
                : <span className="radar-score">{opportunity.score.score}</span>}
            </div>
            <div className="opportunity-copy">
              <div className="opportunity-meta">
                <span className="market-chip">{product.marketplace==='MELI'?'Mercado Livre':'Shopee'}</span>
                {FEATURE_FLAGS.RADAR_V4_SHADOW_ENABLED && v4ById[opportunity.id]
                  ? <span className="potential-chip">{v4FilterLabels[v4ById[opportunity.id]!.status]}</span>
                  : <><span className={`potential-chip potential-${potential.toLowerCase()}`}>{potentialLabel}</span>
                    <span>NestScore 2.0 · {t(opportunity.score.confidence as 'high'|'medium'|'low')}</span></>}
                {FEATURE_FLAGS.RADAR_V4_SHADOW_ENABLED&&<details className="legacy-radar-score">
                   <summary>{locale==='pt-BR'?'Nota histórica (heurística)':locale==='es'?'Puntuación histórica (heurística)':'Legacy heuristic score'}</summary>
                   <small>NestScore 2.0: {opportunity.score.score}/100 · {t(opportunity.score.confidence as 'high'|'medium'|'low')}. {locale==='pt-BR'?'Não comprova procura nem vendas.':locale==='es'?'No prueba demanda ni ventas.':'Does not prove demand or sales.'}</small>
                 </details>}
              </div>
              <h3>{isSafeOfferUrl(product.url.value,product.marketplace)
                ? <a className="product-title-link" href={product.url.value} target="_blank" rel="noopener noreferrer">{product.title.value}</a>
                : product.title.value}</h3>
              <p className="price">{product.price ? new Intl.NumberFormat(locale,{style:'currency',currency:product.currency.value}).format(product.price.value) : t('priceUnknown')}</p>
              <div className="product-proof-row">
                <span className={product.availability.value==='available'?'proof-chip success':'proof-chip subtle'}>{product.availability.value==='available'
                  ? t('availableNow')
                  : product.availability.value==='unavailable'
                    ? locale==='pt-BR'?'Oferta indisponível':locale==='es'?'Oferta no disponible':'Unavailable offer'
                    : locale==='pt-BR'?'Disponibilidade não confirmada':locale==='es'?'Disponibilidad no confirmada':'Availability not confirmed'}</span>
                {typeof product.soldQuantity?.value==='number'
                  ? <span className="proof-chip">{t('salesProof',{n:new Intl.NumberFormat(locale,{notation:'compact',maximumFractionDigits:1}).format(product.soldQuantity.value)})}</span>
                  : null}
                {typeof product.availableQuantity?.value==='number'
                  ? <span className="proof-chip subtle">{t('stockProof',{n:new Intl.NumberFormat(locale).format(product.availableQuantity.value)})}</span>
                  : null}
                {typeof product.rating?.value==='number'
                  ? <span className="proof-chip subtle">★ {product.rating.value.toFixed(1)}</span>
                  : null}
                {typeof product.commissionRate?.value==='number'
                  ? <span className="proof-chip success">{t('shopeeCommission',{rate:new Intl.NumberFormat(locale,{style:'percent',maximumFractionDigits:1}).format(product.commissionRate.value)})}</span>
                  : null}
                {typeof product.estimatedCommission?.value==='number'
                  ? <span className="proof-chip subtle">{t('shopeeEstimatedCommission',{value:new Intl.NumberFormat(locale,{style:'currency',currency:product.currency.value}).format(product.estimatedCommission.value)})}</span>
                  : null}
                {product.marketplace==='SHOPEE' && isSafeAffiliateUrl(product.affiliateUrl?.value,product.marketplace)
                  ? <span className="proof-chip success">{t('shopeeAffiliateReady')}</span>
                  : null}
              </div>
              {FEATURE_FLAGS.RADAR_V4_SHADOW_ENABLED && v4ById[opportunity.id] && <OpportunityV4Panel assessment={v4ById[opportunity.id]!}/>}
              {assessment && FEATURE_FLAGS.REVENUE_ASSESSMENT_ENABLED && <RevenueAssessmentPanel assessment={assessment}/>}
              {FEATURE_FLAGS.CROSS_MARKET_OFFER_COMPARE_ENABLED && <details className="revenue-assessment">
                <summary>{t('r3Compare')} ({comparisons.length})</summary>
                <p>{t('r3EquivalenceCaution')}</p>
                {comparisons.map((item)=><div key={item.product.marketplace+item.product.externalId} className="compare-offer">
                  <strong>{item.product.marketplace==='MELI'?'Mercado Livre':'Shopee'} · {item.product.title.value}</strong>
                  <p>{item.priceKnown && item.product.price
                    ? new Intl.NumberFormat(locale,{style:'currency',currency:item.product.currency.value}).format(item.product.price.value)
                    : t('priceUnknown')}</p>
                  <p>{item.estimatedCommissionPerSale!==null
                    ? t('shopeeEstimatedCommission',{value:new Intl.NumberFormat(locale,{style:'currency',currency:item.product.currency.value}).format(item.estimatedCommissionPerSale)})
                    : t('r3CommissionUnknown')}</p>
                  <p>{item.affiliateLinkReady?t('r3AffiliatePresent'):t('r3AffiliateMissing')}</p>
                  {isSafeOfferUrl(item.product.url.value,item.product.marketplace)
                  ? <a className="button secondary" href={item.product.url.value} rel="noopener noreferrer" target="_blank">{t('r3SeeOffer')}</a>
                  : <small role="status">{locale==='pt-BR'?'Oferta sem URL segura confirmada':locale==='es'?'Oferta sin URL verificada':'Offer URL not verified'}</small>}
                </div>)}
              </details>}
              {FEATURE_FLAGS.NESTAI_OPPORTUNITY_ENRICHMENT_ENABLED && index<3 && <section className="revenue-assessment">
                <strong>{t('r3AIReview')}</strong>
                <p>{t('r3AIDisclaimer')}</p>
                <button type="button" className="button secondary" disabled={nestAiLoading!==null || !identity.user} onClick={()=>{
                  if(!identity.user) return;
                  setNestAiLoading(opportunity.id);
                  const input={
                    title:product.title.value,marketplace:product.marketplace,
                    price:product.price?.value,currency:product.currency.value,
                    availability:product.availability.value,sales:product.soldQuantity?.value,
                    seller:product.sellerName?.value,
                  };
                  void analyzeAffiliateProduct({user:identity.user,organizationId,locale,product:input})
                    .then((analysis)=>setNestAiInsights((current)=>({...current,[opportunity.id]:analysis})))
                    .catch(()=>setNestAiInsights((current)=>({...current,[opportunity.id]:{error:true}})))
                    .finally(()=>setNestAiLoading(null));
                }}>{nestAiLoading===opportunity.id?t('r3AILoading'):t('r3AIAnalyze')}</button>
                {nestAiInsights[opportunity.id] && ('error' in nestAiInsights[opportunity.id]!
                  ? <p role="status">{t('r3AIFallback')}</p>
                  : <div>
                    <strong>{t('r3AIUnknowns')}</strong>
                    <ul>{(nestAiInsights[opportunity.id] as AffiliateProductAnalysis).unknowns.slice(0,4).map((txt,i)=><li key={i}>{txt}</li>)}</ul>
                    <strong>{t('r3AIHypotheses')}</strong>
                    <ul>{(nestAiInsights[opportunity.id] as AffiliateProductAnalysis).opportunities.slice(0,4).map((txt,i)=><li key={i}>{txt}</li>)}</ul>
                  </div>)}
              </section>}
              <div className="ranking-reasons">
                <strong>{t('whyRanked')}</strong>
                {opportunity.rankingReasons.slice(0,3).map((reason)=><span key={reason}>{reason}</span>)}
              </div>
              <div className="tracking-row"><code>{opportunity.trackingCode}</code><button className="text-button" onClick={()=>void navigator.clipboard.writeText(opportunity.trackingCode)}>{t('copyTracking')}</button></div>
              <div className="opportunity-actions">
                <ProductSourceActions product={product} compact />
                <button className="button secondary" onClick={()=>prepareAffiliate(opportunity)}>{t('affiliatePrep')}</button>
                <button className="button primary" disabled={!editable || (!FEATURE_FLAGS.RADAR_V4_DISCOVERY_ENABLED && Boolean(assessment && assessment.track!=='VALIDATED'))} onClick={() => create(product,query,{signals:opportunity.commercialSignals},index+1)}>{FEATURE_FLAGS.RADAR_V4_DISCOVERY_ENABLED && v4ById[opportunity.id]?.status!=='READY_NOW'
 ? (locale==='pt-BR'?'Criar rascunho de pesquisa':'Create research draft')
 : assessment && assessment.track!=='VALIDATED' ? t('r3ReviewFirst') : (locale==='pt-BR'?'Escolher produto e preparar Pin →':locale==='es'?'Elegir producto y preparar Pin →':'Choose product and prepare Pin →')}</button>
              </div>
            </div>
          </article>
        )})}
      </div>
    </div>
  );
}


function RevenueAssessmentPanel({assessment}:{assessment:RevenueAssessment}) {
  const {t,locale}=useI18n();
  const trackLabel={
    VALIDATED:'r3TrackValidated',EXPLORATORY:'r3TrackExploratory',
    REVIEW_REQUIRED:'r3TrackReview',BLOCKED:'r3TrackBlocked',
  } as const;
  const confidenceLabel=(value:string)=>value==='UNKNOWN'?t('r3Unknown'):t(value.toLowerCase() as 'high'|'medium'|'low');
  const uncertaintyLabels={
    LISTING_NOT_VERIFIED:'r3LISTING_NOT_VERIFIED',UNKNOWN_SALES:'r3UNKNOWN_SALES',
    COMMISSION_UNCONFIRMED:'r3COMMISSION_UNCONFIRMED',DEMAND_NOT_VERIFIED:'r3DEMAND_NOT_VERIFIED',
    OFFER_STALE:'r3OFFER_STALE',ASSET_RIGHTS_UNKNOWN:'r3ASSET_RIGHTS_UNKNOWN',
    AFFILIATE_LINK_NOT_CONFIRMED:'r3AFFILIATE_LINK_NOT_CONFIRMED',
  } as const;
  return <section className="revenue-assessment" aria-label={t('r3Track')}>
    <strong>{t('r3Track')}: <span className="assessment-status">{t(trackLabel[assessment.track])}</span></strong>
    <p>{t('r3DemandConfidence')}: {confidenceLabel(assessment.demandConfidence)} · {t('r3OfferConfidence')}: {confidenceLabel(assessment.offerConfidence)}</p>
    <p>{t('r3RevenueConfidence')}: {confidenceLabel(assessment.revenueConfidence)}</p>
    <details><summary>{t('r3Reasons')}</summary>
      {assessment.evidence.length>0 && <ul>{assessment.evidence.slice(0,8).map((item)=><li key={item.provenanceId}>
        {t('r3Source')}: {item.source} · {item.evidenceType} · {Number.isFinite(Date.parse(item.observedAt))?new Date(item.observedAt).toLocaleDateString(locale):t('todayUnknown')}
      </li>)}</ul>}
      {assessment.uncertainties.length>0 && <><strong>{t('r3Uncertainty')}</strong><ul>
        {assessment.uncertainties.map((item)=><li key={item}>{t(uncertaintyLabels[item as keyof typeof uncertaintyLabels] || 'r3Unknown')}</li>)}
      </ul></>}
      <p>{t('r3SupplyNotDemand')}</p>
    </details>
  </section>;
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
  const [affiliateChecked, setAffiliateChecked] = useState(false);
  const [pendingEdit,setPendingEdit] = useState<CreativeEditPlan|null>(null);
  const [editError,setEditError] = useState('');
  const [swapOptions, setSwapOptions] = useState<ProductTruth[]>([]);
  const [swapLoading, setSwapLoading] = useState(false);
  const [approvalAttempted,setApprovalAttempted]=useState(false);
  const approvingRef = useRef(false);

  useEffect(() => {
    setAffiliateDraft(campaign?.currentVersion.product.affiliateUrl?.value ?? '');
    setAffiliateChecked(Boolean(campaign?.currentVersion.product && inspectAffiliateAttestation(campaign.currentVersion.product)==='SELF_CONFIRMED'));
    setAffiliateError('');
  }, [campaign?.currentVersion.id, campaign?.currentVersion.product]);

  useEffect(()=>{setPendingEdit(null);setEditError('');},[campaign?.currentVersion.id]);

  if (!campaign) return <Navigate to="/campaigns" replace />;
  const activeCampaign: Campaign = campaign;
  const v = activeCampaign.currentVersion;
  const approvalGuard=runPublishingGuard({
    product:v.product,
    disclosure:v.narrative.disclosure,
    destinationUrl:v.product.affiliateUrl?.value ?? v.product.url.value,
    headline:v.narrative.headline,description:v.narrative.description,
    creativeAsset:v.creativeAsset,
    requireAffiliateAttestation:Boolean(campaign.rankingContext?.v4ResearchDraft) || campaign.organizationId!=='demo-org',
    duplicateSimilarity:campaignDuplicateSimilarity(campaign,campaigns),
  });
  const missingSteps=reviewBlockers(activeCampaign,approvalGuard);

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

  function previewEdit(raw:string){
    const plan=planCreativeEdit(v,raw);
    setPendingEdit(plan.ok?plan:null);
    setEditError(plan.ok?'':plan.message);
  }

  function confirmEdit(){
    if(!editable || !pendingEdit?.ok)return;
    const next=nextCampaignVersion(campaign,pendingEdit.changes,pendingEdit.originalRequest);
    update(next);
    recordDecision('EDITED',next,pendingEdit.originalRequest);
    setPendingEdit(null);
    setEditError('');
    setCommand('');
    setSaved(true);
  }

  function saveAffiliateLink() {
    try {
      const url = new URL(affiliateDraft.trim());
      if (!isSafeAffiliateUrl(url.toString(),v.product.marketplace)) throw new Error('domain');
      if(v.product.marketplace==='MELI' && !affiliateChecked){
        setAffiliateError(locale==='pt-BR'?'Confirme o anúncio, a sua conta e o canal Pinterest na Central de Afiliados antes de salvar.':locale==='es'?'Confirma primero en el portal de afiliados.':'Confirm the listing, account and Pinterest channel in the affiliate portal first.');
        return;
      }
      const product: ProductTruth = {
        ...v.product,
        affiliateUrl: {
          value: url.toString(),
          source: 'user-provided',
          observedAt: new Date().toISOString(),
        },
        ...(v.product.marketplace==='MELI' ? {affiliateAttestation:{
          method:'USER_CONFIRMED_IN_AFFILIATE_PORTAL' as const,
          url:url.toString(),marketplace:v.product.marketplace,externalId:v.product.externalId,
          channel:'PINTEREST' as const,confirmedAt:new Date().toISOString(),
        }} : {}),
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
      if(!identity.user) throw new Error('UNAUTHENTICATED');
      const alternatives = campaign.marketplace==='SHOPEE'
        ? await searchShopeeBroker({
            user:identity.user,
            organizationId:campaign.organizationId,
            query:v.keyword,
            limit:8,
          })
        : await searchMercadoLivreBroker({
            user:identity.user,
            organizationId:campaign.organizationId,
            query:v.keyword,
            limit:8,
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
      {
        product: { ...product, organizationId: campaign.organizationId },
        creativePack: undefined,
        creativeAsset: undefined,
      },
      'product swap',
    );
    const next={ ...versioned, marketplace: product.marketplace };
    update(next);
    recordDecision('SWAPPED',next,'product swap');
    setSwapOptions([]);
    setAffiliateDraft('');
  }

  function applyNestAiCopy(draft:PinCopyDraft){
    if(!editable)return;
    const nextVersion=campaign.currentVersion.version+1;
    // Respect existing affiliate disclosure and product truth. AI cannot
    // overwrite commission URL, rights, pricing or actual publication status.
    const narrative={...v.narrative,pinterestTitle:draft.title,
      headline:draft.title.slice(0,90),description:draft.description};
    const next=nextCampaignVersion(campaign,{
      narrative,
      ...(v.creativePack?{creativePack:versionPinterestCreativePack(v.creativePack,nextVersion)}:{}),
    },'NestAI copy suggestion explicitly reviewed and applied');
    update(next);
    recordDecision('EDITED',next,'NestAI copy suggestion reviewed');
    setSaved(true);
    setApprovalAttempted(false);
    window.requestAnimationFrame(()=>document.getElementById('review-creative')?.scrollIntoView({behavior:'smooth',block:'start'}));
  }

  function approve() {
    if (approvingRef.current)return;
    // A failed validation must NEVER change the status to BLOCKED, remove the
    // campaign from the active queue or require the user to guess what went wrong.
    if(missingSteps.length>0 || approvalGuard.outcome==='BLOCK'){
      setApprovalAttempted(true);
      window.requestAnimationFrame(()=>document.getElementById('review-blockers')?.scrollIntoView({behavior:'smooth',block:'center'}));
      return;
    }
    approvingRef.current=true;
    setApprovalAttempted(false);
    const next:Campaign={...campaign,status:'PUBLICATION_READY'};
    update(next);
    if(db && identity.organizationId && identity.user?.uid){
      void appendApprovalEvent(db,{
        organizationId:identity.organizationId,campaign:next,actorId:identity.user.uid,decision:'APPROVED',
      }).catch(()=>undefined);
    }
    navigate('/publish/'+campaign.id);
    approvingRef.current=false;
  }

  return (
    <div className="review-page">
      <CampaignJourney campaign={activeCampaign} />
      <div id="review-creative" className="review-creative-stage">
        <div className="review-stage-heading">
          <p className="eyebrow">{locale==='pt-BR'?'ETAPAS 3 E 4 · CRIATIVO':locale==='es'?'PASOS 3 Y 4 · CREATIVO':'STEPS 3 AND 4 · CREATIVE'}</p>
          <h2>{locale==='pt-BR'?'Primeiro escolha os textos. Depois gere a imagem com ChatGPT.':locale==='es'?'Elige textos, luego genera la imagen en ChatGPT.':'Choose copy first; then generate the image in ChatGPT.'}</h2>
          <p>{locale==='pt-BR'?'O NestAffiliate prepara títulos, descrições e um prompt em inglês. Clique em “Copiar e abrir ChatGPT”, anexe uma foto autorizada do produto, gere a imagem e volte aqui para importar e revisar. A prévia com apenas texto ainda NÃO é a imagem final.':locale==='es'?'El Pin textual es solo una vista previa. Genera la imagen en ChatGPT, impórtala y revísala antes de aprobar.':'The text-only preview is not the final Pin image. Generate with ChatGPT, import it and review before approval.'}</p>
        </div>
        <PinterestCreativePackPanel campaign={activeCampaign} editable={editable} onUpdate={update} />
        <NestAiDraftReview campaign={activeCampaign} editable={editable} onApply={applyNestAiCopy} />
      </div>
      {FEATURE_FLAGS.MULTICHANNEL_CREATIVE_KIT_ENABLED && <ReelKitPanel campaign={activeCampaign} />}
      {editError && <div className="notice edit-feedback" role="alert">{editError}</div>}
      {pendingEdit?.ok && <section className="edit-preview" aria-label="Prévia da alteração">
        <div><p className="eyebrow">{locale==='pt-BR'?'PRÉVIA · NÃO SALVO':locale==='es'?'VISTA PREVIA · NO GUARDADO':'PREVIEW · NOT SAVED'}</p>
          <h2>{locale==='pt-BR'?'Veja antes de aplicar':locale==='es'?'Revisa antes de aplicar':'Review before applying'}</h2>
          <ul>{pendingEdit.summary.map(item=><li key={item}>{item}</li>)}</ul></div>
        <div className="edit-preview-actions"><button className="button secondary" onClick={()=>setPendingEdit(null)}>{locale==='pt-BR'?'Cancelar':locale==='es'?'Cancelar':'Cancel'}</button>
        <button className="button primary" onClick={confirmEdit}>{locale==='pt-BR'?'Aplicar alteração':locale==='es'?'Aplicar cambio':'Apply change'}</button></div>
      </section>}
      <div className="review-grid">
        <PinPreview campaign={pendingEdit?.ok?{...activeCampaign,currentVersion:{...v,...pendingEdit.changes}}:activeCampaign} />
        <section className="decision-panel">
          <div className="review-header">
            <div><p className="eyebrow">{t('review')}</p><h1>{v.keyword}</h1></div>
            <div className="score-badge"><strong>{campaign.score.score}</strong><span>NestScore<br/>{t('confidence')} {t(campaign.score.confidence as 'high'|'medium'|'low')}</span></div>
          </div>
          <div id="review-product"><Disclosure title={t('product')} defaultOpen>
            <h3>{v.product.title.value}</h3>
            <ProductSourceActions product={v.product} />
            <p className="muted">{campaign.marketplace} · {v.product.sellerName?.value ?? t('sellerUnknown')}</p>
            <small>{t('source')}: {v.product.title.source} · {new Date(v.product.title.observedAt).toLocaleString(locale)}</small>
            <div className="affiliate-editor">
              <label>{campaign.marketplace === 'MELI' ? t('affiliateRequired') : t('affiliateOfficial')}</label>
              <div className="affiliate-guided-help">
                <strong>{locale==='pt-BR'?'Etapa 2 · Seu link de comissão não vem automaticamente do Radar':locale==='es'?'Paso 2 · Tu enlace de afiliado no llega automáticamente':'Step 2 · The Radar does not automatically provide your commission link'}</strong>
                {campaign.marketplace==='MELI' ? <ol>
                  <li>{locale==='pt-BR'?'Abra o anúncio original acima e confira se o produto realmente está disponível.':locale==='es'?'Abre el anuncio del producto y verifica la oferta.':'Open the exact listing above and confirm the product.'}</li>
                  <li>{locale==='pt-BR'?'Entre na Central de Afiliados do Mercado Livre com sua conta aprovada. No computador, use Gerador de Links e cole o anúncio; no celular, use a Barra de Afiliados ativada e Compartilhar.':locale==='es'?'Entra en el Portal de Afiliados para generar el enlace real, no el enlace común.':'In your Mercado Livre affiliate portal, generate the real referral link for this listing; on mobile use the authorized affiliate share bar.'}</li>
                  <li>{locale==='pt-BR'?'Confirme se o Pinterest está autorizado como canal, copie o link gerado e cole no campo abaixo. Marque a conferência e salve.':locale==='es'?'Comprueba Pinterest como canal, pega el enlace y confirma.':'Verify Pinterest as your channel, paste the generated affiliate URL below, check and save.'}</li>
                </ol> : <p>{locale==='pt-BR'?'Na Shopee, o produto encontrado não significa que seu link de comissão está pronto. Se usar um link, gere-o na sua conta do programa Shopee Afiliados para o anúncio exato e cole aqui. Na publicação pelo Pinterest, confirme também a marcação oficial do produto e sua elegibilidade; o NestAffiliate não comprova comissão automaticamente.':locale==='es'?'Verifica las reglas de afiliados y la etiqueta oficial de Pinterest.':'Follow Shopee affiliate eligibility and official Pinterest product-tagging rules.'}</p>}
                {campaign.marketplace==='MELI'&&<a className="button secondary" href="https://www.mercadolivre.com.br/l/afiliados-portal-do-afiliado" target="_blank" rel="noopener noreferrer">{locale==='pt-BR'?'Abrir instruções oficiais do Mercado Livre ↗':locale==='es'?'Instrucciones oficiales ↗':'Open official affiliate guide ↗'}</a>}
                <p className="muted">{locale==='pt-BR'?'A URL comum do anúncio ou um código de tracking interno não provam comissão. Só sua conta de afiliado pode gerar e confirmar a atribuição.':locale==='es'?'El enlace común y el tracking interno no garantizan comisión.':'A normal product URL and internal tracking code do not prove affiliate commission.'}</p>
              </div>
              <div className="inline-editor">
                <input
                  value={affiliateDraft}
                  onChange={(e) => { setAffiliateDraft(e.target.value);setAffiliateChecked(false); setSaved(false); }}
                  placeholder="https://..."
                  inputMode="url"
                  aria-label="Link afiliado"
                />
                <button className="button secondary" disabled={!editable} onClick={saveAffiliateLink}>{locale==='pt-BR'?'Salvar conferência':locale==='es'?'Guardar comprobación':'Save confirmation'}</button>
              </div>
              {campaign.marketplace==='MELI' && <div className="affiliate-proof-check">
                <label><input type="checkbox" checked={affiliateChecked} disabled={!editable} onChange={e=>setAffiliateChecked(e.target.checked)}/>
                  <span>{locale==='pt-BR'?'Conferi este anúncio e gerei/validei este link na minha Central de Afiliados para divulgação no Pinterest.':locale==='es'?'Comprobé este anuncio, enlace y canal en mi cuenta de afiliados.':'I checked this listing, link and Pinterest channel in my affiliate account.'}</span>
                </label>
                <p role="status">{inspectAffiliateAttestation(v.product)==='SELF_CONFIRMED' && affiliateDraft.trim()===v.product.affiliateUrl?.value
                  ? (locale==='pt-BR'?'Conferência manual registrada; comissão não é garantida.':locale==='es'?'Confirmación manual registrada; comisión no garantizada.':'User confirmation saved; commission is not guaranteed.')
                  : (locale==='pt-BR'?'Comissão ainda não verificada. Um endereço HTTPS não comprova atribuição.':locale==='es'?'Comisión todavía no verificada. HTTPS no prueba atribución.':'Commission not verified. HTTPS does not prove attribution.')}</p>
              </div>}
              {affiliateError && <p className="field-error">{affiliateError}</p>}
              {!v.product.affiliateUrl && campaign.marketplace === 'MELI' && (
                <p className="field-hint">{t('affiliateMissing')}</p>
              )}
            </div>
          </Disclosure></div>
          <Disclosure title={t('why')} defaultOpen>
            <ul>{(campaign.rankingContext?.evidence?.length ? campaign.rankingContext.evidence : campaign.score.reasons).map((reason) => <li key={reason}>{reason}</li>)}</ul>
            {campaign.rankingContext?.trackingCode && <div className="tracking-row"><code>{campaign.rankingContext.trackingCode}</code><button className="text-button" onClick={()=>void navigator.clipboard.writeText(campaign.rankingContext!.trackingCode!)}>{t('copyTracking')}</button></div>}
          </Disclosure>
          <div id="review-copy"><Disclosure title={t('content')}>
            <label>{t('title')}</label><p>{v.narrative.pinterestTitle}</p>
            <label>{t('description')}</label><p>{v.narrative.description}</p>
            <label>Disclosure</label><p>{v.narrative.disclosure}</p>
          </Disclosure></div>
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
          <section className="review-approval-gate" id="review-blockers" aria-label={locale==='pt-BR'?'Conferência antes de aprovar':'Approval readiness'}>
            <p className="eyebrow">{locale==='pt-BR'?'ETAPA 5 · CONFERÊNCIA FINAL':locale==='es'?'PASO 5 · VERIFICACIÓN FINAL':'STEP 5 · FINAL REVIEW'}</p>
            <h3 id="review-approval-summary">{missingSteps.length
              ? (locale==='pt-BR'?'Ainda faltam algumas coisas antes de aprovar':locale==='es'?'Faltan pasos antes de aprobar':'A few steps remain before approval')
              : (locale==='pt-BR'?'Tudo conferido. Pode avançar para publicar.':locale==='es'?'Listo para continuar':'Ready to proceed')}</h3>
            {missingSteps.length>0 && <ol className="review-blocker-list">{missingSteps.map(item=><li key={item.key}>
               <span>{item.message}</span><a href={item.target}>{locale==='pt-BR'?'Resolver esta etapa →':locale==='es'?'Resolver paso →':'Fix this step →'}</a>
            </li>)}</ol>}
            <p className="review-approval-explain">{locale==='pt-BR'?'Aprovar significa: a imagem e os dados foram revisados. O próximo destino é o pacote de publicação, não uma postagem automática.':locale==='es'?'Aprobar abre el paquete de publicación. No publica automáticamente.':'Approval opens the posting package; it does not automatically publish.'}</p>
            {approvalAttempted && missingSteps.length>0 && <p className="notice danger approval-blocker-alert" role="alert" tabIndex={-1}>{locale==='pt-BR'?'A aprovação ainda não foi realizada. Selecione “Resolver esta etapa” acima para continuar; sua campanha continua salva e editável.':locale==='es'?'No se aprobó. Resuelve los pasos pendientes; la campaña sigue editable.':'Approval did not happen. Resolve the steps above; the campaign is saved and remains editable.'}</p>}
          </section>
          <div className="primary-actions" id="review-final">
            <button className="button primary" disabled={!editable} aria-describedby="review-approval-summary" onClick={approve}>
              {missingSteps.length
                ? (locale==='pt-BR'?`Ver ${missingSteps.length} pendência(s) para aprovar →`:locale==='es'?`Resolver ${missingSteps.length} paso(s) →`:`Resolve ${missingSteps.length} requirement(s) →`)
                : (locale==='pt-BR'?'Aprovar e ir para publicação →':locale==='es'?'Aprobar y continuar →':'Approve and continue →')}
            </button>
            <button className="button secondary" disabled={!editable} onClick={() => document.getElementById('ai-edit')?.focus()}>{t('edit')}</button>
          </div>
          {!editable&&<p className="muted" role="status">{locale==='pt-BR'?'Você está em modo leitura. É necessária permissão de edição para aprovar.':locale==='es'?'Sin permiso para aprobar':'Read-only mode: editing permission required.'}</p>}
          <div className="minor-actions">
            <button disabled={!editable} onClick={() => void loadSwaps()}>{swapLoading ? t('searching') : t('swap')}</button>
            <button disabled={!editable} onClick={() => previewEdit('Novo ângulo')}>{t('redo')}</button>
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
        <input id="ai-edit" disabled={!editable} value={command} onChange={(e) => { setCommand(e.target.value);setEditError('');setPendingEdit(null); }} onKeyDown={(e) => e.key === 'Enter' && previewEdit(command)} placeholder={editable ? t('askChange') : t('readOnly')} />
        <button disabled={!editable} onClick={() => previewEdit(command)}>{locale==='pt-BR'?'Prévia':locale==='es'?'Vista previa':'Preview'}</button>
      </div>
    </div>
  );
}

function PinPreview({ campaign }: { campaign: Campaign }) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let disposed=false;
    let objectUrl:string|undefined;
    async function draw(){
      if(!canvasRef.current) return;
      let version=campaign.currentVersion;
      const asset=version.creativeAsset;
      if(asset && !asset.downloadUrl && db){
        const resolved=await resolveCreativeAssetUrl(db,campaign.organizationId,asset).catch(()=>null);
        if(disposed){
          if(resolved?.revoke) URL.revokeObjectURL(resolved.url);
          return;
        }
        if(resolved){
          objectUrl=resolved.revoke ? resolved.url : undefined;
          version={...version,creativeAsset:{...asset,downloadUrl:resolved.url}};
        }
      }
      if(!disposed && canvasRef.current) await renderPin(canvasRef.current,version);
    }
    void draw();
    return ()=>{
      disposed=true;
      if(objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [campaign.currentVersion,campaign.organizationId]);
  return (
    <section className="preview-panel">
      <div className="preview-toolbar"><span>{t('pinPreview')}</span><span>1000 × 1500 · 2:3</span></div>
      {!campaign.currentVersion.creativeAsset && <p className="pin-preview-provisional">PRÉVIA DE LAYOUT · Ainda falta a imagem real gerada e revisada. O texto demonstrativo não é o Pin final.</p>}
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
  const { t, locale } = useI18n();
  const { id } = useParams();
  const identity = useAuth();
  const campaign = campaigns.find((c) => c.id === id);
  const [step, setStep] = useState(0);
  const [publishedUrl,setPublishedUrl]=useState('');
  const [publishedUrlError,setPublishedUrlError]=useState('');
  const [tagConfirmed,setTagConfirmed]=useState(false);
  const [publishing,setPublishing]=useState(false);
  const [frequency,setFrequency]=useState<PublicationFrequencyState>({publications24h:0});
  const [freshState,setFreshState]=useState<'idle'|'loading'|'pass'|'review'|'block'|'manual'|'error'>('idle');
  const [freshResult,setFreshResult]=useState<FreshValidationResult|null>(null);
  const [manualFreshConfirmed,setManualFreshConfirmed]=useState(false);
  const [scheduledFor,setScheduledFor]=useState('');
  const [scheduleMessage,setScheduleMessage]=useState('');
  const [online,setOnline]=useState(()=>typeof navigator==='undefined' ? true : navigator.onLine);
  const [referenceValidation,setReferenceValidation]=useState<'idle'|'checking'|'approved'|'blocked'>('idle');


  const progressCampaignId=campaign?.id;
  const progressOrganizationId=campaign?.organizationId;
  const progressVersion=campaign?.currentVersion.version;
  useEffect(()=>{
    if(!progressCampaignId || !progressOrganizationId || !progressVersion || !FEATURE_FLAGS.REVENUE_RADAR_3_ENABLED) return;
    const key=`nestaffiliate:publish:v3:${progressOrganizationId}:${progressCampaignId}:${progressVersion}`;
    const stored=Number(localStorage.getItem(key));
    if(Number.isInteger(stored) && stored>=0 && stored<12)setStep(stored);
  },[progressCampaignId,progressOrganizationId,progressVersion]);

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
    if(!campaign?.rankingContext?.v4ResearchDraft){
      setReferenceValidation('approved');return;
    }
    const asset=campaign.currentVersion.creativeAsset;
    if(!db || !asset?.referenceAssetId || !asset.referenceSha256 ||
      asset.referenceListingId!==campaign.currentVersion.product.externalId ||
      !asset.productFidelityConfirmed || !asset.reviewedAt){
      setReferenceValidation('blocked');return;
    }
    let active=true;
    setReferenceValidation('checking');
    void validateStoredProductReference({
      db,organizationId:campaign.organizationId,product:campaign.currentVersion.product,
      assetId:asset.referenceAssetId,expectedSha256:asset.referenceSha256,
    }).then(ok=>{if(active)setReferenceValidation(ok?'approved':'blocked');})
      .catch(()=>{if(active)setReferenceValidation('blocked');});
    return ()=>{active=false;};
  },[campaign?.rankingContext?.v4ResearchDraft,campaign?.currentVersion,campaign?.organizationId]);

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
    if(campaign.marketplace!=='MELI' || campaign.currentVersion.product.listingVerified===false){
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
  const progressKey=`nestaffiliate:publish:v3:${activeCampaign.organizationId}:${activeCampaign.id}:${v.version}`;
  const destination = v.product.affiliateUrl?.value ?? v.product.url.value;
  const shopeeSearchTerm=activeCampaign.marketplace==='SHOPEE' ? buildShopeePinterestSearchTerm(v.product) : '';
  const shopeeReference=activeCampaign.marketplace==='SHOPEE' ? parseShopeeProductReference(v.product.url.value) : {};
  const hasFrequencyPolicy=preferences.maxPublications24h!==null || preferences.minGapMinutes!==null;
  const guard = runPublishingGuard({
    product: v.product, disclosure: v.narrative.disclosure, destinationUrl: destination,
    headline: v.narrative.headline, description: v.narrative.description,
    creativeAsset:v.creativeAsset,
    requireAffiliateAttestation:Boolean(activeCampaign.rankingContext?.v4ResearchDraft) || activeCampaign.organizationId!=='demo-org',
    duplicateSimilarity:campaignDuplicateSimilarity(activeCampaign,campaigns),
    frequencyPolicy:hasFrequencyPolicy ? {
      maxPublications24h:preferences.maxPublications24h ?? undefined,
      publications24h:frequency.publications24h,
      minGapMinutes:preferences.minGapMinutes ?? undefined,
      minutesSinceLastPublication:frequency.minutesSinceLastPublication,
    } : undefined,
  });
  const selectedConcept=v.creativePack?.imageConcepts.find((item)=>item.id===v.creativePack?.recommendedConceptId)
    ?? v.creativePack?.imageConcepts[0];
  const pkg: PublicationPackage = {
    campaignId: activeCampaign.id, version: v.version, filename: campaignFilename(v), width: 1000, height: 1500,
    title: v.narrative.pinterestTitle, description: v.narrative.description, disclosure: v.narrative.disclosure,
    destinationUrl: destination, boardName: v.boardName,
    topics: v.creativePack?.copy.keywords.slice(0,10) ?? [v.keyword, 'casa organizada', 'ideias para casa'],
    altText: v.narrative.altText,
    trackingCode: activeCampaign.rankingContext?.trackingCode,
    compliance: guard.outcome,
    keywords:v.creativePack?.copy.keywords,
    creativePackId:v.creativePack?.id,
    creativeAssetId:v.creativeAsset?.id,
    conceptId:v.creativeAsset?.conceptId ?? selectedConcept?.id,
    promptPackageId:v.creativeAsset?.promptPackageId ?? selectedConcept?.imagePrompt.id,
    sceneType:selectedConcept?.sceneProfile.sceneType,
    environment:selectedConcept?.sceneProfile.environment,
  };
  const apiMode=preferences.publishingMode==='api_when_available' && canAttemptPinterestPublish();
  const manualFreshAllowed=!apiMode && ['manual','error'].includes(freshState) && manualFreshConfirmed;
  const freshReady=freshState==='pass' || manualFreshAllowed;
  const freshMaterialBlock=['review','block'].includes(freshState);
  const publisherBlocked=
    guard.outcome==='BLOCK' ||
    referenceValidation!=='approved' ||
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

  // Progress holds no sensitive data; it is scoped by organization and approved version.
  // A restored checklist never implies an actual marketplace publication.
  function nextStep(){
    if(publisherBlocked)return;
    persistPackage();
    const following=Math.min(step+1,steps.length-1);
    setStep(following);
    if(FEATURE_FLAGS.REVENUE_RADAR_3_ENABLED)localStorage.setItem(progressKey,String(following));
  }
  async function copy(text: string) { await navigator.clipboard.writeText(text); }

  function persistPackage() {
    if (db && identity.organizationId && (!activeCampaign.rankingContext?.v4ResearchDraft || !publisherBlocked) && activeCampaign.status === 'PUBLICATION_READY') {
      void savePublicationPackage(db, identity.organizationId, pkg).catch(() => undefined);
    }
  }

  function schedulePublication(){
    if((activeCampaign.rankingContext?.v4ResearchDraft && (publisherBlocked || !online)) || activeCampaign.status!=='PUBLICATION_READY')return;
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

  function downloadCalendarReminder(){
    try{
      const parsed=validateScheduledFor(scheduledFor);
      if(!parsed.valid)throw new Error('SCHEDULE_INVALID');
      const ics=publicationCalendarIcs({campaignId:activeCampaign.id,version:v.version,scheduledFor:parsed.iso,productTitle:v.product.title.value,boardName:v.boardName});
      const url=URL.createObjectURL(new Blob([ics],{type:'text/calendar;charset=utf-8'}));
      const link=document.createElement('a');link.href=url;link.download=`nestaffiliate-${activeCampaign.id}-v${v.version}.ics`;
      document.body.appendChild(link);link.click();link.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch{setScheduleMessage(t('scheduleInvalid'));}
  }

  async function downloadPackage() {
    if(activeCampaign.rankingContext?.v4ResearchDraft && publisherBlocked)return;
    try{
      persistPackage();
      const canvas=document.createElement('canvas');
      let version=v;
      let objectUrl:string|undefined;
      try{
        if(v.creativeAsset && !v.creativeAsset.downloadUrl && db){
          const resolved=await resolveCreativeAssetUrl(db,activeCampaign.organizationId,v.creativeAsset).catch(()=>null);
          if(resolved){
            objectUrl=resolved.revoke?resolved.url:undefined;
            version={...v,creativeAsset:{...v.creativeAsset,downloadUrl:resolved.url}};
          }
        }
        const image=await renderPin(canvas,version);
        const binary=atob(image.split(',')[1]??'');
        const png=Uint8Array.from(binary,(char)=>char.charCodeAt(0));
        const zip=generatePublishingZip(pkg,png);
        const url=URL.createObjectURL(new Blob([zip.buffer as ArrayBuffer],{type:'application/zip'}));
        const link=document.createElement('a');
        link.href=url;link.download=pkg.filename.replace(/\.png$/i,'')+'-pacote.zip';
        document.body.appendChild(link);link.click();link.remove();
        window.setTimeout(()=>URL.revokeObjectURL(url),1000);
      }finally{if(objectUrl)URL.revokeObjectURL(objectUrl);}
    }catch{setPublishedUrlError(locale==='pt-BR'?'Não foi possível exportar o pacote. Confira a imagem criativa e tente novamente.':locale==='es'?'No se pudo exportar el paquete.':'Unable to export package; check the creative image.');}
  }

  async function downloadImage() {
    if(activeCampaign.rankingContext?.v4ResearchDraft && publisherBlocked)return;
    persistPackage();
    const canvas = document.createElement('canvas');
    let version=v;
    let objectUrl:string|undefined;
    if(v.creativeAsset && !v.creativeAsset.downloadUrl && db){
      const resolved=await resolveCreativeAssetUrl(db,activeCampaign.organizationId,v.creativeAsset).catch(()=>null);
      if(resolved){
        objectUrl=resolved.revoke ? resolved.url : undefined;
        version={...v,creativeAsset:{...v.creativeAsset,downloadUrl:resolved.url}};
      }
    }
    const dataUrl = await renderPin(canvas, version);
    if(objectUrl) URL.revokeObjectURL(objectUrl);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = pkg.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function markPublished() {
    if(publisherBlocked || !online || publishing || activeCampaign.status!=='PUBLICATION_READY') return;
    if(FEATURE_FLAGS.REVENUE_RADAR_3_ENABLED){
      const proofValid=isPublicPinterestPinUrl(publishedUrl);
      if(!proofValid || (activeCampaign.marketplace==='SHOPEE' && !tagConfirmed)){
        setPublishedUrlError(t('r3InvalidPinProof'));return;
      }
      if(!db || !identity.organizationId){
        setPublishedUrlError(t('r3ImportFailed'));return;
      }
      setPublishing(true);setPublishedUrlError('');
      try{
        // Persist external publication proof before mutating the local campaign state.
        await markPublication(db,{
          organizationId:identity.organizationId,
          campaign:activeCampaign,
          source:'GUIDED',
          externalUrl:publishedUrl.trim(),
        });
        update({...activeCampaign,status:'PUBLISHED'});
        completeSchedule(activeCampaign.id,v.version);
        localStorage.removeItem(progressKey);
      }catch{
        setPublishedUrlError(t('r3ImportFailed'));
      }finally{setPublishing(false);}
      return;
    }
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
      <CampaignJourney campaign={activeCampaign} mode="publish" />
      {activeCampaign.status==='PUBLISHED' && <section className="publish-complete-banner" role="status">
        <h2>{locale==='pt-BR'?'Publicação registrada!':locale==='es'?'¡Publicación registrada!':'Publication recorded!'}</h2>
        <p>{locale==='pt-BR'?'O Pin foi marcado como publicado após o registro da URL pública. Acompanhe cliques e comissões reais em Resultados — a comissão não é garantida apenas pela publicação.':locale==='es'?'El Pin se registró con su URL pública. Consulta resultados reales.':'Your Pin was recorded with its public URL. Track actual performance; commissions are not guaranteed.'}</p>
        <div><NavLink className="button primary" to="/results">{locale==='pt-BR'?'Ver Resultados →':locale==='es'?'Ver Resultados →':'View Results →'}</NavLink><NavLink className="button secondary" to="/radar">{locale==='pt-BR'?'Encontrar próximo produto':locale==='es'?'Encontrar siguiente producto':'Find next product'}</NavLink></div>
      </section>}
      <ProductSourceActions product={v.product} compact />
      <div className="validation-row">
        {guard.checks.map((check) => <span key={check.key} className={`check ${check.outcome.toLowerCase()}`}>{check.outcome === 'PASS' ? '✓' : check.outcome === 'WARN' ? '!' : '×'} {check.key}</span>)}
      </div>
      {guard.outcome === 'BLOCK' && <div className="notice danger">{t('publishBlocked')}</div>}
      {activeCampaign.rankingContext?.v4ResearchDraft && referenceValidation!=='approved' &&
        <div className="notice danger" role="alert">{referenceValidation==='checking'
          ? 'Conferindo a referência real e sua autorização antes de publicar…'
          : 'Publicação suspensa: a foto de referência está ausente, revogada ou não corresponde à variante. Volte à revisão e valide novamente.'}
          <NavLink className="button secondary" to={`/review/${activeCampaign.id}`}>Voltar à revisão</NavLink>
        </div>}
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
        <FinalPinPublicationGuide
          key={activeCampaign.id+':'+v.version}
          pack={pkg}
          blocked={Boolean(activeCampaign.rankingContext?.v4ResearchDraft && publisherBlocked)}
          onDownloadZip={()=>void downloadPackage()}
          onDownloadPng={()=>void downloadImage()}
          onCopy={copy}
        />
      </div>
      {activeCampaign.marketplace==='SHOPEE' && <section className="shopee-tagging-pack">
        <div>
          <p className="eyebrow">SHOPEE + PINTEREST</p>
          <h2>{t('shopeeTaggingPack')}</h2>
          <p>{t('shopeeGuideBody')}</p>
        </div>
        <div className="shopee-tagging-fields">
          <Field label={t('shopeeSearchAssisted')} value={shopeeSearchTerm} onCopy={() => copy(shopeeSearchTerm)} />
          {shopeeReference.itemId ? <Field label={t('shopeeProductId')} value={shopeeReference.itemId} onCopy={() => copy(shopeeReference.itemId!)} /> : null}
          {activeCampaign.rankingContext?.trackingCode ? <Field label={t('trackingCode')} value={activeCampaign.rankingContext.trackingCode} onCopy={() => copy(activeCampaign.rankingContext!.trackingCode!)} /> : null}
        </div>
      </section>}
      {FEATURE_FLAGS.FACEBOOK_SHOPEE_AFFILIATE_ENABLED && activeCampaign.marketplace==='SHOPEE' &&
        <FacebookShopeeGuide campaign={activeCampaign} actorId={identity.user?.uid??null} role={identity.role}/>}
      <section className="schedule-panel">
        <div>
          <p className="eyebrow">{t('schedulePublication')}</p>
          <h2>{t('scheduleFor')}</h2>
          <p>{t('scheduleGuided')}</p>
          <small>{t('noUniversalTime')}</small>
        </div>
        <div className="schedule-controls">
          <input type="datetime-local" value={scheduledFor} onChange={(e)=>{setScheduledFor(e.target.value);setScheduleMessage('');}} />
          <button className="button secondary" disabled={Boolean(activeCampaign.rankingContext?.v4ResearchDraft && (publisherBlocked || !online))} onClick={schedulePublication}>{t('schedule')}</button>
          {scheduleMessage===t('scheduled')&&<><button type="button" className="button secondary" onClick={downloadCalendarReminder}>{locale==='pt-BR'?'Adicionar lembretes ao calendário':locale==='es'?'Añadir recordatorios al calendario':'Add calendar reminders'}</button>
          <small>{locale==='pt-BR'?'Baixe e importe o arquivo no aplicativo de calendário. O NestAffiliate não publica automaticamente.':locale==='es'?'Importa el archivo en tu calendario. No publica automáticamente.':'Import the calendar file to receive reminders. This does not post for you.'}</small></>}
          {scheduleMessage && <span className={scheduleMessage===t('scheduled')?'success-text':'field-error'}>{scheduleMessage}</span>}
        </div>
      </section>
      {FEATURE_FLAGS.REVENUE_RADAR_3_ENABLED && <section className="surface publication-proof">
        <p className="eyebrow">{t('r3PublishedProof')}</p>
        <p className="muted">{t('r3PublishedProofHelp')}</p>
        <input inputMode="url" type="url" aria-label={t('r3PublishedProof')} placeholder="https://www.pinterest.com/pin/123456789/" value={publishedUrl} onChange={(e)=>{setPublishedUrl(e.target.value);setPublishedUrlError('');}}/>
        {activeCampaign.marketplace==='SHOPEE' && <label className="manual-confirm">
          <input type="checkbox" checked={tagConfirmed} onChange={(e)=>setTagConfirmed(e.target.checked)}/>
          {t('r3ShopeeTagProof')}
        </label>}
        <p className="muted">{t('r3ChannelEligibility')}</p>
        {publishedUrlError && <p className="field-error" role="alert">{publishedUrlError}</p>}
      </section>}
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
            <button className="button primary" disabled={publisherBlocked} onClick={nextStep}>{t('next')}</button>
          ) : (
            <button className="button primary" disabled={publisherBlocked || !online || publishing || (FEATURE_FLAGS.REVENUE_RADAR_3_ENABLED && (!publishedUrl.trim() || (activeCampaign.marketplace==='SHOPEE' && !tagConfirmed)))} onClick={() => void markPublished()}>{publishing?t('r3PublishingSync'):t('markPublished')}</button>
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
  const visible = campaigns.filter((c) => c.status === tab || (tab === 'READY' && c.status === 'BLOCKED'));
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
  campaigns, organizationId, rows, onSave,onImport,
}:{
  campaigns:Campaign[];
  organizationId:string;
  rows:PerformanceDaily[];
  onSave:(row:PerformanceDaily)=>void;
  onImport:(rows:PerformanceDaily[])=>Promise<void>;
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
      {FEATURE_FLAGS.REVENUE_IMPORT_V2_ENABLED && <RevenueTruthPanel organizationId={organizationId} campaigns={campaigns} performance={rows} />}
      <PerformancePanel organizationId={organizationId} campaigns={campaigns} rows={rows} approvalEvents={approvalEvents} onSave={onSave} onImport={onImport} />
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

function Boards({campaigns}:{campaigns:Campaign[]}) {return <WorkspaceLibrary mode="boards" campaigns={campaigns} boards={initialBoards}/>;}
function Library({campaigns}:{campaigns:Campaign[]}) {return <WorkspaceLibrary mode="library" campaigns={campaigns} boards={initialBoards}/>;}
function Workspace() { const { t }=useI18n(); const { organizationId, role }=useAuth(); return <SimpleList eyebrow="WORKSPACE" title={t('workspace')} subtitle={t('workspaceSub')} rows={[[organizationId ?? '—','organizationId',t('tenantActive')],[role ?? 'viewer',t('role'),t('effectivePermission')],['Audit','Append-only','Critical events are append-only']]} />; }
function Help() { const { t }=useI18n(); return <SimpleList eyebrow={t('help').toUpperCase()} title={t('helpTitle')} subtitle={t('helpSub')} rows={[[t('publishPin'),t('stepByStep'),t('noDeadEndPublish')],[t('aiNoCost'),'Prompt Studio',t('noDeadEndAi')],[t('productUnavailable'),t('replacementFlow'),t('noDeadEndProduct')]]} />; }

function SimpleList({ eyebrow,title,subtitle,rows }: { eyebrow:string; title:string; subtitle:string; rows:string[][] }) {
  return <div className="page"><PageTitle eyebrow={eyebrow} title={title} subtitle={subtitle} /><div className="list-surface">{rows.map((r) => <div className="list-row" key={r[0]}><div><h3>{r[0]}</h3><p>{r[2]}</p></div><span>{r[1]}</span></div>)}</div></div>;
}

function Metric({ label,value }: { label:string; value:string }) { return <div className="metric-card"><span>{label}</span><strong>{value}</strong></div>; }
function Empty({ title,body }: { title:string; body:string }) { return <div className="empty"><span className="empty-orb" /><h3>{title}</h3><p>{body}</p></div>; }
function PageTitle({ eyebrow,title,subtitle }: { eyebrow:string; title:string; subtitle:string }) { return <header className="page-title"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{subtitle}</p></header>; }
function ProgressSteps() {
  const { t } = useI18n();
  return <div className="progress-steps radar-processing" role="status" aria-live="polite">
    <span className="processing-orb" aria-hidden="true" />
    <div className="processing-copy">
      <strong>{t('analyzingProducts')}</strong>
      <span>{t('radarProcessingBody')}</span>
      <div className="processing-stages"><em>{t('comparing')}</em><em>{t('validatingFacts')}</em><em>{t('calculating')}</em></div>
    </div>
  </div>;
}

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
        <Route path="/" element={<Today campaigns={store.campaigns} schedules={scheduleStore.schedules} agentReport={dailyAgentReport} organizationId={org} />} />
        <Route path="/radar" element={<Radar addCampaign={store.add} organizationId={org} editable={editable} />} />
        <Route path="/campaigns" element={<Campaigns campaigns={store.campaigns} />} />
        <Route path="/review/:id" element={<Review campaigns={store.campaigns} update={store.update} editable={editable} />} />
        <Route path="/publish/:id" element={<Publish campaigns={store.campaigns} update={store.update} preferences={preferenceStore.preferences} onSchedule={scheduleStore.add} completeSchedule={scheduleStore.complete} />} />
        <Route path="/results" element={<Results campaigns={store.campaigns} organizationId={org} rows={performance.rows} onSave={performance.save} onImport={performance.importMany} />} />
        <Route path="/connections" element={<Connections />} />
        <Route path="/prompt-studio" element={<PromptStudio campaigns={store.campaigns} editable={editable} onUpdate={store.update} />} />
        <Route path="/ai-cost" element={<AiCost />} />
        <Route path="/settings" element={<SettingsPanel preferences={preferenceStore.preferences} editable={editable} onChange={preferenceStore.update} />} />
        <Route path="/boards" element={<Boards campaigns={store.campaigns} />} />
        <Route path="/library" element={<Library campaigns={store.campaigns} />} />
        <Route path="/workspace" element={<Workspace />} />
        <Route path="/help" element={<Help />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
    </I18nProvider>
  );
}
