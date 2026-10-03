import {
  buildShopeeOfficialSearchUrl,
  SHOPEE_AFFILIATE_CAPABILITIES,
  SHOPEE_PINTEREST_HELP_URL,
} from '@nestaffiliate/integrations';
import { useI18n } from '../lib/i18n-context';

export function ShopeeResearchBridge({ query }: { query: string }) {
  const { t } = useI18n();
  const searchTerm = query.trim();

  function openOfficialSearch() {
    window.open(
      buildShopeeOfficialSearchUrl(searchTerm),
      '_blank',
      'noopener,noreferrer',
    );
  }

  async function copySearch() {
    if (!searchTerm) return;
    await navigator.clipboard.writeText(searchTerm);
  }

  const capabilities = [
    t('shopeeCapabilitySearch'),
    t('shopeeCapabilityCommission'),
    t('shopeeCapabilityTags'),
    t('shopeeCapabilityTracking'),
  ];

  return (
    <section className="shopee-research-bridge" aria-label={t('shopeeOfficialResearch')}>
      <div className="shopee-research-head">
        <div>
          <div className="shopee-live-row">
            <span className="health-dot" aria-hidden="true" />
            <span>{t('shopeeLinked')}</span>
          </div>
          <h2>{t('shopeeOfficialResearch')}</h2>
          <p>{t('shopeeOfficialResearchBody')}</p>
        </div>
        <span className="connection-status active">{t('active')}</span>
      </div>

      <div className="shopee-capability-grid">
        {capabilities.map((capability) => (
          <span key={capability}>{capability}</span>
        ))}
      </div>

      <div className="shopee-research-query">
        <span>{t('shopeeSearchAssisted')}</span>
        <strong>{searchTerm || '—'}</strong>
      </div>

      <div className="shopee-research-actions">
        <button
          className="button primary"
          type="button"
          onClick={openOfficialSearch}
          disabled={!searchTerm}
        >
          {t('searchShopeeOfficial')}
        </button>
        <button
          className="button secondary"
          type="button"
          onClick={() => void copySearch()}
          disabled={!searchTerm}
        >
          {t('copySearchTerm')}
        </button>
        <a
          className="button ghost"
          href={SHOPEE_PINTEREST_HELP_URL}
          target="_blank"
          rel="noreferrer"
        >
          {t('openIntegrationGuide')}
        </a>
      </div>

      <ol className="shopee-research-steps">
        <li>{t('shopeeResearchStep1')}</li>
        <li>{t('shopeeResearchStep2')}</li>
        <li>{t('shopeeResearchStep3')}</li>
      </ol>

      <p className="shopee-research-note">{t('shopeeSearchNotice')}</p>
      <small>
        {SHOPEE_AFFILIATE_CAPABILITIES.maxProductsPerPin} · Pinterest product tagging
      </small>
    </section>
  );
}
