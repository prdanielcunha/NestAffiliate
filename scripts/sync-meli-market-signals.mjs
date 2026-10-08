import { isReadyCampaignOffer } from './revenue-offer-gates.mjs';
import { createMeliRateGate } from './meli-rate-gate.mjs';

const meliGate=createMeliRateGate({spacingMs:450});
const PROJECT_ID=process.env.FIREBASE_PROJECT_ID || 'millionsnest';
const ORG_ID=process.env.NESTAFFILIATE_SIGNAL_ORG_ID || '';
const GCP_TOKEN=process.env.GOOGLE_OAUTH_ACCESS_TOKEN || '';
const CLIENT_ID=process.env.MELI_CLIENT_ID || '';
const CLIENT_SECRET=process.env.MELI_CLIENT_SECRET || '';
const INITIAL_REFRESH_TOKEN=process.env.MELI_INITIAL_REFRESH_TOKEN || '';

const firestoreBase=`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const secretDoc=`${firestoreBase}/organizations/${encodeURIComponent(ORG_ID)}/products/nestaffiliate/providerSecretState/mercadolivre`;
const connectionDoc=`${firestoreBase}/organizations/${encodeURIComponent(ORG_ID)}/products/nestaffiliate/providerConnections/mercadolivre`;
const signalBase=`${firestoreBase}/organizations/${encodeURIComponent(ORG_ID)}/products/nestaffiliate/marketSignalSnapshots`;

function required(name,value){
  if(!value) throw new Error(`MISSING_${name}`);
}

function normalize(value){
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toLowerCase();
}

function homeRelevant(value){
  return /(casa|cozinha|banheiro|quarto|lavander|organiz|decor|moveis|movel|eletrodom|ferrament|lumin|tapete|cesto|pote|prateleira|armario|mesa|cadeira|cortina|cama|sala|jardim|limpeza|utilidades)/.test(normalize(value));
}

function fsValue(value){
  if(value===null || value===undefined) return {nullValue:null};
  if(typeof value==='string') return {stringValue:value};
  if(typeof value==='boolean') return {booleanValue:value};
  if(typeof value==='number'){
    return Number.isInteger(value) ? {integerValue:String(value)} : {doubleValue:value};
  }
  if(Array.isArray(value)) return {arrayValue:{values:value.map(fsValue)}};
  if(typeof value==='object'){
    return {mapValue:{fields:Object.fromEntries(Object.entries(value).map(([k,v])=>[k,fsValue(v)]))}};
  }
  return {stringValue:String(value)};
}

function fieldsObject(input){
  return {fields:Object.fromEntries(Object.entries(input).map(([key,value])=>[key,fsValue(value)]))};
}

function fromFsString(doc,field){
  return doc?.fields?.[field]?.stringValue || '';
}

async function gcpFetch(url,options={}){
  const response=await fetch(url,{
    ...options,
    headers:{
      Authorization:`Bearer ${GCP_TOKEN}`,
      'Content-Type':'application/json',
      ...(options.headers || {}),
    },
  });
  return response;
}

async function readSecretState(){
  const response=await gcpFetch(secretDoc);
  if(response.status===404) return null;
  if(!response.ok) throw new Error(`FIRESTORE_SECRET_READ_${response.status}`);
  return response.json();
}

async function writeDoc(url,data){
  const response=await gcpFetch(url,{method:'PATCH',body:JSON.stringify(fieldsObject(data))});
  if(!response.ok){
    const body=await response.text();
    throw new Error(`FIRESTORE_WRITE_${response.status}:${body.slice(0,240)}`);
  }
}

async function refreshMeliToken(refreshToken){
  const body=new URLSearchParams({
    grant_type:'refresh_token',
    client_id:CLIENT_ID,
    client_secret:CLIENT_SECRET,
    refresh_token:refreshToken,
  });
  const response=await fetch('https://api.mercadolibre.com/oauth/token',{
    method:'POST',
    headers:{
      accept:'application/json',
      'content-type':'application/x-www-form-urlencoded',
    },
    body,
  });
  if(!response.ok){
    const text=await response.text();
    throw new Error(`MELI_REFRESH_${response.status}:${text.slice(0,300)}`);
  }
  return response.json();
}

function sleep(ms){
  return new Promise((resolve)=>setTimeout(resolve,ms));
}

async function meliGet(path,accessToken){
  let lastStatus=0;
  for(let attempt=0;attempt<4;attempt+=1){
    const response=await meliGate.run(()=>fetch(`https://api.mercadolibre.com${path}`,{
      headers:{Authorization:`Bearer ${accessToken}`,Accept:'application/json'},
    }));
    if(response.ok) return response.json();

    lastStatus=response.status;
    const retryable=response.status===429 || response.status>=500;
    if(!retryable || attempt===3) break;

    const retryAfter=Number(response.headers.get('retry-after') || 0);
    const backoff=Math.max(retryAfter*1000,Math.min(8000,1000*(2**attempt)));
    console.warn('MELI_RETRY',JSON.stringify({path,status:response.status,attempt:attempt+1,backoff}));
    await sleep(backoff);
  }
  throw new Error(`MELI_GET_${lastStatus}:${path}`);
}

function trendSignal(entry,index,observedAt){
  const position=index+1;
  const segment=position<=10
    ? {source:'MELI_TREND_GROWTH',label:'Mercado Livre · maior crescimento semanal',base:1,floor:0.78,start:1,end:10}
    : position<=30
      ? {source:'MELI_TREND_DESIRED',label:'Mercado Livre · buscas mais desejadas',base:0.86,floor:0.66,start:11,end:30}
      : {source:'MELI_TREND_POPULAR',label:'Mercado Livre · tendência popular',base:0.75,floor:0.56,start:31,end:50};
  const relative=position-segment.start;
  const span=Math.max(1,segment.end-segment.start);
  const strength=segment.base-(segment.base-segment.floor)*(relative/span);
  return {
    id:`meli-trend-${position}-${normalize(entry.keyword).replace(/[^a-z0-9]+/g,'-').slice(0,80)}`,
    source:segment.source,
    kind:'DEMAND',
    strength:Number(strength.toFixed(4)),
    confidence:0.96,
    observedAt,
    label:segment.label,
    evidence:[`posição geral:${position}`,segment.label],
    rank:position,
    keyword:String(entry.keyword || ''),
  };
}

function highlightSignal(entry,category,observedAt){
  const position=Math.max(1,Math.min(20,Number(entry.position || 20)));
  const strength=1-((position-1)/19)*0.35;
  const exactItem=entry.type==='ITEM';
  return {
    id:`meli-best-${String(entry.type || 'UNKNOWN').toLowerCase()}-${entry.id}-${position}`,
    source:'MELI_BEST_SELLER',
    kind:'BEST_SELLER',
    strength:Number(strength.toFixed(4)),
    confidence:exactItem ? 0.98 : 0.88,
    observedAt,
    label:'Mercado Livre · mais vendido na categoria',
    evidence:[
      `bestseller #${position}`,
      `categoria:${category.label || category.id}`,
      `entity:${entry.type}`,
      `entityId:${entry.id}`,
    ],
    rank:position,
    keyword:category.label || undefined,
    entityType:String(entry.type || 'UNKNOWN'),
    entityId:String(entry.id || ''),
    productExternalId:exactItem ? entry.id : undefined,
  };
}

