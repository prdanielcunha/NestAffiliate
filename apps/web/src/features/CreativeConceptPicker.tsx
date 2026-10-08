import {useEffect,useRef,useState} from 'react';
import type {CampaignVersion,PinterestCreativePack} from '@nestaffiliate/core';
import {renderPin} from '@nestaffiliate/creative-engine';
import {useI18n} from '../lib/i18n-context';

/** These templates are used for both the thumbnails and the final exported PNG. */
export const V5_CONCEPT_TEMPLATES=['Problem → Solution','Room Inspiration','Editorial Light'] as const;
export function templateForConcept(index:number):string{
 return V5_CONCEPT_TEMPLATES[index%V5_CONCEPT_TEMPLATES.length]!;
}

/** Render with the actual production canvas renderer; never show a synthetic product image. */
function ConceptCanvas({version,index,conceptId}:{version:CampaignVersion;index:number;conceptId:string}){
 const canvasRef=useRef<HTMLCanvasElement>(null);
 const [renderError,setRenderError]=useState(false);
 useEffect(()=>{
  const canvas=canvasRef.current;
  if(!canvas)return;
  let cancelled=false;
  const currentConceptId=version.creativePack?.recommendedConceptId;
  const staged:CampaignVersion={
   ...version,template:templateForConcept(index),
   creativeAsset:currentConceptId===conceptId?version.creativeAsset:undefined,
  };
  setRenderError(false);
  void renderPin(canvas,staged).catch(()=>{if(!cancelled)setRenderError(true);});
  return ()=>{cancelled=true;};
 },[version,index,conceptId]);
 return <div className={'concept-visual concept-visual-'+index} aria-hidden="true">
  <canvas className="concept-rendered-canvas" ref={canvasRef} width={1000} height={1500}/>
  {renderError&&<span className="concept-render-error">Prévia indisponível</span>}
 </div>;
}

export function CreativeConceptPicker({pack,version,disabled,onSelect}:{
 pack:PinterestCreativePack;version:CampaignVersion;disabled?:boolean;onSelect:(conceptId:string)=>void;
}){
 const {t,locale}=useI18n();const pt=locale==='pt-BR',es=locale==='es';
 return <div className="concept-grid concept-grid-v5" aria-label={t('creativeConcepts')}>
 {pack.imageConcepts.map((concept,index)=>{
  const selected=concept.id===pack.recommendedConceptId;
  return <button type="button" className={selected?'concept-card selected':'concept-card'}
     key={concept.id} disabled={disabled} aria-pressed={selected} onClick={()=>onSelect(concept.id)}>
   <ConceptCanvas version={version} index={index} conceptId={concept.id}/>
   <div className="concept-info">
    <span className="concept-index">{String(index+1).padStart(2,'0')}</span>
    <strong>{concept.title}</strong>
    <p>{concept.rationale}</p>
    <small>{t('creativeScore')}: {concept.score}/100 · {pt?'Render real · 2:3':es?'Render real · 2:3':'Real renderer · 2:3'}</small>
    <small>{pt?'A foto aparece apenas após autorização; não é uma imagem simulada.':es?'Foto solo con derechos confirmados.':'Photos appear only after rights confirmation.'}</small>
   </div>
   {selected&&<span className="recommended-chip">{t('recommended')}</span>}
  </button>;
 })}
 </div>;
}
