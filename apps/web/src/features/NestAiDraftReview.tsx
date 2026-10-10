import {useState,useRef,useEffect} from 'react';
import type {Campaign} from '@nestaffiliate/core';
import {useAuth} from '../lib/auth';
import {useI18n} from '../lib/i18n-context';
import {generateAffiliatePinStrategy,type AffiliatePinCopy} from '../services/nestAiClient';
import type {ProductAiStrategy} from '../lib/aiProductStrategy';
import {classifyNestAiFailure,nestAiFailureLabel} from '../lib/nestAiFailure';

export type PinCopyDraft={title:string;description:string;tags:string[];strategy?:ProductAiStrategy};
/** Backward-compatible pure sanitizer for legacy advisory copy responses. */
export function sanitizePinCopyDraft(raw:AffiliatePinCopy):PinCopyDraft{
 const title=typeof raw?.title==='string'?raw.title.replace(/\s+/g,' ').trim().slice(0,100):'';
 const description=typeof raw?.description==='string'?raw.description.trim().slice(0,500):'';
 const tags=Array.isArray(raw?.tags)?[...new Set(raw.tags.filter((x):x is string=>typeof x==='string')
   .map(x=>x.trim()).filter(Boolean))].slice(0,12):[];
 if(title.length<8||description.length<15)throw new Error('NESTAI_EMPTY_OR_INVALID_DRAFT');
 return {title,description,tags};
}
export function NestAiDraftReview({campaign,editable,onApply,autoStart=false}:{
 campaign:Campaign;editable:boolean;onApply:(draft:PinCopyDraft)=>void;autoStart?:boolean;
}){
 const {locale}=useI18n();const {user,organizationId}=useAuth();
 const pt=locale==='pt-BR',es=locale==='es';
 const product=campaign.currentVersion.product;
 const [busy,setBusy]=useState(false),[draft,setDraft]=useState<ProductAiStrategy|null>(null);
 const [titleIndex,setTitleIndex]=useState(0),[descriptionIndex,setDescriptionIndex]=useState(0);
 const [error,setError]=useState(''),[saved,setSaved]=useState(false);
 const [dismissed,setDismissed]=useState(false);
 const started=useRef<string|null>(null);
 const dismissedRef=useRef(false);
 const currentCampaignId=campaign.id;
 useEffect(()=>{
  // Background prepare is opt-in through Smart Import, never on arbitrary
  // legacy campaigns; no persisted changes until the user reviews the copy.
  if(!autoStart||!editable||!user||!organizationId||
     product.title.source==='link-only-pending'||started.current===currentCampaignId)return;
  started.current=currentCampaignId;
  let active=true;
  setBusy(true);setError('');setSaved(false);
  void generateAffiliatePinStrategy({user,organizationId,locale,product})
    .then(data=>{if(active&&!dismissedRef.current){setDraft(data);setTitleIndex(0);setDescriptionIndex(0);}})
    .catch(reason=>{if(active&&!dismissedRef.current){
      const code=classifyNestAiFailure(reason);
      setError(nestAiFailureLabel(code,locale)+' ['+code+']');
    }})
    .finally(()=>{if(active)setBusy(false);});
  return ()=>{active=false;};
  // Track by saved campaign ID; later version edits must not restart inference.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[currentCampaignId,autoStart,editable,user?.uid,organizationId]);

 async function generate(){
  if(!editable||!user||!organizationId||busy)return;
  dismissedRef.current=false;setDismissed(false);
  setBusy(true);setDraft(null);setError('');setSaved(false);
  try{
   const data=await Promise.race([
    generateAffiliatePinStrategy({user,organizationId,locale,product}),
    new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error('NESTAI_TIMEOUT')),65000)),
   ]);
   setDraft(data);setTitleIndex(0);setDescriptionIndex(0);
  }catch(reason){
   const code=classifyNestAiFailure(reason);
   setError(nestAiFailureLabel(code,locale)+' ['+code+']');
  }finally{setBusy(false);}
 }
 return <section className="nestai-review-draft" aria-label={pt?'Criar textos com NestAI':es?'Crear textos con NestAI':'Create copy with NestAI'}>
  <div className="nestai-review-intro"><div>
   <p className="eyebrow">NESTAI · ESTRATÉGIA POR PRODUTO</p>
   <h3>{pt?'A IA entende o produto antes de escrever':es?'La IA entiende el producto antes de escribir':'AI understands the product before writing'}</h3>
   <p>{pt?'Analise a intenção de compra, o público provável e três abordagens específicas. Nada será salvo sem sua aprovação.'
     :es?'Analiza el comprador probable y tres enfoques específicos. Solo se guarda con tu aprobación.'
     :'Analyze likely buyer intent and three distinct angles. You approve before saving.'}</p>
  </div></div>
  {busy&&<div className="nestai-nonblocking-status" role="status">
    <strong>{pt?'NestAI está preparando opções':es?'NestAI está preparando opciones':'NestAI is preparing options'}</strong>
    <p>{pt?'O produto já está salvo. Você pode conferir o link ou a imagem enquanto a IA trabalha. Não precisa esperar nesta tela.':es?'El producto ya está guardado. Puedes revisar el enlace y la imagen mientras trabaja la IA.':'Product saved. You can review link and image while AI works.'}</p>
    <button className="text-button" type="button" onClick={()=>{dismissedRef.current=true;setDismissed(true);}}>
      {pt?'Continuar sem esperar':'Continue without waiting'}
    </button>
   </div>}
  {dismissed&&<p className="field-hint">{pt?'A campanha permanece salva. Você pode solicitar novos textos a qualquer momento.':'Campaign saved. You can request new copy later.'}</p>}
  <button type="button" className="button secondary" disabled={!editable||!user||!organizationId||busy||product.title.source==='link-only-pending'}
   aria-busy={busy} onClick={()=>void generate()}>{busy?(pt?'Preparando sugestões…':es?'Preparando opciones…':'Preparing suggestions…')
   :(pt?'Personalizar com NestAI':es?'Personalizar con NestAI':'Personalize with NestAI')}</button>
  {error&&<p className="notice danger" role="alert">{error}</p>}
  {draft&&<div className="nestai-draft-preview">
   <p className="eyebrow">{pt?'ESTRATÉGIA · NÃO SALVA':es?'ESTRATEGIA · SIN GUARDAR':'STRATEGY · NOT SAVED'}</p>
   <strong>{draft.productType}</strong>
   <p><b>{pt?'Público provável: ':es?'Público probable: ':'Likely audience: '}</b>{draft.audience}</p>
   <p><b>{pt?'Intenção de compra: ':es?'Intención: ':'Buyer intent: '}</b>{draft.buyerIntent}</p>
   <p><b>{pt?'Abordagem: ':es?'Enfoque: ':'Positioning: '}</b>{draft.positioning}</p>
   {draft.unknowns.length>0&&<small>{pt?'Não confirmado: ':es?'Datos pendientes: ':'Not confirmed: '}{draft.unknowns.join(' · ')}</small>}
   <div className="nestai-strategy-choices">
    <div><strong>{pt?'Escolha um título':es?'Elige título':'Choose title'}</strong>
     {draft.titles.map((s,i)=><label key={i} className="nestai-strategy-choice">
      <input type="radio" name="nestai-title" checked={titleIndex===i} onChange={()=>setTitleIndex(i)}/>{s}
     </label>)}
    </div>
    <div><strong>{pt?'Escolha uma descrição':es?'Elige descripción':'Choose description'}</strong>
     {draft.descriptions.map((s,i)=><label key={i} className="nestai-strategy-choice">
      <input type="radio" name="nestai-description" checked={descriptionIndex===i} onChange={()=>setDescriptionIndex(i)}/>{s}
     </label>)}
    </div>
   </div>
   <small>{pt?'Os públicos são hipóteses. As características do produto e o link de comissão não são alterados.':'Review suggestions; source product facts stay unchanged.'}</small>
   <div className="nestai-draft-actions">
    <button type="button" className="button primary" disabled={!editable} onClick={()=>{
     onApply({title:draft.titles[titleIndex]!,description:draft.descriptions[descriptionIndex]!,
       tags:draft.keywords,strategy:draft});
     setSaved(true);setDraft(null);
    }}>{pt?'Aplicar textos aprovados':es?'Aplicar textos':'Apply approved copy'}</button>
    <button type="button" className="button secondary" onClick={()=>setDraft(null)}>{pt?'Descartar':'Discard'}</button>
   </div>
  </div>}
  {saved&&<p role="status" className="success-text">{pt?'Nova versão salva. Revise a imagem e o Pin.':'New version saved for review.'}</p>}
  <small className="nestai-review-safety">{pt?'Usa provedores gratuitos do NestAI quando disponíveis. Na falha, seus textos não são substituídos.':'Free NestAI providers when available. No changes on failure.'}</small>
 </section>;
}
