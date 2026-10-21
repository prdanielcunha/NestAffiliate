import { FEATURE_FLAGS, KILL_SWITCHES, PUBLIC_LINKS, PINTEREST_DEVELOPER_APP, pinterestApiApproved, pinterestStandardApproved } from '@nestaffiliate/config';
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
      apiPending: 'Trial negado em 20/10 porque o site exigia login. A página principal agora é pública; solicite reavaliação do App 1625057 no atendimento existente. Publicação via API continua indisponível.',
      stepBusiness: '1. Confirmar conta Pinterest Business e e-mail verificado.',
      stepTrial: '2. Após a página pública entrar em produção, pedir à Periwinkle reavaliação do mesmo App ID 1625057.',
      stepStandard: '3. Testar OAuth/Sandbox e então solicitar Standard Access para produção.',
    },
    en: {
      officialProfile: 'Official profile',
      openProfile: 'Open @achadosdonest',
      startNow: 'Start now',
      startNowBody: 'Guided Publisher can already prepare the image, title, description, link, board and checklist. Publish manually to the official profile while API access is pending.',
      apiTitle: 'API activation',
      apiReady: 'API is enabled in this environment. Keep the approval gate and access tier checks in place.',
      apiPending: 'Trial was denied on Oct 20 because the Main URL required login. The public website was corrected; request rereview of App 1625057 in the same support ticket. Public API publishing remains unavailable.',
      stepBusiness: '1. Confirm Pinterest Business account and verified email.',
      stepTrial: '2. Request rereview of the same App ID 1625057 after the public Main URL is live.',
      stepStandard: '3. Test OAuth/Sandbox, then request Standard Access for production.',
    },
    es: {
      officialProfile: 'Perfil oficial',
      openProfile: 'Abrir @achadosdonest',
      startNow: 'Empezar ahora',
      startNowBody: 'Guided Publisher ya puede preparar imagen, título, descripción, enlace, tablero y checklist. Publica manualmente en el perfil oficial mientras la API sigue pendiente.',
      apiTitle: 'Activación de API',
      apiReady: 'La API está habilitada en este entorno. Mantén el approval gate y la validación del nivel de acceso.',
      apiPending: 'Trial fue denegado el 20/10 porque el sitio exigía iniciar sesión. Se corrigió el acceso público; solicita nueva revisión de la app 1625057. Publicación por API no disponible.',
      stepBusiness: '1. Confirmar cuenta Pinterest Business y correo verificado.',
      stepTrial: '2. Solicita la revisión de la misma app 1625057 después de publicar la página pública.',
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
      status: (FEATURE_FLAGS.PINTEREST_STANDARD_ACCESS && pinterestStandardApproved())
        ? FEATURE_FLAGS.PINTEREST_AUTO_PUBLISH ? 'active' : 'guided'
        : 'external',
      capability: (FEATURE_FLAGS.PINTEREST_STANDARD_ACCESS && pinterestStandardApproved())
        ? 'Boards · Pins · Analytics'
        : 'Guided Publisher · Trial/Sandbox readiness',
      detail: (FEATURE_FLAGS.PINTEREST_STANDARD_ACCESS && pinterestStandardApproved())
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
      name: 'Usar meu plano ChatGPT Pro',
      status: 'external',
      capability: 'Sign in with ChatGPT · aprovação externa',
      detail: locale==='pt-BR'
        ? 'Alguns apps elegíveis podem usar franquia ChatGPT via autorização OAuth. Para um app comercial hospedado, a OpenAI precisa aprovar o acesso. A integração de plano disponível para open source não suporta geração de imagens.'
        : locale==='es'
          ? 'Algunas apps elegibles pueden usar el plan con OAuth. Una app comercial alojada requiere aprobación; la modalidad open-source no admite generación de imágenes.'
          : 'Eligible apps may use ChatGPT plan via OAuth consent. Commercial hosted apps require approval; open-source plan sharing does not support image generation.',
      safety: locale==='pt-BR'?'Nunca solicite senha, cookie ou chave de API do ChatGPT no NestAffiliate.':'Never enter ChatGPT password, cookies or API keys into NestAffiliate.',
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
          <span>{(FEATURE_FLAGS.PINTEREST_API_ENABLED && pinterestApiApproved()) ? statusLabel('active', locale) : statusLabel('external', locale)}</span>
        </div>
        <div className="list-surface">
          <div className="list-row">
            <div>
              <h3>{(FEATURE_FLAGS.PINTEREST_API_ENABLED && pinterestApiApproved()) ? launch.apiReady : launch.apiPending}</h3>
              <p>{launch.stepBusiness}</p>
              <p><strong>{PINTEREST_DEVELOPER_APP.name}</strong> · App ID <code>{PINTEREST_DEVELOPER_APP.id}</code></p>
              {!(FEATURE_FLAGS.PINTEREST_API_ENABLED && pinterestApiApproved())&&<p>{locale==='pt-BR'?'Último status informado: Trial negado (20/10/2026) por exigir login. Site corrigido; falta reavaliação do Pinterest. Não é uma consulta ao vivo.':locale==='es'?'Último estado informado: Trial denegado (20/10/2026). Revisión pendiente; no es consulta en vivo.':'Last reported state: Trial denied (2026-10-20). Rereview required; not a live provider check.'}</p>}
              <a href="https://developers.pinterest.com/apps/" className="button secondary" target="_blank" rel="noopener noreferrer">{locale==='pt-BR'?'Ver status no Pinterest Developers ↗':locale==='es'?'Ver estado en Pinterest Developers ↗':'Check status in Pinterest Developers ↗'}</a>
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

      <section className="surface" aria-label="Pinterest compliance and permissions">
        <p className="eyebrow">{locale==='pt-BR'?'COMPROMISSOS DA INTEGRAÇÃO':locale==='es'?'COMPROMISOS DE INTEGRACIÓN':'INTEGRATION SAFEGUARDS'}</p>
        <h2>{locale==='pt-BR'?'Acesso autorizado, dados protegidos e controle humano':locale==='es'?'Acceso autorizado, datos protegidos y revisión humana':'Authorized access, protected data and human review'}</h2>
        <p className="muted">{locale==='pt-BR'
          ? 'A API do Pinterest está indisponível até aprovação expressa. Não solicitamos senhas ou cookies de sessão, não coletamos dados do Pinterest por scraping e não publicamos Pins em massa sem seleção individual e consentimento.'
          : locale==='es'?'La API de Pinterest no está disponible hasta su aprobación. No solicitamos contraseñas o cookies, no hacemos scraping ni publicamos Pins masivamente sin aprobación individual.'
          : 'Pinterest API access is unavailable until explicitly approved. We do not request Pinterest passwords or session cookies, scrape Pinterest data, or mass-publish Pins without individual selection and consent.'}</p>
        <p className="muted">{locale==='pt-BR'
          ? 'Não utilizamos materiais do Pinterest para treinar IA nem oferecemos benchmarks de concorrentes do Pinterest sem autorização escrita. Métricas próprias importadas exigem consentimento e seguem os limites das políticas da plataforma.'
          : locale==='es'?'No usamos materiales de Pinterest para entrenar IA ni ofrecemos estudios de competidores sin permiso escrito. Las métricas propias requieren autorización.'
          : 'We do not train AI on Pinterest materials or provide Pinterest competitor benchmarks without written approval. Imported account metrics require authorization and follow platform data restrictions.'}</p>
        <a className="button secondary" href="/privacy">{locale==='pt-BR'?'Política de privacidade ↗':locale==='es'?'Política de privacidad ↗':'Privacy Policy ↗'}</a>
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
