import {useState} from 'react';
import type { Opportunity } from '@nestaffiliate/radar';
import { isSafeOfferUrl,assessOfferIdentity,offerFreshness,observationTime } from '@nestaffiliate/radar';
import { useI18n } from '../lib/i18n-context';
import { radarOfferId, type RadarSort, type SavedRadarOffer } from '../lib/radarWorkspace';
import './radar-workspace.css';

function verifiedCommission(item:Opportunity):number|null {
  const rate=item.product.commissionRate;
  return rate && Number.isFinite(rate.value) && rate.value>0 && rate.value<=1
    && /affiliate|official|manual-confirmed/i.test(rate.source)?rate.value:null;
}

export function RadarResearchLibrary({recent,saved,preferred,syncEnabled,syncAvailable,syncStatus,onSyncEnabled,onSyncNow,onDeleteSyncedCopy,onRestoreSearch,onRemoveSaved,onClear,onExport,onImport}:{
 recent:string[];
 saved:SavedRadarOffer[];
 preferred:string|null;
 syncEnabled:boolean;
 syncAvailable:boolean;
 syncStatus:'off'|'syncing'|'synced'|'error'|'unavailable';
 onSyncEnabled:(value:boolean)=>void;
 onSyncNow:()=>void;
 onDeleteSyncedCopy:()=>Promise<void>;
 onRestoreSearch:(query:string)=>void;
 onRemoveSaved:(id:string)=>void;
 onClear:()=>void;
 onExport:()=>void;
 onImport:(file:File)=>Promise<void>;
}){
  const {locale}=useI18n();const en=locale==='en',es=locale==='es';
  const [importError,setImportError]=useState('');

  return <details className="radar7-library">
    <summary>{en?'My research':es?'Mis búsquedas':'Minhas pesquisas'} · {saved.length} {en?'saved':es?'guardados':'salvos'}</summary>
    <div className="radar7-library-content">
      <section className="radar8-sync" aria-label={en?'Private research synchronization':es?'Sincronización de investigación privada':'Sincronização privada de pesquisas'}>
        <div><strong>{en?'Keep my research on other devices':es?'Conservar mis búsquedas en otros dispositivos':'Acessar minhas pesquisas em outros dispositivos'}</strong>
          <p className="muted">{en?'Optional. Saved privately under your own account. Disabled by default.':es?'Opcional. Guardada solo en tu cuenta. Desactivada por defecto.':'Opcional. Guardada apenas na sua conta. Desativada por padrão.'}</p>
        </div>
        <label className="radar8-sync-toggle"><input type="checkbox" checked={syncEnabled} disabled={!syncAvailable}
          onChange={event=>onSyncEnabled(event.target.checked)}/>
          {en?'Enable private sync':es?'Activar sincronización privada':'Ativar sincronização privada'}
        </label>
        {syncEnabled&&<div className="radar8-sync-actions">
          <span role="status">{syncStatus==='syncing'?(en?'Syncing…':es?'Sincronizando…':'Sincronizando…'):
            syncStatus==='synced'?(en?'Last change synchronized':es?'Último cambio sincronizado':'Última alteração sincronizada'):
            syncStatus==='error'?(en?'Could not sync; research remains on this device.':es?'Fallo la sincronización; los datos siguen aquí.':'Falha na sincronização; suas pesquisas continuam neste dispositivo.'):
            syncStatus==='unavailable'?(en?'Sync not available in this session':es?'Sincronización no disponible':'Sincronização indisponível nesta sessão'):'—'}</span>
          <button type="button" className="button secondary" disabled={!syncAvailable||syncStatus==='syncing'} onClick={onSyncNow}>
            {en?'Sync now':es?'Sincronizar ahora':'Sincronizar agora'}
          </button>
          <button type="button" className="text-button" disabled={!syncAvailable} onClick={()=>{
            const question=en?'Delete the cloud copy? Research on this device will stay.':es?'¿Eliminar copia en la nube? Se conservan los datos locales.':'Excluir sua cópia na nuvem? As pesquisas deste dispositivo serão preservadas.';
            if(window.confirm(question))void onDeleteSyncedCopy().catch(()=>window.alert(en?'Could not delete the cloud copy. Try again.':es?'No se pudo borrar la copia. Inténtalo de nuevo.':'Não foi possível excluir a cópia na nuvem. Tente novamente.'));
          }}>{en?'Delete cloud copy':es?'Eliminar copia de la nube':'Excluir cópia na nuvem'}</button>
        </div>}
        <small>{en?'Only this account can access the private cloud record. Concurrent edits use the latest saved version.':es?'Solo esta cuenta tiene acceso. En ediciones simultáneas prevalece la versión más reciente.':'Somente sua conta acessa a cópia privada. Se dois dispositivos editarem simultaneamente, prevalece a versão mais recente.'}</small>
      </section>
      {preferred&&<p className="muted">{en?'Selected interest':es?'Interés seleccionado':'Interesse escolhido'}: <strong>{preferred}</strong></p>}
      {recent.length>0&&<section>
        <h3>{en?'Recent searches':es?'Búsquedas recientes':'Buscas recentes'}</h3>
        <div className="radar7-recent">{recent.map(value=><button key={value} type="button" className="button secondary" onClick={()=>onRestoreSearch(value)}>{value} ↗</button>)}</div>
      </section>}
      {saved.length>0&&<section>
        <h3>{en?'Saved for later':es?'Guardados para después':'Produtos salvos para depois'}</h3>
        <p className="muted">{en?'Saved research is a historical snapshot. If sync is enabled, a private copy is also in your account. Recheck listings before publishing.':es?'Los datos guardados son históricos y pueden sincronizarse en privado. Comprueba cada oferta antes de publicar.':'Pesquisas salvas são registros históricos. Se a sincronização estiver ativada, haverá também uma cópia privada na conta. Confirme a oferta antes de publicar.'}</p>
        <div className="radar7-saved-list">{saved.map(item=><article key={item.id}>
          <div><strong>{item.title}</strong><small>{item.marketplace==='MELI'?'Mercado Livre':item.marketplace==='SHOPEE'?'Shopee':'Amazon'} · {new Date(item.savedAt).toLocaleDateString(locale)}</small>
            <small className={offerFreshness(item.observedAt).status==='CURRENT'?'radar9-fresh-ok':'radar9-fresh-alert'} role="status">{offerFreshness(item.observedAt).status==='CURRENT'
              ? (en?'Recently observed · still verify before sharing':es?'Observación reciente · verificar':'Observação recente · confirmar antes de divulgar')
              : (en?'Listing data may be out of date — check the original':es?'Datos antiguos o desconocidos — revisar anuncio':'Dados antigos ou desconhecidos — confira o anúncio original')}</small>
          </div>
          <div className="radar7-saved-actions">
            {item.keyword&&<button className="button secondary" type="button" onClick={()=>onRestoreSearch(item.keyword)}>{en?'Research again':es?'Buscar de nuevo':'Pesquisar novamente'}</button>}
            {item.url&&<a className="button secondary" href={item.url} target="_blank" rel="noopener noreferrer">{en?'View listing':es?'Ver anuncio':'Ver anúncio'}</a>}
            <button className="text-button" type="button" onClick={()=>onRemoveSaved(item.id)} aria-label={(en?'Remove saved item ':es?'Quitar producto guardado ':'Remover produto salvo ')+item.title}>{en?'Remove':es?'Quitar':'Remover'}</button>
          </div>
        </article>)}</div>
      </section>}
      <div className="radar9-backup">
        <strong>{en?'Keep a backup of my research':es?'Copia de seguridad':'Backup das minhas pesquisas'}</strong>
        <p className="muted">{en?'Export or restore saved research on this device. Cloud credentials are never included. Import replaces this research list only.':es?'Exporta o restaura búsquedas locales. Nunca incluye credenciales. Importar reemplaza esta lista.':'Exporte ou restaure suas pesquisas neste dispositivo. Nunca inclui credenciais. A importação substitui apenas esta lista.'}</p>
        <div className="radar9-backup-actions">
          <button className="button secondary" type="button" onClick={onExport}>{en?'Export JSON backup':es?'Exportar backup JSON':'Exportar backup JSON'}</button>
          <label className="radar9-import-label">{en?'Restore JSON backup':es?'Restaurar backup JSON':'Restaurar backup JSON'}
            <input type="file" accept=".json,application/json" aria-label={en?'Restore research JSON':es?'Restaurar investigaciones JSON':'Restaurar pesquisas JSON'}
              onChange={event=>{
                const file=event.currentTarget.files?.[0];event.currentTarget.value='';
                if(file)void onImport(file).then(()=>setImportError('')).catch(()=>setImportError(en?'Invalid backup file':es?'Archivo inválido':'Arquivo de backup inválido'));
              }}/>
          </label>
        </div>
        {importError&&<p role="alert" className="field-error">{importError}</p>}
      </div>
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
      {selected.length>1&&<div className="radar9-equivalence" aria-live="polite">{selected.flatMap((a,i)=>selected.slice(i+1).map(b=>{
        const assessment=assessOfferIdentity(a.product,b.product);
        return <div key={radarOfferId(a.product)+'/'+radarOfferId(b.product)}>
          <strong>{a.product.marketplace} ↔ {b.product.marketplace}: {
            assessment.comparableAsSameProduct
              ? (en?'Exact identity confirmed':es?'Identidad exacta confirmada':'Identidade exata confirmada')
              : assessment.status==='DIFFERENT'
                ? (en?'Different product or variant':es?'Producto o variante diferente':'Produto ou variante diferente')
                : (en?'Identity not verified':es?'Equivalencia no verificada':'Equivalência não verificada')
          }</strong>
          <span>{assessment.comparableAsSameProduct
            ? (en?'Official listing or GTIN evidence.':es?'Identificador oficial o GTIN verificado.':'Comprovação por anúncio ou GTIN oficial.')
            : (en?'Do not assume these offers are interchangeable.':es?'No suponga que son productos idénticos.':'Não presuma que sejam o mesmo item.')}</span>
        </div>;
      }))}</div>}
      <div className="radar7-table-scroll"><table>
        <thead><tr><th scope="col">{en?'Details':es?'Detalles':'Informação'}</th>{selected.map(item=><th scope="col" key={radarOfferId(item.product)}>{item.product.title.value}</th>)}</tr></thead>
        <tbody>
          <tr><th scope="row">Marketplace</th>{selected.map(item=><td key={radarOfferId(item.product)}>{item.product.marketplace==='MELI'?'Mercado Livre':'Shopee'}</td>)}</tr>
          <tr><th scope="row">{en?'Price':es?'Precio':'Preço'}</th>{selected.map(item=><td key={radarOfferId(item.product)}>{item.product.price?money(item.product.price.value,item.product.currency.value):'—'}</td>)}</tr>
          <tr><th scope="row">{en?'Observed at':es?'Observado en':'Observado em'}</th>{selected.map(item=><td key={radarOfferId(item.product)}>
            <strong className={offerFreshness(observationTime(item.product)).status==='CURRENT'?'radar9-fresh-ok':'radar9-fresh-alert'}>
              {offerFreshness(observationTime(item.product)).status==='CURRENT'?(en?'Recent observation':es?'Observación reciente':'Observação recente'):
                (en?'Recheck price and availability':es?'Revisar precio y disponibilidad':'Rever preço e disponibilidade')}
            </strong>
            <small>{observationTime(item.product)?.slice(0,10)??'—'}</small>
          </td>)}</tr>
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
