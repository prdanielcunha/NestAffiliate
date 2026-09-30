import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
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
}

const AuthContext = createContext<WorkspaceIdentity | null>(null);

const globalRoles = new Set(['ceo', 'global_admin', 'ecosystem_owner', 'founder']);

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

  const systemRole = String(profile.systemRole ?? profile.globalRole ?? '').toLowerCase();
  if (globalRoles.has(systemRole)) return { organizationId, role: 'owner' };

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

  useEffect(() => {
    if (mock) return;
    if (!auth || !firebaseReady) {
      setState('signed-out');
      return;
    }
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
      if (!auth || !googleProvider) return;
      await signInWithPopup(auth, googleProvider);
    },
    switchAccount: async () => {
      if (!auth || !googleProvider) return;
      await signOut(auth);
      await signInWithPopup(auth, googleProvider);
    },
    logout: async () => {
      if (auth) await signOut(auth);
    },
  }), [user, state, organizationId, role]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider missing');
  return value;
}