async function inferRelevantCategories(trends,accessToken){
  const selected=[];
  const seen=new Set();
  const seeds=[
    'organizador cozinha',
    'potes hermeticos',
    'prateleira organizadora',
    'organizador banheiro',
    'organizador lavanderia',
    'cadeira escritorio',
    'luminaria casa',
    'cesto organizador',
  ];
  const trendSeeds=trends
    .map((trend)=>String(trend.keyword || '').trim())
    .filter((keyword)=>keyword && homeRelevant(keyword))
    .slice(0,20);
  const queries=[...new Set([...seeds,...trendSeeds])];

  for(const query of queries){
    try{
      const discovery=await meliGet(`/sites/MLB/domain_discovery/search?limit=3&q=${encodeURIComponent(query)}`,accessToken);
      const predicted=Array.isArray(discovery) ? discovery[0] : null;
      const categoryId=predicted?.category_id;
      if(!categoryId || seen.has(categoryId)) continue;
      const category=await meliGet(`/categories/${encodeURIComponent(categoryId)}`,accessToken);
      const path=(category?.path_from_root || []).map((item)=>item.name).join(' ');
      const label=predicted?.category_name || category?.name || query;
      if(!homeRelevant(path || label || query)) continue;
      seen.add(categoryId);
      selected.push({id:categoryId,label,seed:query});
      if(selected.length>=10) break;
    }catch(error){
      console.warn('CATEGORY_DISCOVERY_SKIP',query,error instanceof Error ? error.message : String(error));
    }
  }
  return selected;
}


const dailyAgentRoot=firestoreBase+'/organizations/'+encodeURIComponent(ORG_ID)+'/products/nestaffiliate';
const dailyAgentCampaigns=dailyAgentRoot+'/campaigns';
const dailyAgentVersions=dailyAgentRoot+'/campaignVersions';
const dailyAgentOpportunities=dailyAgentRoot+'/opportunities';
const dailyAgentRuns=dailyAgentRoot+'/dailyAgentRuns';
const dailyAgentJobs=dailyAgentRoot+'/systemJobs';
const DAILY_AGENT_INTERVAL_MS=3*60*60_000;
const MIN_VALIDATED_SALES=100;

function decodeFsValue(value){
  if(!value || typeof value!=='object') return null;
  if('stringValue' in value) return value.stringValue;
  if('integerValue' in value) return Number(value.integerValue);
  if('doubleValue' in value) return Number(value.doubleValue);
  if('booleanValue' in value) return Boolean(value.booleanValue);
  if('timestampValue' in value) return String(value.timestampValue);
  if('nullValue' in value) return null;
  if('arrayValue' in value) return (value.arrayValue?.values || []).map(decodeFsValue);
  if('mapValue' in value){
    return Object.fromEntries(Object.entries(value.mapValue?.fields || {}).map(([key,nested])=>[key,decodeFsValue(nested)]));
  }
  return null;
}

function decodeFsDoc(doc){
  return Object.fromEntries(Object.entries(doc?.fields || {}).map(([key,value])=>[key,decodeFsValue(value)]));
}

async function listDocs(url){
  const response=await gcpFetch(url+'?pageSize=500');
  if(response.status===404) return [];
  if(!response.ok){
    const body=await response.text();
    throw new Error('FIRESTORE_LIST_'+response.status+':'+body.slice(0,180));
  }
  const payload=await response.json();
  return Array.isArray(payload.documents) ? payload.documents : [];
}

async function readDoc(url){
  const response=await gcpFetch(url);
  if(response.status===404) return null;
  if(!response.ok) throw new Error('FIRESTORE_READ_'+response.status);
  return response.json();
}

async function meliMaybeGet(path,accessToken){
  for(let attempt=0;attempt<4;attempt+=1){
    const response=await meliGate.run(()=>fetch('https://api.mercadolibre.com'+path,{headers:{Authorization:'Bearer '+accessToken,Accept:'application/json'}}));
    if(response.ok) return response.json();

    const retryable=response.status===429 || response.status>=500;
    if(!retryable || attempt===3) return null;

    const retryAfter=Number(response.headers.get('retry-after') || 0);
    const backoff=Math.max(retryAfter*1000,Math.min(8000,1000*(2**attempt)));
    console.warn('MELI_MAYBE_RETRY',JSON.stringify({path,status:response.status,attempt:attempt+1,backoff}));
    await sleep(backoff);
  }
  return null;
}

function dailyNormalize(value){
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
}

function dailyTokens(value){
  return new Set(dailyNormalize(value).split(' ').filter((token)=>token.length>2));
}

function dailySimilarity(a,b){
  const aa=dailyTokens(a),bb=dailyTokens(b);
  const union=new Set([...aa,...bb]);
  if(!union.size) return 0;
  let intersection=0;
  for(const token of aa) if(bb.has(token)) intersection+=1;
  return intersection/union.size;
}

function dailyTheme(opportunity){
  const text=dailyNormalize((opportunity?.keyword || '')+' '+(opportunity?.product?.title?.value || ''));
  if(/geladeira|refrigerador/.test(text)) return 'cozinha-geladeira';
  if(/prato|louca|talher/.test(text)) return 'cozinha-loucas';
  if(/panela|tampa/.test(text)) return 'cozinha-panelas';
  if(/armario|prateleira/.test(text)) return 'armarios-prateleiras';
  if(/banheiro|banho/.test(text)) return 'banheiro';
  if(/lavander/.test(text)) return 'lavanderia';
  if(/cadeira|escritorio/.test(text)) return 'escritorio';
  if(/lumin/.test(text)) return 'iluminacao';
  if(/cesto/.test(text)) return 'cestos';
  if(/decor/.test(text)) return 'decoracao';
  return dailyNormalize(opportunity?.keyword || '').split(' ').slice(0,3).join('-') || 'casa';
}

function dailyBoard(keyword){
  const text=dailyNormalize(keyword);
  if(text.includes('cozinha')) return 'Cozinha Pequena e Organizada';
  if(text.includes('banheiro')) return 'Organização de Banheiro';
  if(text.includes('lavander')) return 'Lavanderia Pequena e Funcional';
  if(text.includes('quarto')) return 'Quarto Organizado e Aconchegante';
  if(text.includes('apartamento') || text.includes('pequeno')) return 'Ideias para Apartamento Pequeno';
  if(text.includes('decor')) return 'Decoração Simples e Bonita';
  if(text.includes('organiz')) return 'Achados Inteligentes para Casa';
  return 'Produtos que Facilitam a Rotina';
}

function dailyDataConfidence(product){
  let points=0;
  if(product.title?.value) points+=1;
  if(product.price?.value) points+=1;
  if(product.sellerName?.value) points+=1;
  if(product.rating?.value || product.sellerReputation?.value) points+=1;
  if(product.imageUrl?.value) points+=1;
  if(product.availability?.value==='available') points+=1;
  return Math.min(1,points/6);
}

