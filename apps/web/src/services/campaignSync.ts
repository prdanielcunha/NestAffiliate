import type { Campaign } from '@nestaffiliate/core';

export function mergePendingCampaigns(remote: Campaign[], pending: Iterable<Campaign>): Campaign[] {
  const all = new Map(remote.map((campaign) => [campaign.id, campaign]));
  for (const campaign of pending) all.set(campaign.id, campaign);
  return [...all.values()].sort((a,b) =>
    (b.currentVersion?.createdAt ?? '').localeCompare(a.currentVersion?.createdAt ?? ''));
}
