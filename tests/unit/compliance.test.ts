import { describe, expect, it } from 'vitest';
import { runPublishingGuard } from '../../packages/compliance/src/index';
import type { ProductTruth } from '../../packages/core/src/index';

const product: ProductTruth = {
  productId: 'p1',
  organizationId: 'o1',
  marketplace: 'MELI',
  externalId: 'MLB1',
  title: { value: 'Organizador', source: 'fixture', observedAt: new Date().toISOString() },
  url: { value: 'https://example.com/p', source: 'fixture', observedAt: new Date().toISOString() },
  affiliateUrl: { value: 'https://example.com/affiliate/p', source: 'fixture', observedAt: new Date().toISOString() },
  currency: { value: 'BRL', source: 'fixture', observedAt: new Date().toISOString() },
  availability: { value: 'available', source: 'fixture', observedAt: new Date().toISOString() },
  assetRights: 'AUTHORIZED',
};

describe('Publishing Guard', () => {
  it('passes a clean package', () => {
    const result = runPublishingGuard({
      product,
      disclosure: 'Conteúdo com link de afiliado. Posso receber comissão.',
      destinationUrl: 'https://example.com/p',
      headline: 'Mais espaço para uma cozinha pequena',
      description: 'Uma ideia prática para organizar melhor a bancada.',
    });
    expect(result.outcome).toBe('PASS');
  });

  it('blocks Mercado Livre publication without an affiliate link', () => {
    const { affiliateUrl: _affiliateUrl, ...withoutAffiliate } = product;
    const result = runPublishingGuard({
      product: withoutAffiliate,
      disclosure: 'Conteúdo com link de afiliado. Posso receber comissão.',
      destinationUrl: 'https://example.com/p',
      headline: 'Uma ideia prática',
      description: 'Veja a ideia.',
    });
    expect(result.outcome).toBe('BLOCK');
    expect(result.checks.find((check) => check.key === 'affiliate-link')?.outcome).toBe('BLOCK');
  });

  it('blocks fabricated superlative claims', () => {
    const result = runPublishingGuard({
      product,
      disclosure: 'Conteúdo com link de afiliado. Posso receber comissão.',
      destinationUrl: 'https://example.com/p',
      headline: 'O melhor do Brasil',
      description: 'Veja a ideia.',
    });
    expect(result.outcome).toBe('BLOCK');
  });
});
