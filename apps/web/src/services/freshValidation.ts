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

  let fresh:ProductTruth;
  try{
    fresh=await meli.read(organizationId,approved.externalId);
  }catch{
    const candidates=await meli.search({
      organizationId,
      query:approved.title.value,
      limit:25,
    });
    const exact=candidates.find((item)=>item.externalId===approved.externalId);
    if(!exact) throw new Error('MELI_FRESH_ITEM_NOT_FOUND');
    fresh=exact;
  }
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
