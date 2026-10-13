import { useEffect, useMemo, useState } from 'react';
import type { Campaign } from '@nestaffiliate/core';
import { nextCampaignVersion } from '@nestaffiliate/core';
import { detectUnsupportedPinClaims } from '@nestaffiliate/compliance';
import { compactPinText, versionPinterestCreativePack } from '@nestaffiliate/creative-engine';
import { db } from '../lib/firebase';
import { useI18n } from '../lib/i18n-context';
import { savePinterestCreativePack } from '../services/creativePackRepository';

const txt=(locale:string,pt:string,en:string,es:string)=>locale==='pt-BR'?pt:locale==='es'?es:en;
function neutralOptions(campaign:Campaign,locale:string){
  const product=campaign.currentVersion.product.title.value.trim().slice(0,110);
  const title=compactPinText(product,96);
  const disclosure=txt(locale,'Conteúdo com link de afiliado.','Contains affiliate links.','Contenido con enlace de afiliado.');
  const descriptions=locale==='pt-BR'
    ? [
      `Conheça ${product}. Confira fotos, itens incluídos e informações do vendedor no anúncio original. Verifique o preço e as condições antes de escolher. ${disclosure}`,
      `Pesquisando ${product}? Compare os detalhes, as dimensões e os itens do conjunto na página do produto. Consulte a oferta atualizada antes de decidir. ${disclosure}`,
      `Antes de comprar ${product}, veja as imagens, os itens incluídos e as características informadas pelo vendedor. Confira as condições da oferta. ${disclosure}`,
    ]
    : locale==='es'
      ? [
        `Conoce ${product}. Consulta las fotos, los artículos incluidos y las condiciones del anuncio antes de comprar. ${disclosure}`,
        `¿Estás comparando ${product}? Consulta los detalles y el precio actualizado en el anuncio del vendedor. ${disclosure}`,
        `Antes de elegir ${product}, revisa imágenes, composición y condiciones directamente con el vendedor. ${disclosure}`,
      ]
      : [
        `Explore ${product}. Check the listing photos, included items and seller information. Review current terms and pricing before choosing. ${disclosure}`,
        `Considering ${product}? Compare dimensions, included items and listing details before deciding. ${disclosure}`,
        `Before selecting ${product}, review images, product specifications and the seller's current terms. ${disclosure}`,
      ];
  return {
    titles:[
      title,
      compactPinText(txt(locale,`${product}: confira os detalhes`,`${product}: check the details`,`${product}: revisa los detalles`),96),
      compactPinText(txt(locale,`Conheça ${product}`,`Explore ${product}`,`Conoce ${product}`),96),
    ],
    descriptions:descriptions.map(value=>compactPinText(value,500)),
  };
}

