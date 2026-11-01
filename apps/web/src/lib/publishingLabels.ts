export function publishingCheckLabel(key:string,locale:string){
 const labels:Record<string,[string,string,string]>={
 'product-identity':['Produto identificado','Product identified','Producto identificado'],
 availability:['Disponibilidade','Availability','Disponibilidad'],link:['Destino seguro','Safe destination','Destino seguro'],
 'affiliate-link':['Link de afiliado','Affiliate link','Enlace de afiliado'],'affiliate-attestation':['Conferência do link','Link confirmation','Confirmación del enlace'],
 'asset-rights':['Uso da foto','Photo rights','Uso de la foto'],'creative-asset-rights':['Uso da imagem final','Final image rights','Uso de la imagen'],
 'creative-fidelity':['Fidelidade do produto','Product fidelity','Fidelidad del producto'],'creative-embedded-text':['Imagem base sem texto','Text-free image base','Imagen base sin texto'],
 disclosure:['Aviso de afiliado','Affiliate disclosure','Aviso de afiliado'],claims:['Textos conferidos','Copy checked','Textos revisados'],
 duplicate:['Originalidade','Originality','Originalidad'],frequency:['Frequência de publicação','Posting frequency','Frecuencia de publicación'],
 'price-freshness':['Preço atualizado','Current price','Precio actualizado'],
 };
 return labels[key]?.[locale==='pt-BR'?0:locale==='es'?2:1]??(locale==='pt-BR'?'Conferência adicional':locale==='es'?'Comprobación adicional':'Additional check');
}
