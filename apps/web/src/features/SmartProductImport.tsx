import { useRef, useState } from 'react';
import type { ProductTruth } from '@nestaffiliate/core';
import { createManualProductTruth, cleanSharedListingUrl, parseSharedProductText } from '@nestaffiliate/integrations';
import { detectImageMime } from '@nestaffiliate/creative-engine';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n-context';
import { extractAffiliateScreenshot,generateAffiliatePinStrategy } from '../services/nestAiClient';
import type { ProductAiStrategy } from '../lib/aiProductStrategy';
import { attachDeclaredAffiliateUrl, resolveOfficialProductLink } from '../services/smartProductImport';
import { resolveShopeeProductLink } from '../services/shopeeProductResolver';

type Extraction={marketplace:'MELI'|'SHOPEE'|'UNKNOWN';title:string|null;productUrl:string|null;
  price:number|null;seller:string|null;rating:number|null;reviewCount:number|null;
  visibleFacts:string[];warnings:string[];};

const normalizeFile=async(file:File):Promise<{base64:string;mimeType:'image/png'|'image/jpeg'|'image/webp'}>=>{
  if(file.size>7_000_000 || file.size===0)throw new Error('IMAGE_TOO_LARGE');
  const header=new Uint8Array(await file.slice(0,16).arrayBuffer());
  const mime=detectImageMime(header);
  if(!mime || !['image/png','image/jpeg','image/webp'].includes(mime))throw new Error('INVALID_SCREENSHOT');
  const objectUrl=URL.createObjectURL(file);
  try{
    const image=new Image();
    await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error('IMAGE_INVALID'));image.src=objectUrl;});
    const maxSide=Math.max(image.naturalWidth,image.naturalHeight);
    const scale=Math.min(1,1600/maxSide);
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
    canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    const ctx=canvas.getContext('2d');
    if(!ctx)throw new Error('IMAGE_PROCESSING_UNAVAILABLE');
    ctx.drawImage(image,0,0,canvas.width,canvas.height);
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(x=>x?resolve(x):reject(new Error('IMAGE_ENCODE_FAILED')),'image/jpeg',0.77));
    if(blob.size>2_200_000)throw new Error('IMAGE_TOO_LARGE');
    const bytes=new Uint8Array(await blob.arrayBuffer());
    let binary='';
    for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    return {base64:btoa(binary),mimeType:'image/jpeg'};
  }finally{URL.revokeObjectURL(objectUrl);}
};

const message=(locale:string,pt:string,en:string,es:string)=>locale==='pt-BR'?pt:locale==='es'?es:en;

