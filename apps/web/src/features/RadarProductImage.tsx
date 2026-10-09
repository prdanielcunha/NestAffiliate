import {useEffect,useState} from 'react';
import type {ProductTruth} from '@nestaffiliate/core';
import {useI18n} from '../lib/i18n-context';

/** Marketplace thumbnails are consultative only; a broken hotlink is never an authorized replacement. */
export function RadarProductImage({product}:{product:ProductTruth}){
 const {locale}=useI18n();
 const [failed,setFailed]=useState(false);
 const [loaded,setLoaded]=useState(false);
 const src=product.imageUrl?.value?.trim();
 const safe=Boolean(src && /^https:\/\/[^\s]+$/i.test(src));
 useEffect(()=>{setFailed(false);setLoaded(false)},[src]);
 const status=failed||!safe?'unavailable':loaded?'ready':'loading';
 const message=locale==='pt-BR'?'Imagem indisponível na fonte':locale==='es'?'Imagen no disponible en origen':'Image unavailable at source';
 return <div className={'radar-product-media radar-product-media-'+status}>
   {safe&&!failed&&<img src={src} loading="lazy" alt={product.title.value}
     onLoad={()=>setLoaded(true)} onError={()=>{setFailed(true);setLoaded(false)}}/>}
   {status==='loading'&&<span className="radar-image-placeholder radar-image-loading" role="status" aria-label={locale==='pt-BR'?'Carregando foto do anúncio':locale==='es'?'Cargando imagen':'Loading product image'} />}
   {status==='unavailable'&&<div className="radar-image-placeholder radar-image-unavailable">
     <span aria-hidden="true" className="radar-image-icon">▧</span>
     <span>{message}</span>
     <small>{locale==='pt-BR'?'A foto não foi substituída por uma imagem inventada.':locale==='es'?'No se ha sustituido por una foto inventada.':'No fabricated substitute image.'}</small>
     {/^https:\/\//.test(product.url.value)&&<a href={product.url.value} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()}>{locale==='pt-BR'?'Ver foto no anúncio':locale==='es'?'Ver foto en anuncio':'View on listing'} ↗</a>}
   </div>}
 </div>;
}
