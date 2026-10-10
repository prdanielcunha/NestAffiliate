import {useState} from 'react';
import type {Campaign,CreativeAsset,PinterestCreativePack} from '@nestaffiliate/core';
import {sha256Hex} from '@nestaffiliate/creative-engine';
import {isReferenceAiReady} from '@nestaffiliate/radar';
import {db,storage} from '../lib/firebase';
import {useI18n} from '../lib/i18n-context';
import {useAuth} from '../lib/auth';
import {uploadCreativeAsset} from '../services/creativePackRepository';
import type {ReferencePreview} from '../services/productReferenceRepository';

const textWrap=(context:CanvasRenderingContext2D,raw:string,width:number,maxLines=4):string[]=>{
  const words=raw.trim().split(/\s+/).filter(Boolean);
  const lines:string[]=[];let buffer='';
  for(const word of words){
    const proposal=buffer?buffer+' '+word:word;
    if(context.measureText(proposal).width>width&&buffer){lines.push(buffer);buffer=word;}
    else buffer=proposal;
    if(lines.length===maxLines-1&&words.indexOf(word)<words.length-1){continue;}
  }
  if(buffer)lines.push(buffer);
  return lines.slice(0,maxLines);
};
const makeImage=async(url:string)=>{
  const image=new Image();
  image.crossOrigin='anonymous';
  await new Promise<void>((resolve,reject)=>{
    image.onload=()=>resolve();
    image.onerror=()=>reject(new Error('PRODUCT_IMAGE_BLOCKED'));
    image.src=url;
  });
  return image;
};

