import {
  collection,
  doc,
  getDocs,
  setDoc,
  serverTimestamp,
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
  const ref = doc(campaignsCollection(db, organizationId), campaign.id);
  await setDoc(
    ref,
    {
      ...campaign,
      organizationId,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
