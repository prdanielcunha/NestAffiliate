import { useState } from 'react';

const REDIRECT_URI='https://nestaffiliate.millionsnest.com/integrations/meli/callback';
const DEV_CENTER='https://developers.mercadolivre.com.br/';

function base64Url(bytes:ArrayBuffer){
  const raw=String.fromCharCode(...new Uint8Array(bytes));
  return btoa(raw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

function randomVerifier(){
  const bytes=new Uint8Array(48);
  crypto.getRandomValues(bytes);
  return Array.from(bytes,(byte)=>byte.toString(16).padStart(2,'0')).join('');
}

async function challengeFor(verifier:string){
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
  return base64Url(digest);
}

export function MercadoLivreSetupPanel(){
  const [clientId,setClientId]=useState(()=>sessionStorage.getItem('na_meli_client_id') ?? '');
  const [copiedRedirect,setCopiedRedirect]=useState(false);
  const [error,setError]=useState('');

  async function begin(){
    const appId=clientId.trim();
    if(!/^\d+$/.test(appId)){
      setError('Cole o App ID numérico criado no DevCenter do Mercado Livre.');
      return;
    }
    setError('');
    const state=crypto.randomUUID();
    const verifier=randomVerifier();
    const challenge=await challengeFor(verifier);
    sessionStorage.setItem('na_meli_oauth_state',state);
    sessionStorage.setItem('na_meli_pkce_verifier',verifier);
    sessionStorage.setItem('na_meli_client_id',appId);

    const url=new URL('https://auth.mercadolivre.com.br/authorization');
    url.searchParams.set('response_type','code');
    url.searchParams.set('client_id',appId);
    url.searchParams.set('redirect_uri',REDIRECT_URI);
    url.searchParams.set('state',state);
    url.searchParams.set('code_challenge',challenge);
    url.searchParams.set('code_challenge_method','S256');
    window.location.assign(url.toString());
  }

  async function copyRedirect(){
    await navigator.clipboard.writeText(REDIRECT_URI);
    setCopiedRedirect(true);
  }

  return <section className="meli-setup surface">
    <div>
      <p className="eyebrow">MERCADO LIVRE · RADAR 2.0</p>
      <h2>Ativar sinais oficiais</h2>
      <p className="muted">
        A autorização usa PKCE + state. O App ID pode ficar no navegador; Client Secret,
        access token e refresh token nunca entram nesta tela.
      </p>
    </div>

    <div className="meli-setup-grid">
      <label>
        <span>Redirect URI exata</span>
        <div className="inline-editor">
          <input value={REDIRECT_URI} readOnly aria-label="Mercado Livre redirect URI" />
          <button className="button secondary" onClick={()=>void copyRedirect()}>{copiedRedirect?'Copiado':'Copiar'}</button>
        </div>
      </label>
      <label>
        <span>App ID</span>
        <input
          inputMode="numeric"
          value={clientId}
          onChange={(event)=>setClientId(event.target.value)}
          placeholder="Ex.: 1234567890123456"
          aria-label="Mercado Livre App ID"
        />
      </label>
    </div>

    {error && <p className="field-error">{error}</p>}

    <div className="opportunity-actions">
      <a className="button secondary" href={DEV_CENTER} target="_blank" rel="noreferrer">Abrir DevCenter</a>
      <button className="button primary" onClick={()=>void begin()}>Autorizar Mercado Livre</button>
    </div>

    <div className="list-surface">
      <div className="list-row">
        <div>
          <h3>1. Criar aplicativo no DevCenter</h3>
          <p>Use a conta administradora, registre a Redirect URI acima e guarde o Client Secret somente em GitHub Secrets.</p>
        </div>
        <span>UMA VEZ</span>
      </div>
      <div className="list-row">
        <div>
          <h3>2. Autorizar nesta tela</h3>
          <p>O Mercado Livre retorna para o NestAffiliate; o callback valida a sessão e gera um pacote de bootstrap de uso único.</p>
        </div>
        <span>PKCE</span>
      </div>
      <div className="list-row">
        <div>
          <h3>3. Bootstrap server-side</h3>
          <p>Salve o pacote em MELI_BOOTSTRAP_BUNDLE e execute “NestAffiliate Mercado Livre OAuth Bootstrap”.</p>
        </div>
        <span>GITHUB</span>
      </div>
      <div className="list-row">
        <div>
          <h3>4. Sync automático</h3>
          <p>Depois do bootstrap, o workflow diário renova o token rotativo e alimenta Trends/Highlights no Radar.</p>
        </div>
        <span>AUTOMÁTICO</span>
      </div>
    </div>

    <p className="field-hint">
      Fallback imediato: no Radar → Sinais Oficiais, cole somente o JSON de /trends ou /highlights. Nunca cole tokens, Client Secret ou Authorization header.
    </p>
  </section>;
}
