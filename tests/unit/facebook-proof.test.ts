import {describe,it,expect} from 'vitest';
import {isPublicFacebookReelUrl} from '../../packages/compliance/src/facebookProof';
describe('Facebook guided proof URL',()=>{
  it('recognizes a public Reel URL but no provider monetization',()=>{
    expect(isPublicFacebookReelUrl('https://www.facebook.com/reel/1234567')).toBe(true);
    expect(isPublicFacebookReelUrl('https://m.facebook.com/reel/1234/')).toBe(true);
  });
  it('rejects private, lookalike and non-Reel URLs',()=>{
    expect(isPublicFacebookReelUrl('https://facebook.com.evil.invalid/reel/1234')).toBe(false);
    expect(isPublicFacebookReelUrl('https://facebook.com/groups/1234')).toBe(false);
    expect(isPublicFacebookReelUrl('http://facebook.com/reel/1234')).toBe(false);
    expect(isPublicFacebookReelUrl('https://pin.it/abc')).toBe(false);
  });
});
