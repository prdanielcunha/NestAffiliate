import { describe, expect, it } from 'vitest';
import type { ProductTruth } from '../../packages/core/src/index';
import {
  SHOPEE_AFFILIATE_CAPABILITIES,
  buildShopeeOfficialSearchUrl,
  buildShopeePinterestSearchTerm,
  parseShopeeProductReference,
} from '../../packages/integrations/src/index';
import { buildSearchSignal } from '../../packages/radar/src/index';

describe('Shopee integration contract', () => {
  it('builds an official Shopee search URL without scraping', () => {
    const url = new URL(buildShopeeOfficialSearchUrl('organizador cozinha pequena'));
    expect(url.hostname).toBe('shopee.com.br');
    expect(url.pathname).toBe('/search');
    expect(url.searchParams.get('keyword')).toBe('organizador cozinha pequena');
  });

  it('extracts stable shop and item ids from canonical product URLs', () => {
    expect(parseShopeeProductReference('https://shopee.com.br/Produto-i.12345.987654321')).toEqual({
      shopId:'12345',
      itemId:'987654321',
      canonicalKey:'shopee:12345:987654321',
    });
    expect(parseShopeeProductReference('https://shopee.com.br/product/12345/987654321')).toEqual({
      shopId:'12345',
      itemId:'987654321',
      canonicalKey:'shopee:12345:987654321',
    });
  });

  it('keeps official Pinterest capabilities separate from a nonexistent public affiliate search API', () => {
    expect(SHOPEE_AFFILIATE_CAPABILITIES.pinterestProductSearch).toBe(true);
    expect(SHOPEE_AFFILIATE_CAPABILITIES.automaticAffiliateLinkOnTag).toBe(true);
    expect(SHOPEE_AFFILIATE_CAPABILITIES.maxProductsPerPin).toBe(5);
    expect(SHOPEE_AFFILIATE_CAPABILITIES.subIdTracking).toBe(true);
    expect(SHOPEE_AFFILIATE_CAPABILITIES.inAppProgrammaticCatalogSearch).toBe(false);
    expect(SHOPEE_AFFILIATE_CAPABILITIES.privatePanelScrapingAllowed).toBe(false);
  });

  it('labels assisted Shopee research with conservative confidence', () => {
    const signal=buildSearchSignal({
      marketplace:'SHOPEE',
      keyword:'organizador cozinha',
      resultCount:25,
      confidence:0.95,
    });
    expect(signal.source).toBe('SHOPEE_SEARCH_ASSISTED');
    expect(signal.confidence).toBeLessThanOrEqual(0.72);
  });

  it('builds a compact Pinterest product search term from Product Truth', () => {
    const now=new Date().toISOString();
    const product:ProductTruth={
      productId:'shopee:1',
      organizationId:'org',
      marketplace:'SHOPEE',
      externalId:'987',
      title:{value:'  Organizador   premium para cozinha pequena  ',source:'test',observedAt:now},
      url:{value:'https://shopee.com.br/Produto-i.123.987',source:'test',observedAt:now},
      currency:{value:'BRL',source:'test',observedAt:now},
      availability:{value:'unknown',source:'test',observedAt:now},
      assetRights:'UNKNOWN',
    };
    expect(buildShopeePinterestSearchTerm(product)).toBe('Organizador premium para cozinha pequena');
  });
});
