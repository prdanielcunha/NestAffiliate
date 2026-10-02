const PROJECT_ID=process.env.FIREBASE_PROJECT_ID || 'millionsnest';
const ORG_ID=process.env.NESTAFFILIATE_SIGNAL_ORG_ID || '';
const GCP_TOKEN=process.env.GOOGLE_OAUTH_ACCESS_TOKEN || '';
const CLIENT_ID=process.env.MELI_CLIENT_ID || '';
const CLIENT_SECRET=process.env.MELI_CLIENT_SECRET || '';
const BUNDLE_RAW=process.env.MELI_BOOTSTRAP_BUNDLE || '';

const firestoreBase=`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const secretDoc=`${firestoreBase}/organizations/${encodeURIComponent(ORG_ID)}/products/nestaffiliate/providerSecretState/mercadolivre`;
const connectionDoc=`${firestoreBase}/organizations/${encodeURIComponent(ORG_ID)}/products/nestaffiliate/providerConnections/mercadolivre`;

function required(name,value){
  if(!value) throw new Error(`MISSING_${name}`);
}

function fsValue(value){
  if(value===null || value===undefined) return {nullValue:null};
  if(typeof value==='string') return {stringValue:value};
  if(typeof value==='boolean') return {booleanValue:value};
  if(typeof value==='number') return Number.isInteger(value)
    ? {integerValue:String(value)}
    : {doubleValue:value};
  if(Array.isArray(value)) return {arrayValue:{values:value.map(fsValue)}};
  if(typeof value==='object'){
    return {mapValue:{fields:Object.fromEntries(Object.entries(value).map(([k,v])=>[k,fsValue(v)]))}};
  }
  return {stringValue:String(value)};
}

function fieldsObject(input){
  return {fields:Object.fromEntries(Object.entries(input).map(([key,value])=>[key,fsValue(value)]))};
}

async function gcpWrite(url,data){
  const response=await fetch(url,{
    method:'PATCH',
    headers:{
      Authorization:`Bearer ${GCP_TOKEN}`,
      'Content-Type':'application/json',
    },
    body:JSON.stringify(fieldsObject(data)),
  });
  if(!response.ok){
    const body=await response.text();
    throw new Error(`FIRESTORE_WRITE_${response.status}:${body.slice(0,220)}`);
  }
}

async function exchange(bundle){
  const body=new URLSearchParams({
    grant_type:'authorization_code',
    client_id:CLIENT_ID,
    client_secret:CLIENT_SECRET,
    code:bundle.code,
    redirect_uri:bundle.redirectUri,
    code_verifier:bundle.codeVerifier,
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
    throw new Error(`MELI_TOKEN_EXCHANGE_${response.status}:${text.slice(0,260)}`);
  }
  return response.json();
}

async function verify(accessToken){
  const response=await fetch('https://api.mercadolibre.com/trends/MLB',{
    headers:{Authorization:`Bearer ${accessToken}`},
  });
  if(!response.ok) throw new Error(`MELI_TRENDS_VERIFY_${response.status}`);
  const payload=await response.json();
  if(!Array.isArray(payload)) throw new Error('MELI_TRENDS_VERIFY_INVALID');
  return payload.length;
}

async function main(){
  required('NESTAFFILIATE_SIGNAL_ORG_ID',ORG_ID);
  required('GOOGLE_OAUTH_ACCESS_TOKEN',GCP_TOKEN);
  required('MELI_CLIENT_ID',CLIENT_ID);
  required('MELI_CLIENT_SECRET',CLIENT_SECRET);
  required('MELI_BOOTSTRAP_BUNDLE',BUNDLE_RAW);

  let bundle;
  try{
    bundle=JSON.parse(BUNDLE_RAW);
  }catch{
    throw new Error('MELI_BOOTSTRAP_BUNDLE_INVALID_JSON');
  }

  required('MELI_BOOTSTRAP_CODE',bundle.code);
  required('MELI_BOOTSTRAP_CODE_VERIFIER',bundle.codeVerifier);
  required('MELI_BOOTSTRAP_REDIRECT_URI',bundle.redirectUri);

  if(bundle.redirectUri!=='https://nestaffiliate.millionsnest.com/integrations/meli/callback'){
    throw new Error('MELI_BOOTSTRAP_REDIRECT_URI_MISMATCH');
  }

  const token=await exchange(bundle);
  required('MELI_ACCESS_TOKEN_RESPONSE',token.access_token);
  required('MELI_REFRESH_TOKEN_RESPONSE',token.refresh_token);

  const verifiedTrendCount=await verify(token.access_token);
  const now=new Date().toISOString();

  await gcpWrite(secretDoc,{
    organizationId:ORG_ID,
    provider:'MELI',
    refreshToken:String(token.refresh_token),
    rotatedAt:now,
    bootstrapCompletedAt:now,
  });

  await gcpWrite(connectionDoc,{
    organizationId:ORG_ID,
    provider:'MELI',
    status:'connected',
    capability:'market-signals',
    scopes:String(token.scope || ''),
    userId:String(token.user_id || ''),
    lastVerifiedAt:now,
    verifiedTrendCount,
  });

  console.log(JSON.stringify({
    ok:true,
    provider:'MELI',
    verifiedTrendCount,
    scopes:String(token.scope || ''),
    userId:String(token.user_id || ''),
    bootstrapCompletedAt:now,
  }));
}

main().catch((error)=>{
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode=1;
});
