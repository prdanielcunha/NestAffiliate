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
  version: '1.0' | '2.0';
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
  parentVersionId?: string;
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

export interface CampaignRankingContext {
  rank?: number;
  trackingCode?: string;
  evidence: string[];
  signalSources: string[];
}

export interface Campaign {
  id: string;
  organizationId: string;
  status: CampaignStatus;
  marketplace: Marketplace;
  score: NestScoreResult;
  currentVersion: CampaignVersion;
  history: CampaignVersion[];
  rankingContext?: CampaignRankingContext;
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
  trackingCode?: string;
  suggestedPublishAt?: string;
  compliance: ComplianceOutcome;
}

export function canWrite(role: Role) {
  return role === 'owner' || role === 'admin' || role === 'editor';
}

export function canAdmin(role: Role) {
  return role === 'owner' || role === 'admin';
}

export interface ProductOffer {
  id: string;
  organizationId: string;
  productId: string;
  marketplace: Marketplace;
  url: TruthValue<string>;
  affiliateUrl?: TruthValue<string>;
  price?: TruthValue<number>;
  commissionRate?: TruthValue<number>;
  availability: TruthValue<'available' | 'unavailable' | 'unknown'>;
}

export interface ApprovalEvent {
  id: string;
  organizationId: string;
  campaignId: string;
  campaignVersion: number;
  actorId: string;
  decision:
    | 'APPROVED'
    | 'REJECTED'
    | 'EDITED'
    | 'SWAPPED'
    | 'RESTORED'
    | 'REGENERATED'
    | 'PREFERRED_VARIANT';
  createdAt: string;
  note?: string;
}

export type PublicationStatus =
  | 'GUIDED_READY'
  | 'SCHEDULED'
  | 'DUE'
  | 'VALIDATING'
  | 'PUBLISHING'
  | 'PUBLISHED'
  | 'BLOCKED'
  | 'FAILED'
  | 'CANCELLED';

export interface Publication {
  id: string;
  organizationId: string;
  campaignId: string;
  campaignVersion: number;
  channel: 'PINTEREST';
  status: PublicationStatus;
  mode: 'GUIDED' | 'PINTEREST_API';
  externalId?: string;
  externalUrl?: string;
  scheduledFor?: string;
  approvedAt?: string;
  lastValidatedAt?: string;
  publishedAt?: string;
  failureCode?: string;
  source: 'GUIDED' | 'PINTEREST_API';
}

export function nextCampaignVersion(
  campaign: Campaign,
  patch: Partial<Pick<CampaignVersion, 'product' | 'narrative' | 'boardName' | 'keyword' | 'template'>>,
  reason: string,
): Campaign {
  const previous = campaign.currentVersion;
  const suffix =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID().slice(0, 8)
      : Date.now().toString(36);
  const next: CampaignVersion = {
    ...previous,
    ...patch,
    id: `${campaign.id}-v${previous.version + 1}-${suffix}`,
    parentVersionId: previous.id,
    version: previous.version + 1,
    createdAt: new Date().toISOString(),
    reason,
  };
  const hasPrevious = campaign.history.some((item) => item.id === previous.id);
  const history = hasPrevious ? campaign.history : [...campaign.history, previous];
  return { ...campaign, currentVersion: next, history };
}

export function restoreCampaignVersion(campaign: Campaign, version: number): Campaign {
  const source =
    campaign.currentVersion.version === version
      ? campaign.currentVersion
      : campaign.history.find((item) => item.version === version);
  if (!source) throw new Error('CAMPAIGN_VERSION_NOT_FOUND');
  return nextCampaignVersion(
    campaign,
    {
      product: source.product,
      narrative: source.narrative,
      boardName: source.boardName,
      keyword: source.keyword,
      template: source.template,
    },
    `restore v${version}`,
  );
}

export function campaignVersions(campaign: Campaign) {
  return [...campaign.history, campaign.currentVersion]
    .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index)
    .sort((a, b) => b.version - a.version);
}


export interface PublicationSchedule {
  id:string;
  organizationId:string;
  campaignId:string;
  campaignVersion:number;
  mode:'GUIDED'|'PINTEREST_API';
  scheduledFor:string;
  timezone:string;
  status:'SCHEDULED'|'DUE'|'COMPLETED'|'CANCELLED'|'BLOCKED';
  createdAt:string;
  updatedAt:string;
}

export function publicationScheduleStatus(
  schedule:PublicationSchedule,
  now=new Date(),
):PublicationSchedule['status']{
  if(['COMPLETED','CANCELLED','BLOCKED'].includes(schedule.status)) return schedule.status;
  const due=new Date(schedule.scheduledFor).getTime();
  if(!Number.isFinite(due)) return 'BLOCKED';
  return due<=now.getTime() ? 'DUE' : 'SCHEDULED';
}

export function validateScheduledFor(value:string,now=new Date()){
  const at=new Date(value);
  if(!Number.isFinite(at.getTime())) return {valid:false,reason:'INVALID_DATE'} as const;
  if(at.getTime()<=now.getTime()) return {valid:false,reason:'NOT_IN_FUTURE'} as const;
  return {valid:true,iso:at.toISOString()} as const;
}
