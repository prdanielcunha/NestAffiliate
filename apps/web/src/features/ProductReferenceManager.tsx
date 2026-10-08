import { useEffect, useState } from 'react';
import type { ProductTruth } from '@nestaffiliate/core';
import { canWrite } from '@nestaffiliate/core';
import { isReferenceAiReady } from '@nestaffiliate/radar';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n-context';
import {
 listProductReferences, revokeProductReference, saveOwnedProductReference, type ReferencePreview,
} from '../services/productReferenceRepository';
import { ProductSourceActions } from './ProductSourceActions';

/** Separate consultive marketplace thumbnail from a reusable, rights-attested reference. */
export function ProductReferenceManager({
 product,onChanged,
}:{
 product:ProductTruth;onChanged:(value:ReferencePreview|null)=>void;
}){
 const {locale}=useI18n();
 const identity=useAuth();
 const [items,setItems]=useState<ReferencePreview[]>([]);
 const [source,setSource]=useState<'USER_OWN_PHOTO'|'OWNER_AUTHORIZED'|'LICENSED_MEDIA'>('USER_OWN_PHOTO');
 const [file,setFile]=useState<File|null>(null);
 const [evidence,setEvidence]=useState('');
 const [allowed,setAllowed]=useState(false);
 const [selected,setSelected]=useState<string|null>(null);
 const [loading,setLoading]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const editable=Boolean(identity.role&&canWrite(identity.role));
 const pt=locale==='pt-BR',es=locale==='es';
 useEffect(()=>{
   let active=true;
   onChanged(null);setItems([]);setSelected(null);setFile(null);setAllowed(false);setError('');
   if(!db||!identity.user)return;
   const currentDb=db,currentUser=identity.user;
   setLoading(true);
   void listProductReferences({db:currentDb,user:currentUser,organizationId:product.organizationId,product})
     .then(result=>{if(!active){for(const item of result)URL.revokeObjectURL(item.previewUrl);return;}setItems(result);})
     .catch(()=>{if(active)setError('REFERENCES_UNAVAILABLE');})
     .finally(()=>{if(active)setLoading(false);});
   return ()=>{active=false;};
 // Reference identity must change when listing/variant changes.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[product.organizationId,product.externalId,product.productId]);
 async function save(){
   if(!db || !file || !identity.user?.uid || !editable)return;
   setBusy(true);setError('');
   try{
     const next=await saveOwnedProductReference({
       db,user:identity.user,organizationId:product.organizationId,actorId:identity.user.uid,
       product,file,sourceType:source,rightsEvidence:evidence,externalAiAllowed:allowed,
     });
     setItems(old=>[next,...old.filter(item=>item.asset.id!==next.asset.id)]);
     setSelected(next.asset.id);onChanged(next);setFile(null);
   }catch(err){setError(err instanceof Error?err.message:'REFERENCE_UPLOAD_FAILED');}
   finally{setBusy(false);}
 }
 function choose(item:ReferencePreview){
   if(!isReferenceAiReady(item.asset,product))return;
   setSelected(item.asset.id);onChanged(item);
 }
 async function revoke(item:ReferencePreview){
   if(!db || !identity.user?.uid || !editable)return;
   setBusy(true);setError('');
   try{
     await revokeProductReference(db,product.organizationId,item.asset,identity.user.uid);
     setItems(old=>old.filter(x=>x.asset.id!==item.asset.id));
     if(selected===item.asset.id){setSelected(null);onChanged(null);}
     URL.revokeObjectURL(item.previewUrl);
   }catch{setError('REFERENCE_REVOKE_FAILED');}
   finally{setBusy(false);}
 }
 return <section className="product-reference-manager" aria-label="Product Reference Lock">
   <div className="section-heading"><div><p className="eyebrow">REFERENCE LOCK 4.0</p>
     <h3>{pt?'1. Confirme o produto real':es?'1. Confirme el producto real':'1. Confirm the real product'}</h3>
     <p>{pt?'A foto do anúncio é apenas para conferência, até existir autorização documentada.':es?'La foto del anuncio es solo para consulta.':'The listing thumbnail is for inspection only, not licensed for AI use.'}</p></div></div>
   <ProductSourceActions product={product}/>
   {loading&&<p role="status">{pt?'Carregando referências autorizadas…':es?'Cargando referencias autorizadas…':'Loading authorized references…'}</p>}
   {items.length>0&&<div className="reference-choices" role="group" aria-label="Authorized references">
     {items.map(item=><div className={'reference-choice'+(selected===item.asset.id?' selected':'')} key={item.asset.id}>
       <button type="button" onClick={()=>choose(item)} aria-pressed={selected===item.asset.id}>
         <img src={item.previewUrl} alt={pt?'Foto de referência autorizada':es?'Foto de referencia autorizada':'Authorized reference'} />
         <span>{item.asset.sourceType.replaceAll('_',' ')}<small>{item.asset.sha256?.slice(0,12)} · {item.asset.rights}</small></span>
       </button>
       {editable&&<button className="text-button" type="button" disabled={busy} onClick={()=>void revoke(item)}>{pt?'Revogar':es?'Revocar':'Revoke'}</button>}
     </div>)}
   </div>}
   {editable&&<details className="reference-uploader" open={items.length===0?true:undefined}>
     <summary>{pt?'Adicionar foto própria ou licenciada':es?'Añadir foto propia o licenciada':'Add owned or licensed photo'}</summary>
     <label>{pt?'Origem da fotografia':es?'Origen de la fotografía':'Photo origin'}
       <select value={source} onChange={e=>setSource(e.target.value as typeof source)}>
         <option value="USER_OWN_PHOTO">{pt?'Foto tirada por mim':es?'Foto tomada por mí':'My own photo'}</option>
         <option value="OWNER_AUTHORIZED">{pt?'Autorização do proprietário':es?'Autorizada por el titular':'Authorized by owner'}</option>
         <option value="LICENSED_MEDIA">{pt?'Mídia licenciada para transformação':es?'Medio con licencia para transformar':'Licensed for transformation'}</option>
       </select>
     </label>
     <label>{pt?'Arquivo da referência exata':es?'Foto del producto exacto':'Exact product photo'}
       <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]??null)}/>
     </label>
     <label>{pt?'Comprovante / contexto dos direitos de uso':es?'Prueba de derechos de uso':'Rights evidence and context'}
       <textarea rows={2} value={evidence} onChange={e=>setEvidence(e.target.value)}
         placeholder={pt?'Ex.: Foto própria realizada em 08/10; ou identificação da licença e titular.':es?'Describa la titularidad o la licencia de transformación.':'Describe ownership or transformation license.'}/>
     </label>
     <label className="manual-confirm"><input type="checkbox" checked={allowed} onChange={e=>setAllowed(e.target.checked)}/>
       <span>{pt?'Declaro ter o direito de enviar esta foto a uma IA externa para criar um anúncio deste produto exato.':es?'Declaro tener derecho a enviar esta foto a una IA externa para crear un anuncio de este producto exacto.':'I have permission to send this photo to an external AI for this exact product.'}</span>
     </label>
     <button type="button" className="button primary" disabled={busy||!file||!allowed||evidence.trim().length<12||!db} onClick={()=>void save()}>
       {busy?(pt?'Salvando com segurança…':es?'Guardando de forma segura…':'Saving…'):(pt?'Salvar referência autorizada':es?'Guardar referencia autorizada':'Save authorized reference')}
     </button>
     
   </details>}
   {!editable&&<p className="muted">{pt?'Apenas um editor pode adicionar referências.':es?'Solo un editor puede añadir referencias.':'Only an editor can add references.'}</p>}
   {selected&&<p className="reference-selected" role="status">{pt?'Referência autorizada selecionada. Próximo passo: anexe ESTA foto ao ChatGPT.':es?'Referencia autorizada seleccionada. Siguiente paso: adjunte ESTA foto en ChatGPT.':'Authorized reference selected. Next: attach THIS photo to ChatGPT.'}</p>}
   {error&&<p className="field-error" role="alert">{error}</p>}
 </section>;
}
