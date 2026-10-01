import { describe, expect, it } from 'vitest';
import { CREATIVE_TEMPLATES, SAFE_MARGIN, slugifyFilename, templateFor } from '../../packages/creative-engine/src/index';

describe('creative filename', () => {
  it('normalizes accents and unsafe characters', () => {
    expect(slugifyFilename('Cozinha Pequena & Organização!')).toBe('cozinha-pequena-organizacao');
  });
});


describe('creative template contracts', () => {
  it('ships ten deterministic 2:3 template definitions', () => {
    expect(CREATIVE_TEMPLATES).toHaveLength(10);
    expect(new Set(CREATIVE_TEMPLATES.map((template) => template.id)).size).toBe(10);
    expect(SAFE_MARGIN).toBeGreaterThanOrEqual(64);
  });

  it('resolves legacy template labels without breaking campaigns', () => {
    expect(templateFor('Editorial Premium').id).toBe('editorial-premium');
    expect(templateFor('Problem → Solution').id).toBe('problem-solution');
    expect(templateFor('Minimal').id).toBe('minimal');
  });
});