export function InlinePinCopyChooser({campaign,editable,onUpdate,onClose,onComplete}:{
  campaign:Campaign;
  editable:boolean;
  onUpdate:(campaign:Campaign)=>void;
  onClose:()=>void;
  onComplete:(synced:boolean)=>void;
}){
  const {locale}=useI18n();
  const v=campaign.currentVersion;
  const [title,setTitle]=useState(v.narrative.pinterestTitle);
  const [description,setDescription]=useState(v.narrative.description);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState(false);
  useEffect(()=>{
    setTitle(v.narrative.pinterestTitle);
    setDescription(v.narrative.description);
  },[v.id,v.narrative.pinterestTitle,v.narrative.description]);
  const choices=useMemo(()=>{
    const neutral=neutralOptions(campaign,locale);
    const safe=(value:string)=>Boolean(value.trim()) && detectUnsupportedPinClaims(value).length===0;
    return {
      titles:[...new Set([v.narrative.pinterestTitle,...(v.creativePack?.copy.titles??[]),...neutral.titles])]
        .filter(safe).slice(0,3),
      descriptions:[...new Set([v.narrative.description,...(v.creativePack?.copy.descriptions??[]),...neutral.descriptions])]
        .filter(safe).slice(0,3),
    };
  },[campaign,locale,v.narrative.pinterestTitle,v.narrative.description,v.creativePack]);
  const titleOkay=choices.titles.includes(title);
  const descOkay=choices.descriptions.includes(description);
  const valid=titleOkay&&descOkay&&editable&&!saving;
  async function apply(){
    if(!valid)return;
    setError(false);
    setSaving(true);
    const nextVersion=v.version+1;
    const nextPack=v.creativePack ? {
      ...versionPinterestCreativePack(v.creativePack,nextVersion),
      copy:{
        ...v.creativePack.copy,
        titles:choices.titles,
        descriptions:choices.descriptions,
      },
    }:undefined;
    const next=nextCampaignVersion(campaign,{
      narrative:{...v.narrative,pinterestTitle:title,headline:compactPinText(title,57),description},
      ...(nextPack?{creativePack:nextPack}:{}),
    },'review: title and description selected in-place');
    // Save the same versioned Creative Pack as the existing editor. The
    // campaign repository remains the owner of versioned campaign persistence.
    onUpdate(next);
    try {
      if(nextPack){
        if(!db)throw new Error('FIRESTORE_UNAVAILABLE');
        await savePinterestCreativePack(db,campaign.organizationId,nextPack);
      }
      onComplete(true);
    } catch {
      // Never report cloud synchronization as successful after a failed write.
      setError(true);
      onComplete(false);
    } finally {
      setSaving(false);
    }
  }
  return <section className="inline-copy-chooser" id="review-inline-copy" aria-label={txt(locale,'Escolha os textos nesta etapa','Choose text in this step','Elige los textos aquí')}>
    <div className="inline-copy-head">
      <div>
        <p className="eyebrow">{txt(locale,'ETAPA 2 · TEXTOS','STEP 2 · COPY','PASO 2 · TEXTOS')}</p>
        <h3>{txt(locale,'Escolha aqui, sem sair desta tela','Choose here, without leaving this screen','Elige aquí, sin salir de esta pantalla')}</h3>
        <p>{txt(locale,'Selecione um título e uma descrição. Só depois de confirmar eles substituem os textos da campanha.','Select a title and description. They are applied only after confirmation.','Selecciona un título y descripción. Se aplican solo al confirmar.')}</p>
      </div>
      <button type="button" className="inline-copy-close" onClick={onClose} aria-label={txt(locale,'Fechar escolha de textos','Close text options','Cerrar opciones')}>×</button>
    </div>
    <div className="inline-copy-columns">
      <fieldset><legend>{txt(locale,'Título do Pin','Pin title','Título del Pin')}</legend>
        {choices.titles.map((item,index)=><label className={title===item?'inline-copy-option selected':'inline-copy-option'} key={index}>
          <input type="radio" name="inline-pin-title" checked={title===item} onChange={()=>setTitle(item)} disabled={!editable||saving}/>
          <span>{item}</span>
        </label>)}
      </fieldset>
      <fieldset><legend>{txt(locale,'Descrição do Pin','Pin description','Descripción del Pin')}</legend>
        {choices.descriptions.map((item,index)=><label className={description===item?'inline-copy-option selected':'inline-copy-option'} key={index}>
          <input type="radio" name="inline-pin-description" checked={description===item} onChange={()=>setDescription(item)} disabled={!editable||saving}/>
          <span>{item}</span>
        </label>)}
      </fieldset>
    </div>
    {(!titleOkay||!descOkay)&&<p className="inline-copy-hint" role="status">{txt(locale,'O texto antigo tem afirmações que precisam de revisão. Selecione uma alternativa segura acima.','The previous copy has unverified claims. Choose safe alternatives above.','El texto anterior tiene afirmaciones sin verificar. Elige alternativas seguras.')}</p>}
    {error&&<p role="alert" className="field-error">{txt(locale,'Textos aplicados nesta sessão, mas o Creative Pack não foi sincronizado. Confira a conexão antes de publicar.','Copy applied locally but Creative Pack sync failed. Check connectivity before publishing.','Textos aplicados localmente, pero falló la sincronización.')}</p>}
    <div className="inline-copy-footer">
      <button className="button secondary" type="button" onClick={onClose} disabled={saving}>{txt(locale,'Voltar sem alterar','Cancel changes','Cancelar cambios')}</button>
      <button className="button primary" type="button" onClick={()=>void apply()} disabled={!valid}>
        {saving?txt(locale,'Salvando…','Saving…','Guardando…'):txt(locale,'Aplicar título e descrição','Apply title and description','Aplicar título y descripción')}
      </button>
    </div>
  </section>;
}
