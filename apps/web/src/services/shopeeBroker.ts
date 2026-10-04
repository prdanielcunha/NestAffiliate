import type { User } from 'firebase/auth';
import type { ProductTruth } from '@nestaffiliate/core';

const HUB_BASE=(import.meta.env.VITE_HUB_URL || 'https://www.millionsnest.com').replace(/\/$/,'');

export interface ShopeeSearchMeta {
  catalogTotal:number;
  candidates:number;
  usable:number;
  minSoldQuantity:number;
  rejectedUnavailable:number;
  rejectedLowSales:number;
  rejectedUnverified:number;
  hasNextPage:boolean;
}

export interface ShopeeSearchResult {
  products:ProductTruth[];
  query:string;
  provider:'SHOPEE';
  source:string;
  observedAt:string;
  meta:ShopeeSearchMeta;
}

export interface ShopeeApiStatus {
  provider:'SHOPEE';
  configured:boolean;
  appIdHint?:string|null;
  configuredAt?:string|null;
  verifiedAt?:string|null;
}

async function authHeaders(user:User){
  return {
    Authorization:`Bearer ${await user.getIdToken()}`,
    Accept:'application/json',
  };
}

async function readError(response:Response,fallback:string){
  let reason=fallback;
  try{
    const payload=await response.json() as {error?:string};
    if(payload?.error) reason=payload.error;
  }catch{
    // Keep the status-derived fallback if the broker does not return JSON.
  }
  return reason;
}

function mockProduct(
  organizationId:string,
  id:string,
  title:string,
  price:number,
  sales:number,
  rating:number,
  commissionRate:number,
):ProductTruth{
  const observedAt='2026-10-03T19:30:00.000Z';
  return {
    productId:`shopee:${id}`,
    organizationId,
    marketplace:'SHOPEE',
    externalId:id,
    listingVerified:true,
    title:{value:title,source:'shopee-affiliate-open-api',observedAt},
    url:{value:`https://shopee.com.br/product/12345/${id}`,source:'shopee-affiliate-open-api',observedAt},
    affiliateUrl:{value:`https://s.shopee.com.br/${id}`,source:'shopee-affiliate-open-api',observedAt},
    price:{value:price,source:'shopee-affiliate-open-api',observedAt},
    currency:{value:'BRL',source:'shopee-affiliate-open-api',observedAt},
    sellerName:{value:'Loja verificada Shopee',source:'shopee-affiliate-open-api',observedAt},
    rating:{value:rating,source:'shopee-affiliate-open-api',observedAt},
    soldQuantity:{value:sales,source:'shopee-affiliate-open-api',observedAt},
    availability:{value:'available',source:'shopee-affiliate-open-api',observedAt},
    imageUrl:{value:`https://cf.shopee.com.br/file/nestaffiliate-${id}.jpg`,source:'shopee-affiliate-open-api',observedAt},
    commissionRate:{value:commissionRate,source:'shopee-affiliate-open-api',observedAt},
    estimatedCommission:{value:price*commissionRate,source:'shopee-affiliate-open-api',observedAt},
    assetRights:'PLATFORM_PROVIDED',
  };
}

export async function getShopeeApiStatus(input:{
  user:User;
  organizationId:string;
}):Promise<ShopeeApiStatus>{
  if(import.meta.env.VITE_E2E_MOCK_AUTH==='true'){
    const forcedPending=typeof window!=='undefined' &&
      new URLSearchParams(window.location.search).get('shopeeApi')==='pending';
    return forcedPending
      ? {provider:'SHOPEE',configured:false}
      : {
          provider:'SHOPEE',
          configured:true,
          appIdHint:'******1234',
          verifiedAt:'2026-10-03T19:30:00.000Z',
        };
  }

  const url=new URL(`${HUB_BASE}/api/v1/nestaffiliate/shopee/status`);
  url.searchParams.set('organizationId',input.organizationId);
  const response=await fetch(url.toString(),{headers:await authHeaders(input.user)});
  if(!response.ok) throw new Error(await readError(response,`SHOPEE_STATUS_${response.status}`));
  return response.json() as Promise<ShopeeApiStatus>;
}

