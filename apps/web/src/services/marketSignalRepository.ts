import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import type { CommerceSignal } from '@nestaffiliate/radar';

const collectionPath=(organizationId:string)=>[
  'organizations',organizationId,'products','nestaffiliate','marketSignalSnapshots',
] as const;

export async function listMarketSignals(
  db:Firestore,
  organizationId:string,
):Promise<CommerceSignal[]>{
  const snapshot=await getDocs(collection(db,...collectionPath(organizationId)));
  return snapshot.docs
    .map((item)=>{
      const data=item.data() as Partial<CommerceSignal>;
      return {
        id:item.id,
        source:data.source ?? 'MANUAL',
        kind:data.kind ?? 'DEMAND',
        strength:Number(data.strength ?? 0),
        confidence:Number(data.confidence ?? 0),
        observedAt:String(data.observedAt ?? new Date(0).toISOString()),
        label:String(data.label ?? item.id),
        evidence:Array.isArray(data.evidence) ? data.evidence.map(String) : [],
        rank:typeof data.rank==='number' ? data.rank : undefined,
        keyword:typeof data.keyword==='string' ? data.keyword : undefined,
        productExternalId:typeof data.productExternalId==='string' ? data.productExternalId : undefined,
        commissionRate:typeof data.commissionRate==='number' ? data.commissionRate : undefined,
        futureProvider:Boolean(data.futureProvider),
      } satisfies CommerceSignal;
    })
    .filter((signal)=>Number.isFinite(signal.strength) && Number.isFinite(signal.confidence));
}

export async function saveMarketSignal(
  db:Firestore,
  organizationId:string,
  signal:CommerceSignal,
){
  await setDoc(
    doc(db,...collectionPath(organizationId),signal.id.replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,180)),
    {
      ...signal,
      organizationId,
      updatedAt:serverTimestamp(),
    },
    {merge:true},
  );
}

export async function saveMarketSignals(
  db:Firestore,
  organizationId:string,
  signals:CommerceSignal[],
){
  await Promise.all(signals.map((signal)=>saveMarketSignal(db,organizationId,signal)));
}
