/**
 * Only return a small allowlisted diagnostic category to campaign history.
 * Never persist raw server messages, tokens, URLs or provider payloads.
 */
export type NestAiFailureCode='AUTH'|'APP_CHECK'|'OUTPUT'|'PROVIDER'|'RATE_LIMIT'|'TIMEOUT'|'NETWORK'|'UNKNOWN';
export function classifyNestAiFailure(error:unknown):NestAiFailureCode{
 const message=(error instanceof Error ? error.message:'').toUpperCase();
 if(/APP_CHECK|RECAPTCHA/.test(message))return 'APP_CHECK';
 if(/AUTH_|UNAUTHENTICATED|INVALID_TOKEN|SDK_HUB_TOKEN|NESTAI_ACCESS_DENIED|403|401/.test(message))return 'AUTH';
 if(/TIMEOUT|ABORT/.test(message))return 'TIMEOUT';
 if(/OUTPUT_SCHEMA|AI_STRATEGY_|INVALID_JSON|UNSUPPORTED_CLAIM/.test(message))return 'OUTPUT';
 if(/RATE_LIMIT|429|QUOTA|COST_GUARD/.test(message))return 'RATE_LIMIT';
 if(/ROUTER_|PROVIDER_|503|AI_DISABLED/.test(message))return 'PROVIDER';
 if(/FETCH|NETWORK|FAILED TO FETCH/.test(message))return 'NETWORK';
 return 'UNKNOWN';
}
export function nestAiFailureLabel(code:NestAiFailureCode,locale:'pt-BR'|'en'|'es'):string{
 const messages:Record<NestAiFailureCode,[string,string,string]>={
  AUTH:['Não foi possível autorizar o NestAI com sua organização.','NestAI could not authorize this organization.','NestAI no pudo autorizar la organización.'],
  APP_CHECK:['A verificação de segurança App Check bloqueou a conexão com o NestAI.','App Check security verification blocked NestAI.','App Check bloqueó el acceso a NestAI.'],
  OUTPUT:['A IA respondeu, mas o resultado não passou na validação de qualidade e dados reais.','AI responded but output failed factual/quality validation.','La IA respondió, pero su resultado no superó la validación.'],
  PROVIDER:['Nenhum modelo gratuito respondeu de maneira válida no momento.','No free model returned a valid response.','Ningún modelo gratuito respondió correctamente.'],
  RATE_LIMIT:['O serviço gratuito atingiu temporariamente o limite de uso.','Free AI rate limit was temporarily reached.','Se alcanzó el límite gratuito de IA.'],
  TIMEOUT:['A geração excedeu o tempo disponível.','Generation timed out.','La generación excedió el tiempo disponible.'],
  NETWORK:['A comunicação com o NestAI falhou.','Network connection to NestAI failed.','La conexión con NestAI falló.'],
  UNKNOWN:['A geração de IA falhou por uma causa ainda não identificada.','AI generation failed for an unidentified reason.','La IA falló por una razón aún no identificada.'],
 };
 const index=locale==='pt-BR'?0:locale==='es'?2:1;
 return messages[code][index];
}
