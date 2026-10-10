import type { CampaignVersion, ProductTruth, SceneProfile } from '@nestaffiliate/core';

type Locale = 'pt-BR' | 'en' | 'es';
type Narrative = CampaignVersion['narrative'];

function norm(text: string) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
function clean(value: string) {
  return value.replace(/\s+/g, ' ').replace(/\s*[-–|]\s*(?:mercado livre|shopee)\s*$/i, '').trim();
}
/** Pinterest titles and overlay headlines must not be cut in the middle of words. */
export function compactPinText(raw: string, limit: number) {
  const text = clean(raw);
  if (text.length <= limit) return text;
  const part = text.slice(0, limit + 1);
  const space = part.lastIndexOf(' ');
  return (space > limit * 0.65 ? part.slice(0, space) : text.slice(0, limit)).replace(/[,;:\s–-]+$/, '').trim();
}
export function isGenericLegacyPinCopy(value: string) {
  return /uma ideia (editorial|pr[aá]tica|[uú]til)|uma solu[cç][aã]o pr[aá]tica para o dia a dia|curadoria editorial|mais simples e visual|practical idea for everyday life|an editorial idea for|una idea pr[aá]ctica para el d[ií]a/i.test(value);
}

function itemFacts(product: ProductTruth) {
  const original = clean(product.title.value);
  const text = norm(original);
  const pieces = text.match(/\b(\d{1,2})\s*(?:pecas|pcs|pieces|piezas|pzs)\b/)?.[1] ?? '';
  const count = pieces ? pieces + ' peças' : '';
  const pair = text.includes('preto') && text.includes('bege') ? 'preto e bege' : '';
  const anti = text.includes('antiaderente');
  const cookware = /\b(panelas?|frigideiras?|cac[aç]rolas?)\b/.test(text);
  const organizer = /\b(organizador|organiza[cç][aã]o|porta.tempero|escorredor)\b/.test(text);
  const lamps = /\b(lumin[aá]rias?|abajures?|pendentes?)\b/.test(text);
  const office = /\b(cadeira|mesa|suporte)\b/.test(text) && /\b(escrit[oó]rio|office|notebook|computador)\b/.test(text);
  const bathroom = /\b(ralo|box|banheiro|chuveiro)\b/.test(text);
  const decor = /\b(tapete|almofada|cortina)\b/.test(text);
  const pets = /\b(comedouro|bebedouro|coleira|pet|gato|cachorro)\b/.test(text);
  const subject = cookware ? ('jogo de panelas' + (count ? ' ' + count : ''))
    : compactPinText(original, 59);
  return { original, text, pieces, count, pair, anti, cookware, organizer, lamps, office, bathroom, decor, pets, subject };
}

function dedupe(items:string[], max=100) {
  const seen = new Set<string>();
  return items.map(item=>compactPinText(item,max)).filter(item=>{
    const key=norm(item).replace(/[^\p{L}\p{N}]+/gu,'');
    if(!key || seen.has(key))return false;
    seen.add(key);
    return true;
  });
}