export async function configureShopeeApi(input:{
  user:User;
  organizationId:string;
  appId:string;
  secret:string;
}):Promise<ShopeeApiStatus>{
  if(import.meta.env.VITE_E2E_MOCK_AUTH==='true'){
    return {provider:'SHOPEE',configured:true,appIdHint:'******1234',verifiedAt:new Date().toISOString()};
  }

  const token=await input.user.getIdToken();
  const response=await fetch(`${HUB_BASE}/api/v1/nestaffiliate/shopee/credentials`,{
    method:'POST',
    headers:{
      Authorization:`Bearer ${token}`,
      Accept:'application/json',
      'Content-Type':'application/json',
    },
    body:JSON.stringify({
      organizationId:input.organizationId,
      appId:input.appId.trim(),
      secret:input.secret.trim(),
    }),
  });
  if(!response.ok) throw new Error(await readError(response,`SHOPEE_SETUP_${response.status}`));
  return response.json() as Promise<ShopeeApiStatus>;
}

export async function searchShopeeBrokerDetailed(input:{
  user:User;
  organizationId:string;
  query:string;
  limit?:number;
}):Promise<ShopeeSearchResult>{
  const query=input.query.trim();

  if(import.meta.env.VITE_E2E_MOCK_AUTH==='true'){
    const products=[
      mockProduct(input.organizationId,'98765001','Organizador Giratório Multiuso Shopee',59.9,5400,4.9,0.12),
      mockProduct(input.organizationId,'98765002','Prateleira Extensível para Cozinha Shopee',79.9,3100,4.8,0.10),
      mockProduct(input.organizationId,'98765003','Kit Potes Herméticos Shopee',109.9,1700,4.9,0.08),
    ];
    return {
      products,
      query,
      provider:'SHOPEE',
      source:'shopee-affiliate-open-api',
      observedAt:'2026-10-03T19:30:00.000Z',
      meta:{
        catalogTotal:products.length,
        candidates:products.length,
        usable:products.length,
        minSoldQuantity:0,
        rejectedUnavailable:0,
        rejectedLowSales:0,
        rejectedUnverified:0,
        hasNextPage:false,
      },
    };
  }

  if(!query){
    return {
      products:[],
      query:'',
      provider:'SHOPEE',
      source:'shopee-affiliate-open-api',
      observedAt:new Date().toISOString(),
      meta:{catalogTotal:0,candidates:0,usable:0,minSoldQuantity:0,rejectedUnavailable:0,rejectedLowSales:0,rejectedUnverified:0,hasNextPage:false},
    };
  }

  const url=new URL(`${HUB_BASE}/api/v1/nestaffiliate/shopee/search`);
  url.searchParams.set('organizationId',input.organizationId);
  url.searchParams.set('q',query);
  url.searchParams.set('limit',String(Math.max(1,Math.min(input.limit ?? 20,50))));

  const response=await fetch(url.toString(),{headers:await authHeaders(input.user)});
  if(!response.ok) throw new Error(await readError(response,`SHOPEE_BROKER_${response.status}`));

  const payload=await response.json() as Partial<ShopeeSearchResult> & {products?:ProductTruth[]};
  const products=Array.isArray(payload.products) ? payload.products : [];
  const rawMeta=payload.meta;
  return {
    products,
    query:typeof payload.query==='string' ? payload.query : query,
    provider:'SHOPEE',
    source:typeof payload.source==='string' ? payload.source : 'shopee-affiliate-open-api',
    observedAt:typeof payload.observedAt==='string' ? payload.observedAt : new Date().toISOString(),
    meta:{
      catalogTotal:Number(rawMeta?.catalogTotal ?? products.length),
      candidates:Number(rawMeta?.candidates ?? products.length),
      usable:Number(rawMeta?.usable ?? products.length),
      minSoldQuantity:Number(rawMeta?.minSoldQuantity ?? 0),
      rejectedUnavailable:Number(rawMeta?.rejectedUnavailable ?? 0),
      rejectedLowSales:Number(rawMeta?.rejectedLowSales ?? 0),
      rejectedUnverified:Number(rawMeta?.rejectedUnverified ?? 0),
      hasNextPage:Boolean(rawMeta?.hasNextPage),
    },
  };
}

export async function searchShopeeBroker(input:{
  user:User;
  organizationId:string;
  query:string;
  limit?:number;
}):Promise<ProductTruth[]>{
  return (await searchShopeeBrokerDetailed(input)).products;
}