function dailyScore(product,keyword,signals){
  const relevant=(signals || []).filter((signal)=>{
    if(signal.productExternalId && signal.productExternalId===product.externalId) return true;
    if(!signal.keyword) return false;
    return Math.max(dailySimilarity(signal.keyword,keyword),dailySimilarity(signal.keyword,product.title.value))>=0.28;
  }).sort((a,b)=>(Number(b.strength||0)*Number(b.confidence||0))-(Number(a.strength||0)*Number(a.confidence||0)));
  // Demand must come from an official trend or bestseller, never a generic
  // offer-count, yield or other commercial signal (including legacy snapshots).
  const demandSignals=relevant.filter((signal)=>
    ['DEMAND','BEST_SELLER','PINTEREST_DEMAND'].includes(signal.kind) &&
    !['MELI_SEARCH','SHOPEE_SEARCH_ASSISTED'].includes(signal.source)
  );
  const strongest=demandSignals[0];
  const support=demandSignals.slice(1,3).reduce((sum,signal)=>sum+(Number(signal.strength||0)*Number(signal.confidence||0)*0.12),0);
  const demand=strongest ? Math.min(1,Number(strongest.strength||0)*Number(strongest.confidence||0)+support) : 0.55;
  const factual=dailyDataConfidence(product);
  const signalConfidence=relevant.length ? relevant.reduce((sum,signal)=>sum+Number(signal.confidence||0),0)/relevant.length : 0;
  const combined=Math.min(1,factual*0.72+signalConfidence*0.28);
  const intent=/compr|kit|organizador|suporte|dispens|prateleira|luminaria|tapete|cesto|armario|gancho|pote/.test(dailyNormalize(keyword)) ? 0.94 : 0.74;
  const price=Number(product.price?.value || 0);
  const yieldStrength=!price ? 0.48 : price>=35 && price<=140 ? 0.76 : price<=250 ? 0.64 : price<35 ? 0.58 : 0.46;
  const quality=typeof product.rating?.value==='number' ? Math.min(1,product.rating.value/5) : typeof product.sellerReputation?.value==='number' ? Math.min(1,product.sellerReputation.value) : 0.58;
  const dimensions={
    trend:Math.round(18*demand),
    intent:Math.round(16*intent),
    visual:Math.round(14*(product.imageUrl?.value ? 0.82 : 0.5)),
    yield:Math.round(14*yieldStrength),
    quality:Math.round(12*quality),
    competition:7,
    creative:Math.round(8*(product.imageUrl?.value ? 0.88 : 0.6)),
    seasonality:2,
    dataConfidence:Math.max(1,Math.round(combined*4)),
  };
  const maxima={trend:18,intent:16,visual:14,yield:14,quality:12,competition:10,creative:8,seasonality:4,dataConfidence:4};
  const labels={trend:'Demanda em movimento',intent:'Intenção de compra',visual:'Potencial visual',yield:'Retorno comercial',quality:'Qualidade do produto',competition:'Espaço competitivo',creative:'Superfície criativa',seasonality:'Sazonalidade',dataConfidence:'Confiança dos dados'};
  const score=Object.values(dimensions).reduce((sum,value)=>sum+value,0);
  const ranked=Object.keys(dimensions).map((key)=>({key,ratio:dimensions[key]/maxima[key],value:dimensions[key],max:maxima[key]})).sort((a,b)=>b.ratio-a.ratio);
  return {
    score,
    confidence:dimensions.dataConfidence>=4 ? 'high' : dimensions.dataConfidence>=2 ? 'medium' : 'low',
    dimensions,
    reasons:ranked.slice(0,3).map((entry)=>labels[entry.key]+': '+entry.value+'/'+entry.max),
    risks:ranked.filter((entry)=>entry.ratio<0.55).slice(0,2).map((entry)=>labels[entry.key]+' ainda precisa de evidência'),
    relevant,
  };
}

function mapDailyItem(item){
  const id=String(item?.id || '').trim();
  const title=String(item?.title || item?.name || '').trim();
  const permalink=String(item?.permalink || '').trim();
  if(!id || !title || !permalink) return null;
  const observedAt=new Date().toISOString();
  const price=Number(item.price);
  const quantity=typeof item.available_quantity==='number' ? item.available_quantity : undefined;
  const soldQuantity=typeof item.sold_quantity==='number' ? item.sold_quantity : undefined;
  const active=item.status ? item.status==='active' : true;
  const image=String(item.thumbnail || item.secure_thumbnail || item.pictures?.[0]?.secure_url || item.pictures?.[0]?.url || '').replace(/^http:/,'https:');
  return {
    productId:'meli:'+id,
    organizationId:ORG_ID,
    marketplace:'MELI',
    externalId:id,
    title:{value:title,source:'mercadolivre-daily-agent',observedAt},
    url:{value:permalink,source:'mercadolivre-daily-agent',observedAt},
    price:Number.isFinite(price) && price>0 ? {value:price,source:'mercadolivre-daily-agent',observedAt} : undefined,
    currency:{value:String(item.currency_id || 'BRL'),source:'mercadolivre-daily-agent',observedAt},
    sellerName:item.seller?.nickname ? {value:String(item.seller.nickname),source:'mercadolivre-daily-agent',observedAt} : undefined,
    listingVerified:true,
    soldQuantity:typeof soldQuantity==='number' ? {value:soldQuantity,source:'mercadolivre-daily-agent',observedAt} : undefined,
    availableQuantity:typeof quantity==='number' ? {value:quantity,source:'mercadolivre-daily-agent',observedAt} : undefined,
    availability:{value:active && typeof quantity==='number' && quantity>0 ? 'available' : 'unavailable',source:'mercadolivre-daily-agent',observedAt},
    imageUrl:image ? {value:image,source:'mercadolivre-daily-agent',observedAt} : undefined,
    assetRights:'UNKNOWN',
  };
}

async function dailyBulkItems(ids,accessToken){
  const unique=[...new Set(ids.filter(Boolean))].slice(0,20);
  if(!unique.length) return [];
  const fields=['body.id','body.title','body.permalink','body.price','body.currency_id','body.available_quantity','body.sold_quantity','body.thumbnail','body.status'].join(',');
  const payload=await meliMaybeGet('/items/bulk?ids='+encodeURIComponent(unique.join(','))+'&attributes='+encodeURIComponent(fields),accessToken);
  if(!Array.isArray(payload)) return [];
  return payload.filter((row)=>row?.status_code===200 && row?.body).map((row)=>mapDailyItem(row.body)).filter(Boolean);
}

