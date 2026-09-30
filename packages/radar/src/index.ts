import type { ProductTruth, NestScoreDimensions, NestScoreResult } from '@nestaffiliate/core';
import { calculateNestScore } from '@nestaffiliate/scoring';

export interface TrendSignal {
  id: string;
  organizationId: string;
  source: 'RULE_ENGINE' | 'PINTEREST' | 'MARKETPLACE' | 'MANUAL';
  keyword: string;
  strength: number;
  confidence: number;
  observedAt: string;
  evidence: string[];
}

export interface Opportunity {
  id: string;
  organizationId: string;
  keyword: string;
  product: ProductTruth;
  score: NestScoreResult;
  confidence: number;
  cluster: string[];
  reasons: string[];
  createdAt: string;
}

const stopwords = new Set([
  'a','o','as','os','de','da','do','das','dos','e','em','para','por','com','um','uma','the','and','for','of'
]);

export function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function keywordCluster(value: string) {
  const base = normalizeSearchText(value)
    .split(' ')
    .filter((token) => token.length > 2 && !stopwords.has(token));
  const synonyms: Record<string,string[]> = {
    cozinha: ['organizacao','bancada','armario'],
    banheiro: ['organizacao','pequeno','decoracao'],
    lavanderia: ['organizacao','espaco','funcional'],
    quarto: ['aconchegante','organizacao','decoracao'],
    apartamento: ['pequeno','espaco','organizacao'],
    organizador: ['organizacao','guardar','espaco'],
  };
  const expanded = new Set(base);
  for (const token of base) for (const sibling of synonyms[token] ?? []) expanded.add(sibling);
  return [...expanded].slice(0, 12);
}

export function titleSimilarity(a: string, b: string) {
  const tokens = (value: string) => new Set(keywordCluster(value));
  const aa=tokens(a), bb=tokens(b);
  const union=new Set([...aa,...bb]);
  if (!union.size) return 0;
  let intersection=0;
  for (const value of aa) if (bb.has(value)) intersection += 1;
  return intersection / union.size;
}

export function dedupeProducts(products: ProductTruth[], threshold = 0.72) {
  const result: ProductTruth[] = [];
  for (const product of products) {
    if (!result.some((existing) => titleSimilarity(existing.title.value, product.title.value) >= threshold)) {
      result.push(product);
    }
  }
  return result;
}

export function seasonalScore(keyword: string, date = new Date()) {
  const month=date.getMonth()+1;
  const text=normalizeSearchText(keyword);
  let score=2;
  const reasons:string[]=[];
  if ([11,12].includes(month) && /decor|cozinha|casa|presente/.test(text)) {
    score=4; reasons.push('Sazonalidade de fim de ano compatível com casa e presentes.');
  } else if ([1,2].includes(month) && /organiz|rotina|casa|material/.test(text)) {
    score=4; reasons.push('Início de ano favorece intenção de organização e rotina.');
  } else if ([5,6].includes(month) && /quarto|aconcheg|casa|cozinha/.test(text)) {
    score=3; reasons.push('Período de clima mais frio favorece temas de casa e aconchego.');
  } else {
    reasons.push('Sem impulso sazonal forte no motor local.');
  }
  return { score, reasons };
}

export function dataConfidence(product: ProductTruth) {
  let points=0;
  if (product.title.value) points += 1;
  if (product.price) points += 1;
  if (product.sellerName) points += 1;
  if (product.rating || product.sellerReputation) points += 1;
  if (product.imageUrl) points += 1;
  if (product.availability.value === 'available') points += 1;
  return Math.min(1, points / 6);
}

export function opportunityDimensions(product: ProductTruth, keyword: string, signalStrength = 0.55): NestScoreDimensions {
  const confidence=dataConfidence(product);
  const seasonal=seasonalScore(keyword).score;
  const price = product.price?.value ?? 0;
  const visual = product.imageUrl ? 11 : 7;
  const quality = product.rating
    ? Math.round(Math.min(12, (product.rating.value / 5) * 12))
    : product.sellerReputation
      ? Math.round(Math.min(12, product.sellerReputation.value * 12))
      : 7;
  const intent = /compr|kit|organizador|suporte|dispens|prateleira|luminaria|tapete|cesto/.test(normalizeSearchText(keyword)) ? 15 : 12;
  const yieldScore = price > 0 && price < 250 ? 10 : 7;
  return {
    trend: Math.max(4, Math.round(18 * Math.max(0, Math.min(1, signalStrength)))),
    intent,
    visual,
    yield: yieldScore,
    quality,
    competition: 7,
    creative: visual >= 10 ? 7 : 5,
    seasonality: seasonal,
    dataConfidence: Math.max(1, Math.round(confidence * 4)),
  };
}

export function buildOpportunity(product: ProductTruth, keyword: string, signalStrength = 0.55): Opportunity {
  const score=calculateNestScore(opportunityDimensions(product, keyword, signalStrength));
  const cluster=keywordCluster(keyword);
  const confidence=dataConfidence(product);
  return {
    id:`opp:${product.marketplace}:${product.externalId}`,
    organizationId:product.organizationId,
    keyword,
    product,
    score,
    confidence,
    cluster,
    reasons:[
      ...score.reasons,
      ...seasonalScore(keyword).reasons,
      `Confiança factual: ${Math.round(confidence*100)}%`,
    ],
    createdAt:new Date().toISOString(),
  };
}

export function shortlist(products: ProductTruth[], keyword: string, limit = 6) {
  return dedupeProducts(products)
    .map((product)=>buildOpportunity(product,keyword))
    .sort((a,b)=>b.score.score-a.score.score || b.confidence-a.confidence)
    .slice(0,limit);
}
