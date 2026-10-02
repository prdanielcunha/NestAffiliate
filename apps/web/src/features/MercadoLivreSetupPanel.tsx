import { useState } from 'react';

const REDIRECT_URI='https://nestaffiliate.millionsnest.com/integrations/meli/callback';
const DEV_CENTER='https://developers.mercadolivre.com.br/';

export function MercadoLivreSetupPanel(){
  const [copiedRedirect,setCopiedRedirect]=useState(false);

  async function copyRedirect(){
    await navigator.clipboard.writeText(REDIRECT_URI);
    setCopiedRedirect(true);
  }

  return <section className="meli-setup surface">
    <div>
      <p className="eyebrow">MERCADO LIVRE · RADAR 2.0</p>
      <h2>Sinais oficiais sem expor credenciais</h2>
      <p className="muted">
        Trends e Highlights exigem Access Token. Enquanto o broker OAuth seguro não estiver conectado,
        use o importador JSON do Radar. O App ID, Client Secret, access token e refresh token nunca devem
        ser colados no frontend.
      </p>
    </div>
    <div className="list-surface">
      <div className="list-row">
        <div>
          <h3>1. Criar aplicativo no DevCenter</h3>
          <p>Use sua conta administradora do Mercado Livre e habilite o fluxo OAuth oficial.</p>
        </div>
        <a className="button secondary" href={DEV_CENTER} target="_blank" rel="noreferrer">Abrir DevCenter</a>
      </div>
      <div className="list-row">
        <div>
          <h3>2. Registrar a Redirect URI</h3>
          <p>{REDIRECT_URI}</p>
        </div>
        <button className="button secondary" onClick={()=>void copyRedirect()}>{copiedRedirect?'Copiado':'Copiar'}</button>
      </div>
      <div className="list-row">
        <div>
          <h3>3. Usar o Radar agora</h3>
          <p>Consulte /trends ou /highlights em ambiente autenticado e cole apenas o JSON de resposta no Radar → Sinais Oficiais.</p>
        </div>
        <span>ZERO COST</span>
      </div>
      <div className="list-row">
        <div>
          <h3>4. Automação futura</h3>
          <p>Quando o broker server-side estiver disponível, o mesmo parser será alimentado automaticamente pela API.</p>
        </div>
        <span>PREPARADO</span>
      </div>
    </div>
    <p className="field-hint">Nunca cole Client Secret, access token, refresh token ou Authorization header dentro do NestAffiliate.</p>
  </section>;
}
