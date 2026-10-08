import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isReadyCampaignOffer } from '../../scripts/revenue-offer-gates.mjs';

const valid = {
  listingVerified: true,
  availability: { value: 'available' },
  availableQuantity: { value: 3 },
  soldQuantity: { value: 101 },
  imageUrl: { value: 'https://example.com/image.png' },
  url: { value: 'https://example.com/product' },
};

test('only resolved, stocked items with verified sales are READY-eligible', () => {
  assert.equal(isReadyCampaignOffer(valid), true);
  assert.equal(isReadyCampaignOffer({ ...valid, soldQuantity: undefined }), false);
  assert.equal(isReadyCampaignOffer({ ...valid, soldQuantity: { value: NaN } }), false);
  assert.equal(isReadyCampaignOffer({ ...valid, soldQuantity: { value: 10 } }), false);
  assert.equal(isReadyCampaignOffer({ ...valid, availableQuantity: { value: 0 } }), false);
  assert.equal(isReadyCampaignOffer({ ...valid, listingVerified: false, catalogProductId: 'CATALOG' }), false);
  assert.equal(isReadyCampaignOffer({ ...valid, listingVerified: undefined }), false);
  assert.equal(isReadyCampaignOffer({ ...valid, availability: { value: 'unknown' } }), false);
  assert.equal(isReadyCampaignOffer({ ...valid, imageUrl: undefined }), false);
});

test('min sales threshold must be an explicit provider criterion, not missing data', () => {
  assert.equal(isReadyCampaignOffer({ ...valid, soldQuantity: { value: 0 } }, 0), true);
  assert.equal(isReadyCampaignOffer({ ...valid, soldQuantity: undefined }, 0), false);
});
