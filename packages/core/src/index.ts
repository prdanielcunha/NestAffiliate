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
  catalogProductId?: string;
  listingVerified?: boolean;
  soldQuantity?: TruthValue<number>;
  availableQuantity?: TruthValue<number>;
  title: TruthValue<string>;
  url: TruthValue<string>;
  affiliateUrl?: TruthValue<string>;
  /** User declaration, not a provider guarantee of attribution or commission. */
  affiliateAttestation?: {
    method: 'USER_CONFIRMED_IN_AFFILIATE_PORTAL';
    url: string;
    marketplace: Marketplace;
    externalId: string;
    channel: 'PINTEREST';
    confirmedAt: string;
  };
  price?: TruthValue<number>;
  currency: TruthValue<string>;
  sellerName?: TruthValue<string>;
  sellerReputation?: TruthValue<number>;
  rating?: TruthValue<number>;
  reviewCount?: TruthValue<number>;
  commissionRate?: TruthValue<number>;
  sellerCommissionRate?: TruthValue<number>;
  shopeeCommissionRate?: TruthValue<number>;
  estimatedCommission?: TruthValue<number>;
  discountRate?: TruthValue<number>;
  availability: TruthValue<'available' | 'unavailable' | 'unknown'>;
  imageUrl?: TruthValue<string>;
  assetRights: AssetRightsStatus;
}

/** Private, versioned identity/rights record. A marketplace thumbnail is VIEW_ONLY until proven otherwise. */
export interface ProductReferenceAsset {
  id: string;
  organizationId: string;
  productId: string;
  marketplace: Marketplace;
  externalListingId: string;
  variantId?: string;
  sourceType: 'MARKETPLACE_REFERENCE' | 'USER_OWN_PHOTO' | 'OWNER_AUTHORIZED' | 'LICENSED_MEDIA';
  rights: 'UNKNOWN' | 'VIEW_ONLY' | 'USER_ATTESTED' | 'PLATFORM_LICENSED' | 'BLOCKED';
  referenceStatus: 'MISSING' | 'VIEW_ONLY' | 'READY_FOR_AI' | 'REVOKED' | 'STALE';
  canSendToExternalAI: boolean;
  rightsEvidence?: string;
  knownAttributes?: Record<string,string>;
  variantFingerprint?: string;
  sha256?: string;
  mimeType?: 'image/png' | 'image/jpeg' | 'image/webp';
  width?: number;
  height?: number;
  sourceUrl?: string;
  storagePath?: string;
  capturedAt: string;
  updatedAt: string;
  createdBy?: string;
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


export type CreativeOutputType = 'photorealistic' | 'editorial' | 'lifestyle';
export type CreativeAssetOrigin = 'NESTAI_GENERATED' | 'MANUAL_CHATGPT' | 'USER_UPLOAD' | 'MARKETPLACE' | 'GENERATED_LOCAL';
export type CreativeAngle =
  | 'problem_solution'
  | 'transformation'
  | 'discovery'
  | 'inspiration'
  | 'utility'
  | 'organization'
  | 'small_spaces'
  | 'routine'
  | 'aesthetics'
  | 'how_to'
  | 'curation'
  | 'seasonal';

export interface SceneProfile {
  category: string;
  useCase: string;
  environment: string;
  sceneType: string;
  style: string;
  lighting: string;
  composition: string;
  placement: string;
  negativeSpace: string;
  propsAllowed: string[];
  forbiddenContext: string[];
  confidence: number;
  explanation: string;
  version: string;
}

export interface ImagePromptSpec {
  id: string;
  templateId: string;
  templateVersion: string;
  sceneEngineVersion: string;
  creativeDirectorVersion: string;
  campaignId: string;
  campaignVersion: number;
  language: 'en' | 'pt-BR';
  prompt: string;
  factsUsed: string[];
  restrictionsUsed: string[];
  createdAt: string;
}

export interface ImageConcept {
  id: string;
  angle: CreativeAngle;
  title: string;
  rationale: string;
  sceneProfile: SceneProfile;
  imagePrompt: ImagePromptSpec;
  score: number;
  scoreExplanation: string[];
}

export interface PinterestCreativePack {
  id: string;
  organizationId: string;
  campaignId: string;
  campaignVersion: number;
  productId: string;
  locale: 'pt-BR' | 'en' | 'es';
  copy: {
    titles: string[];
    descriptions: string[];
    headline: string;
    subheadline?: string;
    cta: string;
    disclosure: string;
    altText: string;
    keywords: string[];
    primaryKeyword: string;
    secondaryKeywords: string[];
    longTailKeywords: string[];
    recommendedBoardId?: string;
    recommendedBoardName: string;
    friendlyFilename: string;
  };
  creativeDirection: {
    productCategory: string;
    useCase: string;
    sceneType: string;
    roomOrEnvironment: string;
    visualStyle: string;
    lighting: string;
    cameraAngle: string;
    composition: string;
    negativeSpace: string;
    productPlacement: string;
    colorDirection: string;
    mood: string;
  };
  imageConcepts: ImageConcept[];
  recommendedConceptId: string;
  technical: {
    width: 1000;
    height: 1500;
    ratio: '2:3';
    embeddedText: false;
    outputType: CreativeOutputType;
  };
  truthConstraints: string[];
  promptTemplateVersion: string;
  qualityScore: number;
  qualityExplanation: string[];
  publicationChecklist: string[];
  createdAt: string;
}

export interface CreativeAsset {
  id: string;
  organizationId: string;
  campaignId: string;
  origin: CreativeAssetOrigin;
  rightsStatus: AssetRightsStatus;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  hash: string;
  promptPackageId?: string;
  conceptId?: string;
  storagePath?: string;
  downloadUrl?: string;
  embeddedTextConfirmedAbsent: boolean;
  productFidelityConfirmed: boolean;
  referenceAssetId?: string;
  referenceSha256?: string;
  referenceListingId?: string;
  referenceRights?: ProductReferenceAsset['rights'];
  reviewedAt?: string;
  reviewedBy?: string;
  createdAt: string;
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
  creativePack?: PinterestCreativePack;
  /** Origin and interpretation of AI-powered, non-authoritative editorial copy. */
  creativeIntelligence?: {
    origin:'nestai'|'deterministic';
    productType?:string;
    buyerIntent?:string;
    audience?:string;
    positioning?:string;
    unknowns:string[];
    aiAttempted:boolean;
  };
  creativeAsset?: CreativeAsset;
}

export interface CampaignRankingContext {
  rank?: number;
  trackingCode?: string;
  evidence: string[];
  signalSources: string[];
  /** V4 research-draft marker; absent from historical campaigns. */
  v4ResearchDraft?: boolean;
  v4AssessmentVersion?: string;
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
  keywords?: string[];
  creativePackId?: string;
  creativeAssetId?: string;
  conceptId?: string;
  promptPackageId?: string;
  sceneType?: string;
  environment?: string;
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
  patch: Partial<Pick<CampaignVersion, 'product' | 'narrative' | 'boardName' | 'keyword' | 'template' | 'creativePack' | 'creativeAsset'>>,
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
      creativePack: source.creativePack,
      creativeAsset: source.creativeAsset,
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
