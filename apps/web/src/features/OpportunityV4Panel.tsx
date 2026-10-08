import type { OpportunityV4Assessment } from '@nestaffiliate/radar';
import { useI18n } from '../lib/i18n-context';
const fix:Record<string,[string,string,string]>={
 LISTING_UNRESOLVED: [
  "Conferir anúncio e variante reais",
  "Verify exact listing and variant",
  "Verificar anuncio y variante reales"
 ],
 WRONG_VARIANT: [
  "Confirmar variante do produto",
  "Confirm product variant",
  "Confirmar variante del producto"
 ],
 PRICE_STALE: [
  "Atualizar oferta / disponibilidade",
  "Refresh offer and availability",
  "Actualizar oferta y disponibilidad"
 ],
 AFFILIATE_LINK_MISSING: [
  "Adicionar link afiliado válido",
  "Add a valid affiliate link",
  "Añadir enlace de afiliado válido"
 ],
 AFFILIATE_CHANNEL_NOT_VERIFIED: [
  "Confirmar elegibilidade do afiliado",
  "Confirm affiliate channel eligibility",
  "Confirmar elegibilidad de afiliado"
 ],
 REFERENCE_MISSING: [
  "Anexar foto própria ou licenciada",
  "Attach an owned or licensed photo",
  "Adjuntar foto propia o licenciada"
 ],
 ASSET_RIGHTS_UNKNOWN: [
  "Documentar direito de uso da imagem",
  "Document image usage rights",
  "Documentar derechos de imagen"
 ],
 VISUAL_MISMATCH: [
  "Comparar forma, cor, escala e peças",
  "Compare shape, color, scale and parts",
  "Comparar forma, color, escala y piezas"
 ],
 APPROVAL_REQUIRED: [
  "Revisão e aprovação humanas",
  "Human review and approval",
  "Revisión y aprobación humana"
 ],
 UNSAFE_DESTINATION: [
  "Corrigir URL insegura",
  "Fix unsafe destination URL",
  "Corregir URL insegura"
 ]
};
const status:Record<OpportunityV4Assessment['status'],[string,string,string]>={
 READY_NOW: [
  "Pronta para preparar",
  "Ready for preparation",
  "Lista para preparar"
 ],
 NEAR_READY: [
  "Quase pronta",
  "Nearly ready",
  "Casi lista"
 ],
 PROMISING: [
  "Vale investigar",
  "Worth investigating",
  "Vale investigar"
 ],
 SOURCE_LIMITED: [
  "Dados da fonte indisponíveis",
  "Source data limited",
  "Datos de origen limitados"
 ],
 UNDER_REVIEW: [
  "Em revisão",
  "Under review",
  "En revisión"
 ],
 REJECTED: [
  "Não elegível",
  "Not eligible",
  "No elegible"
 ],
 EXPIRED: [
  "Oferta expirada",
  "Expired offer",
  "Oferta caducada"
 ]
};
export function OpportunityV4Panel({assessment}:{assessment:OpportunityV4Assessment}){
  const {locale}=useI18n();
  const en=locale==='en',es=locale==='es';
  const lang=en?1:es?2:0;
  const missing=assessment.readiness.blockers.filter(x=>x!=='APPROVAL_REQUIRED');
  return <section className="opportunity-v4-panel" aria-label="Score 4.0">
    <div className="v4-score-row">
      <div><small>{en?'Editorial potential':es?'Potencial editorial':'Potencial editorial'}</small><strong>{assessment.potential.lower}–{assessment.potential.upper}</strong><span>{en?'Provisional range':es?'Rango provisional':'Faixa provisória'}</span></div>
      <div><small>{en?'Readiness':es?'Preparación':'Prontidão'}</small><strong>{assessment.readiness.score}<i>/100</i></strong><span>{en?'Mandatory gates':es?'Requisitos obligatorios':'Regras independentes'}</span></div>
      <div><small>{en?'Confidence':es?'Confianza':'Confiança dos dados'}</small><strong className="v4-confidence">{assessment.confidence}</strong><span>{status[assessment.status][lang]}</span></div>
    </div>
    <div className="v4-next-step"><strong>{en?'Next step':es?'Próxima acción':'Próxima ação'}:</strong> {missing.length?fix[missing[0]!]?.[lang]??missing[0]:en?'Prepare for human review':es?'Preparar revisión humana':'Preparar revisão humana'}</div>
    <details><summary>{en?'Evidence and missing fields':es?'Evidencia y pendientes':'Ver provas e lacunas'}</summary>
      <p>{en?'Evidence/hypotheses':es?'Evidencias/hipótesis':'Evidências/hipóteses'}: {assessment.sourceCoverage.observed.join(' · ')||'—'}</p>
      <p>{en?'Unknown':es?'Desconocido':'Desconhecido'}: {assessment.sourceCoverage.unknown.join(' · ')||'—'}</p>
      <ul>{assessment.readiness.blockers.map(code=><li key={code}>{fix[code]?.[lang]??code}</li>)}</ul>
      <p>{en?'Ranking aid, not sales probability.':es?'Índice de prioridad, no probabilidad de venta.':'Índice relativo, não chance de venda nem previsão de receita.'}</p>
    </details>
  </section>;
}
