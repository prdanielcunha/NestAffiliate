import {deleteDoc,doc,getDoc,runTransaction,serverTimestamp,type Firestore} from 'firebase/firestore';
import type {RadarWorkspace} from './radarWorkspace';
import {sanitizeRadarWorkspace} from './radarWorkspace';

type CloudDoc={organizationId:string;userId:string;clientUpdatedAt:string;workspace:RadarWorkspace};
const idValid=(id:string)=>id.length>0&&id.length<=180&&!id.includes('/')&&id!=='.'&&id!=='..';
export function radarPrivateWorkspacePath(userId:string,organizationId:string):string{
  if(!idValid(userId)||!idValid(organizationId))throw new Error('WORKSPACE_ID_INVALID');
  // Hub firestore.rules match /users/{userId}/{document=**} allows only the document owner.
  // Do not use organizations/.../userPreferences because ordinary members can read it.
  return 'users/'+userId+'/nestAffiliateRadarWorkspaces/'+organizationId;
}
export function workspaceModifiedAt(value:RadarWorkspace):number{
  const parsed=Date.parse(String(value.updatedAt??''));
  return Number.isFinite(parsed)?parsed:0;
}
export function chooseWorkspaceVersion(local:RadarWorkspace,remote:RadarWorkspace):'local'|'remote'{
  return workspaceModifiedAt(remote)>workspaceModifiedAt(local)?'remote':'local';
}
function verifiedRemote(data:unknown,userId:string,organizationId:string):RadarWorkspace|null{
  if(!data||typeof data!=='object')return null;
  const value=data as Partial<CloudDoc>;
  if(value.userId!==userId||value.organizationId!==organizationId)throw new Error('WORKSPACE_TENANT_MISMATCH');
  if(!value.workspace||typeof value.workspace!=='object')return null;
  const safe=sanitizeRadarWorkspace(value.workspace);
  if(workspaceModifiedAt(safe)===0 && typeof value.clientUpdatedAt==='string'){
    safe.updatedAt=value.clientUpdatedAt;
  }
  return safe;
}
export async function readPrivateRadarWorkspace(input:{db:Firestore;userId:string;organizationId:string}):Promise<RadarWorkspace|null>{
  const ref=doc(input.db,radarPrivateWorkspacePath(input.userId,input.organizationId));
  const snap=await getDoc(ref);
  return snap.exists()?verifiedRemote(snap.data(),input.userId,input.organizationId):null;
}
export type RadarCloudSyncResult={mode:'uploaded'|'remote_newer'|'unchanged';workspace:RadarWorkspace};
export async function syncPrivateRadarWorkspace(input:{
  db:Firestore;userId:string;organizationId:string;workspace:RadarWorkspace;
}):Promise<RadarCloudSyncResult>{
  const ref=doc(input.db,radarPrivateWorkspacePath(input.userId,input.organizationId));
  const local=sanitizeRadarWorkspace(input.workspace);
  return runTransaction(input.db,async transaction=>{
    const snapshot=await transaction.get(ref);
    const remote=snapshot.exists()?verifiedRemote(snapshot.data(),input.userId,input.organizationId):null;
    if(remote && chooseWorkspaceVersion(local,remote)==='remote'){
      return {mode:'remote_newer',workspace:remote};
    }
    if(remote && workspaceModifiedAt(remote)===workspaceModifiedAt(local)){
      return {mode:'unchanged',workspace:local};
    }
    transaction.set(ref,{
      organizationId:input.organizationId,
      userId:input.userId,
      clientUpdatedAt:local.updatedAt??new Date(0).toISOString(),
      workspace:{...local,syncEnabled:false},
      updatedAt:serverTimestamp(),
    },{merge:true});
    return {mode:'uploaded',workspace:local};
  });
}

export async function deletePrivateRadarWorkspace(input:{db:Firestore;userId:string;organizationId:string}):Promise<void>{
  await deleteDoc(doc(input.db,radarPrivateWorkspacePath(input.userId,input.organizationId)));
}
