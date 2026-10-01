import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import type { Campaign, ProductTruth, PublicationPackage } from '@nestaffiliate/core';
import { campaignVersions, canWrite, nextCampaignVersion, restoreCampaignVersion, type Role } from '@nestaffiliate/core';
import { runPublishingGuard } from '@nestaffiliate/compliance';
import { MercadoLivrePublicAdapter } from '@nestaffiliate/integrations';
import { buildOpportunity, shortlist } from '@nestaffiliate/radar';
import type { PerformanceDaily } from '@nestaffiliate/analytics';
import { deriveLearning } from '@nestaffiliate/learning';
import { campaignFilename, CREATIVE_TEMPLATES, renderPin } from '@nestaffiliate/creative-engine';
import { FEATURE_FLAGS, KILL_SWITCHES } from '@nestaffiliate/config';
import { type Locale } from './lib/i18n';
import { I18nProvider, useI18n } from './lib/i18n-context';
import { demoCampaigns, initialBoards } from './lib/demo';
import { useAuth } from './lib/auth';
import { db } from './lib/firebase';
import { listCampaigns, saveCampaign } from './services/campaignRepository';
import { listPerformance, savePerformance } from './services/performanceRepository';
import { appendAudit } from './services/auditRepository';
import { persistCampaignIntelligence } from './services/intelligenceRepository';
import { appendApprovalEvent, markPublication, savePublicationPackage } from './services/lifecycleRepository';
import { saveLearningInsights } from './services/learningRepository';
import { ManualProductImport } from './features/ManualProductImport';
import { PerformancePanel } from './features/PerformancePanel';
import { PromptStudio } from './features/PromptStudio';
import { ConnectionCenter } from './features/ConnectionCenter';
import { ensureNestAffiliateWorkspace } from './services/workspaceBootstrap';
import { defaultPreferences, loadUserPreferences, saveUserPreferences, type UserPreferences } from './services/preferencesRepository';
import { recordRadarSignal } from './services/radarRepository';
import { loadPublicationFrequency, type PublicationFrequencyState } from './services/publicationRepository';
import { SettingsPanel } from './features/SettingsPanel';

const marketplaceAdapter = new MercadoLivrePublicAdapter();
const STORAGE_PREFIX = 'nestaffiliate_campaigns_v1';

