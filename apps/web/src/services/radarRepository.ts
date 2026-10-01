import { doc, serverTimestamp, writeBatch, type Firestore } from 'firebase/firestore';
import type { ProductTruth } from '@nestaffiliate/core';
import { keywordCluster } from '@nestaffiliate/radar';

export async function recordRadarSignal(input:{
  db:Firestore;
  organizationId:string;
  query:string;
  products:ProductTruth[];
}){
  const normalized=input.query.trim().toLowerCase();
  if(!normalized) return;
  const id=`marketplace-${crypto.randomUUID()}`;
  const cluster=keywordCluster(input.query);
  const priced=input.products.filter((product)=>product.price).length;
  const imaged=input.products.filter((product)=>product.imageUrl).length;
  const batch=writeBatch(input.db);
  batch.set(doc(input.db,'organizations',input.organizationId,'products','nestaffiliate','trendSignals',id),{
    organizationId:input.organizationId,
    source:'MARKETPLACE',
    keyword:input.query.trim(),
    strength:Math.min(1,input.products.length/20),
    confidence:input.products.length ? Math.min(1,(priced+imaged)/(input.products.length*2)) : 0,
    evidence:[`products:${input.products.length}`,`priced:${priced}`,`imaged:${imaged}`],
    observedAt:new Date().toISOString(),
    createdAt:serverTimestamp(),
  });
  batch.set(doc(input.db,'organizations',input.organizationId,'products','nestaffiliate','trendClusters',normalized.replace(/[^a-z0-9]+/g,'-').slice(0,80)),{
    organizationId:input.organizationId,
    keyword:input.query.trim(),
    terms:cluster,
    source:'RULE_ENGINE',
    updatedAt:serverTimestamp(),
  },{merge:true});
  await batch.commit();
}
