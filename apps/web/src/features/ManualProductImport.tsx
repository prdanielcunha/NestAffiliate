import { useState } from 'react';
import type { ProductTruth } from '@nestaffiliate/core';
import { createManualProductTruth } from '@nestaffiliate/integrations';
import { useI18n } from '../lib/i18n-context';

export function ManualProductImport({
  organizationId,
  onImported,
}:{
  organizationId:string;
  onImported:(product:ProductTruth,keyword:string)=>void;
}){
  const { t } = useI18n();
  const [marketplace,setMarketplace]=useState<'SHOPEE'|'MELI'>('SHOPEE');
  const [title,setTitle]=useState('');
  const [productUrl,setProductUrl]=useState('');
  const [affiliateUrl,setAffiliateUrl]=useState('');
  const [price,setPrice]=useState('');
  const [keyword,setKeyword]=useState('');
  const [rights,setRights]=useState<ProductTruth['assetRights']>('UNKNOWN');
  const [error,setError]=useState('');

  function submit(){
    try{
      if(!title.trim() || !productUrl.trim()) throw new Error(t('fillTitleUrl'));
      const parsedPrice=price.trim() ? Number(price.replace(',','.')) : undefined;
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
      onImported(product,keyword.trim() || title.trim());
      setError('');
    }catch(err){
      setError(err instanceof Error ? err.message : t('importFailed'));
    }
  }

  return <section className="manual-import">
    <div className="section-heading"><div><p className="eyebrow">{t('manualImport')}</p><h2>{t('addWithoutScraping')}</h2></div></div>
    <div className="form-grid">
      <label>Marketplace<select value={marketplace} onChange={(e)=>setMarketplace(e.target.value as 'SHOPEE'|'MELI')}><option value="SHOPEE">Shopee</option><option value="MELI">Mercado Livre</option></select></label>
      <label>{t('title')}<input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder={t('productName')} /></label>
      <label className="span-2">{t('officialProductUrl')}<input value={productUrl} onChange={(e)=>setProductUrl(e.target.value)} placeholder="https://..." inputMode="url" /></label>
      <label className="span-2">{t('affiliateLink')}<input value={affiliateUrl} onChange={(e)=>setAffiliateUrl(e.target.value)} placeholder="https://..." inputMode="url" /></label>
      <label>{t('optionalPrice')}<input value={price} onChange={(e)=>setPrice(e.target.value)} placeholder="69,90" inputMode="decimal" /></label>
      <label>{t('assetRights')}<select value={rights} onChange={(e)=>setRights(e.target.value as ProductTruth['assetRights'])}><option value="UNKNOWN">{t('unconfirmed')}</option><option value="AUTHORIZED">{t('authorized')}</option><option value="USER_PROVIDED">{t('providedByMe')}</option><option value="GENERATED">{t('generated')}</option></select></label>
      <label className="span-2">{t('intentKeyword')}<input value={keyword} onChange={(e)=>setKeyword(e.target.value)} placeholder="Ex.: cozinha pequena organizada" /></label>
    </div>
    {error && <p className="field-error">{error}</p>}
    <button className="button primary" onClick={submit}>{t('createOpportunity')}</button>
    <p className="field-hint">{t('truthNoInvent')}</p>
  </section>;
}
