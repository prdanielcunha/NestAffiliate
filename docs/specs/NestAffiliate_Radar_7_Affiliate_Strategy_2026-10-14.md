# NestAffiliate — Estratégia de crescimento responsável & Radar Workspace 7.0

Data: 14/10/2026. Natureza: pesquisa, estratégia e plano de produto com execução por fases.

## Tese: decisões comerciais melhores, não publicação em massa

**Problema/necessidade → mercado e evidência → comparação → escolha → criativo original → revisão → publicação autorizada → medição → aprendizado.**

Usuários iniciantes querem descobrir bons produtos sem aprender ferramentas técnicas. Operadores avançados precisam confiar em evidências, comissão, estoque, direitos de imagem e aprovação. Produto excelente serve aos dois com divulgação progressiva dos detalhes.

Não confundir: número de anúncios com demanda; vendas informadas com chance de vender no Pinterest; comissão nominal com receita realizada; tendência de um dia com crescimento.

## Pesquisa: fontes oficiais consultadas em 14/10/2026

- Política de conteúdo comercial Pinterest: transparência comercial, pastas relevantes e vedação a comportamento de distribuição spam: https://policy.pinterest.com/en/commercial-and-branded-content-guidelines
- Pinterest API permite criar boards e Pins com os escopos próprios, após conexão/autorização: https://developer.pinterest.com/docs/work-with-organic-content-and-users/create-boards-and-pins/
- Pinterest Trial/Standard: Pins publicados via Trial podem ficar visíveis só ao criador; acesso Standard é necessário para uso público mais amplo: https://developers.pinterest.com/docs/key-concepts/access-tiers/
- Pinterest Organic Analytics: análise de Pins/conta quando elegíveis, com janelas de relatório e métricas oficiais: https://dev.pinterest.com/docs/analytics-and-reports/organic-reporting/
- Mercado Livre publicou migração de múltiplos itens/usuários para endpoints bulk até 25/10/2026: https://developers.mercadolivre.com.br/pt_br/itens-e-buscas
- Documentação interna: especificações mestras de 30/09/2026, Radar 6.0 de 14/10, apps/web e packages/radar.

Essas fontes não garantem integração autorizada da conta NestAffiliate, nem ganho financeiro.

## Novas funções implementadas para homologação (Radar 7)

- Histórico de busca e produtos salvos por organização+usuário no navegador, limite de 12 buscas e 40 produtos, expiração dos snapshots em 30 dias.
- Interesse principal explicitamente escolhido (categoria); sugestões editoriais priorizadas a partir dessa escolha.
- Comparação de até três ofertas pesquisadas, sem afirmar que duas variantes são idênticas.
- Ordenação por relevância original, preço conhecido, vendas informadas ou taxa de comissão verificável, com desconhecidos no fim.
- Um aviso pequeno de próxima pendência verificável por card; o draft continua sujeito a link, imagem, aprovação e demais guardas.
- Testes para segurança dos URLs, não confusão entre IDs de marketplace, limites, deduplicação, E2E de mobile/desktop.
- Zero novos provedores pagos, zero alteração destrutiva de dados ou Firestore Rules.

## Princípios de confiança e UX

1. Busca acima de importação manual; nunca exigir link afiliado antes de haver produto.
2. Mostre dado e hora da fonte; desconhecido continua desconhecido.
3. Mostre mais vendidos só quando há evidência atribuída. Mais procurados requer sinal explícito de interesse. Crescimento requer duas observações comparáveis; jamais apenas um ranking estático.
4. Informação registrada no navegador é snapshot local, não disponibilidade atual. Permitir limpar tudo.
5. Mobile 360px com toque de 44px, teclado/foco, linguagem simples e PT/EN/ES.
6. CTA principal: preparar Pin. Ainda não significa estar liberado para publicar.
7. Never auto-publish without effective Pinterest permissions and explicit human review.
8. Foco na relevância da pasta e na originalidade dos Pins, sem spam nem afirmações falsas.

## Métricas reais para avaliar melhorias

- Tempo até primeira oportunidade salva.
- Busca → resultado verificável → rascunho → aprovação → publicação.
- Separar falha do provedor de falha do produto.
- Cliques de saída, impressões, salvamentos, CTR apenas a partir de dados oficiais ou exportados e atribuíveis.
- Receita apenas importada de relatórios legítimos; nunca aproximada por geração de texto.

## Backlog de capacidades avançadas NÃO concluídas nesta fase

P1: sincronização entre dispositivos com RBAC/rules auditadas; agrupamento por GTIN/modelo/variante reais; notificações de anúncio expirado; pesquisa por múltiplas fontes após aprovação oficial; migração dos endpoints de lote Mercado Livre se o código do backend os utilizar antes de 25/10/2026.

P2: Criativos A/B com variação substantiva, análise Pinterest autenticada, calendário editorial por desempenho histórico medido, aprendizado opt-in com cliques/salvos/publicações reais, guardas de qualidade da imagem contra aparência diferente do anúncio.

P3: Pinterest OAuth, Standard Access, leitura de Analytics e publicação integrada somente após permissão comprovada; suporte a novos marketplaces somente após contratos e credenciais; aplicação em larga escala com quotas, observabilidade, testes de integridade e auditoria.

## Critérios para promover a produção

Lint, typecheck, unidade, integração, build e E2E (desktop/mobile/Safari) devem passar. Aprovação humana e bloqueios de compliance não podem sofrer regressões. Preview Firebase e smoke de domínio oficial precisam ser verificados. Sem force push ou migrações destrutivas. Documentar cada incremento e suas limitações.
