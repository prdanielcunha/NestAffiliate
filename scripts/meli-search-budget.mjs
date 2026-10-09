/** Bounded background discovery protects interactive searches from API quota exhaustion.
 * Preserve all catalog candidates as research; resolve commercial buy boxes only
 * for a small top-ranked sample, never fabricate missing price/stock/sales.
 */
export const MELI_BACKGROUND_RESEARCH_LIMITS=Object.freeze({
  catalogCandidates:20,
  detailLookupsPerQuery:5,
  parentLookupsPerQuery:2,
  retryAttempts:2,
  minimumSpacingMs:650,
  highlightsPerSync:18,
});
export function catalogResolutionSelection(candidates,{detailLookupsPerQuery=MELI_BACKGROUND_RESEARCH_LIMITS.detailLookupsPerQuery,parentLookupsPerQuery=MELI_BACKGROUND_RESEARCH_LIMITS.parentLookupsPerQuery}={}){
  if(!Array.isArray(candidates))throw new Error('INVALID_CATALOG_CANDIDATES');
  const safeBudget=Math.min(Math.max(0,Math.floor(detailLookupsPerQuery)),20);
  const parentBudget=Math.min(Math.max(0,Math.floor(parentLookupsPerQuery)),safeBudget);
  return candidates.slice(0,safeBudget).map((candidate,index)=>({candidate,allowParentSearch:index<parentBudget}));
}

/** USER_PRODUCT refers to seller-owned resources; without seller-specific
 * OAuth consent, a research app must not query /user-products or private
 * /users/:seller/items/search routes.
 */
export function isSellerPrivateHighlight(type,id){
 const kind=String(type||'').toUpperCase(),value=String(id||'');
 return kind==='USER_PRODUCT'||/^MLBU\d+$/.test(value);
}
