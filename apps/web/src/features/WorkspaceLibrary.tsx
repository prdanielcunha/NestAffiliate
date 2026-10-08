import {useMemo,useState} from 'react';
import {NavLink} from 'react-router-dom';
import type {Campaign} from '@nestaffiliate/core';
import {useI18n} from '../lib/i18n-context';

const norm=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function WorkspaceLibrary({campaigns,boards,mode}:{campaigns:Campaign[];boards:string[];mode:'library'|'boards'}){
 const {locale}=useI18n();const pt=locale==='pt-BR',es=locale==='es';
 const [query,setQuery]=useState('');const [market,setMarket]=useState<'ALL'|'MELI'|'SHOPEE'>('ALL');
 const [board,setBoard]=useState('ALL');
 const names=useMemo(()=>Array.from(new Set([...boards,...campaigns.map(c=>c.currentVersion.boardName).filter(Boolean)])).sort((a,b)=>a.localeCompare(b)),[boards,campaigns]);
 const visible=campaigns.filter(c=>(market==='ALL'||c.marketplace===market) && (board==='ALL'||c.currentVersion.boardName===board) && (norm(c.currentVersion.keyword+' '+c.currentVersion.product.title.value+' '+c.currentVersion.boardName).includes(norm(query))));
 return <div className="page v5-workspace-library">
  <header className="page-title"><p className="eyebrow">NESTAFFILIATE · {mode==='library'?'LIBRARY':'BOARDS'}</p>
   <h1>{mode==='library'?(pt?'Biblioteca de campanhas':es?'Biblioteca de campañas':'Campaign library'):(pt?'Pastas e estratégias':es?'Tableros y estrategias':'Boards and strategy')}</h1>
   <p>{pt?'Seus dados reais, versões preservadas e acesso direto à edição e publicação.':es?'Tus campañas reales y sus versiones.':'Your actual campaigns and preserved versions — no placeholder content.'}</p>
  </header>
  <div className="library-facts"><div><strong>{campaigns.length}</strong><span>{pt?'Campanhas':es?'Campañas':'Campaigns'}</span></div>
   <div><strong>{campaigns.filter(c=>c.status==='PUBLISHED').length}</strong><span>{pt?'Publicadas':es?'Publicadas':'Published'}</span></div>
   <div><strong>{campaigns.filter(c=>Boolean(c.currentVersion.creativeAsset)).length}</strong><span>{pt?'Com imagem criativa':es?'Con imagen':'With creative assets'}</span></div></div>
  {mode==='boards'&&<div className="board-library-grid">{names.map(name=>{
   const count=campaigns.filter(c=>c.currentVersion.boardName===name).length;
   return <button key={name} type="button" aria-pressed={board===name} className={board===name?'board-library-card active':'board-library-card'} onClick={()=>setBoard(board===name?'ALL':name)}>
    <small>{pt?'PASTA EDITORIAL':es?'TABLERO':'EDITORIAL BOARD'}</small><strong>{name}</strong><span>{count} {pt?'campanhas':es?'campañas':'campaigns'}</span>
   </button>;
  })}</div>}
  <div className="library-controls">
   <input aria-label={pt?'Buscar campanhas':es?'Buscar campañas':'Search campaigns'} placeholder={pt?'Buscar por produto, tema ou pasta':es?'Buscar producto, tema o tablero':'Search product, intent or board'} value={query} onChange={e=>setQuery(e.target.value)} />
   <select aria-label={pt?'Filtrar marketplace':es?'Filtrar mercado':'Filter marketplace'} value={market} onChange={e=>setMarket(e.target.value as typeof market)}>
    <option value="ALL">{pt?'Todos marketplaces':es?'Todos mercados':'All marketplaces'}</option><option value="MELI">Mercado Livre</option><option value="SHOPEE">Shopee</option>
   </select>
   {mode==='library'&&<select aria-label={pt?'Filtrar pasta':es?'Filtrar tablero':'Filter board'} value={board} onChange={e=>setBoard(e.target.value)}>
    <option value="ALL">{pt?'Todas as pastas':es?'Todos los tableros':'All boards'}</option>{names.map(name=><option key={name} value={name}>{name}</option>)}
   </select>}
  </div>
  <div className="library-results" aria-live="polite">{visible.map(c=><article className="library-result" key={c.id}>
   <div><span className="eyebrow">{c.marketplace} · {c.status}</span><h3>{c.currentVersion.product.title.value}</h3>
    <p>{c.currentVersion.boardName} · {c.currentVersion.keyword} · v{c.currentVersion.version}</p>
   </div>
   <NavLink className="button secondary" to={c.status==='PUBLICATION_READY'?'/publish/'+c.id:'/review/'+c.id}>{pt?'Abrir campanha':es?'Abrir campaña':'Open campaign'} →</NavLink>
  </article>)}</div>
  {!visible.length&&<div className="empty"><h3>{pt?'Nenhuma campanha neste filtro':es?'No hay campañas con este filtro':'No campaigns match'}</h3>
   <p>{pt?'Ajuste os filtros ou investigue novas oportunidades no Radar.':es?'Cambia los filtros o explora Radar.':'Change the filters or discover products in Radar.'}</p>
   <NavLink className="button secondary" to="/radar">{pt?'Explorar Radar':'Open Radar'}</NavLink>
  </div>}
  <p className="muted">{pt?'As pastas são recomendações editoriais internas; elas não são sincronizadas com o Pinterest sem autorização de API.':es?'Las carpetas no se sincronizan sin acceso autorizado a Pinterest.':'These are local editorial boards, not automatically synchronized with Pinterest.'}</p>
 </div>;
}
