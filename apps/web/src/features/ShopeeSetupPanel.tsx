import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n-context';
import { configureShopeeApi, getShopeeApiStatus, type ShopeeApiStatus } from '../services/shopeeBroker';

const SHOPEE_OPEN_API_PORTAL='https://affiliate.shopee.com.br/open_api';

export function ShopeeSetupPanel(){
  const { t }=useI18n();
  const identity=useAuth();
  const [status,setStatus]=useState<ShopeeApiStatus|null>(null);
  const [appId,setAppId]=useState('');
  const [secret,setSecret]=useState('');
  const [state,setState]=useState<'idle'|'loading'|'saving'|'error'>('loading');
  const [error,setError]=useState('');

  useEffect(()=>{
    if(!identity.user || !identity.organizationId){
      setState('idle');
      return;
    }
    let active=true;
    void getShopeeApiStatus({user:identity.user,organizationId:identity.organizationId})
      .then((next)=>{
        if(!active) return;
        setStatus(next);
        setState('idle');
      })
      .catch((reason)=>{
        if(!active) return;
        setError(reason instanceof Error ? reason.message : 'SHOPEE_STATUS_UNAVAILABLE');
        setState('error');
      });
    return ()=>{active=false;};
  },[identity.organizationId,identity.user]);

  async function save(){
    if(!identity.user || !identity.organizationId) return;
    if(!appId.trim() || !secret.trim()){
      setError('SHOPEE_CREDENTIALS_REQUIRED');
      setState('error');
      return;
    }
    setState('saving');
    setError('');
    try{
      const next=await configureShopeeApi({
        user:identity.user,
        organizationId:identity.organizationId,
        appId,
        secret,
      });
      setStatus(next);
      setSecret('');
      setState('idle');
    }catch(reason){
      setError(reason instanceof Error ? reason.message : 'SHOPEE_SETUP_UNAVAILABLE');
      setState('error');
    }
  }

  const errorText=
    error.includes('SHOPEE_CREDENTIALS_REJECTED') ? t('shopeeCredentialsRejected') :
    error.includes('ADMIN_REQUIRED') || error.includes('FORBIDDEN') ? t('shopeeSetupAdminOnly') :
    error.includes('SHOPEE_CREDENTIALS_REQUIRED') ? t('shopeeCredentialsRequired') :
    error ? t('shopeeSetupError') : '';

  return <section className="meli-setup surface" aria-label={t('shopeeApiSetupTitle')}>
    <div>
      <p className="eyebrow">SHOPEE · AFFILIATE OPEN API</p>
      <h2>{t('shopeeApiSetupTitle')}</h2>
      <p className="muted">{t('shopeeApiSetupBody')}</p>
    </div>

    <div className="shopee-api-status">
      <span className={`connection-status ${status?.configured ? 'active' : 'external'}`}>
        {state==='loading' ? t('shopeeCheckingApi') : status?.configured ? t('shopeeApiConnected') : t('shopeeApiNotConnected')}
      </span>
      {status?.appIdHint ? <small>{t('shopeeConfiguredApp',{id:status.appIdHint})}</small> : null}
    </div>

    {!status?.configured && <div className="meli-setup-grid">
      <label>
        <span>{t('shopeeAppId')}</span>
        <input
          inputMode="numeric"
          autoComplete="off"
          value={appId}
          onChange={(event)=>setAppId(event.target.value)}
          placeholder="App ID"
          aria-label={t('shopeeAppId')}
        />
      </label>
      <label>
        <span>{t('shopeeSecret')}</span>
        <input
          type="password"
          autoComplete="new-password"
          value={secret}
          onChange={(event)=>setSecret(event.target.value)}
          placeholder="Secret"
          aria-label={t('shopeeSecret')}
        />
      </label>
    </div>}

    {errorText && <p className="field-error">{errorText}</p>}

    <div className="opportunity-actions">
      <a className="button secondary" href={SHOPEE_OPEN_API_PORTAL} target="_blank" rel="noreferrer">{t('openShopeeOpenApi')}</a>
      {!status?.configured && <button className="button primary" disabled={state==='saving'} onClick={()=>void save()}>
        {state==='saving' ? t('shopeeValidatingCredentials') : t('shopeeActivateSearch')}
      </button>}
    </div>

    <div className="list-surface">
      <div className="list-row">
        <div><h3>{t('shopeeSetupStep1Title')}</h3><p>{t('shopeeSetupStep1Body')}</p></div>
        <span>UMA VEZ</span>
      </div>
      <div className="list-row">
        <div><h3>{t('shopeeSetupStep2Title')}</h3><p>{t('shopeeSetupStep2Body')}</p></div>
        <span>SEGURO</span>
      </div>
      <div className="list-row">
        <div><h3>{t('shopeeSetupStep3Title')}</h3><p>{t('shopeeSetupStep3Body')}</p></div>
        <span>RADAR</span>
      </div>
    </div>

    <p className="field-hint">{t('shopeeApiSecurity')}</p>
  </section>;
}
