import { FEATURE_FLAGS, isPaidCapabilityAllowed } from '@nestaffiliate/config';

export type AIProviderId =
  | 'RULE_ENGINE'
  | 'GEMINI_FREE'
  | 'MANUAL_CHATGPT'
  | 'MANUAL_GEMINI'
  | 'OPENAI_API'
  | 'GEMINI_PAID'
  | 'OTHER_PROVIDER';

export type AICapability =
  | 'classification'
  | 'copy_generation'
  | 'creative_direction'
  | 'prompt_generation'
  | 'image_generation'
  | 'image_edit'
  | 'ranking_assist';

export interface QuotaState {
  provider: AIProviderId;
  available: boolean;
  remaining?: number;
  cooldownUntil?: string;
}

export function routeAI(capability: AICapability, quotas: QuotaState[] = []): AIProviderId {
  if (['classification', 'ranking_assist'].includes(capability)) return 'RULE_ENGINE';

  const gemini = quotas.find((q) => q.provider === 'GEMINI_FREE');
  if (
    FEATURE_FLAGS.GEMINI_FREE_ENABLED &&
    gemini?.available &&
    ['copy_generation', 'creative_direction', 'prompt_generation'].includes(capability)
  ) {
    return 'GEMINI_FREE';
  }

  if (
    isPaidCapabilityAllowed() &&
    FEATURE_FLAGS.OPENAI_API_ENABLED &&
    ['copy_generation', 'creative_direction', 'prompt_generation'].includes(capability)
  ) {
    return 'OPENAI_API';
  }

  if (
    isPaidCapabilityAllowed() &&
    FEATURE_FLAGS.OPENAI_IMAGE_ENABLED &&
    capability === 'image_generation'
  ) {
    return 'OPENAI_API';
  }

  return capability === 'image_generation' || capability === 'image_edit'
    ? 'MANUAL_CHATGPT'
    : 'RULE_ENGINE';
}

export function quotaFallbackMessage() {
  return 'A cota gratuita terminou por hoje. O NestAffiliate continua funcionando no modo local. Se quiser, use o prompt pronto no ChatGPT.';
}
