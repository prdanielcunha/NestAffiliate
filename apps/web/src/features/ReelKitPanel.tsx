import { useState } from 'react';
import type { Campaign } from '@nestaffiliate/core';
import { createReelKit, renderReelCover } from '@nestaffiliate/creative-engine';
import { useI18n } from '../lib/i18n-context';

export function ReelKitPanel({campaign}:{campaign:Campaign}){
  const {t,locale}=useI18n();
  const kit=createReelKit(campaign.currentVersion,locale);
  const [coverError,setCoverError]=useState(false);
  const [coverLoading,setCoverLoading]=useState(false);
  async function downloadCover(){
    setCoverLoading(true);setCoverError(false);
    try{
      const canvas=document.createElement('canvas');
      const png=await renderReelCover(canvas,campaign.currentVersion,locale);
      const link=document.createElement('a');
      link.download=`achados-do-nest-reel-${campaign.id.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,40)}-v${campaign.currentVersion.version}.png`;
      link.href=png;
      document.body.appendChild(link);link.click();link.remove();
    }catch{setCoverError(true);}finally{setCoverLoading(false);}
  }
  const text=[
    kit.coverText,
    ...kit.shotList.map((shot)=>`${shot.seconds} | ${shot.direction}\n${shot.voiceover}`),
    kit.caption,kit.disclosure,
  ].join('\n\n');
  return <section className="surface reel-kit-panel">
    <p className="eyebrow">{t('r3ReelKit')}</p>
    <h2>{t('r3ReelHeadline')}</h2>
    <p className="muted">{t('r3ReelFootage')}</p>
    <details>
      <summary>{t('r3ReelShotList')} · 9:16</summary>
      <h3>{kit.coverText}</h3>
      <ol>{kit.shotList.map((shot)=><li key={shot.seconds}>
        <strong>{shot.seconds}</strong><p>{shot.direction}</p><p>{shot.voiceover}</p>
      </li>)}</ol>
      <p>{kit.caption}</p><p>{kit.disclosure}</p>
    </details>
    <div className="reel-kit-actions">
      <button type="button" className="button secondary" onClick={()=>void navigator.clipboard.writeText(text)}>{t('r3CopyReel')}</button>
      <button type="button" className="button secondary" disabled={coverLoading} onClick={()=>void downloadCover()}>{coverLoading?t('r3CoverRendering'):t('r3DownloadReelCover')}</button>
    </div>
    {coverError&&<p role="alert" className="field-error">{t('r3CoverError')}</p>}
  </section>;
}
