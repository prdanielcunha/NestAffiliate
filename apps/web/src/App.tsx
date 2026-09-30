import { useEffect, useRef, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import type { Campaign, ProductTruth, PublicationPackage } from '@nestaffiliate/core';
import { nextCampaignVersion } from '@nestaffiliate/core';
import { runPublishingGuard } from '@nestaffiliate/compliance';
import { calculateNestScore } from '@nestaffiliate/scoring';
import { MercadoLivrePublicAdapter } from '@nestaffiliate/integrations';
import { campaignFilename, renderPin } from '@nestaffiliate/creative-engine';
import { FEATURE_FLAGS, KILL_SWITCHES } from '@nestaffiliate/config';
import { createTranslator, type Locale } from './lib/i18n';
import { demoCampaigns, initialBoards, products as demoProducts } from './lib/demo';
import { useAuth } from './lib/auth';
import { db } from './lib/firebase';
import { listCampaigns, saveCampaign } from './services/campaignRepository';

const marketplaceAdapter = new MercadoLivrePublicAdapter();
const STORAGE_PREFIX = 'nestaffiliate_campaigns_v1';

function useCampaignStore(organizationId: string | null) {
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

  const persist = (campaign: Campaign) => {
    if (db && organizationId && !demoEnabled) {
      void saveCampaign(db, organizationId, campaign).catch(() => undefined);
    }
  };

  const update = (campaign: Campaign) => {
    setCampaigns((items) =>
      items.map((item) => (item.id === campaign.id ? campaign : item)),
    );
    persist(campaign);
  };

  const add = (campaign: Campaign) => {
    setCampaigns((items) => [campaign, ...items]);
    persist(campaign);
  };

  return { campaigns, update, add };
}

function Login() {
  const { state, signIn, switchAccount, user } = useAuth();
  if (state === 'ready') return <Navigate to="/" replace />;
  return (
    <main className="login-shell">
      <section className="login-brand">
        <div className="brand-mark large">N</div>
        <p className="eyebrow">AFFILIATE INTELLIGENCE BY MILLIONSNEST</p>
        <h1>Seu operador inteligente de afiliados.</h1>
        <p>O sistema pesquisa, decide, prepara e leva até você apenas o que realmente precisa de aprovação.</p>
        <div className="signal-line"><span /> Intelligence → Creation → Approval → Learning</div>
      </section>
      <section className="login-card">
        <div className="status-orb" />
        <h2>{state === 'loading' ? 'Preparando seu workspace…' : 'Entre para continuar'}</h2>
        <p className="muted">Use sua identidade MillionsNest. Nenhuma senha é armazenada pelo NestAffiliate.</p>
        {state === 'denied' ? (
          <>
            <div className="notice danger">Esta conta ainda não possui um workspace elegível para o NestAffiliate.</div>
            <button className="button primary" onClick={switchAccount}>Usar outra conta</button>
          </>
        ) : (
          <button className="button primary" onClick={signIn}>Continuar com Google</button>
        )}
        <a className="button secondary" href={import.meta.env.VITE_HUB_URL || 'https://www.millionsnest.com'}>
          Abrir MillionsNest
        </a>
        {user?.email && <small className="muted">{user.email}</small>}
      </section>
    </main>
  );
}

function Shell({ children, locale, setLocale }: { children: React.ReactNode; locale: Locale; setLocale: (l: Locale) => void }) {
  const t = createTranslator(locale);
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

  const primary = [
    ['/', t('today')], ['/radar', t('radar')], ['/campaigns', t('campaigns')], ['/results', t('results')],
  ];
  const secondary = [
    ['/library', t('library')], ['/boards', t('boards')], ['/connections', t('connections')],
    ['/ai-cost', t('cost')], ['/workspace', t('workspace')], ['/help', t('help')],
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
  const commands = [
    ['Hoje', '/'], ['Mostrar oportunidades', '/radar'], ['Revisar campanhas', '/campaigns'],
    ['Ver resultados', '/results'], ['Conectar Pinterest', '/connections'], ['Custos de IA', '/ai-cost'],
  ];
  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <div className="command" onMouseDown={(e) => e.stopPropagation()}>
        <input autoFocus placeholder="Buscar ou executar um comando…" />
        {commands.map(([label,to]) => <button key={to} onClick={() => { navigate(to); close(); }}>{label}<span>↗</span></button>)}
      </div>
    </div>
  );
}

function Today({ campaigns }: { campaigns: Campaign[] }) {
  const ready = campaigns.filter((c) => c.status === 'READY');
  return (
    <div className="page">
      <section className="hero">
        <p className="eyebrow">HOJE</p>
        <h1>NestAffiliate trabalhou por você.</h1>
        <p className="hero-sub">Você só entra quando existe uma decisão que vale seu tempo.</p>
        <div className="stat-row">
          <Stat value={ready.length ? '6.284' : '—'} label="produtos observados" />
          <Stat value={ready.length ? '27' : '—'} label="oportunidades analisadas" />
          <Stat value={String(ready.length)} label="campanhas prontas" />
        </div>
        <NavLink to={ready[0] ? `/review/${ready[0].id}` : '/radar'} className="button primary hero-cta">
          {ready.length ? `Revisar ${ready.length} campanhas` : 'Encontrar oportunidades'}
        </NavLink>
      </section>
      <section className="section">
        <div className="section-heading"><h2>Precisa de você</h2><span>{ready.length ? '~2 min' : 'Tudo em dia'}</span></div>
        {ready.length ? (
          <div className="campaign-grid">
            {ready.slice(0,3).map((campaign) => <CampaignCard key={campaign.id} campaign={campaign} />)}
          </div>
        ) : <Empty title="Nada precisa da sua atenção agora." body="Abra o Radar para encontrar oportunidades. O sistema só vai trazer para revisão o que passar pelos filtros." />}
      </section>
      <section className="two-col">
        <div className="surface">
          <p className="eyebrow">ENQUANTO VOCÊ ESTAVA FORA</p>
          <div className="timeline">
            <span><b>0</b> produtos alterados desde o último ciclo</span>
            <span><b>0</b> bloqueios de compliance</span>
            <span><b>{ready.length}</b> campanhas aguardando decisão</span>
          </div>
        </div>
        <div className="surface">
          <p className="eyebrow">CUSTO</p>
          <h3>R$ 0,00</h3>
          <p className="muted">Serviços pagos bloqueados por política global.</p>
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return <div className="stat"><strong>{value}</strong><span>{label}</span></div>;
}

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const v = campaign.currentVersion;
  return (
    <NavLink className="campaign-card" to={`/review/${campaign.id}`}>
      <div className="mini-pin">
        <span>{v.keyword}</span><strong>{v.narrative.headline}</strong><em>Achados do Nest</em>
      </div>
      <div className="card-copy">
        <div className="score-line"><b>{campaign.score.score}</b><span>NestScore · confiança {campaign.score.confidence}</span></div>
        <h3>{v.product.title.value}</h3>
        <p>{campaign.score.reasons[0]}</p>
        <span className="market-chip">{campaign.marketplace === 'MELI' ? 'Mercado Livre' : 'Shopee'}</span>
      </div>
    </NavLink>
  );
}

function Radar({ addCampaign, organizationId }: { addCampaign: (c: Campaign) => void; organizationId: string }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('organizador cozinha pequena');
  const [items, setItems] = useState<ProductTruth[]>([]);
  const [state, setState] = useState<'idle'|'loading'|'error'>('idle');

  async function search() {
    setState('loading');
    try {
      const found = await marketplaceAdapter.search({ organizationId, query, limit: 12 });
      setItems(found);
      setState('idle');
    } catch {
      setState('error');
    }
  }

  function create(product: ProductTruth) {
    const score = calculateNestScore({
      trend: 12, intent: 14, visual: product.imageUrl ? 12 : 8, yield: 7,
      quality: product.sellerName ? 9 : 7, competition: 7, creative: 7, seasonality: 3, dataConfidence: 2,
    });
    const id = `campaign-${Date.now()}`;
    const campaign: Campaign = {
      id, organizationId, status: 'READY', marketplace: product.marketplace, score,
      currentVersion: {
        id: `${id}-v1`, campaignId: id, version: 1, createdAt: new Date().toISOString(), reason: 'radar',
        product,
        narrative: {
          headline: `Uma ideia prática para ${query.toLowerCase()}`,
          subheadline: 'Curadoria simples para uma casa mais funcional.',
          pinterestTitle: `${query}: uma solução prática para o dia a dia`,
          description: 'Uma curadoria editorial para ajudar a organizar melhor a rotina. Antes de publicar, confirme o link afiliado.',
          disclosure: 'Conteúdo com link de afiliado. Posso receber comissão por compras qualificadas, sem custo adicional para você.',
          altText: `Ideia editorial relacionada a ${query}.`,
          cta: 'Ver a ideia',
        },
        boardName: query.includes('cozinha') ? initialBoards[0]! : initialBoards[7]!,
        keyword: query,
        template: 'Editorial Premium',
      },
      history: [],
    };
    addCampaign(campaign);
    navigate(`/review/${id}`);
  }

  return (
    <div className="page">
      <PageTitle eyebrow="RADAR" title="Oportunidades" subtitle="O que vale sua atenção agora." />
      <div className="search-box">
        <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void search()} placeholder="Ex.: organizador cozinha pequena" />
        <button className="button primary" onClick={() => void search()}>Analisar produtos</button>
      </div>
      <div className="chips"><span>Casa</span><span>Cozinha</span><span>Mercado Livre</span><span>Alta intenção</span></div>
      {state === 'loading' && <ProgressSteps />}
      {state === 'error' && <div className="notice danger">Não foi possível consultar o Mercado Livre agora. O restante do app continua disponível.</div>}
      {!items.length && state === 'idle' && <Empty title="Comece por uma intenção, não por um produto." body="Pesquise um problema ou desejo. O Radar compara os produtos e cria a campanha somente depois da seleção." />}
      <div className="opportunity-grid">
        {items.map((product) => (
          <article className="opportunity-card" key={product.externalId}>
            <div className="product-image">
              {product.imageUrl ? <img src={product.imageUrl.value} alt="" /> : <span>Asset indisponível</span>}
            </div>
            <div>
              <span className="market-chip">Mercado Livre</span>
              <h3>{product.title.value}</h3>
              <p className="price">{product.price ? new Intl.NumberFormat('pt-BR',{style:'currency',currency:product.currency.value}).format(product.price.value) : 'Preço não informado'}</p>
              <p className="muted">Dados factuais preservados com fonte e timestamp.</p>
              <button className="button secondary" onClick={() => create(product)}>Criar campanha</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Review({ campaigns, update }: { campaigns: Campaign[]; update: (c: Campaign) => void }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const campaign = campaigns.find((c) => c.id === id);
  const [command, setCommand] = useState('');
  const [saved, setSaved] = useState(true);
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

  function swap() {
    const other = demoProducts.find((p) => p.productId !== v.product.productId) ?? demoProducts[0]!;
    update(nextCampaignVersion(campaign, { product: { ...other, organizationId: campaign.organizationId } }, 'product swap'));
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
    const next = { ...campaign, status: guard.outcome === 'BLOCK' ? 'BLOCKED' : 'PUBLICATION_READY' as const };
    update(next);
    if (guard.outcome !== 'BLOCK') navigate(`/publish/${campaign.id}`);
  }

  return (
    <div className="review-page">
      <div className="review-grid">
        <PinPreview campaign={campaign} />
        <section className="decision-panel">
          <div className="review-header">
            <div><p className="eyebrow">REVIEW</p><h1>{v.keyword}</h1></div>
            <div className="score-badge"><strong>{campaign.score.score}</strong><span>NestScore<br/>Confiança {campaign.score.confidence}</span></div>
          </div>
          <Disclosure title="Produto" defaultOpen>
            <h3>{v.product.title.value}</h3>
            <p className="muted">{campaign.marketplace} · {v.product.sellerName?.value ?? 'Seller não informado'}</p>
            <small>Fonte: {v.product.title.source} · {new Date(v.product.title.observedAt).toLocaleString('pt-BR')}</small>
          </Disclosure>
          <Disclosure title="Por que escolhemos" defaultOpen>
            <ul>{campaign.score.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
          </Disclosure>
          <Disclosure title="Conteúdo">
            <label>Título</label><p>{v.narrative.pinterestTitle}</p>
            <label>Descrição</label><p>{v.narrative.description}</p>
            <label>Disclosure</label><p>{v.narrative.disclosure}</p>
          </Disclosure>
          <Disclosure title="Pinterest">
            <p><b>Board:</b> {v.boardName}</p>
            <p><b>Alt:</b> {v.narrative.altText}</p>
          </Disclosure>
          <div className="save-state">{saved ? 'Salvo' : 'Salvando…'} · v{v.version}</div>
          <div className="primary-actions">
            <button className="button primary" onClick={approve}>Aprovar</button>
            <button className="button secondary" onClick={() => document.getElementById('ai-edit')?.focus()}>Editar</button>
          </div>
          <div className="minor-actions">
            <button onClick={swap}>Trocar produto</button>
            <button onClick={() => applyEdit('Refaz tudo')}>Refazer</button>
            <button onClick={() => update({ ...campaign, status: 'REJECTED' })}>Descartar</button>
          </div>
        </section>
      </div>
      <div className="ai-bar">
        <span className="spark">✦</span>
        <input id="ai-edit" value={command} onChange={(e) => { setSaved(false); setCommand(e.target.value); }} onKeyDown={(e) => e.key === 'Enter' && applyEdit(command)} placeholder="Peça qualquer alteração… Ex.: mais premium, menos texto, outra headline" />
        <button onClick={() => applyEdit(command)}>Aplicar</button>
      </div>
    </div>
  );
}

function PinPreview({ campaign }: { campaign: Campaign }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvasRef.current) void renderPin(canvasRef.current, campaign.currentVersion);
  }, [campaign.currentVersion]);
  return (
    <section className="preview-panel">
      <div className="preview-toolbar"><span>PIN PREVIEW</span><span>1000 × 1500 · 2:3</span></div>
      <canvas ref={canvasRef} className="pin-canvas" aria-label="Prévia do Pin" />
    </section>
  );
}

function Disclosure({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return <details className="disclosure" open={defaultOpen}><summary>{title}<span>+</span></summary><div>{children}</div></details>;
}

function Publish({ campaigns, update }: { campaigns: Campaign[]; update: (c: Campaign) => void }) {
  const { id } = useParams();
  const campaign = campaigns.find((c) => c.id === id);
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
  function markPublished() { update({ ...campaign, status: 'PUBLISHED' }); }

  return (
    <div className="page publish-page">
      <PageTitle eyebrow="PUBLICAÇÃO" title="Seu Pin está pronto." subtitle="A aprovação humana aconteceu. Agora seguimos o último checklist antes da publicação." />
      <div className="validation-row">
        {guard.checks.map((check) => <span key={check.key} className={`check ${check.outcome.toLowerCase()}`}>{check.outcome === 'PASS' ? '✓' : check.outcome === 'WARN' ? '!' : '×'} {check.key}</span>)}
      </div>
      {guard.outcome === 'BLOCK' && <div className="notice danger">A publicação foi bloqueada. Corrija os itens marcados antes de continuar.</div>}
      <div className="publish-grid">
        <PinPreview campaign={campaign} />
        <section className="package-card">
          <Field label="Arquivo" value={pkg.filename} onCopy={() => copy(pkg.filename)} />
          <Field label="Título" value={pkg.title} onCopy={() => copy(pkg.title)} />
          <Field label="Descrição" value={pkg.description} onCopy={() => copy(`${pkg.description}\n\n${pkg.disclosure}`)} />
          <Field label="Link" value={pkg.destinationUrl} onCopy={() => copy(pkg.destinationUrl)} />
          <Field label="Salvar em" value={pkg.boardName} onCopy={() => copy(pkg.boardName)} />
          <Field label="Alt text" value={pkg.altText} onCopy={() => copy(pkg.altText)} />
        </section>
      </div>
      <section className="guided">
        <div className="guided-copy">
          <p className="eyebrow">MODO GUIADO</p>
          <h2>{steps[step]?.[0]}</h2>
          <p>{steps[step]?.[1]}</p>
          <div className="step-dots">{steps.map((_,i) => <span key={i} className={i === step ? 'active' : ''} />)}</div>
        </div>
        <div className="guided-actions">
          {step > 0 && <button className="button secondary" onClick={() => setStep(step - 1)}>Voltar</button>}
          {step < steps.length - 1 ? (
            <button className="button primary" disabled={guard.outcome === 'BLOCK'} onClick={() => setStep(step + 1)}>Próxima etapa</button>
          ) : (
            <button className="button primary" onClick={markPublished}>Marcar como publicado</button>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  return <div className="package-field"><label>{label}</label><p>{value}</p><button onClick={onCopy}>Copiar</button></div>;
}

function Campaigns({ campaigns }: { campaigns: Campaign[] }) {
  const [tab,setTab] = useState<'READY'|'PUBLICATION_READY'|'PUBLISHED'|'REJECTED'>('READY');
  const map = { READY:'Para revisar', PUBLICATION_READY:'Aprovadas', PUBLISHED:'Publicadas', REJECTED:'Arquivadas' };
  const visible = campaigns.filter((c) => c.status === tab || (tab === 'REJECTED' && c.status === 'BLOCKED'));
  return (
    <div className="page">
      <PageTitle eyebrow="CAMPANHAS" title="Campanhas" subtitle="Poucas decisões. Todo o contexto." />
      <div className="tabs">{Object.entries(map).map(([key,label]) => <button className={tab === key ? 'active' : ''} key={key} onClick={() => setTab(key as typeof tab)}>{label}</button>)}</div>
      <div className="campaign-grid">{visible.map((c) => <CampaignCard key={c.id} campaign={c} />)}</div>
      {!visible.length && <Empty title="Nada aqui por enquanto." body="Quando houver uma campanha neste estado, ela aparece automaticamente." />}
    </div>
  );
}

function Results({ campaigns }: { campaigns: Campaign[] }) {
  const published = campaigns.filter((c) => c.status === 'PUBLISHED').length;
  return (
    <div className="page">
      <PageTitle eyebrow="RESULTADOS" title="Resultado vira próxima ação." subtitle="Sem 30 gráficos. Só o que ajuda a decidir melhor." />
      <div className="metric-grid">
        <Metric label="Receita" value="R$ 0,00" /><Metric label="EPM" value="—" /><Metric label="Cliques" value="0" /><Metric label="Vendas" value="0" />
      </div>
      <Empty title={published ? 'Aguardando dados do Pinterest.' : 'Ainda é cedo para comparar performance.'} body={published ? 'Assim que a conexão de analytics estiver ativa, vinculamos os dados às campanhas publicadas.' : 'Publique alguns Pins para começarmos a aprender.'} />
    </div>
  );
}

function Connections() {
  const rows = [
    ['Pinterest', FEATURE_FLAGS.PINTEREST_API_ENABLED ? 'API ativa' : 'Modo guiado', 'Standard Access continua bloqueado até aprovação externa.'],
    ['Mercado Livre', FEATURE_FLAGS.MELI_ENABLED ? 'Catálogo público ativo' : 'Desativado', 'Dados de afiliado continuam separados do catálogo.'],
    ['Shopee', FEATURE_FLAGS.SHOPEE_ENABLED ? 'Fluxo oficial/manual' : 'Desativado', 'Sem scraping de painel privado.'],
    ['Gemini Free', FEATURE_FLAGS.GEMINI_FREE_ENABLED ? 'Ativo' : 'Off', 'Fallback local e Prompt Studio mantêm o produto funcionando.'],
    ['ChatGPT Manual', 'Disponível', 'Sem API e sem custo adicional obrigatório.'],
    ['OpenAI Future', FEATURE_FLAGS.OPENAI_API_ENABLED ? 'Ativo' : 'Off', 'Bloqueado por padrão.'],
  ];
  return <SimpleList eyebrow="CONEXÕES" title="Connection Center" subtitle="Providers substituíveis. Nenhuma credencial exibida." rows={rows} />;
}

function AiCost() {
  return (
    <div className="page">
      <PageTitle eyebrow="CUSTOS" title="Zero Cost é uma política." subtitle="O app não muda para um serviço pago sozinho." />
      <div className="cost-hero"><span className="live-dot" /><div><h2>Modo Zero Cost: ATIVO</h2><p>Paid AI: BLOQUEADA · OpenAI: OFF · fallback local: ATIVO</p></div></div>
      <div className="metric-grid">
        <Metric label="Custo de IA hoje" value="R$ 0,00" />
        <Metric label="OpenAI API" value={FEATURE_FLAGS.OPENAI_API_ENABLED ? 'ON' : 'OFF'} />
        <Metric label="Paid services" value={KILL_SWITCHES.PAID_SERVICES_DISABLED ? 'BLOQUEADO' : 'LIBERADO'} />
        <Metric label="Gemini Free" value={FEATURE_FLAGS.GEMINI_FREE_ENABLED ? 'DISPONÍVEL' : 'OFF'} />
      </div>
    </div>
  );
}

function Boards() { return <SimpleList eyebrow="BOARDS" title="Estrutura editorial" subtitle="O sistema recomenda o board. Você só interfere quando quiser." rows={initialBoards.map((b,i) => [b, i < 2 ? 'Prioritário' : 'Pronto', 'Casa & organização'])} />; }
function Library() { return <SimpleList eyebrow="BIBLIOTECA" title="Produtos, criativos e templates" subtitle="Histórico visual e fatos comerciais sem virar um ERP." rows={[['Produtos','Product Truth','Dados com fonte e timestamp'],['Criativos','Creative Engine','Versões determinísticas e exportáveis'],['Templates','10 bases planejadas','Editorial, Problem → Solution, Minimal e outras']]} />; }
function Workspace() { const { organizationId, role }=useAuth(); return <SimpleList eyebrow="WORKSPACE" title="Workspace" subtitle="Organização e autorização continuam sob a autoridade MillionsNest." rows={[[organizationId ?? '—','organizationId','Tenant ativo'],[role ?? 'viewer','Role','Permissão efetiva'],['Audit','Append-only','Eventos críticos serão registrados']]} />; }
function Help() { return <SimpleList eyebrow="AJUDA" title="Sem becos sem saída." subtitle="Cada fluxo explica o próximo passo sem exigir conhecimento de afiliados ou API." rows={[[ 'Publicar um Pin','Modo Guiado','Review → Aprovar → Package → Passo a passo'],['IA sem custo','Prompt Studio','Use ChatGPT/Gemini manualmente quando precisar'],['Produto indisponível','Replacement flow','Troca preserva campanha e revalida compliance']]} />; }

function SimpleList({ eyebrow,title,subtitle,rows }: { eyebrow:string; title:string; subtitle:string; rows:string[][] }) {
  return <div className="page"><PageTitle eyebrow={eyebrow} title={title} subtitle={subtitle} /><div className="list-surface">{rows.map((r) => <div className="list-row" key={r[0]}><div><h3>{r[0]}</h3><p>{r[2]}</p></div><span>{r[1]}</span></div>)}</div></div>;
}

function Metric({ label,value }: { label:string; value:string }) { return <div className="metric-card"><span>{label}</span><strong>{value}</strong></div>; }
function Empty({ title,body }: { title:string; body:string }) { return <div className="empty"><span className="empty-orb" /><h3>{title}</h3><p>{body}</p></div>; }
function PageTitle({ eyebrow,title,subtitle }: { eyebrow:string; title:string; subtitle:string }) { return <header className="page-title"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{subtitle}</p></header>; }
function ProgressSteps() { return <div className="progress-steps"><span>Comparando produtos…</span><span>Validando fatos…</span><span>Calculando oportunidade…</span></div>; }

export function App() {
  const auth = useAuth();
  const store = useCampaignStore(auth.organizationId);
  const [locale,setLocale] = useState<Locale>(() => (localStorage.getItem('na_locale') as Locale) || 'pt-BR');
  useEffect(() => localStorage.setItem('na_locale', locale), [locale]);

  if (auth.state !== 'ready') return <Login />;
  const org = auth.organizationId ?? 'demo-org';

  return (
    <Shell locale={locale} setLocale={setLocale}>
      <Routes>
        <Route path="/" element={<Today campaigns={store.campaigns} />} />
        <Route path="/radar" element={<Radar addCampaign={store.add} organizationId={org} />} />
        <Route path="/campaigns" element={<Campaigns campaigns={store.campaigns} />} />
        <Route path="/review/:id" element={<Review campaigns={store.campaigns} update={store.update} />} />
        <Route path="/publish/:id" element={<Publish campaigns={store.campaigns} update={store.update} />} />
        <Route path="/results" element={<Results campaigns={store.campaigns} />} />
        <Route path="/connections" element={<Connections />} />
        <Route path="/ai-cost" element={<AiCost />} />
        <Route path="/boards" element={<Boards />} />
        <Route path="/library" element={<Library />} />
        <Route path="/workspace" element={<Workspace />} />
        <Route path="/help" element={<Help />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
