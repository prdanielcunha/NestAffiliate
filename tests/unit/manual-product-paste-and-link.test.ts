import {describe,expect,it} from 'vitest';
import {cleanSharedListingUrl,cleanSharedProductTitle,parseSharedProductText} from '../../packages/integrations/src/index';

describe('paste safety and research-only imports',()=>{
 it('splits adjacent repeated links without manufacturing an affiliate URL',()=>{
  const facts=parseSharedProductText('https://meli.la/2GDhhKLhttps://meli.la/2GDhhKL');
  expect(facts.productUrl).toBe('https://meli.la/2GDhhKL');
  expect(facts.marketplace).toBe('MELI');
 });
 it('keeps just a normal shared link',()=>{
  expect(cleanSharedListingUrl('(https://meli.la/2GDhhKL,)')).toBe('https://meli.la/2GDhhKL');
 });
 it('removes a clearly duplicated repeated title without adding any details',()=>{
  const value='Conjunto Panelas Antiaderente 10 Peças Teflon Várias Cores';
  expect(cleanSharedProductTitle(value+' '+value+' '+value)).toBe(value);
 });
 it('does not convert a URL into a product title',()=>{
  const facts=parseSharedProductText('https://meli.la/2GDhhKL');
  expect(facts.title).toBe('');
 });
 it('does not silently accept an unsafe URL',()=>{
  expect(cleanSharedListingUrl('http://127.0.0.1/')).toBe('');
 });
});
