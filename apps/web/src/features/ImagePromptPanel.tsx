import { useMemo, useState } from 'react';
import type { PinterestCreativePack, ProductTruth } from '@nestaffiliate/core';
import { isReferenceAiReady } from '@nestaffiliate/radar';
import { FEATURE_FLAGS } from '@nestaffiliate/config';
import { detectUnsupportedPinClaims } from '@nestaffiliate/compliance';
import { translateImagePromptToPortuguese } from '@nestaffiliate/creative-engine';
import { useI18n } from '../lib/i18n-context';
import { ProductSourceActions } from './ProductSourceActions';
import { ProductReferenceManager } from './ProductReferenceManager';
import type { ReferencePreview } from '../services/productReferenceRepository';

export function ImagePromptPanel({
 pack,product,reference,onReferenceChange,referenceLockRequired=false,
}:{
 pack:PinterestCreativePack;product:ProductTruth;
 reference?:ReferencePreview|null;
 onReferenceChange?:(ref:ReferencePreview|null)=>void;
 referenceLockRequired?:boolean;
}){
 const {t,locale}=useI18n();
 const [language,setLanguage]=useState<'en'|'pt-BR'>('en');
 const [copied,setCopied]=useState(false);
 const [extraInstructions,setExtraInstructions]=useState('');
 const [error,setError]=useState('');
 const [manualCopy,setManualCopy]=useState(false);
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
 const enabled=FEATURE_FLAGS.REFERENCE_LOCK_V4_ENABLED && referenceLockRequired;
 const ready=!enabled||Boolean(reference&&isReferenceAiReady(reference.asset,product)&&reference.previewUrl);
 const realPrompt=enabled?(language==='en'?[
  'MANDATORY IMAGE REFERENCE — ATTACHMENT REQUIRED:',
  'The user must attach the actual authorized photograph BEFORE requesting generation. This prompt never automatically uploads the photo.',
  'If the exact photo is missing from the conversation, do not generate a similar or invented product: ask for the correct attachment.',
  'Authorized reference: '+(reference?.asset.id??'NOT PROVIDED')+'; SHA-256: '+(reference?.asset.sha256??'NOT PROVIDED')+'.',
  'Original marketplace listing: '+product.marketplace+' / '+product.externalId+'.',
  'Exact product: '+product.title.value+'.',
  'Do not alter color, geometry, proportions, component count, material, finish, brand or variant.',
  'Do not insert words, price, discounts, false ratings, logos or product claims inside the picture.',
  'Pinterest 2:3 composition, 1000×1500 px; reserve a clean space for a headline placed later by the app.',
  'If the exact product cannot be preserved, do not invent one. Request a clearer authorized photo.',
  '',base.prompt,
 ]:[
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
 ]).join('\n'):base.prompt;
 const fullPrompt=extraInstructions.trim()?realPrompt+'\n\nUSER ART DIRECTION (do not override product identity, rights or image reference):\n'+extraInstructions.trim():realPrompt;
 const unsafePrompt=detectUnsupportedPinClaims(fullPrompt).length>0;
 // Never present a dead button when an editorial guard rejects the old prompt.
 // Offer a factual scene prompt that demands a real attached source instead.
 const safePrompt=unsafePrompt ? [
   'Create a premium Pinterest editorial product photograph in 2:3 vertical format, 1000 x 1500 pixels.',
   'The product identity below is seller-provided, NOT independently verified:',
   product.title.value,
   'IMPORTANT: The user MUST attach the actual authorized product photo in this ChatGPT conversation.',
   'If the attachment is missing, do not generate the image; ask for the real photo.',
   'Preserve the exact color, shape, components, dimensions and branding visible in the supplied photo.',
   'Use a realistic, calm home or lifestyle scene, natural light, professional commercial photography.',
   'Do not invent products, materials, features, performance, claims, discounts, logos, or embedded text.',
   'Keep negative space for a later title overlay, applied inside NestAffiliate.',
 ].join('\n') : fullPrompt;
 async function copyPrompt(){
   setError('');
   setManualCopy(false);
   try{
     if(navigator.clipboard?.writeText){
       await navigator.clipboard.writeText(safePrompt);
       setCopied(true);
       return;
     }
   }catch{/* Safari may reject navigator.clipboard without permission. */}
   try{
     const box=document.createElement('textarea');
     box.value=safePrompt;
     box.setAttribute('readonly','');
     box.style.position='fixed';box.style.top='0';box.style.left='0';box.style.opacity='0';
     document.body.appendChild(box);box.focus();box.select();
     const ok=document.execCommand('copy');
     box.remove();
     if(ok){setCopied(true);return;}
   }catch{/* Fallback to selectable text visible in the UI. */}
   setManualCopy(true);
   setError(locale==='pt-BR'?'O Safari não permitiu copiar automaticamente. Selecione o texto no campo abaixo e copie manualmente.':locale==='es'?'El navegador bloqueó la copia. Selecciona el texto de abajo.':'The browser blocked clipboard access. Select the prompt below and copy manually.');
 }
 const legacyRights=['AUTHORIZED','PLATFORM_PROVIDED','USER_PROVIDED','GENERATED'].includes(product.assetRights);
 return <div className="image-prompt-panel">
   <div className="prompt-panel-head">
     <div><p className="eyebrow">{t('imagePrompt')}</p><h3>{concept.title}</h3></div>
     <div className="prompt-language" role="group" aria-label={t('promptLanguage')}>
       <button type="button" className={language==='en'?'active':''} onClick={()=>setLanguage('en')}>EN · AI</button>
       <button type="button" className={language==='pt-BR'?'active':''} onClick={()=>setLanguage('pt-BR')}>{t('viewPortuguese')}</button>
     </div>
   </div>
   {enabled&&onReferenceChange&&<details className="prompt-optional-reference">
     <summary>{locale==='pt-BR'?'Opcional: guardar foto original para comparar no NestAffiliate':locale==='es'?'Opcional: guardar foto para comparar':'Optional: store the source photo for later comparison'}</summary>
     <p>{locale==='pt-BR'?'A foto original NÃO é enviada automaticamente ao ChatGPT. Se já a tem no celular, anexe-a somente na conversa do ChatGPT. Para campanhas com Reference Lock, a conferência de referência será exigida antes da aprovação final.':'The source photo is not sent to ChatGPT. Attach it directly there. Reference Lock verification remains mandatory before final approval.'}</p>
     <ProductReferenceManager key={product.marketplace+product.externalId} product={product} onChanged={onReferenceChange}/>
   </details>}
   {!enabled&&<ProductSourceActions product={product}/>}
   <p className="prompt-bridge-notice" role="note">{locale==='pt-BR'
     ?'O NestAffiliate cria o PROMPT, não a imagem nesta opção. Use uma foto original autorizada no ChatGPT. Depois volte e envie aqui somente a IMAGEM FINAL criada.'
     :locale==='es'?'NestAffiliate prepara el prompt. Adjunta la foto original en ChatGPT; importa aquí solo la imagen FINAL.'
     :'NestAffiliate prepares the prompt. Attach your original photo in ChatGPT; import only the FINAL image here.'}</p>
   <div className="prompt-reference-grid">
     <div className="reference-card"><span>{t('referenceImage')}</span>
       {enabled
         ? reference&&ready?<img src={reference.previewUrl} alt={product.title.value}/>:<div className="reference-placeholder">{locale==='pt-BR'?'Referência autorizada obrigatória antes de enviar à IA.':locale==='es'?'Se requiere una referencia autorizada antes de enviar a la IA.':'An authorized reference is required before sending to AI.'}</div>
         :legacyRights&&product.imageUrl?<img src={product.imageUrl.value} alt={product.title.value}/>:<div className="reference-placeholder">{t('referenceUnavailable')}</div>}
     </div>
     <div className="prompt-tech"><span>{t('targetSize')}</span><strong>1000 × 1500</strong><small>2:3 · {t('noEmbeddedText')}</small></div>
   </div>
   {enabled&&reference&&<div className="reference-step-instructions">
     <strong>{locale==='pt-BR'?'2. Anexe a mesma foto autorizada no ChatGPT':locale==='es'?'2. Adjunte la misma foto autorizada en ChatGPT':'2. Attach the authorized reference in ChatGPT'}</strong>
     <p>{locale==='pt-BR'?'Baixe a referência armazenada e anexe-a manualmente na conversa. Copiar o prompt NÃO transfere a imagem. Após a geração, volte para comparar e importar a imagem final.':locale==='es'?'Descargue la referencia y adjúntela manualmente en ChatGPT. Copiar el prompt NO transfiere la imagen. Después, compare e importe la imagen final.':'Download and attach the exact reference manually. Copying the prompt never attaches an image.'}</p>
     {reference&&ready&&<a className="button secondary" download={'nestaffiliate-referencia-'+product.externalId+'.webp'} href={reference.previewUrl}>
       {locale==='pt-BR'?'Baixar referência autorizada':locale==='es'?'Descargar referencia autorizada':'Download authorized reference'}</a>}
   </div>}
   <div className="prompt-studio-custom">
     <label htmlFor="na-extra-image-instructions">{locale==='pt-BR'?'Suas instruções extras para a IA (opcional)':locale==='es'?'Tus instrucciones adicionales para IA (opcional)':'Your optional AI directions'}</label>
     <textarea id="na-extra-image-instructions" rows={3} maxLength={600} value={extraInstructions}
      placeholder={locale==='pt-BR'?'Ex.: luz natural lateral, home office clean, manter a cadeira na cor original. Ou cole aqui instruções adicionais.':locale==='es'?'Ej.: luz natural lateral, composición minimalista.':'E.g. natural side light, editorial desk scene; keep original product color.'}
      onChange={e=>{setExtraInstructions(e.target.value);setCopied(false);}}/>
     <small>{locale==='pt-BR'?'Você pode colar instruções próprias. Elas serão acrescentadas ao prompt protegido; não substituem a referência real autorizada.':locale==='es'?'Puedes pegar tus propias instrucciones, sin eliminar la referencia autorizada.':'Paste your own instructions here. They are appended to the protected prompt; the real licensed reference remains mandatory.'}</small>
   </div>
   <details className="prompt-raw-details"><summary>{locale==='pt-BR'?'Ver prompt completo (opcional)':locale==='es'?'Ver prompt completo':'View full prompt (optional)'}</summary><pre className="prompt-box image-prompt-box">{safePrompt}</pre></details>
   <div className="chatgpt-bridge-steps">
      <strong>{locale==='pt-BR'?'Como gerar com seu ChatGPT (sem API)':locale==='es'?'Cómo generar con tu ChatGPT (sin API)':'Use your ChatGPT without an API'}</strong>
      <ol><li>{locale==='pt-BR'?'Copie o prompt com o botão 1; toque em “Abrir ChatGPT” (botão 2) e cole o texto na conversa.':locale==='es'?'Copia y abre ChatGPT, luego pega el prompt.':'Copy the prompt and open ChatGPT; paste the prompt.'}</li>
      <li>{locale==='pt-BR'?'Anexe também a foto real autorizada, quando solicitada pelo Reference Lock.':locale==='es'?'Adjunta la foto real autorizada cuando se requiera.':'Attach the authorized source photo when Reference Lock requires it.'}</li>
      <li>{locale==='pt-BR'?'Baixe a imagem gerada. Volte ao NestAffiliate, arraste ou cole a imagem e aprove após comparar.':locale==='es'?'Descarga la imagen, vuelve a NestAffiliate e impórtala para comparar.':'Download the image, return to NestAffiliate, paste/drop it and review fidelity.'}</li></ol>
      <p>{locale==='pt-BR'?'Assinatura ChatGPT Pro e API são produtos separados: você não precisa inserir senha nem chave do ChatGPT aqui. Uma API para geração dentro do app exigiria backend seguro e cobrança separada.':locale==='es'?'La suscripción ChatGPT Pro no incluye API. Nunca ingreses tu contraseña ni clave aquí.':'ChatGPT Pro is separate from the API. Never enter your password or API key here.'}</p>
   </div>
   <div className="prompt-actions">
     <button type="button" className="button primary" onClick={()=>void copyPrompt()}>{copied?t('copied'):locale==='pt-BR'?'1. Copiar prompt em inglês':locale==='es'?'1. Copiar prompt':'1. Copy English prompt'}</button>
     <a className="button secondary" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">{locale==='pt-BR'?'2. Abrir ChatGPT ↗':locale==='es'?'2. Abrir ChatGPT ↗':'2. Open ChatGPT ↗'}</a>
   </div>
   {unsafePrompt&&<p className="field-hint" role="status">{locale==='pt-BR'?'Uma promessa não comprovada foi removida automaticamente do prompt; use a versão segura acima.':'Unverified product claims were removed from the copyable prompt.'}</p>}
   {enabled&&!ready&&<p className="field-hint" role="status">{locale==='pt-BR'?'Referência ainda não arquivada neste site. Você pode copiar o prompt e anexar a foto diretamente no ChatGPT; a aprovação final exigirá a conferência da imagem real.':'You may copy now and attach the photo in ChatGPT; final approval still requires reference verification.'}</p>}
   {manualCopy&&<div className="prompt-manual-copy"><label htmlFor="manual-image-prompt">{locale==='pt-BR'?'Selecione e copie este prompt:':'Select and copy this prompt:'}</label><textarea id="manual-image-prompt" readOnly rows={9} value={safePrompt} onFocus={e=>e.target.select()}/></div>}
   {error&&<p className="field-error" role="alert">{error}</p>}
 </div>;
}
