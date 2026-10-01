import { describe, expect, it } from 'vitest';
import { buildPromptPackage, LocalQuotaGuard, privacyGuard, ruleEngineCopy } from '../../packages/ai-router/src/index';

describe('zero-cost AI router helpers',()=>{
  it('redacts personal identifiers before prompt handoff',()=>{
    const result=privacyGuard('Fale com ana@example.com ou 43999998888 CPF 123.456.789-00');
    expect(result.sanitized).not.toContain('ana@example.com');
    expect(result.redactions).toContain('EMAIL');
    expect(result.redactions).toContain('CPF');
  });

  it('builds a truth-locked prompt package',()=>{
    const pkg=buildPromptPackage({
      capability:'copy_generation',
      provider:'MANUAL_CHATGPT',
      instruction:'Crie uma copy premium',
      facts:{title:'Organizador',marketplace:'MELI',price:79.9,currency:'BRL',availability:'available',sourceNotes:['mercadolibre-public-api']},
    });
    expect(pkg.prompt).toContain('Preço observado: 79.9 BRL');
    expect(pkg.system).toContain('Nunca invente');
  });

  it('keeps local quota deterministic',()=>{
    const q=new LocalQuotaGuard(2);
    expect(q.consume('GEMINI_FREE').allowed).toBe(true);
    expect(q.consume('GEMINI_FREE').allowed).toBe(true);
    expect(q.consume('GEMINI_FREE').allowed).toBe(false);
  });

  it('generates fallback copy without paid AI',()=>{
    const copy=ruleEngineCopy({keyword:'cozinha pequena',productTitle:'Organizador',tone:'premium'});
    expect(copy.headline).toMatch(/elegante/i);
    expect(copy.disclosure).toMatch(/afiliado/i);
  });
});
