import { describe, expect, it } from 'vitest';
import { slugifyFilename } from '../../packages/creative-engine/src/index';

describe('creative filename', () => {
  it('normalizes accents and unsafe characters', () => {
    expect(slugifyFilename('Cozinha Pequena & Organização!')).toBe('cozinha-pequena-organizacao');
  });
});
