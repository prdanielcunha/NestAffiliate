import { describe,expect,it } from 'vitest';
import {
  publicationScheduleStatus,
  validateScheduledFor,
  type ProductTruth,
  type PublicationSchedule,
} from '../../packages/core/src/index';
import { validateFreshProduct } from '../../packages/compliance/src/index';

const now='2026-10-01T12:00:00.000Z';

function product(patch:Partial<ProductTruth>={}):ProductTruth{
  return {
    productId:'p1',organizationId:'o',marketplace:'MELI',externalId:'MLB1',
    title:{value:'Organizador',source:'test',observedAt:now},
    url:{value:'https://example.com/p',source:'test',observedAt:now},
    affiliateUrl:{value:'https://example.com/a',source:'manual',observedAt:now},
    price:{value:49.9,source:'test',observedAt:now},
    currency:{value:'BRL',source:'test',observedAt:now},
    availability:{value:'available',source:'test',observedAt:now},
    assetRights:'AUTHORIZED',
    ...patch,
  };
}

describe('publication lifecycle',()=>{
  it('marks schedule due only after its time',()=>{
    const schedule:PublicationSchedule={
      id:'s1',organizationId:'o',campaignId:'c1',campaignVersion:1,mode:'GUIDED',
      scheduledFor:'2026-10-01T13:00:00.000Z',timezone:'America/Sao_Paulo',
      status:'SCHEDULED',createdAt:now,updatedAt:now,
    };
    expect(publicationScheduleStatus(schedule,new Date('2026-10-01T12:30:00Z'))).toBe('SCHEDULED');
    expect(publicationScheduleStatus(schedule,new Date('2026-10-01T13:00:00Z'))).toBe('DUE');
  });

  it('rejects past schedule times',()=>{
    expect(validateScheduledFor('2026-10-01T11:59:00Z',new Date(now)).valid).toBe(false);
    expect(validateScheduledFor('2026-10-01T12:30:00Z',new Date(now)).valid).toBe(true);
  });

  it('requires review when price changes after approval',()=>{
    const approved=product();
    const current=product({price:{value:59.9,source:'fresh',observedAt:now}});
    const result=validateFreshProduct(approved,current,new Date(now));
    expect(result.outcome).toBe('REVIEW_REQUIRED');
    expect(result.changes.some(change=>change.field==='price')).toBe(true);
  });

  it('blocks publication when product became unavailable',()=>{
    const result=validateFreshProduct(
      product(),
      product({availability:{value:'unavailable',source:'fresh',observedAt:now}}),
      new Date(now),
    );
    expect(result.outcome).toBe('BLOCK');
  });
});
