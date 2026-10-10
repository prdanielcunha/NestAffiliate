import { useEffect, useRef, useState } from 'react';
import type { ProductTruth } from '@nestaffiliate/core';
import {
  createManualProductTruth,
  cleanSharedListingUrl,
  cleanSharedProductTitle,
  parseSharedProductText,
  parseShopeeProductReference,
} from '@nestaffiliate/integrations';
import { useI18n } from '../lib/i18n-context';
import { useAuth } from '../lib/auth';
import { searchMercadoLivreBroker } from '../services/mercadoLivreBroker';
import { isSafeOfferUrl } from '@nestaffiliate/radar';
import { buildShopeeManualSignals, type OpportunitySignals, type ShopeeManualSignalType } from '@nestaffiliate/radar';

export function ManualProductImport({
  organizationId,
  onImported,
  featured=false,
  defaultMarketplace='SHOPEE',
  seedKeyword='',
}:{
  organizationId:string;
  onImported:(product:ProductTruth,keyword:string,signals?:OpportunitySignals)=>void;
  featured?:boolean;
  defaultMarketplace?:'SHOPEE'|'MELI';
  seedKeyword?:string;
}){
  const { t,locale } = useI18n();
  const {user} = useAuth();
  const fileRef=useRef<HTMLInputElement>(null);
  const [marketplace,setMarketplace]=useState<'SHOPEE'|'MELI'>(defaultMarketplace);
  const [quickInput,setQuickInput]=useState('');
  const [title,setTitle]=useState('');
  const [productUrl,setProductUrl]=useState('');
  const [affiliateUrl,setAffiliateUrl]=useState('');
  const [price,setPrice]=useState('');
  const [imageUrl,setImageUrl]=useState('');
  const [keyword,setKeyword]=useState(seedKeyword);
  const [rights,setRights]=useState<ProductTruth['assetRights']>('UNKNOWN');
  const [shopeeSignal,setShopeeSignal]=useState<ShopeeManualSignalType>('SHOPEE_RECOMMENDATION');
  const [commissionRate,setCommissionRate]=useState('');
  const [rank,setRank]=useState('');
  const [error,setError]=useState('');
  const [evidenceUrl,setEvidenceUrl]=useState('');
  const [evidenceName,setEvidenceName]=useState('');
  const [officialMatches,setOfficialMatches]=useState<ProductTruth[]>([]);
  const [finding,setFinding]=useState(false);
  const [officialSelection,setOfficialSelection]=useState<ProductTruth|null>(null);
  const [researchInfo,setResearchInfo]=useState('');

  useEffect(()=>()=>{if(evidenceUrl.startsWith('blob:')) URL.revokeObjectURL(evidenceUrl);},[evidenceUrl]);
  useEffect(()=>{
    if(!featured || !seedKeyword.trim()) return;
    setKeyword((current)=>current.trim() ? current : seedKeyword.trim());
  },[featured,seedKeyword]);

  function applyQuickInput(value:string){
    setQuickInput(value);
    const facts=parseSharedProductText(value);
    if(facts.marketplace) setMarketplace(facts.marketplace);
    if(facts.productUrl) setProductUrl(facts.productUrl);
    if(facts.priceText) setPrice(facts.priceText);
    if(facts.title) setTitle((current)=>current.trim() ? current : facts.title);
    if(facts.title) setKeyword((current)=>current.trim() ? current : facts.title);
    setOfficialSelection(null);
    setOfficialMatches([]);
    setResearchInfo('');
    setError('');
  }

  async function findOfficialListings(){
    setOfficialMatches([]);
    setOfficialSelection(null);
    const query=cleanSharedProductTitle(title).slice(0,120).trim();
    if(marketplace!=='MELI' || !user || query.length<8){
      setResearchInfo(locale==='pt-BR'?'Informe o título ou cole o link completo do anúncio para pesquisar.':locale==='es'?'Escribe el título para buscar anuncios.':'Enter the title to search official listings.');
      return;
    }
    setFinding(true);
    setResearchInfo('');
    try{
      const found=await searchMercadoLivreBroker({user,organizationId,query,limit:8});
      const safe=found.filter(item=>item.marketplace==='MELI' && isSafeOfferUrl(item.url.value,'MELI') && item.title.value.length>6);
      setOfficialMatches(safe);
      if(!safe.length)setResearchInfo(locale==='pt-BR'?'Nenhum anúncio verificável retornado. Você pode continuar com um rascunho de pesquisa.':locale==='es'?'No se encontraron anuncios verificados.':'No verified listings were returned; you can continue with a research draft.');
    }catch{
      setResearchInfo(locale==='pt-BR'?'A consulta oficial está indisponível ou limitada. Nenhum dado será inventado; você pode continuar como rascunho.':locale==='es'?'La búsqueda oficial está limitada; no inventaremos datos.':'The official search is unavailable; we will not invent product data.');
    }finally{setFinding(false);}
  }

  function chooseOfficialListing(product:ProductTruth){
    setOfficialSelection(product);
    setProductUrl(product.url.value);
    setTitle(product.title.value);
    setKeyword(product.title.value);
    setPrice(typeof product.price?.value==='number' ? String(product.price.value).replace('.',',') : '');
    setImageUrl(product.imageUrl?.value ?? '');
    setRights('UNKNOWN');
    setOfficialMatches([]);
    setResearchInfo(locale==='pt-BR'?'Anúncio selecionado. Compare os detalhes com o produto desejado antes de continuar.':locale==='es'?'Anuncio elegido; revisa los detalles antes de continuar.':'Listing selected. Verify that it matches your intended product.');
  }

  function setEvidenceFile(file:File|null){
    if(!file || !file.type.startsWith('image/')) return;
    if(evidenceUrl.startsWith('blob:')) URL.revokeObjectURL(evidenceUrl);
    setEvidenceUrl(URL.createObjectURL(file));
    setEvidenceName(file.name || t('pastedScreenshot'));
    setError('');
  }

  function submit(){
    try{
      const normalizedUrl=cleanSharedListingUrl(productUrl);
      const normalizedTitle=cleanSharedProductTitle(title);
      if(!normalizedUrl) throw new Error(t('quickImportNeedsLink'));
      if(!normalizedTitle) throw new Error(t('quickImportNeedsTitle'));
      if(normalizedUrl!==productUrl.trim() || normalizedTitle!==title.trim()){
        setProductUrl(normalizedUrl);
        setTitle(normalizedTitle);
        setKeyword(normalizedTitle);
        setOfficialSelection(null);
        setError(locale==='pt-BR'?'Corrigimos texto ou links repetidos. Confira os campos e clique novamente para criar.':locale==='es'?'Corregimos texto o enlaces duplicados. Confirma los datos.':'Repeated text or links were cleaned. Review and submit again.');
        return;
      }
      const parsedPrice=price.trim() ? Number(price.replace(/\./g,'').replace(',','.')) : undefined;
      if(parsedPrice !== undefined && !Number.isFinite(parsedPrice)) throw new Error(t('invalidPrice'));
      const shopeeReference=marketplace==='SHOPEE' ? parseShopeeProductReference(productUrl) : {};
      const product=officialSelection?.url.value===normalizedUrl && officialSelection.title.value===normalizedTitle
        ? officialSelection
        : createManualProductTruth({
        organizationId,
        marketplace,
        externalId:shopeeReference.itemId,
        title:normalizedTitle,
        productUrl:normalizedUrl,
        affiliateUrl:affiliateUrl || undefined,
        price:parsedPrice,
        imageUrl:imageUrl.trim() || undefined,
        assetRights:rights,
      });
      const effectiveKeyword=(keyword.trim() || seedKeyword.trim() || normalizedTitle).slice(0,120);
      let signals:OpportunitySignals|undefined;
      if(marketplace==='SHOPEE'){
        const parsedCommission=commissionRate.trim() ? Number(commissionRate.replace(',','.'))/100 : undefined;
        const parsedRank=rank.trim() ? Number(rank) : undefined;
        if(parsedCommission!==undefined && (!Number.isFinite(parsedCommission) || parsedCommission<0 || parsedCommission>1)){
          throw new Error(t('invalidCommission'));
        }
        if(parsedRank!==undefined && (!Number.isFinite(parsedRank) || parsedRank<1)){
          throw new Error(t('invalidRank'));
        }
        signals={
          signals:buildShopeeManualSignals({
            type:shopeeSignal,
            keyword:effectiveKeyword,
            productExternalId:product.externalId,
            commissionRate:parsedCommission,
            rank:parsedRank,
          }),
          commissionRate:parsedCommission,
        };
      }
      onImported(product,effectiveKeyword,signals);
      setError('');
    }catch(err){
      setError(err instanceof Error ? err.message : t('importFailed'));
    }
  }

  const form=<div
    className="smart-import-body"
    tabIndex={0}
    onPaste={(event)=>{
      const image=[...event.clipboardData.items].find((item)=>item.type.startsWith('image/'))?.getAsFile() ?? null;
      if(image){
        event.preventDefault();
        setEvidenceFile(image);
        return;
      }
      // Do not intercept text pasted into title, URL or affiliate inputs.
      // The quick textarea processes its own native onChange.
    }}
  >
    {featured && <div className="quick-mode-steps" aria-label={t('shopeeQuickStepsLabel')}>
      <span><b>1</b>{t('shopeeQuickStep1')}</span>
      <span><b>2</b>{t('shopeeQuickStep2')}</span>
      <span><b>3</b>{t('shopeeQuickStep3')}</span>
    </div>}

    <div className="quick-import-grid">
      <label className="span-2 quick-paste-field">
        <span>{featured ? t('pasteShopeeProduct') : t('pasteProductInfo')}</span>
        <textarea
          autoFocus={featured}
          value={quickInput}
          onChange={(event)=>applyQuickInput(event.target.value)}
          placeholder={featured ? t('pasteShopeeProductPlaceholder') : t('pasteProductInfoPlaceholder')}
          rows={featured ? 5 : 4}
        />
        {featured && <small>{t('pasteShopeeProductHint')}</small>}
      </label>

      {(!featured || evidenceUrl) && <div className="import-evidence span-2">
        <div>
          <strong>{t('productScreenshot')}</strong>
          <span>{t('productScreenshotBody')}</span>
        </div>
        <button className="button secondary" type="button" onClick={()=>fileRef.current?.click()}>{t('sendScreenshot')}</button>
        <input ref={fileRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event)=>setEvidenceFile(event.target.files?.[0] ?? null)} />
      </div>}

      {featured && !evidenceUrl && <div className="quick-secondary-action span-2">
        <span>{t('screenshotOptional')}</span>
        <button className="text-button" type="button" onClick={()=>fileRef.current?.click()}>{t('sendScreenshot')}</button>
        <input ref={fileRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event)=>setEvidenceFile(event.target.files?.[0] ?? null)} />
      </div>}

      {evidenceUrl && <div className="import-evidence-preview span-2">
        <img src={evidenceUrl} alt="" />
        <div>
          <strong>{evidenceName || t('pastedScreenshot')}</strong>
          <span>{t('screenshotEvidenceOnly')}</span>
          <button className="text-button" type="button" onClick={()=>{
            if(evidenceUrl.startsWith('blob:')) URL.revokeObjectURL(evidenceUrl);
            setEvidenceUrl('');
            setEvidenceName('');
          }}>{t('remove')}</button>
        </div>
      </div>}

      {!featured && <label>
        <span>Marketplace</span>
        <select value={marketplace} onChange={(e)=>setMarketplace(e.target.value as 'SHOPEE'|'MELI')}>
          <option value="SHOPEE">Shopee</option>
          <option value="MELI">Mercado Livre</option>
        </select>
      </label>}
      <label className={featured ? 'span-2' : ''}>
        <span>{t('title')}{featured && !title.trim() ? ` · ${t('required')}` : ''}</span>
        <input value={title} onChange={(e)=>{setTitle(e.target.value);setOfficialSelection(null);}} placeholder={featured ? t('productTitleAutoHint') : t('productName')} />
      </label>
      <label className="span-2">
        <span>{t('officialProductUrl')}</span>
        <input value={productUrl} onChange={(e)=>{
          const facts=parseSharedProductText(e.target.value);
          setProductUrl(facts.productUrl || e.target.value);
          setOfficialSelection(null);
          if(facts.marketplace)setMarketplace(facts.marketplace);
          if(facts.title && !title.trim())setTitle(facts.title);
        }} placeholder="https://shopee.com.br/..." inputMode="url" />
      </label>
    </div>

    {marketplace==='MELI' && <div className="span-2 import-official-research">
      <p className="field-hint">{locale==='pt-BR'
        ? 'Link curto reconhecido não significa anúncio identificado. Pesquise pelo título e escolha o anúncio exato para importar os dados oficiais disponíveis.'
        : locale==='es'
          ? 'Un enlace corto no identifica el anuncio exacto. Busca por título y confirma el resultado.'
          : 'A short link does not identify an exact listing. Search by title and confirm the result.'}</p>
      <button className="button secondary" type="button" disabled={finding || !user || title.trim().length<8} onClick={()=>void findOfficialListings()}>
        {finding?(locale==='pt-BR'?'Consultando Mercado Livre…':locale==='es'?'Buscando…':'Searching…')
          :(locale==='pt-BR'?'Buscar dados oficiais pelo título':locale==='es'?'Buscar anuncios oficiales':'Find official listings')}
      </button>
      {researchInfo && <p className="field-hint" role="status">{researchInfo}</p>}
      {officialSelection && <p className="field-hint" role="status">
        {locale==='pt-BR'?'Anúncio oficial selecionado (confirme que é exatamente a mesma oferta).':locale==='es'?'Anuncio oficial seleccionado.':'Official listing selected.'}
      </p>}
      {officialMatches.length>0 && <div className="import-official-matches" aria-label={locale==='pt-BR'?'Possíveis anúncios do Mercado Livre':'Official listing candidates'}>
        {officialMatches.map(candidate=><div className="import-official-match" key={candidate.productId}>
          {candidate.imageUrl?.value && <img src={candidate.imageUrl.value} alt="" loading="lazy" width={72} height={72} />}
          <div><strong>{candidate.title.value}</strong>
            <small>{candidate.price ? candidate.price.value.toLocaleString(locale,{style:'currency',currency:'BRL'}) : (locale==='pt-BR'?'Preço não informado':'Price unavailable')}</small>
            <small>{candidate.externalId} · {locale==='pt-BR'?'Origem: pesquisa do marketplace':'Marketplace research'}</small>
            <button className="button secondary" type="button" onClick={()=>chooseOfficialListing(candidate)}>
              {locale==='pt-BR'?'É o anúncio exato — usar dados':locale==='es'?'Es el anuncio exacto':'Use this exact listing'}
            </button>
          </div>
        </div>)}
      </div>}
    </div>}

    <details className="advanced-fields">
      <summary>{featured ? t('improveAnalysisOptional') : t('optionalDetails')}</summary>
      <div className="form-grid">
        <label className="span-2">{t('affiliateLink')}<input value={affiliateUrl} onChange={(e)=>setAffiliateUrl(e.target.value)} placeholder="https://..." inputMode="url" /></label>
        <label>{t('optionalPrice')}<input value={price} onChange={(e)=>{setPrice(e.target.value);setOfficialSelection(null);}} placeholder="69,90" inputMode="decimal" /></label>
        <label className="span-2">{locale==='pt-BR'?'URL da imagem do produto (opcional, uso sujeito a autorização)':locale==='es'?'URL de imagen del producto (opcional, requiere permiso)':'Product image URL (optional, requires permission)'}<input value={imageUrl} onChange={(e)=>setImageUrl(e.target.value)} placeholder="https://..." inputMode="url" /></label>
        <label>{t('assetRights')}<select value={rights} onChange={(e)=>setRights(e.target.value as ProductTruth['assetRights'])}><option value="UNKNOWN">{t('unconfirmed')}</option><option value="AUTHORIZED">{t('authorized')}</option><option value="USER_PROVIDED">{t('providedByMe')}</option><option value="GENERATED">{t('generated')}</option></select></label>
        {marketplace==='SHOPEE' && <>
          <label>{t('shopeeSignal')}<select value={shopeeSignal} onChange={(e)=>setShopeeSignal(e.target.value as ShopeeManualSignalType)}><option value="SHOPEE_RECOMMENDATION">{t('shopeeRecommendation')}</option><option value="SHOPEE_EXTRA_COMMISSION">{t('shopeeExtraCommission')}</option><option value="SHOPEE_TOP_SALES">{t('shopeeTopSales')}</option></select></label>
          <label>{t('commissionPercent')}<input value={commissionRate} onChange={(e)=>setCommissionRate(e.target.value)} placeholder="Ex.: 12" inputMode="decimal" /></label>
          {shopeeSignal==='SHOPEE_TOP_SALES' && <label>{t('rankingPosition')}<input value={rank} onChange={(e)=>setRank(e.target.value)} placeholder="Ex.: 7" inputMode="numeric" /></label>}
        </>}
        <label className="span-2">{t('intentKeyword')}<input value={keyword} onChange={(e)=>setKeyword(e.target.value)} placeholder={t('intentKeywordPlaceholder')} /></label>
      </div>
    </details>

    {error && <p className="field-error">{error}</p>}
    <button className="button primary smart-import-submit" type="button" onClick={submit}>{featured ? t('analyzeShopeeProduct') : t('createOpportunity')}</button>
    <p className="field-hint">{featured ? t('shopeeQuickImportTrust') : t('quickImportHint')}</p>
  </div>;

  if(featured){
    return <section id="shopee-quick-import" className="manual-import smart-import shopee-fast-import">
      <div className="featured-import-head">
        <div>
          <p className="eyebrow">{t('shopeeQuickModeActive')}</p>
          <strong>{t('quickImportShopeeTitle')}</strong>
          <span>{t('quickImportShopeeBody')}</span>
        </div>
        <span className="connection-status active">{t('availableNow')}</span>
      </div>
      {form}
    </section>;
  }

  return <details className="manual-import smart-import">
    <summary>
      <div>
        <p className="eyebrow">{t('manualImport')}</p>
        <strong>{t('quickImportTitle')}</strong>
        <span>{t('quickImportBody')}</span>
      </div>
      <span className="summary-action">{t('open')}</span>
    </summary>
    {form}
  </details>;
}
