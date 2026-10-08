import type { OpportunityV4Assessment } from '@nestaffiliate/radar';
import { useI18n } from '../lib/i18n-context';
const fix:Record<string,string>={
 LISTING_UNRESOLVED:'Conferir anúncio e variante reais',
 WRONG_VARIANT:'Confirmar variante do produto',
 PRICE_STALE:'Atualizar oferta / disponibilidade',
 AFFILIATE_LINK_MISSING:'Adicionar link afiliado válido',
 AFFILIATE_CHANNEL_NOT_VERIFIED:'Confirmar elegibilidade do afiliado',
 REFERENCE_MISSING:'Anexar foto própria ou licenciada',
 ASSET_RIGHTS_UNKNOWN:'Documentar direito de uso da imagem',
 VISUAL_MISMATCH:'Comparar forma, cor, escala e peças',
 APPROVAL_REQUIRED:'Revisão e aprovação humanas',
 UNSAFE_DESTINATION:'Corrigir URL insegura',
};
const status:Record<OpportunityV4Assessment['status'],string>={
 READY_NOW:'Pronta para preparar',NEAR_READY:'Quase pronta',PROMISING:'Vale investigar',
 SOURCE_LIMITED:'Dados da fonte indisponíveis',UNDER_REVIEW:'Em revisão',
 REJECTED:'Não elegível',EXPIRED:'Oferta expirada',
};
export function OpportunityV4Panel({assessment}:{assessment:OpportunityV4Assessment}){
  const {locale}=useI18n();
  const en=locale==='en',es=locale==='es';
  const missing=assessment.readiness.blockers.filter(x=>x!=='APPROVAL_REQUIRED');
  return <section className="opportunity-v4-panel" aria-label="Score 4.0">
    <div className="v4-score-row">
      <div><small>{en?'Potential':es?'Potencial':'Potencial editorial'}</small><strong>{assessment.potential.lower}–{assessment.potential.upper}</strong><span>{en?'Provisional range':es?'Rango provisional':'Faixa provisória'}</span></div>
      <div><small>{en?'Readiness':es?'Preparación':'Prontidão'}</small><strong>{assessment.readiness.score}<i>/100</i></strong><span>{en?'Mandatory gates':es?'Requisitos obligatorios':'Regras independentes'}</span></div>
      <div><small>{en?'Confidence':es?'Confianza':'Confiança dos dados'}</small><strong className="v4-confidence">{assessment.confidence}</strong><span>{status[assessment.status]}</span></div>
    </div>
    <div className="v4-next-step"><strong>{en?'Next step':es?'Próxima acción':'Próxima ação'}:</strong> {missing.length?fix[missing[0]!]??missing[0]:en?'Prepare for human review':'Preparar revisão humana'}</div>
    <details><summary>{en?'Evidence and missing fields':es?'Evidencia y pendientes':'Ver provas e lacunas'}</summary>
      <p>{en?'Evidence/hypotheses':'Evidências/hipóteses'}: {assessment.sourceCoverage.observed.join(' · ')||'—'}</p>
      <p>{en?'Unknown':'Desconhecido'}: {assessment.sourceCoverage.unknown.join(' · ')||'—'}</p>
      <ul>{assessment.readiness.blockers.map(code=><li key={code}>{fix[code]??code}</li>)}</ul>
      <p>{en?'Ranking estimate, not sales probability.':'Índice relativo, não chance de venda nem previsão de receita.'}</p>
    </details>
  </section>;
}
