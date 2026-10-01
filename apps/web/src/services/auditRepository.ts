import { collection, doc, setDoc, serverTimestamp, type Firestore } from 'firebase/firestore';

export interface AuditInput {
  organizationId:string;
  actorId:string;
  action:string;
  entityType:string;
  entityId:string;
  metadata?:Record<string,string|number|boolean|null>;
}

export async function appendAudit(db:Firestore,input:AuditInput){
  const id=`${Date.now()}-${crypto.randomUUID()}`;
  const target=doc(collection(db,'organizations',input.organizationId,'products','nestaffiliate','auditEvents'),id);
  await setDoc(target,{
    organizationId:input.organizationId,
    actorId:input.actorId,
    action:input.action,
    entityType:input.entityType,
    entityId:input.entityId,
    metadata:input.metadata ?? {},
    createdAt:serverTimestamp(),
  });
}
