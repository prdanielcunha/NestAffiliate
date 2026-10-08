/** Human-imported ICS reminder. Scheduling here does NOT post to Pinterest. */
const escapeText=(v:string)=>v.replace(/[\r\n]+/g,' ').replace(/\\/g,'\\\\').replace(/,/g,'\\,').replace(/;/g,'\\;');
const stamp=(d:Date)=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
export function publicationCalendarIcs(input:{campaignId:string;version:number;scheduledFor:string;productTitle:string;boardName:string;now?:Date}):string{
 const when=new Date(input.scheduledFor);const now=input.now??new Date();
 if(!Number.isFinite(when.getTime())||when.getTime()<=now.getTime())throw new Error('ICS_SCHEDULE_INVALID');
 if(!/^[\w-]{1,100}$/.test(input.campaignId)||!Number.isSafeInteger(input.version)||input.version<1)throw new Error('ICS_ID_INVALID');
 const title=escapeText(input.productTitle.slice(0,100));
 const board=escapeText(input.boardName.slice(0,100));
 return [
 'BEGIN:VCALENDAR','VERSION:2.0','CALSCALE:GREGORIAN','METHOD:PUBLISH','PRODID:-//NestAffiliate//Guided Publishing//PT-BR',
 'BEGIN:VEVENT',
 'UID:'+input.campaignId+'-v'+input.version+'@nestaffiliate.millionsnest.com',
 'DTSTAMP:'+stamp(now),'DTSTART:'+stamp(when),
 'SUMMARY:Publicar Pin - '+title,
 'DESCRIPTION:Publicação guiada. Abrir NestAffiliate para conferir oferta\, link afiliado\, direitos\, destino e pasta '+board+'. Não é publicação automática.',
 'BEGIN:VALARM','ACTION:DISPLAY','TRIGGER:-P1D','DESCRIPTION:Preparar Pin e conferir anúncio',
 'END:VALARM','BEGIN:VALARM','ACTION:DISPLAY','TRIGGER:-PT0M',
 'DESCRIPTION:Publicar manualmente o Pin','END:VALARM','END:VEVENT','END:VCALENDAR',''
 ].join('\r\n');
}
