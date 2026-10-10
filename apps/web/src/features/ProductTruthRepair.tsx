import { useEffect, useState } from 'react';
import type { ProductTruth } from '@nestaffiliate/core';
import { cleanSharedListingUrl, cleanSharedProductTitle } from '@nestaffiliate/integrations';
import { isSafeOfferUrl } from '@nestaffiliate/radar';
import { useI18n } from '../lib/i18n-context';

/** Repair old imported research drafts without deleting historical versions. */
export function ProductTruthRepair({product,editable,onRepair}:{
  product:ProductTruth;
  editable:boolean;
  onRepair:(title:string,url:string)=>void;
}) {
  const {locale}=useI18n();
  const [title,setTitle]=useState(()=>cleanSharedProductTitle(product.title.value));
  const [url,setUrl]=useState(()=>cleanSharedListingUrl(product.url.value) || product.url.value);
  const [error,setError]=useState('');
  useEffect(()=>{
    setTitle(cleanSharedProductTitle(product.title.value));
    setUrl(cleanSharedListingUrl(product.url.value) || product.url.value);
    setError('');
  },[product.title.value,product.url.value]);
  // Only allow repair of unverified and non-attributed manual research drafts.
  if(product.listingVerified || product.affiliateUrl ||
     !['user-provided','user-corrected'].includes(product.title.source))return null;
  function commit(){
    const cleanTitle=cleanSharedProductTitle(title);
    const cleanUrl=cleanSharedListingUrl(url);
    let safe=isSafeOfferUrl(cleanUrl,product.marketplace);
    try{
      const parsed=new URL(cleanUrl);
      if(product.marketplace==='MELI' && parsed.hostname==='meli.la' &&
         parsed.protocol==='https:' && !parsed.username && !parsed.password && !parsed.port)safe=true;
    }catch{/* handled below */}
    if(cleanTitle.length<8 || !safe){
      setError(locale==='pt-BR'?'Informe um título e um link seguro do marketplace.':locale==='es'?'Indica un título y enlace seguro.':'Enter a title and a safe marketplace link.');
      return;
    }
    if(cleanTitle===product.title.value && cleanUrl===product.url.value){
      setError(locale==='pt-BR'?'Os dados já estão iguais aos salvos.':locale==='es'?'Los datos ya coinciden.':'The information is already unchanged.');
      return;
    }
    onRepair(cleanTitle,cleanUrl);
  }
  return <details className="advanced-fields product-truth-repair">
    <summary>{locale==='pt-BR'?'Corrigir título ou link importado':locale==='es'?'Corregir título o enlace':'Fix imported title or link'}</summary>
    <p className="field-hint">{locale==='pt-BR'
      ? 'Esta alteração cria uma nova versão da campanha. Ela não valida o anúncio, a comissão nem a imagem.'
      : locale==='es'?'Se crea una nueva versión sin verificar el anuncio o la comisión.'
        :'This creates a new version; it does not verify the listing, commission or image.'}</p>
    <label>{locale==='pt-BR'?'Título do produto':'Product title'}
      <input value={title} onChange={e=>setTitle(e.target.value)} disabled={!editable}/>
    </label>
    <label>{locale==='pt-BR'?'Link do anúncio':'Product link'}
      <input value={url} onChange={e=>setUrl(e.target.value)} inputMode="url" disabled={!editable}/>
    </label>
    {error&&<p className="field-error" role="alert">{error}</p>}
    <button className="button secondary" type="button" disabled={!editable} onClick={commit}>
      {locale==='pt-BR'?'Salvar dados corrigidos':locale==='es'?'Guardar corrección':'Save corrected information'}
    </button>
  </details>;
}
