import { describe, expect, it } from 'vitest';
import type { ProductTruth } from '@nestaffiliate/core';
import {
  buildPinterestCreativePack,
  buildSceneProfile,
  computeCoverCrop,
  detectImageMime,
  validateImageMetadata,
  validatePromptClaims,
  versionPinterestCreativePack,
} from '@nestaffiliate/creative-engine';

const now='2026-10-02T12:00:00.000Z';

function product(title:string,rights:ProductTruth['assetRights']='AUTHORIZED'):ProductTruth{
  return {
    productId:'p1',
    organizationId:'org1',
    marketplace:'MELI',
    externalId:'MLB-1',
    title:{value:title,source:'fixture',observedAt:now},
    url:{value:'https://www.mercadolivre.com.br/produto',source:'fixture',observedAt:now},
    currency:{value:'BRL',source:'fixture',observedAt:now},
    availability:{value:'available',source:'fixture',observedAt:now},
    assetRights:rights,
  };
}

describe('Pinterest Creative Pack',()=>{
  it('maps bathroom products to a coherent bathroom scene',()=>{
    const scene=buildSceneProfile({
      product:product('Ralo linear inox para box de banheiro'),
      keyword:'ralo banheiro',
      boardName:'Organização de Banheiro',
    });
    expect(scene.category).toBe('bathroom-accessories');
    expect(scene.environment.toLowerCase()).toContain('banheiro');
    expect(scene.negativeSpace.length).toBeGreaterThan(8);
    expect(scene.confidence).toBeGreaterThan(.7);
  });

  it('generates the complete zero-cost pack with three distinct concepts and prompts',()=>{
    const pack=buildPinterestCreativePack({
      organizationId:'org1',
      campaignId:'c1',
      campaignVersion:2,
      product:product('Organizador giratório para cozinha'),
      keyword:'organização de cozinha',
      boardName:'Organização de Cozinha',
      locale:'pt-BR',
      createdAt:now,
    });
    expect(pack.copy.titles).toHaveLength(3);
    expect(pack.copy.descriptions).toHaveLength(2);
    expect(pack.copy.keywords.length).toBeGreaterThanOrEqual(8);
    expect(pack.copy.keywords.length).toBeLessThanOrEqual(12);
    expect(pack.imageConcepts).toHaveLength(3);
    expect(new Set(pack.imageConcepts.map((concept)=>concept.angle)).size).toBe(3);
    expect(pack.imageConcepts.every((concept)=>concept.imagePrompt.prompt.includes('1000x1500'))).toBe(true);
    expect(pack.imageConcepts.every((concept)=>concept.imagePrompt.prompt.includes('2:3'))).toBe(true);
    expect(pack.imageConcepts.every((concept)=>/No embedded text|Sem nenhum texto incorporado/i.test(concept.imagePrompt.prompt))).toBe(true);
    expect(pack.imageConcepts.every((concept)=>!concept.imagePrompt.prompt.includes('129.9'))).toBe(true);
    expect(pack.technical).toEqual(expect.objectContaining({width:1000,height:1500,ratio:'2:3',embeddedText:false}));
    expect(pack.copy.recommendedBoardName).toBe('Organização de Cozinha');
  });

  it('versions a pack without silently overwriting prompt history',()=>{
    const pack=buildPinterestCreativePack({
      organizationId:'org1',campaignId:'c1',campaignVersion:2,
      product:product('Luminária de mesa'),keyword:'luminária quarto',locale:'pt-BR',createdAt:now,
    });
    const selected=pack.imageConcepts[1]!;
    const next=versionPinterestCreativePack(pack,3,selected.id);
    expect(next.id).not.toBe(pack.id);
    expect(next.campaignVersion).toBe(3);
    expect(next.recommendedConceptId).not.toBe(selected.id);
    expect(next.imageConcepts.find((item)=>item.id===next.recommendedConceptId)?.angle).toBe(selected.angle);
    expect(next.imageConcepts.every((concept)=>concept.imagePrompt.campaignVersion===3)).toBe(true);
  });

  it('blocks unverified commercial claims in prompts',()=>{
    expect(validatePromptClaims('produto mais vendido do Brasil').outcome).toBe('BLOCK');
    expect(validatePromptClaims('imagem editorial natural sem alterar o produto').outcome).toBe('PASS');
  });
});

describe('AI image normalization contracts',()=>{
  it('validates metadata and requests normalization without stretching',()=>{
    const result=validateImageMetadata({mimeType:'image/png',bytes:200_000,width:1200,height:1200});
    expect(result.valid).toBe(true);
    expect(result.warnings).toContain('NORMALIZATION_REQUIRED');
    const crop=computeCoverCrop({width:1200,height:1200});
    expect(crop.sw/crop.sh).toBeCloseTo(2/3,5);
    expect(crop.sx).toBeGreaterThan(0);
  });

  it('recognizes PNG/JPEG/WebP magic bytes',()=>{
    expect(detectImageMime(new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))).toBe('image/png');
    expect(detectImageMime(new Uint8Array([0xff,0xd8,0xff,0x00]))).toBe('image/jpeg');
    expect(detectImageMime(new Uint8Array([82,73,70,70,0,0,0,0,87,69,66,80]))).toBe('image/webp');
  });

  it('rejects unsupported or undersized files',()=>{
    const result=validateImageMetadata({mimeType:'image/gif',bytes:100,width:300,height:300});
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('UNSUPPORTED_MIME');
    expect(result.errors).toContain('RESOLUTION_TOO_LOW');
  });
});
