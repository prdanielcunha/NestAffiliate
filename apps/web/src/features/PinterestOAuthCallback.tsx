import {useEffect,useState} from 'react';
import {useAuth} from '../lib/auth';
import {PINTEREST_SESSION_KEY,pinterestError,pinterestRequest} from '../services/pinterestBroker';

// Capture once and remove the OAuth response from browser history before rendering.
const returned=window.location.pathname==='/integrations/pinterest/callback'?new URLSearchParams(window.location.search):null;
if(returned)window.history.replaceState({},document.title,window.location.pathname);
let completing:Promise<unknown>|null=null;

export function PinterestOAuthCallback() {
  const auth=useAuth(),locale=localStorage.getItem('na_locale')||'pt-BR';
  const pick=(pt:string,en:string,es:string)=>locale==='pt-BR'?pt:locale==='es'?es:en;
  const [result,setResult]=useState<'waiting'|'success'|'error'>('waiting');
  const [error,setError]=useState('');
  useEffect(()=>{
    if(auth.state!=='ready'||!auth.user||!auth.organizationId)return;
    let active=true;
    try {
      if(!completing) {
        const saved=JSON.parse(sessionStorage.getItem(PINTEREST_SESSION_KEY)||'null');
        if(!saved||saved.uid!==auth.user.uid||saved.organizationId!==auth.organizationId||saved.expiresAt<Date.now()||
          returned?.get('error')||!returned?.get('code')||saved.state!==returned.get('state'))throw new Error('PINTEREST_STATE_INVALID');
        sessionStorage.removeItem(PINTEREST_SESSION_KEY);
        completing=pinterestRequest({user:auth.user,organizationId:auth.organizationId},'/oauth/complete',{
          code:returned.get('code'),state:saved.state});
        returned.delete('code');returned.delete('state');
      }
      void completing.then(()=>{if(active)setResult('success');}).catch(e=>{
        if(active){setError(pinterestError(e,locale));setResult('error');}
      });
    } catch(e) {setError(pinterestError(e,locale));setResult('error');}
    return ()=>{active=false;};
  },[auth.state,auth.user,auth.organizationId,locale]);
  return <main className="oauth-callback-shell"><section className="oauth-callback-card">
    <p className="eyebrow">PINTEREST · TRIAL / SANDBOX</p>
    <h1>{result==='success'?pick('Pinterest conectado para testes.','Pinterest connected for testing.','Pinterest conectado para pruebas.'):
      result==='error'?pick('A conexão não foi concluída.','Connection was not completed.','La conexión no se completó.'):
      pick('Concluindo a conexão segura…','Completing the secure connection…','Completando la conexión segura…')}</h1>
    <p role="status">{error||pick('O Trial não publica Pins para o público. Continue em Conexões para testar uma pasta e um Pin.','Trial does not publish public Pins. Continue to Connections to test a board and a Pin.','Trial no publica Pins para el público. Continúa en Conexiones para probar un tablero y un Pin.')}</p>
    {auth.state==='signed-out'&&<button className="button primary" onClick={()=>void auth.signIn()}>{pick('Entrar com Google','Sign in with Google','Entrar con Google')}</button>}
    {auth.state==='denied'&&<p>{pick('Esta conta não tem acesso ao workspace. Volte e use a conta que iniciou a conexão.','This account cannot access the workspace. Return using the account that started the connection.','Esta cuenta no tiene acceso. Vuelve con la cuenta que inició la conexión.')}</p>}
    <a className="button secondary" href="/connections">{pick('Voltar às Conexões','Back to Connections','Volver a Conexiones')}</a>
  </section></main>;
}
