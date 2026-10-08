import type { CampaignVersion } from '@nestaffiliate/core';
export interface ReelKit {
  format:'VERTICAL_9_16';
  durationHintSeconds:[number,number];
  coverText:string;
  shotList:{seconds:string;direction:string;voiceover:string}[];
  caption:string;
  disclosure:string;
  assetRequirement:'ORIGINAL_OR_AUTHORIZED_FOOTAGE';
  publishingMode:'GUIDED_ONLY';
}
type Locale='pt-BR'|'en'|'es';
export function createReelKit(version:CampaignVersion,locale:Locale='pt-BR'):ReelKit {
  const keyword=version.keyword.trim();
  const copy={
    'pt-BR':{
      hook:'Como pensar melhor a organização de '+keyword+'?',
      problem:'Mostre um desafio real relacionado ao tema, usando imagens próprias, sem inventar resultados.',
      solution:'Demonstre o produto real em uso e mostre somente características verificáveis.',
      close:'Mostre o resultado real sem exageros, apresentando o próximo passo.',
      first:'Você já pensou nesta solução para '+keyword+'?',
      second:'Veja como funciona no dia a dia; confirme as características no anúncio.',
      third:'Encontre mais informações e confirme se é a opção certa para você.',
      caption:'Uma ideia prática para '+keyword+'. Confira medidas, preço e disponibilidade na página oficial.',
      disclosure:'Publicidade / Conteúdo de afiliado: posso receber comissão por compras qualificadas.',
    },
    en:{
      hook:'A practical idea for '+keyword,
      problem:'Show an authentic problem with your own footage; do not fabricate results.',
      solution:'Film the real product in use; demonstrate only verified features.',
      close:'Show the authentic result without exaggerated claims.',
      first:'Would this help with '+keyword+'?',
      second:'See how it works in real life. Verify the details on the listing.',
      third:'Check the listing to decide if it fits your needs.',
      caption:'A practical idea for '+keyword+'. Verify dimensions, price and availability on the official listing.',
      disclosure:'Affiliate content: I may receive a commission on qualifying purchases.',
    },
    es:{
      hook:'Una idea práctica para '+keyword,
      problem:'Muestra un problema real con grabaciones propias; no inventes resultados.',
      solution:'Graba el producto real en uso y muestra solo características comprobadas.',
      close:'Muestra un resultado auténtico sin exageraciones.',
      first:'¿Te serviría esta idea para '+keyword+'?',
      second:'Mira su uso real. Comprueba los detalles en el anuncio.',
      third:'Consulta el anuncio para decidir si se adapta a tus necesidades.',
      caption:'Una idea práctica para '+keyword+'. Comprueba medidas, precio y disponibilidad en el anuncio oficial.',
      disclosure:'Contenido de afiliados: puedo recibir comisión por compras que cumplan los requisitos.',
    },
  }[locale];
  return {
    format:'VERTICAL_9_16',
    durationHintSeconds:[15,30],
    coverText:copy.hook,
    shotList:[
      {seconds:'0–4',direction:copy.problem,voiceover:copy.first},
      {seconds:'4–17',direction:copy.solution,voiceover:copy.second},
      {seconds:'17–25',direction:copy.close,voiceover:copy.third},
    ],
    caption:copy.caption,disclosure:copy.disclosure,
    assetRequirement:'ORIGINAL_OR_AUTHORIZED_FOOTAGE',
    publishingMode:'GUIDED_ONLY',
  };
}
