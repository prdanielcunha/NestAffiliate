# NestAffiliate — Radar 9.0: identidade comprovada, observações recentes e portabilidade

Data 2026-10-14. Release condicionado a CI e smoke Firebase. Vinculado aos issues #97, #98, #99.

## O que foi implementado
- Contratos opcionais de GTIN, modelo e variante com \`TruthValue\` (valor, fonte, data).
- Validação matemática do dígito verificador GTIN-8/12/13/14 e rejeição de dados adivinhados/fornecidos por IA como prova oficial.
- Classificação de equivalência: mesmo anúncio; mesmo GTIN oficial validado; variantes/GTIN diferentes; sem evidência suficiente.
- Comparação lado a lado evidencia exatamente o que é e não é comprovado. Título/foto parecidos não significam mesmo produto.
- Avisos para price/stock snapshots com data de observação ausente, futura ou antiga. Limiares: 24h para rever; >72h stale. Limiares editoriais, NÃO promessa de validade dos preços durante 24h.
- Correção de selo de disponibilidade: dado antigo passa a "Disponível na última observação", não "Disponível agora".
- Favoritos registram observação comercial de preço/estoque (quando disponível) em vez da data do título.
- Exportação/recuperação em JSON **apenas por ação do usuário**; sem token, identidade, orgId ou credencial no backup. Tamanho de importação limitado, estrutura validada e conteúdo sanitizado. Importação nunca liga sincronização privada automaticamente.
- PT/EN/ES, mobile, testes Vitest e Playwright.

## Verdade dos dados e dependências
- Muitos provedores não incluem GTIN confiável: nesses casos "equivalência não verificada" é o resultado certo, sem inventar correspondência automática.
- Abrir anúncio original e pesquisar novamente são ações para revalidar; não significam que a API atualizou o preço ou confirmou comissão.
- Links salvos são HTTPS e passam pelos filtros de marketplace existentes.
- Testes automatizados não substituem acesso autorizado às contas de afiliado e Pinterest.

## Integrações oficiais a acompanhar
- Mercado Livre exige \`/items/bulk?ids=\` e \`/users/bulk?ids=\` no lugar dos endpoints múltiplos antigos até 25/10/2026, com \`status_code\`, \`id\` raiz e prefixo \`body.\` nos atributos: https://developers.mercadolivre.com.br/pt_br/itens-e-buscas
- Pinterest distingue Trial (Pins criados são sandbox/visíveis somente ao criador) e Standard para operação pública: https://developers.pinterest.com/docs/key-concepts/access-tiers/
- Pinterest Organic Analytics fornece dados com limite de janela de 90 dias e métricas de Pins, mas exige a conta/permissões reais: https://developers.pinterest.com/docs/analytics-and-reports/organic-reporting/

## Critérios release
- Rodar lint, types, unidades, integração, audit, build, E2E desktop/mobile/WebKit Safari.
- Merge via PR; preview isolada; PR main→production com CI; deploy Firebase e smoke oficial; SHA main=production.
- Não usar force push, mudanças destrutivas de dados, credenciais extras nem aquisição paga de APIs.
