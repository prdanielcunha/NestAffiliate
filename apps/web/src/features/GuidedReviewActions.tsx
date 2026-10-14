import {useState, type ReactNode} from 'react';
import {InlinePinCopyChooser} from './InlinePinCopyChooser';
import type {Campaign} from '@nestaffiliate/core';
import {useI18n} from '../lib/i18n-context';
import {detectUnsupportedPinClaims} from '@nestaffiliate/compliance';

function loc(locale:string,pt:string,en:string,es:string){
 return locale==='pt-BR'?pt:locale==='es'?es:en;
}
export function GuidedReviewActions({campaign,editable,onUpdate,onStage,onAI,children}: {campaign:Campaign;editable:boolean;onUpdate:(campaign:Campaign)=>void;onStage?:(stage:'text'|'image'|'review')=>void;onAI?:()=>void;children?:ReactNode}){
 const {locale}=useI18n();
 const [copied,setCopied]=useState<'title'|'description'|null>(null);
 const [copyError,setCopyError]=useState(false);
 const [copyEditorOpen,setCopyEditorOpen]=useState(false);
 const [copyFeedback,setCopyFeedback]=useState<'synced'|'local'|null>(null);
 const openCopyEditor=()=>{setCopyEditorOpen(true);setCopyFeedback(null);};
 const v=campaign.currentVersion;
 // Imported products always have draft copy. Draft availability must NEVER
 // advance the user past step 1 without explicit selection and approval.
 const titleRisk=detectUnsupportedPinClaims(v.narrative.pinterestTitle).length>0;
 const descriptionRisks=detectUnsupportedPinClaims(v.narrative.description);
 const unsafeCopy=titleRisk||descriptionRisks.length>0;
 const copyConfirmed=Boolean(
   !unsafeCopy &&
   v.narrative.pinterestTitle.trim() &&
   v.narrative.description.trim() &&
   (copyFeedback!==null ||
    v.reason==='review: title and description selected in-place' ||
    v.reason==='NestAI strategy explicitly reviewed and applied')
 );
 async function copy(text:string,which:'title'|'description'){
  setCopyError(false);
  try{
   await navigator.clipboard.writeText(text);
   setCopied(which);
  }catch{
   // Older iOS Safari/WebViews may reject Clipboard API while the user is
   // already interacting. Keep an accessible fallback without extra apps.
   const node=document.createElement('textarea');
   node.value=text;node.readOnly=true;node.style.position='fixed';
   node.style.opacity='0';node.style.top='0';
   document.body.appendChild(node);
   node.select();node.setSelectionRange(0,node.value.length);
   const success=document.execCommand('copy');
   node.remove();
   if(success)setCopied(which);
   else{setCopied(null);setCopyError(true);}
  }
 }
 return <section id="review-next-action" className="guided-review-actions" aria-label={loc(locale,'Próxima ação e textos do Pin','Next step and Pin text','Siguiente paso y textos')}>
  <div className="guided-review-top">
   <div>
    <p className="eyebrow">{loc(locale,'ETAPA 1 DE 3 · TEXTOS','STEP 1 OF 3 · COPY','PASO 1 DE 3 · TEXTOS')}</p>
    <h2>{copyConfirmed
      ?loc(locale,'Seus textos estão escolhidos','Your Pin text is selected','Ya elegiste los textos')
      :loc(locale,'Escolha o título e a descrição','Choose your title and description','Elige título y descripción')}</h2>
    <p>{copyConfirmed
      ?loc(locale,'Confira os textos abaixo. Quando estiver satisfeito, continue para a imagem.','Review your copy below, then continue to the image.','Revisa los textos y continúa a la imagen.')
      :loc(locale,'Preparamos sugestões para você. Escolha um título e uma descrição e confirme antes de continuar.','We prepared suggestions. Select and confirm one title and one description before continuing.','Preparamos sugerencias. Elige y confirma un título y una descripción antes de continuar.')}</p>
   </div>
   <div className="guided-text-primary-actions">
    <button type="button" className="button primary guided-next-cta" onClick={openCopyEditor} disabled={!editable}>
     {loc(locale,'Escolher título e descrição','Choose title and description','Elegir título y descripción')} →
    </button>
    <button type="button" className="button secondary" onClick={onAI} disabled={!editable}>
     {loc(locale,'Ou criar com NestAI (opcional)','Or generate with NestAI (optional)','O crear con NestAI (opcional)')}
    </button>
   </div>
  </div>
  {copyEditorOpen&&<InlinePinCopyChooser campaign={campaign} editable={editable} onUpdate={onUpdate}
     onClose={()=>setCopyEditorOpen(false)} onComplete={synced=>setCopyFeedback(synced?"synced":"local")}
     onCopyTitle={text=>void copy(text,"title")} onCopyDescription={text=>void copy(text,"description")}/>}
  {copyFeedback&&<p className={copyFeedback==="local"?"guided-copy-sync-warning":"guided-copy-complete"} role="status">
    {copyFeedback==="synced"
     ?loc(locale,"Textos escolhidos e aplicados. Agora copie os campos abaixo ou continue para a imagem.","Selected copy applied. Copy the fields below or continue to the image.","Textos aplicados. Copia los campos o continúa con la imagen.")
     :loc(locale,"Texto aplicado, mas a sincronização do Creative Pack não foi confirmada. Confira sua conexão antes de publicar.","Copy applied, but Creative Pack sync is unconfirmed. Check the connection before posting.","Textos aplicados, pero la sincronización no se confirmó.")}
  </p>}
  {children}
  {unsafeCopy&&<div className="guided-copy-truth-warning" role="alert">
   <strong>{loc(locale,'Texto salvo precisa de correção antes de publicar','Saved copy needs correction before publishing','El texto guardado requiere corrección')}</strong>
   <p>{loc(locale,'Encontramos promessas sobre o desempenho do produto que não foram comprovadas. O texto continua no histórico, mas não pode ser copiado para publicação até você escolher uma alternativa segura.','Unverified product performance claims were found. Choose a safe alternative before copying or publishing.','Encontramos afirmaciones sobre el producto sin verificar. Selecciona un texto seguro.')}</p>
   <button type="button" className="guided-choose-safe-text" onClick={openCopyEditor}>{loc(locale,'Escolher textos seguros aqui →','Choose safe text here →','Elegir texto seguro aquí →')}</button>
  </div>}
  <div className="guided-copy-preview">
   <p className="guided-copy-preview-label">{copyConfirmed
    ?loc(locale,'TEXTOS CONFIRMADOS','CONFIRMED COPY','TEXTOS CONFIRMADOS')
    :loc(locale,'PRÉVIA · SUGESTÕES AINDA NÃO CONFIRMADAS','PREVIEW · UNCONFIRMED SUGGESTIONS','VISTA PREVIA · SUGERENCIAS SIN CONFIRMAR')}</p>
   <div className="guided-copy-field">
    <div><span>{loc(locale,'Título para o Pinterest','Pinterest title','Título de Pinterest')}</span>
     <button type="button" onClick={()=>void copy(v.narrative.pinterestTitle,'title')}
      disabled={!v.narrative.pinterestTitle||titleRisk}>{copied==='title'?loc(locale,'Copiado!','Copied!','¡Copiado!'):loc(locale,'Copiar título','Copy title','Copiar título')}</button>
    </div>
    <p>{titleRisk?loc(locale,'Título requer revisão.','Title requires review.','Título necesita revisión.'):v.narrative.pinterestTitle||'—'}</p>
   </div>
   <div className="guided-copy-field">
    <div><span>{loc(locale,'Descrição para o Pinterest','Pinterest description','Descripción de Pinterest')}</span>
     <button type="button" onClick={()=>void copy(v.narrative.description,'description')}
      disabled={!v.narrative.description||descriptionRisks.length>0}>{copied==='description'?loc(locale,'Copiado!','Copied!','¡Copiado!'):loc(locale,'Copiar descrição','Copy description','Copiar descripción')}</button>
    </div>
    <p>{descriptionRisks.length>0
      ?loc(locale,'Esta descrição contém afirmações não comprovadas. Selecione uma alternativa segura na etapa Textos + IA.','Description blocked: select a verified alternative below.','Descripción bloqueada: selecciona otra opción.')
      :v.narrative.description||'—'}</p>
   </div>

  </div>
  {copyError&&<p role="alert" className="guided-copy-error">{loc(locale,
    'Não foi possível copiar automaticamente. Mantenha pressionado sobre o texto acima para selecionar e copiar.',
    'Automatic copy failed. Press and hold the text above to select and copy.',
    'No se pudo copiar. Mantén pulsado el texto para seleccionarlo.')}</p>}
  {copyConfirmed&&<div className="guided-step-complete">
    <p role="status">{loc(locale,'Título e descrição confirmados. Agora você pode preparar a imagem.','Title and description confirmed. Now you can prepare the image.','Título y descripción confirmados. Ya puedes preparar la imagen.')}</p>
    <button type="button" className="button primary guided-continue-image" onClick={()=>onStage?.('image')}>
      {loc(locale,'Continuar para imagem →','Continue to image →','Continuar a imagen →')}
    </button>
  </div>}
 </section>;
}
