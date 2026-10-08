import {useMemo} from 'react';
import type {Campaign} from '@nestaffiliate/core';
import {isMarketplaceAffiliateDestination,inspectAffiliateAttestation} from '@nestaffiliate/compliance';
import {useI18n} from '../lib/i18n-context';

/** Recovery state comes exclusively from persisted campaign data. No fake session-progress writes. */
export function CreativeWorkflowGuide({campaign}:{campaign:Campaign}){
 const {locale}=useI18n();const pt=locale==='pt-BR',es=locale==='es';
 const version=campaign.currentVersion,product=version.product;
 const steps=useMemo(()=>{
  const offer=Boolean(product.listingVerified&&product.externalId);
  const commission=product.marketplace==='MELI' ?
    isMarketplaceAffiliateDestination(product.affiliateUrl?.value,product.marketplace)&&inspectAffiliateAttestation(product)==='SELF_CONFIRMED'
    :Boolean(product.affiliateUrl?.value);
  const planned=Boolean(version.creativePack);
  const image=Boolean(version.creativeAsset?.productFidelityConfirmed&&version.creativeAsset?.rightsStatus!=='UNKNOWN');
  const published=campaign.status==='PUBLISHED';
  return [
    {label:pt?'Conferir oferta':es?'Comprobar oferta':'Verify offer',done:offer,id:'review-product'},
    {label:pt?'Confirmar link':es?'Confirmar enlace':'Confirm link',done:commission,id:'review-product'},
    {label:pt?'Escolher visual':es?'Elegir concepto':'Choose direction',done:planned,id:'review-creative'},
    {label:pt?'Revisar imagem':es?'Revisar imagen':'Review image',done:image,id:'review-creative'},
    {label:pt?'Publicar e medir':es?'Publicar y medir':'Publish and learn',done:published,id:'review-final'},
  ];
 },[campaign.status,product,version.creativePack,version.creativeAsset,pt,es]);
 const next=steps.find(s=>!s.done)??steps[steps.length-1]!;
 return <section className="creative-workflow-guide" aria-label={pt?'Seu progresso para publicar':es?'Progreso para publicar':'Publication readiness'}>
  <div className="creative-workflow-intro"><div><p className="eyebrow">SEU CAMINHO · NESTAFFILIATE 5.0</p>
   <h2>{pt?'Sua próxima oportunidade, sem complicação':es?'Tu próxima oportunidad':'Your next opportunity, made simple'}</h2>
   <p>{pt?'Etapas reconhecidas pelas versões salvas da campanha. O app nunca presume direitos sobre fotos ou comissões.':es?'Pasos recuperados desde tu campaña guardada.':'Progress is derived from your saved campaign; photo rights and commission are never assumed.'}</p></div>
   <button className="button secondary" type="button" onClick={()=>document.getElementById(next.id)?.scrollIntoView({behavior:'smooth',block:'start'})}>{next.label} →</button>
  </div>
  <ol>{steps.map((s,i)=><li key={s.label} className={s.done?'done':s===next?'current':''}>
   <span>{s.done?'✓':i+1}</span><small>{s.label}</small>
  </li>)}</ol>
 </section>;
}