export function SmartProductImport({
  organizationId,onImported,
}:{
  organizationId:string;
  onImported:(product:ProductTruth,keyword:string,strategy?:ProductAiStrategy,aiAttempted?:boolean)=>void;
}){
  const {user}=useAuth();
  const {locale}=useI18n();
  const input=useRef<HTMLInputElement>(null);
  const [link,setLink]=useState('');
  const [affiliate,setAffiliate]=useState(false);
  const [screenshot,setScreenshot]=useState<File|null>(null);
  const [marketplace,setMarketplace]=useState<'MELI'|'SHOPEE'>('MELI');
  const [fallbackTitle,setFallbackTitle]=useState('');
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState('');
  const [detail,setDetail]=useState('');
  const [error,setError]=useState('');
  const [pendingLink,setPendingLink]=useState('');
  const [pendingReason,setPendingReason]=useState('');

  async function analyze(){
    if(!user || busy)return;
    setBusy(true);setError('');setDetail('');setPendingLink('');setPendingReason('');
    try{
      const source=cleanSharedListingUrl(link);
      const parsed=parseSharedProductText(link);
      let kind=parsed.marketplace || marketplace;
      let extracted:Extraction|null=null;
      if(screenshot){
        setStatus(message(locale,'Lendo dados visíveis do print com NestAI…','Reading screenshot…','Leyendo la captura…'));
        try{
          const image=await normalizeFile(screenshot);
          extracted=await extractAffiliateScreenshot({
            user,organizationId,locale,mimeType:image.mimeType,base64:image.base64,
            fileName:screenshot.name || 'product.jpg',
          });
          if(extracted.marketplace!=='UNKNOWN'){
            // Explicit URL host wins: an OCR guess cannot silently reclassify a
            // pasted affiliate link as the other marketplace.
            if(!parsed.marketplace) kind=extracted.marketplace;
            else if(parsed.marketplace!==extracted.marketplace) setDetail(message(locale,
              'O print parece ser de outro marketplace. Mantenha o link correto e confira a fonte antes de publicar.',
              'Screenshot and listing marketplace differ; review the source before publishing.',
              'La captura y el enlace parecen de tiendas distintas; revisa la fuente.'));
          }
        }catch{
          setDetail(message(locale,
            'A leitura do print está indisponível. Nenhum dado foi inventado. Use o link oficial ou informe o título para continuar.',
            'Image extraction is unavailable; enter the title or paste a product link.',
            'La extracción está indisponible; indica el título o enlace.'));
        }
      }
      const sharedUrl=source || cleanSharedListingUrl(extracted?.productUrl || '');
      // If the image supplied a URL with another marketplace than the selected
      // user source, do not quietly use a cross-marketplace affiliate URL.
      if(!source&&extracted?.marketplace!=='UNKNOWN'&&extracted?.marketplace)kind=extracted.marketplace;
      let official:ProductTruth|null=null;
      let providerReason='';
      if(sharedUrl){
        setStatus(message(locale,'Conferindo identidade do anúncio na fonte oficial…','Checking official listing identity…','Comprobando identidad en la fuente oficial…'));
        try{
          const response=kind==='MELI'
            ? await resolveOfficialProductLink({user,organizationId,url:sharedUrl})
            : await resolveShopeeProductLink({user,organizationId,url:sharedUrl});
          if(response.status==='RESOLVED' && response.product)official=response.product;
          else providerReason=('reason' in response?response.reason:undefined)||response.status;
        }catch(e){
          providerReason=e instanceof Error?e.message:'PROVIDER_UNAVAILABLE';
        }
      }
      setStatus(message(locale,'Preparando análise e Pin…','Preparing analysis and Pin…','Preparando análisis y Pin…'));
      let product:ProductTruth;
      if(official){
        product=official;
      }else{
        const title=(extracted?.title || fallbackTitle.trim() || parsed.title || '').trim().replace(/\s+/g,' ').slice(0,170);
        if(title.length<7){
          if(sharedUrl){
            setPendingLink(sharedUrl);
            setPendingReason(providerReason || 'LISTING_NOT_IDENTIFIED');
            setDetail(message(locale,
              'A fonte não identificou este anúncio com segurança. Links curtos da Shopee podem não revelar o item; o link foi preservado. Envie um print ou salve um rascunho pendente.',
              'The listing could not be verified. Opaque Shopee shortlinks do not reveal the exact product. Upload a screenshot or save a pending draft.',
              'No se verificó el anuncio. Los enlaces cortos de Shopee pueden ocultar el producto. Envía una captura o guarda un borrador.'));
            return;
          }
          throw new Error(message(locale,
            'Não consegui ler o produto. Envie um print legível ou informe o título.',
            'Product not recognized. Upload a clear screenshot or enter the title.',
            'Producto no identificado. Adjunta una captura o escribe el título.'));
        }
        // Screenshot without a URL gets a clearly labeled search destination, NOT a listing.
        const destination=sharedUrl || (kind==='MELI'
          ?'https://lista.mercadolivre.com.br/'+encodeURIComponent(title.replace(/\s+/g,'-'))
          :'https://shopee.com.br/search?keyword='+encodeURIComponent(title));
        product=createManualProductTruth({
          organizationId,marketplace:kind,productUrl:destination,title,
          ...(typeof extracted?.price==='number'?{price:extracted.price}:{}),
        });
        const observedAt=new Date().toISOString();
        if(sharedUrl&&kind==='SHOPEE'&&providerReason) {
          setDetail(message(locale,
            'Shopee: título do compartilhamento ou print é provisório. A API oficial não confirmou o anúncio ('+providerReason+'). Confira o produto antes de aprovar.',
            'Shopee listing could not be verified ('+providerReason+'). Shared text/OCR is provisional.',
            'Shopee no confirmó el anuncio ('+providerReason+'). Los datos compartidos son provisionales.'));
        }
        product={...product,title:{...product.title,source:extracted?'screenshot-ocr-unverified':'user-provided'},
          url:{...product.url,source:sharedUrl?'user-provided':'research-search-not-listing'},
          ...(extracted&&product.price?{price:{...product.price,source:'screenshot-ocr-unverified'}}:{}),
          listingVerified:false,
          ...(extracted?.seller?{sellerName:{value:extracted.seller,source:'screenshot-ocr-unverified',observedAt}}:{}),
          ...(typeof extracted?.rating==='number'?{rating:{value:extracted.rating,source:'screenshot-ocr-unverified',observedAt}}:{}),
          ...(typeof extracted?.reviewCount==='number'?{reviewCount:{value:extracted.reviewCount,source:'screenshot-ocr-unverified',observedAt}}:{}),
        };
      }
      product=attachDeclaredAffiliateUrl(product,link,affiliate && Boolean(source));
      setStatus(message(locale,'O NestAI está entendendo o produto e criando títulos específicos…','NestAI is understanding this product and writing bespoke copy…','NestAI está analizando el producto y escribiendo textos específicos…'));
      let strategy:ProductAiStrategy|undefined;
      try{
        strategy=await Promise.race([
          generateAffiliatePinStrategy({
            user,organizationId,locale,product,observedFacts:extracted?.visibleFacts??[],
          }),
          new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error('NESTAI_STRATEGY_TIMEOUT')),22_000)),
        ]);
      }catch{
        // Zero-cost deterministic path is explicitly labeled in review;
        // source of truth, affiliate URL and user records remain untouched.
      }
      setStatus('');
      onImported(product,product.title.value,strategy,true);
    }catch(e){
      setStatus('');
      setError(e instanceof Error?e.message:'IMPORT_FAILED');
    }finally{setBusy(false);}
  }


  function savePendingDraft(){
    if(!pendingLink)return;
    try{
      const draft=createManualProductTruth({
        organizationId,marketplace,productUrl:pendingLink,
        title:marketplace==='SHOPEE'?'Produto Shopee — identificação pendente':'Produto do Mercado Livre — identificação pendente',
      });
      const product=attachDeclaredAffiliateUrl({
        ...draft,title:{...draft.title,source:'link-only-pending'},
        listingVerified:false,
      },link,affiliate);
      setError('');setPendingLink('');
      onImported(product,product.title.value);
    }catch(e){
      setError(e instanceof Error?e.message:'DRAFT_SAVE_FAILED');
    }
  }

  return <section className="smart-auto-import" aria-label={message(locale,'Importação inteligente','Smart import','Importación inteligente')}>
    <header className="smart-auto-head">
      <div><p className="eyebrow">SMART IMPORT · NESTAI</p>
      <h2>{message(locale,'Cole o link. Ou envie o print.','Paste a link. Or upload a screenshot.','Pega un enlace. O envía una captura.')}</h2>
      <p>{message(locale,'O Radar identifica o que a fonte permitir, analisa o potencial e prepara o pacote criativo para revisão.',
        'The Radar gathers verifiable facts, analyzes the opportunity and prepares a reviewable creative pack.',
        'El Radar identifica datos verificables, analiza y prepara el creativo para revisión.')}</p></div>
    </header>
    <p className="field-hint">{message(locale,
      'Mercado Livre e Shopee: primeiro tentamos identificar o anúncio oficialmente. Links curtos sem ID verificável precisam de print ou título; a IA não inventará características, preços ou comissão.',
      'Mercado Livre and Shopee: we check official listing identity first. Opaque shortlinks require a screenshot or title; AI never fabricates specifications or commission.',
      'Mercado Livre y Shopee: primero comprobamos la identidad oficial. Los enlaces cortos pueden necesitar una captura. La IA no inventa datos.')}</p>
    <div className="smart-auto-grid">
      <div className="smart-auto-main">
        <label>{message(locale,'Link do produto (opcional se houver print)','Product link (optional with screenshot)','Enlace del producto (opcional con captura)')}
          <textarea rows={2} placeholder="https://meli.la/... ou https://s.shopee.com.br/..." value={link}
            onChange={e=>{setLink(e.target.value);setPendingLink('');setPendingReason('');setDetail('');setError('');const facts=parseSharedProductText(e.target.value);if(facts.marketplace)setMarketplace(facts.marketplace);}} />
        </label>
        <fieldset className="smart-affiliate-fieldset">
          <legend>{message(locale,'O link colado já é de afiliado?','Is this already an affiliate link?','¿Ya es un enlace de afiliado?')}</legend>
          <label><input type="radio" name="smart-link-affiliate" checked={!affiliate} onChange={()=>setAffiliate(false)}/> {message(locale,'Não, é um link comum','No, regular link','No, enlace normal')}</label>
          <label><input type="radio" name="smart-link-affiliate" checked={affiliate} onChange={()=>setAffiliate(true)}/> {message(locale,'Sim, já é meu link afiliado','Yes, my affiliate link','Sí, ya es mi enlace de afiliado')}</label>
          {affiliate&&<small role="status">{message(locale,
            'Este mesmo link preencherá o campo afiliado. A comissão ainda precisa ser confirmada no seu programa.',
            'This same URL will be copied to the affiliate field; commission is not independently verified.',
            'El enlace rellenará el campo afiliado; la comisión no está verificada.')}</small>}
        </fieldset>
      </div>
      <div className="smart-auto-file">
        <strong>{message(locale,'Print do anúncio','Listing screenshot','Captura del anuncio')}</strong>
        <p>{message(locale,'PNG, JPG ou WebP · até 7 MB · evite dados pessoais. O NestAI lê o texto visível; não certifica a oferta.',
          'PNG/JPG/WebP up to 7 MB. Avoid personal information. OCR is not listing verification.',
          'PNG/JPG/WebP hasta 7 MB. Evita datos personales. El OCR no verifica la oferta.')}</p>
        <button type="button" className="button secondary" onClick={()=>input.current?.click()} disabled={busy}>
          {screenshot?screenshot.name:message(locale,'Enviar print','Upload screenshot','Subir captura')}
        </button>
        <input ref={input} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setScreenshot(e.target.files?.[0]||null)}/>
      </div>
    </div>
    <details className="smart-auto-optional" key={pendingLink||'empty'} open={Boolean(pendingLink)}>
      <summary>{message(locale,'Caso a fonte não identifique o produto','If identification fails','Si falla la identificación')}</summary>
      <div className="smart-auto-extra">
        <label>{message(locale,'Título (somente se necessário)','Title (only if needed)','Título (solo si es necesario)')}
          <input value={fallbackTitle} onChange={e=>setFallbackTitle(e.target.value)} placeholder={message(locale,'Nome do produto','Product name','Nombre del producto')}/>
        </label>
        <label>Marketplace
          <select value={marketplace} onChange={e=>setMarketplace(e.target.value as 'MELI'|'SHOPEE')}>
            <option value="MELI">Mercado Livre</option><option value="SHOPEE">Shopee</option>
          </select>
        </label>
      </div>
    </details>
    {detail&&<p role="status" className="field-hint">{detail}</p>}
    {pendingLink&&<div className="smart-auto-pending" role="region"
      aria-label={message(locale,'Link preservado para revisão','Pending link','Enlace pendiente')}>
      <strong>{message(locale,'Link salvo no formulário, produto ainda não identificado','Link preserved, product not identified','Enlace conservado, producto no identificado')}</strong>
      <p>{message(locale,
        'Não criaremos uma análise ou Pin com um produto fictício. Você pode enviar um print agora, escrever o título acima ou guardar o link como rascunho para continuar.',
        'We will not generate a fictional product Pin. Upload a screenshot, enter the title, or save the link as a pending draft.',
        'No inventaremos un Pin. Sube una captura, escribe el título o guarda el enlace pendiente.')}</p>
      <small>{pendingReason}</small>
      <div className="smart-auto-pending-actions">
        <a className="button secondary" href={pendingLink} target="_blank" rel="noopener noreferrer">
          {message(locale,'Abrir anúncio para tirar print ↗','Open listing for screenshot ↗','Abrir producto para captura ↗')}
        </a>
        <button className="button secondary" type="button" onClick={savePendingDraft}>
          {message(locale,'Salvar link como rascunho (sem Pin)','Save pending link (no Pin)','Guardar enlace pendiente (sin Pin)')}
        </button>
      </div>
    </div>}
    {error&&<p role="alert" className="field-error">{error}</p>}
    {status&&<p role="status" className="field-hint">{status}</p>}
    <button className="button primary smart-auto-button" type="button" disabled={busy||!user||(!link.trim()&&!screenshot)}
      onClick={()=>void analyze()}>
      {busy?message(locale,'Analisando produto…','Analyzing…','Analizando…'):
        message(locale,'Entender produto com NestAI e criar Pin →','Understand product with NestAI and create Pin →','Analizar producto con NestAI y crear Pin →')}
    </button>
  </section>;
}
