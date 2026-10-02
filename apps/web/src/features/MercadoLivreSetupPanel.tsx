import { useState } from 'react';

const REDIRECT_URI='https://nestaffiliate.millionsnest.com/integrations/meli/callback';

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
      <p className="muted">Uma autorização inicial libera Trends e Highlights para o coletor diário. O Client Secret nunca entra nesta tela.</p>
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
    <button className="button primary" onClick={()=>void begin()}>Autorizar Mercado Livre</button>
    <p className="field-hint">No DevCenter, habilite acesso offline/somente leitura e PKCE. A conta que autoriza deve ser a conta principal/administradora.</p>
  </section>;
}
