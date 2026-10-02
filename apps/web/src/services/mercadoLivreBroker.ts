import type { User } from 'firebase/auth';
import type { ProductTruth } from '@nestaffiliate/core';

const HUB_BASE=(import.meta.env.VITE_HUB_URL || 'https://www.millionsnest.com').replace(/\/$/,'');

export interface MercadoLivreSearchMeta {
  catalogTotal:number;
  candidates:number;
  detailed:number;
  usable:number;
}

export interface MercadoLivreSearchResult {
  products:ProductTruth[];
  query:string;
  provider:'MELI';
  source:string;
  observedAt:string;
  meta:MercadoLivreSearchMeta;
}

export async function searchMercadoLivreBrokerDetailed(input:{
  user:User;
  organizationId:string;
  query:string;
  limit?:number;
}):Promise<MercadoLivreSearchResult>{
  const query=input.query.trim();

  if(import.meta.env.VITE_E2E_MOCK_AUTH==='true'){
    const observedAt='2026-10-02T20:10:00.000Z';
    const mock=(id:string,title:string,price:number):ProductTruth=>({
      productId:`meli:${id}`,
      organizationId:input.organizationId,
      marketplace:'MELI',
      externalId:id,
      title:{value:title,source:'mercadolivre-catalog-api',observedAt},
      url:{value:`https://www.mercadolivre.com.br/p/${id}`,source:'mercadolivre-catalog-api',observedAt},
      price:{value:price,source:'mercadolivre-buy-box',observedAt},
      currency:{value:'BRL',source:'mercadolivre-buy-box',observedAt},
      availability:{value:'available',source:'mercadolivre-catalog-api',observedAt},
      imageUrl:{value:`https://http2.mlstatic.com/D_${id}.jpg`,source:'mercadolivre-catalog-api',observedAt},
      assetRights:'UNKNOWN',
    });
    const products=[
      mock('MLB-A1','Organizador de Gavetas Ajustável',49.9),
      mock('MLB-B2','Prateleira Extensível para Armário',79.9),
      mock('MLB-C3','Kit de Potes Herméticos para Mantimentos',119.9),
    ];
    return {
      products,
      query,
      provider:'MELI',
      source:'mercadolivre-catalog-api',
      observedAt,
      meta:{catalogTotal:143,candidates:20,detailed:18,usable:3},
    };
  }

  if(!query){
    return {
      products:[],
      query:'',
      provider:'MELI',
      source:'mercadolivre-catalog-api',
      observedAt:new Date().toISOString(),
      meta:{catalogTotal:0,candidates:0,detailed:0,usable:0},
    };
  }

  const token=await input.user.getIdToken();
  const url=new URL(`${HUB_BASE}/api/v1/nestaffiliate/mercadolivre/search`);
  url.searchParams.set('organizationId',input.organizationId);
  url.searchParams.set('q',query);
  url.searchParams.set('limit',String(Math.max(1,Math.min(input.limit ?? 12,20))));

  const response=await fetch(url.toString(),{
    headers:{
      Authorization:`Bearer ${token}`,
      Accept:'application/json',
    },
  });

  if(!response.ok){
    let reason=`MELI_BROKER_${response.status}`;
    try{
      const payload=await response.json() as {error?:string};
      if(payload?.error) reason=payload.error;
    }catch{
      // Preserve status-derived reason when the broker does not return JSON.
    }
    throw new Error(reason);
  }

  const payload=await response.json() as Partial<MercadoLivreSearchResult> & {products?:ProductTruth[]};
  const products=Array.isArray(payload.products) ? payload.products : [];
  const rawMeta=payload.meta;
  return {
    products,
    query:typeof payload.query==='string' ? payload.query : query,
    provider:'MELI',
    source:typeof payload.source==='string' ? payload.source : 'mercadolivre-catalog-api',
    observedAt:typeof payload.observedAt==='string' ? payload.observedAt : new Date().toISOString(),
    meta:{
      catalogTotal:Number(rawMeta?.catalogTotal ?? products.length),
      candidates:Number(rawMeta?.candidates ?? products.length),
      detailed:Number(rawMeta?.detailed ?? products.length),
      usable:Number(rawMeta?.usable ?? products.length),
    },
  };
}

export async function searchMercadoLivreBroker(input:{
  user:User;
  organizationId:string;
  query:string;
  limit?:number;
}):Promise<ProductTruth[]>{
  return (await searchMercadoLivreBrokerDetailed(input)).products;
}
