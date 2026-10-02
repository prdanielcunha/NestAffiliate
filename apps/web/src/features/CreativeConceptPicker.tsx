import type { PinterestCreativePack } from '@nestaffiliate/core';
import { useI18n } from '../lib/i18n-context';

export function CreativeConceptPicker({
  pack,
  disabled,
  onSelect,
}:{
  pack:PinterestCreativePack;
  disabled?:boolean;
  onSelect:(conceptId:string)=>void;
}){
  const { t }=useI18n();
  return <div className="concept-grid" aria-label={t('creativeConcepts')}>
    {pack.imageConcepts.map((concept,index)=>{
      const selected=concept.id===pack.recommendedConceptId;
      return <button
        type="button"
        className={selected?'concept-card selected':'concept-card'}
        key={concept.id}
        disabled={disabled}
        onClick={()=>onSelect(concept.id)}
      >
        <span className="concept-index">{String(index+1).padStart(2,'0')}</span>
        <div>
          <strong>{concept.title}</strong>
          <p>{concept.rationale}</p>
          <small>{t('creativeScore')}: {concept.score}/100</small>
        </div>
        {selected && <span className="recommended-chip">{t('recommended')}</span>}
      </button>;
    })}
  </div>;
}
