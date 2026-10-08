import { collection, doc, getDocs, setDoc, serverTimestamp, writeBatch, type Firestore } from 'firebase/firestore';
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

/** Idempotent batch import, no append-only double counting on retry. */
export async function savePerformanceBatch(db:Firestore,organizationId:string,rows:PerformanceDaily[]):Promise<void>{
 if(!rows.length||rows.length>200)throw new Error('PERFORMANCE_CSV_LIMIT');
 if(rows.some(row=>row.organizationId!==organizationId||row.source!=='PINTEREST_CSV'||row.salesKnown!==false))throw new Error('PERFORMANCE_TENANT_OR_PROVENANCE_INVALID');
 const batch=writeBatch(db);
 for(const row of rows){batch.set(doc(ref(db,organizationId),row.id),{...row,updatedAt:serverTimestamp()},{merge:false});}
 await batch.commit();
}
