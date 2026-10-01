import { collection, doc, serverTimestamp, setDoc, type Firestore } from 'firebase/firestore';
import type { Campaign, PublicationPackage } from '@nestaffiliate/core';

export async function appendApprovalEvent(db:Firestore,input:{
  organizationId:string;campaign:Campaign;actorId:string;decision:'APPROVED'|'REJECTED'|'EDITED'|'SWAPPED'|'RESTORED';note?:string;
}){
  const id=`${input.campaign.id}-v${input.campaign.currentVersion.version}-${Date.now()}`;
  await setDoc(doc(collection(db,'organizations',input.organizationId,'products','nestaffiliate','approvalEvents'),id),{
    organizationId:input.organizationId,
    campaignId:input.campaign.id,
    campaignVersion:input.campaign.currentVersion.version,
    actorId:input.actorId,
    decision:input.decision,
    note:input.note ?? '',
    createdAt:serverTimestamp(),
  });
}

export async function savePublicationPackage(db:Firestore,organizationId:string,pkg:PublicationPackage){
  const id=`${pkg.campaignId}-v${pkg.version}`;
  await setDoc(doc(db,'organizations',organizationId,'products','nestaffiliate','publicationPackages',id),{
    ...pkg,organizationId,updatedAt:serverTimestamp(),
  },{merge:true});
}

export async function markPublication(db:Firestore,input:{
  organizationId:string;campaign:Campaign;source:'GUIDED'|'PINTEREST_API';externalId?:string;externalUrl?:string;
}){
  const id=`${input.campaign.id}-v${input.campaign.currentVersion.version}`;
  await setDoc(doc(db,'organizations',input.organizationId,'products','nestaffiliate','publications',id),{
    organizationId:input.organizationId,
    campaignId:input.campaign.id,
    campaignVersion:input.campaign.currentVersion.version,
    channel:'PINTEREST',
    status:'PUBLISHED',
    source:input.source,
    externalId:input.externalId ?? null,
    externalUrl:input.externalUrl ?? null,
    publishedAt:serverTimestamp(),
  },{merge:true});
}
