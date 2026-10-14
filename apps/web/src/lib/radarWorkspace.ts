import { useEffect, useRef, useState } from 'react';
import { db } from './firebase';
import {deletePrivateRadarWorkspace,syncPrivateRadarWorkspace,workspaceModifiedAt} from './radarWorkspaceCloud';
import type { Opportunity } from '@nestaffiliate/radar';
import { isSafeOfferUrl } from '@nestaffiliate/radar';

export type RadarSort = 'recommended'|'priceAsc'|'priceDesc'|'sales'|'commission';
export interface SavedRadarOffer {
  id:string;
  marketplace:'MELI'|'SHOPEE'|'AMAZON';
  title:string;
  keyword:string;
  url:string|null;
  price:number|null;
  currency:string;
  observedAt:string;
  savedAt:string;
}
export interface RadarWorkspace {
  version:1;
  recentSearches:string[];
  saved:SavedRadarOffer[];
  preferredCategory:string|null;
  updatedAt?:string;
  syncEnabled?:boolean;
}
const KEY_PREFIX='nestaffiliate:radar-workspace-v7:';
const MAX_RECENT=12;
const MAX_SAVED=40;
const MAX_DAYS=30;

const empty=():RadarWorkspace=>({version:1,recentSearches:[],saved:[],preferredCategory:null,updatedAt:new Date(0).toISOString(),syncEnabled:false});
export const radarOfferId=(product:{marketplace:string;externalId:string})=>product.marketplace+':'+product.externalId;

