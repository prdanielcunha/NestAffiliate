import { collection, doc, getDocs, setDoc, serverTimestamp, type Firestore } from 'firebase/firestore';
import type { PerformanceDaily } from '@nestaffiliate/analytics';

function ref(db:Firestore,organizationId:string){
  return collection(db,'organizations',organizationId,'products','nestaffiliate','performanceDaily');
}

export async function listPerformance(db:Firestore,organizationId:string):Promise<PerformanceDaily[]>{
  const snapshot=await getDocs(ref(db,organizationId));
  return snapshot.docs
    .map((item)=>item.data() as PerformanceDaily)
    .filter((row)=>row.organizationId===organizationId)
    .sort((a,b)=>b.date.localeCompare(a.date));
}

export async function savePerformance(db:Firestore,organizationId:string,row:PerformanceDaily){
  if(row.organizationId!==organizationId) throw new Error('TENANT_MISMATCH');
  await setDoc(doc(ref(db,organizationId),row.id),{...row,updatedAt:serverTimestamp()},{merge:true});
}
