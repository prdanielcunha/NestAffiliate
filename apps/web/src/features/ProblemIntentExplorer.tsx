import {useState} from 'react';
import {PROBLEM_INTENTS,type ProblemIntent} from '@nestaffiliate/radar';
import {useI18n} from '../lib/i18n-context';

export function ProblemIntentExplorer({onSearch,busy=false}:{onSearch:(query:string)=>void;busy?:boolean}){
 const {locale}=useI18n();const [selected,setSelected]=useState<ProblemIntent|null>(null);
 const pt=locale==='pt-BR',es=locale==='es';
 return <section className="intent-explorer" aria-label={pt?'Encontrar oportunidades por problemas':es?'Buscar por problemas':'Research by real-life problems'}>
  <div className="intent-header"><div>
   <p className="eyebrow">WINNING PRODUCT RADAR · 5.0</p>
   <h2>{pt?'Que problema vale resolver?':es?'¿Qué problema queremos resolver?':'Which problem is worth solving?'}</h2>
   <p>{pt?'Comece pela necessidade. O app pesquisará ofertas reais, não inventará demanda.':es?'Partimos de la necesidad; investigamos ofertas sin inventar demanda.':'Start with a need. We investigate real listings without inventing search demand.'}</p>
  </div><span className="intent-evidence">{pt?'Hipóteses editoriais':es?'Hipótesis editoriales':'Editorial hypotheses'}</span></div>
  <div className="intent-options">{PROBLEM_INTENTS.map(intent=><button key={intent.id} type="button" aria-pressed={selected?.id===intent.id} className={selected?.id===intent.id?'active':''} onClick={()=>setSelected(intent)}>{intent.problem[locale]}</button>)}</div>
  {selected&&<div className="intent-detail">
   <div><strong>{selected.problem[locale]}</strong><p>{selected.hypothesis[locale]}</p>
    <small>{pt?'Hipótese não significa procura comprovada. Compare origem, preço, reputação e comissões depois da busca.':es?'Una hipótesis no demuestra demanda. Verifique la evidencia.':'A hypothesis is not measured demand. Check listing evidence after search.'}</small>
   </div>
   <button className="button primary" disabled={busy} onClick={()=>onSearch(selected.keyword)}>{pt?'Pesquisar produtos para isso':es?'Buscar productos':'Research matching products'} →</button>
  </div>}
 </section>;
}
