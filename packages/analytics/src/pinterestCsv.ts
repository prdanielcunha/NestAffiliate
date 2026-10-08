import type {PerformanceDaily} from './index';

/** Authorized CSV export in the NestAffiliate standard column format.
 * Financial metrics are explicitly unavailable here, not observed zero sales.
 */
export interface PinterestMetricsPreview {
 rows:PerformanceDaily[];unknownSales:number;period:{from:string;to:string};
}
function parseCells(line:string):string[]{
 const out:string[]=[];let token='';let inside=false;
 for(let i=0;i<line.length;i++){const c=line[i]!;
  if(c==='"'){if(inside&&line[i+1]==='"'){token+='"';i++;}else inside=!inside;}
  else if(c===','&&!inside){out.push(token.trim());token='';}
  else token+=c;
 }
 if(inside)throw new Error('PINTEREST_CSV_QUOTE_INVALID');
 out.push(token.trim());return out;
}
function int(value:string,label:string):number{
 if(!/^\d+$/.test(value))throw new Error('PINTEREST_METRIC_INVALID_'+label);
 const n=Number(value);
 if(!Number.isSafeInteger(n)||n>1e9)throw new Error('PINTEREST_METRIC_INVALID_'+label);
 return n;
}
export function parsePinterestMetricsCSV(input:{
 csv:string;organizationId:string;publishedCampaignIds:string[];now?:Date;
}):PinterestMetricsPreview{
 const lines=input.csv.replace(/^\uFEFF/,'').split(/\r?\n/).filter(x=>x.trim());
 if(lines.length<2||lines.length>201)throw new Error('PINTEREST_CSV_LIMIT');
 const columns=parseCells(lines[0]!).map(x=>x.toLowerCase());
 const required=['date','campaignid','impressions','pinclicks','outboundclicks','saves'];
 if(!required.every(x=>columns.includes(x)) || new Set(columns).size!==columns.length)throw new Error('PINTEREST_CSV_HEADERS');
 const now=input.now??new Date();
 const allowed=new Set(input.publishedCampaignIds),seen=new Set<string>(),rows:PerformanceDaily[]=[];
 for(const line of lines.slice(1)){
  const cells=parseCells(line);
  if(cells.length!==columns.length)throw new Error('PINTEREST_CSV_COLUMNS');
  const raw=Object.fromEntries(columns.map((name,i)=>[name,cells[i]??'']));
  const id=raw.campaignid!;
  if(!allowed.has(id))throw new Error('PINTEREST_CAMPAIGN_NOT_PUBLISHED_OR_NOT_OWNED');
  const date=raw.date!;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date||Date.parse(date+'T00:00:00Z')>now.getTime())throw new Error('PINTEREST_CSV_DATE');
  const key=id+':'+date;
  if(seen.has(key))throw new Error('PINTEREST_CSV_DUPLICATE_DAY');
  seen.add(key);
  const impressions=int(raw.impressions!,'impressions');
  const pinClicks=int(raw.pinclicks!,'pinClicks');
  const outboundClicks=int(raw.outboundclicks!,'outboundClicks');
  const saves=int(raw.saves!,'saves');
  const engagements=raw.engagements?int(raw.engagements,'engagements'):0;
  rows.push({
   id:key+':pinterest-csv',organizationId:input.organizationId,campaignId:id,date,
   impressions,pinClicks,outboundClicks,saves,engagements,
   sales:0,revenue:0,commission:0,source:'PINTEREST_CSV',
   salesKnown:false,observedAt:now.toISOString(),
  });
 }
 const dates=rows.map(r=>r.date).sort();
 return {rows,unknownSales:rows.length,period:{from:dates[0]!,to:dates[dates.length-1]!}};
}
