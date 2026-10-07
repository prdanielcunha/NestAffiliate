import type { Campaign } from '@nestaffiliate/core';
import { createReelKit } from '@nestaffiliate/creative-engine';
import { useI18n } from '../lib/i18n-context';

export function ReelKitPanel({campaign}:{campaign:Campaign}){
  const {t,locale}=useI18n();
  const kit=createReelKit(campaign.currentVersion,locale);
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
    <button type="button" className="button secondary" onClick={()=>void navigator.clipboard.writeText(text)}>{t('r3CopyReel')}</button>
  </section>;
}
