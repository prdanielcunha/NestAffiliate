import {useState} from 'react';
import {InlinePinCopyChooser} from './InlinePinCopyChooser';
import type {Campaign} from '@nestaffiliate/core';
import {useI18n} from '../lib/i18n-context';
import {inspectAffiliateAttestation,isMarketplaceAffiliateDestination,detectUnsupportedPinClaims} from '@nestaffiliate/compliance';

function loc(locale:string,pt:string,en:string,es:string){
 return locale==='pt-BR'?pt:locale==='es'?es:en;
}
export function GuidedReviewActions({campaign,editable,onUpdate}: {campaign:Campaign;editable:boolean;onUpdate:(campaign:Campaign)=>void}){
 const {locale}=useI18n();
 const [copied,setCopied]=useState<'title'|'description'|null>(null);
 const [copyError,setCopyError]=useState(false);
 const [copyEditorOpen,setCopyEditorOpen]=useState(false);
 const [copyFeedback,setCopyFeedback]=useState<'synced'|'local'|null>(null);
 const openCopyEditor=()=>{setCopyEditorOpen(true);setCopyFeedback(null);};
 const v=campaign.currentVersion;
 const shopee=v.product.marketplace==='SHOPEE';
 const hasAffiliate=!shopee && isMarketplaceAffiliateDestination(v.product.affiliateUrl?.value,'MELI')
   && inspectAffiliateAttestation(v.product)==='SELF_CONFIRMED';
 // Shopee native tagging belongs at publication and must not prevent
 // users from preparing text/image or trap them in the first step.
 const hasImage=Boolean(v.creativeAsset?.productFidelityConfirmed && v.creativeAsset.rightsStatus!=='UNKNOWN');
 const titleRisk=detectUnsupportedPinClaims(v.narrative.pinterestTitle).length>0;
 const descriptionRisks=detectUnsupportedPinClaims(v.narrative.description);
 const unsafeCopy=titleRisk||descriptionRisks.length>0;
 const copyReady=Boolean(v.narrative.pinterestTitle.trim()&&v.narrative.description.trim()&&!unsafeCopy);
 const steps=[
  {name:shopee
    ?loc(locale,'Marcar Shopee ao publicar','Tag Shopee when posting','Etiquetar Shopee al publicar')
    :loc(locale,'Conferir link','Confirm affiliate link','Confirmar enlace'),
   done:shopee||hasAffiliate,target:shopee?'#review-final':'#review-product'},
  {name:loc(locale,'Escolher e copiar textos','Choose and copy text','Elegir y copiar textos'),
   done:copyReady,target:'#review-copy-editor'},
  {name:loc(locale,'Preparar imagem','Prepare image','Preparar imagen'),
   done:hasImage,target:v.creativePack?'#review-images':'#review-creative'},
  {name:loc(locale,'Revisar para publicar','Review before posting','Revisar publicación'),
   done:['PUBLICATION_READY','PUBLISHED'].includes(campaign.status),target:'#review-blockers'},
 ];
 const current=steps.find(s=>!s.done)??steps[steps.length-1]!;
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
   <div><p className="eyebrow">{loc(locale,'SEU PIN · PRÓXIMA AÇÃO','YOUR PIN · NEXT ACTION','TU PIN · SIGUIENTE PASO')}</p>
    <h2>{current.name}</h2>
    <p>{loc(locale,'Sua campanha já está salva. Escolha uma ação abaixo; os detalhes ficam disponíveis quando precisar.','Your campaign is saved. Choose an action; details are available below.','Tu campaña está guardada. Elige una acción.')}</p>
   </div>
   {current.target==="#review-copy-editor"
    ?<button type="button" className="button primary guided-next-cta" onClick={openCopyEditor}>{current.name} →</button>
    :<a className="button primary guided-next-cta" href={current.target}>{current.name} →</a>}
  </div>
  {copyEditorOpen&&<InlinePinCopyChooser campaign={campaign} editable={editable} onUpdate={onUpdate}
     onClose={()=>setCopyEditorOpen(false)} onComplete={synced=>setCopyFeedback(synced?"synced":"local")}
     onCopyTitle={text=>void copy(text,"title")} onCopyDescription={text=>void copy(text,"description")}/>}
  {copyFeedback&&<p className={copyFeedback==="local"?"guided-copy-sync-warning":"guided-copy-complete"} role="status">
    {copyFeedback==="synced"
     ?loc(locale,"Textos escolhidos e aplicados. Agora copie os campos abaixo ou continue para a imagem.","Selected copy applied. Copy the fields below or continue to the image.","Textos aplicados. Copia los campos o continúa con la imagen.")
     :loc(locale,"Texto aplicado, mas a sincronização do Creative Pack não foi confirmada. Confira sua conexão antes de publicar.","Copy applied, but Creative Pack sync is unconfirmed. Check the connection before posting.","Textos aplicados, pero la sincronización no se confirmó.")}
  </p>}
  {shopee&&<p className="guided-shopee-note">{loc(locale,
   'Shopee: a marcação de afiliado é conferida na publicação. Prepare os textos e a imagem agora.',
   'Shopee tagging is confirmed at publication. Prepare copy and image now.',
   'Shopee: la etiqueta se confirma al publicar. Prepara textos e imagen.')}</p>}
  <nav className="guided-review-shortcuts" aria-label={loc(locale,'Ir para uma tarefa','Jump to a task','Ir a una tarea')}>
   <button type="button" onClick={openCopyEditor}>{loc(locale,'Escolher textos','Choose text','Elegir textos')}</button>
   <a href="#review-ai">{loc(locale,'NestAI (opcional)','NestAI (optional)','NestAI (opcional)')}</a>
   <a href="#review-product">{loc(locale,'Link','Affiliate link','Enlace')}</a>
   <a href={v.creativePack?'#review-images':'#review-creative'}>{loc(locale,'Imagem','Image','Imagen')}</a>
   <a href="#review-blockers">{loc(locale,'Aprovação','Approval','Aprobación')}</a>
   <a href="#pin-preview">{loc(locale,'Prévia do Pin','Pin preview','Vista previa')}</a>
  </nav>
  {unsafeCopy&&<div className="guided-copy-truth-warning" role="alert">
   <strong>{loc(locale,'Texto salvo precisa de correção antes de publicar','Saved copy needs correction before publishing','El texto guardado requiere corrección')}</strong>
   <p>{loc(locale,'Encontramos promessas sobre o desempenho do produto que não foram comprovadas. O texto continua no histórico, mas não pode ser copiado para publicação até você escolher uma alternativa segura.','Unverified product performance claims were found. Choose a safe alternative before copying or publishing.','Encontramos afirmaciones sobre el producto sin verificar. Selecciona un texto seguro.')}</p>
   <button type="button" className="guided-choose-safe-text" onClick={openCopyEditor}>{loc(locale,'Escolher textos seguros aqui →','Choose safe text here →','Elegir texto seguro aquí →')}</button>
  </div>}
  <div className="guided-copy-preview">
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
  <a className="guided-more-copy" href="#review-ai">{loc(locale,'Não gostou? Criar novos textos com NestAI →','Want better copy? Generate with NestAI →','¿Otros textos? Crear con NestAI →')}</a>
 </section>;
}