function useCampaignStore(organizationId: string | null, actorId: string | null, role: Role | null) {
  const demoEnabled =
    import.meta.env.VITE_DEMO_DATA_ENABLED === 'true' ||
    import.meta.env.VITE_E2E_MOCK_AUTH === 'true';
  const storageKey = `${STORAGE_PREFIX}:${organizationId ?? 'pending'}`;
  const [campaigns, setCampaigns] = useState<Campaign[]>(demoEnabled ? demoCampaigns : []);

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
      void Promise.all([
        saveCampaign(currentDb, organizationId, campaign),
        persistCampaignIntelligence(currentDb, organizationId, campaign),
      ])
        .then(() => appendAudit(currentDb, {
          organizationId,
          actorId,
          action,
          entityType: 'campaign',
          entityId: campaign.id,
          metadata: { status: campaign.status, version: campaign.currentVersion.version },
        }))
        .catch(() => undefined);
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

  return { campaigns, update, add };
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

function Login() {
  const { t } = useI18n();
  const { state, signIn, switchAccount, user } = useAuth();
  if (state === 'ready') return <Navigate to="/" replace />;
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
        {state === 'denied' ? (
          <>
            <div className="notice danger">{t('accessDenied')}</div>
            <button className="button primary" onClick={switchAccount}>{t('tryAnother')}</button>
          </>
        ) : (
          <button className="button primary" onClick={signIn}>{t('continueGoogle')}</button>
        )}
        <a className="button secondary" href={import.meta.env.VITE_HUB_URL || 'https://www.millionsnest.com'}>
          {t('openHub')}
        </a>
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

function Today({ campaigns }: { campaigns: Campaign[] }) {
  const { t } = useI18n();
  const ready = campaigns.filter((c) => c.status === 'READY');
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
      <section className="two-col">
        <div className="surface">
          <p className="eyebrow">{t('whileAway')}</p>
          <div className="timeline">
            <span><b>0</b> {t('productsChanged')}</span>
            <span><b>0</b> {t('complianceBlocks')}</span>
            <span><b>{ready.length}</b> {t('campaignsWaiting')}</span>
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
  const { t } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState('organizador cozinha pequena');
  const [items, setItems] = useState<ProductTruth[]>([]);
  const [state, setState] = useState<'idle'|'loading'|'error'>('idle');

  async function search() {
    setState('loading');
    try {
      const found = await marketplaceAdapter.search({ organizationId, query, limit: 25 });
      setItems(shortlist(found, query, 12).map((opportunity) => opportunity.product));
      setState('idle');
    } catch {
      setState('error');
    }
  }

  function create(product: ProductTruth, keywordOverride?: string) {
    if (!editable) return;
    const campaignKeyword = keywordOverride?.trim() || query;
    const opportunity = buildOpportunity(product, campaignKeyword);
    const score = opportunity.score;
    const id = `campaign-${Date.now()}`;
    const campaign: Campaign = {
      id, organizationId, status: 'READY', marketplace: product.marketplace, score,
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
    navigate(`/review/${id}`);
  }

  return (
    <div className="page">
      <PageTitle eyebrow="RADAR" title={t('opportunities')} subtitle={t('opportunitiesSub')} />
      <div className="search-box">
        <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void search()} placeholder="Ex.: organizador cozinha pequena" />
        <button className="button primary" onClick={() => void search()}>{t('analyzeProducts')}</button>
      </div>
      <div className="chips"><span>{t('home')}</span><span>{t('kitchen')}</span><span>Mercado Livre</span><span>{t('dedupeActive')}</span><span>{t('localSeasonality')}</span></div>
      {state === 'loading' && <ProgressSteps />}
      {state === 'error' && <div className="notice danger">{t('radarError')}</div>}
      {!items.length && state === 'idle' && <Empty title={t('radarEmpty')} body={t('radarEmptyBody')} />}
      {editable ? (
        <ManualProductImport organizationId={organizationId} onImported={(product, keyword) => create(product, keyword)} />
      ) : (
        <div className="notice">{t('readOnlyRadar')}</div>
      )}
      <div className="opportunity-grid">
        {items.map((product) => (
          <article className="opportunity-card" key={product.externalId}>
            <div className="product-image">
              {product.imageUrl ? <img src={product.imageUrl.value} alt="" /> : <span>{t('assetUnavailable')}</span>}
            </div>
            <div>
              <span className="market-chip">Mercado Livre</span>
              <h3>{product.title.value}</h3>
              <p className="price">{product.price ? new Intl.NumberFormat('pt-BR',{style:'currency',currency:product.currency.value}).format(product.price.value) : t('priceUnknown')}</p>
              <p className="muted">{t('truthPreserved')}</p>
              <button className="button secondary" disabled={!editable} onClick={() => create(product)}>{t('createCampaign')}</button>
            </div>
          </article>
        ))}
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

  useEffect(() => {
    setAffiliateDraft(campaign?.currentVersion.product.affiliateUrl?.value ?? '');
    setAffiliateError('');
  }, [campaign?.currentVersion.id, campaign?.currentVersion.product.affiliateUrl?.value]);

  if (!campaign) return <Navigate to="/campaigns" replace />;
  const v = campaign.currentVersion;

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
    update(nextCampaignVersion(campaign, { narrative, template }, raw.trim()));
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
      update(nextCampaignVersion(campaign, { product }, 'affiliate link updated'));
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
    update({ ...versioned, marketplace: product.marketplace });
    setSwapOptions([]);
    setAffiliateDraft('');
  }

  function approve() {
    const destination = v.product.affiliateUrl?.value ?? v.product.url.value;
    const guard = runPublishingGuard({
      product: v.product,
      disclosure: v.narrative.disclosure,
      destinationUrl: destination,
      headline: v.narrative.headline,
      description: v.narrative.description,
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
    if (guard.outcome !== 'BLOCK') navigate(`/publish/${campaign.id}`);
  }

  return (
    <div className="review-page">
      <div className="review-grid">
        <PinPreview campaign={campaign} />
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
            <ul>{campaign.score.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
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
              onChange={(e) => update(nextCampaignVersion(campaign, { boardName: e.target.value }, 'board changed'))}
            >
              {initialBoards.map((board) => <option key={board} value={board}>{board}</option>)}
            </select>
            <label>{t('template')}</label>
            <select
              value={v.template}
              disabled={!editable}
              onChange={(e) => update(nextCampaignVersion(campaign, { template: e.target.value }, 'template changed'))}
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
                  onClick={() => update(restoreCampaignVersion(campaign, version.version))}
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

function Publish({ campaigns, update }: { campaigns: Campaign[]; update: (c: Campaign) => void }) {
  const { t } = useI18n();
  const { id } = useParams();
  const identity = useAuth();
  const campaign = campaigns.find((c) => c.id === id)!;
  const [step, setStep] = useState(0);
  if (!campaign) return <Navigate to="/campaigns" replace />;
  const v = campaign.currentVersion;
  const destination = v.product.affiliateUrl?.value ?? v.product.url.value;
  const guard = runPublishingGuard({
    product: v.product, disclosure: v.narrative.disclosure, destinationUrl: destination,
    headline: v.narrative.headline, description: v.narrative.description,
  });
  const pkg: PublicationPackage = {
    campaignId: campaign.id, version: v.version, filename: campaignFilename(v), width: 1000, height: 1500,
    title: v.narrative.pinterestTitle, description: v.narrative.description, disclosure: v.narrative.disclosure,
    destinationUrl: destination, boardName: v.boardName, topics: [v.keyword, 'casa organizada', 'ideias para casa'],
    altText: v.narrative.altText, compliance: guard.outcome,
  };

  const steps = [
    ['Baixe a imagem', 'Use o arquivo 1000 × 1500 preparado pelo NestAffiliate.'],
    ['Abra o Pinterest', 'Crie um novo Pin na conta Achados do Nest.'],
    ['Envie o arquivo', pkg.filename],
    ['Cole título e descrição', 'Use os campos preparados abaixo.'],
    ['Adicione o link', pkg.destinationUrl],
    ['Salve na pasta', pkg.boardName],
    ['Revise e publique', 'Confira a prévia final no Pinterest antes de publicar.'],
    ['Marque como publicado', 'O NestAffiliate começa a acompanhar o resultado.'],
  ];

  async function copy(text: string) { await navigator.clipboard.writeText(text); }

  function persistPackage() {
    if (db && identity.organizationId && campaign.status === 'PUBLICATION_READY') {
      void savePublicationPackage(db, identity.organizationId, pkg).catch(() => undefined);
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
    const published: Campaign = { ...campaign, status: 'PUBLISHED' };
    update(published);
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
        </section>
      </div>
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
            <button className="button primary" disabled={guard.outcome === 'BLOCK'} onClick={() => { persistPackage(); setStep(step + 1); }}>{t('next')}</button>
          ) : (
            <button className="button primary" onClick={markPublished}>{t('markPublished')}</button>
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
  const insights=useMemo(()=>deriveLearning(campaigns,rows),[campaigns,rows]);

  useEffect(()=>{
    if(!db || !identity.user?.uid || !organizationId) return;
    const currentDb=db;
    void saveLearningInsights(currentDb,organizationId,insights).catch(()=>undefined);
  },[identity.user?.uid,organizationId,insights]);

  return (
    <div className="page">
      <PageTitle eyebrow={t('results').toUpperCase()} title={t('resultsTitle')} subtitle={t('resultsSub')} />
      <PerformancePanel organizationId={organizationId} campaigns={campaigns} rows={rows} onSave={onSave} />
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
  const [locale,setLocale] = useState<Locale>(() => (localStorage.getItem('na_locale') as Locale) || 'pt-BR');
  useEffect(() => localStorage.setItem('na_locale', locale), [locale]);

  const editable = auth.role ? canWrite(auth.role) : false;
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
      <Routes>
        <Route path="/" element={<Today campaigns={store.campaigns} />} />
        <Route path="/radar" element={<Radar addCampaign={store.add} organizationId={org} editable={editable} />} />
        <Route path="/campaigns" element={<Campaigns campaigns={store.campaigns} />} />
        <Route path="/review/:id" element={<Review campaigns={store.campaigns} update={store.update} editable={editable} />} />
        <Route path="/publish/:id" element={<Publish campaigns={store.campaigns} update={store.update} />} />
        <Route path="/results" element={<Results campaigns={store.campaigns} organizationId={org} rows={performance.rows} onSave={performance.save} />} />
        <Route path="/connections" element={<Connections />} />
        <Route path="/prompt-studio" element={<PromptStudio campaigns={store.campaigns} />} />
        <Route path="/ai-cost" element={<AiCost />} />
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
