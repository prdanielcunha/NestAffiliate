import type { SceneProfile } from '@nestaffiliate/core';
import { SCENE_RULES } from './category-map';
import { safeProductText, sceneProfileFromRule, type SceneEngineInput } from './scene-profile';

export function buildSceneProfile(input: SceneEngineInput): SceneProfile {
  const text = safeProductText(input);
  const candidates = SCENE_RULES.map((rule) => ({
    rule,
    hits: rule.patterns.filter((pattern) => pattern.test(text)).length,
  })).filter((candidate) => candidate.hits > 0);

  // Specific product nouns outrank incidental words from the search term
  // or board. "Caneca para cozinha" is not kitchen storage, and
  // "organizador infantil" belongs in the child's room, not the kitchen.
  const title=input.product.title.value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const exactCategory =
    /\b(infantil|crianca|bebe|brinquedo)\b/.test(title) ? 'kids-room' :
    /\b(pet|gato|cachorro|comedouro|bebedouro)\b/.test(title) ? 'pet' :
    /\b(lavanderia|cesto de roupa|varal)\b/.test(title) ? 'laundry' :
    /\b(panela\w*|frigideira\w*|cacarola\w*|assadeira\w*|caneca\w*|talher\w*|copo\w*|tigela\w*)\b/.test(title)
      && !/\borganizador\b/.test(title) ? 'kitchen-utensils' :
    undefined;
  const best = (exactCategory
    ? candidates.find(candidate=>candidate.rule.category===exactCategory)
    : undefined) ?? candidates.sort((a, b) => b.hits - a.hits)[0]
    ?? { rule: SCENE_RULES[SCENE_RULES.length - 1]!, hits: 1 };
  const isFallback = best.rule.id === 'generic-home';
  const confidence = isFallback ? 0.62 : Math.min(0.96, 0.74 + best.hits * 0.08);
  const explanation = isFallback
    ? 'O produto não caiu em uma categoria específica; foi usado um contexto residencial neutro que evita inventar função.'
    : 'A cena foi escolhida por correspondência entre título, intenção, board e regras editoriais da categoria.';
  return sceneProfileFromRule(best.rule, confidence, explanation);
}

export function sceneIsCoherent(profile: SceneProfile) {
  return Boolean(
    profile.environment &&
    profile.placement &&
    profile.negativeSpace &&
    profile.confidence >= 0.5 &&
    profile.forbiddenContext.length > 0
  );
}
