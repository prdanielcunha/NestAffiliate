import type {User} from 'firebase/auth';

export const PINTEREST_CALLBACK='https://nestaffiliate.millionsnest.com/integrations/pinterest/callback';
export const PINTEREST_SESSION_KEY='na_pinterest_oauth';
export interface PinterestStatus {
  appId:string;accessTier:'TRIAL';environment:'SANDBOX';publicPublishing:false;
  configured:boolean;connected:boolean;canConfigure:boolean;redirectUri:string;expiresAt:string|null;
}
export interface PinterestBoard {id:string;name:string}
export interface PinterestIdentity {user:User;organizationId:string}

/** Same-origin authenticated broker: never call Pinterest/token endpoints from the browser. */
export async function pinterestRequest<T>(identity:PinterestIdentity,path:string,body?:Record<string,unknown>):Promise<T> {
  const url=new URL('/api/v1/nestaffiliate/pinterest'+path,window.location.origin);
  if(!body)url.searchParams.set('organizationId',identity.organizationId);
  const result=await fetch(url,{method:body?'POST':'GET',cache:'no-store',credentials:'same-origin',
    headers:{Authorization:'Bearer '+await identity.user.getIdToken(),Accept:'application/json',
      ...(body?{'Content-Type':'application/json'}:{})},
    ...(body?{body:JSON.stringify({...body,organizationId:identity.organizationId})}:{}),signal:AbortSignal.timeout(35000)});
  const data=await result.json() as T&{error?:string};
  if(!result.ok)throw new Error(data.error||'PINTEREST_UNAVAILABLE');
  return data;
}
export async function startPinterestConnection(identity:PinterestIdentity) {
  const result=await pinterestRequest<{authorizationUrl:string;state:string}>(identity,'/oauth/start',{});
  const url=new URL(result.authorizationUrl);
  if(url.origin!=='https://www.pinterest.com'||url.pathname!=='/oauth/'||
    url.searchParams.get('client_id')!=='1625057'||url.searchParams.get('redirect_uri')!==PINTEREST_CALLBACK||
    !/^[a-f0-9]{64}$/.test(result.state)||url.searchParams.get('state')!==result.state)throw new Error('PINTEREST_STATE_INVALID');
  sessionStorage.setItem(PINTEREST_SESSION_KEY,JSON.stringify({state:result.state,
    organizationId:identity.organizationId,uid:identity.user.uid,expiresAt:Date.now()+600_000}));
  window.location.assign(url.href);
}

export function pinterestError(error:unknown,locale:string) {
  const code=error instanceof Error?error.message:'';
  const pick=(pt:string,en:string,es:string)=>locale==='pt-BR'?pt:locale==='es'?es:en;
  if(/FORBIDDEN|ADMIN_REQUIRED|NOT_ENABLED|OPERATOR_REQUIRED/.test(code))return pick('Sua conta não tem permissão para configurar esta integração.','Your account cannot manage this integration.','Tu cuenta no puede gestionar esta integración.');
  if(/AUTH_REJECTED/.test(code))return pick('O Pinterest recusou a autorização. Confira a chave do app 1625057 e o endereço de retorno e conecte novamente.','Pinterest rejected authorization. Check the app secret and redirect URI, then reconnect.','Pinterest rechazó la autorización. Revisa la clave y la URL de retorno y vuelve a conectar.');
  if(/SETUP_REQUIRED/.test(code))return pick('Configure primeiro a chave do aplicativo.','Configure the app secret first.','Configura primero la clave de la app.');
  if(/STATE|SCOPES|CONNECT|REFRESH/.test(code))return pick('Inicie uma nova conexão com o Pinterest nesta mesma aba e conta. A autorização anterior não pode ser reutilizada.','Start a new Pinterest connection in this same tab and account. The previous authorization cannot be reused.','Inicia una conexión nueva en esta misma pestaña y cuenta. La autorización anterior no puede reutilizarse.');
  if(/ALREADY_ATTEMPTED/.test(code))return pick('Este envio já foi tentado. Confira seu perfil Sandbox antes de preparar outro teste para evitar duplicações.','This request was already attempted. Check your Sandbox profile before preparing another test.','Este envío ya se intentó. Revisa tu perfil Sandbox antes de preparar otra prueba.');
  if(/LIMIT|BUSY/.test(code))return pick('Aguarde antes de tentar novamente. Há limite de testes e de chamadas do Pinterest.','Please wait before trying again. Test and Pinterest API limits apply.','Espera antes de volver a intentar. Se aplican límites de pruebas y de API.');
  return pick('Não foi possível concluir. Confira a configuração e tente novamente. Se foi um envio de teste, verifique o Sandbox antes de repetir.','Could not complete. Check configuration. For a test submission, check Sandbox before repeating.','No se pudo completar. Revisa la configuración. Si fue un envío de prueba, revisa Sandbox antes de repetir.');
}
