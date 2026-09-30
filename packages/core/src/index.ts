export type Role = 'owner' | 'admin' | 'editor' | 'viewer';
export type Marketplace = 'MELI' | 'SHOPEE' | 'AMAZON';
export type AssetRightsStatus = 'AUTHORIZED' | 'PLATFORM_PROVIDED' | 'USER_PROVIDED' | 'GENERATED' | 'UNKNOWN' | 'BLOCKED';
export type ComplianceOutcome = 'PASS' | 'WARN' | 'BLOCK';
export type Confidence = 'low' | 'medium' | 'high';

export interface TruthValue<T> {
  value: T;
  source: string;
  observedAt: string;
}

export interface ProductTruth {
  productId: string;
  organizationId: string;
  marketplace: Marketplace;
  externalId: string;
  title: TruthValue<string>;
  url: TruthValue<string>;
  affiliateUrl?: TruthValue<string>;
  price?: TruthValue<number>;
  currency: TruthValue<string>;
  sellerName?: TruthValue<string>;
  sellerReputation?: TruthValue<number>;
  rating?: TruthValue<number>;
  reviewCount?: TruthValue<number>;
  availability: TruthValue<'available' | 'unavailable' | 'unknown'>;
  imageUrl?: TruthValue<string>;
  assetRights: AssetRightsStatus;
}

export interface CreativeNarrative {
  headline: string;
  subheadline?: string;
  pinterestTitle: string;
  description: string;
  disclosure: string;
  altText: string;
  cta: string;
}

export interface NestScoreDimensions {
  trend: number;
  intent: number;
  visual: number;
  yield: number;
  quality: number;
  competition: number;
  creative: number;
  seasonality: number;
  dataConfidence: number;
}

export interface NestScoreResult {
  score: number;
  confidence: Confidence;
  reasons: string[];
  risks: string[];
  version: '1.0';
  dimensions: NestScoreDimensions;
}

export type CampaignStatus =
  | 'READY'
  | 'APPROVED'
  | 'PUBLICATION_READY'
  | 'PUBLISHED'
  | 'REJECTED'
  | 'BLOCKED';

export interface CampaignVersion {
  id: string;
  campaignId: string;
  version: number;
  createdAt: string;
  reason: string;
  product: ProductTruth;
  narrative: CreativeNarrative;
  boardName: string;
  keyword: string;
  template: string;
}

export interface Campaign {
  id: string;
  organizationId: string;
  status: CampaignStatus;
  marketplace: Marketplace;
  score: NestScoreResult;
  currentVersion: CampaignVersion;
  history: CampaignVersion[];
}

export interface PublicationPackage {
  campaignId: string;
  version: number;
  filename: string;
  width: 1000;
  height: 1500;
  title: string;
  description: string;
  disclosure: string;
  destinationUrl: string;
  boardName: string;
  topics: string[];
  altText: string;
  suggestedPublishAt?: string;
  compliance: ComplianceOutcome;
}

export function canWrite(role: Role) {
  return role === 'owner' || role === 'admin' || role === 'editor';
}

export function canAdmin(role: Role) {
  return role === 'owner' || role === 'admin';
}

export function nextCampaignVersion(
  campaign: Campaign,
  patch: Partial<Pick<CampaignVersion, 'product' | 'narrative' | 'boardName' | 'keyword' | 'template'>>,
  reason: string,
): Campaign {
  const previous = campaign.currentVersion;
  const next: CampaignVersion = {
    ...previous,
    ...patch,
    id: `${campaign.id}-v${previous.version + 1}`,
    version: previous.version + 1,
    createdAt: new Date().toISOString(),
    reason,
  };
  return { ...campaign, currentVersion: next, history: [...campaign.history, next] };
}
