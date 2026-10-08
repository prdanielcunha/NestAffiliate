import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isReadyCampaignOffer, classifyExistingCampaignRefresh } from '../../scripts/revenue-offer-gates.mjs';

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

test('existing campaign never switches to a different SKU by title similarity',()=>{
  const prior={...valid,externalId:'MLB-PINK-23'};
  assert.equal(classifyExistingCampaignRefresh(prior,{...valid,externalId:'MLB-PINK-24'}),'IDENTITY_MISMATCH');
});
test('missing sales or a lower sales count does not auto-block old campaigns',()=>{
  const prior={...valid,externalId:'MLB-EXISTING'};
  assert.equal(classifyExistingCampaignRefresh(prior,{...prior,soldQuantity:undefined}),'SALES_UNOBSERVED');
  assert.equal(classifyExistingCampaignRefresh(prior,{...prior,soldQuantity:{value:30}}),'LEGACY_SALES_BELOW_AUTO_THRESHOLD');
  assert.equal(classifyExistingCampaignRefresh(prior,null),'SOURCE_UNAVAILABLE');
});
test('confirmed unavailable offers still block, exact verified offers can refresh',()=>{
  const prior={...valid,externalId:'MLB-EXISTING'};
  assert.equal(classifyExistingCampaignRefresh(prior,{...prior,availableQuantity:{value:0}}),'CONFIRMED_UNAVAILABLE');
  assert.equal(classifyExistingCampaignRefresh(prior,{...prior,availability:{value:'unavailable'}}),'CONFIRMED_UNAVAILABLE');
  assert.equal(classifyExistingCampaignRefresh(prior,{...prior,listingVerified:false}),'LISTING_UNRESOLVED');
  assert.equal(classifyExistingCampaignRefresh(prior,prior),'SAFE_TO_REFRESH');
});
