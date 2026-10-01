import { POLICY_BASELINES, policyWatchSummary, policyWatchStatus } from '@nestaffiliate/compliance';
import { useI18n } from '../lib/i18n-context';

function labels(locale:string){
  if(locale==='en') return {
    eyebrow:'POLICY WATCH',
    title:'Policies are part of the product.',
    sub:'Versioned official references. When a review date expires, the app surfaces the risk instead of silently assuming the old rule is still valid.',
    current:'Current',
    soon:'Review soon',
    due:'Review due',
    reviewed:'Reviewed',
    next:'Next review',
    impact:'Impact',
    open:'Open official source',
    warning:'One or more policies need a fresh review before changing publishing/compliance behavior.',
  };
  if(locale==='es') return {
    eyebrow:'POLICY WATCH',
    title:'Las políticas son parte del producto.',
    sub:'Referencias oficiales versionadas. Cuando vence una revisión, la app muestra el riesgo en lugar de asumir silenciosamente que la regla sigue igual.',
    current:'Actual',
    soon:'Revisar pronto',
    due:'Revisión vencida',
    reviewed:'Revisado',
    next:'Próxima revisión',
    impact:'Impacto',
    open:'Abrir fuente oficial',
    warning:'Una o más políticas necesitan revisión fresca antes de cambiar publicación/compliance.',
  };
  return {
    eyebrow:'POLICY WATCH',
    title:'Políticas fazem parte do produto.',
    sub:'Referências oficiais versionadas. Quando uma revisão vence, o app expõe o risco em vez de assumir silenciosamente que a regra antiga continua válida.',
    current:'Atual',
    soon:'Revisar em breve',
    due:'Revisão vencida',
    reviewed:'Revisado',
    next:'Próxima revisão',
    impact:'Impacto',
    open:'Abrir fonte oficial',
    warning:'Uma ou mais políticas precisam de revisão fresca antes de mudar comportamento de publicação/compliance.',
  };
}

export function PolicyWatchPanel(){
  const { locale }=useI18n();
  const copy=labels(locale);
  const summary=policyWatchSummary();

  return <section className="policy-watch">
    <div className="policy-watch-head">
      <div>
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2>{copy.title}</h2>
        <p>{copy.sub}</p>
      </div>
      <div className="policy-summary">
        <span><b>{summary.current}</b>{copy.current}</span>
        <span><b>{summary.reviewSoon}</b>{copy.soon}</span>
        <span><b>{summary.reviewDue}</b>{copy.due}</span>
      </div>
    </div>
    {summary.reviewDue>0 && <div className="notice danger">{copy.warning}</div>}
    <div className="policy-grid">
      {POLICY_BASELINES.map((policy)=>{
        const status=policyWatchStatus(policy);
        const statusText=status==='CURRENT' ? copy.current : status==='REVIEW_SOON' ? copy.soon : copy.due;
        return <article className="policy-card" key={policy.id}>
          <div className="policy-card-head">
            <div>
              <span className="market-chip">{policy.provider}</span>
              <h3>{policy.title}</h3>
            </div>
            <span className={`policy-status ${status.toLowerCase()}`}>{statusText}</span>
          </div>
          <p>{policy.summary}</p>
          <div className="policy-impact"><b>{copy.impact}</b>{policy.impact.map((item)=><span key={item}>{item}</span>)}</div>
          <div className="policy-dates">
            <span>{copy.reviewed}: {new Date(policy.reviewedAt).toLocaleDateString(locale)}</span>
            <span>{copy.next}: {new Date(policy.reviewAfter).toLocaleDateString(locale)}</span>
          </div>
          {policy.sourceUrl && <a className="text-button policy-link" href={policy.sourceUrl} target="_blank" rel="noreferrer">{copy.open} ↗</a>}
        </article>;
      })}
    </div>
  </section>;
}