async function resolvePurchasableCatalogProduct(candidate,detail,accessToken){
  const base={...candidate,...(detail || {})};
  if(base?.buy_box_winner?.item_id) return base;

  const directChildIds=Array.isArray(base?.children_ids) ? base.children_ids.filter(Boolean).slice(0,2) : [];
  for(const childId of directChildIds){
    const child=await meliMaybeGet('/products/'+encodeURIComponent(String(childId)),accessToken);
    if(child?.buy_box_winner?.item_id) return child;
  }

  const parentId=String(base?.id || candidate?.id || '').trim();
  if(!parentId) return null;
  const childSearch=await meliMaybeGet(
    '/products/search?status=active&site_id=MLB&parent_product_id='+encodeURIComponent(parentId)+'&limit=4',
    accessToken,
  );
  const childCandidates=Array.isArray(childSearch?.results) ? childSearch.results.slice(0,4) : [];
  for(const childCandidate of childCandidates){
    const childId=String(childCandidate?.id || '').trim();
    if(!childId) continue;
    const child=await meliMaybeGet('/products/'+encodeURIComponent(childId),accessToken);
    if(child?.buy_box_winner?.item_id) return child;
  }

  return null;
}

function mapCatalogResearchProduct(product,candidate,query){
  const catalogId=String(product?.id || candidate?.id || '').trim();
  const title=String(product?.name || product?.family_name || candidate?.name || query).trim();
  if(!catalogId || !title) return null;
  const observedAt=new Date().toISOString();
  const pictures=Array.isArray(product?.pictures) && product.pictures.length ? product.pictures : candidate?.pictures;
  const picture=Array.isArray(pictures) ? pictures[0] : null;
  const image=String(picture?.secure_url || picture?.url || picture || '').replace(/^http:/,'https:');
  const url=String(product?.permalink || candidate?.permalink || 'https://www.mercadolivre.com.br/p/'+encodeURIComponent(catalogId));
  return {
    productId:'meli:catalog:'+catalogId,
    organizationId:ORG_ID,
    marketplace:'MELI',
    externalId:'catalog:'+catalogId,
    catalogProductId:catalogId,
    listingVerified:false,
    title:{value:title,source:'mercadolivre-catalog-research',observedAt},
    url:{value:url,source:'mercadolivre-catalog-research',observedAt},
    currency:{value:'BRL',source:'mercadolivre-catalog-research',observedAt},
    availability:{value:'unknown',source:'mercadolivre-catalog-research',observedAt},
    imageUrl:image ? {value:image,source:'mercadolivre-catalog-research',observedAt} : undefined,
    assetRights:'UNKNOWN',
  };
}

async function dailySearch(query,accessToken,limit=20){
  const safeLimit=Math.max(1,Math.min(Number(limit || 20),20));
  const catalog=await meliMaybeGet('/products/search?status=active&site_id=MLB&q='+encodeURIComponent(query)+'&limit='+safeLimit,accessToken);
  const candidates=(Array.isArray(catalog?.results) ? catalog.results : []).map((item)=>({
    id:String(item.id || ''),
    name:String(item.name || item.family_name || ''),
    status:String(item.status || ''),
    permalink:String(item.permalink || ''),
    pictures:Array.isArray(item.pictures) ? item.pictures : [],
    children_ids:Array.isArray(item.children_ids) ? item.children_ids : [],
    buy_box_winner:item.buy_box_winner || null,
  })).filter((item)=>item.id).slice(0,safeLimit);

  const details=await Promise.all(candidates.map((candidate)=>
    meliMaybeGet('/products/'+encodeURIComponent(candidate.id),accessToken)
  ));
  const resolved=await Promise.all(candidates.map((candidate,index)=>
    resolvePurchasableCatalogProduct(candidate,details[index],accessToken)
  ));

  const winnerIds=[...new Set(resolved.map((product)=>
    String(product?.buy_box_winner?.item_id || '').trim()
  ).filter(Boolean))].slice(0,20);
  const liveItems=await dailyBulkItems(winnerIds,accessToken);
  const liveById=new Map(liveItems.map((item)=>[item.externalId,item]));

  return candidates.flatMap((candidate,index)=>{
    const product=resolved[index];
    const itemId=String(product?.buy_box_winner?.item_id || '').trim();
    const catalogId=String(product?.id || candidate.id || '').trim();
    const live=itemId ? liveById.get(itemId) : undefined;

    if(product && itemId && catalogId){
      const winner=product.buy_box_winner || {};
      const observedAt=new Date().toISOString();
      const soldQuantity=typeof winner.sold_quantity==='number'
        ? winner.sold_quantity
        : live?.soldQuantity?.value;
      const availableQuantity=typeof winner.available_quantity==='number'
        ? winner.available_quantity
        : live?.availableQuantity?.value;
      const title=String(product.name || product.family_name || live?.title?.value || candidate.name || query).trim();
      const url=String(product.permalink || candidate.permalink || live?.url?.value || '').trim();
      const pictures=Array.isArray(product.pictures) && product.pictures.length ? product.pictures : candidate.pictures;
      const picture=Array.isArray(pictures) ? pictures[0] : null;
      const image=String(
        picture?.secure_url ||
        picture?.url ||
        picture ||
        live?.imageUrl?.value ||
        '',
      ).replace(/^http:/,'https:');
      const price=typeof winner.price==='number' ? winner.price : live?.price?.value;
      const currency=String(winner.currency_id || live?.currency?.value || 'BRL');

      if(title && url && image){
        return [{
          ...(live || {}),
          productId:'meli:'+itemId,
          organizationId:ORG_ID,
          marketplace:'MELI',
          externalId:itemId,
          catalogProductId:catalogId,
          listingVerified:true,
          title:{value:title,source:'mercadolivre-catalog-api',observedAt},
          url:{value:url,source:'mercadolivre-catalog-api',observedAt},
          price:typeof price==='number' && price>0
            ? {value:price,source:typeof winner.price==='number' ? 'mercadolivre-buy-box' : 'mercadolivre-daily-agent',observedAt}
            : undefined,
          currency:{value:currency,source:winner.currency_id ? 'mercadolivre-buy-box' : 'mercadolivre-daily-agent',observedAt},
          ...(typeof soldQuantity==='number' ? {
            soldQuantity:{value:soldQuantity,source:typeof winner.sold_quantity==='number' ? 'mercadolivre-buy-box' : 'mercadolivre-daily-agent',observedAt},
          } : {}),
          ...(typeof availableQuantity==='number' ? {
            availableQuantity:{value:availableQuantity,source:typeof winner.available_quantity==='number' ? 'mercadolivre-buy-box' : 'mercadolivre-daily-agent',observedAt},
          } : {}),
          availability:{
            value:typeof availableQuantity==='number' ? (availableQuantity>0 ? 'available' : 'unavailable') : 'available',
            source:typeof availableQuantity==='number'
              ? (typeof winner.available_quantity==='number' ? 'mercadolivre-buy-box' : 'mercadolivre-daily-agent')
              : 'mercadolivre-catalog-buy-box',
            observedAt,
          },
          imageUrl:{value:image,source:'mercadolivre-catalog-api',observedAt},
          assetRights:live?.assetRights || 'UNKNOWN',
        }];
      }
    }

    const research=mapCatalogResearchProduct(details[index] || candidate,candidate,query);
    return research ? [research] : [];
  });
}

