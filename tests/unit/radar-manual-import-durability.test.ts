import { describe, expect, it } from 'vitest';
import type { Campaign } from '@nestaffiliate/core';
import { stripUndefinedFields } from '../../apps/web/src/services/firestorePayload';
import { mergePendingCampaigns } from '../../apps/web/src/services/campaignSync';
import { createManualProductTruth, parseSharedProductText } from '../../packages/integrations/src/index';

function campaign(id: string, version: number): Campaign {
  return { id, organizationId: 'org', currentVersion: {
    id: id + '-v' + version, version, createdAt: new Date(version * 1000).toISOString(),
  }} as Campaign;
}

describe('manual import durability', () => {
  it('recognizes short MELI links and punctuation', () => {
    const result = parseSharedProductText('Conjunto Panelas 10 Peças\nhttps://meli.la/2GDhhKL,');
    expect(result.marketplace).toBe('MELI');
    expect(result.productUrl).toBe('https://meli.la/2GDhhKL');
  });
  it('does not send undefined fields from manual products to Firestore', () => {
    const product = createManualProductTruth({
      organizationId: 'org', marketplace: 'MELI',
      title: 'Conjunto Panelas', productUrl: 'https://meli.la/2GDhhKL',
    });
    const clean = stripUndefinedFields({ product, rank: undefined, nested: { image: undefined, keep: 0 } });
    expect(clean).not.toHaveProperty('rank');
    expect(clean.product).not.toHaveProperty('affiliateUrl');
    expect(clean.product).not.toHaveProperty('price');
    expect(clean.nested).toEqual({ keep: 0 });
  });
  it('preserves special Firestore instances', () => {
    class Sentinel { kind = 'timestamp'; }
    const special = new Sentinel();
    const cleaned = stripUndefinedFields({special, fields: [undefined, 1]});
    expect(cleaned.special).toBe(special);
    expect(cleaned.fields).toEqual([null, 1]);
  });
  it('keeps unsynced draft and unrelated remote campaigns', () => {
    const merged = mergePendingCampaigns(
      [campaign('edited', 1), campaign('other', 1)],
      [campaign('edited', 2), campaign('unsynced', 1)],
    );
    expect(merged).toHaveLength(3);
    expect(merged.find((item) => item.id === 'edited')?.currentVersion.version).toBe(2);
    expect(merged.some((item) => item.id === 'other')).toBe(true);
  });
  it('requires https for manual image URL', () => {
    expect(() => createManualProductTruth({
      organizationId: 'org', marketplace: 'MELI', title: 'Panelas',
      productUrl: 'https://meli.la/2GDhhKL', imageUrl: 'http://example.com/image.png',
    })).toThrow('IMAGE_URL_MUST_BE_HTTPS');
  });
});
