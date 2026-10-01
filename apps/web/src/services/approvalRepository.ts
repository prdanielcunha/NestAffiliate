import { collection, getDocs, type Firestore, type Timestamp } from 'firebase/firestore';
import type { ApprovalEvent } from '@nestaffiliate/core';

function toIso(value:unknown){
  if(typeof value==='string') return value;
  if(value && typeof (value as Timestamp).toDate==='function'){
    return (value as Timestamp).toDate().toISOString();
  }
  return new Date(0).toISOString();
}

export async function listApprovalEvents(
  db:Firestore,
  organizationId:string,
):Promise<ApprovalEvent[]>{
  const snapshot=await getDocs(
    collection(db,'organizations',organizationId,'products','nestaffiliate','approvalEvents'),
  );
  return snapshot.docs
    .map((item)=>{
      const data=item.data() as Partial<ApprovalEvent>;
      return {
        id:item.id,
        organizationId,
        campaignId:String(data.campaignId ?? ''),
        campaignVersion:Number(data.campaignVersion ?? 1),
        actorId:String(data.actorId ?? ''),
        decision:data.decision as ApprovalEvent['decision'],
        createdAt:toIso(data.createdAt),
        note:typeof data.note==='string' ? data.note : undefined,
      } satisfies ApprovalEvent;
    })
    .sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}
