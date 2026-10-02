import { useEffect, useMemo, useState } from 'react';

const REDIRECT_URI='https://nestaffiliate.millionsnest.com/integrations/meli/callback';

function readBootstrap(){
  const params=new URLSearchParams(window.location.search);
  const code=params.get('code') ?? '';
  const returnedState=params.get('state') ?? '';
  const error=params.get('error') ?? '';
  const expectedState=sessionStorage.getItem('na_meli_oauth_state') ?? '';
  const verifier=sessionStorage.getItem('na_meli_pkce_verifier') ?? '';
  const valid=Boolean(code && returnedState && expectedState && verifier && returnedState===expectedState);
  return {code,returnedState,expectedState,verifier,error,valid};
}

export function MercadoLivreOAuthCallback(){
  const [copied,setCopied]=useState(false);
  const state=useMemo(readBootstrap,[]);
  const bundle=state.valid
    ? JSON.stringify({code:state.code,codeVerifier:state.verifier,redirectUri:REDIRECT_URI})
    : '';

  useEffect(()=>{
    if(window.location.search){
      window.history.replaceState({},document.title,window.location.pathname);
    }
    return ()=>{
      if(state.valid){
        sessionStorage.removeItem('na_meli_oauth_state');
        sessionStorage.removeItem('na_meli_pkce_verifier');
      }
    };
  },[state.valid]);

  async function copy(){
    if(!bundle) return;
    await navigator.clipboard.writeText(bundle);
    setCopied(true);
  }

  return <main className="oauth-callback-shell">
    <section className="oauth-callback-card">
      <p className="eyebrow">MERCADO LIVRE · OAUTH</p>
      {state.valid ? <>
        <h1>Autorização recebida com segurança.</h1>
        <p>O código foi validado pelo <code>state</code> desta sessão e já foi removido da URL do navegador.</p>
        <div className="notice">Este pacote é de uso único. Não envie pelo chat, e-mail ou mensagem. Coloque-o somente no secret <b>MELI_BOOTSTRAP_BUNDLE</b> do repositório NestAffiliate.</div>
        <textarea className="oauth-bundle" readOnly value={bundle} aria-label="Mercado Livre bootstrap bundle" />
        <button className="button primary" onClick={()=>void copy()}>{copied?'Copiado':'Copiar pacote de bootstrap'}</button>
        <p className="muted">Depois de salvar o secret, execute o workflow “NestAffiliate Mercado Livre OAuth Bootstrap”. O workflow troca o código no servidor e armazena apenas o refresh token na área backend-only.</p>
      </> : <>
        <h1>Não foi possível validar esta autorização.</h1>
        <div className="notice danger">
          {state.error
            ? `Mercado Livre retornou: ${state.error}.`
            : 'O state, código ou verificador PKCE não corresponde à sessão que iniciou a conexão.'}
        </div>
        <p>Volte ao NestAffiliate → Conexões e inicie uma nova autorização. Não reutilize um código antigo.</p>
        <a className="button secondary" href="/connections">Voltar ao NestAffiliate</a>
      </>}
    </section>
  </main>;
}
