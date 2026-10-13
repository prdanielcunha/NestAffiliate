import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useI18n } from '../lib/i18n-context';

type Counts={products:number;campaigns:number;waiting:number;published:number};

function localized(locale:string,pt:string,en:string,es:string){
  return locale==='pt-BR'?pt:locale==='es'?es:en;
}

/**
 * Live, authenticated workspace overview. All numbers come from persisted
 * campaign state; these are NOT sales, commission or product-verification claims.
 */
export function PremiumHomeHero({counts,children}:{counts:Counts;children:ReactNode}){
  const {locale}=useI18n();
  const l=(pt:string,en:string,es:string)=>localized(locale,pt,en,es);
  return <section className="hero home-hero" aria-label={l('Visão geral do NestAffiliate','NestAffiliate overview','Resumen de NestAffiliate')}>
    <div className="home-hero-main">
      <div className="home-hero-eyebrow"><span className="home-orbit-dot" aria-hidden="true"/>
        {l('SEU ESTÚDIO DE PINS','YOUR PIN STUDIO','TU ESTUDIO DE PINS')}
        <span className="home-hero-version">NESTAFFILIATE</span>
      </div>
      <h1>{l('Encontre a oportunidade.','Discover the opportunity.','Encuentra la oportunidad.')}<span>{l('Crie com confiança.','Create with confidence.','Crea con confianza.')}</span></h1>
      <p className="hero-sub">{l(
        'Do Radar à publicação: transforme produtos em campanhas, prepare criativos e revise cada detalhe. Você mantém a palavra final.',
        'From research to publication: turn products into campaigns, prepare creatives and review every detail. You make the final call.',
        'De la investigación a la publicación: transforma productos en campañas, prepara creativos y revisa cada detalle. Tú decides.'
      )}</p>
      <div className="home-hero-actions">
        <NavLink to="/radar" className="button primary">{l('Explorar oportunidades','Explore opportunities','Explorar oportunidades')} <span aria-hidden="true">↗</span></NavLink>
        <NavLink to="/campaigns" className="button secondary">{l('Minhas campanhas','My campaigns','Mis campañas')}</NavLink>
      </div>
      <p className="home-hero-trust"><span aria-hidden="true">✓</span> {l('Sem publicação automática · Aprovação humana em cada Pin','No automatic publishing · Human approval for every Pin','Sin publicación automática · Aprobación humana en cada Pin')}</p>
      <div className="home-hero-metrics" aria-label={l('Números das suas campanhas','Your campaign counts','Cifras de tus campañas')}>
        <div><strong>{counts.waiting}</strong><span>{l('Aguardando revisão','Waiting for review','Pendientes de revisión')}</span></div>
        <div><strong>{counts.campaigns}</strong><span>{l('Campanhas salvas','Saved campaigns','Campañas guardadas')}</span></div>
        <div><strong>{counts.published}</strong><span>{l('Pins registrados','Pins marked published','Pins registrados')}</span></div>
      </div>
    </div>
    <div className="home-hero-side">{children}</div>
  </section>;
}

export function PremiumHomeJourney(){
  const {locale}=useI18n();
  const l=(pt:string,en:string,es:string)=>localized(locale,pt,en,es);
  const steps=[
    {n:'01',name:l('Descubra','Discover','Descubre'),description:l('Pesquise sinais, não promessas','Research evidence, not promises','Investiga señales reales'),to:'/radar'},
    {n:'02',name:l('Escolha','Choose','Elige'),description:l('Confirme anúncio e link','Verify listing and affiliate link','Verifica anuncio y enlace'),to:'/campaigns'},
    {n:'03',name:l('Crie','Create','Crea'),description:l('Prepare textos e imagem','Prepare copy and image','Prepara texto e imagen'),to:'/campaigns'},
    {n:'04',name:l('Publique','Publish','Publica'),description:l('Revise e registre o Pin','Review and register the Pin','Revisa y registra el Pin'),to:'/results'},
  ];
  return <section className="home-flow" aria-label={l('Como funciona','How it works','Cómo funciona')}>
    <header><div><p className="eyebrow">{l('DO PRODUTO AO PIN','FROM PRODUCT TO PIN','DEL PRODUCTO AL PIN')}</p>
      <h2>{l('Um caminho claro. Sem etapas escondidas.','One clear path. Nothing hidden.','Un camino claro. Sin pasos ocultos.')}</h2></div>
      <small>{l('4 etapas · Você aprova o resultado','4 steps · You approve the result','4 pasos · Tú apruebas el resultado')}</small>
    </header>
    <div className="home-flow-grid">
      {steps.map(step=><NavLink className="home-flow-step" to={step.to} key={step.n}>
        <span className="home-flow-number">{step.n}</span>
        <strong>{step.name}</strong><span>{step.description}</span><span className="home-flow-arrow" aria-hidden="true">↗</span>
      </NavLink>)}
    </div>
  </section>;
}