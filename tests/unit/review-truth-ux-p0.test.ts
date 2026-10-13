import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { detectUnsupportedPinClaims, runPublishingGuard } from '../../packages/compliance/src/index';
import type { ProductTruth } from '../../packages/core/src/index';

const time='2026-10-13T14:52:00.000Z';
const product:ProductTruth={
  organizationId:'test-org',productId:'test-product',marketplace:'MELI',externalId:'MLB123',
  title:{value:'Conjunto de panelas antiaderente 10 peças preto e bege',source:'user-provided',observedAt:time},
  url:{value:'https://mercadolivre.com.br/test',source:'fixture',observedAt:time},
  affiliateUrl:{value:'https://meli.la/test',source:'fixture',observedAt:time},
  currency:{value:'BRL',source:'fixture',observedAt:time},
  availability:{value:'available',source:'fixture',observedAt:time},
  assetRights:'AUTHORIZED',
};

describe('P0 review: unverified AI claims remain blocked throughout publication',()=>{
  const unsupported=[
    'Com revestimento Teflon, elas cozinham sem a necessidade de óleo.',
    'Facilitam o preparo de refeições rápidas e saudáveis.',
    'O design ergonômico garante conforto ao manusear.',
    'São leves mas resistentes, mantendo o calor de maneira uniforme.',
    'O revestimento facilita a limpeza, economizando tempo e esforço.',
    'Cores vibrantes combinam com a decoração.',
    'Panelas antiaderentes para cozinhar sem óleo.',
  ];
  it.each(unsupported)('recognizes unsupported performance: %s',(value)=>{
    expect(detectUnsupportedPinClaims(value).length).toBeGreaterThan(0);
  });
  it('does not reject verifiable, neutral shopping copy',()=>{
    expect(detectUnsupportedPinClaims('Jogo de panelas antiaderente 10 peças preto e bege. Confira fotos, composição do kit, preço e condições no anúncio. Conteúdo com link de afiliado.')).toEqual([]);
  });
  it('blocks an older saved, AI-approved description before publication',()=>{
    const result=runPublishingGuard({
      product,
      disclosure:'Conteúdo com link de afiliado.',
      destinationUrl:'https://meli.la/test',
      headline:'Conjunto de panelas 10 peças',
      description:'O revestimento facilita a limpeza e economiza tempo. Cozinham sem a necessidade de óleo. Conteúdo com link de afiliado.',
    });
    expect(result.outcome).toBe('BLOCK');
    expect(result.checks.find(check=>check.key==='claims')?.outcome).toBe('BLOCK');
  });
  it('keeps 3 AI or local descriptions transparent and visually selectable',()=>{
    const ai=readFileSync('apps/web/src/features/NestAiDraftReview.tsx','utf8');
    const pack=readFileSync('apps/web/src/features/PinterestCreativePack.tsx','utf8');
    const images=readFileSync('apps/web/src/features/ImagePromptPanel.tsx','utf8');
    const guided=readFileSync('apps/web/src/features/GuidedReviewActions.tsx','utf8');
    expect(ai).toContain('hasLocalThird');
    expect(ai).toContain('Alternativa local');
    expect(pack).toContain('className="creative-image-method"');
    expect(pack).toContain('className="pack-technical-details"');
    expect(pack).toContain('.filter(safe)');
    expect(images).toContain('unsafePrompt');
    expect(guided).toContain('guided-copy-truth-warning');
  });
});
