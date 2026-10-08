import {describe,it,expect} from 'vitest';
import {generatePublishingZip,publicationBundleText} from '../../apps/web/src/lib/publicationBundle';
const pack={filename:'pin.png',title:'Organize seu espaço',description:'Solução prática para sua rotina',disclosure:'Link de afiliado: posso receber comissão',destinationUrl:'https://www.mercadolivre.com.br/p/MLB123',boardName:'Casa organizada',altText:'Imagem de organizador',keywords:['organizar','cozinha']};
const png=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]);
describe('Portable guided publishing package',()=>{
 it('creates a PK ZIP with a valid end-of-central-directory record',()=>{
  const zip=generatePublishingZip(pack,png);
  expect(new DataView(zip.buffer).getUint32(0,true)).toBe(0x04034b50);
  expect(new DataView(zip.buffer).getUint32(zip.length-22,true)).toBe(0x06054b50);
  const text=new TextDecoder().decode(zip);
  expect(text).toContain('pin.png');expect(text).toContain('publicacao.txt');expect(text).toContain('informacoes.json');
  expect(text).toContain('NOT_PUBLISHED');
 });
 it('does not declare publication or official commission verification',()=>{
  const text=publicationBundleText(pack);
  expect(text).toContain('não significa postagem realizada');
  expect(text).toContain(pack.disclosure);
 });
 it('rejects a fake image as PNG',()=>expect(()=>generatePublishingZip(pack,new Uint8Array([1,2,3,4,5,6,7,8]))).toThrow('PNG_SIGNATURE_INVALID'));
});
