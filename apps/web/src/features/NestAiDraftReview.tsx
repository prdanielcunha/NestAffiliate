import {useEffect,useRef,useState} from 'react';
import type {Campaign} from '@nestaffiliate/core';
import {validateCommercialClaims} from '@nestaffiliate/creative-engine';
import {useAuth} from '../lib/auth';
import {useI18n} from '../lib/i18n-context';
import {generateAffiliatePinCopy,generateAffiliatePinStrategy,type AffiliatePinCopy} from '../services/nestAiClient';
import type {ProductAiStrategy} from '../lib/aiProductStrategy';
import {classifyNestAiFailure,type NestAiFailureCode} from '../lib/nestAiFailure';
import {aiSupportDiagnostic,NestAiStageError} from '../lib/nestAiTransport';

export type PinCopyDraft={title:string;description:string;tags:string[];strategy?:ProductAiStrategy};
/** Validate even partial model output; no publishing or product fact mutation. */
export function sanitizePinCopyDraft(raw:AffiliatePinCopy):PinCopyDraft{
 const title=typeof raw?.title==='string'?raw.title.replace(/\s+/g,' ').trim().slice(0,100):'';
 const description=typeof raw?.description==='string'?raw.description.trim().slice(0,500):'';
 const tags=Array.isArray(raw?.tags)?[...new Set(raw.tags.filter((x):x is string=>typeof x==='string')
   .map(x=>x.trim()).filter(Boolean))].slice(0,12):[];
 if(title.length<8||description.length<15)throw new Error('NESTAI_EMPTY_OR_INVALID_DRAFT');
 return {title,description,tags};
}
/** Stronger gate only for the one-copy AI fallback, without breaking legacy drafts. */
function sanitizeAiFallbackCopy(raw:AffiliatePinCopy):PinCopyDraft{
 const draft=sanitizePinCopyDraft(raw);
 if(draft.description.length<70||!/(?:afiliad|affiliate)/i.test(draft.description))
   throw new Error('AI_STRATEGY_INVALID_PARTIAL_COPY');
 if(validateCommercialClaims([draft.title,draft.description]).outcome==='BLOCK')
   throw new Error('AI_STRATEGY_UNSUPPORTED_CLAIM');
 return draft;
}
export function withAiDeadline<T>(promise:Promise<T>,milliseconds:number):Promise<T>{
 return new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>reject(new Error('NESTAI_TIMEOUT')),milliseconds);
  promise.then(value=>{clearTimeout(timeout);resolve(value);},reason=>{clearTimeout(timeout);reject(reason);});
 });
}
type Suggestion={kind:'strategy';data:ProductAiStrategy}|{kind:'copy';data:PinCopyDraft};
export function NestAiDraftReview({campaign,editable,onApply,autoStart=false}:{
 campaign:Campaign;editable:boolean;onApply:(draft:PinCopyDraft)=>void;autoStart?:boolean;
}){
 const {locale}=useI18n();const {user,organizationId}=useAuth();
 const pt=locale==='pt-BR',es=locale==='es';
 const product=campaign.currentVersion.product;
 const [busy,setBusy]=useState(false),[suggestion,setSuggestion]=useState<Suggestion|null>(null);
 const [seconds,setSeconds]=useState(0);
 const [titleIndex,setTitleIndex]=useState(0),[descriptionIndex,setDescriptionIndex]=useState(0);
 const [error,setError]=useState<NestAiFailureCode|null>(null),[saved,setSaved]=useState(false);
 const [errorDetails,setErrorDetails]=useState('');
 const [dismissed,setDismissed]=useState(false);
 const dismissedRef=useRef(false);
 const operation=useRef(0);
 const autoStarted=useRef<string|null>(null);
 const currentCampaignId=campaign.id;
 useEffect(()=>{
  if(!busy){setSeconds(0);return;}
  const timestamp=Date.now();
  const timer=window.setInterval(()=>setSeconds(Math.floor((Date.now()-timestamp)/1000)),1000);
  return ()=>window.clearInterval(timer);
 },[busy]);
 async function requestSuggestions():Promise<Suggestion>{
  if(!user||!organizationId)throw new Error('AUTH_REQUIRED');
  try{
   const strategy=await withAiDeadline(generateAffiliatePinStrategy({user,organizationId,locale,product}),17000);
   return {kind:'strategy',data:strategy};
  }catch(primaryFailure){
   const code=classifyNestAiFailure(primaryFailure);
   // A second AI attempt cannot repair missing permissions or App Check.
   if(code==='AUTH'||code==='APP_CHECK'||
     (primaryFailure instanceof NestAiStageError&&primaryFailure.stage!=='nestai_request'))throw primaryFailure;
   try{
   const copy=await withAiDeadline(generateAffiliatePinCopy({
    user,organizationId,locale,
    instruction:'Create a specific Pinterest Pin title and a 110-450 character description based only on the explicit product name. Mention affiliate link disclosure. Do not invent prices, discounts, materials, technical specs, sales, shipping, reviews or performance. The result is a draft requiring human review.',
    product:{title:product.title.value,marketplace:product.marketplace,
      sourceNotes:['Only attributes explicitly stated in the supplied product title may be claimed.']},
   }),13500);
   return {kind:'copy',data:sanitizeAiFallbackCopy(copy)};
   }catch(fallbackFailure){
    const code=classifyNestAiFailure(fallbackFailure);
    const next=new Error('NESTAI_'+code);
    Object.assign(next,{supportTrace:'estrategia='+aiSupportDiagnostic(primaryFailure)+
      ' | alternativa='+aiSupportDiagnostic(fallbackFailure)});
    throw next;
   }
  }
 }
 function begin(){
  if(!editable||!user||!organizationId||busy)return;
  const id=++operation.current;
  dismissedRef.current=false;setDismissed(false);
  setBusy(true);setSuggestion(null);setError(null);setErrorDetails('');setSaved(false);
  void withAiDeadline(requestSuggestions(),35000)
   .then(data=>{
    if(operation.current!==id||dismissedRef.current)return;
    setSuggestion(data);setTitleIndex(0);setDescriptionIndex(0);
   })
   .catch(reason=>{
    if(operation.current!==id||dismissedRef.current)return;
    setError(classifyNestAiFailure(reason));
    const data=reason as {supportTrace?:unknown};
    setErrorDetails(typeof data?.supportTrace==='string'?data.supportTrace:aiSupportDiagnostic(reason));
   })
   .finally(()=>{if(operation.current===id)setBusy(false);});
 }
 useEffect(()=>{
  if(!autoStart||!editable||!user||!organizationId||
    product.title.source==='link-only-pending'||autoStarted.current===currentCampaignId)return;
  autoStarted.current=currentCampaignId;
  begin();
  // Auto-run exactly once per imported campaign; version changes do not restart it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[currentCampaignId,autoStart,editable,user?.uid,organizationId]);
 useEffect(()=>()=>{operation.current+=1;},[currentCampaignId]);
 const titles=suggestion?.kind==='strategy'?suggestion.data.titles:suggestion?[suggestion.data.title]:[];
 const descriptions=suggestion?.kind==='strategy'?suggestion.data.descriptions:suggestion?[suggestion.data.description]:[];
 return <section className="nestai-review-draft" aria-label={pt?'Criar textos com NestAI':es?'Crear textos con NestAI':'Create copy with NestAI'}>
  <div className="nestai-review-intro">
   <p className="eyebrow">NESTAI · {pt?'PERSONALIZAÇÃO OPCIONAL':es?'PERSONALIZACIÓN OPCIONAL':'OPTIONAL PERSONALIZATION'}</p>
   <h3>{pt?'Personalizar seus textos com IA':es?'Personalizar tus textos con IA':'Personalize copy with AI'}</h3>
   <p>{pt?'Os textos locais do Pin já estão disponíveis abaixo. A IA pode sugerir novos textos, mas nada é substituído sem sua aprovação.'
       :es?'Los textos locales ya están listos. La IA sugiere alternativas sin reemplazarlas hasta que apruebes.'
       :'Local Pin copy is ready below. AI can suggest alternatives, subject to your approval.'}</p>
  </div>
  {busy&&!dismissed&&<div className="nestai-nonblocking-status" role="status" aria-live="polite">
   <strong>{pt?'Consultando NestAI':es?'Consultando NestAI':'Contacting NestAI'} · {seconds}s</strong>
   <p>{seconds>=17
      ?(pt?'A conexão está demorando. Você pode continuar usando os textos locais enquanto verificamos o serviço.':es?'Probando una sugerencia más simple. Puedes continuar con los textos locales.':'Trying a smaller AI suggestion; local copy remains available.')
      :(pt?'Buscando uma sugestão específica sem interromper a revisão.':es?'Buscando una sugerencia sin bloquear la revisión.':'Finding specific copy without blocking your review.')}</p>
   <button className="text-button" type="button" onClick={()=>{dismissedRef.current=true;setDismissed(true);}}>
    {pt?'Continuar com textos locais':es?'Seguir con textos locales':'Continue with local copy'}
   </button>
  </div>}
  {dismissed&&<p className="field-hint">{pt?'Os textos locais seguem prontos para revisão.':'Local copy remains ready for review.'}</p>}
  <button type="button" className="button secondary" disabled={!editable||!user||!organizationId||busy||product.title.source==='link-only-pending'}
   aria-busy={busy} onClick={()=>begin()}>
   {busy?(pt?'Consultando IA…':es?'Consultando IA…':'Asking AI…')
     :(pt?'Tentar personalização com NestAI':es?'Intentar con NestAI':'Try AI personalization')}
  </button>
  {error&&<div className="nestai-fallback-notice" role="status" aria-live="polite">
   <strong>{pt?'A IA não respondeu. Seus 3 títulos e 3 descrições locais continuam prontos.'
     :es?'La IA no respondió. Tus textos locales están disponibles.'
     :'AI is unavailable. Your local titles and descriptions are ready.'}</strong>
   <p>{pt?'Você pode escolher e publicar seus próprios textos abaixo, ou tentar IA novamente depois.'
      :es?'Puedes usar las alternativas locales o intentar la IA de nuevo más tarde.'
      :'Use the local options below or retry AI later.'}</p>
   <a href="#review-copy-editor">{pt?'Ver títulos e descrições disponíveis →':es?'Ver opciones disponibles →':'See available copy →'}</a>
   <details><summary>{pt?'Detalhes para suporte':es?'Detalles de soporte':'Support details'}</summary>
    <code>{error} · {errorDetails}</code>
    <p>{pt?'Envie apenas este diagnóstico ao suporte, nunca tokens ou senhas.':'Share this diagnostic only, never tokens or passwords.'}</p>
    <button type="button" className="button secondary" onClick={()=>{
     if(navigator.clipboard)void navigator.clipboard.writeText(error+' · '+errorDetails).catch(()=>{});
    }}>{pt?'Copiar diagnóstico':'Copy diagnostic'}</button>
   </details>
  </div>}
  {suggestion&&<div className="nestai-draft-preview" role="region" aria-label={pt?'Sugestão da IA para revisão':'AI suggestions to review'}>
   <p className="eyebrow">{suggestion.kind==='copy'
       ?(pt?'SUGESTÃO PARCIAL DE IA · 1 TÍTULO + 1 DESCRIÇÃO':es?'SUGERENCIA PARCIAL DE IA':'PARTIAL AI SUGGESTION')
       :(pt?'ESTRATÉGIA DA IA · NÃO SALVA':es?'ESTRATEGIA DE IA · SIN GUARDAR':'AI STRATEGY · NOT SAVED')}</p>
   {suggestion.kind==='strategy'&&<>
    <strong>{suggestion.data.productType}</strong>
    <p><b>{pt?'Público provável: ':'Likely audience: '}</b>{suggestion.data.audience}</p>
    <p><b>{pt?'Intenção de compra: ':'Buyer intent: '}</b>{suggestion.data.buyerIntent}</p>
    {suggestion.data.unknowns.length>0&&<small>{pt?'Não confirmado: ':'Unconfirmed: '}{suggestion.data.unknowns.join(' · ')}</small>}
   </>}
   <div className="nestai-strategy-choices">
    <div><strong>{pt?'Escolha um título':'Choose a title'}</strong>
     {titles.map((text,i)=><label key={i} className="nestai-strategy-choice">
      <input type="radio" name="nestai-title" checked={titleIndex===i} onChange={()=>setTitleIndex(i)}/>{text}
     </label>)}
    </div>
    <div><strong>{pt?'Escolha uma descrição':'Choose a description'}</strong>
     {descriptions.map((text,i)=><label key={i} className="nestai-strategy-choice">
      <input type="radio" name="nestai-description" checked={descriptionIndex===i} onChange={()=>setDescriptionIndex(i)}/>{text}
     </label>)}
    </div>
   </div>
   <small>{pt?'Sugestões editoriais. Revise os fatos, a imagem e o link antes de aprovar.':'Review facts and affiliate links before approving.'}</small>
   <div className="nestai-draft-actions">
    <button type="button" className="button primary" disabled={!editable} onClick={()=>{
      onApply({title:titles[titleIndex]!,description:descriptions[descriptionIndex]!,
       tags:suggestion.kind==='strategy'?suggestion.data.keywords:suggestion.data.tags,
       ...(suggestion.kind==='strategy'?{strategy:suggestion.data}:{})});
      setSaved(true);setSuggestion(null);
    }}>{pt?'Aplicar sugestão aprovada':es?'Aplicar sugerencia':'Apply approved suggestion'}</button>
    <button type="button" className="button secondary" onClick={()=>setSuggestion(null)}>{pt?'Descartar':'Discard'}</button>
   </div>
  </div>}
  {saved&&<p role="status" className="success-text">{pt?'Textos revisados salvos em uma nova versão.':'Reviewed copy saved in a new version.'}</p>}
  <small className="nestai-review-safety">{pt?'NestAI usa provedores gratuitos quando disponíveis. Os textos locais, o produto e o link afiliado nunca são sobrescritos sem aprovação.':'AI uses free providers when available; no product or affiliate link is replaced.'}</small>
 </section>;
}
