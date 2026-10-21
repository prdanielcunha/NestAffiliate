import {useEffect,useState} from 'react';
import type {Locale} from '../lib/i18n';
import './public-home.css';

type HomeCopy={
  navFeatures:string;navHow:string;navPrivacy:string;enter:string;eyebrow:string;
  heading:string;intro:string;primary:string;secondary:string;honest:string;
  featuresTitle:string;featuresSubtitle:string;features:[string,string][];
  howTitle:string;steps:[string,string][];securityTitle:string;securityBody:string;
  footer:string;legal:string;terms:string;deletion:string;support:string;
};
const copy:Record<Locale,HomeCopy>={
  'pt-BR':{
    navFeatures:'Recursos',navHow:'Como funciona',navPrivacy:'Privacidade',enter:'Entrar no aplicativo',
    eyebrow:'MILLIONSNEST · NESTAFFILIATE',
    heading:'Da pesquisa de produtos à criação de Pins. Com você no controle.',
    intro:'O NestAffiliate é uma plataforma da MillionsNest para ajudar criadores e pequenos negócios a pesquisar ofertas, organizar campanhas de afiliados, preparar conteúdos para Pinterest e acompanhar resultados autorizados.',
    primary:'Conhecer os recursos',secondary:'Acessar minha área',
    honest:'O acesso à área de trabalho exige login. Esta apresentação, os recursos e as políticas são públicos. Publicação automática por API depende da autorização do Pinterest.',
    featuresTitle:'O que o NestAffiliate oferece',featuresSubtitle:'Ferramentas para tomar decisões e preparar conteúdo, sem inventar preços, estoque ou comissões.',
    features:[
      ['Radar de oportunidades','Pesquise produtos e avalie dados comerciais, fontes e limitações disponíveis.'],
      ['Preparação de Pins','Crie roteiros e materiais visuais, revise textos e organize ideias para publicar.'],
      ['Campanhas e revisão','Salve produtos, compare ofertas e aprove cada etapa antes de compartilhar conteúdo.'],
      ['Métricas transparentes','Importe relatórios autorizados e analise desempenho sem confundir dados desconhecidos com vendas zero.'],
    ],
    howTitle:'Como funciona',steps:[
      ['Pesquise','Encontre uma oferta e confira o anúncio original e suas condições.'],
      ['Prepare','Monte a campanha, o visual e a descrição com revisão humana.'],
      ['Publique e acompanhe','Use o fluxo guiado e dados autorizados; a API pública depende de aprovação externa.'],
    ],
    securityTitle:'Privacidade e controle',securityBody:'Suas campanhas e dados de conta ficam na área autenticada. O NestAffiliate não pede senhas do Pinterest e não publica Pins automaticamente sem as permissões e aprovações necessárias.',
    footer:'Um produto do ecossistema MillionsNest.',legal:'Política de privacidade',terms:'Termos de uso',deletion:'Exclusão de dados',support:'Contato',
  },
  en:{
    navFeatures:'Features',navHow:'How it works',navPrivacy:'Privacy',enter:'Open workspace',
    eyebrow:'MILLIONSNEST · NESTAFFILIATE',
    heading:'From product research to Pinterest-ready creative. You stay in control.',
    intro:'NestAffiliate is a MillionsNest platform that helps content creators and small businesses research offers, organize affiliate campaigns, prepare Pinterest content and review authorized performance data.',
    primary:'Explore features',secondary:'Sign in to workspace',
    honest:'The private workspace requires sign-in. This product overview, features and legal policies are public. API publishing is subject to Pinterest authorization.',
    featuresTitle:'What NestAffiliate provides',featuresSubtitle:'Make informed decisions and prepare content without inventing prices, stock or commissions.',
    features:[
      ['Opportunity Radar','Research offers and review available commercial data, sources and limitations.'],
      ['Pinterest creative preparation','Develop visual concepts, refine copy and prepare materials for review.'],
      ['Campaigns and approvals','Save products, compare offers and review each stage before publishing.'],
      ['Transparent analytics','Import authorized reports and evaluate performance without treating unknown sales as zero.'],
    ],
    howTitle:'How it works',steps:[
      ['Research','Find a product and check its original listing and current terms.'],
      ['Prepare','Build the campaign, visuals and copy with human review.'],
      ['Publish and learn','Use guided publishing and authorized reports; public API publishing requires provider approval.'],
    ],
    securityTitle:'Privacy and control',securityBody:'Campaigns and account data are kept in the authenticated workspace. NestAffiliate never asks for your Pinterest password and does not automatically publish without the required permissions and approvals.',
    footer:'A MillionsNest ecosystem product.',legal:'Privacy Policy',terms:'Terms of Use',deletion:'Data Deletion',support:'Contact',
  },
  es:{
    navFeatures:'Funciones',navHow:'Cómo funciona',navPrivacy:'Privacidad',enter:'Entrar a la plataforma',
    eyebrow:'MILLIONSNEST · NESTAFFILIATE',
    heading:'De investigar productos a preparar Pins. Tú tienes el control.',
    intro:'NestAffiliate es una plataforma de MillionsNest para ayudar a creadores y pequeñas empresas a investigar ofertas, organizar campañas de afiliación, preparar contenido para Pinterest y consultar resultados autorizados.',
    primary:'Conocer funciones',secondary:'Acceder a mi espacio',
    honest:'El área privada requiere iniciar sesión. Esta presentación y las políticas son públicas. La publicación por API depende de la autorización de Pinterest.',
    featuresTitle:'Lo que ofrece NestAffiliate',featuresSubtitle:'Herramientas para decidir y crear sin inventar precios, inventario o comisiones.',
    features:[
      ['Radar de oportunidades','Busca productos y examina datos, fuentes y limitaciones disponibles.'],
      ['Preparación de Pins','Diseña ideas visuales, revisa textos y prepara materiales para su publicación.'],
      ['Campañas y revisión','Guarda productos, compara ofertas y revisa cada etapa antes de publicar.'],
      ['Resultados transparentes','Importa informes autorizados y analiza el rendimiento sin presentar datos desconocidos como cero.'],
    ],
    howTitle:'Cómo funciona',steps:[
      ['Investiga','Encuentra una oferta y confirma su anuncio y condiciones.'],
      ['Prepara','Crea campañas, imágenes y textos con revisión humana.'],
      ['Publica y aprende','Usa el modo guiado y los informes autorizados; la publicación pública por API requiere aprobación.'],
    ],
    securityTitle:'Privacidad y control',securityBody:'Las campañas y los datos privados están protegidos en el espacio autenticado. NestAffiliate no solicita contraseñas de Pinterest ni publica automáticamente sin permisos.',
    footer:'Producto del ecosistema MillionsNest.',legal:'Política de privacidad',terms:'Términos de uso',deletion:'Eliminación de datos',support:'Contacto',
  },
};
export function PublicHomePage({locale,onLocaleChange}:{
  locale:Locale;
  onLocaleChange:(next:Locale)=>void;
}){
  const c=copy[locale]??copy['pt-BR'];
  useEffect(()=>{
    document.title='NestAffiliate — Affiliate Intelligence by MillionsNest';
    document.documentElement.lang=locale;
  },[locale]);
  return <div className="public-home">
    <header className="public-home-header">
      <a href="/" className="public-home-brand">
        <img src="/icon.svg?v=2" alt="" width="44" height="44"/>
        <span><b>Nest</b>Affiliate <small>by MillionsNest</small></span>
      </a>
      <nav aria-label={locale==='pt-BR'?'Navegação do site':locale==='es'?'Navegación del sitio':'Site navigation'}>
        <a href="#recursos">{c.navFeatures}</a>
        <a href="#como-funciona">{c.navHow}</a>
        <a href="/privacy">{c.navPrivacy}</a>
      </nav>
      <div className="public-home-actions">
        <select aria-label="Language" value={locale} onChange={event=>onLocaleChange(event.target.value as Locale)}>
          <option value="pt-BR">PT</option><option value="en">EN</option><option value="es">ES</option>
        </select>
        <a className="public-home-btn secondary" href="/login">{c.enter}</a>
      </div>
    </header>
    <main id="principal">
      <section className="public-home-hero">
        <div className="public-home-hero-copy">
          <p className="public-home-eyebrow">{c.eyebrow}</p>
          <h1>{c.heading}</h1>
          <p className="public-home-intro">{c.intro}</p>
          <div className="public-home-cta">
            <a className="public-home-btn primary" href="#recursos">{c.primary} <span aria-hidden="true">↗</span></a>
            <a className="public-home-btn secondary" href="/login">{c.secondary}</a>
          </div>
          <p className="public-home-note">{c.honest}</p>
        </div>
        <div className="public-home-visual" role="img" aria-label="NestAffiliate product identity">
          <img src="/icon.svg?v=2" alt="NestAffiliate" width="192" height="192"/>
          <div className="public-home-visual-word"><span>Nest</span>Affiliate</div>
          <p>Affiliate Intelligence by MillionsNest</p>
          <div className="public-home-visual-line"/>
          <span className="public-home-visual-steps">DISCOVER / CREATE / REVIEW / LEARN</span>
        </div>
      </section>
      <section id="recursos" className="public-home-section" aria-labelledby="public-features-heading">
        <p className="public-home-eyebrow">PLATAFORMA</p>
        <h2 id="public-features-heading">{c.featuresTitle}</h2>
        <p className="public-home-lead">{c.featuresSubtitle}</p>
        <div className="public-home-grid">
          {c.features.map(([title,description],index)=>
            <article className="public-home-card" key={title}>
              <span className="public-home-num">0{index+1}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          )}
        </div>
      </section>
      <section id="como-funciona" className="public-home-section public-home-process" aria-labelledby="public-process-heading">
        <p className="public-home-eyebrow">WORKFLOW</p>
        <h2 id="public-process-heading">{c.howTitle}</h2>
        <div className="public-home-steps">{c.steps.map(([title,description],i)=>
          <div key={title}><span>0{i+1}</span><h3>{title}</h3><p>{description}</p></div>
        )}</div>
      </section>
      <section className="public-home-security" aria-labelledby="public-security-heading">
        <div><p className="public-home-eyebrow">SECURITY FIRST</p><h2 id="public-security-heading">{c.securityTitle}</h2>
        <p>{c.securityBody}</p></div>
        <a className="public-home-btn secondary" href="/privacy">{c.legal} <span aria-hidden="true">↗</span></a>
      </section>
    </main>
    <footer className="public-home-footer">
      <div><strong>NestAffiliate</strong><p>{c.footer}</p><small>© {new Date().getFullYear()} MillionsNest</small></div>
      <nav aria-label="Legal and contact">
        <a href="/privacy">{c.legal}</a><a href="/terms">{c.terms}</a>
        <a href="/data-deletion">{c.deletion}</a>
        <a href="mailto:nestaffiliate@millionsnest.com">{c.support}</a>
      </nav>
    </footer>
  </div>;
}
export function PublicAboutPage(){
  const [locale,setLocale]=useState<Locale>(()=>{
    const stored=localStorage.getItem('na_locale');
    return stored==='en'||stored==='es'||stored==='pt-BR'?stored:'pt-BR';
  });
  useEffect(()=>{localStorage.setItem('na_locale',locale)},[locale]);
  return <PublicHomePage locale={locale} onLocaleChange={setLocale}/>;
}
