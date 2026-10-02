import { useEffect, useRef, useState } from 'react';
import type { ProductTruth } from '@nestaffiliate/core';
import { createManualProductTruth } from '@nestaffiliate/integrations';
import { useI18n } from '../lib/i18n-context';
import { buildShopeeManualSignals, type OpportunitySignals, type ShopeeManualSignalType } from '@nestaffiliate/radar';

function detectMarketplace(value:string){
  const normalized=value.toLowerCase();
  if(normalized.includes('mercadolivre.') || normalized.includes('mercadolibre.com')) return 'MELI' as const;
  if(normalized.includes('shopee.')) return 'SHOPEE' as const;
  return null;
}

function extractProductFacts(value:string){
  const urls=value.match(/https:\/\/[^\s<>"']+/gi) ?? [];
  const productUrl=urls.find((url)=>/mercadolivre\.|shopee\./i.test(url)) ?? urls[0] ?? '';
  const marketplace=detectMarketplace(productUrl || value);
  const priceMatch=value.match(/R\$\s*([\d.]+(?:,\d{2})?)/i);
  const price=priceMatch?.[1] ?? '';
  const title=value
    .split(/\r?\n/)
    .map((line)=>line.trim())
    .find((line)=>
      line.length>=6 &&
      !/^https?:\/\//i.test(line) &&
      !/^R\$/i.test(line) &&
      !/^compartilh/i.test(line) &&
      !/^link/i.test(line)
    ) ?? '';
  return {productUrl,marketplace,price,title};
}

export function ManualProductImport({
  organizationId,
  onImported,
}:{
  organizationId:string;
  onImported:(product:ProductTruth,keyword:string,signals?:OpportunitySignals)=>void;
}){
  const { t } = useI18n();
  const fileRef=useRef<HTMLInputElement>(null);
  const [marketplace,setMarketplace]=useState<'SHOPEE'|'MELI'>('SHOPEE');
  const [quickInput,setQuickInput]=useState('');
  const [title,setTitle]=useState('');
  const [productUrl,setProductUrl]=useState('');
  const [affiliateUrl,setAffiliateUrl]=useState('');
  const [price,setPrice]=useState('');
  const [keyword,setKeyword]=useState('');
  const [rights,setRights]=useState<ProductTruth['assetRights']>('UNKNOWN');
  const [shopeeSignal,setShopeeSignal]=useState<ShopeeManualSignalType>('SHOPEE_RECOMMENDATION');
  const [commissionRate,setCommissionRate]=useState('');
  const [rank,setRank]=useState('');
  const [error,setError]=useState('');
  const [evidenceUrl,setEvidenceUrl]=useState('');
  const [evidenceName,setEvidenceName]=useState('');

  useEffect(()=>()=>{if(evidenceUrl.startsWith('blob:')) URL.revokeObjectURL(evidenceUrl);},[evidenceUrl]);

  function applyQuickInput(value:string){
    setQuickInput(value);
    const facts=extractProductFacts(value);
    if(facts.marketplace) setMarketplace(facts.marketplace);
    if(facts.productUrl) setProductUrl(facts.productUrl);
    if(facts.price) setPrice(facts.price);
    if(facts.title && !title.trim()) setTitle(facts.title);
    if(facts.title && !keyword.trim()) setKeyword(facts.title);
    setError('');
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
      if(!title.trim() || !productUrl.trim()) throw new Error(t('quickImportNeedsLinkTitle'));
      const parsedPrice=price.trim() ? Number(price.replace(/\./g,'').replace(',','.')) : undefined;
      if(parsedPrice !== undefined && !Number.isFinite(parsedPrice)) throw new Error(t('invalidPrice'));
      const product=createManualProductTruth({
        organizationId,
        marketplace,
        title,
        productUrl,
        affiliateUrl:affiliateUrl || undefined,
        price:parsedPrice,
        assetRights:rights,
      });
      const effectiveKeyword=keyword.trim() || title.trim();
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

  return <details className="manual-import smart-import">
    <summary>
      <div>
        <p className="eyebrow">{t('manualImport')}</p>
        <strong>{t('quickImportTitle')}</strong>
        <span>{t('quickImportBody')}</span>
      </div>
      <span className="summary-action">{t('open')}</span>
    </summary>

    <div
      className="smart-import-body"
      tabIndex={0}
      onPaste={(event)=>{
        const image=[...event.clipboardData.items].find((item)=>item.type.startsWith('image/'))?.getAsFile() ?? null;
        if(image){
          event.preventDefault();
          setEvidenceFile(image);
          return;
        }
        const text=event.clipboardData.getData('text/plain');
        if(text) applyQuickInput(text);
      }}
    >
      <div className="quick-import-grid">
        <label className="span-2">
          <span>{t('pasteProductInfo')}</span>
          <textarea
            value={quickInput}
            onChange={(event)=>applyQuickInput(event.target.value)}
            placeholder={t('pasteProductInfoPlaceholder')}
            rows={4}
          />
        </label>

        <div className="import-evidence span-2">
          <div>
            <strong>{t('productScreenshot')}</strong>
            <span>{t('productScreenshotBody')}</span>
          </div>
          <button className="button secondary" type="button" onClick={()=>fileRef.current?.click()}>{t('sendScreenshot')}</button>
          <input ref={fileRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event)=>setEvidenceFile(event.target.files?.[0] ?? null)} />
        </div>

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

        <label>
          <span>Marketplace</span>
          <select value={marketplace} onChange={(e)=>setMarketplace(e.target.value as 'SHOPEE'|'MELI')}>
            <option value="SHOPEE">Shopee</option>
            <option value="MELI">Mercado Livre</option>
          </select>
        </label>
        <label>
          <span>{t('title')}</span>
          <input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder={t('productName')} />
        </label>
        <label className="span-2">
          <span>{t('officialProductUrl')}</span>
          <input value={productUrl} onChange={(e)=>{setProductUrl(e.target.value);const detected=detectMarketplace(e.target.value);if(detected)setMarketplace(detected);}} placeholder="https://..." inputMode="url" />
        </label>
      </div>

      <details className="advanced-fields">
        <summary>{t('optionalDetails')}</summary>
        <div className="form-grid">
          <label className="span-2">{t('affiliateLink')}<input value={affiliateUrl} onChange={(e)=>setAffiliateUrl(e.target.value)} placeholder="https://..." inputMode="url" /></label>
          <label>{t('optionalPrice')}<input value={price} onChange={(e)=>setPrice(e.target.value)} placeholder="69,90" inputMode="decimal" /></label>
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
      <button className="button primary smart-import-submit" type="button" onClick={submit}>{t('createOpportunity')}</button>
      <p className="field-hint">{t('quickImportHint')}</p>
    </div>
  </details>;
}
