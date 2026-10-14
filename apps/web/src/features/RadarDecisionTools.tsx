import type { Opportunity } from '@nestaffiliate/radar';
import { isSafeOfferUrl } from '@nestaffiliate/radar';
import { useI18n } from '../lib/i18n-context';
import { radarOfferId, type RadarSort, type SavedRadarOffer } from '../lib/radarWorkspace';
import './radar-workspace.css';

function verifiedCommission(item:Opportunity):number|null {
  const rate=item.product.commissionRate;
  return rate && Number.isFinite(rate.value) && rate.value>0 && rate.value<=1
    && /affiliate|official|manual-confirmed/i.test(rate.source)?rate.value:null;
}

export function RadarResearchLibrary({recent,saved,preferred,onRestoreSearch,onRemoveSaved,onClear}:{
 recent:string[];
 saved:SavedRadarOffer[];
 preferred:string|null;
 onRestoreSearch:(query:string)=>void;
 onRemoveSaved:(id:string)=>void;
 onClear:()=>void;
}){
  const {locale}=useI18n();const en=locale==='en',es=locale==='es';
  if(!recent.length&&!saved.length&&!preferred)return null;
  return <details className="radar7-library">
    <summary>{en?'My research':es?'Mis búsquedas':'Minhas pesquisas'} · {saved.length} {en?'saved':es?'guardados':'salvos'}</summary>
    <div className="radar7-library-content">
      {preferred&&<p className="muted">{en?'Selected interest':es?'Interés seleccionado':'Interesse escolhido'}: <strong>{preferred}</strong></p>}
      {recent.length>0&&<section>
        <h3>{en?'Recent searches':es?'Búsquedas recientes':'Buscas recentes'}</h3>
        <div className="radar7-recent">{recent.map(value=><button key={value} type="button" className="button secondary" onClick={()=>onRestoreSearch(value)}>{value} ↗</button>)}</div>
      </section>}
      {saved.length>0&&<section>
        <h3>{en?'Saved for later':es?'Guardados para después':'Produtos salvos para depois'}</h3>
        <p className="muted">{en?'Saved on this device only. Prices and availability are snapshots; verify again before publishing.':es?'Solo guardados en este dispositivo. Verifica precio y disponibilidad antes de publicar.':'Salvos apenas neste dispositivo. Preço e disponibilidade são registros antigos: confirme novamente antes de publicar.'}</p>
        <div className="radar7-saved-list">{saved.map(item=><article key={item.id}>
          <div><strong>{item.title}</strong><small>{item.marketplace==='MELI'?'Mercado Livre':item.marketplace==='SHOPEE'?'Shopee':'Amazon'} · {new Date(item.savedAt).toLocaleDateString(locale)}</small></div>
          <div className="radar7-saved-actions">
            {item.keyword&&<button className="button secondary" type="button" onClick={()=>onRestoreSearch(item.keyword)}>{en?'Research again':es?'Buscar de nuevo':'Pesquisar novamente'}</button>}
            {item.url&&<a className="button secondary" href={item.url} target="_blank" rel="noopener noreferrer">{en?'View listing':es?'Ver anuncio':'Ver anúncio'}</a>}
            <button className="text-button" type="button" onClick={()=>onRemoveSaved(item.id)} aria-label={(en?'Remove saved item ':es?'Quitar producto guardado ':'Remover produto salvo ')+item.title}>{en?'Remove':es?'Quitar':'Remover'}</button>
          </div>
        </article>)}</div>
      </section>}
      <button type="button" className="text-button radar7-clear" onClick={onClear}>{en?'Clear research on this device':es?'Borrar búsquedas de este dispositivo':'Limpar minhas pesquisas deste dispositivo'}</button>
    </div>
  </details>;
}

