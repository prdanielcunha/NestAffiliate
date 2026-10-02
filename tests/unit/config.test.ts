import { describe, expect, it } from 'vitest';
import {
  FEATURE_FLAGS,
  KILL_SWITCHES,
  PUBLIC_LINKS,
  automationEnabled,
  canAttemptPinterestPublish,
  isMarketplaceEnabled,
  isPaidCapabilityAllowed,
} from '../../packages/config/src/index';

describe('zero-cost feature controls', () => {
  it('blocks paid capabilities by default', () => {
    expect(FEATURE_FLAGS.PAID_SERVICES_DISABLED).toBe(true);
    expect(KILL_SWITCHES.PAID_SERVICES_DISABLED).toBe(true);
    expect(isPaidCapabilityAllowed()).toBe(false);
  });

  it('does not allow Pinterest auto publish without all gates', () => {
    expect(canAttemptPinterestPublish()).toBe(false);
  });

  it('uses the official Achados do Nest profile by default', () => {
    expect(PUBLIC_LINKS.PINTEREST_PROFILE_URL).toBe('https://br.pinterest.com/achadosdonest/');
  });

  it('keeps initial marketplaces explicit', () => {
    expect(isMarketplaceEnabled('MELI')).toBe(true);
    expect(isMarketplaceEnabled('SHOPEE')).toBe(true);
    expect(isMarketplaceEnabled('AMAZON')).toBe(false);
  });

  it('automation is enabled unless the emergency switch pauses it', () => {
    expect(automationEnabled()).toBe(!KILL_SWITCHES.PAUSE_ALL_AUTOMATION);
  });
});