async function resolveHighlightSignalProducts(signal,accessToken){
  const type=String(signal?.entityType || '').toUpperCase();
  const id=String(signal?.entityId || signal?.productExternalId || '').trim();
  if(!id) return [];

  if(type==='ITEM' || /^MLB\d+$/.test(id) && !type){
    return dailyBulkItems([id],accessToken);
  }

  if(type==='PRODUCT'){
    const detail=await meliMaybeGet('/products/'+encodeURIComponent(id),accessToken);
    if(!detail) return [];
    const resolved=await resolvePurchasableCatalogProduct({id,name:detail.name || ''},detail,accessToken);
    const itemId=String(resolved?.buy_box_winner?.item_id || '').trim();
    return itemId ? dailyBulkItems([itemId],accessToken) : [];
  }

  if(type==='USER_PRODUCT' || /^MLBU\d+$/.test(id)){
    const up=await meliMaybeGet('/user-products/'+encodeURIComponent(id),accessToken);
    const sellerId=String(up?.user_id || '').trim();
    if(!sellerId) return [];
    const search=await meliMaybeGet(
      '/users/'+encodeURIComponent(sellerId)+'/items/search?user_product_id='+encodeURIComponent(id)+'&limit=8',
      accessToken,
    );
    const itemIds=Array.isArray(search?.results) ? search.results.map(String).filter(Boolean).slice(0,8) : [];
    return dailyBulkItems(itemIds,accessToken);
  }

  return [];
}

function dailyOpportunity(product,keyword,signals,rank){
  const scored=dailyScore(product,keyword,signals);
  const createdAt=new Date().toISOString();
  const expiresAt=new Date(Date.now()+24*60*60_000).toISOString();
  const suffix=String(product.externalId).replace(/[^a-zA-Z0-9]/g,'').slice(-6).toUpperCase() || '000001';
  const key=dailyNormalize(keyword).split(' ').filter(Boolean).slice(0,3).join('_').slice(0,32).toUpperCase() || 'PRODUTO';
  return {
    id:'opp:MELI:'+product.externalId,
    organizationId:ORG_ID,
    keyword,
    product,
    score:{score:scored.score,confidence:scored.confidence,dimensions:scored.dimensions,reasons:scored.reasons,risks:scored.risks,version:'2.0'},
    confidence:dailyDataConfidence(product),
    cluster:[...dailyTokens(keyword)].slice(0,12),
    commercialSignals:scored.relevant,
    rankingReasons:['Ordenação consolidada pelo NestScore 2.0',...scored.relevant.slice(0,3).map((signal)=>signal.rank ? signal.label+' · #'+signal.rank : signal.label),...scored.reasons.slice(0,2)],
    trackingCode:'NA_ML_'+key+'_'+suffix,
    createdAt,
    expiresAt,
    lastRankedAt:createdAt,
    lifecycleStatus:'ACTIVE',
    rank,
  };
}

function dailyCampaign(opportunity){
  const safeId=String(opportunity.product.externalId).replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,80);
  const id='agent-meli-'+safeId;
  const now=new Date().toISOString();
  return {
    id,
    organizationId:ORG_ID,
    status:'READY',
    marketplace:'MELI',
    score:opportunity.score,
    rankingContext:{rank:opportunity.rank,trackingCode:opportunity.trackingCode,evidence:opportunity.rankingReasons,signalSources:(opportunity.commercialSignals || []).map((signal)=>signal.source)},
    currentVersion:{
      id:id+'-v1',
      campaignId:id,
      version:1,
      createdAt:now,
      reason:'daily agent autonomous opportunity',
      product:opportunity.product,
      narrative:{
        headline:'Uma ideia prática para '+opportunity.keyword.toLowerCase(),
        subheadline:'Curadoria inteligente para uma casa mais funcional.',
        pinterestTitle:opportunity.keyword+': uma solução prática para o dia a dia',
        description:'Uma curadoria do Achados do Nest baseada em sinais reais do marketplace. Antes de publicar, confirme o link afiliado e revise a imagem final.',
        disclosure:'Conteúdo com link de afiliado. Posso receber comissão por compras qualificadas, sem custo adicional para você.',
        altText:'Produto selecionado para '+opportunity.keyword.toLowerCase()+', apresentado em composição editorial para Pinterest.',
        cta:'Ver produto',
      },
      boardName:dailyBoard(opportunity.keyword),
      keyword:opportunity.keyword,
      template:'editorial-premium',
    },
    history:[],
  };
}

async function persistDailyCampaign(campaign){
  await writeDoc(dailyAgentCampaigns+'/'+encodeURIComponent(campaign.id),campaign);
  await writeDoc(dailyAgentVersions+'/'+encodeURIComponent(campaign.currentVersion.id),{
    ...campaign.currentVersion,
    organizationId:campaign.organizationId,
    marketplace:campaign.marketplace,
    status:campaign.status,
  });
}

