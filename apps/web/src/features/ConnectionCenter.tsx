import { FEATURE_FLAGS, KILL_SWITCHES, PUBLIC_LINKS } from '@nestaffiliate/config';
import { SHOPEE_AFFILIATE_CAPABILITIES, SHOPEE_PINTEREST_HELP_URL } from '@nestaffiliate/integrations';
import { useI18n } from '../lib/i18n-context';
import { PolicyWatchPanel } from './PolicyWatchPanel';
import { MercadoLivreSetupPanel } from './MercadoLivreSetupPanel';
import { ShopeeSetupPanel } from './ShopeeSetupPanel';

type Status = 'active' | 'guided' | 'external' | 'off' | 'blocked';

interface ConnectionCard {
  name: string;
  status: Status;
  capability: string;
  detail: string;
  safety: string;
}

interface LaunchCopy {
  officialProfile: string;
  openProfile: string;
  startNow: string;
  startNowBody: string;
  apiTitle: string;
  apiReady: string;
  apiPending: string;
  stepBusiness: string;
  stepTrial: string;
  stepStandard: string;
}

function statusLabel(status: Status, locale: string) {
  const labels: Record<string, Record<Status, string>> = {
    'pt-BR': { active: 'Ativo', guided: 'Modo guiado', external: 'Aprovação externa', off: 'Off', blocked: 'Bloqueado' },
    en: { active: 'Active', guided: 'Guided mode', external: 'External approval', off: 'Off', blocked: 'Blocked' },
    es: { active: 'Activo', guided: 'Modo guiado', external: 'Aprobación externa', off: 'Off', blocked: 'Bloqueado' },
  };
  return labels[locale]?.[status] ?? labels['pt-BR']![status];
}

function launchCopy(locale: string): LaunchCopy {
  const copy: Record<string, LaunchCopy> = {
    'pt-BR': {
      officialProfile: 'Perfil oficial',
      openProfile: 'Abrir @achadosdonest',
      startNow: 'Começar agora',
      startNowBody: 'O Guided Publisher já pode preparar imagem, título, descrição, link, pasta e checklist. Publique manualmente no perfil oficial enquanto a API não está liberada.',
      apiTitle: 'Ativação da API',
      apiReady: 'API habilitada neste ambiente. Continue respeitando approval gate e access tier.',
      apiPending: 'Próximo gate externo: solicitar Trial Access no Pinterest Developers. Trial serve para Sandbox; Standard é necessário para operação pública via API.',
      stepBusiness: '1. Confirmar conta Pinterest Business e e-mail verificado.',
      stepTrial: '2. Cadastrar NestAffiliate no Pinterest Developers e solicitar Trial Access.',
      stepStandard: '3. Testar OAuth/Sandbox e então solicitar Standard Access para produção.',
    },
    en: {
      officialProfile: 'Official profile',
      openProfile: 'Open @achadosdonest',
      startNow: 'Start now',
      startNowBody: 'Guided Publisher can already prepare the image, title, description, link, board and checklist. Publish manually to the official profile while API access is pending.',
      apiTitle: 'API activation',
      apiReady: 'API is enabled in this environment. Keep the approval gate and access tier checks in place.',
      apiPending: 'Next external gate: request Trial Access in Pinterest Developers. Trial is for Sandbox; Standard is required for public production use through the API.',
      stepBusiness: '1. Confirm Pinterest Business account and verified email.',
      stepTrial: '2. Register NestAffiliate in Pinterest Developers and request Trial Access.',
      stepStandard: '3. Test OAuth/Sandbox, then request Standard Access for production.',
    },
    es: {
      officialProfile: 'Perfil oficial',
      openProfile: 'Abrir @achadosdonest',
      startNow: 'Empezar ahora',
      startNowBody: 'Guided Publisher ya puede preparar imagen, título, descripción, enlace, tablero y checklist. Publica manualmente en el perfil oficial mientras la API sigue pendiente.',
      apiTitle: 'Activación de API',
      apiReady: 'La API está habilitada en este entorno. Mantén el approval gate y la validación del nivel de acceso.',
      apiPending: 'Próximo gate externo: solicitar Trial Access en Pinterest Developers. Trial sirve para Sandbox; Standard es necesario para producción pública vía API.',
      stepBusiness: '1. Confirmar cuenta Pinterest Business y correo verificado.',
      stepTrial: '2. Registrar NestAffiliate en Pinterest Developers y solicitar Trial Access.',
      stepStandard: '3. Probar OAuth/Sandbox y luego solicitar Standard Access para producción.',
    },
  };
  return copy[locale] ?? copy['pt-BR']!;
}

