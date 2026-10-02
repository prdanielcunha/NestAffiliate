import { describe, expect, it } from 'vitest';
import type { ProductTruth } from '../../packages/core/src/index';
import { affiliateTrackingCode, buildMeliBestSellerSignal, buildMeliTrendSignal, buildOpportunity, buildShopeeManualSignals, dedupeProducts, keywordCluster, normalizeSearchText, shortlist } from '../../packages/radar/src/index';

const now = new Date().toISOString();
function product(id:string,title:string): ProductTruth {
  return {
    productId:id, organizationId:'org-a', marketplace:'MELI', externalId:id,
    title:{value:title,source:'fixture',observedAt:now},
    url:{value:'https://example.com/'+id,source:'fixture',observedAt:now},
    price:{value:79.9,source:'fixture',observedAt:now},
    currency:{value:'BRL',source:'fixture',observedAt:now},
    sellerName:{value:'Loja',source:'fixture',observedAt:now},
    availability:{value:'available',source:'fixture',observedAt:now},
    assetRights:'UNKNOWN',
  };
}

describe('radar engine', () => {
  it('normalizes accents and clusters intent', () => {
    expect(normalizeSearchText('Organização de Cozinha!')).toBe('organizacao de cozinha');
    expect(keywordCluster('organizador cozinha pequena')).toContain('cozinha');
  });

  it('deduplicates near-identical product titles', () => {
    const items=dedupeProducts([
      product('1','Organizador giratório cozinha 360'),
      product('2','Organizador cozinha giratório 360 graus'),
      product('3','Prateleira de banheiro'),
    ]);
    expect(items.length).toBe(2);
  });

  it('builds explainable shortlist', () => {
    const result=shortlist([product('1','Organizador cozinha'),product('2','Cesto cozinha')],'organizador cozinha',2);
    expect(result.length).toBe(2);
    expect(result[0]!.score.score).toBeGreaterThan(0);
    expect(buildOpportunity(product('1','Organizador cozinha'),'organizador cozinha').reasons.length).toBeGreaterThan(1);
  });
});


it('turns official Mercado Livre positions into stronger demand signals',()=>{
  const growth=buildMeliTrendSignal({position:1,keyword:'organizador cozinha'});
  const desired=buildMeliTrendSignal({position:15,keyword:'organizador cozinha'});
  const popular=buildMeliTrendSignal({position:45,keyword:'organizador cozinha'});
  expect(growth.source).toBe('MELI_TREND_GROWTH');
  expect(growth.strength).toBeGreaterThan(desired.strength);
  expect(desired.strength).toBeGreaterThan(popular.strength);
});

it('boosts a bestseller opportunity without changing the 100 point ceiling',()=>{
  const item=product('MLB1','Organizador cozinha');
  const baseline=buildOpportunity(item,'organizador cozinha');
  const ranked=buildOpportunity(item,'organizador cozinha',{
    signals:[buildMeliBestSellerSignal({position:1,productExternalId:'MLB1'})],
  });
  expect(ranked.score.score).toBeGreaterThanOrEqual(baseline.score.score);
  expect(ranked.score.score).toBeLessThanOrEqual(100);
  expect(ranked.rankingReasons.some((reason)=>reason.includes('#1'))).toBe(true);
});

it('captures Shopee commission as commercial yield evidence',()=>{
  const signals=buildShopeeManualSignals({
    type:'SHOPEE_EXTRA_COMMISSION',
    keyword:'organizador cozinha',
    productExternalId:'SHP1',
    commissionRate:0.15,
  });
  expect(signals.some((signal)=>signal.kind==='YIELD')).toBe(true);
  expect(signals[0]?.commissionRate).toBe(0.15);
});

it('creates stable affiliate tracking labels',()=>{
  expect(affiliateTrackingCode({
    marketplace:'MELI',
    keyword:'organizador cozinha pequena',
    seed:'MLB-123456',
  })).toBe('NA_ML_ORGANIZADOR_COZINHA_PEQUENA_123456');
});
