import {describe,it,expect} from 'vitest';
import {isPublicPinterestPinUrl} from '../../packages/compliance/src/publishedProof';
describe('Public Pin proof',()=>{
  it('accepts Pinterest public pin IDs on https domains',()=>{
    expect(isPublicPinterestPinUrl('https://br.pinterest.com/pin/123456/')).toBe(true);
    expect(isPublicPinterestPinUrl('https://www.pinterest.com/pin/654321')).toBe(true);
  });
  it('rejects product links, lookalikes, non-https and credentials',()=>{
    expect(isPublicPinterestPinUrl('https://pinterest.com.evil.invalid/pin/123/')).toBe(false);
    expect(isPublicPinterestPinUrl('https://www.pinterest.com/search/pins/?q=abc')).toBe(false);
    expect(isPublicPinterestPinUrl('http://www.pinterest.com/pin/123')).toBe(false);
    expect(isPublicPinterestPinUrl('https://evil:pwd@pinterest.com/pin/123')).toBe(false);
    expect(isPublicPinterestPinUrl('https://pin.it/abcdef')).toBe(false);
  });
});
