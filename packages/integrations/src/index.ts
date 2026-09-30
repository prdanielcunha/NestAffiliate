import type { Marketplace, ProductTruth } from '@nestaffiliate/core';

export interface ProviderCapabilities {
  productSearch: boolean;
  productRead: boolean;
  affiliateLink: boolean;
  affiliateMetrics: boolean;
  boardRead: boolean;
  boardWrite: boolean;
  pinRead: boolean;
  pinWrite: boolean;
  pinAnalytics: boolean;
  trends: boolean;
  textAI: boolean;
  imageAI: boolean;
}

export interface ProductSearchInput {
  organizationId: string;
  query: string;
  limit?: number;
}

export interface ProductAdapter {
  marketplace: Marketplace;
  capabilities: ProviderCapabilities;
  search(input: ProductSearchInput): Promise<ProductTruth[]>;
}

export const PINTEREST_CAPABILITIES_TRIAL: ProviderCapabilities = {
  productSearch: false,
  productRead: false,
  affiliateLink: false,
  affiliateMetrics: false,
  boardRead: true,
  boardWrite: true,
  pinRead: true,
  pinWrite: true,
  pinAnalytics: true,
  trends: false,
  textAI: false,
  imageAI: false,
};

export const PINTEREST_CAPABILITIES_STANDARD: ProviderCapabilities = {
  ...PINTEREST_CAPABILITIES_TRIAL,
  pinWrite: true,
};

export class MercadoLivrePublicAdapter implements ProductAdapter {
  marketplace = 'MELI' as const;
  capabilities: ProviderCapabilities = {
    productSearch: true,
    productRead: true,
    affiliateLink: false,
    affiliateMetrics: false,
    boardRead: false,
    boardWrite: false,
    pinRead: false,
    pinWrite: false,
    pinAnalytics: false,
    trends: false,
    textAI: false,
    imageAI: false,
  };

  async search(input: ProductSearchInput): Promise<ProductTruth[]> {
    const query = encodeURIComponent(input.query.trim());
    const limit = Math.max(1, Math.min(input.limit ?? 12, 25));
    const response = await fetch(`https://api.mercadolibre.com/sites/MLB/search?q=${query}&limit=${limit}`);
    if (!response.ok) throw new Error(`MELI_SEARCH_${response.status}`);
    const payload = await response.json() as { results?: Array<Record<string, any>> };
    const now = new Date().toISOString();
    return (payload.results ?? []).map((item) => ({
      productId: `meli:${String(item.id)}`,
      organizationId: input.organizationId,
      marketplace: 'MELI',
      externalId: String(item.id),
      title: { value: String(item.title ?? ''), source: 'mercadolibre-public-api', observedAt: now },
      url: { value: String(item.permalink ?? ''), source: 'mercadolibre-public-api', observedAt: now },
      price: typeof item.price === 'number' ? { value: item.price, source: 'mercadolibre-public-api', observedAt: now } : undefined,
      currency: { value: String(item.currency_id ?? 'BRL'), source: 'mercadolibre-public-api', observedAt: now },
      sellerName: item.seller?.nickname ? { value: String(item.seller.nickname), source: 'mercadolibre-public-api', observedAt: now } : undefined,
      availability: { value: 'available', source: 'mercadolibre-public-api', observedAt: now },
      imageUrl: item.thumbnail ? { value: String(item.thumbnail).replace('http://', 'https://'), source: 'mercadolibre-public-api', observedAt: now } : undefined,
      assetRights: 'PLATFORM_PROVIDED',
    }));
  }
}

export interface ManualAffiliateLinkInput {
  product: ProductTruth;
  affiliateUrl: string;
  source: string;
}

export function attachManualAffiliateLink(input: ManualAffiliateLinkInput): ProductTruth {
  const url = new URL(input.affiliateUrl);
  if (url.protocol !== 'https:') throw new Error('AFFILIATE_URL_MUST_BE_HTTPS');
  return {
    ...input.product,
    affiliateUrl: {
      value: input.affiliateUrl,
      source: input.source,
      observedAt: new Date().toISOString(),
    },
  };
}
