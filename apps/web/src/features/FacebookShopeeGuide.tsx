import {useState} from 'react';
import type {Campaign,Role} from '@nestaffiliate/core';
import {createReelKit} from '@nestaffiliate/creative-engine';
import {db} from '../lib/firebase';
import {useI18n} from '../lib/i18n-context';
import {recordUserReportedFacebookReel} from '../services/channelPublicationRepository';

export function FacebookShopeeGuide({campaign,actorId,role}:{
  campaign:Campaign;actorId:string|null;role:Role|null;
}){
  const {t,locale}=useI18n();
  const [eligible,setEligible]=useState(false);
  const [rights,setRights]=useState(false);
  const [tagged,setTagged]=useState(false);
  const [url,setUrl]=useState('');
  const [status,setStatus]=useState<'idle'|'saving'|'saved'|'error'>('idle');
  const kit=createReelKit(campaign.currentVersion,locale);
  async function save(){
    if(!db||!actorId||!role)return;
    setStatus('saving');
    try{
      await recordUserReportedFacebookReel({
        db,organizationId:campaign.organizationId,campaign,externalUrl:url,actorId,role,
        affiliateEligibilityConfirmed:eligible,productTagConfirmed:tagged,originalFootageConfirmed:rights,
      });
      setStatus('saved');
    }catch{setStatus('error');}
  }
  return <section className="surface facebook-reel-guide">
    <p className="eyebrow">{t('r3FacebookChannel')}</p>
    <h2>{t('r3FacebookGuided')}</h2>
    <p className="muted">{t('r3FacebookDisclaimer')}</p>
    <details>
      <summary>{t('r3FacebookSteps')}</summary>
      <ol>
        <li>{t('r3FacebookStep1')}</li>
        <li>{t('r3FacebookStep2')}</li>
        <li>{t('r3FacebookStep3')}</li>
        <li>{t('r3FacebookStep4')}</li>
      </ol>
      <p>{t('r3FacebookOnlyOne')}</p>
      <p>{kit.coverText}</p>
      <p>{kit.caption}</p>
      <p>{kit.disclosure}</p>
    </details>
    <div className="fb-confirmations">
      <label><input type="checkbox" checked={eligible} onChange={(event)=>setEligible(event.target.checked)} />{t('r3FbEligCheck')}</label>
      <label><input type="checkbox" checked={rights} onChange={(event)=>setRights(event.target.checked)} />{t('r3FbRightsCheck')}</label>
      <label><input type="checkbox" checked={tagged} onChange={(event)=>setTagged(event.target.checked)} />{t('r3FbTagCheck')}</label>
    </div>
    <label>{t('r3FacebookPostUrl')}<input type="url" inputMode="url" value={url} onChange={(e)=>{setUrl(e.target.value);setStatus('idle');}} placeholder="https://www.facebook.com/reel/123456789"/></label>
    <button type="button" className="button secondary" onClick={()=>void save()} disabled={!eligible||!rights||!tagged||!url.trim()||status==='saving'||!db||!actorId||!role}>{t('r3FbRecord')}</button>
    {status==='saved' && <p role="status">{t('r3FbRecorded')}</p>}
    {status==='error' && <p role="alert" className="field-error">{t('r3FbError')}</p>}
  </section>;
}
