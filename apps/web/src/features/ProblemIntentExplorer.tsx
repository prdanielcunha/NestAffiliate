import {useState} from 'react';
import {PROBLEM_INTENTS,type ProblemIntent} from '@nestaffiliate/radar';
import {useI18n} from '../lib/i18n-context';

export interface IntentSearchFeedback{
 query:string;
 phase:'searching'|'success'|'partial'|'empty'|'error';
 count?:number;
 detail?:string;
}
export function ProblemIntentExplorer({onSearch,busy=false,feedback}:{
 onSearch:(query:string)=>void;busy?:boolean;feedback?:IntentSearchFeedback|null;
}){
 const {locale}=useI18n();const [selected,setSelected]=useState<ProblemIntent|null>(null);
 const pt=locale==='pt-BR',es=locale==='es';
 const active=selected&&feedback?.query===selected.keyword?feedback:null;
 const phase=active?.phase;
 const message=phase==='searching'
   ?pt?'Consultando ofertas oficiais. Aguarde…':es?'Consultando ofertas oficiales…':'Checking official listings…'
   :phase==='success'
    ?pt?`Pesquisa concluída: ${active?.count??0} produto(s) encontrado(s). Veja os resultados abaixo.`
      :es?`Búsqueda terminada: ${active?.count??0} producto(s). Consulta los resultados abajo.`
      :`Search complete: ${active?.count??0} product(s). See results below.`
   :phase==='partial'
    ?pt?`Pesquisa parcial: ${active?.count??0} produto(s) encontrado(s). Uma fonte não respondeu; confira os avisos.`
      :es?`Búsqueda parcial: ${active?.count??0} producto(s). Falta una fuente.`
      :`Partial search: ${active?.count??0} product(s). One source failed.`
   :phase==='empty'
    ?pt?'Pesquisa concluída: nenhuma oferta retornada para este termo. Tente outra palavra-chave.'
      :es?'Búsqueda terminada: sin ofertas. Prueba otra palabra.'
      :'Search complete: no offers found. Try another keyword.'
   :phase==='error'
    ?pt?'Não foi possível concluir a pesquisa. Consulte a causa e a alternativa abaixo.'
      :es?'No se pudo completar la búsqueda. Revisa el motivo y la alternativa abajo.'
      :'Research failed. See the cause and alternate path below.'
   :'';
 return <section className="intent-explorer" aria-label={pt?'Encontrar oportunidades por problemas':es?'Buscar por problemas':'Research by real-life problems'}>
   <div className="intent-header"><div>
     <p className="eyebrow">WINNING PRODUCT RADAR · 5.0</p>
     <h2>{pt?'Que problema vale resolver?':es?'¿Qué problema queremos resolver?':'Which problem is worth solving?'}</h2>
     <p>{pt?'Comece pela necessidade. O app pesquisará ofertas reais, não inventará demanda.':es?'Partimos de la necesidad; investigamos ofertas sin inventar demanda.':'Start with a need. We investigate real listings without inventing search demand.'}</p>
   </div><span className="intent-evidence">{pt?'Hipóteses editoriais':es?'Hipótesis editoriales':'Editorial hypotheses'}</span></div>
   <div className="intent-options">{PROBLEM_INTENTS.map(intent=><button key={intent.id} type="button" disabled={busy} aria-pressed={selected?.id===intent.id} className={selected?.id===intent.id?'active':''} onClick={()=>setSelected(intent)}>{intent.problem[locale]}</button>)}</div>
   {selected&&<div className="intent-detail">
     <div><strong>{selected.problem[locale]}</strong><p>{selected.hypothesis[locale]}</p>
       <small>{pt?'Hipótese não significa procura comprovada. Compare origem, preço, reputação e comissões depois da busca.':es?'Una hipótesis no demuestra demanda. Verifique la evidencia.':'A hypothesis is not measured demand. Check listing evidence after search.'}</small>
     </div>
     <button type="button" className="button primary" aria-busy={busy} disabled={busy} onClick={()=>onSearch(selected.keyword)}>
       {busy?<><span className="intent-search-spinner" aria-hidden="true"/>{pt?'Pesquisando ofertas…':es?'Buscando ofertas…':'Researching offers…'}</>:
       <>{phase==='error'?(pt?'Tentar pesquisa novamente':es?'Reintentar búsqueda':'Retry search'):
          pt?'Pesquisar produtos para isso':es?'Buscar productos':'Research matching products'} <span aria-hidden="true">→</span></>}
     </button>
     {active&&<div className={'intent-search-status intent-search-'+phase} role={phase==='error'?'alert':'status'} aria-live="polite" aria-atomic="true">
       {phase==='searching'&&<span className="intent-search-spinner" aria-hidden="true"/>}
       <strong>{phase==='success'?'✓':phase==='partial'?'!':phase==='empty'?'i':phase==='error'?'!':''} {message}</strong>
       {active.detail&&phase!=='searching'&&<small>{active.detail}</small>}
     </div>}
   </div>}
 </section>;
}
