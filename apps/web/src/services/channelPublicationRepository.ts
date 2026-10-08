import {doc,setDoc,serverTimestamp,type Firestore} from 'firebase/firestore';
import {canWrite,type Campaign,type Role} from '@nestaffiliate/core';
import {isPublicFacebookReelUrl} from '@nestaffiliate/compliance';

export async function recordUserReportedFacebookReel(input:{
  db:Firestore;organizationId:string;campaign:Campaign;externalUrl:string;actorId:string;role:Role;
  affiliateEligibilityConfirmed:boolean;productTagConfirmed:boolean;originalFootageConfirmed:boolean;
}) {
  if(input.organizationId!==input.campaign.organizationId)throw new Error('TENANT_MISMATCH');
  if(!canWrite(input.role))throw new Error('ROLE_FORBIDDEN');
  if(input.campaign.marketplace!=='SHOPEE')throw new Error('CHANNEL_MARKETPLACE_NOT_ALLOWED');
  if(!input.affiliateEligibilityConfirmed||!input.productTagConfirmed||!input.originalFootageConfirmed)
    throw new Error('FACEBOOK_AFFILIATE_REQUIREMENTS_UNCONFIRMED');
  if(!isPublicFacebookReelUrl(input.externalUrl))throw new Error('FACEBOOK_REEL_URL_INVALID');
  const id=`facebook-reel:${input.campaign.id}:v${input.campaign.currentVersion.version}`;
  await setDoc(doc(input.db,'organizations',input.organizationId,'products','nestaffiliate','channelPublications',id),{
    id,organizationId:input.organizationId,
    campaignId:input.campaign.id,campaignVersion:input.campaign.currentVersion.version,
    channel:'FACEBOOK_REELS',marketplace:'SHOPEE',status:'USER_REPORTED',
    externalUrl:input.externalUrl.trim(),actorId:input.actorId,
    eligibilityAttested:true,tagAttested:true,footageRightsAttested:true,
    updatedAt:serverTimestamp(),
  },{merge:true});
}
