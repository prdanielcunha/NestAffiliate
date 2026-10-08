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