async function runDailyAgent(accessToken,signals,observedAt){
  const report={
    organizationId:ORG_ID,startedAt:new Date().toISOString(),completedAt:observedAt,source:'github-actions',status:'RUNNING',
    checked:0,changed:0,blocked:0,skipped:0,errors:0,signals:signals.length,
    opportunitiesAnalyzed:0,opportunitiesPersisted:0,opportunitiesExpired:0,campaignsRevalidated:0,verifiedBestSellerProducts:0,campaignsCreated:0,campaignsWaiting:0,fallbackQueries:0,
    categoriesCovered:0,themesCovered:0,topOpportunityScore:0,topOpportunityKeyword:'',queueMin:3,queueTarget:5,queueState:'STABLE',nextExpectedAt:'',messages:[],
  };
  const docs=await listDocs(dailyAgentCampaigns);
  const campaigns=docs.map(decodeFsDoc).filter((campaign)=>campaign?.organizationId===ORG_ID);

  try{
    const opportunityDocs=await listDocs(dailyAgentOpportunities);
    const nowMs=Date.now();
    for(const doc of opportunityDocs){
      const opportunity=decodeFsDoc(doc);
      const expiresAt=new Date(String(opportunity?.expiresAt || '')).getTime();
      if(
        opportunity?.organizationId===ORG_ID &&
        opportunity?.lifecycleStatus!=='EXPIRED' &&
        Number.isFinite(expiresAt) &&
        expiresAt<=nowMs
      ){
        const docId=String(doc.name || '').split('/').pop();
        if(!docId) continue;
        await writeDoc(dailyAgentOpportunities+'/'+encodeURIComponent(docId),{
          ...opportunity,
          lifecycleStatus:'EXPIRED',
          expiredAt:new Date().toISOString(),
        });
        report.opportunitiesExpired+=1;
      }
    }
  }catch(error){
    report.errors+=1;
    console.warn('DAILY_AGENT_OPPORTUNITY_EXPIRY_ERROR',error instanceof Error ? error.message : String(error));
  }

  const cutoff=Date.now()-60*60_000;
  const observed=(product)=>{
    const values=[product?.title?.observedAt,product?.url?.observedAt,product?.price?.observedAt,product?.availability?.observedAt].filter(Boolean);
    const times=values.map((value)=>new Date(value).getTime()).filter(Number.isFinite);
    return times.length ? Math.min(...times) : 0;
  };

  for(const campaign of campaigns.filter((item)=>item?.status==='READY' && item?.marketplace==='MELI' && item?.currentVersion?.product && observed(item.currentVersion.product)<=cutoff).slice(0,20)){
    try{
      const previous=campaign.currentVersion.product;
      if(previous.listingVerified===false && !previous.catalogProductId){
        if(campaign.status==='READY'){
          const blocked={
            ...campaign,
            status:'BLOCKED',
          };
          await persistDailyCampaign(blocked);
          report.blocked+=1;
          report.messages.push(campaign.currentVersion.keyword+': removida da fila porque o produto não possui item nem catálogo oficial verificável.');
        }else{
          report.skipped+=1;
        }
        continue;
      }
      let fresh=(await dailyBulkItems([previous.externalId],accessToken))[0];
      if(
        !fresh ||
        typeof fresh.availableQuantity?.value!=='number' ||
        typeof fresh.soldQuantity?.value!=='number'
      ){
        const fallback=await dailySearch(previous.title?.value || campaign.currentVersion.keyword,accessToken,8);
        fresh=
          fallback.find((item)=>item.externalId===previous.externalId) ||
          fallback.find((item)=>previous.catalogProductId && item.catalogProductId===previous.catalogProductId) ||
          fallback.find((item)=>dailySimilarity(item.title.value,previous.title?.value || '')>=0.72) ||
          fresh;
      }
      if(!fresh || fresh.listingVerified===false){
        const sourceText=[
          previous?.title?.source,
          previous?.url?.source,
          previous?.imageUrl?.source,
        ].filter(Boolean).join(' ').toLowerCase();
        const looksLikeLegacyCatalog=
          previous.listingVerified===undefined &&
          (sourceText.includes('catalog') || String(previous.externalId || '').startsWith('catalog:'));
        if(looksLikeLegacyCatalog){
          const previousVersion=campaign.currentVersion;
          const versionNumber=Number(previousVersion.version || 0)+1;
          const observedAt=new Date().toISOString();
          const migratedProduct={
            ...previous,
            listingVerified:false,
            availability:{
              ...previous.availability,
              value:'unknown',
              source:'daily-agent-catalog-safety-migration',
              observedAt,
            },
          };
          const nextVersion={
            ...previousVersion,
            id:campaign.id+'-v'+versionNumber+'-catalog-safety',
            parentVersionId:previousVersion.id,
            version:versionNumber,
            createdAt:observedAt,
            reason:'daily agent catalog safety migration',
            product:migratedProduct,
          };
          const history=Array.isArray(campaign.history) ? campaign.history : [];
          const migrated={
            ...campaign,
            // A catalog awaiting seller/item verification must leave the READY queue.
            status:'BLOCKED',
            currentVersion:nextVersion,
            history:history.some((item)=>item?.id===previousVersion.id) ? history : [...history,previousVersion],
          };
          await persistDailyCampaign(migrated);
          report.changed+=1;
          report.messages.push(campaign.currentVersion.keyword+': campanha de catálogo legado marcada para confirmação manual antes da publicação.');
          continue;
        }
        if(previous.listingVerified===false){
          await writeDoc(dailyAgentCampaigns+'/'+encodeURIComponent(campaign.id),{
            ...campaign,
            status:'BLOCKED',
            blockedReason:'LISTING_NOT_VERIFIED',
          });
          report.blocked+=1;
          report.messages.push(campaign.currentVersion.keyword+': listagem não confirmada; remover da fila READY.');
        }else{
          report.skipped+=1;
        }
        continue;
      }
      fresh.listingVerified=true;
      report.checked+=1;
      report.campaignsRevalidated+=1;
      fresh.affiliateUrl=previous.affiliateUrl;
      fresh.assetRights=previous.assetRights || 'UNKNOWN';
      if(!isReadyCampaignOffer(fresh,MIN_VALIDATED_SALES)){
        await writeDoc(dailyAgentCampaigns+'/'+encodeURIComponent(campaign.id),{
          ...campaign,
          status:'BLOCKED',
          blockedReason:typeof fresh.soldQuantity?.value==='number' ? 'COMMERCIAL_GATE_FAILED' : 'UNKNOWN_SALES',
        });
        report.blocked+=1;
        report.messages.push(campaign.currentVersion.keyword+': oferta não atende à prova comercial; requer nova verificação.');
        continue;
      }
      const changed=previous.title?.value!==fresh.title?.value || previous.url?.value!==fresh.url?.value || previous.price?.value!==fresh.price?.value || previous.availability?.value!==fresh.availability?.value;
      if(!changed){report.skipped+=1;continue;}
      const scored=dailyScore(fresh,campaign.currentVersion.keyword,signals);
      const score={score:scored.score,confidence:scored.confidence,dimensions:scored.dimensions,reasons:scored.reasons,risks:scored.risks,version:'2.0'};
      const previousVersion=campaign.currentVersion;
      const versionNumber=Number(previousVersion.version || 0)+1;
      const nextVersion={...previousVersion,id:campaign.id+'-v'+versionNumber+'-agent',parentVersionId:previousVersion.id,version:versionNumber,createdAt:new Date().toISOString(),reason:'daily agent refresh',product:fresh};
      const history=Array.isArray(campaign.history) ? campaign.history : [];
      const versioned={...campaign,score,currentVersion:nextVersion,history:history.some((item)=>item?.id===previousVersion.id) ? history : [...history,previousVersion]};
      await persistDailyCampaign(versioned);
      report.changed+=1;
    }catch(error){
      report.errors+=1;
      console.warn('DAILY_AGENT_REFRESH_ERROR',campaign.id,error instanceof Error ? error.message : String(error));
    }
  }

  const queries=[];
  for(const signal of signals){
    const keyword=typeof signal?.keyword==='string' ? signal.keyword.trim() : '';
    if(keyword && homeRelevant(keyword) && !queries.some((existing)=>dailySimilarity(existing,keyword)>=0.72)) queries.push(keyword);
    if(queries.length>=6) break;
  }
  const fallbacks=['organizador cozinha pequena','organizador banheiro pequeno','organizador lavanderia pequena','organizador armario cozinha','produto que facilita a rotina da casa','organizacao apartamento pequeno'];
  for(const query of fallbacks){
    if(queries.length>=6) break;
    if(!queries.some((existing)=>dailySimilarity(existing,query)>=0.72)){queries.push(query);report.fallbackQueries+=1;}
  }

  const existingIds=new Set(campaigns.map((campaign)=>campaign?.currentVersion?.product?.externalId).filter(Boolean));
  const candidates=new Map();

  const highlightCandidates=signals
    .filter((signal)=>signal?.source==='MELI_BEST_SELLER' && signal?.entityId)
    .filter((signal,index,all)=>all.findIndex((item)=>item.entityType===signal.entityType && item.entityId===signal.entityId)===index)
    .slice(0,36);

  const typeCounts=highlightCandidates.reduce((acc,signal)=>{
    const key=String(signal.entityType || 'UNKNOWN');
    acc[key]=(acc[key] || 0)+1;
    return acc;
  },{});
  console.log('DAILY_AGENT_HIGHLIGHT_TYPES',JSON.stringify(typeCounts));

  for(const signal of highlightCandidates){
    try{
      const products=await resolveHighlightSignalProducts(signal,accessToken);
      report.checked+=products.length;
      report.verifiedBestSellerProducts+=products.length;
      for(const product of products){
        product.listingVerified=true;
        if(product.availability.value!=='available' || !product.imageUrl?.value || !product.url?.value) continue;
        const keyword=String(signal?.keyword || product.title.value || '').trim();
        if(!keyword) continue;
        const opportunity=dailyOpportunity(product,keyword,signals,0);
        const current=candidates.get(product.externalId);
        if(!current || opportunity.score.score>current.score.score) candidates.set(product.externalId,opportunity);
      }
    }catch(error){
      report.errors+=1;
      console.warn('DAILY_AGENT_BESTSELLER_RESOLVE_ERROR',signal.entityType,signal.entityId,error instanceof Error ? error.message : String(error));
    }
  }

  const shouldRunCatalogDiscovery=candidates.size<24;
  for(const query of shouldRunCatalogDiscovery ? queries : []){
    try{
      const products=await dailySearch(query,accessToken);
      report.checked+=products.length;
      console.log('DAILY_AGENT_QUERY',JSON.stringify({query,total:products.length,withImage:products.filter((item)=>Boolean(item.imageUrl?.value)).length,withPrice:products.filter((item)=>Boolean(item.price?.value)).length,available:products.filter((item)=>item.availability?.value==='available').length}));
      for(const product of products){
        if(product.availability.value==='unavailable' || !product.imageUrl?.value || !product.url?.value) continue;
        const opportunity=dailyOpportunity(product,query,signals,0);
        const current=candidates.get(product.externalId);
        if(!current || opportunity.score.score>current.score.score) candidates.set(product.externalId,opportunity);
      }
    }catch(error){
      report.errors+=1;
      console.warn('DAILY_AGENT_SEARCH_ERROR',query,error instanceof Error ? error.message : String(error));
    }
  }

  const ranked=[];
  for(const opportunity of [...candidates.values()].sort((a,b)=>b.score.score-a.score.score || b.confidence-a.confidence)){
    if(ranked.some((item)=>dailySimilarity(item.product.title.value,opportunity.product.title.value)>=0.72)) continue;
    opportunity.rank=ranked.length+1;
    ranked.push(opportunity);
  }
  report.opportunitiesAnalyzed=ranked.length;

  const diversified=[];
  const perTheme=new Map();
  for(const opportunity of ranked){
    const theme=dailyTheme(opportunity);
    const used=perTheme.get(theme) || 0;
    if(used>=2) continue;
    perTheme.set(theme,used+1);
    diversified.push(opportunity);
    if(diversified.length>=12) break;
  }
  if(diversified.length<12){
    for(const opportunity of ranked){
      if(diversified.some((item)=>item.product.externalId===opportunity.product.externalId)) continue;
      diversified.push(opportunity);
      if(diversified.length>=12) break;
    }
  }

  report.categoriesCovered=new Set(diversified.map((item)=>dailyBoard(item.keyword))).size;
  report.themesCovered=new Set(diversified.map((item)=>dailyTheme(item))).size;
  report.topOpportunityScore=ranked[0]?.score?.score || 0;
  report.topOpportunityKeyword=ranked[0]?.keyword || '';

  for(const opportunity of diversified){
    try{
      const id=opportunity.id.replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,180);
      await writeDoc(dailyAgentOpportunities+'/'+encodeURIComponent(id),opportunity);
      report.opportunitiesPersisted+=1;
    }catch(error){
      report.errors+=1;
      console.warn('DAILY_AGENT_OPPORTUNITY_WRITE_ERROR',opportunity.id,error instanceof Error ? error.message : String(error));
    }
  }

  const originalReady=campaigns.filter((campaign)=>campaign.status==='READY').length;
  const readyBeforeCreation=Math.max(0,originalReady-report.blocked);
  const queueMin=3;
  const queueTarget=5;
  report.queueMin=queueMin;
  report.queueTarget=queueTarget;
  const creationSlots=Math.max(0,queueTarget-readyBeforeCreation);
  const existingTitles=campaigns.map((campaign)=>campaign?.currentVersion?.product?.title?.value).filter(Boolean);
  const eligible=ranked.filter((item)=>{
    // Unresolved catalogs and UNKNOWN_SALES remain research opportunities,
    // never READY campaigns for affiliate publication.
    return item.score.score>=58 &&
    isReadyCampaignOffer(item.product, MIN_VALIDATED_SALES) &&
    !existingIds.has(item.product.externalId) &&
    !existingTitles.some((title)=>dailySimilarity(title,item.product.title.value)>=0.72);
  }).sort((a,b)=>
    Number(b.product.listingVerified===true)-Number(a.product.listingVerified===true) ||
    b.score.score-a.score.score
  );
  const selected=[];
  if(creationSlots>0){
    const selectedThemes=new Set();
    for(const opportunity of eligible){
      const theme=dailyTheme(opportunity);
      if(selectedThemes.has(theme)) continue;
      selectedThemes.add(theme);
      selected.push(opportunity);
      if(selected.length>=creationSlots) break;
    }
    if(selected.length<creationSlots){
      for(const opportunity of eligible){
        if(selected.some((item)=>item.product.externalId===opportunity.product.externalId)) continue;
        if(selected.some((item)=>dailySimilarity(item.product.title.value,opportunity.product.title.value)>=0.72)) continue;
        selected.push(opportunity);
        if(selected.length>=creationSlots) break;
      }
    }
  }

  for(const opportunity of selected){
    try{
      const campaign=dailyCampaign(opportunity);
      const exists=await readDoc(dailyAgentCampaigns+'/'+encodeURIComponent(campaign.id));
      if(exists){report.skipped+=1;continue;}
      await persistDailyCampaign(campaign);
      existingIds.add(opportunity.product.externalId);
      report.campaignsCreated+=1;
      report.messages.push(opportunity.keyword+': campanha preparada automaticamente com NestScore '+opportunity.score.score+'.');
    }catch(error){
      report.errors+=1;
      console.warn('DAILY_AGENT_CAMPAIGN_WRITE_ERROR',opportunity.id,error instanceof Error ? error.message : String(error));
    }
  }

  report.campaignsWaiting=readyBeforeCreation+report.campaignsCreated;
  if(readyBeforeCreation>=queueTarget){
    report.queueState='FULL';
    report.messages.push('Fila de revisão já está abastecida; nenhuma campanha nova era necessária neste ciclo.');
  }else if(report.campaignsCreated>0){
    report.queueState='REFILLED';
    report.messages.push('Fila de revisão foi reabastecida automaticamente até o limite inteligente.');
  }else if(creationSlots>0 && eligible.length===0){
    report.queueState='NO_ELIGIBLE';
    report.messages.push('Nenhuma nova oportunidade passou pelo corte de qualidade e duplicidade neste ciclo.');
  }else{
    report.queueState='STABLE';
  }

  report.completedAt=new Date().toISOString();
  report.nextExpectedAt=new Date(new Date(report.completedAt).getTime()+DAILY_AGENT_INTERVAL_MS).toISOString();
  const discoveryGap=report.signals>0 && report.opportunitiesAnalyzed===0;
  if(discoveryGap){
    report.messages.push('Os sinais chegaram, mas nenhum produto verificável virou oportunidade; o ciclo foi marcado para atenção.');
  }
  report.status=report.errors>0 || discoveryGap ? 'PARTIAL' : 'SUCCESS';
  report.messages.unshift(
    'Ciclo concluído: '+report.checked+' produtos verificados, '+report.opportunitiesAnalyzed+
    ' oportunidades analisadas, '+report.campaignsCreated+' campanhas preparadas e '+
    report.campaignsWaiting+' aguardando decisão.'
  );
  const runId='run-'+report.completedAt.replace(/[^0-9]/g,'').slice(0,14);
  await writeDoc(dailyAgentRuns+'/'+runId,report);
  await writeDoc(dailyAgentJobs+'/daily-agent',{
    organizationId:ORG_ID,
    job:'daily-agent',
    status:report.status,
    lastRunAt:report.completedAt,
    nextExpectedAt:report.nextExpectedAt,
    checked:report.checked,
    opportunitiesAnalyzed:report.opportunitiesAnalyzed,
    campaignsCreated:report.campaignsCreated,
    campaignsWaiting:report.campaignsWaiting,
    errors:report.errors,
  });
  return report;
}


