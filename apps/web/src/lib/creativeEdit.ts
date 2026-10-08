import type { CampaignVersion } from '@nestaffiliate/core';

/** Zero-cost, deterministic editor: unsupported requests never touch the campaign. */
export type CreativeEditPlan =
  | { ok:true; changes:Pick<CampaignVersion,'narrative'|'template'>; summary:string[]; originalRequest:string }
  | { ok:false; message:string; originalRequest:string };

export function planCreativeEdit(version:CampaignVersion,request:string):CreativeEditPlan {
  const raw=request.trim();
  const fail=(message:string):CreativeEditPlan=>({ok:false,message,originalRequest:raw});
  if(!raw)return fail('Descreva uma alteração antes de continuar.');
  if(raw.length>500)return fail('O pedido é muito longo. Faça uma alteração por vez.');
  const value=raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const narrative={...version.narrative};
  let template=version.template;
  const summary:string[]=[];

  // Structured replacements execute exactly what the user typed, not AI-generated approximations.
  const field=raw.match(/^(?:troque|mude|altere|coloque|defina|use)\s+(?:a\s+|o\s+)?(headline|t[ií]tulo(?:\s+do\s+pin)?|descri[cç][aã]o|subt[ií]tulo)\s*(?:para|por|:|como)\s*["“]?(.+?)["”]?$/i);
  if(field){
    const text=field[2]!.trim().replace(/^["“]|["”]$/g,'').trim();
    if(text.length<4||text.length>200)return fail('Use um texto entre 4 e 200 caracteres.');
    const label=field[1]!.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const key:keyof typeof narrative=label==='headline'?'headline':label.startsWith('subtitulo')?'subheadline':label.startsWith('descricao')?'description':'pinterestTitle';
    narrative[key]=text;
    summary.push((key==='pinterestTitle'?'Título do Pinterest':key==='description'?'Descrição':key==='subheadline'?'Subheadline':'Headline')+' será alterado para: '+text);
  } else if(/^(mais\s+)?premium$|^quero\s+(um\s+)?visual\s+mais\s+premium$|^visual\s+premium$/i.test(value)){
    template='Editorial Premium';
    summary.push('Aplicar o template Editorial Premium (sem alterar fatos do produto).');
  } else if(/^(menos\s+texto|mais\s+clean|mais\s+limpo|visual\s+minimalista|mais\s+minimalista)$/i.test(value)){
    template='Minimal';
    narrative.subheadline='';
    summary.push('Usar o template Minimal e retirar a subheadline.');
  } else if(/^(fundo\s+(mais\s+)?claro|quero\s+(um\s+)?fundo\s+(mais\s+)?claro)$/i.test(value)){
    template='Editorial Light';
    summary.push('Renderizar o template editorial com paleta clara.');
  } else if(/^(novo\s+angulo|outra\s+abordagem|mude\s+a\s+abordagem)$/i.test(value)){
    template='Problem → Solution';
    narrative.headline='Uma ideia para aproveitar melhor '+version.keyword;
    summary.push('Novo ângulo de problema e solução, mantendo o mesmo produto.');
  } else if(/^(tira\s+(o\s+)?preco|sem\s+preco|remova\s+(o\s+)?preco)$/i.test(value)){
    const pricePattern=/\s*(?:R\$\s*\d[\d.,]*|\d[\d.,]*\s*reais)\s*/gi;
    let changed=false;
    for(const key of ['headline','subheadline','pinterestTitle','description'] as const){
      const old=narrative[key]??'';
      const replacement=old.replace(pricePattern,' ').replace(/\s+/g,' ').trim();
      if(old!==replacement){changed=true;narrative[key]=replacement;}
    }
    if(!changed)return fail('Não encontrei preço nos textos editáveis. Preços embutidos em imagens exigem uma nova imagem; nada foi alterado.');
    summary.push('Remover valores monetários dos textos editáveis. Confira a imagem antes de aprovar.');
  } else {
    return fail('Ainda não consigo executar esse pedido localmente. Tente “Mais premium”, “Menos texto”, “Fundo mais claro”, “Novo ângulo” ou “Troque a headline para: ...”. Para trocar o produto, use “Trocar produto”.');
  }
  if(narrative.headline===version.narrative.headline &&
     narrative.subheadline===version.narrative.subheadline &&
     narrative.pinterestTitle===version.narrative.pinterestTitle &&
     narrative.description===version.narrative.description && template===version.template){
    return fail('A campanha já está assim. Nenhuma alteração foi aplicada.');
  }
  if(!narrative.headline.trim()||!narrative.pinterestTitle.trim())return fail('A alteração deixaria a campanha sem título. Reformule o pedido.');
  return {ok:true,changes:{narrative,template},summary,originalRequest:raw};
}
