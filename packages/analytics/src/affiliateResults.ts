export type AffiliateResultStatus='PENDING'|'APPROVED'|'REVERSED';
export type AffiliateResultMarketplace='MELI'|'SHOPEE';
export type AffiliateResultChannel='PINTEREST'|'FACEBOOK_REELS'|'UNKNOWN';
export interface AffiliateResult {
  id:string;
  organizationId:string;
  marketplace:AffiliateResultMarketplace;
  transactionId:string;
  status:AffiliateResultStatus;
  commission:number;
  currency:'BRL';
  observedAt:string;
  importedAt:string;
  statementId:string;
  source:'MANUAL_OFFICIAL_EXPORT';
  campaignId?:string;
  trackingCode?:string;
  channel:AffiliateResultChannel;
  attribution:'EXACT'|'UNKNOWN';
}
export interface AffiliateResultSummary {
  approved:number;pending:number;reversed:number;unknownAttribution:number;transactions:number;
}
function csvFields(line:string):string[] {
  const fields:string[]=[];let out='';let quoted=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i]!;
    if(ch==='"'){
      if(quoted&&line[i+1]==='"'){out+='"';i++;}else quoted=!quoted;
    }else if(ch===','&&!quoted){fields.push(out.trim());out='';}
    else out+=ch;
  }
  if(quoted)throw new Error('CSV_QUOTE_UNCLOSED');
  fields.push(out.trim());return fields;
}
function money(value:string){
  const text=value.replace(/R\$|\s/g,'');
  if(!text || !/^-?\d+(?:[.,]\d{1,2})?$/.test(text))throw new Error('COMMISSION_INVALID');
  const n=Number(text.replace(',','.'));
  if(!Number.isFinite(n)||n<0)throw new Error('COMMISSION_INVALID');
  return Math.round((n+Number.EPSILON)*100)/100;
}
const allowedStatus=new Set(['PENDING','APPROVED','REVERSED']);
const allowedMarket=new Set(['MELI','SHOPEE']);
export function parseAffiliateStatement(input:{
  csv:string;organizationId:string;statementId:string;
  knownCampaigns:{id:string;trackingCode?:string}[];
  now?:Date;
}):AffiliateResult[] {
  const lines=input.csv.replace(/^\uFEFF/,'').split(/\r?\n/).filter((s)=>s.trim());
  if(lines.length<2 || lines.length>1001)throw new Error('CSV_ROW_LIMIT_OR_EMPTY');
  const columns=csvFields(lines[0]!).map((s)=>s.toLowerCase());
  const required=['marketplace','transactionid','status','commission','observedat'];
  if(!required.every((name)=>columns.includes(name)))throw new Error('CSV_REQUIRED_COLUMNS');
  if(!/^[a-zA-Z0-9_.-]{2,80}$/.test(input.statementId))throw new Error('STATEMENT_ID_INVALID');
  const now=input.now ?? new Date();
  const existing=new Set<string>();
  return lines.slice(1).map((line)=>{
    const values=csvFields(line);
    if(values.length!==columns.length)throw new Error('CSV_COLUMN_COUNT');
    const raw=Object.fromEntries(columns.map((name,index)=>[name,values[index]??'']));
    const market=raw.marketplace!.toUpperCase();
    const status=raw.status!.toUpperCase();
    if(!allowedMarket.has(market)||!allowedStatus.has(status))throw new Error('CSV_PROVIDER_OR_STATUS');
    const transactionId=raw.transactionid!.trim();
    if(!/^[a-zA-Z0-9_.:-]{1,96}$/.test(transactionId))throw new Error('TRANSACTION_ID_INVALID');
    const observedAt=raw.observedat!;
    if(!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(observedAt)||!Number.isFinite(Date.parse(observedAt)))throw new Error('DATE_INVALID');
    if(raw.currency && raw.currency.toUpperCase()!=='BRL')throw new Error('CURRENCY_UNSUPPORTED');
    const claimedCampaign=raw.campaignid?.trim()??'';
    const trackingCode=raw.trackingcode?.trim()??'';
    const campaignById=input.knownCampaigns.find((campaign)=>campaign.id===claimedCampaign);
    const campaignByTracking=trackingCode && input.knownCampaigns.find((campaign)=>campaign.trackingCode===trackingCode);
    if(claimedCampaign && !campaignById)throw new Error('CAMPAIGN_OUTSIDE_ORGANIZATION');
    if(campaignById && trackingCode && campaignById.trackingCode!==trackingCode)throw new Error('ATTRIBUTION_CONFLICT');
    const matched=campaignById ?? campaignByTracking;
    const channel=raw.channel?.toUpperCase()??'UNKNOWN';
    if(!['PINTEREST','FACEBOOK_REELS','UNKNOWN',''].includes(channel))throw new Error('CHANNEL_INVALID');
    const id=`${market}:${transactionId}`;
    if(existing.has(id))throw new Error('DUPLICATE_TRANSACTION_IN_STATEMENT');
    existing.add(id);
    return {
      id,organizationId:input.organizationId,marketplace:market as AffiliateResultMarketplace,
      transactionId,status:status as AffiliateResultStatus,
      commission:money(raw.commission!),currency:'BRL' as const,
      observedAt,importedAt:now.toISOString(),statementId:input.statementId,
      source:'MANUAL_OFFICIAL_EXPORT' as const,
      ...(matched ? {campaignId:matched.id} : {}),
      ...(trackingCode ? {trackingCode} : {}),
      channel:(channel||'UNKNOWN') as AffiliateResultChannel,
      attribution:matched?'EXACT' as const:'UNKNOWN' as const,
    };
  });
}
export function summarizeAffiliateResults(input:AffiliateResult[]):AffiliateResultSummary {
  const distinct=new Map(input.map((row)=>[row.id,row]));
  const result:AffiliateResultSummary={approved:0,pending:0,reversed:0,unknownAttribution:0,transactions:distinct.size};
  for(const row of distinct.values()){
    if(row.status==='APPROVED')result.approved+=row.commission;
    if(row.status==='PENDING')result.pending+=row.commission;
    if(row.status==='REVERSED')result.reversed+=row.commission;
    if(row.attribution==='UNKNOWN')result.unknownAttribution+=1;
  }
  result.approved=Number(result.approved.toFixed(2));
  result.pending=Number(result.pending.toFixed(2));
  result.reversed=Number(result.reversed.toFixed(2));
  return result;
}
