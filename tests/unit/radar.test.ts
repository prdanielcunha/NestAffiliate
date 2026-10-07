import { describe, expect, it } from 'vitest';
import type { ProductTruth } from '../../packages/core/src/index';
import { affiliateTrackingCode, buildMeliBestSellerSignal, buildMeliTrendSignal, buildOpportunity, buildSearchSignal, buildShopeeManualSignals, dedupeProducts, isCommerceReadyProduct, keywordCluster, normalizeSearchText, parseMeliHighlightsPayload, parseMeliTrendsPayload, shortlist } from '../../packages/radar/src/index';

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


it('parses the official Mercado Livre trends payload by documented position bands',()=>{
  const payload=Array.from({length:50},(_,index)=>({keyword:`keyword ${index+1}`,url:'https://lista.mercadolivre.com.br/x'}));
  const signals=parseMeliTrendsPayload(payload,'2026-10-02T00:00:00.000Z');
  expect(signals).toHaveLength(50);
  expect(signals[0]?.source).toBe('MELI_TREND_GROWTH');
  expect(signals[10]?.source).toBe('MELI_TREND_DESIRED');
  expect(signals[30]?.source).toBe('MELI_TREND_POPULAR');
});

it('parses official Mercado Livre highlights into product-specific bestseller evidence',()=>{
  const signals=parseMeliHighlightsPayload({
    content:[
      {id:'MLB111',position:1,type:'ITEM'},
      {id:'MLB222',position:2,type:'ITEM'},
    ],
  },'2026-10-02T00:00:00.000Z');
  expect(signals).toHaveLength(2);
  expect(signals[0]?.productExternalId).toBe('MLB111');
  expect(signals[0]?.rank).toBe(1);
  expect(signals[0]?.source).toBe('MELI_BEST_SELLER');
});


it('only considers stocked products with meaningful verified sales commerce-ready',()=>{
  const strong={
    ...product('MLB-STRONG','Organizador forte'),
    listingVerified:true,
    soldQuantity:{value:320,source:'fixture',observedAt:now},
    availableQuantity:{value:14,source:'fixture',observedAt:now},
    imageUrl:{value:'https://http2.mlstatic.com/D_TEST.jpg',source:'fixture',observedAt:now},
  } satisfies ProductTruth;
  expect(isCommerceReadyProduct(strong,100)).toBe(true);
  expect(isCommerceReadyProduct({...strong,soldQuantity:{...strong.soldQuantity!,value:5}},100)).toBe(false);
  expect(isCommerceReadyProduct({...strong,availableQuantity:{...strong.availableQuantity!,value:0}},100)).toBe(false);
  expect(isCommerceReadyProduct({...strong,availability:{...strong.availability,value:'unavailable'}},100)).toBe(false);
});

it('treats search results as supply density, not verified demand',()=>{
  const many=buildSearchSignal({marketplace:'MELI',keyword:'organizador',resultCount:200,confidence:0.95});
  const few=buildSearchSignal({marketplace:'MELI',keyword:'organizador',resultCount:2,confidence:0.95});
  expect(many.kind).toBe('SUPPLY_DENSITY');
  expect(many.label).toContain('não comprova demanda');
  expect(many.evidence).toEqual(['anúncios retornados:200']);
  const item=product('MLB-1','Organizador');
  const manyDemand=buildOpportunity(item,'organizador',{signals:[many]});
  const fewDemand=buildOpportunity(item,'organizador',{signals:[few]});
  expect(manyDemand.score.dimensions.trend).toBe(fewDemand.score.dimensions.trend);
});

it('ignores legacy demand claims built from search result counts',()=>{
  const legacy={...buildSearchSignal({marketplace:'MELI',keyword:'organizador',resultCount:200,confidence:1}),kind:'DEMAND' as const};
  const item=product('MLB-1','Organizador');
  const baseline=buildOpportunity(item,'organizador',{signals:[]});
  const legacyRanked=buildOpportunity(item,'organizador',{signals:[legacy]});
  expect(legacyRanked.score.dimensions.trend).toBe(baseline.score.dimensions.trend);
});

it('never promotes unknown sales or unresolved catalog items as verified offers',()=>{
  const item={...product('MLB-1','Organizador'),listingVerified:true,
    imageUrl:{value:'https://example.com/item.jpg',source:'fixture',observedAt:now},
    soldQuantity:{value:160,source:'fixture',observedAt:now}
  } satisfies ProductTruth;
  expect(isCommerceReadyProduct(item)).toBe(true);
  expect(isCommerceReadyProduct({...item,soldQuantity:undefined})).toBe(false);
  expect(isCommerceReadyProduct({...item,soldQuantity:{...item.soldQuantity,value:Number.NaN}})).toBe(false);
  expect(isCommerceReadyProduct({...item,listingVerified:undefined})).toBe(false);
  expect(isCommerceReadyProduct({...item,listingVerified:false,catalogProductId:'MLB-CATALOG'})).toBe(false);
  expect(isCommerceReadyProduct({...item,availability:{...item.availability,value:'unknown'}})).toBe(false);
});
