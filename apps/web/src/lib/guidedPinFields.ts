import type {PublicationPackage} from '@nestaffiliate/core';

type PublishLocale='pt-BR'|'en'|'es';
export interface GuidedField {id:string;label:string;instruction:string;value:string;optional?:boolean;}
const translate=(locale:PublishLocale,pt:string,en:string,es:string)=>locale==='pt-BR'?pt:locale==='es'?es:en;

/** One authoritative mapping from the exact approved campaign package to Pinterest fields. */
export function buildGuidedPinFields(pack:PublicationPackage,locale:PublishLocale):GuidedField[]{
 const l=(pt:string,en:string,es:string)=>translate(locale,pt,en,es);
 const description=pack.description.includes(pack.disclosure)?pack.description:[pack.description,pack.disclosure].filter(Boolean).join('\n\n');
 return [
  {id:'title',label:l('Título do Pin','Pin title','Título del Pin'),instruction:l('Cole no campo “Título” do criador de Pins.','Paste into Pinterest’s “Title” field.','Pega en el campo “Título” de Pinterest.'),value:pack.title},
  {id:'description',label:l('Descrição + aviso de afiliado','Description + affiliate disclosure','Descripción + aviso de afiliación'),instruction:l('Cole tudo no campo “Descrição”, inclusive o aviso de afiliação.','Paste everything in “Description”, including the affiliate disclosure.','Pega todo en “Descripción”, incluido el aviso de afiliado.'),value:description},
  {id:'destination',label:l('Link de destino afiliado','Affiliate destination link','Enlace de destino afiliado'),instruction:l('Cole no campo “Link de destino”. Confirme que pertence à sua conta de afiliado.','Paste into “Destination link”. Confirm it belongs to your affiliate account.','Pega en “Enlace de destino”. Comprueba tu cuenta afiliada.'),value:pack.destinationUrl},
  {id:'board',label:l('Pasta do Pinterest','Pinterest board','Tablero de Pinterest'),instruction:l('No campo “Pasta”, selecione este nome. Se a pasta não existir, crie-a no Pinterest.','In “Board”, select this name; create the board in Pinterest if needed.','En “Tablero”, selecciona este nombre o crea el tablero si no existe.'),value:pack.boardName},
  {id:'alt',label:l('Texto alternativo','Alt text','Texto alternativo'),instruction:l('Adicione na opção de texto alternativo/acessibilidade, quando disponível.','Use the alt-text/accessibility option when available.','Utiliza la opción de texto alternativo/accesibilidad si está disponible.'),value:pack.altText,optional:true},
  ...(pack.keywords?.length?[{id:'topics',label:l('Palavras-chave / tópicos','Keywords / topics','Palabras clave / temas'),instruction:l('Use naturalmente no título/descrição ou selecione tópicos relacionados, caso o Pinterest ofereça esse campo. Não cole como spam.','Use naturally in title/description or select related topics if Pinterest offers that field; avoid keyword stuffing.','Úsalas naturalmente en título/descripción o temas relacionados cuando aparezcan; evita spam.'),value:pack.keywords.join(', '),optional:true}]:[]),
  ...(pack.trackingCode?[{id:'tracking',label:l('Código de rastreamento (consulta)','Tracking code (reference)','Código de seguimiento (referencia)'),instruction:l('Só para conferência no painel de afiliados; não é um campo obrigatório do Pinterest.','For reconciliation in your affiliate dashboard, not a required Pinterest field.','Solo para conciliar en el portal de afiliados; no es campo obligatorio de Pinterest.'),value:pack.trackingCode,optional:true}]:[]),
 ];
}
