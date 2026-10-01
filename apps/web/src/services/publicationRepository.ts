import { collection, getDocs, type Firestore, type Timestamp } from 'firebase/firestore';

export interface PublicationFrequencyState {
  publications24h:number;
  minutesSinceLastPublication?:number;
}

export async function loadPublicationFrequency(
  db:Firestore,
  organizationId:string,
  now=new Date(),
):Promise<PublicationFrequencyState>{
  const snapshot=await getDocs(collection(db,'organizations',organizationId,'products','nestaffiliate','publications'));
  const times=snapshot.docs
    .map((item)=>{
      const value=item.data().publishedAt as Timestamp | Date | string | undefined;
      if(!value) return null;
      if(typeof value==='string') return new Date(value);
      if(value instanceof Date) return value;
      if(typeof (value as Timestamp).toDate==='function') return (value as Timestamp).toDate();
      return null;
    })
    .filter((value):value is Date=>Boolean(value && Number.isFinite(value.getTime())))
    .sort((a,b)=>b.getTime()-a.getTime());

  const cutoff=now.getTime()-24*60*60*1000;
  const publications24h=times.filter((value)=>value.getTime()>=cutoff).length;
  const last=times[0];
  return {
    publications24h,
    minutesSinceLastPublication:last
      ? Math.max(0,Math.floor((now.getTime()-last.getTime())/60000))
      : undefined,
  };
}
