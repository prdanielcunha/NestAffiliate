import type { SceneProfile } from '@nestaffiliate/core';
import { SCENE_RULES } from './category-map';
import { safeProductText, sceneProfileFromRule, type SceneEngineInput } from './scene-profile';

export function buildSceneProfile(input: SceneEngineInput): SceneProfile {
  const text = safeProductText(input);
  const candidates = SCENE_RULES.map((rule) => ({
    rule,
    hits: rule.patterns.filter((pattern) => pattern.test(text)).length,
  })).filter((candidate) => candidate.hits > 0);

  // A generic "cozinha" board or keyword must not classify a cookware set
  // as a storage organizer. Specific product nouns beat surrounding context.
  const cookware=/\b(panela\w*|frigideira\w*|cac[aç]rola\w*|assadeira\w*)\b/.test(
    input.product.title.value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),
  );
  const best = (cookware
    ? candidates.find(candidate=>candidate.rule.category==='kitchen-utensils')
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