function cleanText(input:unknown,max=120):string{
  return typeof input==='string'?input.replace(/\p{Cc}/gu,' ').trim().slice(0,max):'';
}
export const normalizeRadarKeyword=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
export function addRecentSearch(items:string[],query:string):string[]{
  const term=cleanText(query,120);
  if(!term)return items.slice(0,MAX_RECENT);
  return [term,...items.filter(value=>normalizeRadarKeyword(value)!==normalizeRadarKeyword(term))].slice(0,MAX_RECENT);
}
export function sortRadarOpportunities(items:Opportunity[],sort:RadarSort):Opportunity[]{
  const withIndex=items.map((value,index)=>({value,index}));
  const value=(item:Opportunity):number|null=>{
    const p=item.product;
    if(sort==='priceAsc'||sort==='priceDesc')return typeof p.price?.value==='number'&&Number.isFinite(p.price.value)?p.price.value:null;
    if(sort==='sales')return typeof p.soldQuantity?.value==='number'&&Number.isFinite(p.soldQuantity.value)?p.soldQuantity.value:null;
    if(sort==='commission'){
      const rate=p.commissionRate;
      if(!rate||!Number.isFinite(rate.value)||rate.value<=0||rate.value>1||!/affiliate|official|manual-confirmed/i.test(rate.source))return null;
      return rate.value;
    }
    return null;
  };
  if(sort==='recommended')return [...items];
  return withIndex.sort((a,b)=>{
    const x=value(a.value),y=value(b.value);
    if(x===null&&y===null)return a.index-b.index;
    if(x===null)return 1;
    if(y===null)return -1;
    return ((sort==='priceAsc'?x-y:y-x)||a.index-b.index);
  }).map(item=>item.value);
}
export function snapshotRadarOffer(opportunity:Opportunity,now=new Date()):SavedRadarOffer{
  const p=opportunity.product;
  const url=isSafeOfferUrl(p.url?.value,p.marketplace)?p.url.value:null;
  return {
    id:radarOfferId(p),
    marketplace:p.marketplace,
    title:cleanText(p.title?.value,160),
    keyword:cleanText(opportunity.keyword),
    url,
    price:typeof p.price?.value==='number'&&Number.isFinite(p.price.value)?p.price.value:null,
    currency:cleanText(p.currency?.value,5)||'BRL',
    observedAt:cleanText(p.title?.observedAt,40),
    savedAt:now.toISOString(),
  };
}
export function toggleSavedRadarOffer(items:SavedRadarOffer[],value:SavedRadarOffer):SavedRadarOffer[]{
  if(items.some(item=>item.id===value.id))return items.filter(item=>item.id!==value.id);
  return [value,...items].slice(0,MAX_SAVED);
}
export function sanitizeRadarWorkspace(raw:unknown,now=new Date()):RadarWorkspace{
  const obj=raw&&typeof raw==='object'?raw as Partial<RadarWorkspace>:{};
  const minSavedTime=now.getTime()-MAX_DAYS*86400000;
  const recents=Array.isArray(obj.recentSearches)?obj.recentSearches:[];
  const saved:SavedRadarOffer[]=[];
  for(const value of Array.isArray(obj.saved)?obj.saved:[]){
    if(!value||typeof value!=='object')continue;
    const offer=value as Partial<SavedRadarOffer>;
    const id=cleanText(offer.id,150),title=cleanText(offer.title,160),marketplace=offer.marketplace;
    if(!id||!title||!['MELI','SHOPEE','AMAZON'].includes(String(marketplace)))continue;
    const parsedTime=Date.parse(String(offer.savedAt));
    if(!Number.isFinite(parsedTime)||parsedTime<minSavedTime||parsedTime>now.getTime()+60000)continue;
    if(saved.some(item=>item.id===id))continue;
    saved.push({
      id,marketplace:marketplace as SavedRadarOffer['marketplace'],title,
      keyword:cleanText(offer.keyword),
      url:typeof offer.url==='string'&&isSafeOfferUrl(offer.url,marketplace as SavedRadarOffer['marketplace'])?offer.url:null,
      price:typeof offer.price==='number'&&Number.isFinite(offer.price)?offer.price:null,
      currency:cleanText(offer.currency,5)||'BRL',
      observedAt:cleanText(offer.observedAt,40),
      savedAt:new Date(parsedTime).toISOString(),
    });
    if(saved.length>=MAX_SAVED)break;
  }
  return {
    version:1,
    recentSearches:recents.reduce<string[]>((list,value)=>typeof value==='string'?addRecentSearch(list,value):list,[]).reverse(),
    saved,
    preferredCategory:typeof obj.preferredCategory==='string'?cleanText(obj.preferredCategory,50)||null:null,
    updatedAt:typeof obj.updatedAt==='string' && Number.isFinite(Date.parse(obj.updatedAt))
      && Date.parse(obj.updatedAt)<=now.getTime()+60000 ? obj.updatedAt : new Date(0).toISOString(),
    syncEnabled:obj.syncEnabled===true,
  };
}
function load(key:string):RadarWorkspace{
  try{
    const raw=localStorage.getItem(key);
    return raw?sanitizeRadarWorkspace(JSON.parse(raw)):empty();
  }catch{return empty();}
}
export function useRadarWorkspace(organizationId:string,userId:string|null){
  // A guest or incomplete identity never reads/writes another account's research.
  const key=organizationId&&userId?KEY_PREFIX+encodeURIComponent(organizationId)+':'+encodeURIComponent(userId):null;
  const [record,setRecord]=useState<{key:string|null;state:RadarWorkspace}>(()=>({key,state:key?load(key):empty()}));
  const [syncStatus,setSyncStatus]=useState<'off'|'syncing'|'synced'|'error'|'unavailable'>('off');
  const [syncNonce,setSyncNonce]=useState(0);
  const syncInFlight=useRef<Promise<unknown>|null>(null);
  useEffect(()=>{setRecord({key,state:key?load(key):empty()});},[key]);
  useEffect(()=>{
    if(!key||record.key!==key)return;
    try{localStorage.setItem(key,JSON.stringify(record.state));}catch{/* Private browsing/quota: session still works. */}
  },[key,record]);
  const workspace=record.key===key?record.state:empty();
  useEffect(()=>{
    if(!key || !userId || !organizationId || !workspace.syncEnabled){
      setSyncStatus('off');return;
    }
    if(!db){setSyncStatus('unavailable');return;}
    let active=true;
    setSyncStatus('syncing');
    const currentDb=db;
    const timer=window.setTimeout(()=>{
      const pending=syncPrivateRadarWorkspace({db:currentDb,userId,organizationId,workspace}).then(result=>{
        if(!active)return;
        if(result.mode==='remote_newer'){
          setRecord(prev=>{
            if(prev.key!==key || workspaceModifiedAt(prev.state)>workspaceModifiedAt(result.workspace))return prev;
            return {key,state:{...result.workspace,syncEnabled:true}};
          });
        }
        setSyncStatus('synced');
      }).catch(()=>{if(active)setSyncStatus('error');}).finally(()=>{if(syncInFlight.current===pending)syncInFlight.current=null;});
      syncInFlight.current=pending;
    },750);
    return ()=>{active=false;window.clearTimeout(timer);};
  },[key,userId,organizationId,workspace.syncEnabled,workspace.updatedAt,syncNonce]);
  const update=(fn:(value:RadarWorkspace)=>RadarWorkspace)=>{
    if(!key)return;
    setRecord(prev=>{
      const old=prev.key===key?prev.state:load(key);
      const changed=fn(old);
      const nextMs=Math.max(Date.now(),workspaceModifiedAt(old)+1);
      return {key,state:{...changed,updatedAt:new Date(nextMs).toISOString()}};
    });
  };
  async function deleteSyncedCopy(){
    if(!db||!key||!userId||!organizationId)throw new Error('SYNC_NOT_AVAILABLE');
    // Stop uploading before deleting the synced document. Local research is retained.
    setRecord(prev=>prev.key===key?{key,state:{...prev.state,syncEnabled:false}}:prev);
    try{
      await syncInFlight.current?.catch(()=>undefined);
      await deletePrivateRadarWorkspace({db,userId,organizationId});
      setSyncStatus('off');
    }catch(error){setSyncStatus('error');throw error;}
  }
  return {
    workspace,
    syncStatus,
    syncAvailable:Boolean(db&&key),
    setSyncEnabled:(enabled:boolean)=>{
      if(!key)return;
      setRecord(prev=>({key,state:{...(prev.key===key?prev.state:load(key)),syncEnabled:enabled}}));
      if(enabled)setSyncNonce(n=>n+1);
    },
    syncNow:()=>setSyncNonce(n=>n+1),
    deleteSyncedCopy,
    addSearch:(query:string)=>update(prev=>({...prev,recentSearches:addRecentSearch(prev.recentSearches,query)})),
    toggleSaved:(opportunity:Opportunity)=>update(prev=>({...prev,saved:toggleSavedRadarOffer(prev.saved,snapshotRadarOffer(opportunity))})),
    removeSaved:(id:string)=>update(prev=>({...prev,saved:prev.saved.filter(item=>item.id!==id)})),
    setPreferredCategory:(category:string|null)=>update(prev=>({...prev,preferredCategory:category?cleanText(category,50):null})),
    clear:()=>update(()=>empty()),
  };
}
