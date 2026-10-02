import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, type User } from 'firebase/auth';
import type { Role } from '@nestaffiliate/core';
import { auth, db, firebaseReady, googleProvider } from './firebase';

type State = 'loading' | 'signed-out' | 'ready' | 'denied';

interface WorkspaceIdentity {
  user: User | null;
  state: State;
  organizationId: string | null;
  role: Role | null;
  signIn: () => Promise<void>;
  switchAccount: () => Promise<void>;
  logout: () => Promise<void>;
  authError: string | null;
  authPending: boolean;
  clearAuthError: () => void;
}

const AuthContext = createContext<WorkspaceIdentity | null>(null);

const globalRoles = new Set(['ceo', 'global_admin', 'ecosystem_owner', 'founder']);

const redirectFallbackCodes = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported',
]);

function authErrorCode(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error && typeof (error as { code?: unknown }).code === 'string') {
    return (error as { code: string }).code;
  }
  return 'auth/unknown';
}

async function startGoogleSignIn() {
  if (!auth || !googleProvider || !firebaseReady) {
    throw Object.assign(new Error('Firebase Auth is not configured for this build.'), {
      code: 'auth/configuration-unavailable',
    });
  }

  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    const code = authErrorCode(error);
    if (redirectFallbackCodes.has(code)) {
      await signInWithRedirect(auth, googleProvider);
      return;
    }
    throw error;
  }
}

async function resolveWorkspace(user: User): Promise<{ organizationId: string; role: Role } | null> {
  if (!db) return null;
  const profileSnap = await getDoc(doc(db, 'users', user.uid));
  if (!profileSnap.exists()) return null;
  const profile = profileSnap.data() as Record<string, any>;
  const organizationId =
    profile.activeOrganizationId ??
    profile.organizationId ??
    profile.primaryOrganizationId ??
    profile.defaultOrganizationId ??
    (Array.isArray(profile.organizations) ? profile.organizations[0] : null);
  if (!organizationId || typeof organizationId !== 'string') return null;

  const organizationSnap = await getDoc(doc(db, 'organizations', organizationId));
  if (!organizationSnap.exists()) return null;

  const systemRole = String(profile.systemRole ?? profile.globalRole ?? '').toLowerCase();
  if (globalRoles.has(systemRole)) return { organizationId, role: 'owner' };

  const organization = organizationSnap.data() as Record<string, any>;
  const nestAffiliateAccess = organization.apps?.nestaffiliate;
  const entitlementActive =
    nestAffiliateAccess === true ||
    ['active', 'trialing'].includes(String(nestAffiliateAccess?.status ?? '').toLowerCase()) ||
    nestAffiliateAccess?.enabled === true;
  if (!entitlementActive) return null;

  const nested = await getDoc(doc(db, 'organizations', organizationId, 'members', user.uid));
  if (nested.exists()) {
    const data = nested.data();
    const status = String(data.status ?? 'active').toLowerCase();
    if (!['active', 'ativo'].includes(status)) return null;
    const role = String(data.role ?? data.organizationRole ?? 'viewer').toLowerCase();
    if (['owner', 'admin', 'editor', 'viewer'].includes(role)) {
      return { organizationId, role: role as Role };
    }
    return { organizationId, role: 'viewer' };
  }

  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const mock = import.meta.env.VITE_E2E_MOCK_AUTH === 'true';
  const [user, setUser] = useState<User | null>(null);
  const [state, setState] = useState<State>(mock ? 'ready' : 'loading');
  const [organizationId, setOrganizationId] = useState<string | null>(mock ? 'demo-org' : null);
  const [role, setRole] = useState<Role | null>(mock ? 'owner' : null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authPending, setAuthPending] = useState(false);

  useEffect(() => {
    if (mock) return;
    if (!auth || !firebaseReady) {
      setState('signed-out');
      return;
    }
    void getRedirectResult(auth).catch((error) => setAuthError(authErrorCode(error)));

    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setState('signed-out');
        setOrganizationId(null);
        setRole(null);
        return;
      }
      setState('loading');
      try {
        const resolved = await resolveWorkspace(nextUser);
        if (!resolved) {
          setState('denied');
          return;
        }
        setOrganizationId(resolved.organizationId);
        setRole(resolved.role);
        setAuthError(null);
        setState('ready');
      } catch {
        setState('denied');
      }
    });
  }, [mock]);

  const value = useMemo<WorkspaceIdentity>(() => ({
    user,
    state,
    organizationId,
    role,
    signIn: async () => {
      setAuthError(null);
      setAuthPending(true);
      try {
        await startGoogleSignIn();
      } catch (error) {
        setAuthError(authErrorCode(error));
        throw error;
      } finally {
        setAuthPending(false);
      }
    },
    switchAccount: async () => {
      setAuthError(null);
      setAuthPending(true);
      try {
        if (auth) await signOut(auth);
        await startGoogleSignIn();
      } catch (error) {
        setAuthError(authErrorCode(error));
        throw error;
      } finally {
        setAuthPending(false);
      }
    },
    logout: async () => {
      setAuthError(null);
      if (auth) await signOut(auth);
    },
    authError,
    authPending,
    clearAuthError: () => setAuthError(null),
  }), [user, state, organizationId, role, authError, authPending]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider missing');
  return value;
}
