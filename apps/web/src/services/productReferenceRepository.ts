import { collection, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, where, type Firestore } from 'firebase/firestore';
import { getBlob, ref, uploadBytes, type FirebaseStorage } from 'firebase/storage';
import type { ProductReferenceAsset, ProductTruth } from '@nestaffiliate/core';
import { detectImageMime, sha256Hex, validateImageMetadata } from '@nestaffiliate/creative-engine';
import { isReferenceAiReady } from '@nestaffiliate/radar';

const root=(org:string)=>['organizations',org,'products','nestaffiliate'] as const;
const allowed=new Set(['image/png','image/jpeg','image/webp']);
export interface ReferencePreview { asset:ProductReferenceAsset; previewUrl:string; }

/** Strip EXIF including GPS; no inline Firestore image bytes or public download token. */
async function sanitiseReference(file:File){
  if(file.size>8_000_000 || file.size<128)throw new Error('REFERENCE_SIZE_INVALID');
  const bytes=await file.arrayBuffer();
  const mime=detectImageMime(new Uint8Array(bytes.slice(0,16)));
  if(!mime || !allowed.has(mime) || (file.type && file.type!==mime))throw new Error('REFERENCE_FORMAT_INVALID');
  const local=URL.createObjectURL(file);
  try{
    const image=new Image();
    await new Promise<void>((resolve,reject)=>{
      image.onload=()=>resolve();image.onerror=()=>reject(new Error('REFERENCE_IMAGE_INVALID'));image.src=local;
    });
    const validated=validateImageMetadata({mimeType:mime,bytes:file.size,width:image.naturalWidth,height:image.naturalHeight});
    if(!validated.valid)throw new Error('REFERENCE_DIMENSIONS_INVALID');
    const canvas=document.createElement('canvas');
    canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
    const context=canvas.getContext('2d');
    if(!context)throw new Error('REFERENCE_CANVAS_UNAVAILABLE');
    context.drawImage(image,0,0);
    const cleaned=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>
      blob?resolve(blob):reject(new Error('REFERENCE_ENCODE_FAILED')),'image/webp',0.96));
    if(cleaned.size>8_000_000)throw new Error('REFERENCE_TOO_LARGE_AFTER_SANITISE');
    return {blob:cleaned,width:canvas.width,height:canvas.height,hash:await sha256Hex(await cleaned.arrayBuffer())};
  }finally{URL.revokeObjectURL(local);}
}
export async function saveOwnedProductReference(input:{
  db:Firestore;storage:FirebaseStorage;organizationId:string;actorId:string;
  product:ProductTruth;file:File;
  sourceType:'USER_OWN_PHOTO'|'OWNER_AUTHORIZED'|'LICENSED_MEDIA';
  rightsEvidence:string;externalAiAllowed:boolean;
}):Promise<ReferencePreview>{
  const {db,storage,organizationId,actorId,product}=input;
  if(product.organizationId!==organizationId||!actorId)throw new Error('REFERENCE_TENANT_MISMATCH');
  if(input.rightsEvidence.trim().length<12)throw new Error('REFERENCE_RIGHTS_EVIDENCE_REQUIRED');
  if(!input.externalAiAllowed)throw new Error('REFERENCE_AI_CONSENT_REQUIRED');
  const cleaned=await sanitiseReference(input.file);
  const now=new Date().toISOString();
  const id='ref-'+product.marketplace+'-'+product.externalId.replace(/[^a-z0-9-_]/gi,'').slice(0,48)+'-'+cleaned.hash.slice(0,16);
  const storagePath='organizations/'+organizationId+'/product-references/'+id+'.webp';
  const asset:ProductReferenceAsset={
    id,organizationId,productId:product.productId,marketplace:product.marketplace,
    externalListingId:product.externalId,sourceType:input.sourceType,
    rights:'USER_ATTESTED',referenceStatus:'READY_FOR_AI',canSendToExternalAI:input.externalAiAllowed,
    rightsEvidence:input.rightsEvidence.trim(),sha256:cleaned.hash,width:cleaned.width,height:cleaned.height,
    mimeType:'image/webp',sourceUrl:product.url.value,storagePath,
    variantFingerprint:[product.marketplace,product.externalId,product.title.value].join('|'),
    capturedAt:now,updatedAt:now,createdBy:actorId,
  };
  if(!isReferenceAiReady(asset,product))throw new Error('REFERENCE_IDENTITY_INVALID');
  // Fail closed if canonical Storage rules are not installed. Never use an inline fallback.
  await uploadBytes(ref(storage,storagePath),cleaned.blob,{contentType:'image/webp',customMetadata:{
    organizationId,productId:product.productId,externalListingId:product.externalId,createdBy:actorId,
  }});
  await setDoc(doc(db,...root(organizationId),'productReferences',id),{
    ...asset,updatedAt:serverTimestamp(),
  });
  return {asset,previewUrl:URL.createObjectURL(cleaned.blob)};
}
export async function listProductReferences(input:{
  db:Firestore;storage:FirebaseStorage;organizationId:string;product:ProductTruth;
}):Promise<ReferencePreview[]>{
  if(input.product.organizationId!==input.organizationId)throw new Error('REFERENCE_TENANT_MISMATCH');
  const snapshot=await getDocs(query(
    collection(input.db,...root(input.organizationId),'productReferences'),
    where('productId','==',input.product.productId),limit(20),
  ));
  const result:ReferencePreview[]=[];
  for(const document of snapshot.docs){
    const asset=document.data() as ProductReferenceAsset;
    if(asset.organizationId!==input.organizationId||asset.externalListingId!==input.product.externalId||
      asset.marketplace!==input.product.marketplace||!asset.storagePath||!isReferenceAiReady(asset,input.product))continue;
    try{
      const blob=await getBlob(ref(input.storage,asset.storagePath),8_000_000);
      result.push({asset,previewUrl:URL.createObjectURL(blob)});
    }catch{/* Cannot inspect actual reference -> it must not be offered for selection. */}
  }
  return result;
}
export async function revokeProductReference(db:Firestore,organizationId:string,asset:ProductReferenceAsset,actorId:string){
  if(asset.organizationId!==organizationId||!actorId)throw new Error('REFERENCE_TENANT_MISMATCH');
  await setDoc(doc(db,...root(organizationId),'productReferences',asset.id),{
    ...asset,referenceStatus:'REVOKED',canSendToExternalAI:false,
    revokedBy:actorId,updatedAt:serverTimestamp(),
  },{merge:true});
}

/** Fail closed on revoked/missing references; preview URLs must never be used as proof of authorization. */
export async function validateStoredProductReference(input:{
 db:Firestore; organizationId:string; product:ProductTruth;
 assetId:string; expectedSha256:string;
}):Promise<boolean>{
 const {db,organizationId,product,assetId,expectedSha256}=input;
 if(product.organizationId!==organizationId || !assetId.startsWith('ref-') ||
   !/^[a-f0-9]{64}$/.test(expectedSha256))return false;
 const snapshot=await getDoc(doc(db,...root(organizationId),'productReferences',assetId));
 if(!snapshot.exists())return false;
 const reference=snapshot.data() as ProductReferenceAsset;
 return reference.id===assetId && reference.sha256===expectedSha256 &&
   Boolean(reference.storagePath?.startsWith('organizations/'+organizationId+'/product-references/')) &&
   isReferenceAiReady(reference,product);
}
