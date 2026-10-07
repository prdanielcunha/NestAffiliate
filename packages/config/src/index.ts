type EnvLike = Record<string, string | boolean | undefined>;

function envSource(): EnvLike {
  return ((import.meta as ImportMeta & { env?: EnvLike }).env ?? {}) as EnvLike;
}

function envBoolean(name: string, fallback: boolean) {
  const value = envSource()[name];
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string' || value.trim() === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function envString(name: string, fallback: string) {
  const value = envSource()[name];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export const PUBLIC_LINKS = {
  PINTEREST_PROFILE_URL: envString('VITE_PINTEREST_PROFILE_URL', 'https://br.pinterest.com/achadosdonest/'),
} as const;

export const FEATURE_FLAGS = {
  REVENUE_RADAR_3_ENABLED: envBoolean('VITE_REVENUE_RADAR_3_ENABLED', false),
  REVENUE_ASSESSMENT_ENABLED: envBoolean('VITE_REVENUE_ASSESSMENT_ENABLED', false),
  CROSS_MARKET_OFFER_COMPARE_ENABLED: envBoolean('VITE_CROSS_MARKET_OFFER_COMPARE_ENABLED', false),
  MULTICHANNEL_CREATIVE_KIT_ENABLED: envBoolean('VITE_MULTICHANNEL_CREATIVE_KIT_ENABLED', false),
  FACEBOOK_SHOPEE_AFFILIATE_ENABLED: envBoolean('VITE_FACEBOOK_SHOPEE_AFFILIATE_ENABLED', false),
  REVENUE_IMPORT_V2_ENABLED: envBoolean('VITE_REVENUE_IMPORT_V2_ENABLED', false),
  NESTAI_OPPORTUNITY_ENRICHMENT_ENABLED: envBoolean('VITE_NESTAI_OPPORTUNITY_ENRICHMENT_ENABLED', false),
  PINTEREST_API_ENABLED: envBoolean('VITE_PINTEREST_API_ENABLED', false),
  PINTEREST_STANDARD_ACCESS: envBoolean('VITE_PINTEREST_STANDARD_ACCESS', false),
  PINTEREST_AUTO_PUBLISH: envBoolean('VITE_PINTEREST_AUTO_PUBLISH', false),
  PINTEREST_TRENDS_API: envBoolean('VITE_PINTEREST_TRENDS_API', false),
  MELI_ENABLED: envBoolean('VITE_MELI_ENABLED', true),
  SHOPEE_ENABLED: envBoolean('VITE_SHOPEE_ENABLED', true),
  AMAZON_ENABLED: envBoolean('VITE_AMAZON_ENABLED', false),
  GEMINI_FREE_ENABLED: envBoolean('VITE_GEMINI_FREE_ENABLED', false),
  OPENAI_API_ENABLED: envBoolean('VITE_OPENAI_API_ENABLED', false),
  OPENAI_IMAGE_ENABLED: envBoolean('VITE_OPENAI_IMAGE_ENABLED', false),
  OPENAI_EDIT_ENABLED: envBoolean('VITE_OPENAI_EDIT_ENABLED', false),
  INTERNATIONAL_ENABLED: envBoolean('VITE_INTERNATIONAL_ENABLED', false),
  PAID_SERVICES_DISABLED: envBoolean('VITE_PAID_SERVICES_DISABLED', true),
} as const;

export const KILL_SWITCHES = {
  PAUSE_ALL_AUTOMATION: envBoolean('VITE_PAUSE_ALL_AUTOMATION', false),
  PINTEREST_PUBLISH_DISABLED: envBoolean('VITE_PINTEREST_PUBLISH_DISABLED', false),
  AI_DISABLED: envBoolean('VITE_AI_DISABLED', false),
  MELI_DISABLED: envBoolean('VITE_MELI_DISABLED', false),
  SHOPEE_DISABLED: envBoolean('VITE_SHOPEE_DISABLED', false),
  PAID_SERVICES_DISABLED: envBoolean('VITE_PAID_SERVICES_DISABLED', true),
} as const;

export function isPaidCapabilityAllowed() {
  return !FEATURE_FLAGS.PAID_SERVICES_DISABLED && !KILL_SWITCHES.PAID_SERVICES_DISABLED;
}

export function isMarketplaceEnabled(marketplace: 'MELI' | 'SHOPEE' | 'AMAZON') {
  if (marketplace === 'MELI') return FEATURE_FLAGS.MELI_ENABLED && !KILL_SWITCHES.MELI_DISABLED;
  if (marketplace === 'SHOPEE') return FEATURE_FLAGS.SHOPEE_ENABLED && !KILL_SWITCHES.SHOPEE_DISABLED;
  return FEATURE_FLAGS.AMAZON_ENABLED;
}

export function canAttemptPinterestPublish() {
  return (
    FEATURE_FLAGS.PINTEREST_API_ENABLED &&
    FEATURE_FLAGS.PINTEREST_STANDARD_ACCESS &&
    FEATURE_FLAGS.PINTEREST_AUTO_PUBLISH &&
    !KILL_SWITCHES.PINTEREST_PUBLISH_DISABLED &&
    !KILL_SWITCHES.PAUSE_ALL_AUTOMATION
  );
}

export function automationEnabled() {
  return !KILL_SWITCHES.PAUSE_ALL_AUTOMATION;
}
