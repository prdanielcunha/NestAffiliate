/**
 * READY campaigns require facts from a resolvable listing.
 * Catalog/research items remain opportunities, never assumed to be publishable.
 * Does not assert that an ordinary product URL is an affiliate tracking URL.
 */
export function isReadyCampaignOffer(product, minSoldQuantity = 100) {
  const sold = product?.soldQuantity?.value;
  const stock = product?.availableQuantity?.value;
  return product?.listingVerified === true &&
    product?.availability?.value === 'available' &&
    (typeof stock !== 'number' || (Number.isFinite(stock) && stock > 0)) &&
    typeof sold === 'number' && Number.isFinite(sold) &&
    sold >= minSoldQuantity &&
    typeof product?.imageUrl?.value === 'string' && Boolean(product.imageUrl.value) &&
    typeof product?.url?.value === 'string' && Boolean(product.url.value);
}

/** Preserve an existing campaign when provider metadata disappears or the SKU moves.
 * Manual publication continues to enforce its independent freshness/compliance gates.
 * A stricter auto-creation rule is NOT a migration rule for historical campaigns. */
export function classifyExistingCampaignRefresh(previous, observed, minSales=100){
  if(!previous?.externalId || !observed)return 'SOURCE_UNAVAILABLE';
  if(String(previous.externalId)!==String(observed.externalId))return 'IDENTITY_MISMATCH';
  if(observed.availability?.value==='unavailable' || observed.availableQuantity?.value===0)
    return 'CONFIRMED_UNAVAILABLE';
  if(observed.listingVerified!==true || observed.availability?.value!=='available')
    return 'LISTING_UNRESOLVED';
  if(!Number.isFinite(observed.soldQuantity?.value))return 'SALES_UNOBSERVED';
  if(observed.soldQuantity.value < minSales)return 'LEGACY_SALES_BELOW_AUTO_THRESHOLD';
  if(!observed.url?.value || !observed.imageUrl?.value)return 'SOURCE_INCOMPLETE';
  return 'SAFE_TO_REFRESH';
}
