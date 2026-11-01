import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {runPublishingGuard,pinterestAffiliateMethod} from '../../packages/compliance/src/index';
import {nextCampaignVersion,type CreativeAsset,type ProductTruth} from '../../packages/core/src/index';
import {demoCampaigns} from '../../apps/web/src/lib/demo';
import {renderPin,buildSceneProfile} from '../../packages/creative-engine/src/index';
import {createVideoPreparation,VIDEO_TOOLS} from '../../apps/web/src/lib/videoPreparation';
const sample=demoCampaigns[0]!;
const now=new Date();
const shopee:ProductTruth={...sample.currentVersion.product,marketplace:'SHOPEE',externalId:'123',
 url:{value:'https://shopee.com.br/product/1/123',source:'test',observedAt:now.toISOString()},
 affiliateUrl:{value:'https://s.shopee.com.br/abc123',source:'user-provided',observedAt:now.toISOString()},
 assetRights:'AUTHORIZED',availability:{value:'available',source:'test',observedAt:now.toISOString()},
};
const guard=(product:ProductTruth,destinationUrl=product.affiliateUrl?.value??product.url.value)=>runPublishingGuard({product,destinationUrl,requireAffiliateAttestation:true,now,
 headline:'Organizador',description:'Confira o produto e as condições no anúncio.',disclosure:'Conteúdo com link de afiliado.'});
describe('Pinterest affiliate publication paths',()=>{
 it('requires fresh exact portal confirmation for Shopee direct links',()=>{
  expect(pinterestAffiliateMethod(shopee)).toBe('AFFILIATE_LINK');
  expect(guard(shopee).outcome).toBe('BLOCK');
  const confirmed={...shopee,affiliateAttestation:{method:'USER_CONFIRMED_IN_AFFILIATE_PORTAL' as const,marketplace:'SHOPEE' as const,
   channel:'PINTEREST' as const,externalId:'123',url:shopee.affiliateUrl!.value,confirmedAt:now.toISOString()}};
  expect(guard(confirmed).outcome).toBe('PASS');
  expect(guard(confirmed,shopee.url.value).outcome).toBe('BLOCK');
 });
 it('does not confuse official tagging with an old saved direct link',()=>{
  const tagged={...shopee,pinterestAffiliateMethod:'SHOPEE_TAG' as const};
  expect(pinterestAffiliateMethod(tagged)).toBe('SHOPEE_TAG');
  expect(guard(tagged,shopee.url.value).checks.find(c=>c.key==='affiliate-link')?.outcome).toBe('WARN');
  expect(guard(tagged,shopee.url.value).checks.some(c=>c.key==='affiliate-attestation')).toBe(false);
 });
 it.each(['PUBLICATION_READY','PUBLISHED'] as const)('requires approval again after editing a %s version',status=>{
  const next=nextCampaignVersion({...sample,status},{boardName:'Outra pasta'},'edited board');
  expect(next.status).toBe('READY');expect(next.history).toContainEqual(sample.currentVersion);
 });
});

describe('final image export never substitutes missing creative',()=>{
 const dataUrl=vi.fn(()=> 'data:image/png;base64,AA==');const draws=vi.fn();const texts=vi.fn();
 const context=new Proxy({drawImage:draws,fillText:texts,measureText:()=>({width:10}),createLinearGradient:()=>({addColorStop:vi.fn()})},
  {get:(target,key)=>key in target?target[key as keyof typeof target]:vi.fn(),set:(target,key,value)=>{Reflect.set(target,key,value);return true;}});
 const canvas={getContext:()=>context,toDataURL:dataUrl} as unknown as HTMLCanvasElement;
 let failImage=false;
 const urls:string[]=[];
 beforeEach(()=>{
  vi.clearAllMocks();failImage=false;urls.length=0;
  vi.stubGlobal('Image',class {width=1000;height=1500;onload?:()=>void;onerror?:()=>void;crossOrigin='';
   set src(value:string){urls.push(value);queueMicrotask(()=>failImage?this.onerror?.():this.onload?.());}
  });
 });
 afterEach(()=>vi.unstubAllGlobals());
 const asset:CreativeAsset={id:'a',organizationId:sample.organizationId,campaignId:sample.id,origin:'GENERATED_LOCAL',composition:'BASE_IMAGE',
  rightsStatus:'AUTHORIZED',mimeType:'image/png',width:1000,height:1500,originalWidth:1000,originalHeight:1500,hash:'abc',downloadUrl:'https://example.com/reviewed.png',
  embeddedTextConfirmedAbsent:true,productFidelityConfirmed:true,createdAt:now.toISOString()};
 it('blocks absent or unresolved media',async()=>{
  await expect(renderPin(canvas,{...sample.currentVersion,creativeAsset:undefined},undefined,{strict:true})).rejects.toThrow('FINAL_PIN_IMAGE_MISSING');
  await expect(renderPin(canvas,{...sample.currentVersion,creativeAsset:{...asset,downloadUrl:undefined}},undefined,{strict:true})).rejects.toThrow('FINAL_PIN_IMAGE_MISSING');
  expect(dataUrl).not.toHaveBeenCalled();
 });
 it('does not export a product placeholder when approved media cannot load',async()=>{
  failImage=true;
  await expect(renderPin(canvas,{...sample.currentVersion,creativeAsset:asset},undefined,{strict:true})).rejects.toThrow('FINAL_PIN_IMAGE_UNAVAILABLE');
  expect(dataUrl).not.toHaveBeenCalled();expect(urls).toEqual([asset.downloadUrl]);
 });
 it('uses the reviewed image even when a legacy non-contextual template is selected',async()=>{
  await renderPin(canvas,{...sample.currentVersion,template:'Minimal',creativeAsset:asset},undefined,{strict:true});
  expect(urls).toEqual([asset.downloadUrl]);expect(draws).toHaveBeenCalledTimes(1);expect(dataUrl).toHaveBeenCalledTimes(1);
 });
 it('preserves completed legacy local layouts without drawing a second title',async()=>{
  await renderPin(canvas,{...sample.currentVersion,creativeAsset:{...asset,composition:undefined}},undefined,{strict:true});
  expect(draws).toHaveBeenCalledTimes(1);expect(texts).not.toHaveBeenCalled();
 });
});

describe('separate video preparation',()=>{
 it('keeps the Pin unchanged and preserves product reference and channel in each scene',()=>{
  const v=sample.currentVersion;const before=JSON.stringify(v);
  const plan=createVideoPreparation(v,'TIKTOK');
  expect(JSON.stringify(v)).toBe(before);expect(plan.scenes).toHaveLength(3);
  for(const scene of plan.scenes){expect(scene.prompt).toContain('9:16');expect(scene.prompt).toContain('TIKTOK');expect(scene.prompt).toContain('must attach');expect(scene.prompt).toContain(v.product.title.value);}
  expect(VIDEO_TOOLS[0]?.id).toBe('flow');
 });
});

describe('product setting outranks an unrelated board',()=>{
 it.each([
  ['Organizador de mesa para escritório','home-office'],
  ['Organizador de banheiro','bathroom-accessories'],
  ['Luminária de mesa','lighting'],
  ['Tapete para sala','home-decor'],
 ])('places %s in its correct everyday setting',(title,category)=>{
   const product={...sample.currentVersion.product,title:{...sample.currentVersion.product.title,value:title}};
   expect(buildSceneProfile({product,keyword:'organização de cozinha',boardName:'Cozinha pequena'}).category).toBe(category);
 });
});
