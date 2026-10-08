import type { ApprovalEvent, Campaign } from '@nestaffiliate/core';
import type { PerformanceDaily } from '@nestaffiliate/analytics';
import { summarizePerformance } from '@nestaffiliate/analytics';

export type LearningConfidence = 'insufficient' | 'emerging' | 'established';

export interface LearningInsight {
  id:string;
  type:'CREATIVE_DNA'|'CREATIVE_SCENE'|'PRODUCT_DNA'|'AUDIENCE_DNA'|'PREFERENCE';
  confidence:LearningConfidence;
  title:string;
  explanation:string;
  evidenceCount:number;
  recommendation?:string;
  scoreAdjustment?:number;
  dimensions?:Record<string,string|number|boolean|null>;
}

function confidence(count:number): LearningConfidence {
  if (count < 5) return 'insufficient';
  if (count < 12) return 'emerging';
  return 'established';
}

function normalize(value:string){
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function productTheme(campaign:Campaign){
  const text=normalize(`${campaign.currentVersion.keyword} ${campaign.currentVersion.product.title.value}`);
  const rules:Array<[string,RegExp]> = [
    ['cozinha',/cozinha|panela|pote|talher|dispens|organizador|tempero/],
    ['banheiro',/banheiro|toalha|sabon|escova|chuveiro/],
    ['quarto',/quarto|cama|travesseiro|roupa|cabide|sapateira/],
    ['lavanderia',/lavanderia|roupa|cesto|varal|lavar/],
    ['decoracao',/decor|luminaria|tapete|quadro|vaso/],
    ['organizacao',/organiz|prateleira|caixa|cesto|suporte|gaveta/],
  ];
  return rules.find(([,pattern])=>pattern.test(text))?.[0] ?? 'outros';
}

function performanceForCampaign(campaignId:string, metrics:PerformanceDaily[]){
  return summarizePerformance(metrics.filter((row)=>row.campaignId===campaignId));
}

function weightedSignal(rows:PerformanceDaily[]){
  const summary=summarizePerformance(rows);
  const clickSignal=Math.min(1, summary.ctr / 0.03);
  const saveSignal=Math.min(1, summary.saveRate / 0.02);
  const conversionSignal=Math.min(1, summary.conversionRate / 0.08);
  const revenueSignal=summary.epm === null ? 0 : Math.min(1, summary.epm / 80);
  return (clickSignal*0.30)+(saveSignal*0.20)+(conversionSignal*0.25)+(revenueSignal*0.25);
}

export function historicalScoreAdjustment(
  campaigns:Campaign[],
  metrics:PerformanceDaily[],
  candidate:{template?:string;boardName?:string;productTheme?:string},
){
  const relevant=campaigns.filter((campaign)=>{
    if(campaign.status!=='PUBLISHED') return false;
    const templateMatch=!candidate.template || campaign.currentVersion.template===candidate.template;
    const boardMatch=!candidate.boardName || campaign.currentVersion.boardName===candidate.boardName;
    const themeMatch=!candidate.productTheme || productTheme(campaign)===candidate.productTheme;
    return templateMatch && boardMatch && themeMatch;
  });
  if(relevant.length<12) {
    return {
      confidence:confidence(relevant.length),
      evidenceCount:relevant.length,
      adjustment:0,
      reason:'Amostra insuficiente para alterar o NestScore.',
    };
  }
  const ids=new Set(relevant.map((campaign)=>campaign.id));
  const rows=metrics.filter((row)=>ids.has(row.campaignId));
  const signal=weightedSignal(rows);
  const adjustment=Math.max(-6,Math.min(6,Math.round((signal-0.5)*12)));
  return {
    confidence:'established' as const,
    evidenceCount:relevant.length,
    adjustment,
    reason:adjustment===0
      ? 'Histórico consistente, sem evidência forte para alterar o score.'
      : `Ajuste histórico de ${adjustment>0?'+':''}${adjustment} pontos baseado em performance repetida.`,
  };
}

export function deriveLearning(campaigns: Campaign[], metrics: PerformanceDaily[], approvalEvents: ApprovalEvent[] = []): LearningInsight[] {
  const published=campaigns.filter((c)=>c.status==='PUBLISHED');
  const insights:LearningInsight[]=[];

  const byTemplate=new Map<string,{campaignIds:Set<string>;rows:PerformanceDaily[]}>();
  const byTheme=new Map<string,{campaignIds:Set<string>;rows:PerformanceDaily[]}>();
  const byBoard=new Map<string,{campaignIds:Set<string>;rows:PerformanceDaily[]}>();

  for (const campaign of published) {
    const campaignRows=metrics.filter((row)=>row.campaignId===campaign.id);

    const templateKey=campaign.currentVersion.template;
    const templateBucket=byTemplate.get(templateKey) ?? {campaignIds:new Set(),rows:[]};
    templateBucket.campaignIds.add(campaign.id);
    templateBucket.rows.push(...campaignRows);
    byTemplate.set(templateKey,templateBucket);

    const themeKey=productTheme(campaign);
    const themeBucket=byTheme.get(themeKey) ?? {campaignIds:new Set(),rows:[]};
    themeBucket.campaignIds.add(campaign.id);
    themeBucket.rows.push(...campaignRows);
    byTheme.set(themeKey,themeBucket);

    const boardKey=campaign.currentVersion.boardName;
    const boardBucket=byBoard.get(boardKey) ?? {campaignIds:new Set(),rows:[]};
    boardBucket.campaignIds.add(campaign.id);
    boardBucket.rows.push(...campaignRows);
    byBoard.set(boardKey,boardBucket);
  }

  for (const [template,bucket] of byTemplate) {
    const count=bucket.campaignIds.size;
    const summary=summarizePerformance(bucket.rows);
    const level=confidence(count);
    const adjustment=historicalScoreAdjustment(campaigns,metrics,{template});
    insights.push({
      id:`creative:${template}`,
      type:'CREATIVE_DNA',
      confidence:level,
      title:`${template}: ${level === 'insufficient' ? 'ainda sem amostra suficiente' : 'padrão em formação'}`,
      explanation: level === 'insufficient'
        ? `Só existem ${count} campanhas publicadas com este template. O sistema não transforma isso em regra ainda.`
        : `Com ${count} campanhas, o template registra CTR de ${(summary.ctr*100).toFixed(2)}% e save rate de ${(summary.saveRate*100).toFixed(2)}%.`,
      evidenceCount:count,
      recommendation:level === 'established' && summary.ctr > 0.02 ? 'Manter como template forte para testes controlados.' : undefined,
      scoreAdjustment:adjustment.adjustment,
      dimensions:{template,ctr:summary.ctr,saveRate:summary.saveRate},
    });
  }

  for(const [theme,bucket] of byTheme){
    const count=bucket.campaignIds.size;
    const level=confidence(count);
    const summary=summarizePerformance(bucket.rows);
    const adjustment=historicalScoreAdjustment(campaigns,metrics,{productTheme:theme});
    insights.push({
      id:`product:${theme}`,
      type:'PRODUCT_DNA',
      confidence:level,
      title:`Tema de produto: ${theme}`,
      explanation:level==='insufficient'
        ? `Há ${count} campanhas publicadas neste tema. Ainda não há base para priorizar ou rebaixar oportunidades.`
        : `O tema acumula ${count} campanhas, CTR de ${(summary.ctr*100).toFixed(2)}% e conversão de ${(summary.conversionRate*100).toFixed(2)}%.`,
      evidenceCount:count,
      recommendation:level==='established' && adjustment.adjustment>0
        ? 'Usar como sinal histórico positivo, sem substituir Product Truth nem regras de qualidade.'
        : undefined,
      scoreAdjustment:adjustment.adjustment,
      dimensions:{theme,ctr:summary.ctr,conversionRate:summary.conversionRate,epm:summary.epm},
    });
  }

  for(const [board,bucket] of byBoard){
    const count=bucket.campaignIds.size;
    const level=confidence(count);
    const summary=summarizePerformance(bucket.rows);
    insights.push({
      id:`audience:${board}`,
      type:'AUDIENCE_DNA',
      confidence:level,
      title:`Audiência do board: ${board}`,
      explanation:level==='insufficient'
        ? `Só há ${count} campanhas publicadas neste board. O NestAffiliate ainda não presume preferência da audiência.`
        : `O board reúne ${count} campanhas, save rate de ${(summary.saveRate*100).toFixed(2)}% e EPM de ${summary.epm===null?'—':summary.epm.toFixed(2)}.`,
      evidenceCount:count,
      recommendation:level==='established' && summary.saveRate>0.02
        ? 'Continuar testando temas próximos neste board com variação controlada.'
        : undefined,
      dimensions:{board,saveRate:summary.saveRate,epm:summary.epm},
    });
  }


  const byVisualSignature=new Map<string,{campaignIds:Set<string>;rows:PerformanceDaily[];dimensions:Record<string,string>}>();
  for(const campaign of published){
    const pack=campaign.currentVersion.creativePack;
    if(!pack) continue;
    const concept=pack.imageConcepts.find((item)=>item.id===pack.recommendedConceptId) ?? pack.imageConcepts[0];
    if(!concept) continue;
    const headlineStyle=campaign.currentVersion.narrative.headline.length<=42 ? 'short' : campaign.currentVersion.narrative.headline.length<=72 ? 'medium' : 'long';
    const visualDensity=pack.creativeDirection.composition.toLowerCase().includes('close') ? 'focused' : 'contextual';
    const backgroundStrategy=campaign.currentVersion.creativeAsset ? 'generated-context' : 'template-or-source';
    const dimensions={
      sceneType:pack.creativeDirection.sceneType,
      environment:pack.creativeDirection.roomOrEnvironment,
      creativeAngle:concept.angle,
      headlineStyle,
      visualDensity,
      backgroundStrategy,
    };
    const key=Object.values(dimensions).join('|');
    const bucket=byVisualSignature.get(key) ?? {campaignIds:new Set<string>(),rows:[] as PerformanceDaily[],dimensions};
    bucket.campaignIds.add(campaign.id);
    bucket.rows.push(...metrics.filter((row)=>row.campaignId===campaign.id));
    byVisualSignature.set(key,bucket);
  }

  for(const [signature,bucket] of byVisualSignature){
    const count=bucket.campaignIds.size;
    const level=confidence(count);
    const summary=summarizePerformance(bucket.rows);
    insights.push({
      id:'creative-context:'+normalize(signature).replace(/\s+/g,':').slice(0,120),
      type:'CREATIVE_DNA',
      confidence:level,
      title:'Contexto visual: '+bucket.dimensions.creativeAngle+' · '+bucket.dimensions.sceneType,
      explanation:level==='insufficient'
        ? `Há ${count} campanhas publicadas com esta combinação visual. O sistema registra, mas ainda não muda o comportamento.`
        : `A combinação reúne ${count} campanhas, CTR de ${(summary.ctr*100).toFixed(2)}% e save rate de ${(summary.saveRate*100).toFixed(2)}%.`,
      evidenceCount:count,
      recommendation:level==='established' && (summary.ctr>0.02 || summary.saveRate>0.02)
        ? 'Usar esta combinação como hipótese forte em novos testes, sem transformar correlação em regra absoluta.'
        : undefined,
      dimensions:{
        ...bucket.dimensions,
        ctr:summary.ctr,
        saveRate:summary.saveRate,
        conversionRate:summary.conversionRate,
        epm:summary.epm,
      },
    });
  }


  const byCreativePack=new Map<string,{campaignIds:Set<string>;rows:PerformanceDaily[];dimensions:Record<string,string|number|boolean|null>}>();
  for(const campaign of published){
    const pack=campaign.currentVersion.creativePack;
    if(!pack) continue;
    const selected=pack.imageConcepts.find((item)=>item.id===pack.recommendedConceptId) ?? pack.imageConcepts[0];
    if(!selected) continue;
    const key=[
      selected.sceneProfile.sceneType,
      selected.sceneProfile.environment,
      selected.sceneProfile.style,
      selected.sceneProfile.lighting,
      selected.sceneProfile.composition,
      selected.angle,
      pack.promptTemplateVersion,
      campaign.currentVersion.template,
      pack.copy.primaryKeyword,
      campaign.currentVersion.boardName,
    ].join('::');
    const bucket=byCreativePack.get(key) ?? {
      campaignIds:new Set<string>(),
      rows:[],
      dimensions:{
        sceneType:selected.sceneProfile.sceneType,
        environment:selected.sceneProfile.environment,
        visualStyle:selected.sceneProfile.style,
        lighting:selected.sceneProfile.lighting,
        composition:selected.sceneProfile.composition,
        angle:selected.angle,
        promptVersion:pack.promptTemplateVersion,
        template:campaign.currentVersion.template,
        keywordCluster:pack.copy.primaryKeyword,
        board:campaign.currentVersion.boardName,
        lastConceptId:selected.id,
      },
    };
    bucket.campaignIds.add(campaign.id);
    bucket.rows.push(...metrics.filter((row)=>row.campaignId===campaign.id));
    bucket.dimensions.lastConceptId=selected.id;
    byCreativePack.set(key,bucket);
  }

  for(const [key,bucket] of byCreativePack){
    const count=bucket.campaignIds.size;
    const level=confidence(count);
    const summary=summarizePerformance(bucket.rows);
    insights.push({
      id:'creative-scene:'+normalize(key).slice(0,120).replace(/\s+/g,'-'),
      type:'CREATIVE_SCENE',
      confidence:level,
      title:'Creative Pack: '+String(bucket.dimensions.angle ?? 'scene'),
      explanation:level==='insufficient'
        ? 'Há '+count+' campanhas comparáveis. O NestAffiliate registra o sinal, mas não prioriza esta direção ainda.'
        : 'Com '+count+' campanhas comparáveis, esta combinação registra CTR de '+(summary.ctr*100).toFixed(2)+'%, save rate de '+(summary.saveRate*100).toFixed(2)+'%, conversão de '+(summary.conversionRate*100).toFixed(2)+'% e EPM '+(summary.epm===null?'—':summary.epm.toFixed(2))+'.',
      evidenceCount:count,
      recommendation:level==='established'
        ? 'Usar como sinal criativo explicável em novos rankings, mantendo Product Truth e diversidade editorial.'
        : undefined,
      dimensions:{
        ...bucket.dimensions,
        ctr:summary.ctr,
        saveRate:summary.saveRate,
        outboundClicks:summary.outboundClicks,
        conversionRate:summary.conversionRate,
        revenue:summary.revenue,
        epm:summary.epm,
      },
    });
  }

  const fallbackApprovals=campaigns.filter((c)=>['PUBLICATION_READY','PUBLISHED'].includes(c.status)).length;
  const fallbackRejections=campaigns.filter((c)=>['REJECTED','BLOCKED'].includes(c.status)).length;
  const approvals=approvalEvents.length
    ? approvalEvents.filter((event)=>event.decision==='APPROVED').length
    : fallbackApprovals;
  const rejections=approvalEvents.length
    ? approvalEvents.filter((event)=>event.decision==='REJECTED').length
    : fallbackRejections;
  const edits=approvalEvents.filter((event)=>event.decision==='EDITED').length;
  const swaps=approvalEvents.filter((event)=>event.decision==='SWAPPED').length;
  const regenerations=approvalEvents.filter((event)=>event.decision==='REGENERATED').length;
  const preferredVariants=approvalEvents.filter((event)=>event.decision==='PREFERRED_VARIANT').length;
  const restores=approvalEvents.filter((event)=>event.decision==='RESTORED').length;
  const decisionCount=approvalEvents.length || approvals+rejections;
  insights.push({
    id:'preference:approval',
    type:'PREFERENCE',
    confidence:confidence(decisionCount),
    title:'Preferências de decisão',
    explanation: decisionCount < 5
      ? 'Ainda há poucas decisões humanas; o NestAffiliate não vai inferir sua preferência cedo demais.'
      : `Foram observados ${decisionCount} sinais humanos: ${approvals} aprovações, ${rejections} rejeições, ${edits} edições, ${swaps} trocas, ${regenerations} regenerações e ${preferredVariants} variantes preferidas.`,
    evidenceCount:decisionCount,
    dimensions:{
      approvals,
      rejections,
      edits,
      swaps,
      regenerations,
      preferredVariants,
      restores,
      approvalRate:(approvals+rejections)?approvals/(approvals+rejections):0,
    },
  });

  if(approvalEvents.length>=5){
    const notes=approvalEvents
      .filter((event)=>event.decision==='PREFERRED_VARIANT' && event.note?.startsWith('template:'))
      .map((event)=>event.note!.slice('template:'.length).trim())
      .filter(Boolean);
    const counts=new Map<string,number>();
    for(const note of notes) counts.set(note,(counts.get(note) ?? 0)+1);
    const favorite=[...counts.entries()].sort((a,b)=>b[1]-a[1])[0];
    if(favorite && favorite[1]>=3){
      insights.push({
        id:`preference:template:${favorite[0]}`,
        type:'PREFERENCE',
        confidence:confidence(favorite[1]),
        title:`Preferência recorrente de template: ${favorite[0]}`,
        explanation:`O template foi escolhido explicitamente ${favorite[1]} vezes. O sistema registra a recorrência, mas não a transforma em padrão sem confirmação humana.`,
        evidenceCount:favorite[1],
        dimensions:{template:favorite[0],explicitSelections:favorite[1]},
      });
    }
  }

  return insights;
}

export function campaignPerformanceSummary(campaign:Campaign, metrics:PerformanceDaily[]){
  return performanceForCampaign(campaign.id,metrics);
}

export { deriveRevenueCohortObservation } from './revenueExperiments';
export type { RevenueCohortObservation } from './revenueExperiments';
