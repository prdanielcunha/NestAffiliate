import type { AssetRightsStatus, ProductTruth, SceneProfile } from '@nestaffiliate/core';

export interface VisualTruthCheck {
  key: string;
  outcome: 'PASS' | 'WARN' | 'BLOCK';
  explanation: string;
}

const forbiddenClaims = [
  /\bmais vendido\b/i,
  /\bbest[- ]?seller\b/i,
  /\b100%\s*imperme[aá]vel\b/i,
  /\bmelhor do brasil\b/i,
  /\bpromo[cç][aã]o imperd[ií]vel\b/i,
  /\bmenor pre[cç]o\b/i,
  /\bgarantid[oa]\b/i,
  /\bnota\s*[45](?:[.,]\d)?\b/i,
  /\b\d+(?:[.,]\d+)?\s*estrelas\b/i,
];

export function validateScene(profile: SceneProfile): VisualTruthCheck {
  if (!profile.environment || !profile.placement || profile.confidence < 0.5) {
    return { key: 'scene', outcome: 'BLOCK', explanation: 'A cena não possui contexto confiável suficiente.' };
  }
  return { key: 'scene', outcome: 'PASS', explanation: 'Ambiente, posicionamento e restrições estão explícitos.' };
}

export function validatePromptClaims(prompt: string): VisualTruthCheck {
  const hit = forbiddenClaims.find((pattern) => pattern.test(prompt));
  if (hit) return { key: 'promptClaims', outcome: 'BLOCK', explanation: 'O prompt contém claim comercial não verificado.' };
  return { key: 'promptClaims', outcome: 'PASS', explanation: 'Nenhum claim comercial proibido foi encontrado.' };
}

export function validateCommercialClaims(values: string[]): VisualTruthCheck {
  const value = values.join(' ');
  const hit = forbiddenClaims.find((pattern) => pattern.test(value));
  if (hit) return { key: 'commercialClaims', outcome: 'BLOCK', explanation: 'Copy contém claim absoluto ou promocional não comprovado.' };
  return { key: 'commercialClaims', outcome: 'PASS', explanation: 'Copy editorial sem claim comercial proibido.' };
}

export function validateReferenceRights(status: AssetRightsStatus): VisualTruthCheck {
  if (status === 'BLOCKED') return { key: 'rights', outcome: 'BLOCK', explanation: 'O asset está bloqueado para uso.' };
  if (status === 'UNKNOWN') return { key: 'rights', outcome: 'WARN', explanation: 'Confirme o direito de uso antes de usar a imagem como referência.' };
  return { key: 'rights', outcome: 'PASS', explanation: 'O status do asset permite uso no fluxo criativo.' };
}

export function validateEmbeddedTextPolicy(confirmedAbsent: boolean): VisualTruthCheck {
  return confirmedAbsent
    ? { key: 'embeddedText', outcome: 'PASS', explanation: 'A imagem foi confirmada sem texto rasterizado.' }
    : { key: 'embeddedText', outcome: 'WARN', explanation: 'Confirme visualmente que a imagem não contém texto gerado pela IA.' };
}

export function validateProductFidelity(input: {
  product: ProductTruth;
  humanConfirmed: boolean;
}): VisualTruthCheck {
  if (!input.humanConfirmed) {
    return {
      key: 'productFidelity',
      outcome: 'WARN',
      explanation: 'A fidelidade visual precisa de confirmação humana no modo Zero Cost; o app não finge uma verificação visual automática.',
    };
  }
  return {
    key: 'productFidelity',
    outcome: 'PASS',
    explanation: 'A fidelidade de forma, cor, proporção, detalhes visíveis e marca foi confirmada.',
  };
}

export function truthConstraints(product: ProductTruth) {
  const constraints = [
    'Preserve o produto real; não altere forma, cor, proporções, detalhes visíveis ou branding.',
    'Não invente função, material, dimensão, rating, número de avaliações, preço, desconto, frete, estoque ou comissão.',
    'Não insira texto, preço, selo, avaliação, logo novo ou urgência artificial dentro da imagem.',
    'Não crie um contexto de uso incompatível com o produto.',
  ];
  if (product.assetRights === 'UNKNOWN') {
    constraints.push('A imagem de referência só pode ser usada depois da confirmação do direito de uso.');
  }
  return constraints;
}

export function runVisualTruthGuard(input: {
  product: ProductTruth;
  scene: SceneProfile;
  prompt: string;
  copy: string[];
}) {
  const checks = [
    validateScene(input.scene),
    validatePromptClaims(input.prompt),
    validateCommercialClaims(input.copy),
    validateReferenceRights(input.product.assetRights),
  ];
  const outcome = checks.some((check) => check.outcome === 'BLOCK')
    ? 'BLOCK'
    : checks.some((check) => check.outcome === 'WARN')
      ? 'WARN'
      : 'PASS';
  return { outcome, checks };
}
