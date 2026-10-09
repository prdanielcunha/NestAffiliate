import {useState} from 'react';
import type {PublicationPackage} from '@nestaffiliate/core';
import {buildGuidedPinFields} from '../lib/guidedPinFields';
import {publicationBundleText} from '../lib/publicationBundle';
import {useI18n} from '../lib/i18n-context';

/** All copyable data and exact Pinterest placement on one screen.
 * Ticking a step is LOCAL preparation, never evidence that a Pin was published.
 */
export function FinalPinPublicationGuide({pack,blocked,onDownloadPng,onDownloadZip,onCopy}:{
 pack:PublicationPackage;blocked:boolean;
 onDownloadPng:()=>void;onDownloadZip:()=>void;
 onCopy:(text:string)=>Promise<void>;
}){
 const {locale}=useI18n();const pt=locale==='pt-BR',es=locale==='es';
 const [copied,setCopied]=useState('');
 const [checked,setChecked]=useState<string[]>([]);
 const [copyError,setCopyError]=useState(false);
 const fields=buildGuidedPinFields(pack,locale);
 async function copy(value:string,id:string){
  try{await onCopy(value);setCopied(id);setCopyError(false);}
  catch{setCopyError(true);}
 }
 function toggle(id:string,next:boolean){
  setChecked(old=>next?[...new Set([...old,id])]:old.filter(item=>item!==id));
 }
 const steps=fields.filter(field=>!field.optional);
 return <section className="package-card guided-publish-v5" aria-label={pt?'Dados para criar seu Pin':es?'Datos para crear tu Pin':'Everything to create your Pin'}>
  <header className="guided-publish-header">
   <p className="eyebrow">PIN READY PACK · 1000 × 1500 · 2:3</p>
   <h2>{pt?'Tudo pronto para montar seu Pin':es?'Todo para crear tu Pin':'Everything you need to create your Pin'}</h2>
   <p>{pt?'Cada campo abaixo diz exatamente onde colar no Pinterest. Nada será publicado sem você confirmar.':es?'Cada campo indica dónde pegarlo. Nada se publica sin tu confirmación.':'Each field shows where to paste it. Nothing is posted without your approval.'}</p>
  </header>
  <div className="guided-publish-actions">
   <button type="button" className="button primary" disabled={blocked} onClick={onDownloadZip}>{pt?'Baixar tudo (.zip)':es?'Descargar todo (.zip)':'Download everything (.zip)'}</button>
   <button type="button" className="button secondary" disabled={blocked} onClick={onDownloadPng}>{pt?'Baixar imagem PNG':es?'Descargar imagen PNG':'Download PNG image'}</button>
   <button type="button" className="button secondary" onClick={()=>void copy(publicationBundleText(pack),'all')}>{copied==='all'?(pt?'Dados copiados':es?'Datos copiados':'Copied'):(pt?'Copiar todos os textos':es?'Copiar todos los textos':'Copy all text')}</button>
  </div>
  <div className="guided-publish-file">
    <strong>{pt?'1. Imagem para enviar':es?'1. Imagen para subir':'1. Image to upload'}</strong>
    <p>{pt?'No Pinterest: Criar → Criar Pin → carregar a imagem PNG que você baixou.':es?'En Pinterest: Crear → Crear Pin → subir la imagen PNG.':'In Pinterest: Create → Create Pin → upload your downloaded PNG.'}</p>
    <code>{pack.filename}</code>
  </div>
  <div className="guided-publish-fields">
   {fields.map((field,index)=><article className="guided-publish-field" key={field.id}>
      <div className="guided-field-name"><span className="guided-field-step">{String(index+2).padStart(2,'0')}</span><div><h3>{field.label}</h3><p>{field.instruction}</p></div></div>
      <div className="guided-field-value"><span>{field.value}</span></div>
      <div className="guided-field-actions">
       <button type="button" className="button secondary" onClick={()=>void copy(field.value,field.id)}>
        {copied===field.id?(pt?'Copiado ✓':es?'Copiado ✓':'Copied ✓'):(pt?'Copiar':es?'Copiar':'Copy')}
       </button>
       {!field.optional&&<label className="guided-field-check"><input type="checkbox" checked={checked.includes(field.id)} onChange={e=>toggle(field.id,e.target.checked)}/><span>{pt?'Já preenchi no Pinterest':es?'Ya lo pegué en Pinterest':'Pasted in Pinterest'}</span></label>}
      </div>
   </article>)}
  </div>
  <div className="guided-publish-finish">
   <strong>{pt?'Conferência antes de publicar':es?'Comprobación antes de publicar':'Check before publishing'}</strong>
   <p>{pt?'Confira a prévia, o anúncio exato, o link de afiliado da sua conta e a divulgação comercial. Publique manualmente; depois volte ao NestAffiliate e registre a URL pública do Pin.':es?'Comprueba la imagen, el enlace de tu cuenta y el aviso de afiliado. Publica manualmente y vuelve para registrar la URL del Pin.':'Verify the image, exact listing, affiliate-account link and disclosure. Publish manually, then return to record the public Pin URL.'}</p>
   <div className="guided-finish-row"><span>{checked.filter(id=>steps.some(field=>field.id===id)).length}/{steps.length} {pt?'campos obrigatórios marcados':es?'campos obligatorios marcados':'required fields checked'}</span>
   <a className="button secondary" href="https://www.pinterest.com/" target="_blank" rel="noreferrer">{pt?'Abrir Pinterest':es?'Abrir Pinterest':'Open Pinterest'} ↗</a></div>
   <small>{pt?'Os marcadores são apenas um checklist local, não confirmam postagem.':es?'El checklist es local: no confirma publicación.':'Checklist marks are local only; they do not confirm publication.'}</small>
  </div>
  {copyError&&<p role="alert" className="field-error">{pt?'Não foi possível copiar. Selecione o texto para copiar manualmente.':es?'No se pudo copiar; selecciona el texto.':'Clipboard unavailable; select the text manually.'}</p>}
 </section>;
}
