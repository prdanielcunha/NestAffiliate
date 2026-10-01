import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import type { PublicationSchedule } from '@nestaffiliate/core';
import { publicationScheduleStatus } from '@nestaffiliate/core';

const path=(organizationId:string)=>[
  'organizations',organizationId,'products','nestaffiliate','publicationSchedules',
] as const;

function asIso(value:unknown,fallback:string){
  if(typeof value==='string') return value;
  if(value && typeof (value as {toDate?:()=>Date}).toDate==='function'){
    return (value as {toDate:()=>Date}).toDate().toISOString();
  }
  return fallback;
}

export async function listPublicationSchedules(
  db:Firestore,
  organizationId:string,
):Promise<PublicationSchedule[]>{
  const snapshot=await getDocs(collection(db,...path(organizationId)));
  const now=new Date().toISOString();
  return snapshot.docs.map((item)=>{
    const data=item.data() as Partial<PublicationSchedule>;
    const schedule:PublicationSchedule={
      id:item.id,
      organizationId,
      campaignId:String(data.campaignId ?? ''),
      campaignVersion:Number(data.campaignVersion ?? 1),
      mode:data.mode==='PINTEREST_API' ? 'PINTEREST_API' : 'GUIDED',
      scheduledFor:asIso(data.scheduledFor,now),
      timezone:String(data.timezone ?? 'America/Sao_Paulo'),
      status:['SCHEDULED','DUE','COMPLETED','CANCELLED','BLOCKED'].includes(String(data.status))
        ? data.status as PublicationSchedule['status']
        : 'SCHEDULED',
      createdAt:asIso(data.createdAt,now),
      updatedAt:asIso(data.updatedAt,now),
    };
    return {...schedule,status:publicationScheduleStatus(schedule)};
  }).sort((a,b)=>new Date(a.scheduledFor).getTime()-new Date(b.scheduledFor).getTime());
}

export async function savePublicationSchedule(
  db:Firestore,
  schedule:PublicationSchedule,
){
  await setDoc(
    doc(db,...path(schedule.organizationId),schedule.id),
    {...schedule,updatedAt:serverTimestamp()},
    {merge:true},
  );
}

export async function completePublicationSchedule(
  db:Firestore,
  organizationId:string,
  id:string,
){
  await setDoc(
    doc(db,...path(organizationId),id),
    {status:'COMPLETED',updatedAt:serverTimestamp()},
    {merge:true},
  );
}
