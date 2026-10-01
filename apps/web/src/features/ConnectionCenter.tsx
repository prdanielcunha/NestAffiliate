import { FEATURE_FLAGS, KILL_SWITCHES } from '@nestaffiliate/config';
import { useI18n } from '../lib/i18n-context';

type Status = 'active' | 'guided' | 'external' | 'off' | 'blocked';

interface ConnectionCard {
  name: string;
  status: Status;
  capability: string;
  detail: string;
  safety: string;
}

function statusLabel(status: Status, locale: string) {
  const labels: Record<string, Record<Status, string>> = {
    'pt-BR': { active: 'Ativo', guided: 'Modo guiado', external: 'Aprovação externa', off: 'Off', blocked: 'Bloqueado' },
    en: { active: 'Active', guided: 'Guided mode', external: 'External approval', off: 'Off', blocked: 'Blocked' },
    es: { active: 'Activo', guided: 'Modo guiado', external: 'Aprobación externa', off: 'Off', blocked: 'Bloqueado' },
  };
  return labels[locale]?.[status] ?? labels['pt-BR']![status];
}

export function ConnectionCenter() {
  const { locale } = useI18n();
  const cards: ConnectionCard[] = [
    {
      name: 'Pinterest',
      status: FEATURE_FLAGS.PINTEREST_STANDARD_ACCESS
        ? FEATURE_FLAGS.PINTEREST_AUTO_PUBLISH ? 'active' : 'guided'
        : 'external',
      capability: FEATURE_FLAGS.PINTEREST_STANDARD_ACCESS
        ? 'Boards · Pins · Analytics'
        : 'Guided Publisher · pacote completo',
      detail: FEATURE_FLAGS.PINTEREST_STANDARD_ACCESS
        ? 'Standard Access detectado. Auto-publish continua subordinado ao approval gate e às flags.'
        : 'Trial não é tratado como publicação pública. O modo guiado continua sendo o caminho de produção.',
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
      name: 'Shopee',
      status: FEATURE_FLAGS.SHOPEE_ENABLED && !KILL_SWITCHES.SHOPEE_DISABLED ? 'guided' : 'off',
      capability: 'Import oficial/manual · link afiliado',
      detail: 'Produtos podem entrar por URL e link afiliado fornecidos pelo operador enquanto não houver adapter oficial seguro configurado.',
      safety: 'Sem scraping de painel privado.',
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
    </div>
  );
}
