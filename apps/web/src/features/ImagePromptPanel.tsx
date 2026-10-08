import { useMemo, useState } from 'react';
import type { PinterestCreativePack, ProductTruth } from '@nestaffiliate/core';
import { isReferenceAiReady } from '@nestaffiliate/radar';
import { FEATURE_FLAGS } from '@nestaffiliate/config';
import { translateImagePromptToPortuguese } from '@nestaffiliate/creative-engine';
import { useI18n } from '../lib/i18n-context';
import { ProductSourceActions } from './ProductSourceActions';
import { ProductReferenceManager } from './ProductReferenceManager';
import type { ReferencePreview } from '../services/productReferenceRepository';

export function ImagePromptPanel({
 pack,product,reference,onReferenceChange,
}:{
 pack:PinterestCreativePack;product:ProductTruth;
 reference?:ReferencePreview|null;
 onReferenceChange?:(ref:ReferencePreview|null)=>void;
}){
 const {t,locale}=useI18n();
 const [language,setLanguage]=useState<'en'|'pt-BR'>('pt-BR');
 const [copied,setCopied]=useState(false);
 const [error,setError]=useState('');
 const concept=pack.imageConcepts.find(item=>item.id===pack.recommendedConceptId)??pack.imageConcepts[0];
 const base=useMemo(()=>{
   if(!concept)return null;
   if(language==='en')return concept.imagePrompt;
   return translateImagePromptToPortuguese(concept.imagePrompt,{
     product,scene:concept.sceneProfile,artDirection:concept.rationale,
     cameraAngle:pack.creativeDirection.cameraAngle,
   });
 },[concept,language,pack.creativeDirection.cameraAngle,product]);
 if(!concept||!base)return null;
 const enabled=FEATURE_FLAGS.REFERENCE_LOCK_V4_ENABLED;
 const ready=!enabled||Boolean(reference&&isReferenceAiReady(reference.asset,product)&&reference.previewUrl);
 const realPrompt=enabled?[
  'INSTRUÇÃO FUNDAMENTAL — ANEXO DE REFERÊNCIA OBRIGATÓRIO:',
  'O usuário deve ANEXAR a imagem real autorizada da referência ANTES de pedir a geração. Este texto não anexa a imagem automaticamente.',
  'Se a foto exata não estiver anexada e visível, não gere uma cadeira ou produto parecido; solicite o anexo correto.',
  'Referência autorizada: '+(reference?.asset.id??'NÃO FORNECIDA')+'; SHA-256: '+(reference?.asset.sha256??'NÃO FORNECIDO')+'.',
  'Identidade do anúncio: '+product.marketplace+' / '+product.externalId+'.',
  'Produto exato: '+product.title.value+'.',
  'Não alterar cor, geometria, escala, número de peças, material, acabamento, marca ou variação.',
  'Não adicionar texto, preço, desconto, avaliações, logotipos ou claims à fotografia.',
  'Composição Pinterest 2:3 (1000×1500), com espaço negativo para headline aplicada posteriormente no app.',
  'Se a imagem real não permitir um resultado fiel, recuse a invenção de produto semelhante e peça nova referência.',
  '',
  base.prompt,
 ].join('\n'):base.prompt;
 async function copyPrompt(openChat=false){
   if(!ready)return;
   setError('');
   try{
     // Opens synchronously on click to avoid popup blockers. No automatic attachment occurs.
     if(openChat)window.open('https://chatgpt.com/','_blank','noopener,noreferrer');
     await navigator.clipboard.writeText(realPrompt);
     setCopied(true);
   }catch{setError(locale==='pt-BR'?'Copie manualmente o prompt.':'Copy the prompt manually.');}
 }
 const legacyRights=['AUTHORIZED','PLATFORM_PROVIDED','USER_PROVIDED','GENERATED'].includes(product.assetRights);
 return <div className="image-prompt-panel">
   <div className="prompt-panel-head">
     <div><p className="eyebrow">{t('imagePrompt')}</p><h3>{concept.title}</h3></div>
     <div className="prompt-language" role="group" aria-label={t('promptLanguage')}>
       <button type="button" className={language==='en'?'active':''} onClick={()=>setLanguage('en')}>EN</button>
       <button type="button" className={language==='pt-BR'?'active':''} onClick={()=>setLanguage('pt-BR')}>{t('viewPortuguese')}</button>
     </div>
   </div>
   {enabled&&onReferenceChange&&<ProductReferenceManager key={product.marketplace+product.externalId} product={product} onChanged={onReferenceChange}/>}
   {!enabled&&<ProductSourceActions product={product}/>}
   <div className="prompt-reference-grid">
     <div className="reference-card"><span>{t('referenceImage')}</span>
       {enabled
         ? reference&&ready?<img src={reference.previewUrl} alt={product.title.value}/>:<div className="reference-placeholder">Referência autorizada obrigatória antes de enviar à IA.</div>
         :legacyRights&&product.imageUrl?<img src={product.imageUrl.value} alt={product.title.value}/>:<div className="reference-placeholder">{t('referenceUnavailable')}</div>}
     </div>
     <div className="prompt-tech"><span>{t('targetSize')}</span><strong>1000 × 1500</strong><small>2:3 · {t('noEmbeddedText')}</small></div>
   </div>
   {enabled&&<div className="reference-step-instructions">
     <strong>{locale==='pt-BR'?'2. Anexe a mesma foto autorizada no ChatGPT':'2. Attach the authorized reference in ChatGPT'}</strong>
     <p>{locale==='pt-BR'?'Baixe a referência armazenada e anexe-a manualmente na conversa. Copiar o prompt NÃO transfere a imagem. Após a geração, volte para comparar e importar a imagem final.':'Download and attach the exact reference manually. Copying the prompt never attaches an image.'}</p>
     {reference&&ready&&<a className="button secondary" download={'nestaffiliate-referencia-'+product.externalId+'.webp'} href={reference.previewUrl}>
       {locale==='pt-BR'?'Baixar referência autorizada':'Download authorized reference'}</a>}
   </div>}
   <pre className="prompt-box image-prompt-box">{realPrompt}</pre>
   <div className="prompt-actions">
     <button type="button" className="button primary" disabled={!ready} onClick={()=>void copyPrompt(true)}>{t('copyToChatGPT')}</button>
     <button type="button" className="button secondary" disabled={!ready} onClick={()=>void copyPrompt()}>{copied?t('copied'):t('copyPrompt')}</button>
   </div>
   {enabled&&!ready&&<p className="field-hint" role="status">Envio à IA bloqueado: confirme direitos e escolha a referência visual exata.</p>}
   {error&&<p className="field-error" role="alert">{error}</p>}
 </div>;
}
