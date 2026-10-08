/** Zero-dependency ZIP (STORE) for a truthful, portable guided-Pin package.
 * ZIP is an archive container; no claim is made that the PNG compresses further.
 */
export interface PublishingBundle{
 filename:string;title:string;description:string;disclosure:string;
 destinationUrl:string;boardName:string;altText:string;keywords?:string[];
}
function crc32(data:Uint8Array){
 let crc=0xffffffff;
 for(const byte of data){crc^=byte;for(let i=0;i<8;i++)crc=crc&1?(crc>>>1)^0xedb88320:crc>>>1;}
 return (crc^0xffffffff)>>>0;
}
function u16(view:DataView,offset:number,value:number){view.setUint16(offset,value,true);}
function u32(view:DataView,offset:number,value:number){view.setUint32(offset,value,true);}
const encoder=new TextEncoder();
function zipFiles(files:Array<{name:string;bytes:Uint8Array}>):Uint8Array{
 if(files.length>100)throw new Error('ZIP_TOO_MANY_ENTRIES');
 const locals:Uint8Array[]=[],centrals:Uint8Array[]=[];
 let offset=0;
 for(const file of files){
  if(!/^[\w. -]{1,120}$/.test(file.name)||file.name==='.'||file.name==='..')throw new Error('ZIP_INVALID_FILENAME');
  const name=encoder.encode(file.name),data=file.bytes,crc=crc32(data);
  if(data.length>30_000_000)throw new Error('ZIP_FILE_TOO_LARGE');
  const local=new Uint8Array(30+name.length+data.length),v=new DataView(local.buffer);
  u32(v,0,0x04034b50);u16(v,4,20);u16(v,6,0x800);u16(v,8,0);u32(v,14,crc);
  u32(v,18,data.length);u32(v,22,data.length);u16(v,26,name.length);
  local.set(name,30);local.set(data,30+name.length);
  const central=new Uint8Array(46+name.length),c=new DataView(central.buffer);
  u32(c,0,0x02014b50);u16(c,4,20);u16(c,6,20);u16(c,8,0x800);
  u32(c,16,crc);u32(c,20,data.length);u32(c,24,data.length);
  u16(c,28,name.length);u32(c,42,offset);central.set(name,46);
  locals.push(local);centrals.push(central);offset+=local.length;
 }
 const centralSize=centrals.reduce((n,b)=>n+b.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);
 u32(e,0,0x06054b50);u16(e,8,files.length);u16(e,10,files.length);
 u32(e,12,centralSize);u32(e,16,offset);
 const result=new Uint8Array(offset+centralSize+end.length);let position=0;
 for(const chunk of [...locals,...centrals,end]){result.set(chunk,position);position+=chunk.length;}
 return result;
}
export function publicationBundleText(pack:PublishingBundle){
 return [
  'PIN — PACOTE DE PUBLICAÇÃO GUIADA',
  'Título: '+pack.title,'Descrição: '+pack.description,
  'Divulgação comercial: '+pack.disclosure,
  'Destino: '+pack.destinationUrl,'Pasta sugerida: '+pack.boardName,
  'Texto alternativo: '+pack.altText,
  'Tags: '+(pack.keywords??[]).join(', '),
  'ATENÇÃO: Este pacote não significa postagem realizada.',
  'Confirme o link de afiliado na sua conta e o anúncio antes de publicar.',
 ].join('\n');
}
export function generatePublishingZip(pack:PublishingBundle,png:Uint8Array){
 if(png.length<8 || png[0]!==137||png[1]!==80||png[2]!==78||png[3]!==71)throw new Error('PNG_SIGNATURE_INVALID');
 return zipFiles([
  {name:'pin.png',bytes:png},
  {name:'publicacao.txt',bytes:encoder.encode(publicationBundleText(pack))},
  {name:'informacoes.json',bytes:encoder.encode(JSON.stringify({...pack,publicationStatus:'NOT_PUBLISHED',commissionVerified:false},null,2))},
 ]);
}
