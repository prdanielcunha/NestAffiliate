import type { ProductTruth, PinterestCreativePack } from '@nestaffiliate/core';
import { validateCommercialClaims, compactPinText } from '@nestaffiliate/creative-engine';

export interface ProductAiStrategy {
  productType:string;
  buyerIntent:string;
  audience:string;
  positioning:string;
  factsUsed:string[];
  unknowns:string[];
  angles:[string,string,string];
  titles:[string,string,string];
  descriptions:[string,string];
  keywords:string[];
  recommendedBoard:string;
  headline:string;
  cta:string;
}

const generic=/(?:uma ideia editorial|solu[cç][aã]o pr[aá]tica para o dia a dia|um achado para conhecer|produto selecionado pela utilidade|contexto de uso realista|an editorial idea for|a practical idea for everyday life)/i;
const suspect=/(?:frete gr[aá]tis|entrega gr[aá]tis|desconto de|promo[cç][aã]o|garantia de|o melhor|mais vendido|imperd[ií]vel|resultado garantido|qualidade superior|compre agora antes que acabe)/i;
const colorTerms=/\b(preto|preta|branco|branca|bege|rosa|verde|azul|vermelho|amarelo|dourado|prata|cinza|marrom|black|white|pink|blue|gold|gris|negro|negra)\b/gi;
const specTerms=/\b(antiaderente|cer[aâ]mica|inox|alum[ií]nio|teflon|silicone|algod[aã]o|bpa|voltagem|watts?|litros?)\b/gi;
function normalize(s:string){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();}
function keys(s:string){return new Set((normalize(s).match(/\b[\p{L}\p{N}]{4,}\b/gu)??[]).filter(w=>!/^(com|para|uma|este|essa|esta|como|sobre|dentro|cores|varias|produto|jogo|conjunto|modelos|peças)$/.test(w)));}
function unique(a:string[]){return new Set(a.map(normalize)).size===a.length;}
/**
 * Model output is untrusted draft data, not authority to alter Product Truth.
 * Reject ungrounded numbers/specs/colors and generic marketing guarantees.
 */
export function validateProductAiStrategy(raw:unknown,product:ProductTruth,observations:string[]=[]):ProductAiStrategy{
  if(!raw || typeof raw!=='object')throw new Error('AI_STRATEGY_INVALID');
  const o=raw as Record<string,unknown>;
  function string(key:string,low:number,high:number){
    const v=o[key];
    if(typeof v!=='string'||v.trim().length<low||v.trim().length>high)throw new Error('AI_STRATEGY_INVALID_'+key);
    return v.replace(/\s+/g,' ').trim();
  }
  function array(key:string,nMin:number,nMax:number,limit:number){
    const v=o[key];
    if(!Array.isArray(v)||v.length<nMin||v.length>nMax ||
      v.some(x=>typeof x!=='string'||x.trim().length<3||x.trim().length>limit))
        throw new Error('AI_STRATEGY_INVALID_'+key);
    return v.map(x=>(x as string).replace(/\s+/g,' ').trim()) as string[];
  }
  const titles=array('titles',3,3,100);
  const descriptions=array('descriptions',2,2,500);
  const angles=array('angles',3,3,140);
  const keywords=array('keywords',5,10,90);
  const factsUsed=array('factsUsed',0,8,160);
  const unknowns=array('unknowns',0,8,180);
  const productType=string('productType',3,100);
  const buyerIntent=string('buyerIntent',8,230);
  const audience=string('audience',5,160);
  const positioning=string('positioning',8,230);
  const headline=string('headline',8,60);
  const recommendedBoard=string('recommendedBoard',5,90);
  const cta=string('cta',4,60);
  if(!unique(titles)||!unique(descriptions)||!unique(angles))throw new Error('AI_STRATEGY_REPEATED');
  const text=[...titles,...descriptions,headline].join(' ');
  if(generic.test(text)||suspect.test(text)||validateCommercialClaims([text]).outcome==='BLOCK')
    throw new Error('AI_STRATEGY_UNSUPPORTED_CLAIM');
  const reference=normalize([product.title.value,...observations].join(' '));
  const allFacts=[...titles,...descriptions,headline,...factsUsed].join(' ');
  // Numeric and technical assertions require explicit evidence from the listing/OCR.
  const numerals=allFacts.match(/\b\d+(?:[,.]\d+)?\b/g)??[];
  for(const n of numerals) if(!reference.includes(n))throw new Error('AI_STRATEGY_UNGROUNDED_NUMBER');
  for(const exp of [colorTerms,specTerms]){
    for(const word of [...new Set((allFacts.match(exp)??[]).map(normalize))]){
      if(!reference.includes(word))throw new Error('AI_STRATEGY_UNGROUNDED_SPEC');
    }
  }
  const subject=keys(product.title.value);
  const first=keys(titles[0]!);
  if(subject.size && ![...subject].some(w=>first.has(w)))throw new Error('AI_STRATEGY_OFF_TOPIC');
  if(descriptions.some(d=>d.length<110))throw new Error('AI_STRATEGY_SHORT_DESCRIPTION');
  if(descriptions.some(d=>!/(?:afiliad|affiliate)/i.test(d)))throw new Error('AI_STRATEGY_NO_DISCLOSURE');
  // No inferred "facts" are used to change the source-of-truth product fields.
  return {productType,buyerIntent,audience,positioning,factsUsed,unknowns,
    angles:angles as [string,string,string],titles:titles as [string,string,string],
    descriptions:descriptions as [string,string],keywords,
    recommendedBoard,headline:compactPinText(headline,57),cta};
}
export function overlayAiStrategy(pack:PinterestCreativePack,s:ProductAiStrategy):PinterestCreativePack{
  const uniqueKeywords=[...new Set([...s.keywords,...pack.copy.keywords].map(v=>v.trim()).filter(Boolean))].slice(0,12);
  return {
    ...pack,
    copy:{
      ...pack.copy,titles:s.titles,descriptions:s.descriptions,
      headline:s.headline,
      cta:s.cta,
      primaryKeyword:s.keywords[0]!,
      keywords:uniqueKeywords,
      secondaryKeywords:uniqueKeywords.slice(1,7),
      longTailKeywords:uniqueKeywords.slice(0,3),
      recommendedBoardName:s.recommendedBoard,
    },
    imageConcepts:pack.imageConcepts.map((concept,index)=>({
      ...concept,
      rationale:s.angles[index]??concept.rationale,
    })),
    qualityExplanation:[
      'NestAI: estratégia criativa específica ao produto; proposta sujeita à revisão humana.',
      'Intenção de compra provável: '+s.buyerIntent,
      'Público provável: '+s.audience,
      ...pack.qualityExplanation.filter(x=>!x.includes('Copy contextual')),
    ],
  };
}
