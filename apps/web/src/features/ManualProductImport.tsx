import { useState } from 'react';
import type { ProductTruth } from '@nestaffiliate/core';
import { createManualProductTruth } from '@nestaffiliate/integrations';

export function ManualProductImport({
  organizationId,
  onImported,
}:{
  organizationId:string;
  onImported:(product:ProductTruth,keyword:string)=>void;
}){
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
      if(!title.trim() || !productUrl.trim()) throw new Error('Preencha título e URL do produto.');
      const parsedPrice=price.trim() ? Number(price.replace(',','.')) : undefined;
      if(parsedPrice !== undefined && !Number.isFinite(parsedPrice)) throw new Error('Preço inválido.');
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
      setError(err instanceof Error ? err.message : 'Não foi possível importar.');
    }
  }

  return <section className="manual-import">
    <div className="section-heading"><div><p className="eyebrow">IMPORTAÇÃO OFICIAL / MANUAL</p><h2>Adicionar produto sem scraping</h2></div></div>
    <div className="form-grid">
      <label>Marketplace<select value={marketplace} onChange={(e)=>setMarketplace(e.target.value as 'SHOPEE'|'MELI')}><option value="SHOPEE">Shopee</option><option value="MELI">Mercado Livre</option></select></label>
      <label>Título<input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Nome do produto" /></label>
      <label className="span-2">URL oficial do produto<input value={productUrl} onChange={(e)=>setProductUrl(e.target.value)} placeholder="https://..." inputMode="url" /></label>
      <label className="span-2">Link afiliado<input value={affiliateUrl} onChange={(e)=>setAffiliateUrl(e.target.value)} placeholder="https://..." inputMode="url" /></label>
      <label>Preço opcional<input value={price} onChange={(e)=>setPrice(e.target.value)} placeholder="69,90" inputMode="decimal" /></label>
      <label>Direito do asset<select value={rights} onChange={(e)=>setRights(e.target.value as ProductTruth['assetRights'])}><option value="UNKNOWN">Não confirmado</option><option value="AUTHORIZED">Autorizado</option><option value="USER_PROVIDED">Enviado por mim</option><option value="GENERATED">Gerado</option></select></label>
      <label className="span-2">Intenção / palavra-chave<input value={keyword} onChange={(e)=>setKeyword(e.target.value)} placeholder="Ex.: cozinha pequena organizada" /></label>
    </div>
    {error && <p className="field-error">{error}</p>}
    <button className="button primary" onClick={submit}>Criar oportunidade</button>
    <p className="field-hint">O NestAffiliate não inventa rating, comissão, estoque, material ou frete. Campos não informados permanecem desconhecidos.</p>
  </section>;
}
