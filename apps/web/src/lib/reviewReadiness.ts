import type {Campaign} from '@nestaffiliate/core';
import type {GuardResult} from '@nestaffiliate/compliance';
export interface ReviewBlocker{key:string;message:string;target:'#review-product'|'#review-creative'|'#review-final';}
/** Never mutate an approved/rejected campaign to BLOCKED just because someone attempted a button.
 * Returns actionable missing requirements, in the order they can be fixed.
 */
export function reviewBlockers(campaign:Campaign,guard:GuardResult):ReviewBlocker[]{
 const v=campaign.currentVersion;
 const issues:ReviewBlocker[]=[];
 const add=(key:string,message:string,target:ReviewBlocker['target'])=>{
   if(!issues.some(item=>item.key===key))issues.push({key,message,target});
 };
 // Existing demo fixtures keep their previous behavior for smoke tests.
 // For real newly reviewed Pins, text-only mockups must not be mistaken for a finished photo.
 if(campaign.organizationId!=='demo-org'){
   if(!v.creativePack)add('creative-pack','Prepare o Creative Pack: ele trará títulos, descrição, conceitos e o prompt em inglês.','#review-creative');
   if(!v.creativeAsset)add('creative-image','Gere a imagem no ChatGPT, importe-a e confirme fidelidade e direitos antes de aprovar.','#review-creative');
 }
 if(campaign.rankingContext?.v4ResearchDraft){
   const asset=v.creativeAsset;
   if(!asset?.referenceAssetId || asset.referenceListingId!==v.product.externalId
      || !asset.referenceSha256 || !asset.reviewedAt || !asset.productFidelityConfirmed)
     add('reference-lock','Selecione a foto de referência autorizada, anexe-a ao ChatGPT e revise a imagem importada.','#review-creative');
 }
 if(v.creativePack && !v.creativeAsset)add('image-pack','Este Pin já tem textos, mas ainda falta importar e revisar a imagem gerada.','#review-creative');
 const steps:Record<string,{message:string;target:ReviewBlocker['target']}>={
   availability:{message:'A oferta aparece indisponível. Confira o anúncio real ou troque o produto.',target:'#review-product'},
   link:{message:'O link de destino precisa ser HTTPS e corresponder a uma oferta válida.',target:'#review-product'},
   'affiliate-link':{message:'Falta o link gerado na sua conta de afiliado. A URL comum do anúncio não garante comissão.',target:'#review-product'},
   'affiliate-attestation':{message:'Confirme, na sua Central de Afiliados, o anúncio exato, sua conta e o canal Pinterest; depois salve o link aqui.',target:'#review-product'},
   'creative-asset-rights':{message:'Confirme que você tem direito de usar a imagem importada.',target:'#review-creative'},
   'creative-fidelity':{message:'Compare a imagem gerada com o produto verdadeiro e confirme a fidelidade.',target:'#review-creative'},
   'creative-embedded-text':{message:'Use uma imagem base sem texto gerado pela IA; o app acrescenta o texto final depois.',target:'#review-creative'},
   'asset-rights':{message:'Confirme a origem e a autorização da foto do produto.',target:'#review-creative'},
   disclosure:{message:'Adicione um aviso claro de conteúdo afiliado à campanha.',target:'#review-creative'},
   claims:{message:'Remova promessas comerciais não comprovadas dos textos.',target:'#review-creative'},
   duplicate:{message:'Esta campanha parece duplicar um Pin existente; revise o conteúdo antes de continuar.',target:'#review-final'},
 };
 for(const issue of guard.checks.filter(item=>item.outcome==='BLOCK')){
   const known=steps[issue.key];add('guard-'+issue.key,known?.message??issue.message,known?.target??'#review-final');
 }
 return issues;
}
