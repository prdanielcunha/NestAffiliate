import { useState } from 'react';
import type { ProductTruth } from '@nestaffiliate/core';
import { isSafeAffiliateUrl, isSafeOfferUrl } from '@nestaffiliate/radar';
import { useI18n } from '../lib/i18n-context';

/** Keep the real listing separate from the affiliate URL and research-only image. */
export function ProductSourceActions({product,compact=false}:{product:ProductTruth;compact?:boolean}){
  const {locale}=useI18n();
  const [feedback,setFeedback]=useState('');
  const original=isSafeOfferUrl(product.url.value,product.marketplace)?product.url.value:null;
  const affiliate=isSafeAffiliateUrl(product.affiliateUrl?.value,product.marketplace)?product.affiliateUrl!.value:null;
  const es=locale==='es',pt=locale==='pt-BR';
  const labels={
    open:pt?'Abrir anúncio original':es?'Abrir anuncio original':'Open original listing',
    copy:pt?'Copiar URL':es?'Copiar URL':'Copy URL',
    affiliate:pt?'Abrir link afiliado':es?'Abrir enlace afiliado':'Open affiliate link',
    missing:pt?'Anúncio original sem URL oficial segura.':es?'Falta una URL oficial segura.':'No safe original listing URL.',
    research:pt?'Imagem do anúncio para identificação. Reutilização exige autorização.':es?'Imagen solo para consulta. Reutilizar requiere permiso.':'Listing image for research. Reuse requires permission.',
  };
  async function copy(value:string){try{await navigator.clipboard.writeText(value);setFeedback(pt?'Copiado':es?'Copiado':'Copied');}catch{setFeedback(pt?'Não foi possível copiar':es?'No se pudo copiar':'Copy failed');}}
  return <section className={'product-source-actions'+(compact?' compact':'')} aria-label={pt?'Origem do produto':'Product source'}>
    <div className="source-actions-line">
      {original?<a className="button secondary" href={original} target="_blank" rel="noopener noreferrer">{labels.open}</a>:<small role="status">{labels.missing}</small>}
      {original&&<button type="button" className="text-button" onClick={()=>void copy(original)}>{labels.copy}</button>}
      {affiliate&&<><a className="text-button" href={affiliate} target="_blank" rel="noopener noreferrer">{labels.affiliate}</a><button type="button" className="text-button" onClick={()=>void copy(affiliate)}>{pt?'Copiar link afiliado':es?'Copiar enlace afiliado':'Copy affiliate link'}</button></>}
    </div>
    {!compact&&<><p className="source-url">{original??product.url.value}</p>
      {product.imageUrl?.value&&<div className="source-reference"><img src={product.imageUrl.value} alt={product.title.value} loading="lazy"/><span>{labels.research}<br/>{product.assetRights==='UNKNOWN'?'RIGHTS UNKNOWN':product.assetRights}</span></div>}
      <small>{product.marketplace} · {product.externalId} · {product.url.source} · {new Date(product.url.observedAt).toLocaleDateString(locale)}</small>
    </>}
    {feedback&&<small role="status">{feedback}</small>}
  </section>;
}
