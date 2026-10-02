import { describe, expect, it } from 'vitest';
import { calculateDuplicateSimilarity, isSafeExternalUrl, maxDuplicateSimilarity, runPublishingGuard } from '../../packages/compliance/src/index';
import type { CreativeAsset, ProductTruth } from '../../packages/core/src/index';

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
    const withoutAffiliate: ProductTruth = { ...product, affiliateUrl: undefined };
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


  it('blocks an imported AI asset until visual fidelity and embedded-text checks are confirmed', () => {
    const asset:CreativeAsset={
      id:'asset1',organizationId:'o1',campaignId:'c1',origin:'MANUAL_CHATGPT',rightsStatus:'GENERATED',
      mimeType:'image/png',width:1000,height:1500,originalWidth:1000,originalHeight:1500,
      hash:'abc',embeddedTextConfirmedAbsent:false,productFidelityConfirmed:false,createdAt:new Date().toISOString(),
    };
    const result=runPublishingGuard({
      product,
      creativeAsset:asset,
      disclosure:'Conteúdo com link de afiliado. Posso receber comissão.',
      destinationUrl:'https://example.com/p',
      headline:'Organização prática',
      description:'Uma ideia editorial.',
    });
    expect(result.outcome).toBe('BLOCK');
    expect(result.checks.find((check)=>check.key==='creative-fidelity')?.outcome).toBe('BLOCK');
    expect(result.checks.find((check)=>check.key==='creative-embedded-text')?.outcome).toBe('BLOCK');
  });
});


it('blocks when configured editorial frequency is exhausted', () => {
  const result = runPublishingGuard({
    product,
    disclosure: 'Conteúdo com link de afiliado. Posso receber comissão.',
    destinationUrl: 'https://example.com/p',
    headline: 'Organização para cozinha',
    description: 'Uma ideia prática.',
    frequencyPolicy: { maxPublications24h: 5, publications24h: 5 },
  });
  expect(result.outcome).toBe('BLOCK');
  expect(result.checks.find((check) => check.key === 'frequency-daily')?.outcome).toBe('BLOCK');
});


describe('Duplicate and URL guards', () => {
  const fingerprint = {
    productId: 'p1',
    imageUrl: 'https://example.com/image.png',
    headline: 'Organize sua cozinha pequena',
    description: 'Uma ideia prática para ganhar espaço na bancada.',
    template: 'Editorial Premium',
    board: 'Cozinha Pequena e Organizada',
    keyword: 'organizador cozinha pequena',
    publishedAt: new Date().toISOString(),
  };

  it('blocks a practically identical recent publication', () => {
    const similarity = calculateDuplicateSimilarity(fingerprint, { ...fingerprint });
    expect(similarity).toBeGreaterThanOrEqual(0.92);

    const result = runPublishingGuard({
      product,
      disclosure: 'Conteúdo com link de afiliado. Posso receber comissão.',
      destinationUrl: 'https://example.com/p',
      headline: fingerprint.headline,
      description: fingerprint.description,
      duplicateSimilarity: similarity,
    });
    expect(result.checks.find((check) => check.key === 'duplicate')?.outcome).toBe('BLOCK');
  });

  it('allows same product when editorial treatment materially changes', () => {
    const similarity = calculateDuplicateSimilarity(fingerprint, {
      ...fingerprint,
      imageUrl: 'https://example.com/new-image.png',
      headline: 'Como liberar a bancada sem reforma',
      description: 'Três usos diferentes para aproveitar melhor um canto esquecido.',
      template: 'Problem → Solution',
      board: 'Achados Inteligentes para Casa',
      keyword: 'bancada sem reforma',
    });
    expect(similarity).toBeLessThan(0.8);
  });

  it('ignores old publications outside the lookback window', () => {
    const old = { ...fingerprint, publishedAt: '2025-01-01T00:00:00.000Z' };
    expect(maxDuplicateSimilarity(fingerprint, [old], new Date('2026-10-01T00:00:00.000Z'), 30)).toBe(0);
  });

  it('rejects localhost, private network and credential-bearing URLs', () => {
    expect(isSafeExternalUrl('https://example.com/path')).toBe(true);
    expect(isSafeExternalUrl('http://example.com/path')).toBe(false);
    expect(isSafeExternalUrl('https://localhost/path')).toBe(false);
    expect(isSafeExternalUrl('https://192.168.1.20/path')).toBe(false);
    expect(isSafeExternalUrl('https://user:pass@example.com/path')).toBe(false);
  });
});
