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

// Firebase's official Web App Check setup requires activation before accessing
// Auth/Firestore/Storage. Do not wait until the AI button is pressed.
const DEFAULT_APPCHECK_SITE_KEY = '6LcpY-EtAAAAAElqBbIL_K7nAkm2wpuF6fbhsggG';
const siteKey = String(import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY || DEFAULT_APPCHECK_SITE_KEY).trim();
let nestAiAppCheck: AppCheck | null = null;
let appCheckInitializationError: unknown = null;
if (firebaseApp && siteKey && import.meta.env.VITE_E2E_MOCK_AUTH !== 'true') {
  try {
    nestAiAppCheck = initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (error) {
    // Auth and local copy remain available, while NestAI fails closed.
    appCheckInitializationError = error;
  }
}
export const auth = firebaseApp ? getAuth(firebaseApp) : null;
export const db = firebaseApp ? getFirestore(firebaseApp) : null;
export const storage = firebaseApp ? getStorage(firebaseApp) : null;
export const googleProvider = firebaseApp ? new GoogleAuthProvider() : null;

if (auth) {
  void setPersistence(auth, browserLocalPersistence);
  googleProvider?.setCustomParameters({ prompt: 'select_account' });
}


/** Firebase getToken() can resolve with { token: dummy, error } when
 * reCAPTCHA attestation fails. Never send that dummy value to Hub/NestAI.
 */
export function validatedAppCheckTokenResult(result:{
  token:string;error?:{code?:string}|null;
}):string{
  if(result.error){
    const raw=String(result.error.code??'');
    const code=raw==='appCheck/recaptcha-error'?'RECAPTCHA_ERROR':
      raw==='appCheck/initial-throttle'?'INITIAL_THROTTLE':
      raw==='appCheck/throttled'?'THROTTLED':
      raw==='appCheck/fetch-status-error'?'EXCHANGE_REJECTED':
      raw==='appCheck/fetch-network-error'?'EXCHANGE_NETWORK':
      'TOKEN_REJECTED';
    throw new Error('APP_CHECK_'+code);
  }
  if(!result.token || typeof result.token!=='string')throw new Error('APP_CHECK_EMPTY_TOKEN');
  return result.token;
}

export async function getNestAffiliateAppCheckToken(): Promise<string> {
  if (import.meta.env.VITE_E2E_MOCK_AUTH === 'true') return 'e2e-app-check-token';
  if (!firebaseApp) throw new Error('NESTAFFILIATE_FIREBASE_NOT_CONFIGURED');
  if (!siteKey) throw new Error('NESTAFFILIATE_APPCHECK_NOT_CONFIGURED');
  if (appCheckInitializationError)throw new Error('APP_CHECK_INITIALIZATION_FAILED');
  if (!nestAiAppCheck)throw new Error('APP_CHECK_NOT_INITIALIZED');
  return validatedAppCheckTokenResult(await readAppCheckToken(nestAiAppCheck, false));
}
