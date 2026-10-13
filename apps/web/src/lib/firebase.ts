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

/**
 * Firebase getToken() can return an error-bearing dummy token OR reject.
 * Preserve only an allowlisted, token-free error category and optional
 * numeric HTTP status from the SDK. Never expose the raw FirebaseError
 * message, customData, API key, request body, or reCAPTCHA token.
 */
export function normalizeAppCheckFailure(error:unknown):Error{
  const record=(error&&typeof error==='object')?error as {
    code?:unknown;customData?:{httpStatus?:unknown}
  }:{};
  const raw=typeof record.code==='string'?record.code:'';
  const known:Record<string,string>={
    'appCheck/recaptcha-error':'RECAPTCHA_ERROR',
    'appCheck/initial-throttle':'INITIAL_THROTTLE',
    'appCheck/throttled':'THROTTLED',
    'appCheck/fetch-status-error':'EXCHANGE_REJECTED',
    'appCheck/fetch-network-error':'EXCHANGE_NETWORK',
    'appCheck/fetch-parse-error':'EXCHANGE_PARSE_ERROR',
    'appCheck/storage-open':'STORAGE_OPEN',
    'appCheck/storage-get':'STORAGE_GET',
    'appCheck/storage-set':'STORAGE_SET',
    'appCheck/already-initialized':'ALREADY_INITIALIZED',
    'appCheck/use-before-activation':'USE_BEFORE_ACTIVATION',
    'appCheck/token-expired':'TOKEN_EXPIRED',
  };
  const safeCode=known[raw]??(
    /^appCheck\/[a-z-]{1,48}$/.test(raw)
      ?'SDK_'+raw.slice('appCheck/'.length).replace(/-/g,'_').toUpperCase()
      :'SDK_UNKNOWN'
  );
  const val=record.customData?.httpStatus;
  const parsed=(typeof val==='number'||typeof val==='string')?Number(val):NaN;
  const http=Number.isInteger(parsed)&&parsed>=400&&parsed<=599?
    '_HTTP_'+parsed:'';
  return new Error('APP_CHECK_'+safeCode+http);
}

export function validatedAppCheckTokenResult(result:{
  token:string;error?:unknown;
}):string{
  if(result.error)throw normalizeAppCheckFailure(result.error);
  if(!result.token || typeof result.token!=='string')throw new Error('APP_CHECK_EMPTY_TOKEN');
  return result.token;
}

export async function getNestAffiliateAppCheckToken(): Promise<string> {
  if (import.meta.env.VITE_E2E_MOCK_AUTH === 'true') return 'e2e-app-check-token';
  if (!firebaseApp) throw new Error('NESTAFFILIATE_FIREBASE_NOT_CONFIGURED');
  const siteKey = String(import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY || DEFAULT_APPCHECK_SITE_KEY).trim();
  if (!siteKey) throw new Error('NESTAFFILIATE_APPCHECK_NOT_CONFIGURED');
  if (!nestAiAppCheck) {
    try{
    nestAiAppCheck = initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
    }catch(error){throw normalizeAppCheckFailure(error);}
  }
  try{
    return validatedAppCheckTokenResult(await readAppCheckToken(nestAiAppCheck, false));
  }catch(error){
    // If validation already converted to a safe error, do not hide that code.
    if(error instanceof Error&&/^APP_CHECK_[A-Z0-9_]+$/.test(error.message))throw error;
    throw normalizeAppCheckFailure(error);
  }
}
