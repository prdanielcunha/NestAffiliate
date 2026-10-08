import { useEffect, useRef, useState } from 'react';
import type { CreativeAsset, PinterestCreativePack, ProductTruth } from '@nestaffiliate/core';
import { FEATURE_FLAGS } from '@nestaffiliate/config';
import { isReferenceAiReady } from '@nestaffiliate/radar';
import type { ReferencePreview } from '../services/productReferenceRepository';
import {
  computeCoverCrop,
  detectImageMime,
  sha256Hex,
  validateImageMetadata,
} from '@nestaffiliate/creative-engine';
import { db, storage as firebaseStorage } from '../lib/firebase';
import { useI18n } from '../lib/i18n-context';
import { useAuth } from '../lib/auth';
import { generateAffiliateCreative } from '../services/nestAiClient';
import {
  findCreativeAssetByHash,
  uploadCreativeAsset,
} from '../services/creativePackRepository';

interface PreparedImage {
  originalWidth:number;
  originalHeight:number;
  hash:string;
  blob:Blob;
  previewUrl:string;
  warnings:string[];
}

async function loadImage(file:File){
  const url=URL.createObjectURL(file);
  try{
    const image=new Image();
    await new Promise<void>((resolve,reject)=>{
      image.onload=()=>resolve();
      image.onerror=()=>reject(new Error('IMAGE_DECODE_FAILED'));
      image.src=url;
    });
    return {image,width:image.naturalWidth,height:image.naturalHeight,url};
  }catch(error){
    URL.revokeObjectURL(url);
    throw error;
  }
}

async function encodeCanvas(canvas:HTMLCanvasElement,maxBytes=620_000){
  const encode=(type:string,quality:number)=>new Promise<Blob>((resolve,reject)=>{
    canvas.toBlob((blob)=>blob ? resolve(blob) : reject(new Error('IMAGE_ENCODE_FAILED')),type,quality);
  });
  for(const quality of [0.9,0.82,0.74,0.66,0.58]){
    const blob=await encode('image/webp',quality);
    if(blob.size<=maxBytes) return blob;
  }
  const jpeg=await encode('image/jpeg',0.72);
  if(jpeg.size<=700_000) return jpeg;
  throw new Error('NORMALIZED_IMAGE_TOO_LARGE');
}

