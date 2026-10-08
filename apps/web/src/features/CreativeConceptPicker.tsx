import type { PinterestCreativePack } from '@nestaffiliate/core';
import { useI18n } from '../lib/i18n-context';

/** Thumbnails preview the actual NestAffiliate layout system, not a fabricated AI product photo. */
export function CreativeConceptPicker({pack,disabled,onSelect}:{
 pack:PinterestCreativePack;disabled?:boolean;onSelect:(conceptId:string)=>void;
}){
 const {t,locale}=useI18n();const pt=locale==='pt-BR',es=locale==='es';
 return <div className="concept-grid concept-grid-v5" aria-label={t('creativeConcepts')}>
  {pack.imageConcepts.map((concept,index)=>{
   const selected=concept.id===pack.recommendedConceptId;
   const direction=index%3;
   const headline=direction===0
      ? (pt?'Resolva a rotina':es?'Resuelve tu rutina':'Solve the everyday problem')
      :direction===1?(pt?'Sua casa, sua ideia':es?'Tu espacio, tu idea':'Inspired by real life')
      :(pt?'Escolha funcional':es?'Selección funcional':'Thoughtful function');
   return <button type="button" className={selected?'concept-card selected':'concept-card'}
     key={concept.id} disabled={disabled} aria-pressed={selected} onClick={()=>onSelect(concept.id)}>
    <div className={'concept-visual concept-visual-'+direction} aria-hidden="true">
      <span className="concept-visual-kicker">{direction===0?'PROBLEMA → SOLUÇÃO':direction===1?'INSPIRAÇÃO':'EDITORIAL'}</span>
      <span className="concept-visual-image">{pt?'ESPAÇO PARA FOTO AUTORIZADA':es?'ÁREA DE FOTO AUTORIZADA':'AUTHORIZED PHOTO AREA'}</span>
      <span className="concept-visual-headline">{headline}</span>
      <span className="concept-visual-line"/>
    </div>
    <div className="concept-info">
     <span className="concept-index">{String(index+1).padStart(2,'0')}</span>
     <strong>{concept.title}</strong>
     <p>{concept.rationale}</p>
     <small>{t('creativeScore')}: {concept.score}/100 · {pt?'Prévia de composição':es?'Vista previa de composición':'Layout preview'}</small>
    </div>
    {selected&&<span className="recommended-chip">{t('recommended')}</span>}
   </button>;
  })}
 </div>;
}
