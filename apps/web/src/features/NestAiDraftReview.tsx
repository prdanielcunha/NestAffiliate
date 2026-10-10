import {useState} from 'react';
import type {Campaign} from '@nestaffiliate/core';
import {useAuth} from '../lib/auth';
import {useI18n} from '../lib/i18n-context';
import {generateAffiliatePinCopy,type AffiliatePinCopy} from '../services/nestAiClient';

export type PinCopyDraft={title:string;description:string;tags:string[]};
/** An AI suggestion cannot silently mutate affiliate Product Truth, commission or approved copy. */
export function sanitizePinCopyDraft(raw:AffiliatePinCopy):PinCopyDraft{
 const title=typeof raw?.title==='string'?raw.title.replace(/\s+/g,' ').trim().slice(0,100):'';
 const description=typeof raw?.description==='string'?raw.description.trim().slice(0,500):'';
 const tags=Array.isArray(raw?.tags)?[...new Set(raw.tags.filter((s):s is string=>typeof s==='string').map(x=>x.trim()).filter(Boolean))].slice(0,12):[];
 if(title.length<8||description.length<15)throw new Error('NESTAI_EMPTY_OR_INVALID_DRAFT');
 return {title,description,tags};
}
export function NestAiDraftReview({campaign,editable,onApply}:{
 campaign:Campaign;editable:boolean;onApply:(draft:PinCopyDraft)=>void;
}){
 const {locale}=useI18n();const {user,organizationId}=useAuth();
 const pt=locale==='pt-BR',es=locale==='es';
 const [instruction,setInstruction]=useState(pt?'Crie um título atraente e uma descrição útil, sem prometer benefícios não verificados.':'Create useful Pinterest editorial copy without unverified commercial claims.');
 const [busy,setBusy]=useState(false);
 const [draft,setDraft]=useState<PinCopyDraft|null>(null);
 const [error,setError]=useState('');
 const [status,setStatus]=useState<'idle'|'ready'|'applied'>('idle');
 const product=campaign.currentVersion.product;
 async function generate(){
  if(!editable||!user||!organizationId||busy)return;
  setBusy(true);setDraft(null);setError('');setStatus('idle');
  try{
   const result=await Promise.race([generateAffiliatePinCopy({
     user,organizationId,locale,
     instruction,
     product:{
       title:product.title.value,marketplace:product.marketplace,
       price:product.price?.value,currency:product.currency?.value,
       seller:product.sellerName?.value,
       availability:product.availability?.value,
       sourceNotes:[product.title.source,product.price?.source,product.url.source].filter(Boolean) as string[],
     },
     deterministicPack:campaign.currentVersion.creativePack?{
       primaryKeyword:campaign.currentVersion.creativePack.copy.primaryKeyword,
       keywords:campaign.currentVersion.creativePack.copy.keywords,
       recommendedAngle:campaign.currentVersion.creativePack.creativeDirection.useCase,
     }:undefined,
   }),new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error('NESTAI_TIMEOUT')),30000))]);
   setDraft(sanitizePinCopyDraft(result));setStatus('ready');
  }catch{
   setError(pt?'O NestAI não respondeu ou recusou esta tarefa. Seus textos existentes foram preservados. Você pode continuar pelo Creative Pack, sem perda de dados.':es?'NestAI no respondió. Tus textos existentes se mantienen; puedes continuar manualmente.':'NestAI unavailable. Your existing content is unchanged. Continue with the Creative Pack.');
  }finally{setBusy(false);}
 }
 return <section className="nestai-review-draft" aria-label={pt?'Criar textos com NestAI':es?'Crear textos con NestAI':'Create copy with NestAI'}>
   <div className="nestai-review-intro">
    <div><p className="eyebrow">NESTAI · TEXTO OPCIONAL</p>
      <h3>{pt?'Quer que a IA sugira título e descrição aqui mesmo?':es?'¿Quieres sugerencias de título y descripción aquí?':'Want AI title and description suggestions right here?'}</h3>
      <p>{pt?'Gere uma sugestão, leia o resultado e decida se deseja aplicar. Sua campanha não muda até você confirmar.':es?'Genera una propuesta, revísala y decide si aplicarla.':'Generate a suggestion, review it and choose whether to apply it.'}</p>
    </div>
   </div>
   <label className="nestai-instruction-label" htmlFor="nestai-copy-instruction">
     {pt?'Orientação para a IA':es?'Instrucciones para IA':'AI guidance'}
   </label>
   <textarea id="nestai-copy-instruction" rows={2} maxLength={500} value={instruction}
    onChange={e=>setInstruction(e.target.value)} disabled={!editable||busy}/>
   <button type="button" className="button secondary" disabled={!editable||!user||!organizationId||busy}
     aria-busy={busy} onClick={()=>void generate()}>
     {busy?(pt?'Gerando sugestões…':es?'Generando propuestas…':'Generating suggestions…'):(pt?'Sugerir título e descrição com NestAI':es?'Sugerir título y descripción con NestAI':'Suggest title and description with NestAI')}
   </button>
   {busy&&<p role="status" aria-live="polite">{pt?'Conectando ao NestAI com sua sessão autorizada…':es?'Conectando con NestAI…':'Connecting to NestAI with your authorized session…'}</p>}
   {error&&<p className="notice danger" role="alert">{error}</p>}
   {draft&&<div className="nestai-draft-preview" aria-label={pt?'Prévia do texto da IA':'AI copy preview'}>
      <p className="eyebrow">{pt?'PROPOSTA · AINDA NÃO SALVA':es?'PROPUESTA · SIN GUARDAR':'SUGGESTION · NOT SAVED'}</p>
      <label>{pt?'Título':es?'Título':'Title'}</label><strong>{draft.title}</strong>
      <label>{pt?'Descrição':es?'Descripción':'Description'}</label><p>{draft.description}</p>
      <small>{pt?'O aviso de afiliado da campanha será mantido. Confira que não existem promessas sem fonte.':es?'Se conservará la divulgación de afiliado. Verifica cada afirmación.':'Existing affiliate disclosure is preserved. Review unsupported claims.'}</small>
      <div className="nestai-draft-actions"><button type="button" className="button primary" disabled={!editable} onClick={()=>{onApply(draft);setStatus('applied');setDraft(null);}}>
       {pt?'Usar estes textos e salvar':es?'Usar estos textos y guardar':'Use and save these texts'}
      </button><button type="button" className="button secondary" onClick={()=>setDraft(null)}>{pt?'Descartar sugestão':es?'Descartar':'Discard suggestion'}</button></div>
   </div>}
   {status==='applied'&&<p className="success-text" role="status">{pt?'Título e descrição salvos. Confira o Pin na prévia e continue para a imagem.':es?'Textos guardados. Comprueba la vista previa.':'Title and description saved. Check the preview and continue to the image.'}</p>}
   <small className="nestai-review-safety">{pt?'Usa o NestAI autenticado. Não gera ou valida links de comissão e não publica no Pinterest. Se a API não estiver disponível, o Creative Pack continua funcionando.':es?'Usa NestAI autorizado; no valida comisiones ni publica automáticamente.':'Uses authenticated NestAI. Does not verify affiliate links or publish; deterministic Creative Pack remains available.'}</small>
 </section>;
}