export function AIImageImport({
  organizationId,
  campaignId,
  pack,
  product,
  reference,
  disabled,
  onImported,
}:{
  organizationId:string;
  campaignId:string;
  pack:PinterestCreativePack;
  product?:ProductTruth;
  reference?:ReferencePreview|null;
  disabled?:boolean;
  onImported:(asset:CreativeAsset)=>void;
}){
  const { t, locale }=useI18n();
  const { user }=useAuth();
  const inputRef=useRef<HTMLInputElement>(null);
  const [prepared,setPrepared]=useState<PreparedImage|null>(null);
  const [bias,setBias]=useState<'top'|'center'|'bottom'>('center');
  const [file,setFile]=useState<File|null>(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [reviewed,setReviewed]=useState(false);
  const [fidelity,setFidelity]=useState({color:false,shape:false,parts:false,details:false});
  const v4=FEATURE_FLAGS.REFERENCE_LOCK_V4_ENABLED;
  const referenceReady=Boolean(product&&reference&&isReferenceAiReady(reference.asset,product)&&reference.previewUrl);
  const comparisonConfirmed=Object.values(fidelity).every(Boolean);
  const canApply=!v4?reviewed:referenceReady&&comparisonConfirmed;
  const [duplicate,setDuplicate]=useState(false);
  const [origin,setOrigin]=useState<'manual'|'nestai'>('manual');

  useEffect(()=>()=>{ if(prepared?.previewUrl.startsWith('blob:')) URL.revokeObjectURL(prepared.previewUrl); },[prepared?.previewUrl]);

  async function prepare(nextFile:File,nextBias=bias){
    setBusy(true);
    setError('');
    setReviewed(false);
    setFidelity({color:false,shape:false,parts:false,details:false});
    setDuplicate(false);
    try{
      const buffer=await nextFile.arrayBuffer();
      const sniffed=detectImageMime(new Uint8Array(buffer.slice(0,16)));
      if(!sniffed || (nextFile.type && nextFile.type!==sniffed)) throw new Error('INVALID_IMAGE_SIGNATURE');

      const loaded=await loadImage(nextFile);
      const metadata=validateImageMetadata({
        mimeType:sniffed,
        bytes:nextFile.size,
        width:loaded.width,
        height:loaded.height,
      });
      if(!metadata.valid) throw new Error(metadata.errors.join(','));

      const canvas=document.createElement('canvas');
      canvas.width=1000;
      canvas.height=1500;
      const ctx=canvas.getContext('2d');
      if(!ctx) throw new Error('CANVAS_UNAVAILABLE');
      const crop=computeCoverCrop({width:loaded.width,height:loaded.height},{width:1000,height:1500},nextBias);
      ctx.drawImage(loaded.image,crop.sx,crop.sy,crop.sw,crop.sh,0,0,1000,1500);
      URL.revokeObjectURL(loaded.url);
      const blob=await encodeCanvas(canvas);
      const normalizedBuffer=await blob.arrayBuffer();
      const hash=await sha256Hex(normalizedBuffer);
      const previewUrl=URL.createObjectURL(blob);

      if(prepared?.previewUrl.startsWith('blob:')) URL.revokeObjectURL(prepared.previewUrl);
      setPrepared({
        originalWidth:loaded.width,
        originalHeight:loaded.height,
        hash,
        blob,
        previewUrl,
        warnings:metadata.warnings,
      });
      if(db){
        const existing=await findCreativeAssetByHash(db,organizationId,hash).catch(()=>null);
        setDuplicate(Boolean(existing));
      }
    }catch{
      setPrepared(null);
      setError(t('imageImportInvalid'));
    }finally{
      setBusy(false);
    }
  }

  async function choose(nextFile:File|null, nextOrigin:'manual'|'nestai'='manual'){
    if(!nextFile) return;
    setOrigin(nextOrigin);
    setFile(nextFile);
    await prepare(nextFile,bias);
  }

  async function generateWithNestAi(){
    // No reference upload contract in NestAI image task; block generation in V4.
    if(disabled || busy || !user || v4) return;
    const concept=pack.imageConcepts.find((item)=>item.id===pack.recommendedConceptId) ?? pack.imageConcepts[0];
    if(!concept?.imagePrompt?.prompt) return;
    setBusy(true);
    setError('');
    try{
      const generated=await generateAffiliateCreative({
        user,
        organizationId,
        locale,
        prompt:concept.imagePrompt.prompt,
      });
      const binary=atob(generated.imageBase64);
      const bytes=Uint8Array.from(binary,(char)=>char.charCodeAt(0));
      const nextFile=new File([bytes],'nestai-generated.jpg',{type:generated.mimeType});
      setBusy(false);
      await choose(nextFile,'nestai');
    }catch{
      setBusy(false);
      setError(t('nestAiFallback'));
    }
  }

  async function changeBias(next:'top'|'center'|'bottom'){
    setBias(next);
    if(file) await prepare(file,next);
  }

  async function apply(){
    if(!prepared || !canApply || disabled) return;
    setBusy(true);
    setError('');
    try{
      const concept=pack.imageConcepts.find((item)=>item.id===pack.recommendedConceptId) ?? pack.imageConcepts[0];
      const base:CreativeAsset={
        id:campaignId+'-'+prepared.hash.slice(0,20),
        organizationId,
        campaignId,
        origin:origin==='nestai'?'NESTAI_GENERATED':'MANUAL_CHATGPT',
        rightsStatus:'GENERATED',
        mimeType:(prepared.blob.type==='image/jpeg'?'image/jpeg':prepared.blob.type==='image/png'?'image/png':'image/webp'),
        width:1000,
        height:1500,
        originalWidth:prepared.originalWidth,
        originalHeight:prepared.originalHeight,
        hash:prepared.hash,
        promptPackageId:concept?.imagePrompt.id,
        conceptId:concept?.id,
        embeddedTextConfirmedAbsent:true,
        productFidelityConfirmed:canApply,
        ...(v4&&reference ? {
          referenceAssetId:reference.asset.id,
          referenceSha256:reference.asset.sha256,
          referenceListingId:reference.asset.externalListingId,
          referenceRights:reference.asset.rights,
          reviewedAt:new Date().toISOString(),
          reviewedBy:user?.uid,
        } : {}),
        createdAt:new Date().toISOString(),
      };
      const asset=db
        ? await uploadCreativeAsset({db,storage:firebaseStorage,organizationId,asset:base,blob:prepared.blob})
        : {...base,downloadUrl:prepared.previewUrl};
      onImported(asset);
    }catch{
      setError(t('imageImportSaveError'));
    }finally{
      setBusy(false);
    }
  }

  return <section
    className="ai-image-import"
    tabIndex={0}
    onPaste={(event)=>{
      const item=[...event.clipboardData.items].find((entry)=>entry.type.startsWith('image/'));
      const pasted=item?.getAsFile() ?? null;
      if(pasted){
        event.preventDefault();
        void choose(pasted,'manual');
      }
    }}
  >
    <div className="section-heading">
      <div>
        <p className="eyebrow">{t('importAiImage')}</p>
        <h3>{t('importGeneratedImage')}</h3>
        <p>{t('importGeneratedImageBody')}</p>
      </div>
      <div className="import-result-row">
        <button className="button" type="button" disabled={disabled || busy || !user || v4} onClick={()=>void generateWithNestAi()}>
          {busy?t('generatingWithNestAi'):t('generateWithNestAi')}
        </button>
        <button className="button secondary" type="button" disabled={disabled || busy} onClick={()=>inputRef.current?.click()}>
          {prepared?t('replaceImage'):t('selectImage')}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        hidden
        accept="image/png,image/jpeg,image/webp"
        onChange={(event)=>void choose(event.target.files?.[0] ?? null,'manual')}
      />
    </div>

    <button
      type="button"
      className="image-dropzone"
      disabled={disabled || busy}
      onClick={()=>inputRef.current?.click()}
      onDragOver={(event)=>event.preventDefault()}
      onDrop={(event)=>{
        event.preventDefault();
        void choose(event.dataTransfer.files?.[0] ?? null,'manual');
      }}
    >
      {busy ? t('processingImage') : prepared ? t('imageReady') : t('dropImage')}
    </button>

    {error && <p className="field-error">{error}</p>}

    {v4&&<p className="field-hint">3. Importe a imagem FINAL, não a foto original. Confira lado a lado antes de aprovar. NestAI não recebe a foto e fica desabilitado neste modo.</p>}
    {prepared && <div className="image-import-preview">
      <div>
        <img src={prepared.previewUrl} alt={t('generatedImagePreview')} />
      </div>
      <div className="image-import-details">
        <strong>1000 × 1500 · 2:3</strong>
        <span>{t('originalSize')}: {prepared.originalWidth} × {prepared.originalHeight}</span>
        <span>SHA-256: {prepared.hash.slice(0,16)}…</span>
        {duplicate && <span className="warning-text">{t('duplicateAsset')}</span>}
        {prepared.warnings.length>0 && <span>{t('smartCropApplied')}</span>}
        <div className="crop-controls" role="group" aria-label={t('smartCrop')}>
          <button className={bias==='top'?'active':''} onClick={()=>void changeBias('top')}>{t('cropTop')}</button>
          <button className={bias==='center'?'active':''} onClick={()=>void changeBias('center')}>{t('cropCenter')}</button>
          <button className={bias==='bottom'?'active':''} onClick={()=>void changeBias('bottom')}>{t('cropBottom')}</button>
        </div>
        {v4 ? <div className="reference-comparison">
          <div className="reference-comparison-grid">
            <div><small>Referência real autorizada</small>{referenceReady&&reference?<img src={reference.previewUrl} alt="Referência real exata"/>:<p role="alert">Selecione a foto original autorizada antes de aprovar.</p>}</div>
            <div><small>Resultado gerado</small><img src={prepared.previewUrl} alt="Imagem final gerada"/></div>
          </div>
          {([
            ['color','Cor e variante exatamente iguais à foto.'],
            ['shape','Forma, proporções e estrutura preservadas.'],
            ['parts','Nenhuma peça ou funcionalidade inventada.'],
            ['details','Acabamento, detalhes e marca conferidos.'],
          ] as const).map(([key,label])=><label className="manual-confirm" key={key}>
            <input type="checkbox" checked={fidelity[key]} onChange={e=>setFidelity(old=>({...old,[key]:e.target.checked}))}/>
            <span>{label}</span>
          </label>)}
        </div> : <label className="manual-confirm">
          <input type="checkbox" checked={reviewed} onChange={(event)=>setReviewed(event.target.checked)} />
          <span>{t('visualTruthConfirm')}</span>
        </label>}
        <button className="button primary" disabled={!canApply || busy || disabled} onClick={()=>void apply()}>
          {t('useGeneratedImage')}
        </button>
      </div>
    </div>}
  </section>;
}
