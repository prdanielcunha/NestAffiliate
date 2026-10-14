import { useMemo, useState } from 'react';
import type { CommerceSignal } from '@nestaffiliate/radar';
import { PROBLEM_INTENTS } from '@nestaffiliate/radar';
import { useI18n } from '../lib/i18n-context';
import './radar-discovery.css';

type Marketplace = 'ALL' | 'MELI' | 'SHOPEE';
type SuggestionGroup = 'recommended' | 'bestSellers' | 'searched' | 'growing' | 'categories' | 'problems';
type RadarSuggestion = { id: string; keyword: string; title: string; group: SuggestionGroup; marketplace?: 'MELI' | 'SHOPEE'; evidence?: string };

const categorySeeds = [
  ['casa', 'Casa e organização', 'home organization', 'Casa y organización', 'organizadores para casa'],
  ['cozinha', 'Cozinha', 'kitchen', 'Cocina', 'organizador de cozinha'],
  ['beleza', 'Beleza e cuidados', 'beauty and self-care', 'Belleza y cuidado', 'organizador de maquiagem'],
  ['pet', 'Pets', 'pets', 'Mascotas', 'acessorios para pet'],
  ['escritorio', 'Escritório', 'office', 'Oficina', 'suporte para notebook'],
  ['bebe', 'Bebê e família', 'baby and family', 'Bebé y familia', 'organizador para bebe'],
  ['moda', 'Moda e acessórios', 'fashion and accessories', 'Moda y accesorios', 'acessorios de moda'],
  ['banheiro', 'Banheiro', 'bathroom', 'Baño', 'organizador de banheiro'],
  ['lavanderia', 'Lavanderia', 'laundry', 'Lavandería', 'organizador de lavanderia'],
  ['decoracao', 'Decoração', 'home decor', 'Decoración', 'decoracao para sala'],
  ['eletronicos', 'Eletrônicos e utilidades', 'electronics and accessories', 'Electrónica y accesorios', 'acessorios para celular'],
  ['presentes', 'Presentes', 'gifts', 'Regalos', 'presentes criativos'],
  ['quarto', 'Quarto', 'bedroom', 'Dormitorio', 'organizadores de quarto'],
  ['jardim', 'Jardim e varanda', 'garden and patio', 'Jardín y patio', 'itens para jardim'],
] as const;

function getGroup(source: string): SuggestionGroup | null {
  if (source === 'MELI_BEST_SELLER' || source === 'SHOPEE_TOP_SALES') return 'bestSellers';
  if (source === 'MELI_TREND_DESIRED') return 'searched';
  // A position in a single snapshot is not measured growth over time.
  // Growth remains hidden until two comparable authorized observations exist.
  return null;
}

function getMarketplace(source: string): 'MELI' | 'SHOPEE' | undefined {
  if (source.startsWith('MELI_')) return 'MELI';
  if (source.startsWith('SHOPEE_')) return 'SHOPEE';
  return undefined;
}

