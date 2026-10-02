import type { User } from 'firebase/auth';
import type { ProductTruth } from '@nestaffiliate/core';

const HUB_BASE=(import.meta.env.VITE_HUB_URL || 'https://www.millionsnest.com').replace(/\/$/,'');

export async function searchMercadoLivreBroker(input:{
  user:User;
  organizationId:string;
  query:string;
  limit?:number;
}):Promise<ProductTruth[]>{
  const query=input.query.trim();
  if(!query) return [];

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

  const payload=await response.json() as {products?:ProductTruth[]};
  return Array.isArray(payload.products) ? payload.products : [];
}
