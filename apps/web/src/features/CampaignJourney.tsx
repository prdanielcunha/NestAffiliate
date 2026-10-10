import {useI18n} from '../lib/i18n-context';
import type {Campaign} from '@nestaffiliate/core';
import {inspectAffiliateAttestation,isMarketplaceAffiliateDestination} from '@nestaffiliate/compliance';
import {NavLink} from 'react-router-dom';

type Stage={id:string;name:string;details:string;done:boolean;target:string};
function t3(locale:string,pt:string,en:string,es:string){return locale==='pt-BR'?pt:locale==='es'?es:en;}
export function getCampaignJourney(campaign:Campaign,locale:string):Stage[]{
 const v=campaign.currentVersion,product=v.product;
 const l=(pt:string,en:string,es:string)=>t3(locale,pt,en,es);
 const linkKnown=product.marketplace==='MELI'
  ? Boolean(isMarketplaceAffiliateDestination(product.affiliateUrl?.value,product.marketplace)
    && inspectAffiliateAttestation(product)==='SELF_CONFIRMED')
  :campaign.status==='PUBLISHED'; // Shopee tracking requires actual final publication/tag proof
 const pack=Boolean(v.creativePack);
 const image=Boolean(v.creativeAsset?.productFidelityConfirmed
   && v.creativeAsset.embeddedTextConfirmedAbsent
   && ['AUTHORIZED','USER_PROVIDED','GENERATED','PLATFORM_PROVIDED'].includes(v.creativeAsset.rightsStatus));
 const approved=['PUBLICATION_READY','PUBLISHED'].includes(campaign.status);
 return [
  {id:'product',name:l('Escolher produto','Choose product','Elegir producto'),details:l('Produto vindo do Radar','Chosen in Radar','Elegido del Radar'),done:true,target:'/radar'},
  {id:'affiliate',name:product.marketplace==='SHOPEE'?l('Marcação Shopee','Shopee tag','Etiqueta Shopee'):l('Conferir link','Verify affiliate link','Verificar enlace'),details:product.marketplace==='SHOPEE'?l('Confirmada na etapa de publicação','Confirmed at posting step','Confirmada al publicar'):l('Gerar na sua conta, não no Radar','Generate in your account, not the Radar','Generar en tu cuenta, no en Radar'),done:linkKnown,target:'#review-product'},
  {id:'creative',name:l('Títulos e descrição','Titles and description','Título y descripción'),details:l('Preparar o Creative Pack','Prepare Creative Pack','Preparar Creative Pack'),done:pack,target:'#review-creative'},
  {id:'image',name:l('Imagem com ChatGPT','Image with ChatGPT','Imagen con ChatGPT'),details:l('Copiar prompt, gerar, importar e comparar','Copy prompt, generate, import and compare','Copiar prompt, generar, importar y comparar'),done:image,target:'#review-creative'},
  {id:'approval',name:l('Aprovar o Pin','Approve the Pin','Aprobar el Pin'),details:l('Conferir imagem e dados finais','Check final image and information','Revisar imagen y datos'),done:approved,target:'#review-final'},
  {id:'publication',name:l('Publicar no Pinterest','Publish on Pinterest','Publicar en Pinterest'),details:l('Copiar campos e confirmar URL do Pin','Copy fields and confirm public Pin URL','Copiar campos y confirmar URL'),done:campaign.status==='PUBLISHED',target:approved?'/publish/'+campaign.id:'#review-final'},
 ];
}
export function CampaignJourney({campaign,mode='review'}:{campaign:Campaign;mode?:'review'|'publish'}){
 const {locale}=useI18n();const stages=getCampaignJourney(campaign,locale);
 const l=(pt:string,en:string,es:string)=>t3(locale,pt,en,es);
 const current=mode==='publish'?'publication':(stages.find(s=>!s.done && !(campaign.marketplace==='SHOPEE'&&s.id==='affiliate'))??stages[4]!).id;
 return <section className="campaign-journey" aria-label={l('Etapas para publicar seu Pin','Steps to publish your Pin','Pasos para publicar tu Pin')}>
  {mode==='publish'&&<div className="campaign-journey-intro">
   <div><p className="eyebrow">{mode==='publish'?'ETAPA FINAL · PUBLICAÇÃO':'DO RADAR AO PIN · PASSO A PASSO'}</p>
    <h2>{mode==='publish'?l('Publicar no Pinterest','Publish on Pinterest','Publicar en Pinterest'):l('Falta pouco para o seu Pin','Your Pin is taking shape','Tu Pin está tomando forma')}</h2>
    <p>{mode==='publish'?l('Baixe a arte, copie os campos para o Pinterest e registre o link da publicação. Nada é publicado automaticamente.','Download, copy the Pinterest fields and save the public URL. No automatic posting.','Descarga, copia los datos y registra el enlace. Sin publicación automática.'):
     l('A campanha está salva. Veja apenas o próximo passo ou abra todas as etapas.','Your campaign is saved. See the next action or expand all steps.','Tu campaña está guardada. Mira el siguiente paso o abre todas las etapas.')}</p></div>
   {mode==='publish'&&<NavLink to={'/review/'+campaign.id} className="button secondary">{l('Voltar à revisão','Back to review','Volver a la revisión')}</NavLink>}
  </div>}
  <details className="campaign-journey-details">
   <summary>{l('Ver todas as etapas e retomar uma anterior','See all steps','Ver todos los pasos')}</summary>
   <ol className="campaign-journey-stages">{stages.map((stage,i)=><li key={stage.id} className={stage.done?'done':stage.id===current?'current':''}>
    {stage.target.startsWith('/')?<NavLink to={stage.target} className="journey-step">
      <span className="journey-step-number">{stage.done?'✓':i+1}</span><span><strong>{stage.name}</strong><small>{stage.details}</small></span></NavLink>
    :<a href={stage.target} className="journey-step">
      <span className="journey-step-number">{stage.done?'✓':i+1}</span><span><strong>{stage.name}</strong><small>{stage.details}</small></span></a>}
  </li>)}</ol>
  </details>
  {mode==='publish'&&<p className="campaign-journey-note">{l('Importante: a pesquisa identifica produtos, mas não gera ou comprova automaticamente a comissão da sua conta de afiliado.','Research finds products but does not automatically generate or verify your affiliate link.','La búsqueda encuentra productos, pero no genera ni verifica la comisión.')}</p>}
 </section>;
}