export function buildConversionPinCopy(input: {
  locale: Locale;
  product: ProductTruth;
  keyword: string;
  scene: SceneProfile;
  existing?: Narrative;
}) {
  const {locale,product,scene,existing}=input;
  const f=itemFacts(product);
  const disclosed=existing?.disclosure?.trim() || (locale==='pt-BR'
    ? 'Conteúdo com link de afiliado. Posso receber comissão por compras qualificadas, sem custo adicional para você.'
    : locale==='es'
      ? 'Contenido con enlace de afiliado. Puedo recibir una comisión por compras calificadas, sin costo adicional.'
      : 'Affiliate content. I may earn a commission on qualifying purchases at no extra cost to you.');
  const affiliateShort=locale==='pt-BR' ? 'Conteúdo com link de afiliado.'
    : locale==='es' ? 'Contenido con enlace de afiliado.' : 'Affiliate content.';
  const detail=f.pair ? ' em ' + f.pair : '';
  let titles:string[], descriptions:string[], headline:string,subheadline:string, primaryKeyword:string, boardHint:string;
  let longTailKeywords:string[]=[];

  if(locale==='pt-BR'){
    if(f.cookware){
      const subject='jogo de panelas'+(f.count?' '+f.count:'');
      const shortCount=f.count||'este conjunto';
      titles=[
        (f.count?'Jogo de panelas '+f.count:'Jogo de panelas')+(f.pair?' '+f.pair:'')+': um achado para sua cozinha',
        'Pensando em trocar as panelas? Conheça '+(f.count?'este conjunto de '+f.count:'este conjunto'),
        (f.pair?'Panelas '+f.pair:'Jogo de panelas')+': ideias para o visual da cozinha',
      ];
      descriptions=[
        'Procurando um jogo de panelas que combine com sua cozinha? Conheça este '+(f.anti?'conjunto antiaderente':'conjunto')+(f.count?' de '+f.count:'')+detail+'. Confira as fotos, veja a composição do kit e consulte as avaliações e o preço atualizado no anúncio antes de escolher. '+affiliateShort,
        'Está pesquisando panelas para sua cozinha? Este '+(f.count?'conjunto de '+shortCount:'jogo de panelas')+(f.pair?' em '+f.pair:'')+' merece uma olhada pelo visual. Compare materiais, itens incluídos, medidas e condições da oferta diretamente na página do produto. '+affiliateShort,
      ];
      headline=f.pair?'Panelas '+f.pair+' para sua cozinha':'Um jogo de panelas para conhecer';
      subheadline='Confira as peças e os detalhes antes de escolher.';
      primaryKeyword=subject;
      boardHint='Jogos de Panelas e Ideias para Cozinha';
      longTailKeywords=[subject+' para cozinha',f.pair?'panelas '+f.pair:'conjunto de panelas', 'ideias de jogo de panelas'];
    }else if(scene.category==='kitchen-utensils'){
      const subject=f.subject;
      titles=[
        'Um detalhe para sua cozinha: conheça '+subject,
        'Procurando utensílios para a cozinha? Veja '+subject,
        subject+': mais ideias para o dia a dia na cozinha',
      ];
      descriptions=[
        'Pesquisando utensílios para cozinha? Conheça '+subject+' e veja como o produto aparece em um contexto realista. Confira fotos, composição, medidas e avaliações no anúncio antes de escolher. '+affiliateShort,
        'Buscando itens para sua cozinha? Veja os detalhes de '+subject+' e compare material, acabamento e condições atualizadas diretamente no anúncio. '+affiliateShort,
      ];
      headline='Ideias para complementar sua cozinha';
      subheadline='Confira os detalhes reais do produto.';
      primaryKeyword=subject;boardHint='Utensílios e Ideias para Cozinha';
      longTailKeywords=[subject+' cozinha','utensílios de cozinha','ideias para bancada'];
    }else if(scene.category==='kitchen-organization'){
      const subject=f.subject;
      titles=[
        'Sua cozinha pede mais organização? Conheça '+subject,
        subject+': uma ideia para organizar a bancada',
        'Detalhes para a cozinha: veja '+subject,
      ];
      descriptions=[
        'Quer deixar os itens da cozinha mais fáceis de visualizar? Veja '+subject+' em um contexto de uso real. Confira medidas, compatibilidade e avaliações no anúncio antes de escolher. '+affiliateShort,
        'Na hora de organizar a cozinha, cada espaço conta. Conheça '+subject+' e confira como o produto é apresentado, quais itens acompanha e se atende ao seu espaço. '+affiliateShort,
      ];
      headline='Ideias para uma cozinha organizada';subheadline='Veja se este item combina com o seu espaço.';
      primaryKeyword=subject;boardHint='Organização e Ideias para Cozinha';
      longTailKeywords=[subject+' para cozinha','ideias de organização da cozinha','organizador para bancada'];
    }else if(f.lamps||scene.category==='lighting'){
      const subject=f.subject;
      titles=['Uma luz diferente para o ambiente? Veja '+subject,
        subject+': inspiração para um cantinho acolhedor',
        'Iluminação e decoração: conheça '+subject];
      descriptions=[
        'Está buscando ideias de iluminação para a casa? Conheça '+subject+' e observe como o modelo aparece no ambiente. Confira tamanho, instalação, tipo de luz e avaliações no anúncio antes de comprar. '+affiliateShort,
        'Um detalhe de iluminação pode mudar a composição visual de um espaço. Veja '+subject+' e confira as especificações reais para escolher com mais segurança. '+affiliateShort,
      ];
      headline='Iluminação para inspirar sua casa';subheadline='Confira tamanho, instalação e acabamento.';
      primaryKeyword=subject;boardHint='Iluminação e Decoração';
      longTailKeywords=['ideias de iluminação para casa',subject+' decoração','inspiração para iluminação'];
    }else if(f.office||scene.category==='home-office'){
      const subject=f.subject;
      titles=['Seu home office merece atenção aos detalhes: '+subject,
        subject+': ideias para um espaço de trabalho bonito',
        'Um escritório com personalidade? Conheça '+subject];
      descriptions=[
        'Montando ou atualizando seu cantinho de trabalho? Conheça '+subject+' e veja como ele aparece em um home office realista. Consulte dimensões, compatibilidade e avaliações no anúncio. '+affiliateShort,
        'Quer ideias para compor seu espaço de trabalho? Este modelo pode entrar na sua lista de referências. Confira as fotos e as características de '+subject+' antes de escolher. '+affiliateShort,
      ];
      headline='Inspiração para seu home office';subheadline='Um detalhe para considerar no seu espaço.';
      primaryKeyword=subject;boardHint='Home Office e Escritório';
      longTailKeywords=[subject+' escritório','ideias para home office','decoração de escritório'];
    }else if(f.bathroom||scene.category==='bathroom-accessories'){
      const subject=f.subject;
      titles=['Banheiro bem pensado começa nos detalhes: '+subject,
        subject+': o detalhe para conferir no projeto',
        'Planejando o banheiro? Veja este '+subject];
      descriptions=[
        'Reformando ou montando o banheiro? Conheça '+subject+' e veja o produto no contexto correto. Antes de escolher, confirme medidas, tipo de instalação e acabamento no anúncio. '+affiliateShort,
        'Os detalhes fazem diferença no planejamento do banheiro. Confira as fotos e especificações de '+subject+' para avaliar se combinam com seu projeto. '+affiliateShort,
      ];
      headline='Detalhes que inspiram o banheiro';subheadline='Confira medidas e instalação no anúncio.';
      primaryKeyword=subject;boardHint='Banheiro: Ideias e Detalhes';
      longTailKeywords=[subject+' banheiro','ideias para banheiro','acabamentos de banheiro'];
    }else if(f.decor||scene.category==='home-decor'){
      const subject=f.subject;
      titles=['Quer renovar o visual da casa? Veja '+subject,
        subject+': uma inspiração para decorar',
        'A decoração mora nos detalhes: conheça '+subject];
      descriptions=[
        'Buscando referências para decorar sem perder a personalidade? Confira '+subject+' em uma composição inspiradora. Veja tamanho, cor, material e avaliações na página do produto. '+affiliateShort,
        'Uma ideia de decoração para salvar e comparar: '+subject+'. Observe as fotos reais, confira as medidas e veja se combina com o seu ambiente. '+affiliateShort,
      ];
      headline='Um detalhe para sua decoração';subheadline='Inspiração com o produto real em destaque.';
      primaryKeyword=subject;boardHint='Decoração e Inspiração para Casa';
      longTailKeywords=[subject+' decoração','ideias para decorar a casa','inspiração para decoração'];
    }else if(scene.category==='laundry'){
      const subject=f.subject;
      titles=[
        'Lavanderia mais organizada? Conheça '+subject,
        subject+': confira esta ideia para sua lavanderia',
        'Detalhes para a rotina da casa: veja '+subject,
      ];
      descriptions=[
        'Organizando a lavanderia? Conheça '+subject+' e confira no anúncio como é o produto, suas medidas e as possibilidades de uso indicadas pelo fabricante. '+affiliateShort,
        'Veja '+subject+' como opção para pesquisar ao planejar a lavanderia. Compare fotos e especificações reais antes de decidir. '+affiliateShort,
      ];
      headline='Ideias para sua lavanderia';subheadline='Veja as características no anúncio.';
      primaryKeyword=subject;boardHint='Lavanderia e Organização';
      longTailKeywords=[subject+' lavanderia','ideias para lavanderia','organização da lavanderia'];
    }else if(scene.category==='kids-room'){
      const subject=f.subject;
      titles=[
        'Montando o quarto infantil? Veja '+subject,
        subject+': uma ideia para o cantinho das crianças',
        'Inspiração para quarto infantil: conheça '+subject,
      ];
      descriptions=[
        'Planejando o quarto infantil? Conheça '+subject+' e veja fotos, medidas e recomendações de idade ou uso diretamente no anúncio. Não presuma características de segurança sem documentação. '+affiliateShort,
        'Buscando referências para um quarto infantil? Confira '+subject+' e compare as especificações do produto com o espaço e a faixa etária indicada. '+affiliateShort,
      ];
      headline='Ideias para o quarto infantil';subheadline='Confira as indicações do fabricante.';
      primaryKeyword=subject;boardHint='Quarto Infantil: Ideias';
      longTailKeywords=[subject+' quarto infantil','ideias para quarto infantil','itens de quarto infantil'];
    }else if(f.pets||scene.category==='pet'){
      const subject=f.subject;
      titles=['Organizando o cantinho do pet? Conheça '+subject,
        subject+': veja como incluir na rotina',
        'Ideias para quem tem pet: confira '+subject];
      descriptions=[
        'Procurando um item para o cantinho do seu pet? Conheça '+subject+' e veja as informações do modelo. Confira medidas, materiais e recomendações de uso no anúncio antes de escolher. '+affiliateShort,
        'Uma opção para pesquisar na hora de montar o espaço do pet: '+subject+'. Compare fotos e especificações para conferir se é adequado ao seu animal. '+affiliateShort,
      ];
      headline='Ideias para o cantinho do pet';subheadline='Confira tamanho e indicação do produto.';
      primaryKeyword=subject;boardHint='Cantinho Pet';
      longTailKeywords=[subject+' para pet','ideias para cantinho pet','acessórios para pets'];
    }else{
      const subject=f.subject;
      titles=['Buscando ideias para sua casa? Conheça '+subject,
        subject+': veja os detalhes deste achado',
        'Vale conhecer: '+subject+' em um ambiente real'];
      descriptions=[
        'Conheça '+subject+' e veja o produto em uma proposta de uso coerente. Confira fotos, características e avaliações no anúncio para entender se combina com o que você procura. '+affiliateShort,
        'Está reunindo referências para casa? Inclua '+subject+' na sua pesquisa e compare medidas, materiais e condições da oferta antes de decidir. '+affiliateShort,
      ];
      headline='Um achado para conhecer de perto';subheadline='Detalhes reais para comparar antes de escolher.';
      primaryKeyword=subject;boardHint='Achados e Ideias para Casa';
      longTailKeywords=[subject+' para casa','ideias para casa',subject+' detalhes'];
    }
  } else {
    const subject=compactPinText(f.subject,45);
    if(locale==='es'){
      titles=['¿Buscas ideas para tu casa? Descubre '+subject,
        subject+': mira los detalles antes de elegir',
        'Una idea para guardar: '+subject];
      descriptions=[
        '¿Estás buscando '+subject+'? Mira las fotos y las características del producto. Verifica las medidas, las valoraciones y el precio actualizado en el anuncio antes de decidir. '+affiliateShort,
        'Explora '+subject+' como inspiración para tu espacio. Comprueba los detalles de la oferta y los materiales directamente con el vendedor. '+affiliateShort];
      headline='Un producto que vale conocer';subheadline='Consulta los detalles reales de la oferta.';
      primaryKeyword=subject;boardHint='Ideas para el Hogar';
      longTailKeywords=[subject+' para casa','ideas de decoración','productos para el hogar'];
    }else{
      titles=['Looking for home ideas? Explore '+subject,
        subject+': see the details before choosing',
        'Save this idea: '+subject+' for your space'];
      descriptions=[
        'Looking into '+subject+'? Explore the photos and product details, then check dimensions, reviews and current pricing on the listing before deciding. '+affiliateShort,
        'Consider '+subject+' for your space. Compare the seller photos, features and availability before making a choice. '+affiliateShort];
      headline='A useful find to explore';subheadline='Check the verified listing details.';
      primaryKeyword=subject;boardHint='Home Finds and Inspiration';
      longTailKeywords=[subject+' for home','home ideas','home inspiration'];
    }
  }
  // The disclosure is a separate field AND a short notice in the description,
  // so copying only the Pinterest description remains transparent.
  const titleOptions=dedupe(titles,100);
  const descriptionOptions=dedupe(descriptions,500);
  return {
    titles:titleOptions,
    descriptions:descriptionOptions,
    headline:compactPinText(headline,57),
    subheadline:compactPinText(subheadline,110),
    cta:locale==='pt-BR'?'Ver detalhes':locale==='es'?'Ver detalles':'See details',
    disclosure:disclosed,
    altText:locale==='pt-BR'
      ? 'Imagem editorial com '+compactPinText(f.original,100)+' em '+scene.environment+'.'
      : locale==='es'?'Imagen editorial del producto '+compactPinText(f.original,95)+' en '+scene.environment+'.'
      : 'Editorial product image of '+compactPinText(f.original,95)+' in '+scene.environment+'.',
    primaryKeyword:compactPinText(primaryKeyword,95),
    relatedKeywords:dedupe([primaryKeyword,...longTailKeywords],95),
    longTailKeywords:dedupe(longTailKeywords,95),
    suggestedBoard:boardHint,
  };
}