async function main(){
  required('NESTAFFILIATE_SIGNAL_ORG_ID',ORG_ID);
  required('GOOGLE_OAUTH_ACCESS_TOKEN',GCP_TOKEN);
  required('MELI_CLIENT_ID',CLIENT_ID);
  required('MELI_CLIENT_SECRET',CLIENT_SECRET);

  const stored=await readSecretState();
  const storedRefresh=fromFsString(stored,'refreshToken');
  const refreshToken=storedRefresh || INITIAL_REFRESH_TOKEN;
  required('MELI_REFRESH_TOKEN_STATE',refreshToken);

  const token=await refreshMeliToken(refreshToken);
  required('MELI_ACCESS_TOKEN_RESPONSE',token.access_token);
  required('MELI_REFRESH_TOKEN_RESPONSE',token.refresh_token);

  const now=new Date().toISOString();
  const expiresIn=Math.max(60,Number(token.expires_in || 0));
  const accessTokenExpiresAt=new Date(Date.now()+expiresIn*1000).toISOString();

  await writeDoc(secretDoc,{
    organizationId:ORG_ID,
    provider:'MELI',
    refreshToken:String(token.refresh_token),
    accessToken:String(token.access_token),
    accessTokenExpiresAt,
    rotatedAt:now,
  });

  const trends=await meliGet('/trends/MLB',token.access_token);
  if(!Array.isArray(trends)) throw new Error('MELI_TRENDS_INVALID_RESPONSE');

  const searchProbeCount=0;

  const trendSignals=trends
    .map((entry,index)=>trendSignal(entry,index,now))
    .filter((signal)=>homeRelevant(signal.keyword));

  const categories=await inferRelevantCategories(trends,token.access_token);
  const categoryTrendSignals=[];
  const highlightSignals=[];
  for(const category of categories){
    try{
      const categoryTrends=await meliGet(`/trends/MLB/${encodeURIComponent(category.id)}`,token.access_token);
      if(Array.isArray(categoryTrends)){
        categoryTrends.slice(0,12).forEach((entry,index)=>{
          const base=trendSignal(entry,index,now);
          categoryTrendSignals.push({
            ...base,
            id:`${base.id}-${category.id}`,
            label:`${base.label} · ${category.label}`,
            evidence:[...base.evidence,`categoria:${category.label}`,`seed:${category.seed}`],
          });
        });
      }
    }catch(error){
      console.warn('CATEGORY_TRENDS_SKIP',category.id,error instanceof Error ? error.message : String(error));
    }

    try{
      const highlights=await meliGet(`/highlights/MLB/category/${encodeURIComponent(category.id)}`,token.access_token);
      for(const entry of highlights?.content || []){
        highlightSignals.push(highlightSignal(entry,category,now));
      }
    }catch(error){
      console.warn('HIGHLIGHT_SKIP',category.id,error instanceof Error ? error.message : String(error));
    }
  }

  const all=[...trendSignals,...categoryTrendSignals,...highlightSignals];
  for(const signal of all){
    const docId=signal.id.replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,180);
    await writeDoc(`${signalBase}/${docId}`,{
      ...signal,
      organizationId:ORG_ID,
      marketplace:'MELI',
      syncSource:'github-actions',
    });
  }

  await writeDoc(connectionDoc,{
    organizationId:ORG_ID,
    provider:'MELI',
    status:'connected',
    capability:'market-signals',
    lastSyncedAt:now,
    accessTokenExpiresAt,
    searchProbeCount,
    trendSignals:trendSignals.length,
    categoryTrendSignals:categoryTrendSignals.length,
    highlightSignals:highlightSignals.length,
    categories:categories.map((category)=>category.id),
  });

  const dailyAgent=await runDailyAgent(token.access_token,all,now);

  console.log(JSON.stringify({
    ok:true,
    trends:trendSignals.length,
    categoryTrends:categoryTrendSignals.length,
    highlights:highlightSignals.length,
    categories,
    searchProbeCount,
    accessTokenExpiresAt,
    observedAt:now,
    dailyAgent,
  }));
}