export function RadarDiscovery({
  onSearch, busy, marketSignals, marketplace, onMarketplaceChange, onOpenImport, hasSearched, searchQuery,
  shopeeAutomatic,preferredCategory,onPreferredCategory,
}: {
  onSearch: (keyword: string) => void;
  busy: boolean;
  marketSignals: CommerceSignal[];
  marketplace: Marketplace;
  onMarketplaceChange: (value: Marketplace) => void;
  onOpenImport: () => void;
  hasSearched: boolean;
  searchQuery: string;
  shopeeAutomatic: boolean;
  preferredCategory:string|null;
  onPreferredCategory:(category:string|null)=>void;
}) {
  const { locale } = useI18n();
  const language = locale === 'en' ? 'en' : locale === 'es' ? 'es' : 'pt';
  const t = (pt: string, en: string, es: string) => language === 'en' ? en : language === 'es' ? es : pt;
  const [term, setTerm] = useState('');
  const [group, setGroup] = useState<SuggestionGroup>('recommended');
  const [visibleCount, setVisibleCount] = useState(6);
  const suggestions = useMemo(() => {
    const all: RadarSuggestion[] = [];
    for (const signal of marketSignals) {
      const keyword = signal.keyword?.trim();
      if (!keyword || keyword.length < 4) continue;
      const mkt = getMarketplace(signal.source);
      const authenticatedBestSeller=signal.source==='MELI_BEST_SELLER' || (signal.source==='SHOPEE_TOP_SALES' && signal.evidence.some(text=>text.startsWith('vendas oficiais:')));
      const signalGroup=signal.source==='SHOPEE_TOP_SALES'&&!authenticatedBestSeller ? null : getGroup(signal.source);
      const label = mkt === 'MELI' ? 'Mercado Livre' : mkt === 'SHOPEE' ? 'Shopee' : language === 'en' ? 'Identified source' : language === 'es' ? 'Fuente identificada' : 'Fonte identificada';
      const when = Date.parse(signal.observedAt);
      const evidence = label + (Number.isFinite(when) ? ' · ' + new Date(when).toLocaleDateString(locale) : '');
      all.push({id:'evidence-'+signal.id,keyword,title:keyword,group:signalGroup ?? 'recommended',marketplace:mkt,evidence});
      if (signalGroup) all.push({id:'recommend-'+signal.id,keyword,title:keyword,group:'recommended',marketplace:mkt,evidence});
    }
    for (const [id,pt,en,es,keyword] of categorySeeds) {
      all.push({id:'category-'+id,keyword,title:language==='en'?en:language==='es'?es:pt,group:'categories'});
      all.push({id:'suggest-'+id,keyword,title:language==='en'?en:language==='es'?es:pt,group:'recommended'});
    }
    for (const intent of PROBLEM_INTENTS) {
      all.push({id:'problem-'+intent.id,keyword:intent.keyword,title:intent.problem[locale],group:'problems'});
      all.push({id:'suggest-problem-'+intent.id,keyword:intent.keyword,title:intent.problem[locale],group:'recommended'});
    }
    const seen = new Set<string>();
    return all.filter(item => {
      const key = item.group + ':' + item.keyword.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  },[marketSignals, locale, language]);

  const groups: Array<{id:SuggestionGroup;label:string}> = [
    {id:'recommended',label:t('Para você','For you','Para ti')},
    {id:'bestSellers',label:t('Mais vendidos','Best sellers','Más vendidos')},
    {id:'searched',label:t('Mais procurados','Most searched','Más buscados')},
    {id:'growing',label:t('Em crescimento','Growing','En crecimiento')},
    {id:'categories',label:t('Por categoria','By category','Por categoría')},
    {id:'problems',label:t('Resolver problemas','Solve problems','Resolver problemas')},
  ];
  const availableGroups=groups.filter(tab => tab.id === 'recommended' || tab.id === 'categories' || tab.id === 'problems'
    || suggestions.some(item => item.group===tab.id && (marketplace==='ALL' || !item.marketplace || item.marketplace===marketplace)));
  const activeGroup = availableGroups.some(tab=>tab.id===group)?group:'recommended';
  const displayed=suggestions.filter(item => item.group === activeGroup && (marketplace==='ALL'|| !item.marketplace || item.marketplace===marketplace))
    .sort((a,b)=>activeGroup==='recommended' && preferredCategory
      ? Number(b.id==='suggest-'+preferredCategory)-Number(a.id==='suggest-'+preferredCategory)
      : 0);
  const showSuggestions = !hasSearched;

  return <section className="radar6-discovery" aria-label={t('Pesquisar oportunidades','Discover opportunities','Buscar oportunidades')}>
    <div className="radar6-intro">
      <h2>{t('Encontre boas oportunidades para divulgar','Find products worth promoting','Encuentra oportunidades para promocionar')}</h2>
      <p>{t('Busque um produto, uma categoria ou um problema. Nós ajudamos você a encontrar boas opções.', 'Search for a product, category or problem. We help you discover options.', 'Busca un producto, categoría o problema. Te ayudamos a encontrar opciones.')}</p>
    </div>
    <form className="radar6-search" role="search" onSubmit={event=>{event.preventDefault();const keyword=term.trim()||searchQuery.trim();if(keyword)onSearch(keyword);}}>
      <label className="radar6-search-label" htmlFor="radar6-search-input">{t('O que você quer encontrar?','What would you like to find?','¿Qué quieres encontrar?')}</label>
      <div className="radar6-search-control">
        <input id="radar6-search-input" value={term} onChange={event=>setTerm(event.target.value)}
          placeholder={t('Ex.: organizador de cozinha, suporte para notebook','E.g. kitchen organizer, laptop stand','Ej.: organizador de cocina, soporte para laptop')}
          autoComplete="off" aria-label={t('Pesquisar produtos e necessidades','Search products and needs','Buscar productos y necesidades')}/>
        <button type="submit" className="button primary" disabled={busy || !(term.trim() || searchQuery.trim())}>
          {busy?t('Pesquisando…','Searching…','Buscando…'):t('Pesquisar','Search','Buscar')}
        </button>
      </div>
    </form>
    <fieldset className="radar6-marketplaces">
      <legend>{t('Onde pesquisar','Where to search','Dónde buscar')}</legend>
      <div className="radar6-marketplace-options">
        {(['ALL','MELI','SHOPEE'] as const).map(value=><button key={value} type="button"
          aria-pressed={marketplace===value} className={marketplace===value?'active':''}
          onClick={()=>onMarketplaceChange(value)}>
          {value==='ALL'?t('Todos disponíveis','All available','Todos disponibles'):value==='MELI'?'Mercado Livre':'Shopee'}
        </button>)}
      </div>
      {marketplace==='SHOPEE'&&!shopeeAutomatic && <p className="radar6-marketplace-note" role="status">{t('A busca automática da Shopee pode exigir importação assistida. Vamos orientar você.','Shopee may require assisted import. We will guide you.','Shopee puede requerir importación asistida. Te guiaremos.')}</p>}
    </fieldset>
    {showSuggestions && <>
      <div className="radar7-interests">
        <label htmlFor="radar7-preferred-category">{t('Qual área você quer explorar mais?','Which area interests you most?','¿Qué categoría te interesa más?')}</label>
        <select id="radar7-preferred-category" value={preferredCategory??''}
          onChange={event=>onPreferredCategory(event.target.value||null)}>
          <option value="">{t('Todas as áreas','All categories','Todas las categorías')}</option>
          {categorySeeds.map(([id,pt,en,es])=><option key={id} value={id}>{language==='en'?en:language==='es'?es:pt}</option>)}
        </select>
        <small>{t('Sua escolha orienta sugestões neste dispositivo; não representa demanda comprovada.','Your choice guides ideas on this device; it does not prove demand.','Tu elección guía sugerencias en este dispositivo; no acredita demanda.')}</small>
      </div>
      <div className="radar6-suggestions-heading"><h3>{t('Explore ideias','Explore ideas','Explora ideas')}</h3><span>{t('Escolha uma sugestão para pesquisar','Choose an idea to search','Elige una idea para buscar')}</span></div>
      <div className="radar6-tabs" role="group" aria-label={t('Tipo de sugestão','Suggestion type','Tipo de sugerencia')}>
        {availableGroups.map(tab=><button key={tab.id} type="button" aria-pressed={activeGroup===tab.id}
          className={activeGroup===tab.id?'active':''} onClick={()=>{setGroup(tab.id);setVisibleCount(6)}}>{tab.label}</button>)}
      </div>
      <div className="radar6-suggestion-grid">
        {displayed.slice(0,visibleCount).map(item=><button key={item.id} type="button" disabled={busy} className="radar6-suggestion"
          onClick={()=>{setTerm(item.keyword);onSearch(item.keyword);}}>
          <span className="radar6-suggestion-title">{item.title}</span>
          <small>{item.evidence ?? t('Ideia para pesquisar · demanda não verificada','Research idea · demand not verified','Idea para investigar · demanda no verificada')}</small>
          <span className="radar6-suggestion-arrow" aria-hidden="true">↗</span>
        </button>)}
      </div>
      {displayed.length>visibleCount && <button type="button" className="radar6-more" onClick={()=>setVisibleCount(c=>c+6)}>
        {t('Ver mais sugestões','Show more ideas','Ver más sugerencias')} ↓
      </button>}
      <p className="radar6-evidence-help">{t('Sugestões editoriais são pontos de partida, não rankings de vendas. Sinais de marketplaces aparecem identificados quando disponíveis.','Editorial ideas are starting points, not sales rankings. Marketplace signals are labelled when available.','Las ideas editoriales son puntos de partida, no rankings de ventas. Las señales verificables están identificadas.')}</p>
    </>}
    <div className="radar6-import-bridge">
      <span>{t('Já encontrou um produto?','Already found a product?','¿Ya encontraste un producto?')}</span>
      <button type="button" className="button secondary" onClick={onOpenImport}>{t('Adicionar por link ou print','Import link or screenshot','Añadir enlace o captura')} →</button>
    </div>
  </section>;
}
