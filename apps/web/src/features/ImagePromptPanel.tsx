import { useMemo, useState } from 'react';
import type { PinterestCreativePack, ProductTruth } from '@nestaffiliate/core';
import { translateImagePromptToPortuguese } from '@nestaffiliate/creative-engine';
import { useI18n } from '../lib/i18n-context';

export function ImagePromptPanel({
  pack,
  product,
}:{
  pack:PinterestCreativePack;
  product:ProductTruth;
}){
  const { t }=useI18n();
  const [language,setLanguage]=useState<'en'|'pt-BR'>('en');
  const [copied,setCopied]=useState(false);
  const concept=pack.imageConcepts.find((item)=>item.id===pack.recommendedConceptId) ?? pack.imageConcepts[0];

  const prompt=useMemo(()=>{
    if(!concept) return null;
    if(language==='en') return concept.imagePrompt;
    return translateImagePromptToPortuguese(concept.imagePrompt,{
      product,
      scene:concept.sceneProfile,
      artDirection:concept.rationale,
      cameraAngle:pack.creativeDirection.cameraAngle,
    });
  },[concept,language,pack.creativeDirection.cameraAngle,product]);

  if(!concept || !prompt) return null;
  const activeConcept=concept;
  const activePrompt=prompt;

  async function copyPrompt(){
    await navigator.clipboard.writeText(activePrompt.prompt);
    setCopied(true);
    window.setTimeout(()=>setCopied(false),1400);
  }

  async function copyToChatGPT(){
    const opened=window.open('https://chatgpt.com/','_blank','noopener,noreferrer');
    await navigator.clipboard.writeText(activePrompt.prompt);
    if(!opened) setCopied(true);
  }

  const referenceAllowed=Boolean(
    product.imageUrl?.value &&
    ['AUTHORIZED','PLATFORM_PROVIDED','USER_PROVIDED','GENERATED'].includes(product.assetRights)
  );

  return <div className="image-prompt-panel">
    <div className="prompt-panel-head">
      <div>
        <p className="eyebrow">{t('imagePrompt')}</p>
        <h3>{activeConcept.title}</h3>
      </div>
      <div className="prompt-language" role="group" aria-label={t('promptLanguage')}>
        <button className={language==='en'?'active':''} onClick={()=>setLanguage('en')}>EN</button>
        <button className={language==='pt-BR'?'active':''} onClick={()=>setLanguage('pt-BR')}>{t('viewPortuguese')}</button>
      </div>
    </div>

    <div className="prompt-reference-grid">
      <div className="reference-card">
        <span>{t('referenceImage')}</span>
        {referenceAllowed
          ? <img src={product.imageUrl!.value} alt={product.title.value} />
          : <div className="reference-placeholder">{t('referenceUnavailable')}</div>}
      </div>
      <div className="prompt-tech">
        <span>{t('targetSize')}</span>
        <strong>1000 × 1500</strong>
        <small>2:3 · {t('noEmbeddedText')}</small>
      </div>
    </div>

    <pre className="prompt-box image-prompt-box">{activePrompt.prompt}</pre>
    <div className="prompt-actions">
      <button className="button primary" onClick={()=>void copyToChatGPT()}>{t('copyToChatGPT')}</button>
      <button className="button secondary" onClick={()=>void copyPrompt()}>{copied?t('copied'):t('copyPrompt')}</button>
    </div>
  </div>;
}
