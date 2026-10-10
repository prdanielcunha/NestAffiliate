import type { CampaignVersion, PinterestCreativePack, ProductTruth, SceneProfile } from '@nestaffiliate/core';
import { buildCreativeConcepts } from './creative-director';
import { buildConversionPinCopy } from './conversion-copy';
import { buildSceneProfile } from './scene-engine/scene-rules';
import { runVisualTruthGuard, truthConstraints } from './visual-truth';

function slugifyPackFilename(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

export interface BuildPinterestCreativePackInput {
  organizationId: string;
  campaignId: string;
  campaignVersion: number;
  product: ProductTruth;
  keyword: string;
  boardName?: string;
  locale?: 'pt-BR' | 'en' | 'es';
  existingNarrative?: CampaignVersion['narrative'];
  editorialContext?: string;
  createdAt?: string;
  directionOffset?: number;
}

function cleanKeyword(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function secondaryKeywords(keyword: string, scene: SceneProfile) {
  const pool = [
    keyword,
    scene.category.replace(/-/g, ' '),
    scene.environment.split(/[,/]/)[0]!.trim(),
    'organização da casa',
    'ideias para casa',
    'casa prática',
    'decoração funcional',
    'rotina organizada',
    'pequenos espaços',
    'achados para casa',
    'inspiração para casa',
    'soluções para casa',
  ].map(cleanKeyword).filter((value) => value.length > 2);
  return [...new Set(pool)].slice(0, 12);
}

function boardFor(scene: SceneProfile, fallback?: string) {
  const map: Record<string, string> = {
    'kitchen-organization': 'Organização de Cozinha',
    'kitchen-utensils': 'Cozinha Pequena e Organizada',
    'bathroom-accessories': 'Organização de Banheiro',
    laundry: 'Lavanderia Pequena e Funcional',
    'home-decor': 'Decoração Simples e Bonita',
    lighting: 'Quarto Organizado e Aconchegante',
    'kids-room': 'Produtos que Facilitam a Rotina',
    pet: 'Achados Inteligentes para Casa',
    'home-office': 'Ideias para Apartamento Pequeno',
    'home-utility': 'Achados Inteligentes para Casa',
  };
  return map[scene.category] ?? fallback ?? 'Achados Inteligentes para Casa';
}

function localizeConcept(locale:'pt-BR'|'en'|'es',angle:string){
  const labels:Record<string,[string,string,string]>={
    problem_solution:['Problema → Solução','Problem → Solution','Problema → Solución'],
    transformation:['Transformação','Transformation','Transformación'],
    discovery:['Descoberta','Discovery','Descubrimiento'],
    inspiration:['Inspiração','Inspiration','Inspiración'],
    utility:['Utilidade','Utility','Utilidad'],
    organization:['Organização','Organization','Organización'],
    small_spaces:['Pequenos espaços','Small spaces','Espacios pequeños'],
    routine:['Rotina facilitada','Easier routine','Rutina más simple'],
    aesthetics:['Estética / decoração','Aesthetics / decor','Estética / decoración'],
    how_to:['How-to','How-to','How-to'],
    curation:['Curadoria','Curation','Curaduría'],
    seasonal:['Seasonal','Seasonal','Estacional'],
  };
  const rationales:Record<string,[string,string,string]>={
    problem_solution:['Mostra o problema prático e apresenta o produto como solução visual natural, sem exagerar claims.','Shows the practical problem and frames the product as a natural visual solution without exaggerated claims.','Muestra el problema práctico y presenta el producto como solución visual natural, sin exagerar claims.'],
    transformation:['Mostra um resultado visual mais organizado ou acolhedor sem atribuir desempenho não comprovado ao produto.','Shows a calmer or more organized visual outcome without implying unverified product performance.','Muestra un resultado visual más organizado o acogedor sin atribuir rendimiento no comprobado al producto.'],
    discovery:['Apresenta o produto como uma descoberta útil dentro de uma cena cotidiana crível.','Frames the product as a useful discovery inside a believable everyday scene.','Presenta el producto como un descubrimiento útil dentro de una escena cotidiana creíble.'],
    inspiration:['Cria uma composição editorial desejável e salvável, mantendo o produto natural no ambiente.','Creates a save-worthy editorial composition where the product belongs naturally.','Crea una composición editorial atractiva y guardable, manteniendo el producto natural en el ambiente.'],
    utility:['Deixa o uso real do produto claro e fácil de entender no feed mobile.','Makes the real use case clear and easy to understand on a mobile feed.','Hace que el uso real del producto sea claro y fácil de entender en el feed móvil.'],
    organization:['Enfatiza ordem visual e posicionamento prático sem usar antes/depois falso.','Emphasizes visual order and practical placement without a fake before-and-after.','Enfatiza el orden visual y la colocación práctica sin usar un antes/después falso.'],
    small_spaces:['Mostra um cenário compacto com pistas visuais de escala, sem inventar dimensões.','Shows a compact-space scenario with visual scale cues and no invented dimensions.','Muestra un escenario compacto con pistas visuales de escala, sin inventar dimensiones.'],
    routine:['Integra o produto a uma rotina realista sem prometer resultados garantidos.','Integrates the product into a realistic routine without promising guaranteed results.','Integra el producto en una rutina realista sin prometer resultados garantizados.'],
    aesthetics:['Prioriza uma composição editorial de interiores sem perder a legibilidade do produto.','Prioritizes an editorial interior composition while keeping the product readable.','Prioriza una composición editorial de interiores sin perder la legibilidad del producto.'],
    how_to:['Cria sensação instrucional simples sem rasterizar etapas ou texto na imagem.','Creates a simple instructional feel without rasterized steps or embedded text.','Crea una sensación instructiva simple sin rasterizar pasos o texto en la imagen.'],
    curation:['Apresenta o produto como escolha editorial criteriosa, não como promoção gritante.','Presents the product as a considered editorial pick, not a loud promotion.','Presenta el producto como una elección editorial cuidada, no como una promoción estridente.'],
    seasonal:['Usa atmosfera sazonal apenas quando ela é coerente com o contexto editorial.','Uses seasonal atmosphere only when it fits the editorial context.','Usa una atmósfera estacional solo cuando encaja con el contexto editorial.'],
  };
  const index=locale==='pt-BR'?0:locale==='en'?1:2;
  return {
    title:(labels[angle] ?? labels.utility!)[index],
    rationale:(rationales[angle] ?? rationales.utility!)[index],
  };
}


export function buildPinterestCreativePack(input: BuildPinterestCreativePackInput): PinterestCreativePack {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const locale = input.locale ?? 'pt-BR';
  const keyword = cleanKeyword(input.keyword);
  const scene = buildSceneProfile({
    product: input.product,
    keyword,
    boardName: input.boardName,
    editorialContext: input.editorialContext,
  });
  const rawConcepts = buildCreativeConcepts({
    campaignId: input.campaignId,
    campaignVersion: input.campaignVersion,
    product: input.product,
    scene,
    keyword,
    boardName: input.boardName,
    createdAt,
    directionOffset:input.directionOffset,
  });
  const concepts=rawConcepts.map((concept)=>{
    const localized=localizeConcept(locale,concept.angle);
    return {
      ...concept,
      title:localized.title,
      rationale:localized.rationale,
      scoreExplanation:locale==='en'
        ? ['Product-scene coherence: '+Math.round(concept.sceneProfile.confidence*100)+'/100','Mobile readability and negative space planned.','Distinct editorial angle.','Product Truth preserved in the prompt.','Fit with search intent: '+keyword+'.']
        : locale==='es'
          ? ['Coherencia producto-escena: '+Math.round(concept.sceneProfile.confidence*100)+'/100','Lectura móvil y espacio negativo planificados.','Ángulo editorial diferente.','Product Truth preservado en el prompt.','Adecuación a la intención: '+keyword+'.']
          : concept.scoreExplanation,
    };
  });
  const recommended = concepts[0]!;
  const copy = buildConversionPinCopy({ locale, product:input.product, keyword, scene, existing:input.existingNarrative });
  const keywords = [...new Set([...copy.relatedKeywords, ...secondaryKeywords(copy.primaryKeyword, scene)])].slice(0,12);
  const recommendedBoardName = scene.category==='kitchen-utensils' ? copy.suggestedBoard : boardFor(scene, input.boardName);
  const constraints = truthConstraints(input.product);
  const guard = runVisualTruthGuard({
    product: input.product,
    scene,
    prompt: recommended.imagePrompt.prompt,
    copy: [...copy.titles, ...copy.descriptions, copy.headline],
  });
  const qualityScore = Math.max(0, Math.min(100, Math.round(
    recommended.score * 0.45 + scene.confidence * 100 * 0.35 + (guard.outcome === 'PASS' ? 20 : guard.outcome === 'WARN' ? 12 : 0),
  )));
  return {
    id: input.campaignId + ':v' + input.campaignVersion + ':pinterest-pack',
    organizationId: input.organizationId,
    campaignId: input.campaignId,
    campaignVersion: input.campaignVersion,
    productId: input.product.productId,
    locale,
    copy: {
      titles: copy.titles.map((value) => value.slice(0, 100)),
      descriptions: copy.descriptions.map((value) => value.slice(0, 800)),
      headline: copy.headline,
      subheadline: copy.subheadline,
      cta: copy.cta,
      disclosure: copy.disclosure,
      altText: copy.altText,
      keywords,
      primaryKeyword: copy.primaryKeyword,
      secondaryKeywords: keywords.slice(1, 7),
      longTailKeywords: copy.longTailKeywords,
      recommendedBoardName,
      friendlyFilename: slugifyPackFilename(keyword + '-' + input.product.title.value) + '.png',
    },
    creativeDirection: {
      productCategory: scene.category,
      useCase: scene.useCase,
      sceneType: scene.sceneType,
      roomOrEnvironment: scene.environment,
      visualStyle: scene.style,
      lighting: scene.lighting,
      cameraAngle: 'eye-level or slight 3/4 angle',
      composition: scene.composition,
      negativeSpace: scene.negativeSpace,
      productPlacement: scene.placement,
      colorDirection: 'neutral colors derived from the verified product/reference; no invented product color',
      mood: 'natural, refined, useful and commercially attractive',
    },
    imageConcepts: concepts,
    recommendedConceptId: recommended.id,
    technical: {
      width: 1000,
      height: 1500,
      ratio: '2:3',
      embeddedText: false,
      outputType: 'photorealistic',
    },
    truthConstraints: constraints,
    promptTemplateVersion: recommended.imagePrompt.templateVersion,
    qualityScore,
    qualityExplanation: [
      'Copy contextual com três ganchos, duas descrições úteis, SEO específico e CTA sem claims inventados.',
      'Cena classificada sem API paga.',
      'Três conceitos distintos ranqueados por coerência, clareza e força visual.',
      'Prompt protege Product Truth e reserva área para texto do app.',
      'Visual Truth Guard: ' + guard.outcome + '.',
    ],
    publicationChecklist: [
      'Imagem final 1000x1500 px (2:3).',
      'Sem texto gerado pela IA na imagem base.',
      'Produto reconhecível e fiel à referência autorizada.',
      'Headline e branding renderizados pelo NestAffiliate.',
      'Link afiliado válido e disclosure claro.',
      'Board e copy revisados antes da aprovação humana.',
    ],
    createdAt,
  };
}


export function versionPinterestCreativePack(
  pack:PinterestCreativePack,
  campaignVersion:number,
  selectedConceptId?:string,
):PinterestCreativePack{
  const selectedAngle=pack.imageConcepts.find((item)=>item.id===selectedConceptId)?.angle
    ?? pack.imageConcepts.find((item)=>item.id===pack.recommendedConceptId)?.angle
    ?? pack.imageConcepts[0]?.angle;
  const imageConcepts=pack.imageConcepts.map((concept,index)=>{
    const id=pack.campaignId+':v'+campaignVersion+':concept:'+(index+1)+':'+concept.angle;
    return {
      ...concept,
      id,
      imagePrompt:{
        ...concept.imagePrompt,
        id:id+':prompt',
        campaignVersion,
      },
    };
  });
  const recommended=imageConcepts.find((item)=>item.angle===selectedAngle) ?? imageConcepts[0]!;
  return {
    ...pack,
    id:pack.campaignId+':v'+campaignVersion+':pinterest-pack',
    campaignVersion,
    imageConcepts,
    recommendedConceptId:recommended.id,
    createdAt:new Date().toISOString(),
  };
}
