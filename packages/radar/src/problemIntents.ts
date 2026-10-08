/** Product-intent hypotheses, not measured Pinterest search volumes.
 * Search stays user-initiated and per-request capped by the official broker.
 */
export type IntentLocale='pt-BR'|'en'|'es';
export interface ProblemIntent {
 id:string;category:'small_spaces'|'work_routine'|'organization'|'comfort';
 problem:Record<IntentLocale,string>;
 hypothesis:Record<IntentLocale,string>;
 keyword:string;
 commercialStatus:'HYPOTHESIS';
}
export const PROBLEM_INTENTS:readonly ProblemIntent[]=[
 {id:'small-kitchen',category:'small_spaces',problem:{'pt-BR':'Armários de cozinha sem espaço',en:'Not enough kitchen storage',es:'Poco espacio en armarios de cocina'},hypothesis:{'pt-BR':'Buscar soluções compactas para organizar prateleiras',en:'Look for compact shelf organization solutions',es:'Buscar soluciones compactas para organizar estantes'},keyword:'organizador armario cozinha compacto',commercialStatus:'HYPOTHESIS'},
 {id:'drawer-chaos',category:'organization',problem:{'pt-BR':'Gavetas que nunca ficam organizadas',en:'Messy drawers',es:'Cajones desordenados'},hypothesis:{'pt-BR':'Comparar divisórias e organizadores ajustáveis',en:'Compare adjustable dividers and organizers',es:'Comparar divisores y organizadores ajustables'},keyword:'divisoria ajustavel organizador gaveta',commercialStatus:'HYPOTHESIS'},
 {id:'remote-work',category:'work_routine',problem:{'pt-BR':'Home office apertado e desconfortável',en:'Small uncomfortable home office',es:'Oficina en casa incómoda y pequeña'},hypothesis:{'pt-BR':'Pesquisar ergonomia e apoio de trabalho sem prometer resultado médico',en:'Explore practical desk and chair solutions',es:'Buscar soluciones prácticas de escritorio y silla'},keyword:'cadeira escritorio compacta ergonomica',commercialStatus:'HYPOTHESIS'},
 {id:'laundry-space',category:'small_spaces',problem:{'pt-BR':'Lavanderia pequena e itens espalhados',en:'Tiny laundry area',es:'Lavandería pequeña'},hypothesis:{'pt-BR':'Comparar organizadores verticais e suportes',en:'Compare vertical storage and organizers',es:'Comparar almacenamiento vertical'},keyword:'organizador vertical lavanderia pequena',commercialStatus:'HYPOTHESIS'},
 {id:'bathroom-clutter',category:'organization',problem:{'pt-BR':'Banheiro com pouco espaço para guardar',en:'Bathroom without storage',es:'Baño sin espacio para guardar'},hypothesis:{'pt-BR':'Verificar soluções fáceis de instalar',en:'Check easy-to-install storage options',es:'Verificar opciones fáciles de instalar'},keyword:'prateleira suporte banheiro sem furar',commercialStatus:'HYPOTHESIS'},
 {id:'daily-comfort',category:'comfort',problem:{'pt-BR':'Rotina de trabalho sem apoio prático',en:'Workday lacks practical support',es:'Jornada de trabajo poco práctica'},hypothesis:{'pt-BR':'Pesquisar acessórios funcionais para mesa',en:'Explore useful desk accessories',es:'Explorar accesorios de escritorio'},keyword:'suporte notebook mesa escritorio',commercialStatus:'HYPOTHESIS'},
];
export function uniqueIntentQueries(intents:readonly ProblemIntent[],max=3):string[]{
 const seen=new Set<string>(); const result:string[]=[];
 for(const intent of intents){const q=intent.keyword.trim().toLowerCase();
  if(!q || seen.has(q))continue;seen.add(q);result.push(q);
  if(result.length===Math.max(1,Math.min(max,6)))break;
 }
 return result;
}
