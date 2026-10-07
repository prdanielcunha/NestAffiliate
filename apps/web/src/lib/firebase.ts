import { initializeApp, getApps } from 'firebase/app';
import { browserLocalPersistence, getAuth, GoogleAuthProvider, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, getToken as readAppCheckToken, type AppCheck } from 'firebase/app-check';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'millionsnest.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'millionsnest',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'millionsnest.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseReady = Boolean(config.apiKey && config.appId);
export const firebaseApp = firebaseReady ? (getApps()[0] ?? initializeApp(config)) : null;
export const auth = firebaseApp ? getAuth(firebaseApp) : null;
export const db = firebaseApp ? getFirestore(firebaseApp) : null;
export const storage = firebaseApp ? getStorage(firebaseApp) : null;
export const googleProvider = firebaseApp ? new GoogleAuthProvider() : null;

if (auth) {
  void setPersistence(auth, browserLocalPersistence);
  googleProvider?.setCustomParameters({ prompt: 'select_account' });
}


const DEFAULT_APPCHECK_SITE_KEY = '6LcpY-EtAAAAAElqBbIL_K7nAkm2wpuF6fbhsggG';
let nestAiAppCheck: AppCheck | null = null;

export async function getNestAffiliateAppCheckToken(): Promise<string> {
  if (!firebaseApp) throw new Error('NESTAFFILIATE_FIREBASE_NOT_CONFIGURED');
  const siteKey = String(import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY || DEFAULT_APPCHECK_SITE_KEY).trim();
  if (!siteKey) throw new Error('NESTAFFILIATE_APPCHECK_NOT_CONFIGURED');
  if (!nestAiAppCheck) {
    nestAiAppCheck = initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  }
  return (await readAppCheckToken(nestAiAppCheck, false)).token;
}
