import { describe,expect,it,vi } from 'vitest';
import type { Campaign, ProductTruth } from '../../packages/core/src/index';
import { runDailyAgentCycle } from '../../apps/web/src/services/dailyAgent';

const old='2026-09-30T00:00:00.000Z';
const now=new Date('2026-10-01T12:00:00.000Z');

function product(price=49.9,availability:ProductTruth['availability']['value']='available'):ProductTruth{
  return {
    productId:'p',organizationId:'o',marketplace:'MELI',externalId:'MLB1',
    title:{value:'Organizador',source:'test',observedAt:old},
    url:{value:'https://example.com/p',source:'test',observedAt:old},
    affiliateUrl:{value:'https://example.com/a',source:'test',observedAt:old},
    price:{value:price,source:'test',observedAt:old},
    currency:{value:'BRL',source:'test',observedAt:old},
    availability:{value:availability,source:'test',observedAt:old},
    assetRights:'AUTHORIZED',
  };
}

function campaign(status:Campaign['status']='READY'):Campaign{
  return {
    id:'c',organizationId:'o',status,marketplace:'MELI',
    score:{score:70,confidence:'medium',reasons:[],risks:[],version:'1.0',dimensions:{trend:10,intent:12,visual:10,yield:9,quality:8,competition:7,creative:6,seasonality:4,dataConfidence:4}},
    currentVersion:{id:'c-v1',campaignId:'c',version:1,createdAt:old,reason:'initial',product:product(),narrative:{headline:'H',pinterestTitle:'T',description:'D',disclosure:'afiliado',altText:'A',cta:'C'},boardName:'B',keyword:'organizador cozinha',template:'Editorial Premium'},
    history:[],
  };
}

describe('Daily Agent zero-cost cycle',()=>{
  it('never modifies already approved campaigns',async()=>{
    const update=vi.fn();
    const refresh=vi.fn();
    const result=await runDailyAgentCycle({organizationId:'o',campaigns:[campaign('PUBLICATION_READY')],updateCampaign:update,refresh,now});
    expect(refresh).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(result.checked).toBe(0);
  });

  it('versions a READY campaign when Product Truth changed',async()=>{
    const update=vi.fn();
    const current=product(59.9);
    const result=await runDailyAgentCycle({
      organizationId:'o',campaigns:[campaign()],updateCampaign:update,now,
      refresh:async()=>({current,result:{outcome:'REVIEW_REQUIRED',changes:[{field:'price',outcome:'REVIEW_REQUIRED',before:49.9,after:59.9,message:'price'}],validatedAt:now.toISOString()}}),
    });
    expect(result.changed).toBe(1);
    expect(update).toHaveBeenCalledTimes(1);
    const updated=update.mock.calls[0]![0] as Campaign;
    expect(updated.currentVersion.version).toBe(2);
    expect(updated.currentVersion.product.price?.value).toBe(59.9);
    expect(updated.status).toBe('READY');
  });

  it('blocks a READY campaign when product became unavailable',async()=>{
    const update=vi.fn();
    const current=product(49.9,'unavailable');
    const result=await runDailyAgentCycle({
      organizationId:'o',campaigns:[campaign()],updateCampaign:update,now,
      refresh:async()=>({current,result:{outcome:'BLOCK',changes:[{field:'availability',outcome:'BLOCK',before:'available',after:'unavailable',message:'unavailable'}],validatedAt:now.toISOString()}}),
    });
    expect(result.blocked).toBe(1);
    expect((update.mock.calls[0]![0] as Campaign).status).toBe('BLOCKED');
  });
});
