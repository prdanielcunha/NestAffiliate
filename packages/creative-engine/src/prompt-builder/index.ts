import type { ImagePromptSpec, ProductTruth, SceneProfile } from '@nestaffiliate/core';
import { truthConstraints } from '../visual-truth';

export const IMAGE_PROMPT_TEMPLATE_ID = 'pinterest-lifestyle-image';
export const IMAGE_PROMPT_TEMPLATE_VERSION = '1.0';
export const SCENE_ENGINE_VERSION = 'scene-engine-v1';
export const CREATIVE_DIRECTOR_VERSION = 'creative-director-v2';

function verifiedFacts(product: ProductTruth) {
  const facts = [
    'Product name: ' + product.title.value,
    'Marketplace: ' + product.marketplace,
  ];
  if (product.sellerName?.value) facts.push('Seller shown in source data: ' + product.sellerName.value);
  return facts;
}

function promptParts(input: {
  product: ProductTruth;
  scene: SceneProfile;
  artDirection: string;
  cameraAngle: string;
  language: 'en' | 'pt-BR';
}) {
  const facts = verifiedFacts(input.product);
  const restrictions = truthConstraints(input.product);
  if (input.language === 'pt-BR') {
    return [
      'TAREFA',
      'Crie uma imagem premium lifestyle/editorial para Pinterest.',
      '',
      'PRODUCT TRUTH',
      ...facts.map((fact) => '- ' + fact),
      '',
      'CENA',
      '- Ambiente: ' + input.scene.environment,
      '- Uso/contexto: ' + input.scene.useCase,
      '- Posicionamento: ' + input.scene.placement,
      '- Props permitidos: ' + input.scene.propsAllowed.join(', '),
      '',
      'DIREÇÃO DE ARTE',
      '- Estilo: ' + input.scene.style,
      '- Iluminação: ' + input.scene.lighting,
      '- Composição: ' + input.scene.composition,
      '- Câmera: ' + input.cameraAngle,
      '- Intenção: ' + input.artDirection,
      '',
      'COMPOSIÇÃO PINTEREST',
      'Composição vertical 2:3, desenhada para saída final em 1000x1500 px.',
      'Deixe espaço negativo intencional (' + input.scene.negativeSpace + ') para uma headline que será adicionada depois pelo aplicativo.',
      '',
      'FIDELIDADE DO PRODUTO',
      'Preserve fielmente forma, cor, proporções, detalhes visíveis e branding da imagem de referência fornecida. Se um detalhe não estiver visível, não invente.',
      '',
      'NÃO FAÇA',
      ...restrictions.map((restriction) => '- ' + restriction),
      ...input.scene.forbiddenContext.map((restriction) => '- Evite: ' + restriction),
      '',
      'SAÍDA',
      'Imagem natural, fotorrealista/editorial, comercialmente atraente e Pinterest-first. Sem nenhum texto incorporado.',
    ].join('\n');
  }
  return [
    'TASK',
    'Create a premium Pinterest lifestyle/editorial image.',
    '',
    'PRODUCT TRUTH',
    ...facts.map((fact) => '- ' + fact),
    '',
    'SCENE',
    '- Environment: ' + input.scene.environment,
    '- Use/context: ' + input.scene.useCase,
    '- Product placement: ' + input.scene.placement,
    '- Allowed props: ' + input.scene.propsAllowed.join(', '),
    '',
    'ART DIRECTION',
    '- Visual style: ' + input.scene.style,
    '- Lighting: ' + input.scene.lighting,
    '- Composition: ' + input.scene.composition,
    '- Camera: ' + input.cameraAngle,
    '- Commercial/editorial intent: ' + input.artDirection,
    '',
    'PINTEREST COMPOSITION',
    'Vertical 2:3 composition, designed for a final 1000x1500 px output.',
    'Leave intentional negative space (' + input.scene.negativeSpace + ') for a headline that will be added later by the app.',
    '',
    'PRODUCT FIDELITY',
    'Faithfully preserve the real product shape, color, proportions, visible details and branding from the supplied reference image. If a detail is not visible, do not invent it.',
    '',
    'DO NOT',
    ...restrictions.map((restriction) => '- ' + restriction),
    ...input.scene.forbiddenContext.map((restriction) => '- Avoid: ' + restriction),
    '',
    'OUTPUT',
    'Natural, photorealistic/editorial, commercially attractive, Pinterest-first image. No embedded text.',
  ].join('\n');
}

export function buildImagePrompt(input: {
  id: string;
  campaignId: string;
  campaignVersion: number;
  product: ProductTruth;
  scene: SceneProfile;
  artDirection: string;
  cameraAngle?: string;
  language?: 'en' | 'pt-BR';
  createdAt?: string;
}): ImagePromptSpec {
  const language = input.language ?? 'en';
  const factsUsed = verifiedFacts(input.product);
  const restrictionsUsed = truthConstraints(input.product);
  return {
    id: input.id,
    templateId: IMAGE_PROMPT_TEMPLATE_ID,
    templateVersion: IMAGE_PROMPT_TEMPLATE_VERSION,
    sceneEngineVersion: SCENE_ENGINE_VERSION,
    creativeDirectorVersion: CREATIVE_DIRECTOR_VERSION,
    campaignId: input.campaignId,
    campaignVersion: input.campaignVersion,
    language,
    prompt: promptParts({
      product: input.product,
      scene: input.scene,
      artDirection: input.artDirection,
      cameraAngle: input.cameraAngle ?? 'eye-level or slight 3/4 angle, natural lens perspective',
      language,
    }),
    factsUsed,
    restrictionsUsed,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

export function translateImagePromptToPortuguese(spec: ImagePromptSpec, input: {
  product: ProductTruth;
  scene: SceneProfile;
  artDirection: string;
  cameraAngle?: string;
}): ImagePromptSpec {
  return buildImagePrompt({
    id: spec.id + ':pt-BR',
    campaignId: spec.campaignId,
    campaignVersion: spec.campaignVersion,
    product: input.product,
    scene: input.scene,
    artDirection: input.artDirection,
    cameraAngle: input.cameraAngle,
    language: 'pt-BR',
    createdAt: spec.createdAt,
  });
}
