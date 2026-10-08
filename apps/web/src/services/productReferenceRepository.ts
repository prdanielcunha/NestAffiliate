import { collection, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, where, type Firestore } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import type { ProductReferenceAsset, ProductTruth } from '@nestaffiliate/core';
import { detectImageMime, sha256Hex, validateImageMetadata } from '@nestaffiliate/creative-engine';
import { isReferenceAiReady } from '@nestaffiliate/radar';

const root=(org:string)=>['organizations',org,'products','nestaffiliate'] as const;
const HUB_BASE=(import.meta.env.VITE_HUB_URL || (typeof window!=='undefined'?window.location.origin:'https://www.millionsnest.com')).replace(/\/$/,'');
const validMimes=new Set(['image/png','image/jpeg','image/webp']);
export interface ReferencePreview { asset:ProductReferenceAsset; previewUrl:string; }
async function sanitizedReference(file:File){
  if(file.size>8_000_000||file.size<128)throw new Error('REFERENCE_SIZE_INVALID');
  const input=await file.arrayBuffer();
  const mime=detectImageMime(new Uint8Array(input.slice(0,16)));
  if(!mime || !validMimes.has(mime) || (file.type && mime!==file.type))throw new Error('REFERENCE_FORMAT_INVALID');
  const objectUrl=URL.createObjectURL(file);
  try{
    const image=new Image();
    await new Promise<void>((resolve,reject)=>{
      image.onload=()=>resolve();image.onerror=()=>reject(new Error('REFERENCE_DECODE_FAILED'));
      image.src=objectUrl;
    });
    const check=validateImageMetadata({mimeType:mime,bytes:file.size,width:image.naturalWidth,height:image.naturalHeight});
    if(!check.valid)throw new Error('REFERENCE_DIMENSIONS_INVALID');
    // Re-encode in canvas: EXIF/GPS, ICC and XMP are discarded.
    const canvas=document.createElement('canvas');
    canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
    const ctx=canvas.getContext('2d');
    if(!ctx)throw new Error('REFERENCE_CANVAS_UNAVAILABLE');
    ctx.drawImage(image,0,0);
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(
      img=>img?resolve(img):reject(new Error('REFERENCE_ENCODING_FAILED')),'image/webp',0.94));
    if(blob.size>8_000_000)throw new Error('REFERENCE_TOO_LARGE');
    return {blob,hash:await sha256Hex(await blob.arrayBuffer()),width:canvas.width,height:canvas.height};
  }finally{URL.revokeObjectURL(objectUrl);}
}
function endpoint(){
  return HUB_BASE+'/api/v1/nestaffiliate/reference-media';
}
async function authorizedFetch(user:User,url:string,init:RequestInit={}){
  const token=await user.getIdToken();
  const response=await fetch(url,{...init,headers:{
    Accept:init.method==='POST'?'application/json':'image/webp',
    Authorization:'Bearer '+token,
    ...init.headers,
  }});
  if(!response.ok){
    let reason='REFERENCE_PRIVATE_MEDIA_UNAVAILABLE';
    try{
      const payload=await response.json() as {error?:string};
      if(typeof payload.error==='string')reason=payload.error;
    }catch{ /* No response body; retain a generic safe error. */ }
    throw new Error(reason);
  }
  return response;
}
async function toBase64(blob:Blob):Promise<string>{
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result).split(',')[1]||'');
    reader.onerror=()=>reject(new Error('REFERENCE_ENCODING_FAILED'));
    reader.readAsDataURL(blob);
  });
}
export async function saveOwnedProductReference(input:{
  db:Firestore;user:User;organizationId:string;actorId:string;
  product:ProductTruth;file:File;
  sourceType:'USER_OWN_PHOTO'|'OWNER_AUTHORIZED'|'LICENSED_MEDIA';
  rightsEvidence:string;externalAiAllowed:boolean;
}):Promise<ReferencePreview>{
  const {organizationId,actorId,product}=input;
  if(!actorId||input.user.uid!==actorId||product.organizationId!==organizationId)throw new Error('REFERENCE_TENANT_MISMATCH');
  if(input.rightsEvidence.trim().length<12||!input.externalAiAllowed)throw new Error('REFERENCE_RIGHTS_EVIDENCE_REQUIRED');
  const cleaned=await sanitizedReference(input.file);
  const payload={
    organizationId,productId:product.productId,marketplace:product.marketplace,
    externalListingId:product.externalId,sourceType:input.sourceType,
    rightsEvidence:input.rightsEvidence.trim(),canSendToExternalAI:input.externalAiAllowed,
    sourceUrl:product.url.value,
    variantFingerprint:[product.marketplace,product.externalId,product.title.value].join('|'),
    sha256:cleaned.hash,imageBase64:await toBase64(cleaned.blob),
  };
  const result=await authorizedFetch(input.user,endpoint(),{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),
  });
  const data=await result.json() as {asset:ProductReferenceAsset};
  if(!isReferenceAiReady(data.asset,product)||data.asset.sha256!==cleaned.hash){
    throw new Error('REFERENCE_SERVER_IDENTITY_MISMATCH');
  }
  return {asset:data.asset,previewUrl:URL.createObjectURL(cleaned.blob)};
}
export async function listProductReferences(input:{
  db:Firestore;user:User;organizationId:string;product:ProductTruth;
}):Promise<ReferencePreview[]>{
  if(input.product.organizationId!==input.organizationId)throw new Error('REFERENCE_TENANT_MISMATCH');
  const snapshots=await getDocs(query(collection(input.db,...root(input.organizationId),'productReferences'),
    where('productId','==',input.product.productId),limit(20)));
  const out:ReferencePreview[]=[];
  for(const item of snapshots.docs){
    const asset=item.data() as ProductReferenceAsset;
    if(asset.organizationId!==input.organizationId||asset.marketplace!==input.product.marketplace||
      asset.externalListingId!==input.product.externalId||!isReferenceAiReady(asset,input.product))continue;
    try{
      const url=new URL(endpoint());
      url.searchParams.set('organizationId',input.organizationId);
      url.searchParams.set('referenceId',asset.id);
      const response=await authorizedFetch(input.user,url.toString());
      const blob=await response.blob();
      if(blob.size>8_000_000||blob.type!=='image/webp')continue;
      const digest=await sha256Hex(await blob.arrayBuffer());
      if(digest!==asset.sha256)continue;
      out.push({asset,previewUrl:URL.createObjectURL(blob)});
    }catch{/* No verified private download => never show an AI-sendable reference. */}
  }
  return out;
}
export async function revokeProductReference(db:Firestore,organizationId:string,asset:ProductReferenceAsset,actorId:string){
  if(asset.organizationId!==organizationId||!actorId)throw new Error('REFERENCE_TENANT_MISMATCH');
  await setDoc(doc(db,...root(organizationId),'productReferences',asset.id),{
    ...asset,referenceStatus:'REVOKED',canSendToExternalAI:false,
    revokedBy:actorId,updatedAt:serverTimestamp(),
  },{merge:true});
}
/** Final publish step rechecks CURRENT rights from Firestore, not the cached screenshot. */
export async function validateStoredProductReference(input:{
  db:Firestore;organizationId:string;product:ProductTruth;
  assetId:string;expectedSha256:string;
}):Promise<boolean>{
  const {db,organizationId,product,assetId,expectedSha256}=input;
  if(product.organizationId!==organizationId||!assetId.startsWith('ref-')||
    !/^[a-f0-9]{64}$/.test(expectedSha256))return false;
  const snap=await getDoc(doc(db,...root(organizationId),'productReferences',assetId));
  if(!snap.exists())return false;
  const ref=snap.data() as ProductReferenceAsset;
  return ref.id===assetId&&ref.sha256===expectedSha256&&
    Boolean(ref.storagePath?.startsWith('organizations/'+organizationId+'/product-references/'))&&
    isReferenceAiReady(ref,product);
}
