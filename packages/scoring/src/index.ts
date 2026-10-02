import type { Confidence, NestScoreDimensions, NestScoreResult } from '@nestaffiliate/core';

const maxima: NestScoreDimensions = {
  trend: 18,
  intent: 16,
  visual: 14,
  yield: 14,
  quality: 12,
  competition: 10,
  creative: 8,
  seasonality: 4,
  dataConfidence: 4,
};

const labels: Record<keyof NestScoreDimensions, string> = {
  trend: 'Demanda em movimento',
  intent: 'Intenção de compra',
  visual: 'Potencial visual',
  yield: 'Retorno comercial',
  quality: 'Qualidade do produto',
  competition: 'Espaço competitivo',
  creative: 'Superfície criativa',
  seasonality: 'Sazonalidade',
  dataConfidence: 'Confiança dos dados',
};

export function calculateNestScore(input: NestScoreDimensions): NestScoreResult {
  const dimensions = Object.fromEntries(
    Object.entries(maxima).map(([key, max]) => {
      const raw = input[key as keyof NestScoreDimensions];
      return [key, Math.max(0, Math.min(max, Math.round(raw)))];
    }),
  ) as unknown as NestScoreDimensions;

  const score = Object.values(dimensions).reduce((sum, value) => sum + value, 0);
  const confidence: Confidence =
    dimensions.dataConfidence >= 4 ? 'high' : dimensions.dataConfidence >= 2 ? 'medium' : 'low';

  const ranked = (Object.keys(dimensions) as Array<keyof NestScoreDimensions>)
    .map((key) => ({ key, ratio: dimensions[key] / maxima[key], value: dimensions[key], max: maxima[key] }))
    .sort((a, b) => b.ratio - a.ratio);

  const reasons = ranked.slice(0, 3).map((entry) => `${labels[entry.key]}: ${entry.value}/${entry.max}`);
  const risks = ranked
    .filter((entry) => entry.ratio < 0.55)
    .slice(0, 2)
    .map((entry) => `${labels[entry.key]} ainda precisa de evidência`);

  return { score, confidence, reasons, risks, version: '2.0', dimensions };
}

export { maxima as NEST_SCORE_MAXIMA };
