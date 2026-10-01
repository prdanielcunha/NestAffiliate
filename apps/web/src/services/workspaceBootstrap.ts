import {
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import type { CreativeTemplate } from '@nestaffiliate/creative-engine';

export interface BootstrapInput {
  db: Firestore;
  organizationId: string;
  userId: string;
  locale: 'pt-BR' | 'en' | 'es';
  boards: string[];
  templates: CreativeTemplate[];
}

export async function ensureNestAffiliateWorkspace(input: BootstrapInput) {
  const root = ['organizations', input.organizationId, 'products', 'nestaffiliate'] as const;
  const preferenceRef = doc(input.db, ...root, 'userPreferences', input.userId);
  const existing = await getDoc(preferenceRef);
  if (existing.exists() && existing.data().workspaceInitialized === true) {
    return { initialized: false };
  }

  const batch = writeBatch(input.db);
  batch.set(
    preferenceRef,
    {
      organizationId: input.organizationId,
      userId: input.userId,
      locale: input.locale,
      brandName: 'Achados do Nest',
      desiredPinterestUsername: '@achadosdonest',
      zeroCostMode: true,
      workspaceInitialized: true,
      initializedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  input.boards.forEach((name, index) => {
    const id = `board-${String(index + 1).padStart(2, '0')}`;
    batch.set(
      doc(input.db, ...root, 'boards', id),
      {
        organizationId: input.organizationId,
        name,
        order: index + 1,
        status: 'suggested',
        source: 'nestaffiliate-default',
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });

  input.templates.forEach((template, index) => {
    batch.set(
      doc(input.db, ...root, 'creativeTemplates', template.id),
      {
        organizationId: input.organizationId,
        ...template,
        order: index + 1,
        engineVersion: '1.0',
        status: 'active',
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });

  await batch.commit();
  return { initialized: true };
}
