import {useState} from 'react';
import type {Campaign} from '@nestaffiliate/core';
import {useI18n} from '../lib/i18n-context';

function loc(locale:string,pt:string,en:string,es:string){
 return locale==='pt-BR'?pt:locale==='es'?es:en;
}
export function GuidedReviewActions({campaign}: {campaign:Campaign}){
 const {locale}=useI18n();
 const [copied,setCopied]=useState<'title'|'description'|null>(null);
 const v=campaign.currentVersion;
 const hasAffiliate=Boolean(v.product.affiliateUrl?.value);
 const hasImage=Boolean(v.creativeAsset?.productFidelityConfirmed && v.creativeAsset.rightsStatus!=='UNKNOWN');
 const copyReady=Boolean(v.narrative.pinterestTitle.trim()&&v.narrative.description.trim());
 const steps=[
  {name:loc(locale,'Conferir link','Confirm affiliate link','Confirmar enlace'),
   done:hasAffiliate,target:'#review-product'},
  {name:loc(locale,'Escolher e copiar textos','Choose and copy text','Elegir y copiar textos'),
   done:copyReady&&v.creativeIntelligence?.origin==='nestai',target:'#review-ai'},
  {name:loc(locale,'Preparar imagem','Prepare image','Preparar imagen'),
   done:hasImage,target:'#review-images'},
  {name:loc(locale,'Revisar para publicar','Review before posting','Revisar publicación'),
   done:['PUBLICATION_READY','PUBLISHED'].includes(campaign.status),target:'#review-blockers'},
 ];
 const current=steps.find(s=>!s.done)??steps[steps.length-1]!;
 async function copy(text:string,which:'title'|'description'){
  try{await navigator.clipboard.writeText(text);setCopied(which);}
  catch{setCopied(null);}
 }
 return <section className="guided-review-actions" aria-label={loc(locale,'Próxima ação e textos do Pin','Next step and Pin text','Siguiente paso y textos')}>
  <div className="guided-review-top">
   <div><p className="eyebrow">{loc(locale,'SEU PIN · PRÓXIMA AÇÃO','YOUR PIN · NEXT ACTION','TU PIN · SIGUIENTE PASO')}</p>
    <h2>{current.name}</h2>
    <p>{loc(locale,'Sua campanha já está salva. Escolha uma ação abaixo; os detalhes ficam disponíveis quando precisar.','Your campaign is saved. Choose an action; details are available below.','Tu campaña está guardada. Elige una acción.')}</p>
   </div>
   <a className="button primary guided-next-cta" href={current.target}>{current.name} →</a>
  </div>
  <nav className="guided-review-shortcuts" aria-label={loc(locale,'Ir para uma tarefa','Jump to a task','Ir a una tarea')}>
   <a href="#review-ai">{loc(locale,'Textos + IA','Copy + AI','Textos + IA')}</a>
   <a href="#review-product">{loc(locale,'Link','Affiliate link','Enlace')}</a>
   <a href="#review-images">{loc(locale,'Imagem','Image','Imagen')}</a>
   <a href="#review-blockers">{loc(locale,'Aprovação','Approval','Aprobación')}</a>
  </nav>
  <div className="guided-copy-preview">
   <div className="guided-copy-field">
    <div><span>{loc(locale,'Título para o Pinterest','Pinterest title','Título de Pinterest')}</span>
     <button type="button" onClick={()=>void copy(v.narrative.pinterestTitle,'title')}
      disabled={!v.narrative.pinterestTitle}>{copied==='title'?loc(locale,'Copiado!','Copied!','¡Copiado!'):loc(locale,'Copiar título','Copy title','Copiar título')}</button>
    </div>
    <p>{v.narrative.pinterestTitle||'—'}</p>
   </div>
   <div className="guided-copy-field">
    <div><span>{loc(locale,'Descrição para o Pinterest','Pinterest description','Descripción de Pinterest')}</span>
     <button type="button" onClick={()=>void copy(v.narrative.description,'description')}
      disabled={!v.narrative.description}>{copied==='description'?loc(locale,'Copiado!','Copied!','¡Copiado!'):loc(locale,'Copiar descrição','Copy description','Copiar descripción')}</button>
    </div>
    <p>{v.narrative.description||'—'}</p>
   </div>
  </div>
  <a className="guided-more-copy" href="#review-ai">{loc(locale,'Não gostou? Criar novos textos com NestAI →','Want better copy? Generate with NestAI →','¿Otros textos? Crear con NestAI →')}</a>
 </section>;
}
