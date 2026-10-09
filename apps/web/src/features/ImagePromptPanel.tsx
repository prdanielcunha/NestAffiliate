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
 pack,product,reference,onReferenceChange,referenceLockRequired=false,
}:{
 pack:PinterestCreativePack;product:ProductTruth;
 reference?:ReferencePreview|null;
 onReferenceChange?:(ref:ReferencePreview|null)=>void;
 referenceLockRequired?:boolean;
}){
 const {t,locale}=useI18n();
 const [language,setLanguage]=useState<'en'|'pt-BR'>('pt-BR');
 const [copied,setCopied]=useState(false);
 const [extraInstructions,setExtraInstructions]=useState('');
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
 async function copyPrompt(openChat=false){
   if(!ready)return;
   setError('');
   try{
     // Opens synchronously on click to avoid popup blockers. No automatic attachment occurs.
     if(openChat)window.open('https://chatgpt.com/','_blank','noopener,noreferrer');
     await navigator.clipboard.writeText(fullPrompt);
     setCopied(true);
   }catch{setError(locale==='pt-BR'?'Copie manualmente o prompt.':locale==='es'?'Copie el prompt manualmente.':'Copy the prompt manually.');}
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
         ? reference&&ready?<img src={reference.previewUrl} alt={product.title.value}/>:<div className="reference-placeholder">{locale==='pt-BR'?'Referência autorizada obrigatória antes de enviar à IA.':locale==='es'?'Se requiere una referencia autorizada antes de enviar a la IA.':'An authorized reference is required before sending to AI.'}</div>
         :legacyRights&&product.imageUrl?<img src={product.imageUrl.value} alt={product.title.value}/>:<div className="reference-placeholder">{t('referenceUnavailable')}</div>}
     </div>
     <div className="prompt-tech"><span>{t('targetSize')}</span><strong>1000 × 1500</strong><small>2:3 · {t('noEmbeddedText')}</small></div>
   </div>
   {enabled&&<div className="reference-step-instructions">
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
   <pre className="prompt-box image-prompt-box">{fullPrompt}</pre>
   <div className="chatgpt-bridge-steps">
      <strong>{locale==='pt-BR'?'Como gerar com seu ChatGPT (sem API)':locale==='es'?'Cómo generar con tu ChatGPT (sin API)':'Use your ChatGPT without an API'}</strong>
      <ol><li>{locale==='pt-BR'?'Clique em “Copiar e abrir ChatGPT” e cole o prompt na conversa.':locale==='es'?'Copia y abre ChatGPT, luego pega el prompt.':'Copy the prompt and open ChatGPT; paste the prompt.'}</li>
      <li>{locale==='pt-BR'?'Anexe também a foto real autorizada, quando solicitada pelo Reference Lock.':locale==='es'?'Adjunta la foto real autorizada cuando se requiera.':'Attach the authorized source photo when Reference Lock requires it.'}</li>
      <li>{locale==='pt-BR'?'Baixe a imagem gerada. Volte ao NestAffiliate, arraste ou cole a imagem e aprove após comparar.':locale==='es'?'Descarga la imagen, vuelve a NestAffiliate e impórtala para comparar.':'Download the image, return to NestAffiliate, paste/drop it and review fidelity.'}</li></ol>
      <p>{locale==='pt-BR'?'Assinatura ChatGPT Pro e API são produtos separados: você não precisa inserir senha nem chave do ChatGPT aqui. Uma API para geração dentro do app exigiria backend seguro e cobrança separada.':locale==='es'?'La suscripción ChatGPT Pro no incluye API. Nunca ingreses tu contraseña ni clave aquí.':'ChatGPT Pro is separate from the API. Never enter your password or API key here.'}</p>
   </div>
   <div className="prompt-actions">
     <button type="button" className="button primary" disabled={!ready} onClick={()=>void copyPrompt(true)}>{locale==='pt-BR'?'Copiar e abrir ChatGPT':locale==='es'?'Copiar y abrir ChatGPT':'Copy & open ChatGPT'}</button>
     <button type="button" className="button secondary" disabled={!ready} onClick={()=>void copyPrompt()}>{copied?t('copied'):t('copyPrompt')}</button>
   </div>
   {enabled&&!ready&&<p className="field-hint" role="status">{locale==='pt-BR'?'Envio à IA bloqueado: confirme direitos e escolha a referência visual exata.':locale==='es'?'Envío a IA bloqueado: confirme los derechos y seleccione la referencia exacta.':'AI upload blocked: confirm rights and select the exact visual reference.'}</p>}
   {error&&<p className="field-error" role="alert">{error}</p>}
 </div>;
}
