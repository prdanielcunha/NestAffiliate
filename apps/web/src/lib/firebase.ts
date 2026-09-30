import { initializeApp, getApps } from 'firebase/app';
import { browserLocalPersistence, getAuth, GoogleAuthProvider, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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
export const googleProvider = firebaseApp ? new GoogleAuthProvider() : null;

if (auth) {
  void setPersistence(auth, browserLocalPersistence);
  googleProvider?.setCustomParameters({ prompt: 'select_account' });
}
