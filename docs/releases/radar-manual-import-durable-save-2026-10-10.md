# Radar: importação manual resistente a falhas — 10/10/2026

Diagnóstico por código: o fluxo manual enviava rank/atributos opcionais undefined ao Firestore; o SDK rejeita o payload. O handler recarregava a nuvem após qualquer falha, inclusive de auditoria e enriquecimento. O domínio meli.la também não era reconhecido.

Mudanças: limpeza de undefined nos payloads (mantendo sentinelas), preservação de rascunho pendente por organização com recuperação após reload e retry, desacoplamento da persistência de campanha e enriquecimento/auditoria, tratamento de meli.la, campo opcional para URL HTTPS de imagem com direitos de uso a verificar, testes de regressão.

Fase posterior, não implementada: Smart Import link/print com broker seguro que resolve shortlinks e consulta dados oficiais autorizados; OCR/visão sob privacidade, comparador por SKU/variante, prova de origem e freshness; NestScore explicado; 3 ângulos criativos distintos e Pin 1000x1500 com Product Truth/Reference Lock e aprovação humana. Prever fallback para 403/429 sem scraping irregular, SSRF guard, identidade da oferta e URL afiliada conferida, teste E2E autenticado, custo zero e PT/EN/ES.

Release: esta branch não muda regras compartilhadas, nem faz migração. Exige CI, preview, smoke com login real e rollback antes de produção.
