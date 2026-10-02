import type { SceneProfile } from '@nestaffiliate/core';

export function scoreScene(profile: SceneProfile, keyword: string, boardName?: string) {
  const context = (keyword + ' ' + (boardName ?? '')).toLowerCase();
  let score = 72;
  if (profile.category !== 'home-utility') score += 10;
  if (context && profile.environment.toLowerCase().split(/\s+/).some((word) => word.length > 4 && context.includes(word))) score += 5;
  if (profile.negativeSpace) score += 5;
  if (profile.forbiddenContext.length >= 2) score += 4;
  return Math.max(0, Math.min(100, score));
}
