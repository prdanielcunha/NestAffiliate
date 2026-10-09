import test from 'node:test';
import assert from 'node:assert/strict';
import {MELI_BACKGROUND_RESEARCH_LIMITS,catalogResolutionSelection,isSellerPrivateHighlight} from '../../scripts/meli-search-budget.mjs';
test('background resolver does not fan out dozens of catalog detail requests',()=>{
 const rows=Array.from({length:20},(_,i)=>({id:'MLB'+i}));
 const chosen=catalogResolutionSelection(rows);
 assert.equal(chosen.length,5);
 assert.equal(chosen.filter(x=>x.allowParentSearch).length,2);
 assert.equal(rows.length,20); // all original candidates remain available for research
});
test('even invalid or oversized settings never exceed 20 and preserve ordering',()=>{
 const rows=Array.from({length:100},(_,i)=>i);
 assert.equal(catalogResolutionSelection(rows,{detailLookupsPerQuery:1000,parentLookupsPerQuery:1000}).length,20);
 assert.deepEqual(catalogResolutionSelection(rows,{detailLookupsPerQuery:3,parentLookupsPerQuery:1}).map(x=>x.candidate),[0,1,2]);
});
test('quota-aware defaults cap retries and background traffic',()=>{
 assert.equal(MELI_BACKGROUND_RESEARCH_LIMITS.retryAttempts,2);
 assert.ok(MELI_BACKGROUND_RESEARCH_LIMITS.minimumSpacingMs>=650);
 assert.ok(MELI_BACKGROUND_RESEARCH_LIMITS.highlightsPerSync<=18);
});

test('seller-owned USER_PRODUCT highlights are not queried with an unrelated OAuth account',()=>{
 assert.equal(isSellerPrivateHighlight('USER_PRODUCT','MLBU123456'),true);
 assert.equal(isSellerPrivateHighlight('','MLBU99999'),true);
 assert.equal(isSellerPrivateHighlight('PRODUCT','MLB123'),false);
 assert.equal(isSellerPrivateHighlight('ITEM','MLB123'),false);
});
