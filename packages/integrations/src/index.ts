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
  read?(organizationId:string,externalId:string):Promise<ProductTruth>;
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
      assetRights: 'UNKNOWN',
    }));
  }

  async read(organizationId:string,externalId:string):Promise<ProductTruth>{
    const fields=[
      'body.id','body.title','body.permalink','body.price','body.currency_id',
      'body.available_quantity','body.thumbnail',
    ].join(',');
    const response=await fetch(
      `https://api.mercadolibre.com/items/bulk?ids=${encodeURIComponent(externalId)}&attributes=${encodeURIComponent(fields)}`,
    );
    if(!response.ok) throw new Error(`MELI_ITEM_${response.status}`);
    const payload=await response.json() as Array<{id?:string;status_code?:number;body?:Record<string,any>}>;
    const row=payload.find((item)=>item.id===externalId) ?? payload[0];
    if(!row || row.status_code!==200 || !row.body) throw new Error('MELI_ITEM_NOT_FOUND');
    const item=row.body;
    const now=new Date().toISOString();
    const quantity=typeof item.available_quantity==='number' ? item.available_quantity : undefined;
    return {
      productId:`meli:${String(item.id ?? externalId)}`,
      organizationId,
      marketplace:'MELI',
      externalId:String(item.id ?? externalId),
      title:{value:String(item.title ?? ''),source:'mercadolibre-items-bulk',observedAt:now},
      url:{value:String(item.permalink ?? ''),source:'mercadolibre-items-bulk',observedAt:now},
      price:typeof item.price==='number'
        ? {value:item.price,source:'mercadolibre-items-bulk',observedAt:now}
        : undefined,
      currency:{value:String(item.currency_id ?? 'BRL'),source:'mercadolibre-items-bulk',observedAt:now},
      availability:{
        value:quantity===0 ? 'unavailable' : typeof quantity==='number' ? 'available' : 'unknown',
        source:'mercadolivre-items-bulk',
        observedAt:now,
      },
      imageUrl:item.thumbnail
        ? {value:String(item.thumbnail).replace('http://','https://'),source:'mercadolivre-items-bulk',observedAt:now}
        : undefined,
      assetRights:'UNKNOWN',
    };
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


export interface ManualProductInput {
  organizationId: string;
  marketplace: 'SHOPEE' | 'MELI';
  externalId?: string;
  title: string;
  productUrl: string;
  affiliateUrl?: string;
  price?: number;
  currency?: string;
  imageUrl?: string;
  assetRights?: ProductTruth['assetRights'];
}

export function createManualProductTruth(input: ManualProductInput): ProductTruth {
  const productUrl = new URL(input.productUrl);
  if (productUrl.protocol !== 'https:') throw new Error('PRODUCT_URL_MUST_BE_HTTPS');
  let affiliateUrl: ProductTruth['affiliateUrl'];
  if (input.affiliateUrl?.trim()) {
    const parsed = new URL(input.affiliateUrl.trim());
    if (parsed.protocol !== 'https:') throw new Error('AFFILIATE_URL_MUST_BE_HTTPS');
    affiliateUrl = { value: parsed.toString(), source: 'user-provided', observedAt: new Date().toISOString() };
  }
  const now = new Date().toISOString();
  return {
    productId: `${input.marketplace.toLowerCase()}:manual:${input.externalId ?? crypto.randomUUID()}`,
    organizationId: input.organizationId,
    marketplace: input.marketplace,
    externalId: input.externalId ?? `manual-${Date.now()}`,
    title: { value: input.title.trim(), source: 'user-provided', observedAt: now },
    url: { value: productUrl.toString(), source: 'user-provided', observedAt: now },
    affiliateUrl,
    price: typeof input.price === 'number' && Number.isFinite(input.price)
      ? { value: Math.max(0, input.price), source: 'user-provided', observedAt: now }
      : undefined,
    currency: { value: input.currency?.trim() || 'BRL', source: 'user-provided', observedAt: now },
    availability: { value: 'unknown', source: 'user-provided', observedAt: now },
    imageUrl: input.imageUrl?.trim()
      ? { value: input.imageUrl.trim(), source: 'user-provided', observedAt: now }
      : undefined,
    assetRights: input.assetRights ?? 'UNKNOWN',
  };
}

export type PinterestAccessTier = 'NONE' | 'TRIAL' | 'STANDARD';

export interface PinterestConnectionState {
  connected: boolean;
  accessTier: PinterestAccessTier;
  scopes: string[];
  expiresAt?: string;
  accountName?: string;
}

export function canUsePinterestAnalytics(state: PinterestConnectionState) {
  return state.connected && ['TRIAL', 'STANDARD'].includes(state.accessTier) &&
    state.scopes.includes('pins:read');
}

export function canPublishPublicPinterestPin(state: PinterestConnectionState) {
  return state.connected && state.accessTier === 'STANDARD' &&
    state.scopes.includes('pins:write');
}

export function pinterestOAuthScopes() {
  return ['boards:read', 'boards:write', 'pins:read', 'pins:write', 'user_accounts:read'];
}

export interface PinterestBackendBroker {
  beginOAuth(returnTo: string): Promise<{ authorizationUrl: string }>;
  listBoards(): Promise<Array<{ id: string; name: string }>>;
  readPinAnalytics(pinId: string, startDate: string, endDate: string): Promise<Record<string, number>>;
  publishApprovedPin(input: {
    approvalEventId: string;
    boardId: string;
    title: string;
    description: string;
    link: string;
    altText: string;
    mediaUrl: string;
  }): Promise<{ pinId: string; url?: string }>;
}
