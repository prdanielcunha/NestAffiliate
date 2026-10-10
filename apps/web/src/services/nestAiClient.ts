import { createNestAiClient, type Locale } from '@millionsnest/ai';
import type { User } from 'firebase/auth';
import { getNestAffiliateAppCheckToken } from '../lib/firebase';

export type AffiliatePinCopy = {
  title: string;
  description: string;
  tags: string[];
};

export type AffiliateProductAnalysis = {
  facts: string[];
  opportunities: string[];
  unknowns: string[];
};

function localeOf(locale: 'pt-BR' | 'en' | 'es'): Locale {
  return locale;
}

function clientFor(input: {
  user: User;
  organizationId: string;
  locale: 'pt-BR' | 'en' | 'es';
}) {
  return createNestAiClient({
    appId: 'nestaffiliate',
    organizationId: input.organizationId,
    locale: localeOf(input.locale),
    getFirebaseIdToken: async () => input.user.getIdToken(),
    getAppCheckToken: getNestAffiliateAppCheckToken,
    baseUrl: 'https://ai.millionsnest.com/v1/',
    hubBaseUrl: 'https://www.millionsnest.com/',
  });
}

export async function generateAffiliatePinCopy(input: {
  user: User;
  organizationId: string;
  locale: 'pt-BR' | 'en' | 'es';
  instruction: string;
  product: {
    title: string;
    marketplace: string;
    price?: number;
    currency?: string;
    seller?: string;
    availability?: string;
    sourceNotes?: string[];
  };
  deterministicPack?: {
    primaryKeyword?: string;
    keywords?: string[];
    recommendedAngle?: string;
  };
}): Promise<AffiliatePinCopy> {
  const response = await clientFor(input).run<AffiliatePinCopy>({
    task: 'affiliate.pin.copy',
    input: {
      instruction: input.instruction,
      product: input.product,
      deterministicPack: input.deterministicPack ?? null,
      authority: {
        mode: 'draft_only',
        publish: false,
        mutateProductTruth: false,
        humanReviewRequired: true,
      },
    },
  });
  return response.result;
}

export async function analyzeAffiliateProduct(input: {
  user: User;
  organizationId: string;
  locale: 'pt-BR' | 'en' | 'es';
  product: unknown;
}): Promise<AffiliateProductAnalysis> {
  const response = await clientFor(input).run<AffiliateProductAnalysis>({
    task: 'affiliate.product.analyze',
    input: {
      product: input.product,
      authority: {
        mode: 'analysis_only',
        publish: false,
        mutateProductTruth: false,
      },
    },
  });
  return response.result;
}

export async function generateAffiliateCreative(input: {
  user: User;
  organizationId: string;
  locale: 'pt-BR' | 'en' | 'es';
  prompt: string;
  seed?: number;
}): Promise<{ imageBase64: string; mimeType: 'image/jpeg' }> {
  const response = await clientFor(input).image<{ imageBase64: string; mimeType: 'image/jpeg' }>(
    'affiliate.creative.generate',
    {
      prompt: input.prompt,
      steps: 4,
      ...(input.seed !== undefined ? { seed: input.seed } : {}),
    },
  );
  return response.result;
}

/** Private image is processed via the configured NestAI free OCR gateway.
 * OCR fields are unverified observations, never canonical marketplace facts.
 */
export async function extractAffiliateScreenshot(input:{
  user:User;organizationId:string;locale:'pt-BR'|'en'|'es';
  base64:string;mimeType:'image/png'|'image/jpeg'|'image/webp';fileName:string;
}):Promise<{
  marketplace:'MELI'|'SHOPEE'|'UNKNOWN';title:string|null;productUrl:string|null;
  price:number|null;seller:string|null;rating:number|null;reviewCount:number|null;
  visibleFacts:string[];warnings:string[];
}>{
  const response=await clientFor(input).vision<{
    marketplace:'MELI'|'SHOPEE'|'UNKNOWN';title:string|null;productUrl:string|null;
    price:number|null;seller:string|null;rating:number|null;reviewCount:number|null;
    visibleFacts:string[];warnings:string[];
  }>('affiliate.screenshot.extract',{
    fileBase64:input.base64,mimeType:input.mimeType,fileName:input.fileName,
    context:{purpose:'public-marketplace-screenshot-only',humanReviewRequired:true},
  });
  const result=response.result;
  if(!result || !['MELI','SHOPEE','UNKNOWN'].includes(result.marketplace))throw new Error('OCR_INVALID_RESPONSE');
  return result;
}
// AI-first creative personalization stays separate from official marketplace Product Truth.
export async function generateAffiliatePinStrategy(input:{
 user:import('firebase/auth').User;
 organizationId:string;
 locale:'pt-BR'|'en'|'es';
 product:import('@nestaffiliate/core').ProductTruth;
 observedFacts?:string[];
}):Promise<import('../lib/aiProductStrategy').ProductAiStrategy>{
 const observations=(input.observedFacts??[]).slice(0,8).map(x=>x.slice(0,200));
 const response=await clientFor(input).run<unknown>({
  task:'affiliate.pin.strategy',
  input:{
   product:{
    title:input.product.title.value,
    marketplace:input.product.marketplace,
    listingVerified:Boolean(input.product.listingVerified),
    sources:{
     title:input.product.title.source,
     url:input.product.url.source,
     price:input.product.price?.source ?? null,
    },
    observableAttributes:observations,
    sourceUrl:input.product.url.value,
    availableFacts:{
      ...(input.product.price?{price:input.product.price.value}:{}),
      ...(input.product.rating?{rating:input.product.rating.value}:{}),
      ...(input.product.reviewCount?{reviewCount:input.product.reviewCount.value}:{}),
    },
    uncertainties:['No independent claim of product performance or sales','Screenshot facts are unverified','Affiliate commission not independently verified'],
   },
   objective:{
    platform:'Pinterest',language:input.locale,
    authenticBuyerIntent:true,distinctAngles:3,
    avoidGenericTemplates:true,
    preserveProductTruth:true,allowedFactsOnly:true,
    humanApprovalRequired:true,
   },
  },
 });
 return (await import('../lib/aiProductStrategy')).validateProductAiStrategy(response.result,input.product,observations);
}
