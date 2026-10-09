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

/** EN output is a fully English art direction; product titles stay verbatim for fidelity. */
const ENGLISH_SCENES:Record<string,{
 useCase:string;environment:string;style:string;lighting:string;composition:string;placement:string;negativeSpace:string;propsAllowed:string[];forbidden:string[];
}> = {
 'bathroom-accessories': {useCase:'Organize the wet area of a bathroom without inventing product benefits',environment:'Realistic contemporary bathroom or shower area',style:'Premium, clean and functional',lighting:'Soft natural light with controlled reflections',composition:'Editorial close-to-medium framing showing the product and its genuine context',placement:'Installed or positioned at its confirmed point of use',negativeSpace:'Clean upper or side wall for later headline',propsAllowed:['neutral towel','subtle plant','light tile'],forbidden:['kitchen use','bedroom use','impossible flowing water']},
 'kitchen-organization': {useCase:'Bring visual order to a kitchen without unverified performance claims',environment:'Organized residential kitchen, counter, cabinet or pantry',style:'Natural bright editorial lifestyle photography',lighting:'Soft clean daylight',composition:'Product as the focal point with enough context to show its genuine use',placement:'Counter, drawer, cabinet or pantry only when appropriate for the exact product',negativeSpace:'Quiet upper left or right area',propsAllowed:['neutral utensils','simple jars','light wood','ceramics'],forbidden:['bathroom scene','garage scene','incompatible use','overcrowded props']},
 'kitchen-utensils': {useCase:'Show realistic food preparation, storage or kitchen routine',environment:'Elegant realistic home kitchen or counter',style:'Natural everyday editorial',lighting:'Soft lateral daylight',composition:'Recognizable product in close-to-medium framing',placement:'Natural countertop placement consistent with its exact intended use',negativeSpace:'Clean upper band',propsAllowed:['neutral fabric','wood','subtle ingredients'],forbidden:['industrial claims','unverified function','altered brand']},
 lighting: {useCase:'Show realistic functional ambient light',environment:'Home office, living room or bedroom matching the actual product',style:'Warm premium realistic interiors',lighting:'Soft contextual ambient lighting with controlled contrast',composition:'Visible product with realistic light output',placement:'Natural installed or freestanding position',negativeSpace:'Calm wall or shaded area',propsAllowed:['neutral books','side table','natural textures'],forbidden:['impossible brightness','unproven color temperature claims','incompatible fitting']},
 'home-decor': {useCase:'Show natural room comfort and believable visual arrangement',environment:'Real lived-in living room or bedroom',style:'Refined editorial interiors, believable not extravagant',lighting:'Soft diffused daylight',composition:'Controlled room-wide framing with clearly legible product',placement:'Correct residential placement',negativeSpace:'Calm wall or floor area',propsAllowed:['neutral sofa','side table','subtle plant'],forbidden:['unrealistic luxury','invented dimensions','altered color']},
 laundry: {useCase:'Show a realistic, organized laundry routine',environment:'Small clean functional laundry room',style:'Practical clean photorealistic',lighting:'Bright natural light',composition:'Compact setting focused on the real product',placement:'Near its actual use point',negativeSpace:'Clear upper wall or door',propsAllowed:['neutral basket','folded towels','unbranded containers'],forbidden:['kitchen use','incompatible use','unsupported cleaning claims']},
 'kids-room': {useCase:'Present a safe and believable child-room context',environment:'Quiet natural nursery or child bedroom',style:'Gentle, minimal, natural interiors',lighting:'Soft window daylight',composition:'Product focal and visually calm',placement:'Appropriate safe placement, without suggesting risky use',negativeSpace:'Quiet light-colored wall',propsAllowed:['generic childrens books','simple toys','soft textiles'],forbidden:['risk situations','identifiable child','unsupported safety guarantees']},
 pet: {useCase:'Show genuine domestic pet-related use',environment:'Real clean living space with subtle pet context',style:'Welcoming natural editorial',lighting:'Soft daylight',composition:'Recognizable product, no animal necessary',placement:'At confirmed home-use position',negativeSpace:'Uncluttered wall or floor',propsAllowed:['neutral blanket','simple pet toy','safe generic plant'],forbidden:['veterinary benefits','risk to pets','therapy claims']},
 'home-office': {useCase:'Show the real home working routine and product function',environment:'Modern functional home office',style:'Premium practical photorealistic editorial',lighting:'Natural sidelight with controlled contrast',composition:'Tidy working area with clearly visible authentic product',placement:'Normal working position appropriate to the product',negativeSpace:'Clean desk or wall area',propsAllowed:['generic laptop','notebook','pen','subtle plant'],forbidden:['invented laptop branding','impossible setup','guaranteed productivity claims']},
 'home-utility': {useCase:'Show only the confirmed everyday home utility',environment:'Realistic home setting consistent with the verified product function',style:'Natural premium photorealistic editorial',lighting:'Soft natural daylight',composition:'Clearly recognizable product with restrained context',placement:'Position consistent with verified use',negativeSpace:'Intentionally clear area for later headline',propsAllowed:['neutral generic household props'],forbidden:['impossible use','unverified function','changed logo or color']},
};
const ENGLISH_GUARDS=[
 'Preserve the exact real product: no changes to shape, color, proportions, visible details, variant or branding.',
 'Do not invent functionality, materials, dimensions, prices, discounts, sales, ratings, shipping, stock or commissions.',
 'No embedded words, prices, badges, ratings, added logos or artificial urgency in the image.',
 'Never place the product in a context inconsistent with the verified listing.',
];

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
  const translated=ENGLISH_SCENES[input.scene.category] ?? ENGLISH_SCENES['home-utility']!;
  return [
    'TASK',
    'Create a premium Pinterest lifestyle/editorial image.',
    '',
    'PRODUCT TRUTH',
    ...facts.map((fact) => '- ' + fact),
    '',
    'SCENE',
    '- Environment: ' + translated.environment,
    '- Use/context: ' + translated.useCase,
    '- Product placement: ' + translated.placement,
    '- Allowed props: ' + translated.propsAllowed.join(', '),
    '',
    'ART DIRECTION',
    '- Visual style: ' + translated.style,
    '- Lighting: ' + translated.lighting,
    '- Composition: ' + translated.composition,
    '- Camera: ' + input.cameraAngle,
    '- Commercial/editorial intent: ' + 'An accurate, premium, useful editorial concept grounded in the verified product and its genuine context.',
    '',
    'PINTEREST COMPOSITION',
    'Vertical 2:3 composition, designed for a final 1000x1500 px output.',
    'Leave intentional negative space (' + translated.negativeSpace + ') for a headline that will be added later by the app.',
    '',
    'PRODUCT FIDELITY',
    'Faithfully preserve the real product shape, color, proportions, visible details and branding from the supplied reference image. If a detail is not visible, do not invent it.',
    '',
    'DO NOT',
    ...ENGLISH_GUARDS.map((restriction) => '- ' + restriction),
    ...translated.forbidden.map((restriction) => '- Avoid: ' + restriction),
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
