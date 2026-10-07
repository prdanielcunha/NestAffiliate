import { collection,doc,getDocs,serverTimestamp,writeBatch,type Firestore } from 'firebase/firestore';
import type { AffiliateResult } from '@nestaffiliate/analytics';

function resultsCollection(db:Firestore,organizationId:string){
  return collection(db,'organizations',organizationId,'products','nestaffiliate','affiliateResults');
}
export async function listAffiliateResults(db:Firestore,organizationId:string):Promise<AffiliateResult[]>{
  const snap=await getDocs(resultsCollection(db,organizationId));
  return snap.docs.map((entry)=>entry.data() as AffiliateResult)
    .filter((item)=>item.organizationId===organizationId);
}
export async function saveAffiliateResults(db:Firestore,organizationId:string,rows:AffiliateResult[]){
  if(rows.some((row)=>row.organizationId!==organizationId))throw new Error('TENANT_MISMATCH');
  // Two writes per transaction: ledger snapshot + append-only provenance event.
  if(rows.length>200)throw new Error('IMPORT_BATCH_TOO_LARGE');
  // Stable ids make repeated imports idempotent: no extra orders or fake commissions.
  const batch=writeBatch(db);
  for(const row of rows){
    if(!/^(MELI|SHOPEE):[a-zA-Z0-9_.:-]{1,96}$/.test(row.id))throw new Error('TRANSACTION_ID_INVALID');
    batch.set(doc(resultsCollection(db,organizationId),row.id),{...row,updatedAt:serverTimestamp()},{merge:true});
    // Preserve each statement's transaction status even if later reports
    // approve, reverse or correct the current ledger snapshot.
    const eventId=`${row.id}:${row.statementId}`;
    batch.set(
      doc(db,'organizations',organizationId,'products','nestaffiliate','affiliateResultEvents',eventId),
      {...row,eventId,recordedAt:serverTimestamp()},
      {merge:true},
    );
  }
  await batch.commit();
}