export function LocalPinComposer({
  campaign,pack,reference,disabled,onImported,
}:{
  campaign:Campaign;pack:PinterestCreativePack;reference:ReferencePreview|null;
  disabled:boolean;onImported:(asset:CreativeAsset)=>void;
}){
  const {locale}=useI18n();
  const {user}=useAuth();
  const [rights,setRights]=useState(false);
  const [fidelity,setFidelity]=useState(false);
  const [busy,setBusy]=useState(false);
  const [feedback,setFeedback]=useState('');
  const product=campaign.currentVersion.product;
  const referenceReady=Boolean(reference&&isReferenceAiReady(reference.asset,product));
  const imageSource=referenceReady ? reference?.previewUrl : product.imageUrl?.value;
  const label=(pt:string,en:string,es:string)=>locale==='pt-BR'?pt:locale==='es'?es:en;
  const chosen=pack.imageConcepts.find(x=>x.id===pack.recommendedConceptId) ?? pack.imageConcepts[0];

  async function compose(){
    if(disabled||busy||!imageSource||!rights||!fidelity)return;
    setBusy(true);setFeedback('');
    try{
      const image=await makeImage(imageSource);
      const canvas=document.createElement('canvas');
      canvas.width=1000;canvas.height=1500;
      const ctx=canvas.getContext('2d');
      if(!ctx)throw new Error('CANVAS_UNAVAILABLE');
      const background=ctx.createLinearGradient(0,0,1000,1500);
      background.addColorStop(0,'#13251a');background.addColorStop(1,'#07130d');
      ctx.fillStyle=background;ctx.fillRect(0,0,1000,1500);
      ctx.fillStyle='#b9ec84';ctx.fillRect(78,80,72,8);
      ctx.font='bold 27px system-ui, sans-serif';ctx.fillStyle='#dfe7dc';
      ctx.fillText('ACHADOS DO NEST',78,139);
      const card={x:76,y:210,w:848,h:850};
      ctx.fillStyle='#f7f7f1';ctx.beginPath();ctx.roundRect(card.x,card.y,card.w,card.h,42);ctx.fill();
      const inset=70;
      const iw=card.w-inset*2,ih=card.h-inset*2;
      const ratio=Math.min(iw/image.naturalWidth,ih/image.naturalHeight);
      const w=image.naturalWidth*ratio,h=image.naturalHeight*ratio;
      ctx.drawImage(image,card.x+(card.w-w)/2,card.y+(card.h-h)/2,w,h);
      const headline=(pack.copy.headline || pack.copy.titles[0] || product.title.value).trim();
      ctx.font='bold 57px system-ui, sans-serif';ctx.fillStyle='#f6f9f2';
      const rows=textWrap(ctx,headline,840,3);
      for(let i=0;i<rows.length;i++)ctx.fillText(rows[i]!,80,1145+i*70);
      ctx.fillStyle='#b9ec84';ctx.beginPath();ctx.roundRect(80,1390,260,66,24);ctx.fill();
      ctx.font='bold 26px system-ui, sans-serif';ctx.fillStyle='#0b2110';
      ctx.fillText('VER A IDEIA',113,1432);
      ctx.font='19px system-ui, sans-serif';ctx.fillStyle='#b5c5b9';
      ctx.fillText(label('Conteúdo com link de afiliado','Affiliate content','Contenido afiliado'),610,1432);
      const blob=await new Promise<Blob>((resolve,reject)=>
        canvas.toBlob(out=>out?resolve(out):reject(new Error('ENCODE_FAILED')),'image/webp',0.82));
      const hash=await sha256Hex(await blob.arrayBuffer());
      const asset:CreativeAsset={
        id:campaign.id+'-local-'+hash.slice(0,16),
        organizationId:campaign.organizationId,
        campaignId:campaign.id,
        origin:'GENERATED_LOCAL',
        rightsStatus:'AUTHORIZED',
        mimeType:'image/webp',
        width:1000,height:1500,
        originalWidth:image.naturalWidth,originalHeight:image.naturalHeight,
        hash,
        conceptId:chosen?.id,
        promptPackageId:chosen?.imagePrompt.id,
        embeddedTextConfirmedAbsent:true,
        productFidelityConfirmed:true,
        ...(referenceReady&&reference?{
          referenceAssetId:reference.asset.id,
          referenceSha256:reference.asset.sha256,
          referenceListingId:reference.asset.externalListingId,
          referenceRights:reference.asset.rights,
        }:{}),
        reviewedAt:new Date().toISOString(),
        ...(user?{reviewedBy:user.uid}:{}),
        createdAt:new Date().toISOString(),
      };
      const saved=db
        ? await uploadCreativeAsset({db,storage,organizationId:campaign.organizationId,asset,blob})
        : {...asset,downloadUrl:URL.createObjectURL(blob)};
      onImported(saved);
      setFeedback(label('Pin visual 1000 × 1500 salvo para revisão.','Visual Pin saved for review.','Pin visual guardado para revisión.'));
    }catch{
      setFeedback(label(
        'Não foi possível compor a foto no navegador. A origem pode bloquear edição. Envie uma foto autorizada em Referência e tente novamente.',
        'The image source blocked composition. Upload an authorized reference photo and try again.',
        'La fuente bloqueó la composición. Sube una referencia autorizada.'));
    }finally{setBusy(false);}
  }
  return <section className="local-pin-composer">
    <div className="section-heading">
      <div><p className="eyebrow">PIN LOCAL · ZERO-COST</p>
        <h3>{label('Gerar Pin visual com a foto real','Compose visual Pin from the real photo','Crear Pin con la foto real')}</h3>
        <p>{label(
          'Layout final 1000 × 1500: foto sem alterações de produto + textos editoriais. Requer direito de uso da foto e sua conferência de fidelidade.',
          '1000 × 1500 composition with the actual photo and editorial copy. Rights and fidelity must be confirmed.',
          'Composición 1000 × 1500 con foto real y textos. Requiere autorización y revisión.')}</p>
      </div>
    </div>
    {imageSource?<div className="local-pin-source">
      <img src={imageSource} alt={product.title.value} loading="lazy"/>
      <small>{referenceReady?label('Foto de referência autorizada','Authorized reference','Referencia autorizada'):
        label('Foto de origem do anúncio — direitos ainda não confirmados','Marketplace photo — rights unconfirmed','Foto del anuncio — derechos no verificados')}</small>
    </div>:<p className="field-hint">{label('Foto ainda não disponível. Anexe uma referência real autorizada para gerar a imagem.','Add an authorized real product photo first.','Añade una foto real autorizada.')}</p>}
    <label className="manual-confirm"><input type="checkbox" checked={rights} onChange={e=>setRights(e.target.checked)}/>
      {label('Tenho autorização para usar esta foto no Pin.', 'I have permission to use this photo.', 'Tengo permiso para utilizar esta foto.')}</label>
    <label className="manual-confirm"><input type="checkbox" checked={fidelity} onChange={e=>setFidelity(e.target.checked)}/>
      {label('Conferi que imagem, cor, peças e variante correspondem ao produto real.',
        'I verified the product, color, parts and variant match the real listing.',
        'Verifiqué producto, color, piezas y variante.')}</label>
    {!referenceReady&&<p className="field-hint">{label(
      'O bloqueio de Reference Lock permanece até anexar e validar a referência autorizada, mesmo que você gere este rascunho.',
      'Reference Lock still requires an authorized verified reference before publishing.',
      'Reference Lock exige una referencia verificada antes de publicar.')}</p>}
    {feedback&&<p role="status" className="field-hint">{feedback}</p>}
    <button type="button" className="button primary" disabled={disabled||busy||!imageSource||!rights||!fidelity}
      onClick={()=>void compose()}>
      {busy?label('Gerando…','Composing…','Generando…'):label('Compor e salvar Pin 1000 × 1500','Compose and save 1000 × 1500 Pin','Crear y guardar Pin 1000 × 1500')}
    </button>
  </section>;
}