export function ConnectionCenter() {
  const { locale, t } = useI18n();
  const launch = launchCopy(locale);
  const cards: ConnectionCard[] = [
    {
      name: 'Pinterest API',
      status: FEATURE_FLAGS.PINTEREST_STANDARD_ACCESS
        ? FEATURE_FLAGS.PINTEREST_AUTO_PUBLISH ? 'active' : 'guided'
        : 'external',
      capability: FEATURE_FLAGS.PINTEREST_STANDARD_ACCESS
        ? 'Boards · Pins · Analytics'
        : 'Guided Publisher · Trial/Sandbox readiness',
      detail: FEATURE_FLAGS.PINTEREST_STANDARD_ACCESS
        ? 'Standard Access detectado. Auto-publish continua subordinado ao approval gate e às flags.'
        : 'Trial é usado para Sandbox; Pins e Boards criados nesse nível não são tratados como publicação pública. O modo guiado continua sendo o caminho de produção.',
      safety: 'OAuth/client_secret nunca é armazenado no frontend.',
    },
    {
      name: 'Mercado Livre',
      status: FEATURE_FLAGS.MELI_ENABLED && !KILL_SWITCHES.MELI_DISABLED ? 'active' : 'off',
      capability: 'Catálogo público · Product Truth · shortlist',
      detail: 'O catálogo alimenta o Radar; link afiliado é um dado separado e obrigatório antes da publicação.',
      safety: 'Sem scraping de painel privado.',
    },
    {
      name: 'Shopee Affiliate + Pinterest',
      status: FEATURE_FLAGS.SHOPEE_ENABLED && !KILL_SWITCHES.SHOPEE_DISABLED ? 'guided' : 'off',
      capability: t('shopeeConnectionCapability'),
      detail: t('shopeeConnectionDetail',{n:SHOPEE_AFFILIATE_CAPABILITIES.maxProductsPerPin}),
      safety: t('shopeeConnectionSafety'),
    },
    {
      name: 'Gemini Free',
      status: FEATURE_FLAGS.GEMINI_FREE_ENABLED && !KILL_SWITCHES.AI_DISABLED ? 'active' : 'off',
      capability: 'Provider opcional · quota guard',
      detail: 'O produto não depende deste provider. Quando off, Rule Engine e Prompt Studio continuam operando.',
      safety: 'Nenhuma chave de provider vai para documentos client-readable.',
    },
    {
      name: 'ChatGPT Manual',
      status: 'active',
      capability: 'Prompt Package · Privacy Guard',
      detail: 'O Prompt Studio gera contexto copiável com Product Truth bloqueado e dados pessoais removidos.',
      safety: 'Custo de API obrigatório: R$ 0.',
    },
    {
      name: 'OpenAI API / Image',
      status: FEATURE_FLAGS.OPENAI_API_ENABLED ? 'active' : 'blocked',
      capability: 'Adapter futuro',
      detail: 'Permanece desligado até existir decisão explícita de custo/receita.',
      safety: 'PAID_SERVICES_DISABLED prevalece sobre qualquer provider pago.',
    },
  ];

  return (
    <div className="page">
      <header className="page-title">
        <p className="eyebrow">CONNECTION CENTER</p>
        <h1>Integrações sem dependência escondida.</h1>
        <p>Cada provider declara o que consegue fazer, seu gate atual e como o produto continua funcionando quando ele está indisponível.</p>
      </header>

      <section className="two-col" aria-label="Pinterest launch status">
        <article className="surface">
          <p className="eyebrow">{launch.officialProfile}</p>
          <h2>Achados do Nest</h2>
          <p className="muted">@achadosdonest</p>
          <a
            className="button secondary"
            href={PUBLIC_LINKS.PINTEREST_PROFILE_URL}
            target="_blank"
            rel="noreferrer"
          >
            {launch.openProfile}
          </a>
        </article>

        <article className="surface">
          <p className="eyebrow">{launch.startNow}</p>
          <h2>Guided Publisher</h2>
          <p className="muted">{launch.startNowBody}</p>
        </article>
      </section>

      <section className="section">
        <div className="section-heading">
          <h2>{launch.apiTitle}</h2>
          <span>{FEATURE_FLAGS.PINTEREST_API_ENABLED ? statusLabel('active', locale) : statusLabel('external', locale)}</span>
        </div>
        <div className="list-surface">
          <div className="list-row">
            <div>
              <h3>{FEATURE_FLAGS.PINTEREST_API_ENABLED ? launch.apiReady : launch.apiPending}</h3>
              <p>{launch.stepBusiness}</p>
            </div>
            <span>01</span>
          </div>
          <div className="list-row">
            <div>
              <h3>{launch.stepTrial}</h3>
              <p>OAuth + Sandbox + leitura de Boards/Pins + analytics de teste.</p>
            </div>
            <span>02</span>
          </div>
          <div className="list-row">
            <div>
              <h3>{launch.stepStandard}</h3>
              <p>Publicação pública via API continua bloqueada até esse gate.</p>
            </div>
            <span>03</span>
          </div>
        </div>
      </section>

      <MercadoLivreSetupPanel />

      {FEATURE_FLAGS.SHOPEE_ENABLED && !KILL_SWITCHES.SHOPEE_DISABLED && <ShopeeSetupPanel />}

      {FEATURE_FLAGS.SHOPEE_ENABLED && !KILL_SWITCHES.SHOPEE_DISABLED && (
        <section className="surface shopee-connection-callout">
          <p className="eyebrow">SHOPEE + PINTEREST</p>
          <h2>{t('shopeeConnectionCalloutTitle')}</h2>
          <p className="muted">{t('shopeeConnectionCalloutBody')}</p>
          <a className="button secondary" href={SHOPEE_PINTEREST_HELP_URL} target="_blank" rel="noreferrer">{t('openIntegrationGuide')}</a>
        </section>
      )}

      <div className="connection-grid">
        {cards.map((card) => (
          <article className="connection-card" key={card.name}>
            <div className="connection-head">
              <h2>{card.name}</h2>
              <span className={`connection-status ${card.status}`}>{statusLabel(card.status, locale)}</span>
            </div>
            <strong>{card.capability}</strong>
            <p>{card.detail}</p>
            <small>{card.safety}</small>
          </article>
        ))}
      </div>
      <PolicyWatchPanel />
    </div>
  );
}
