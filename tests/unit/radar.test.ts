import { describe, expect, it } from 'vitest';
import type { ProductTruth } from '../../packages/core/src/index';
import { buildOpportunity, dedupeProducts, keywordCluster, normalizeSearchText, shortlist } from '../../packages/radar/src/index';

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
