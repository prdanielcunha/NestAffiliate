import {useState, type ReactNode} from 'react';
import {InlinePinCopyChooser} from './InlinePinCopyChooser';
import type {Campaign} from '@nestaffiliate/core';
import {useI18n} from '../lib/i18n-context';
import {inspectAffiliateAttestation,isMarketplaceAffiliateDestination,detectUnsupportedPinClaims} from '@nestaffiliate/compliance';
import {isSafeAffiliateUrl} from '@nestaffiliate/radar';

function loc(locale:string,pt:string,en:string,es:string){
 return locale==='pt-BR'?pt:locale==='es'?es:en;
}
export function GuidedReviewActions({campaign,editable,onUpdate,onStage,onAI,children}: {campaign:Campaign;editable:boolean;onUpdate:(campaign:Campaign)=>void;onStage?:(stage:'text'|'image'|'review')=>void;onAI?:()=>void;children?:ReactNode}){
 const {locale}=useI18n();
 const [copied,setCopied]=useState<'title'|'description'|'link'|null>(null);
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
 const affiliateLink=v.product.affiliateUrl?.value;
 const hasSafeLink=isSafeAffiliateUrl(affiliateLink,v.product.marketplace);
 const steps=[
  {name:loc(locale,'Escolher e copiar textos','Choose and copy text','Elegir y copiar textos'),
   done:copyReady,target:'#review-copy-editor'},
  {name:loc(locale,'Preparar imagem','Prepare image','Preparar imagen'),
   done:hasImage,target:'#review-images'},
  {name:shopee
    ?loc(locale,'Conferir marcação Shopee para publicar','Check Shopee tag before posting','Confirmar etiqueta Shopee')
    :loc(locale,'Conferir link afiliado','Confirm affiliate link','Confirmar enlace afiliado'),
   done:shopee||hasAffiliate,target:'#review-product'},
  {name:loc(locale,'Conferir Pin e publicar','Review Pin and publish','Revisar Pin y publicar'),
   done:['PUBLICATION_READY','PUBLISHED'].includes(campaign.status),target:'#review-blockers'},
 ];
 const current=steps.find(s=>!s.done)??steps[steps.length-1]!;
 async function copy(text:string,which:'title'|'description'|'link'){
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
    :<button type="button" className="button primary guided-next-cta" onClick={()=>onStage?.(current.target==='#review-images'?'image':'review')}>{current.name} →</button>}
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
  <nav className="guided-review-shortcuts" aria-label={loc(locale,'Ações para esta campanha','Campaign tasks','Acciones de campaña')}>
   <button type="button" onClick={openCopyEditor}>{loc(locale,'Escolher textos','Choose text','Elegir textos')}</button>
   <button type="button" onClick={onAI}>{loc(locale,'Criar textos com NestAI (opcional)','AI text (optional)','Textos con IA (opcional)')}</button>
   <button type="button" onClick={()=>onStage?.('image')}>{loc(locale,'Preparar imagem','Prepare image','Preparar imagen')}</button>
   <button type="button" onClick={()=>onStage?.('review')}>{loc(locale,'Conferir link e aprovar','Check link & approve','Revisar enlace y aprobar')}</button>
  </nav>
  {children}
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
    <div className="guided-copy-field guided-copy-link">
     <div><span>{loc(locale,'Link afiliado','Affiliate link','Enlace de afiliado')}</span>
       {hasSafeLink&&<button type="button" onClick={()=>void copy(affiliateLink!,'link')}>{copied==='link'?loc(locale,'Copiado!','Copied!','¡Copiado!'):loc(locale,'Copiar link','Copy link','Copiar enlace')}</button>}
     </div>
     {hasSafeLink?<p>{affiliateLink}</p>:<p>{loc(locale,
       'O link de comissão ainda não foi confirmado. Confira na etapa 3; o link comum do anúncio não garante comissão.',
       'Affiliate link not confirmed. Review in step 3; the normal listing URL does not prove commission.',
       'Enlace de afiliado sin confirmar. Verifícalo en el paso 3.')}</p>}
     {!hasSafeLink&&<button type="button" className="guided-more-copy" onClick={()=>onStage?.('review')}>{loc(locale,'Conferir link na etapa 3 →','Verify link in step 3 →','Verificar enlace en paso 3 →')}</button>}
    </div>
  </div>
  {copyError&&<p role="alert" className="guided-copy-error">{loc(locale,
    'Não foi possível copiar automaticamente. Mantenha pressionado sobre o texto acima para selecionar e copiar.',
    'Automatic copy failed. Press and hold the text above to select and copy.',
    'No se pudo copiar. Mantén pulsado el texto para seleccionarlo.')}</p>}
  <button type="button" className="guided-more-copy" onClick={onAI}>{loc(locale,'Prefere IA? Criar outras sugestões com NestAI →','Want AI? Generate new suggestions with NestAI →','¿Prefieres IA? Generar textos con NestAI →')}</button>
 </section>;
}
