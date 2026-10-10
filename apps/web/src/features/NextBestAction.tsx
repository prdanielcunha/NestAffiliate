import { NavLink } from 'react-router-dom';
import { publicationScheduleStatus, type Campaign, type PublicationSchedule } from '@nestaffiliate/core';
import { useI18n } from '../lib/i18n-context';
import { deriveDailyAgentHealth, type DailyAgentReport } from '../services/dailyAgentRepository';

export function NextBestAction({campaigns,schedules,agentReport}:{
  campaigns:Campaign[];
  schedules:PublicationSchedule[];
  agentReport:DailyAgentReport|null;
}) {
  const {t,locale}=useI18n();
  const blocked=campaigns.find((campaign)=>campaign.status==='BLOCKED');
  const ready=campaigns.filter((campaign)=>campaign.status==='READY')
    .sort((a,b)=>b.score.score-a.score.score)[0];
  const due=schedules.find((schedule)=>publicationScheduleStatus(schedule)==='DUE' &&
    campaigns.some((campaign)=>campaign.id===schedule.campaignId && campaign.status==='PUBLICATION_READY'));
  const publishable=campaigns.find((campaign)=>campaign.status==='PUBLICATION_READY');
  const health=deriveDailyAgentHealth(agentReport);
  const next=blocked
    ? {key:'todayResolveBlock' as const,detail:'todayBlockReason' as const,to:`/review/${blocked.id}`,campaign:blocked}
    : ready
      ? {key:'todayReviewBest' as const,detail:'todayReadyReason' as const,to:`/review/${ready.id}`,campaign:ready}
      : due
        ? {key:'todayPublishNext' as const,detail:'todayDueReason' as const,to:`/publish/${due.campaignId}`,campaign:campaigns.find((item)=>item.id===due.campaignId)}
        : publishable
          ? {key:'todayPublishNext' as const,detail:'todayApprovedReason' as const,to:`/publish/${publishable.id}`,campaign:publishable}
          : {key:'todayDiscover' as const,detail:'todayEmptyReason' as const,to:'/radar',campaign:undefined};
  const lastRun=agentReport?.completedAt && Number.isFinite(Date.parse(agentReport.completedAt))
    ? new Date(agentReport.completedAt).toLocaleString(locale)
    : t('todayUnknown');
  return <section className="next-action-panel" aria-label={t('todayNextAction')}>
    <div className="next-action-heading">
      <span className="eyebrow">{t('todayNextAction')}</span>
      <span className="next-action-status">{t('todayAgentState')}: {t(health.status==='HEALTHY' ? 'agentHealthy' : health.status==='DEGRADED' ? 'agentDegraded' : health.status==='STALE' ? 'agentStale' : 'agentUnknown')}</span>
    </div>
    <h2>{next.campaign?.currentVersion.product.title.value ?? t('todayNoCampaign')}</h2>
    <p>{t(next.detail)}</p>
    {next.campaign ? <details className="next-action-evidence">
      <summary>{t('todayWhy')}</summary>
      <p>{next.campaign.score.reasons[0] || t('todayDataPending')}</p>
      <p>{t('confidence')}: {t(next.campaign.score.confidence)}</p>
      {next.campaign.currentVersion.product.commissionRate
        ? <p>{t('todayCommissionFromProvider')}</p>
        : <p>{t('todayCommissionUnknown')}</p>}
    </details> : null}
    <div className="next-action-footer">
      <NavLink className="button primary" to={next.to}>{t(next.key)} →</NavLink>
      {next.to!=='/radar' && <NavLink className="button secondary" to="/radar">{t('findOpportunities')}</NavLink>}
    </div>
    <details className="next-action-more"><summary>{locale==='pt-BR'?'Ver status e detalhes da automação':locale==='es'?'Ver estado y detalles':'View automation status and details'}</summary>
    <div className="next-action-telemetry">
      <span>{t('todayLastAgent')}: {lastRun}</span>
      <span>{t('todayReadyCount',{n:campaigns.filter((item)=>item.status==='READY').length})}</span>
      <span>{t('todayPublishCount',{n:campaigns.filter((item)=>item.status==='PUBLICATION_READY').length})}</span>
    </div>
    </details>
  </section>;
}
