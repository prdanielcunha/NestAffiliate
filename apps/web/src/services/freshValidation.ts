import type { ProductTruth } from '@nestaffiliate/core';
import { validateFreshProduct, type FreshValidationResult } from '@nestaffiliate/compliance';
import { MercadoLivrePublicAdapter } from '@nestaffiliate/integrations';

const meli=new MercadoLivrePublicAdapter();

export async function freshValidateProduct(
  organizationId:string,
  approved:ProductTruth,
):Promise<{result:FreshValidationResult;current:ProductTruth}>{
  if(approved.marketplace!=='MELI' || !meli.read){
    return {
      current:approved,
      result:{
        outcome:'REVIEW_REQUIRED',
        changes:[{
          field:'availability',
          outcome:'REVIEW_REQUIRED',
          before:approved.availability.value,
          after:approved.availability.value,
          message:'Este marketplace exige confirmação manual antes da publicação.',
        }],
        validatedAt:new Date().toISOString(),
      },
    };
  }

  const fresh=await meli.read(organizationId,approved.externalId);
  const current:ProductTruth={
    ...fresh,
    affiliateUrl:approved.affiliateUrl,
    sellerName:fresh.sellerName ?? approved.sellerName,
    sellerReputation:fresh.sellerReputation ?? approved.sellerReputation,
    rating:fresh.rating ?? approved.rating,
    reviewCount:fresh.reviewCount ?? approved.reviewCount,
    assetRights:approved.assetRights,
  };
  return {current,result:validateFreshProduct(approved,current)};
}
