import { FEATURE_FLAGS, isPaidCapabilityAllowed } from '@nestaffiliate/config';

export type AIProviderId =
  | 'RULE_ENGINE'
  | 'GEMINI_FREE'
  | 'MANUAL_CHATGPT'
  | 'MANUAL_GEMINI'
  | 'OPENAI_API'
  | 'GEMINI_PAID'
  | 'OTHER_PROVIDER';

export type AICapability =
  | 'classification'
  | 'copy_generation'
  | 'creative_direction'
  | 'prompt_generation'
  | 'image_generation'
  | 'image_edit'
  | 'ranking_assist';

export interface QuotaState {
  provider: AIProviderId;
  available: boolean;
  remaining?: number;
  cooldownUntil?: string;
}

export function routeAI(capability: AICapability, quotas: QuotaState[] = []): AIProviderId {
  if (['classification', 'ranking_assist'].includes(capability)) return 'RULE_ENGINE';

  const gemini = quotas.find((q) => q.provider === 'GEMINI_FREE');
  if (
    FEATURE_FLAGS.GEMINI_FREE_ENABLED &&
    gemini?.available &&
    ['copy_generation', 'creative_direction', 'prompt_generation'].includes(capability)
  ) {
    return 'GEMINI_FREE';
  }

  if (
    isPaidCapabilityAllowed() &&
    FEATURE_FLAGS.OPENAI_API_ENABLED &&
    ['copy_generation', 'creative_direction', 'prompt_generation'].includes(capability)
  ) {
    return 'OPENAI_API';
  }

  if (
    isPaidCapabilityAllowed() &&
    FEATURE_FLAGS.OPENAI_IMAGE_ENABLED &&
    capability === 'image_generation'
  ) {
    return 'OPENAI_API';
  }

  return capability === 'image_generation' || capability === 'image_edit'
    ? 'MANUAL_CHATGPT'
    : 'RULE_ENGINE';
}

export function quotaFallbackMessage() {
  return 'A cota gratuita terminou por hoje. O NestAffiliate continua funcionando no modo local. Se quiser, use o prompt pronto no ChatGPT.';
}


export interface PromptProductFacts {
  title:string;
  marketplace:string;
  price?:number;
  currency?:string;
  seller?:string;
  availability:string;
  sourceNotes:string[];
}

export interface PromptPackage {
  id:string;
  capability:AICapability;
  provider:AIProviderId;
  system:string;
  prompt:string;
  facts:PromptProductFacts;
  privacyRedactions:string[];
  createdAt:string;
}

const EMAIL=/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE=/\b(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\d{4}|\d{4})[-\s]?\d{4}\b/g;
const CPF=/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;

export function privacyGuard(value:string){
  const redactions:string[]=[];
  let sanitized=value;
  const replace=(pattern:RegExp,label:string)=>{
    sanitized=sanitized.replace(pattern,()=>{
      redactions.push(label);
      return `[${label}_REMOVIDO]`;
    });
  };
  replace(EMAIL,'EMAIL');
  replace(PHONE,'TELEFONE');
  replace(CPF,'CPF');
  return {sanitized,redactions:[...new Set(redactions)]};
}

export function buildPromptPackage(input:{
  capability:AICapability;
  provider:AIProviderId;
  instruction:string;
  facts:PromptProductFacts;
}):PromptPackage{
  const privacy=privacyGuard(input.instruction);
  const factLines=[
    `Título: ${input.facts.title}`,
    `Marketplace: ${input.facts.marketplace}`,
    input.facts.price !== undefined ? `Preço observado: ${input.facts.price} ${input.facts.currency ?? ''}` : 'Preço: não informado',
    input.facts.seller ? `Vendedor: ${input.facts.seller}` : 'Vendedor: não informado',
    `Disponibilidade: ${input.facts.availability}`,
    ...input.facts.sourceNotes.map((note)=>`Fonte: ${note}`),
  ].join('\n');
  return {
    id:`prompt:${Date.now()}:${Math.random().toString(36).slice(2,8)}`,
    capability:input.capability,
    provider:input.provider,
    system:[
      'Você auxilia na criação editorial de afiliados.',
      'Nunca invente preço, desconto, rating, reviews, material, dimensões, frete, estoque, comissão ou fato do produto.',
      'Use somente os fatos fornecidos. Se faltar um fato, omita.',
      'Não prometa resultado nem use claims absolutos.',
      'Retorne conteúdo claro, útil, Pinterest-first e compatível com disclosure de afiliado.',
    ].join(' '),
    prompt:`${privacy.sanitized}\n\nFATOS BLOQUEADOS:\n${factLines}`,
    facts:input.facts,
    privacyRedactions:privacy.redactions,
    createdAt:new Date().toISOString(),
  };
}

export class LocalQuotaGuard {
  private usage=new Map<string,number>();
  constructor(private readonly dailyLimit=50){}
  consume(provider:AIProviderId,date=new Date()){
    const key=`${provider}:${date.toISOString().slice(0,10)}`;
    const used=this.usage.get(key) ?? 0;
    if(used>=this.dailyLimit) return {allowed:false,used,remaining:0};
    const next=used+1;
    this.usage.set(key,next);
    return {allowed:true,used:next,remaining:Math.max(0,this.dailyLimit-next)};
  }
  snapshot(provider:AIProviderId,date=new Date()){
    const key=`${provider}:${date.toISOString().slice(0,10)}`;
    const used=this.usage.get(key) ?? 0;
    return {used,remaining:Math.max(0,this.dailyLimit-used),limit:this.dailyLimit};
  }
}

export function ruleEngineCopy(input:{
  keyword:string;
  productTitle:string;
  tone?:'premium'|'practical'|'minimal';
}){
  const keyword=input.keyword.trim();
  const product=input.productTitle.trim();
  const tone=input.tone ?? 'practical';
  const headline =
    tone==='premium' ? `Uma escolha mais elegante para ${keyword}` :
    tone==='minimal' ? `${keyword}, sem complicar` :
    `Uma ideia prática para ${keyword}`;
  return {
    headline,
    pinterestTitle:`${keyword}: uma ideia útil para o dia a dia`,
    description:`Curadoria editorial sobre ${keyword} com foco em utilidade. Produto em destaque: ${product}. Conteúdo com link de afiliado.`,
    altText:`Pin editorial sobre ${keyword} com produto selecionado para contexto de casa e rotina.`,
    disclosure:'Conteúdo com link de afiliado. Posso receber comissão por compras qualificadas, sem custo adicional para você.',
    cta:'Ver a ideia',
  };
}
