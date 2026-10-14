import { describe,expect,it } from 'vitest';
import { buildMeliTrendSignal } from '../../packages/radar/src/index';

describe('Radar 7: factual commercial evidence',()=>{
  it('never converts a ranked trend position into invented growth or most-searched status',()=>{
    for(const position of [1,10,11,30,31,50]){
      const signal=buildMeliTrendSignal({position,keyword:'organização',observedAt:'2026-10-14T20:00:00Z'});
      expect(signal.source).toBe('MELI_TREND_POPULAR');
      expect(signal.kind).toBe('DEMAND');
      expect(signal.rank).toBe(position);
      expect(signal.evidence.join(' ')).toMatch(/não informados/);
      expect(signal.label.toLowerCase()).not.toMatch(/crescimento semanal|mais buscad/);
    }
  });
});
