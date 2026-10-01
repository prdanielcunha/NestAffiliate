import { doc, getDoc, serverTimestamp, setDoc, type Firestore } from 'firebase/firestore';

export interface UserPreferences {
  organizationId:string;
  userId:string;
  brandName:string;
  desiredPinterestUsername:string;
  publishingMode:'guided'|'api_when_available';
  maxPublications24h:number | null;
  minGapMinutes:number | null;
  learningEnabled:boolean;
  locale:'pt-BR'|'en'|'es';
}

export function defaultPreferences(
  organizationId:string,
  userId:string,
  locale:UserPreferences['locale'],
):UserPreferences{
  return {
    organizationId,
    userId,
    brandName:'Achados do Nest',
    desiredPinterestUsername:'@achadosdonest',
    publishingMode:'guided',
    maxPublications24h:null,
    minGapMinutes:null,
    learningEnabled:true,
    locale,
  };
}

export async function loadUserPreferences(
  db:Firestore,
  organizationId:string,
  userId:string,
  locale:UserPreferences['locale'],
):Promise<UserPreferences>{
  const ref=doc(db,'organizations',organizationId,'products','nestaffiliate','userPreferences',userId);
  const snapshot=await getDoc(ref);
  const fallback=defaultPreferences(organizationId,userId,locale);
  if(!snapshot.exists()) return fallback;
  const data=snapshot.data() as Partial<UserPreferences>;
  return {
    ...fallback,
    ...data,
    organizationId,
    userId,
    maxPublications24h:typeof data.maxPublications24h==='number' ? Math.max(1,Math.floor(data.maxPublications24h)) : null,
    minGapMinutes:typeof data.minGapMinutes==='number' ? Math.max(1,Math.floor(data.minGapMinutes)) : null,
    learningEnabled:data.learningEnabled !== false,
    locale:['pt-BR','en','es'].includes(String(data.locale)) ? data.locale as UserPreferences['locale'] : locale,
  };
}

export async function saveUserPreferences(
  db:Firestore,
  preferences:UserPreferences,
){
  await setDoc(
    doc(db,'organizations',preferences.organizationId,'products','nestaffiliate','userPreferences',preferences.userId),
    {...preferences,updatedAt:serverTimestamp()},
    {merge:true},
  );
}
