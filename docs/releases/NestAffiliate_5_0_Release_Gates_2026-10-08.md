# NestAffiliate 5.0 — Matriz de conclusão técnica, conformidade e evidências de release
**Data:** 08/10/2026 · **Objetivo:** evidências verificáveis, sem chamar teste simulado de validação comercial.

## Contratos de produto preservados
- Produto/anúncio exato, direitos de fotografia e `Reference Lock`; link não é comissionável só porque o host é HTTPS.
- Nunca executar IA paga ou publicação automática por padrão.
- Aprovação humana na versão exata; campanhas legadas continuam sem migrações destrutivas.
- Dados Firestore sempre separados por `organizationId`, sem tocar billing/Hub/MusicScale.

## Fase A — Dados confiáveis
- Conferência manual obrigatória do link em novas campanhas V4 Mercado Livre, com vínculo URL/anúncio/Pinterest/tempo.
- URLs `meli.la` aceitas somente com hostname exato e código válido, sem deduzir propriedade ou comissão por serem curtas.
- Editor determinístico: falhas não editam conteúdo; alteração real tem prévia renderizada.
- Radar separa pesquisa, oferta, revisão, preparação e publicação.

## Fase B — Creative Assistant
- Três Pin previews **de verdade**, desenhados pelo mesmo `renderPin` 1000×1500 que exporta o PNG: problema, inspiração, editorial claro; nenhuma foto de produto inventada.
- Escolher direção atualiza o template final e invalida imagem criativa antiga (ambos `Review` e `Prompt Studio`).
- `ProductReferenceManager` restaura a foto autorizada previamente escolhida somente após consultar Firestore, baixar mídia privada e validar SHA/variante/direitos novamente.
- Imagem de marketplace continua somente consultiva quando licença é desconhecida. ChatGPT recebe foto apenas por anexo manual explícito, não por colagem de prompt.

## Fase C — Radar por necessidade
- Clusters de problemas editáveis e hipóteses editoriais; busca oficial acontece só após ação expressa do usuário.
- Oferta de catálogo NÃO comprova demanda do Pinterest. Coleta oficial continua submetida aos limites do broker.
- Teste comercial H1 requer tráfego real; não pode ser preenchido com dados inventados.

## Fase D — Resultados observáveis
- Importação CSV de Pinterest por campaignId/data com prévia, validação, lote e idempotência.
- Exportações de comissão: idempotência, reversão, reconciliação de mudança de status, proteção contra importação anterior e atribuição ambígua.
- Correspondência marcada `EXACT` exige trackingCode exclusivo no tenant; simples campaignId digitado recebe `UNKNOWN`.
- Receita de campanhas Pinterest exclui vendas de canais Facebook; resultados financeiros sem observação ficam desconhecidos (não zero).
- H4 é hipótese até haver cliques rastreados e relatórios autênticos.

## Fase E — Operação
- Biblioteca e Boards usam campanhas reais, busca e filtros.
- Download ZIP portátil sem dependência paga com Pin PNG e informações de publicação; ação separada de copiar tudo.
- Agendamento guiado com alarmes .ics e comprovação por URL pública; marcar data NÃO significa publicar.

## Gates automáticos exigidos
- Lint, TypeScript, unit/integration, script checks, dependency audit, build.
- Playwright smoke + Radar V4 + Revenue 3 em mobile e desktop, e navegação v5.
- Preview Firebase isolado e smoke HTTP; pipeline `production` repete E2E e valida a implantação.
- `production` só por atualização fast-forward, mantendo SHA anterior e rollback reproduzível.

## Gates externos que NÃO podem ser falsificados por automação
- Usuário real precisa verificar conta Mercado Livre/Shopee e se cada link foi gerado para a conta, o canal e o anúncio exatos.
- A plataforma só informa comissões **aprovadas** em seu relatório. O app não controla a aprovação.
- Sessão Firebase/Hub real, variação, direitos e mídia privada devem ser conferidos manualmente no ambiente real para aceitação comercial integral.
- Acesso padrão Pinterest API e status de aprovação dependem do Pinterest; sem esse acesso, o **produto permanece funcional em publicação guiada**, não se afirma integração de autopost.
- Google/Apple Calendar só agenda notificações após o usuário importar o arquivo ICS; não são push nativo do NestAffiliate.
- H1–H4 precisam de resultado de tráfego/vendas real antes de declarar lift ou 100% de ganho.

## Evidências GitHub
- PR base v5: https://github.com/prdanielcunha/NestAffiliate/pull/34
- PR hardening v5: https://github.com/prdanielcunha/NestAffiliate/pull/39
- Homologação inicial: https://github.com/prdanielcunha/NestAffiliate/actions/runs/37856655511
- Produção: verificar workflow https://github.com/prdanielcunha/NestAffiliate/actions/workflows/firebase-production.yml após push de release.

**Regra:** 100% de implantação técnica não significa 100% das conversões de negócio comprovadas, nem habilitar provedores sem acesso autorizado.
