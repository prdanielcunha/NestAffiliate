import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes, type FirebaseStorage } from 'firebase/storage';
import type { CreativeAsset, PinterestCreativePack } from '@nestaffiliate/core';

function root(organizationId:string) {
  return ['organizations', organizationId, 'products', 'nestaffiliate'] as const;
}

export async function savePinterestCreativePack(
  db:Firestore,
  organizationId:string,
  pack:PinterestCreativePack,
){
  if(pack.organizationId!==organizationId) throw new Error('TENANT_MISMATCH');
  const base=root(organizationId);
  const batch=writeBatch(db);
  batch.set(doc(db,...base,'creativePacks',pack.id),{
    ...pack,
    organizationId,
    updatedAt:serverTimestamp(),
  },{merge:true});

  const scene=pack.imageConcepts.find((item)=>item.id===pack.recommendedConceptId)?.sceneProfile
    ?? pack.imageConcepts[0]?.sceneProfile;
  if(scene){
    batch.set(doc(db,...base,'sceneProfiles',pack.id),{
      ...scene,
      id:pack.id,
      organizationId,
      campaignId:pack.campaignId,
      campaignVersion:pack.campaignVersion,
      updatedAt:serverTimestamp(),
    },{merge:true});
  }

  for(const concept of pack.imageConcepts){
    batch.set(doc(db,...base,'creativeConcepts',concept.id),{
      ...concept,
      organizationId,
      campaignId:pack.campaignId,
      campaignVersion:pack.campaignVersion,
      updatedAt:serverTimestamp(),
    },{merge:true});
    batch.set(doc(db,...base,'promptPackages',concept.imagePrompt.id),{
      ...concept.imagePrompt,
      organizationId,
      conceptId:concept.id,
      productId:pack.productId,
      updatedAt:serverTimestamp(),
    },{merge:true});
  }
  await batch.commit();
}

export async function findCreativeAssetByHash(
  db:Firestore,
  organizationId:string,
  hash:string,
):Promise<CreativeAsset|null>{
  const q=query(
    collection(db,...root(organizationId),'creativeAssets'),
    where('hash','==',hash),
    limit(1),
  );
  const snapshot=await getDocs(q);
  const first=snapshot.docs[0];
  if(!first) return null;
  const asset=first.data() as CreativeAsset;
  return asset.organizationId===organizationId ? asset : null;
}

export async function uploadCreativeAsset(input:{
  db:Firestore;
  storage:FirebaseStorage;
  organizationId:string;
  asset:CreativeAsset;
  blob:Blob;
}):Promise<CreativeAsset>{
  if(input.asset.organizationId!==input.organizationId) throw new Error('TENANT_MISMATCH');
  const duplicate=await findCreativeAssetByHash(input.db,input.organizationId,input.asset.hash);
  if(duplicate?.downloadUrl){
    const reused:CreativeAsset={
      ...input.asset,
      mimeType:'image/png',
      width:1000,
      height:1500,
      storagePath:duplicate.storagePath,
      downloadUrl:duplicate.downloadUrl,
    };
    await setDoc(doc(input.db,...root(input.organizationId),'creativeAssets',reused.id),{
      ...reused,
      organizationId:input.organizationId,
      deduplicatedFrom:duplicate.id,
      updatedAt:serverTimestamp(),
    },{merge:true});
    return reused;
  }

  const path='organizations/'+input.organizationId+'/creative-assets/'+input.asset.id+'.png';
  const objectRef=ref(input.storage,path);
  await uploadBytes(objectRef,input.blob,{
    contentType:'image/png',
    customMetadata:{
      organizationId:input.organizationId,
      campaignId:input.asset.campaignId,
      origin:input.asset.origin,
    },
  });
  const downloadUrl=await getDownloadURL(objectRef);
  const saved:CreativeAsset={
    ...input.asset,
    mimeType:'image/png',
    width:1000,
    height:1500,
    storagePath:path,
    downloadUrl,
  };
  await setDoc(doc(input.db,...root(input.organizationId),'creativeAssets',saved.id),{
    ...saved,
    organizationId:input.organizationId,
    updatedAt:serverTimestamp(),
  },{merge:true});
  return saved;
}

export async function saveLocalCreativeAssetMetadata(
  db:Firestore,
  organizationId:string,
  asset:CreativeAsset,
){
  if(asset.organizationId!==organizationId) throw new Error('TENANT_MISMATCH');
  await setDoc(doc(db,...root(organizationId),'creativeAssets',asset.id),{
    ...asset,
    organizationId,
    updatedAt:serverTimestamp(),
  },{merge:true});
}
