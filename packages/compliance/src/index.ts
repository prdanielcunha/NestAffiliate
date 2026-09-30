import type { ComplianceOutcome, ProductTruth } from '@nestaffiliate/core';

export interface GuardInput {
  product: ProductTruth;
  disclosure: string;
  destinationUrl: string;
  headline: string;
  description: string;
  duplicateSimilarity?: number;
  priceMaxAgeMinutes?: number;
  now?: Date;
}

export interface GuardResult {
  outcome: ComplianceOutcome;
  checks: Array<{ key: string; outcome: ComplianceOutcome; message: string }>;
}

const forbiddenClaimPatterns = [
  /melhor\s+do\s+brasil/i,
  /garantid[oa]/i,
  /milagros[oa]/i,
  /100%\s+garant/i,
];

function worst(outcomes: ComplianceOutcome[]): ComplianceOutcome {
  if (outcomes.includes('BLOCK')) return 'BLOCK';
  if (outcomes.includes('WARN')) return 'WARN';
  return 'PASS';
}

export function runPublishingGuard(input: GuardInput): GuardResult {
  const checks: GuardResult['checks'] = [];
  const push = (key: string, outcome: ComplianceOutcome, message: string) =>
    checks.push({ key, outcome, message });

  push(
    'availability',
    input.product.availability.value === 'unavailable' ? 'BLOCK' : input.product.availability.value === 'unknown' ? 'WARN' : 'PASS',
    input.product.availability.value === 'available' ? 'Produto disponível.' : 'Disponibilidade precisa de atenção.',
  );

  try {
    const url = new URL(input.destinationUrl);
    push('link', url.protocol === 'https:' ? 'PASS' : 'BLOCK', 'Link de destino validado.');
  } catch {
    push('link', 'BLOCK', 'Link de destino inválido.');
  }

  push(
    'asset-rights',
    ['AUTHORIZED', 'PLATFORM_PROVIDED', 'USER_PROVIDED', 'GENERATED'].includes(input.product.assetRights)
      ? 'PASS'
      : input.product.assetRights === 'UNKNOWN'
        ? 'WARN'
        : 'BLOCK',
    'Direito de uso do asset verificado.',
  );

  push(
    'disclosure',
    /afiliad|comiss/i.test(input.disclosure) ? 'PASS' : 'BLOCK',
    'Natureza afiliada precisa estar clara.',
  );

  const text = `${input.headline} ${input.description}`;
  push(
    'claims',
    forbiddenClaimPatterns.some((pattern) => pattern.test(text)) ? 'BLOCK' : 'PASS',
    'Claims comerciais revisados.',
  );

  const similarity = input.duplicateSimilarity ?? 0;
  push(
    'duplicate',
    similarity >= 0.92 ? 'BLOCK' : similarity >= 0.8 ? 'WARN' : 'PASS',
    similarity >= 0.8 ? 'Campanha semelhante a conteúdo recente.' : 'Sem duplicação crítica.',
  );

  if (input.product.price) {
    const now = (input.now ?? new Date()).getTime();
    const observed = new Date(input.product.price.observedAt).getTime();
    const maxAge = (input.priceMaxAgeMinutes ?? 60) * 60_000;
    push(
      'price-freshness',
      Number.isFinite(observed) && now - observed <= maxAge ? 'PASS' : 'WARN',
      'Preço precisa estar fresco se aparecer no criativo.',
    );
  }

  return { outcome: worst(checks.map((check) => check.outcome)), checks };
}
