import { doc, serverTimestamp, writeBatch, type Firestore } from 'firebase/firestore';
import type { Campaign } from '@nestaffiliate/core';
import { stripUndefinedFields } from './firestorePayload';

export async function persistCampaignIntelligence(db:Firestore,organizationId:string,campaign:Campaign){
  if(campaign.organizationId!==organizationId) throw new Error('TENANT_MISMATCH');
  const product=campaign.currentVersion.product;
  const root=['organizations',organizationId,'products','nestaffiliate'] as const;
  const observedAt=product.title.observedAt || new Date().toISOString();
  const snapshotId=`${product.marketplace}-${product.externalId}-${observedAt.replace(/[^0-9]/g,'').slice(0,14)}`;
  const opportunityId=`${campaign.id}-opportunity`;
  const batch=writeBatch(db);

  batch.set(doc(db,...root,'products',product.productId),stripUndefinedFields({
    ...product,
    organizationId,
    updatedAt:serverTimestamp(),
  }),{merge:true});

  batch.set(doc(db,...root,'productSnapshots',snapshotId),{
    organizationId,
    productId:product.productId,
    marketplace:product.marketplace,
    externalId:product.externalId,
    title:product.title,
    price:product.price ?? null,
    availability:product.availability,
    sellerName:product.sellerName ?? null,
    sellerReputation:product.sellerReputation ?? null,
    rating:product.rating ?? null,
    reviewCount:product.reviewCount ?? null,
    assetRights:product.assetRights,
    observedAt,
    createdAt:serverTimestamp(),
  });

  if(product.affiliateUrl || product.price){
    batch.set(doc(db,...root,'productOffers',`${product.marketplace}-${product.externalId}`),{
      organizationId,
      productId:product.productId,
      marketplace:product.marketplace,
      url:product.url,
      affiliateUrl:product.affiliateUrl ?? null,
      price:product.price ?? null,
      availability:product.availability,
      updatedAt:serverTimestamp(),
    },{merge:true});
  }

  batch.set(doc(db,...root,'opportunities',opportunityId),{
    organizationId,
    campaignId:campaign.id,
    productId:product.productId,
    keyword:campaign.currentVersion.keyword,
    marketplace:campaign.marketplace,
    confidence:campaign.score.confidence,
    score:campaign.score.score,
    reasons:campaign.score.reasons,
    risks:campaign.score.risks,
    rank:campaign.rankingContext?.rank ?? null,
    trackingCode:campaign.rankingContext?.trackingCode ?? null,
    rankingEvidence:campaign.rankingContext?.evidence ?? [],
    signalSources:campaign.rankingContext?.signalSources ?? [],
    createdAt:serverTimestamp(),
  },{merge:true});

  batch.set(doc(db,...root,'opportunityScores',opportunityId),{
    organizationId,
    opportunityId,
    campaignId:campaign.id,
    score:campaign.score.score,
    dimensions:campaign.score.dimensions,
    confidence:campaign.score.confidence,
    version:campaign.score.version,
    calculatedAt:serverTimestamp(),
  },{merge:true});

  await batch.commit();
}
