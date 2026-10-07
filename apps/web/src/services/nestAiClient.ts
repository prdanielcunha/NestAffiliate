import { createNestAiClient, type Locale } from '@millionsnest/ai';
import type { User } from 'firebase/auth';
import { getNestAffiliateAppCheckToken } from '../lib/firebase';

export type AffiliatePinCopy = {
  title: string;
  description: string;
  tags: string[];
};

export type AffiliateProductAnalysis = {
  facts: string[];
  opportunities: string[];
  unknowns: string[];
};

function localeOf(locale: 'pt-BR' | 'en' | 'es'): Locale {
  return locale;
}

function clientFor(input: {
  user: User;
  organizationId: string;
  locale: 'pt-BR' | 'en' | 'es';
}) {
  return createNestAiClient({
    appId: 'nestaffiliate',
    organizationId: input.organizationId,
    locale: localeOf(input.locale),
    getFirebaseIdToken: async () => input.user.getIdToken(),
    getAppCheckToken: getNestAffiliateAppCheckToken,
    baseUrl: 'https://ai.millionsnest.com/v1/',
    hubBaseUrl: 'https://www.millionsnest.com/',
  });
}

export async function generateAffiliatePinCopy(input: {
  user: User;
  organizationId: string;
  locale: 'pt-BR' | 'en' | 'es';
  instruction: string;
  product: {
    title: string;
    marketplace: string;
    price?: number;
    currency?: string;
    seller?: string;
    availability?: string;
    sourceNotes?: string[];
  };
  deterministicPack?: {
    primaryKeyword?: string;
    keywords?: string[];
    recommendedAngle?: string;
  };
}): Promise<AffiliatePinCopy> {
  const response = await clientFor(input).run<AffiliatePinCopy>({
    task: 'affiliate.pin.copy',
    input: {
      instruction: input.instruction,
      product: input.product,
      deterministicPack: input.deterministicPack ?? null,
      authority: {
        mode: 'draft_only',
        publish: false,
        mutateProductTruth: false,
        humanReviewRequired: true,
      },
    },
  });
  return response.result;
}

export async function analyzeAffiliateProduct(input: {
  user: User;
  organizationId: string;
  locale: 'pt-BR' | 'en' | 'es';
  product: unknown;
}): Promise<AffiliateProductAnalysis> {
  const response = await clientFor(input).run<AffiliateProductAnalysis>({
    task: 'affiliate.product.analyze',
    input: {
      product: input.product,
      authority: {
        mode: 'analysis_only',
        publish: false,
        mutateProductTruth: false,
      },
    },
  });
  return response.result;
}

export async function generateAffiliateCreative(input: {
  user: User;
  organizationId: string;
  locale: 'pt-BR' | 'en' | 'es';
  prompt: string;
  seed?: number;
}): Promise<{ imageBase64: string; mimeType: 'image/jpeg' }> {
  const response = await clientFor(input).image<{ imageBase64: string; mimeType: 'image/jpeg' }>(
    'affiliate.creative.generate',
    {
      prompt: input.prompt,
      steps: 4,
      ...(input.seed !== undefined ? { seed: input.seed } : {}),
    },
  );
  return response.result;
}