main().catch(async(error)=>{
  console.error(error instanceof Error ? error.stack || error.message : error);
  try{
    if(ORG_ID && GCP_TOKEN){
      const completedAt=new Date().toISOString();
      const nextExpectedAt=new Date(Date.now()+DAILY_AGENT_INTERVAL_MS).toISOString();
      const failureReport={
        organizationId:ORG_ID,
        startedAt:completedAt,
        completedAt,
        source:'github-actions',
        status:'FAILED',
        checked:0,changed:0,blocked:0,skipped:0,errors:1,signals:0,
        opportunitiesAnalyzed:0,opportunitiesPersisted:0,opportunitiesExpired:0,campaignsRevalidated:0,verifiedBestSellerProducts:0,
        campaignsCreated:0,campaignsWaiting:0,fallbackQueries:0,categoriesCovered:0,themesCovered:0,
        topOpportunityScore:0,topOpportunityKeyword:'',queueMin:3,queueTarget:5,queueState:'STABLE',
        nextExpectedAt,
        messages:['O ciclo em nuvem falhou antes de concluir. Consulte o GitHub Actions; nenhuma publicação automática foi executada.'],
      };
      const runId='failure-'+completedAt.replace(/[^0-9]/g,'').slice(0,14);
      await writeDoc(dailyAgentRuns+'/'+runId,failureReport);
      await writeDoc(dailyAgentJobs+'/daily-agent',{
        organizationId:ORG_ID,
        job:'daily-agent',
        status:'FAILED',
        lastRunAt:completedAt,
        nextExpectedAt,
        errors:1,
      });
    }
  }catch(reportError){
    console.warn('DAILY_AGENT_FAILURE_REPORT_ERROR',reportError instanceof Error ? reportError.message : String(reportError));
  }
  process.exitCode=1;
});
