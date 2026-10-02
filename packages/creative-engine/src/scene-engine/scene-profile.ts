import type { ProductTruth, SceneProfile } from '@nestaffiliate/core';

export interface SceneEngineInput {
  product: ProductTruth;
  keyword: string;
  boardName?: string;
  editorialContext?: string;
}

export interface SceneRule {
  id: string;
  category: string;
  patterns: RegExp[];
  useCase: string;
  environment: string;
  sceneType: string;
  style: string;
  lighting: string;
  composition: string;
  placement: string;
  negativeSpace: string;
  propsAllowed: string[];
  forbiddenContext: string[];
}

export function safeProductText(input: SceneEngineInput) {
  return [
    input.product.title.value,
    input.keyword,
    input.boardName ?? '',
    input.editorialContext ?? '',
  ].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function sceneProfileFromRule(rule: SceneRule, confidence: number, explanation: string): SceneProfile {
  return {
    category: rule.category,
    useCase: rule.useCase,
    environment: rule.environment,
    sceneType: rule.sceneType,
    style: rule.style,
    lighting: rule.lighting,
    composition: rule.composition,
    placement: rule.placement,
    negativeSpace: rule.negativeSpace,
    propsAllowed: [...rule.propsAllowed],
    forbiddenContext: [...rule.forbiddenContext],
    confidence,
    explanation,
    version: 'scene-engine-v1',
  };
}
