import {
  buildShopeeOfficialSearchUrl,
  SHOPEE_PINTEREST_HELP_URL,
} from '@nestaffiliate/integrations';
import { useI18n } from '../lib/i18n-context';

export function ShopeeResearchBridge({ query, degraded=false }: { query: string; degraded?:boolean }) {
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

  return (
    <section id="shopee-quick-mode" className="shopee-research-bridge shopee-quick-mode" aria-label={degraded ? t('shopeeDegradedModeTitle') : t('shopeeQuickModeTitle')}>
      <div className="shopee-research-head">
        <div>
          <div className="shopee-live-row">
            <span className="health-dot" aria-hidden="true" />
            <span>{degraded ? t('shopeeDegradedModeActive') : t('shopeeQuickModeActive')}</span>
          </div>
          <h2>{degraded ? t('shopeeDegradedModeTitle') : t('shopeeQuickModeTitle')}</h2>
          <p>{degraded ? t('shopeeDegradedModeBody') : t('shopeeQuickModeBody')}</p>
        </div>
        <span className="connection-status guided">{t('availableNow')}</span>
      </div>

      <div className="shopee-capability-grid quick-capability-grid">
        <span>{t('shopeeQuickBenefit1')}</span>
        <span>{t('shopeeQuickBenefit2')}</span>
        <span>{t('shopeeQuickBenefit3')}</span>
        <span>{t('shopeeQuickBenefit4')}</span>
      </div>

      <div className="shopee-research-query">
        <span>{t('searchIntent')}</span>
        <strong>{searchTerm || '—'}</strong>
      </div>

      <div className="shopee-research-actions">
        <a className="button primary" href="#shopee-quick-import">
          {t('shopeeQuickPasteNow')}
        </a>
        <button
          className="button secondary"
          type="button"
          onClick={openOfficialSearch}
          disabled={!searchTerm}
        >
          {t('shopeeQuickSearchExternal')}
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
          className="text-button shopee-guide-link"
          href={SHOPEE_PINTEREST_HELP_URL}
          target="_blank"
          rel="noreferrer"
        >
          {t('openIntegrationGuide')}
        </a>
      </div>

      <ol className="shopee-research-steps">
        <li>{t('shopeeQuickStep1')}</li>
        <li>{t('shopeeQuickStep2')}</li>
        <li>{t('shopeeQuickStep3')}</li>
      </ol>

      <p className="shopee-research-note">{degraded ? t('shopeeDegradedModeNotice') : t('shopeeQuickModeNotice')}</p>
    </section>
  );
}
