import {useState} from 'react';
import {NavLink,useSearchParams} from 'react-router-dom';
import type {Campaign} from '@nestaffiliate/core';
import {useI18n} from '../lib/i18n-context';
import {createVideoPreparation,VIDEO_TOOLS,VIDEO_TOOLS_REVIEWED_AT,type VideoChannel} from '../lib/videoPreparation';
import {ReelKitPanel} from './ReelKitPanel';
import './video-studio.css';

/** Preparation is separate from Pinterest. Nothing here changes Pin status or publishes. */
export function VideoStudio({campaigns}:{campaigns:Campaign[]}){
 const {locale}=useI18n();const [params]=useSearchParams();
 const l=(pt:string,en:string,es:string)=>locale==='pt-BR'?pt:locale==='es'?es:en;
 const [selected,setSelected]=useState(params.get('campaign')??'');
 const [channel,setChannel]=useState<VideoChannel>('INSTAGRAM');
 const [copied,setCopied]=useState('');const [manual,setManual]=useState('');
 const campaign=campaigns.find(c=>c.id===selected)??campaigns[0];
 const effectiveChannel=channel==='SHOPEE_VIDEO'&&campaign?.marketplace!=='SHOPEE'?'INSTAGRAM':channel;
 const plan=campaign?createVideoPreparation(campaign.currentVersion,effectiveChannel):null;
 async function copy(value:string,key:string){
  try{await navigator.clipboard.writeText(value);setCopied(key);setManual('');}
  catch{setManual(value);setCopied('');}
 }
 return <div className="page video-studio">
  <header className="page-title"><p className="eyebrow">{l('VÍDEOS · PREPARAÇÃO MANUAL','VIDEOS · MANUAL PREPARATION','VÍDEOS · PREPARACIÓN MANUAL')}</p>
   <h1>{l('Prepare seu vídeo de afiliado','Prepare your affiliate video','Prepara tu vídeo de afiliado')}</h1>
   <p>{l('Roteiro, prompts e orientação para gerar fora do app. Esta área é independente dos seus Pins; ainda não monta nem publica vídeos automaticamente.','Scripts and prompts for external generation. This area is independent of your Pins; it does not assemble or publish videos automatically.','Guion y prompts para generar fuera de la app. Esta área es independiente de tus Pins; no monta ni publica vídeos automáticamente.')}</p>
   <NavLink className="button secondary" to="/campaigns">{l('Voltar às campanhas Pinterest','Back to Pinterest campaigns','Volver a campañas Pinterest')}</NavLink>
  </header>
  {!campaign?<section className="surface"><h2>{l('Primeiro escolha um produto','Choose a product first','Primero elige un producto')}</h2><p>{l('Salve um produto como campanha no Radar. Depois volte para preparar os vídeos.','Save a product as a campaign in Radar, then return here.','Guarda un producto como campaña en Radar y vuelve aquí.')}</p><NavLink to="/radar" className="button primary">{l('Encontrar produto','Find a product','Encontrar producto')}</NavLink></section>:<>
  <section className="surface video-controls"><h2>{l('1. Produto e destino do vídeo','1. Product and video destination','1. Producto y destino del vídeo')}</h2>
   <label>{l('Campanha de origem','Source campaign','Campaña de origen')}<select value={campaign.id} onChange={e=>{setSelected(e.target.value);setCopied('');setManual('');}}>{campaigns.map(c=><option key={c.id} value={c.id}>{c.currentVersion.product.title.value}</option>)}</select></label>
   <label>{l('Onde você quer publicar?','Where will you post?','¿Dónde publicarás?')}<select value={effectiveChannel} onChange={e=>{setChannel(e.target.value as VideoChannel);setCopied('');setManual('');}}>
    <option value="INSTAGRAM">Instagram Reels</option><option value="TIKTOK">TikTok</option>
    {campaign.marketplace==='SHOPEE'&&<option value="SHOPEE_VIDEO">Shopee Vídeo</option>}
   </select></label>
   <p>{l('Um produto Shopee pode ser divulgado em outro canal elegível. Shopee é o programa/loja; Pinterest, Instagram e TikTok são destinos diferentes.','A Shopee product can be promoted on another eligible channel. Marketplace and publication channel are different.','Un producto Shopee puede promocionarse en otro canal permitido. La tienda y el canal son diferentes.')}</p>
  </section>
  <section className="surface"><h2>{l('2. Escolha uma ferramenta, começando pelo gratuito','2. Choose a tool, starting free','2. Elige una herramienta gratuita')}</h2>
   <p>{l('Confira saldo, disponibilidade e permissão de uso comercial na sua conta antes de gerar. Nenhuma opção abaixo assina planos ou compra créditos pelo NestAffiliate.','Check allowance, availability and commercial-use terms in your account before generating. These links do not subscribe or buy credits.','Comprueba saldo, disponibilidad y uso comercial antes de generar. Estos enlaces no suscriben ni compran créditos.')}</p>
   <div className="video-tools">{VIDEO_TOOLS.map((tool,index)=><article key={tool.id}>
    <h3>{index+1}. {tool.name}</h3><p>{locale==='pt-BR'?tool.pt:locale==='es'?tool.es:tool.en}</p>
    <a className="button secondary" href={tool.url} target="_blank" rel="noopener noreferrer">{l('Abrir ferramenta','Open tool','Abrir herramienta')} ↗</a>
    <a href={tool.source} target="_blank" rel="noopener noreferrer">{l('Consultar fonte oficial','Read official source','Ver fuente oficial')}</a>
   </article>)}</div><small>{l('Informações verificadas em','Information checked on','Información comprobada el')} {VIDEO_TOOLS_REVIEWED_AT}. {l('Limites podem mudar. Uma cota de créditos não equivale a um número fixo de vídeos.','Limits can change. Credits do not equal a fixed video count.','Los límites pueden cambiar. Créditos no equivalen a una cantidad fija de vídeos.')}</small>
   <details><summary>{l('Se não houver geração gratuita disponível','If free generation is unavailable','Si no hay generación gratuita')}</summary><p>{l('Grave o produto real ou monte fotos autorizadas no editor gratuito do seu celular. Use o roteiro abaixo. Planos pagos são opcionais e não fazem parte deste fluxo.','Record the actual product or assemble authorized photos in your phone editor. Use the script below; paid plans are optional.','Graba el producto real o monta fotos autorizadas en el editor del móvil. Usa el guion; pagar es opcional.')}</p></details>
  </section>
  <section className="surface"><h2>{l('3. Gere cenas curtas com a foto do produto','3. Generate short scenes using the product photo','3. Genera escenas cortas con la foto')}</h2>
   <p>{l('Anexe a foto real autorizada na ferramenta escolhida. Gere a primeira cena, confira o produto e só então continue. Para as próximas, anexe também o último frame aprovado. Depois junte os clipes no editor do celular.','Attach the authorized product photo. Generate and review the first scene, then continue with its approved final frame. Assemble clips in your phone editor.','Adjunta la foto autorizada. Genera y revisa la primera escena, continúa desde su último fotograma y une los clips en el editor.')}</p>
   {campaign.currentVersion.product.imageUrl?.value&&<a href={campaign.currentVersion.product.imageUrl.value} target="_blank" rel="noopener noreferrer">{l('Abrir foto original','Open original photo','Abrir foto original')} ↗</a>}
   {plan?.scenes.map(scene=><article key={scene.number} className="video-scene"><h3>{l('Cena','Scene','Escena')} {scene.number} · 6s</h3><details><summary>{l('Ver prompt em inglês','Read English prompt','Ver prompt en inglés')}</summary><pre>{scene.prompt}</pre></details><button className="button secondary" type="button" onClick={()=>void copy(scene.prompt,String(scene.number))}>{copied===String(scene.number)?l('Copiado','Copied','Copiado'):l('Copiar prompt da cena','Copy scene prompt','Copiar prompt')}</button></article>)}
  </section>
  <ReelKitPanel key={campaign.currentVersion.id} campaign={campaign}/>
  <section className="surface"><h2>{l('4. Prepare a legenda e publique manualmente','4. Prepare the caption and publish manually','4. Prepara el texto y publica manualmente')}</h2>
   <p>{effectiveChannel==='SHOPEE_VIDEO'?l('Abra Shopee Vídeo, envie o arquivo e use a opção de adicionar produto, se habilitada na sua conta. Confira produto, elegibilidade e comissão antes de publicar.','Open Shopee Video, upload your file and add the product if enabled. Check account eligibility before posting.','Abre Shopee Vídeo, sube el archivo y añade el producto si está disponible. Comprueba elegibilidad antes de publicar.'):
   effectiveChannel==='INSTAGRAM'?l('No Instagram, toque em Criar → Reel e envie o vídeo. Confira capa, legenda e divulgação comercial. Prepare o caminho de compra permitido na sua conta, como o link do perfil ou um Story com link; não dependa de uma URL na legenda.','In Instagram, choose Create → Reel and upload the video. Check cover, caption and disclosure; prepare an eligible purchase destination such as your profile link or a linked Story.','En Instagram, Crear → Reel. Revisa portada, texto y divulgación; prepara un enlace permitido en tu perfil o Story.'):
   l('No TikTok, toque em Criar e envie o vídeo. Confira legenda e divulgação comercial. Recursos de link e de produtos dependem da elegibilidade da conta; não suponha acesso ao TikTok Shop.','In TikTok, tap Create and upload. Check caption and disclosure. Links and product features depend on account eligibility; TikTok Shop is not assumed.','En TikTok, Crear y subir. Revisa texto y divulgación. Los enlaces y productos dependen de la cuenta; no se presupone TikTok Shop.')}</p>
   <p>{l('Identifique a publicidade e conteúdo de IA quando exigido. Não apresente a cena gerada como teste real do produto.','Disclose advertising and AI when required. Do not present generated scenes as real product tests.','Identifica publicidad e IA cuando corresponda. No presentes escenas generadas como pruebas reales.')}</p>
   <textarea aria-label={l('Legenda de afiliado','Affiliate caption','Texto de afiliado')} readOnly rows={6} value={plan?.caption??''}/>
   <button className="button secondary" type="button" onClick={()=>void copy(plan?.caption??'','caption')}>{copied==='caption'?l('Copiado','Copied','Copiado'):l('Copiar legenda','Copy caption','Copiar texto')}</button>
   <p className="muted">{l('A publicação é feita fora do app. Preparar ou copiar este roteiro não altera o status do seu Pin.','Posting happens outside the app. Copying this plan never changes your Pin status.','La publicación se realiza fuera. Copiar este guion no cambia el estado de tu Pin.')}</p>
  </section></>}
  {manual&&<section className="surface" role="status"><p>{l('O navegador bloqueou a cópia. Selecione o texto abaixo e copie.','Clipboard blocked. Select and copy below.','Copia bloqueada. Selecciona el texto.')}</p><textarea aria-label={l('Texto para copiar manualmente','Text to copy manually','Texto para copiar')} readOnly value={manual} rows={8} onFocus={e=>e.target.select()}/></section>}
 </div>;
}
