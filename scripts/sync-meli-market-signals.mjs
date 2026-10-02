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

async function meliGet(path,accessToken){
  const response=await fetch(`https://api.mercadolibre.com${path}`,{
    headers:{Authorization:`Bearer ${accessToken}`},
  });
  if(!response.ok) throw new Error(`MELI_GET_${response.status}:${path}`);
  return response.json();
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
    productExternalId:exactItem ? entry.id : undefined,
  };
}

async function inferRelevantCategories(trends,accessToken){
  const selected=[];
  const seen=new Set();
  const sample=trends.slice(0,30);
  for(const trend of sample){
    if(!homeRelevant(trend.keyword)) continue;
    try{
      const search=await meliGet(`/sites/MLB/search?q=${encodeURIComponent(trend.keyword)}&limit=1`,accessToken);
      const categoryId=search?.results?.[0]?.category_id;
      if(!categoryId || seen.has(categoryId)) continue;
      const category=await meliGet(`/categories/${encodeURIComponent(categoryId)}`,accessToken);
      const path=(category?.path_from_root || []).map((item)=>item.name).join(' ');
      if(!homeRelevant(path || category?.name || trend.keyword)) continue;
      const children=Array.isArray(category?.children_categories) ? category.children_categories : [];
      if(children.length) continue;
      seen.add(categoryId);
      selected.push({id:categoryId,label:category?.name || trend.keyword});
      if(selected.length>=8) break;
    }catch(error){
      console.warn('CATEGORY_DISCOVERY_SKIP',trend.keyword,error instanceof Error ? error.message : String(error));
    }
  }
  return selected;
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
  await writeDoc(secretDoc,{
    organizationId:ORG_ID,
    provider:'MELI',
    refreshToken:String(token.refresh_token),
    rotatedAt:now,
  });

  const trends=await meliGet('/trends/MLB',token.access_token);
  if(!Array.isArray(trends)) throw new Error('MELI_TRENDS_INVALID_RESPONSE');

  const trendSignals=trends
    .map((entry,index)=>trendSignal(entry,index,now))
    .filter((signal)=>homeRelevant(signal.keyword));

  const categories=await inferRelevantCategories(trends,token.access_token);
  const highlightSignals=[];
  for(const category of categories){
    try{
      const highlights=await meliGet(`/highlights/MLB/category/${encodeURIComponent(category.id)}`,token.access_token);
      for(const entry of highlights?.content || []){
        highlightSignals.push(highlightSignal(entry,category,now));
      }
    }catch(error){
      console.warn('HIGHLIGHT_SKIP',category.id,error instanceof Error ? error.message : String(error));
    }
  }

  const all=[...trendSignals,...highlightSignals];
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
    trendSignals:trendSignals.length,
    highlightSignals:highlightSignals.length,
    categories:categories.map((category)=>category.id),
  });

  console.log(JSON.stringify({
    ok:true,
    trends:trendSignals.length,
    highlights:highlightSignals.length,
    categories,
    observedAt:now,
  }));
}

main().catch((error)=>{
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode=1;
});
