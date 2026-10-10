import {
  collection,
  doc,
  getDocs,
  runTransaction,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import type { Campaign } from '@nestaffiliate/core';
import { stripUndefinedFields } from './firestorePayload';

function campaignsCollection(db: Firestore, organizationId: string) {
  return collection(db, 'organizations', organizationId, 'products', 'nestaffiliate', 'campaigns');
}

export async function listCampaigns(db: Firestore, organizationId: string): Promise<Campaign[]> {
  const snapshot = await getDocs(campaignsCollection(db, organizationId));
  return snapshot.docs
    .map((item) => item.data() as Campaign)
    .filter((campaign) => campaign.organizationId === organizationId)
    .sort((a, b) => b.currentVersion.createdAt.localeCompare(a.currentVersion.createdAt));
}

export async function saveCampaign(db: Firestore, organizationId: string, campaign: Campaign) {
  if (campaign.organizationId !== organizationId) throw new Error('TENANT_MISMATCH');
  const root = ['organizations', organizationId, 'products', 'nestaffiliate'] as const;
  const campaignRef = doc(db, ...root, 'campaigns', campaign.id);
  const versionRef = doc(db, ...root, 'campaignVersions', campaign.currentVersion.id);

  await runTransaction(db, async (transaction) => {
    const currentSnapshot = await transaction.get(campaignRef);
    if (currentSnapshot.exists()) {
      const remote = currentSnapshot.data() as Campaign;
      const remoteVersion = remote.currentVersion?.version ?? 0;
      const remoteVersionId = remote.currentVersion?.id ?? '';
      const incoming = campaign.currentVersion;

      if (incoming.version < remoteVersion) {
        throw new Error('STALE_CAMPAIGN_WRITE');
      }

      if (incoming.id !== remoteVersionId) {
        const isDirectChild =
          incoming.parentVersionId === remoteVersionId &&
          incoming.version === remoteVersion + 1;
        if (!isDirectChild) {
          throw new Error('STALE_CAMPAIGN_WRITE');
        }
      }
    }

    transaction.set(
      campaignRef,
      stripUndefinedFields({
        ...campaign,
        organizationId,
        updatedAt: serverTimestamp(),
      }),
      { merge: true },
    );

    transaction.set(
      versionRef,
      stripUndefinedFields({
        ...campaign.currentVersion,
        organizationId,
        marketplace: campaign.marketplace,
        status: campaign.status,
        updatedAt: serverTimestamp(),
      }),
      { merge: true },
    );
  });
}