export function RadarComparisonBar({items,selectedIds,onToggle,onClear,onPrepare,sort,onSortChange}:{
 items:Opportunity[];
 selectedIds:string[];
 onToggle:(id:string)=>void;
 onClear:()=>void;
 onPrepare:(item:Opportunity)=>void;
 sort:RadarSort;
 onSortChange:(sort:RadarSort)=>void;
}){
  const {locale}=useI18n();const en=locale==='en',es=locale==='es';
  const selected=selectedIds.map(id=>items.find(item=>radarOfferId(item.product)===id)).filter((item):item is Opportunity=>Boolean(item));
  const money=(value:number,currency:string)=>{
    try{return new Intl.NumberFormat(locale,{style:'currency',currency}).format(value);}catch{return String(value);}
  };
  return <section className="radar7-workbench" aria-label={en?'Product comparison tools':es?'Herramientas de comparación':'Ferramentas para comparar produtos'}>
    <div className="radar7-toolbar">
      <label>{en?'Order by':es?'Ordenar por':'Ordenar por'}
        <select value={sort} onChange={event=>onSortChange(event.target.value as RadarSort)}>
          <option value="recommended">{en?'Recommended':es?'Recomendados':'Recomendados'}</option>
          <option value="priceAsc">{en?'Lowest known price':es?'Menor precio conocido':'Menor preço conhecido'}</option>
          <option value="priceDesc">{en?'Highest known price':es?'Mayor precio conocido':'Maior preço conhecido'}</option>
          <option value="sales">{en?'Reported sales':es?'Ventas informadas':'Vendas informadas'}</option>
          <option value="commission">{en?'Verified commission rate':es?'Comisión verificada':'Comissão verificada'}</option>
        </select>
      </label>
      <span className="muted">{en?'Compare up to 3 options':es?'Compara hasta 3 opciones':'Compare até 3 opções'}</span>
      {selected.length>0&&<button type="button" className="text-button" onClick={onClear}>{en?'Clear selection':es?'Limpiar selección':'Limpar seleção'}</button>}
    </div>
    {selected.length>0&&<div className="radar7-comparison">
      <div className="radar7-comparison-heading"><h3>{en?'Your comparison':es?'Tu comparación':'Sua comparação'} ({selected.length}/3)</h3>
        <p>{en?'Compare different products or listings side by side. We do not claim they are identical.':es?'Compara productos u ofertas distintos; no asumimos que son idénticos.':'Compare anúncios ou produtos diferentes lado a lado. Não presumimos que sejam idênticos.'}</p>
      </div>
      <div className="radar7-table-scroll"><table>
        <thead><tr><th scope="col">{en?'Details':es?'Detalles':'Informação'}</th>{selected.map(item=><th scope="col" key={radarOfferId(item.product)}>{item.product.title.value}</th>)}</tr></thead>
        <tbody>
          <tr><th scope="row">Marketplace</th>{selected.map(item=><td key={radarOfferId(item.product)}>{item.product.marketplace==='MELI'?'Mercado Livre':'Shopee'}</td>)}</tr>
          <tr><th scope="row">{en?'Price':es?'Precio':'Preço'}</th>{selected.map(item=><td key={radarOfferId(item.product)}>{item.product.price?money(item.product.price.value,item.product.currency.value):'—'}</td>)}</tr>
          <tr><th scope="row">{en?'Availability':es?'Disponibilidad':'Disponibilidade'}</th>{selected.map(item=><td key={radarOfferId(item.product)}>{item.product.availability.value==='available'?(en?'Reported available':es?'Disponible':'Disponível'):en?'Not confirmed':es?'No confirmada':'Não confirmada'}</td>)}</tr>
          <tr><th scope="row">{en?'Reported sales':es?'Ventas informadas':'Vendas informadas'}</th>{selected.map(item=><td key={radarOfferId(item.product)}>{typeof item.product.soldQuantity?.value==='number'?item.product.soldQuantity.value.toLocaleString(locale):'—'}</td>)}</tr>
          <tr><th scope="row">{en?'Rating':es?'Calificación':'Avaliação'}</th>{selected.map(item=><td key={radarOfferId(item.product)}>{typeof item.product.rating?.value==='number'?item.product.rating.value.toFixed(1):'—'}</td>)}</tr>
          <tr><th scope="row">{en?'Verified commission rate':es?'Comisión verificada':'Comissão verificada'}</th>{selected.map(item=><td key={radarOfferId(item.product)}>{verifiedCommission(item)!==null?new Intl.NumberFormat(locale,{style:'percent',maximumFractionDigits:1}).format(verifiedCommission(item)!):'—'}</td>)}</tr>
          <tr><th scope="row">{en?'Next step':es?'Próximo paso':'Próxima ação'}</th>{selected.map(item=><td key={radarOfferId(item.product)}>
            <button type="button" className="button primary" onClick={()=>onPrepare(item)}>{en?'Prepare Pin':es?'Preparar Pin':'Preparar Pin'}</button>
            <button type="button" className="text-button" onClick={()=>onToggle(radarOfferId(item.product))}>{en?'Remove from comparison':es?'Quitar de comparación':'Retirar da comparação'}</button>
            {isSafeOfferUrl(item.product.url?.value,item.product.marketplace)&&<a href={item.product.url.value} target="_blank" rel="noopener noreferrer">{en?'Original listing':es?'Anuncio original':'Anúncio original'} ↗</a>}
          </td>)}</tr>
        </tbody>
      </table></div>
      <p className="muted">{en?'Unknown data is displayed as a dash. Rates, prices and sales are never estimated here.':es?'Los datos desconocidos aparecen como raya. Sin estimaciones de precio, ventas o comisión.':'Dados desconhecidos aparecem como travessão. Não estimamos preço, vendas ou comissão nesta comparação.'}</p>
    </div>}
  </section>;
}
