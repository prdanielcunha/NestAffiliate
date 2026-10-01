import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import type { Campaign } from '@nestaffiliate/core';

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
  const batch=writeBatch(db);
  batch.set(campaignRef, {
    ...campaign,
    organizationId,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  batch.set(versionRef, {
    ...campaign.currentVersion,
    organizationId,
    marketplace: campaign.marketplace,
    status: campaign.status,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  await batch.commit();
}
