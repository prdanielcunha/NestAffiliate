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
      const discovery=await meliGet(`/sites/MLB/domain_discovery/search?limit=3&q=${encodeURIComponent(trend.keyword)}`,accessToken);
      const predicted=Array.isArray(discovery) ? discovery[0] : null;
      const categoryId=predicted?.category_id;
      if(!categoryId || seen.has(categoryId)) continue;
      const category=await meliGet(`/categories/${encodeURIComponent(categoryId)}`,accessToken);
      const path=(category?.path_from_root || []).map((item)=>item.name).join(' ');
      const label=predicted?.category_name || category?.name || trend.keyword;
      if(!homeRelevant(path || label || trend.keyword)) continue;
      seen.add(categoryId);
      selected.push({id:categoryId,label});
      if(selected.length>=8) break;
    }catch(error){
      console.warn('CATEGORY_DISCOVERY_SKIP',trend.keyword,error instanceof Error ? error.message : String(error));
    }
  }
  return selected;
}


const dailyAgentRoot=firestoreBase+'/organizations/'+encodeURIComponent(ORG_ID)+'/products/nestaffiliate';
const dailyAgentCampaigns=dailyAgentRoot+'/campaigns';
const dailyAgentVersions=dailyAgentRoot+'/campaignVersions';
const dailyAgentOpportunities=dailyAgentRoot+'/opportunities';
const dailyAgentRuns=dailyAgentRoot+'/dailyAgentRuns';

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
  const response=await fetch('https://api.mercadolibre.com'+path,{headers:{Authorization:'Bearer '+accessToken,Accept:'application/json'}});
  if(!response.ok) return null;
  return response.json();
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
  const strongest=relevant[0];
  const support=relevant.slice(1,3).reduce((sum,signal)=>sum+(Number(signal.strength||0)*Number(signal.confidence||0)*0.12),0);
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
    availability:{value:active && quantity!==0 ? 'available' : 'unavailable',source:'mercadolivre-daily-agent',observedAt},
    imageUrl:image ? {value:image,source:'mercadolivre-daily-agent',observedAt} : undefined,
    assetRights:'UNKNOWN',
  };
}

async function dailyBulkItems(ids,accessToken){
  const unique=[...new Set(ids.filter(Boolean))].slice(0,20);
  if(!unique.length) return [];
  const fields=['body.id','body.title','body.permalink','body.price','body.currency_id','body.available_quantity','body.thumbnail','body.status'].join(',');
  const payload=await meliMaybeGet('/items/bulk?ids='+encodeURIComponent(unique.join(','))+'&attributes='+encodeURIComponent(fields),accessToken);
  if(!Array.isArray(payload)) return [];
  return payload.filter((row)=>row?.status_code===200 && row?.body).map((row)=>mapDailyItem(row.body)).filter(Boolean);
}

async function dailySearch(query,accessToken){
  const publicPayload=await meliMaybeGet('/sites/MLB/search?q='+encodeURIComponent(query)+'&limit=20',accessToken);
  if(Array.isArray(publicPayload?.results) && publicPayload.results.length){
    return publicPayload.results.map(mapDailyItem).filter(Boolean);
  }
  const catalog=await meliMaybeGet('/products/search?status=active&site_id=MLB&q='+encodeURIComponent(query)+'&limit=20',accessToken);
  const rows=Array.isArray(catalog?.results) ? catalog.results : [];
  const ids=rows.map((row)=>row?.buy_box_winner?.item_id || row?.buy_box_winner?.id || row?.item_id || (/^MLB\d+$/.test(String(row?.id || '')) ? row.id : null)).filter(Boolean);
  return dailyBulkItems(ids,accessToken);
}

function dailyOpportunity(product,keyword,signals,rank){
  const scored=dailyScore(product,keyword,signals);
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
    createdAt:new Date().toISOString(),
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
    opportunitiesAnalyzed:0,opportunitiesPersisted:0,campaignsCreated:0,campaignsWaiting:0,fallbackQueries:0,messages:[],
  };
  const docs=await listDocs(dailyAgentCampaigns);
  const campaigns=docs.map(decodeFsDoc).filter((campaign)=>campaign?.organizationId===ORG_ID);
  const cutoff=Date.now()-60*60_000;
  const observed=(product)=>{
    const values=[product?.title?.observedAt,product?.url?.observedAt,product?.price?.observedAt,product?.availability?.observedAt].filter(Boolean);
    const times=values.map((value)=>new Date(value).getTime()).filter(Number.isFinite);
    return times.length ? Math.min(...times) : 0;
  };

  for(const campaign of campaigns.filter((item)=>item?.status==='READY' && item?.marketplace==='MELI' && item?.currentVersion?.product && observed(item.currentVersion.product)<=cutoff).slice(0,20)){
    try{
      const previous=campaign.currentVersion.product;
      const fresh=(await dailyBulkItems([previous.externalId],accessToken))[0];
      if(!fresh){report.skipped+=1;continue;}
      report.checked+=1;
      fresh.affiliateUrl=previous.affiliateUrl;
      fresh.assetRights=previous.assetRights || 'UNKNOWN';
      if(fresh.availability.value==='unavailable'){
        await writeDoc(dailyAgentCampaigns+'/'+encodeURIComponent(campaign.id),{...campaign,status:'BLOCKED'});
        report.blocked+=1;
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
  for(const query of queries){
    try{
      const products=await dailySearch(query,accessToken);
      report.checked+=products.length;
      for(const product of products){
        if(product.availability.value!=='available' || !product.imageUrl?.value || !product.url?.value || !product.price?.value) continue;
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

  for(const opportunity of ranked.slice(0,12)){
    try{
      const id=opportunity.id.replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,180);
      await writeDoc(dailyAgentOpportunities+'/'+encodeURIComponent(id),opportunity);
      report.opportunitiesPersisted+=1;
    }catch(error){
      report.errors+=1;
      console.warn('DAILY_AGENT_OPPORTUNITY_WRITE_ERROR',opportunity.id,error instanceof Error ? error.message : String(error));
    }
  }

  for(const opportunity of ranked.filter((item)=>item.score.score>=58 && !existingIds.has(item.product.externalId)).slice(0,3)){
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

  const originalReady=campaigns.filter((campaign)=>campaign.status==='READY').length;
  report.campaignsWaiting=Math.max(0,originalReady-report.blocked)+report.campaignsCreated;
  report.completedAt=new Date().toISOString();
  report.status=report.errors>0 ? 'PARTIAL' : 'SUCCESS';
  const runId='run-'+report.completedAt.replace(/[^0-9]/g,'').slice(0,14);
  await writeDoc(dailyAgentRuns+'/'+runId,report);
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

  const searchProbe=await meliGet('/products/search?status=active&site_id=MLB&q=organizador%20cozinha%20pequena&limit=3',token.access_token);
  const searchProbeCount=Array.isArray(searchProbe?.results) ? searchProbe.results.length : 0;
  if(searchProbeCount<1) throw new Error('MELI_SEARCH_PROBE_EMPTY');

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
    accessTokenExpiresAt,
    searchProbeCount,
    trendSignals:trendSignals.length,
    highlightSignals:highlightSignals.length,
    categories:categories.map((category)=>category.id),
  });

  const dailyAgent=await runDailyAgent(token.access_token,all,now);

  console.log(JSON.stringify({
    ok:true,
    trends:trendSignals.length,
    highlights:highlightSignals.length,
    categories,
    searchProbeCount,
    accessTokenExpiresAt,
    observedAt:now,
    dailyAgent,
  }));
}

main().catch((error)=>{
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode=1;
});
