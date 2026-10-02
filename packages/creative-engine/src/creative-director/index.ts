import type { CreativeAngle, ImageConcept, ProductTruth, SceneProfile } from '@nestaffiliate/core';
import { buildImagePrompt } from '../prompt-builder';
import { scoreScene } from '../scene-engine/scene-score';

const ANGLES: Array<{angle: CreativeAngle; title: string; intent: string}> = [
  { angle: 'problem_solution', title: 'Problema → Solução', intent: 'Show the practical problem first, then make the product feel like a natural visual solution without exaggerated claims.' },
  { angle: 'transformation', title: 'Transformação', intent: 'Show a calmer, more organized or more inviting result created by the context, without implying unverified product performance.' },
  { angle: 'discovery', title: 'Descoberta', intent: 'Frame the product as a useful discovery inside a believable everyday scene.' },
  { angle: 'inspiration', title: 'Inspiração', intent: 'Create a save-worthy interior/lifestyle composition where the product belongs naturally.' },
  { angle: 'utility', title: 'Utilidade', intent: 'Make the real use case visually obvious and easy to understand on a mobile feed.' },
  { angle: 'organization', title: 'Organização', intent: 'Emphasize visual order and practical placement without a fake before-and-after claim.' },
  { angle: 'small_spaces', title: 'Pequenos espaços', intent: 'Show a compact-space scenario with clear scale cues but no invented dimensions.' },
  { angle: 'routine', title: 'Rotina facilitada', intent: 'Show the product integrated into a realistic daily routine without promising guaranteed results.' },
  { angle: 'aesthetics', title: 'Estética / decoração', intent: 'Prioritize an editorial, save-worthy room composition while keeping the product recognizable.' },
  { angle: 'how_to', title: 'How-to', intent: 'Create a simple instructional-feeling composition without rasterized steps or embedded text.' },
  { angle: 'curation', title: 'Curadoria', intent: 'Present the product as a considered editorial pick, not as a loud promotion.' },
  { angle: 'seasonal', title: 'Seasonal', intent: 'Use seasonal atmosphere only when it is compatible with the current editorial context.' },
];

function preferredAngles(scene: SceneProfile): CreativeAngle[] {
  if (scene.category === 'kitchen-organization' || scene.category === 'laundry') {
    return ['organization', 'problem_solution', 'small_spaces'];
  }
  if (scene.category === 'home-decor' || scene.category === 'lighting') {
    return ['inspiration', 'aesthetics', 'discovery'];
  }
  if (scene.category === 'pet' || scene.category === 'kids-room') {
    return ['routine', 'utility', 'inspiration'];
  }
  if (scene.category === 'home-office') {
    return ['utility', 'organization', 'aesthetics'];
  }
  return ['problem_solution', 'utility', 'discovery'];
}

function conceptScore(angle: CreativeAngle, scene: SceneProfile, keyword: string, boardName?: string, index = 0) {
  const sceneScore = scoreScene(scene, keyword, boardName);
  const benefitClarity = ['problem_solution', 'utility', 'organization'].includes(angle) ? 94 : 86;
  const visualStrength = ['aesthetics', 'inspiration', 'transformation'].includes(angle) ? 94 : 88;
  const diversity = 92 - index * 3;
  return Math.round(sceneScore * 0.35 + benefitClarity * 0.25 + visualStrength * 0.25 + diversity * 0.15);
}

function conceptScene(scene: SceneProfile, angle: CreativeAngle): SceneProfile {
  const changes: Partial<SceneProfile> =
    angle === 'aesthetics' || angle === 'inspiration'
      ? { composition: 'editorial room composition with the product as a clear but natural focal point', style: scene.style + ', more editorial and save-worthy' }
      : angle === 'problem_solution'
        ? { composition: 'clear practical context with visual tension kept subtle; product is the clean focal solution', negativeSpace: 'clean upper third reserved for the app headline' }
        : angle === 'small_spaces'
          ? { composition: 'compact-space framing with useful context and no invented dimensions', negativeSpace: 'one calm side of the frame reserved for headline' }
          : angle === 'utility' || angle === 'organization'
            ? { composition: 'functional close-to-medium framing that makes the confirmed use case immediately understandable' }
            : {};
  return { ...scene, ...changes };
}

export function buildCreativeConcepts(input: {
  campaignId: string;
  campaignVersion: number;
  product: ProductTruth;
  scene: SceneProfile;
  keyword: string;
  boardName?: string;
  createdAt?: string;
}): ImageConcept[] {
  const selected = preferredAngles(input.scene);
  return selected.map((angle, index) => {
    const base = ANGLES.find((item) => item.angle === angle)!;
    const scene = conceptScene(input.scene, angle);
    const score = conceptScore(angle, scene, input.keyword, input.boardName, index);
    const id = input.campaignId + ':v' + input.campaignVersion + ':concept:' + (index + 1) + ':' + angle;
    return {
      id,
      angle,
      title: base.title,
      rationale: base.intent,
      sceneProfile: scene,
      imagePrompt: buildImagePrompt({
        id: id + ':prompt',
        campaignId: input.campaignId,
        campaignVersion: input.campaignVersion,
        product: input.product,
        scene,
        artDirection: base.intent,
        createdAt: input.createdAt,
      }),
      score,
      scoreExplanation: [
        'Coerência produto-cena: ' + Math.round(scene.confidence * 100) + '/100',
        'Leitura mobile e espaço negativo planejados.',
        'Ângulo editorial distinto das outras propostas.',
        'Product Truth preservado no prompt.',
        'Adequação à intenção "' + input.keyword + '".',
      ],
    };
  }).sort((a, b) => b.score - a.score);
}
