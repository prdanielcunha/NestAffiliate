# NestAffiliate — Radar UX/UI 6.0

**Data:** 14/10/2026  
**Estado:** Proposta de redesign e especificação para implementação, **não publicada**  
**Repositório:** `prdanielcunha/NestAffiliate`  
**Origem da análise:** captura de tela mobile anexada, componentes React do branch `main` e seis documentos mestres de 30/09/2026.

## 1. Decisão de produto

**O Radar deve começar por DESCOBRIR, não por IMPORTAR.** O usuário não precisa possuir um produto nem um link para começar. A experiência principal deve ser *pesquisar uma necessidade, tema ou produto → receber sugestões com origem e evidência → comparar ofertas → escolher → preparar campanha → revisar → aprovar → publicar*. A importação por link/print permanece disponível como alternativa secundária.

**Papel no produto:** `Hoje` é a porta de entrada automática para revisões prontas; `Radar` é a porta de entrada para a descoberta e exploração guiada. Não transformar a página Radar em uma segunda home ou em um painel técnico.

**Pergunta que a interface deve responder:** "O que vale a pena divulgar?" seguida por "O que faço agora?".

## 2. Diagnóstico observado

### Captura de tela mobile, 14/10/2026

1. Bloco **SMART IMPORT · NESTAI / Cole o link. Ou envie o print** ocupa o primeiro espaço útil antes de qualquer busca.
2. Marketplace selector, card **WINNING PRODUCT RADAR · 5.0**, formulário de busca e **Sugestões que valem testar** ficam separados em diversos blocos e deslocados para baixo.
3. Bloco de saúde de provedores, benefícios técnicos, preço máximo, checkbox de imagem, filtros de estado e filtros de confirmação aparecem antes de haver resultados.
4. A tela vazia diz "Comece por uma intenção, não por um produto", mas a primeira ação exige justamente produto/link; contradição no percurso.
5. Uma segunda porta de **Adicionar produto** aparece no fim da página, duplicando a primeira.
6. Os filtros e mensagens de versão/estado ocupam espaço que deveria ser reservado para oportunidades e resultados.

### Confirmado no código existente

- `apps/web/src/App.tsx`, `Radar` a partir da linha 917: `query` inicia com `organizador cozinha pequena`; buscas são suportadas por `searchMercadoLivreBrokerDetailed` e `searchShopeeBrokerDetailed`.
- `apps/web/src/App.tsx`, bloco da renderização a partir da linha 1462: `SmartProductImport` é renderizado ANTES do seletor de marketplace, do `ProblemIntentExplorer` e da barra de busca.
- `apps/web/src/App.tsx`, `suggestedQueries` por volta da linha 1012: mistura sinais existentes, variações relacionadas à busca e seis fallbacks fixos, limitado a seis termos; não há navegação "Mais sugestões" segmentada por sinais.
- `apps/web/src/App.tsx`, por volta das linhas 1581–1606: diversos filtros apresentados antes dos resultados, independentemente de contexto.
- `apps/web/src/App.tsx`, por volta das linhas 1735–1838: cards já contêm imagem, origem, score, preço, evidências, comissão quando conhecida, motivos e CTA para campanha. **Preservar dados e lógica**, simplificando apresentação.
- `apps/web/src/features/ProblemIntentExplorer.tsx`: seleção de problemas e pesquisa vinculada existem, mas ficam isoladas em um bloco grande.
- `apps/web/src/features/OpportunityV4Panel.tsx`: dados de prontidão, confiança, pendências e ação recomendada existem; apresentar resumo em linguagem simples nos cards, com detalhes em expansão.
- `apps/web/src/features/SmartProductImport.tsx`: importação oficial/assistida, print e fallback existem e devem ser preservados como fluxo próprio, não removidos.

**Conclusão:** o maior ganho imediato é reorganizar o frontend e a jornada, não reescrever providers, pontuação, segurança ou campanhas.

## 3. Arquitetura de informação desejada

### Estado A — Abriu o Radar (sem pesquisa)

```text
RADAR
Encontre boas oportunidades para divulgar
Busque um produto, categoria ou problema.

[ 🔎 Ex.: organizador de cozinha, home office pequeno ] [Buscar]

Marketplaces: [Todos] [Mercado Livre] [Shopee]
             (mostrar só os conectados/pesquisáveis com indicador discreto)

Explore ideias
[Para você] [Mais vendidos] [Mais procurados*] [Em crescimento*]
[Por categoria] [Problemas do dia a dia]

IDEIAS / SUGESTÕES
[Organização de gavetas]   [ML · Vendas observadas**]
[Ganhar espaço na cozinha] [Hipótese editorial]
[Suporte de notebook]      [Shopee · Catálogo consultável**]
[Organizadores de geladeira] [ML · ...]
[Ver mais sugestões]

Já tem um produto?  [Importar link ou print]
```

`*` Mostrar somente quando houver sinais adequados. `**` Exemplo de tratamento e rotulagem; não afirmar dados sem evidências, timestamp e fornecedor disponível.

**Não mostrar nesse estado:** filtros de prontidão, comissão confirmada, imagem autorizada, funil interno, troubleshooting de API ou relatórios detalhados. Mover para filtros avançados, explicação pontual ou Conexões.

### Estado B — Busca em andamento

Mostrar a consulta escolhida; feedback progressivo humano, como "Buscando no Mercado Livre" / "Consultando Shopee" / "Comparando ofertas". Se um marketplace falhar, continuar no outro. Não exibir spinner indefinido nem simular resultado. Permitir cancelar/redefinir a busca quando suportado. Respeitar cache, limites, quota e autorização.

### Estado C — Resultados encontrados

```text
Resultados para "organizador de gavetas"
14 ofertas localizadas · Mercado Livre (8), Shopee (6)
[Recomendados ▾] [Filtros ▾] [Comparar selecionados]

[Imagem]  Organizador de gavetas ...
          Mercado Livre · Dados verificados em [data/hora]
          R$ ... | avaliação ... | vendas ... (apenas se confirmadas)
          [Boa opção para Pin] [Confiança alta/média]
          "Pode resolver o problema de gavetas desorganizadas"
          [Ver detalhes]         [Preparar meu Pin]

[Imagem]  Produto alternativo ...
          Shopee · preço... | ...
          [Ver detalhes]         [Preparar meu Pin]

[Carregar mais produtos] (paginação real; não repetir resultados)
```

**Visual:** primeiro apresentar 4–8 bons resultados e capacidade de ver os demais. Em vez de mostrar 36 cards longos e densos, usar informação essencial em cada card e expandir detalhes sob demanda.

### Estado D — Detalhe/seleção da oportunidade

Oferecer imagem grande, título, preço/marketplace, reputação, disponibilidade, comissão quando confirmada, potencial editorial, confiança e *por que escolhemos este item*, tudo com rótulos compreensíveis. Separar "Verificado" de "Pendente". A seção detalhada pode conter proveniência e NestScore. Recomendar uma única próxima ação dominante:

- **Preparar meu Pin** se os fatos mínimos estiverem presentes; o editor/revisão ainda executa guardas.
- **Confirmar dados do produto** se anúncio/variante não puder ser identificado.
- **Adicionar link de afiliado** somente na etapa em que ele for imprescindível.
- **Escolher foto autorizada** quando imagens precisarem de comprovação.
- **Ver alternativas** se houver bloqueio comercial relevante.

### Estado E — Handoff para campanha

Após clicar em "Preparar meu Pin", reutilizar o fluxo existente de `create()` e `/review/:id`, mas incluir contexto de transição: "Produto escolhido → Preparando conteúdo → Revisar seu Pin". Não confundir *criar rascunho* com *pronto para publicar*. Aprovação humana e verificações de link/claims/direitos permanecem obrigatórias.

### Estado F — Sem dados / fontes limitadas

Mensagem específica por fonte, sem inventar dados ou sugerir que "não há demanda". Exemplo: "A busca automática da Shopee não está disponível agora. Você ainda pode pesquisar no site da Shopee e importar o anúncio, ou continuar vendo resultados do Mercado Livre." CTA **Pesquisar na Shopee** / **Importar anúncio**. Não pedir configurações técnicas para o leigo. Abrir Conexões apenas se reconexão for realmente necessária.

## 4. Descoberta inteligente com critérios claros

### Taxonomia de sugestões

| Aba / grupo | O que significa | Condição para exibir | Origem no card |
|---|---|---|---|
| Para você | alinhamento com nicho, histórico, sazonalidade e preferências | sempre possível, mas rotular hipóteses | fonte ou "Ideia editorial" |
| Mais vendidos | produtos com sinal de vendas/posição fornecido por marketplace | vendas/ranking verificável | marketplace + data |
| Mais procurados | dados de buscas/demanda mensuráveis | fonte de demanda autorizada; sem ela, não usar esta afirmação | nome da fonte + janela |
| Em crescimento | variação temporal medida | pelo menos duas observações comparáveis | fonte + período |
| Por categoria | navegação por árvore canônica de categorias | catálogo/seed reconhecido | marketplace(s) disponíveis |
| Resolver um problema | hipóteses editoriais e intenção comercial | sempre, explicitando que é sugestão, não demanda medida | "Ideia para pesquisar" |

Não derivar "mais procurado" de quantidade de anúncios, reviews ou resultado de pesquisa; não derivar "mais vendido" de IA gerativa. Evitar saturar a UI com siglas técnicas e estimativas falsas.

### "Ver mais sugestões" de verdade

Gerar lotes paginados de sugestões, com deduplicação por termo normalizado, categoria e sessão; priorizar diversidade semântica. Lotes posteriores podem explorar outra categoria/abordagem mantendo o foco do usuário. Mostrar "Tentar outra categoria" e "Surpreenda-me" apenas quando fizer sentido. Guardar preferências confirmadas e rejeições para calibrar sugestões futuras, não usar um clique isolado como interesse definitivo.

### Marketplace como filtro e evidência, não obstáculo

Seleção padrão **Todos os disponíveis**. Mostrar status por marketplace em disclosure curto: "Mercado Livre: busca automática"; "Shopee: importação assistida" quando aplicável. Amazon deve aparecer só em Conexões como **Planejado**, não como opção de pesquisa ativa no MVP. Futuras fontes entram por Capability Registry; não prometer pesquisa universal sem suporte real.

## 5. Conteúdo dos cards de produto — preservar, simplificar

**Primeira camada (sempre visível):** foto grande, nome legível em até 2–3 linhas, marketplace, preço com timestamp se houver, sinais-chave reais (avaliação/vendas/commission quando disponíveis), rótulo simples de potencial e confiança, razão editorial em uma frase e **Preparar meu Pin**.

**Segunda camada (Ver detalhes):** NestScore e componentes, preço/frete quando oficiais, comissão verificada ou desconhecida, reputação, estoque, link de origem, disponibilidade, métricas de vendas e proveniência, comparáveis em outros marketplaces, alertas e pendências.

**Uma ação principal por card.** Ações adicionais (`Abrir anúncio`, `Comparar`, `Salvar para depois`, `Descartar`) vão em botões secundários/disclosure. Retirar código de rastreamento da primeira camada. Não apresentar estoque exato quando a API só oferece faixas/estimativas.

### Comparador entre marketplaces

Quando houver equivalência suficientemente fundamentada, agrupar ofertas do mesmo produto em um cartão canônico com opção **Comparar ofertas**. Mostrar preço, reputação, comissão verificável, prazo/frete se disponível, situação de link e imagem, e a justificativa da oferta recomendada. Nunca confundir produtos diferentes ou variantes como se fossem idênticos. Comparar custo para o comprador e viabilidade para o afiliado, sem prometer conversão.

## 6. Visual premium e acessibilidade

- **Hierarquia:** título útil > campo de busca > opções de exploração > resultados. Importação secundária.
- **Vocabulário:** "Explorar ideias", "Pesquisar", "Ver detalhes", "Preparar meu Pin", "Confirmar link", "Revisar meu Pin". Deixar "NestScore 4.0", "Smart Import", "R3", "Shadow", "Winning Product" nos bastidores.
- **Mobile:** viewport 360–430px, uma coluna, cartões compactos, busca visível sem rolar, filtros em bottom sheet após busca, navegação inferior intacta, action bar acessível ao polegar.
- **Desktop:** campo e exploração em grid limitado; resultados em 2–3 colunas quando disponível; comparação em painel lateral; manter linhas de texto confortáveis.
- **Contraste:** verificar corpo e placeholders no dark; não usar verde de destaque em grandes áreas com baixo contraste tipográfico; evitar microtextos cinza. Usar uma cor de destaque sem ornamentação excessiva.
- **Acessibilidade:** WCAG AA, teclado/focus, labels reais, feedback via `aria-live`, toque confortável, 200% zoom, prefers-reduced-motion, i18n pt/en/es.
- **Estados:** loading, empty inicial, zero resultados, parcial, sem permissão, rate limit, sem conexão, oferta expirada, fonte de dado antigo e sucesso, cada um com ação concreta.

## 7. Plano de implementação — preservando o existente

### P0 — Reorganizar a experiência (sem backend novo)

1. Extrair `Radar` de `App.tsx` para container próprio com subviews: `RadarLanding`, `RadarSuggestions`, `RadarResults`, `RadarFilters`, `RadarProviderFallback`.
2. Passar `SmartProductImport` para ação `Adicionar por link ou print`, aberta em drawer / página específica, preservando parsing, OCR assistido e Truth Lock.
3. Unificar o campo principal e os cliques de sugestões sob `search()`; remover repetição de formulários.
4. Inicializar busca vazia em vez de string pré-preenchida; mostrar exemplo em placeholder e opções relevantes.
5. Ocultar `maxPrice`, `requireImage`, estado/revenue/image filters até resultados/"Filtros avançados". Aplicar filtros em tempo real sobre resultado conhecido ou comunicar quando exigirem nova busca.
6. Em telas vazias, mostrar sugestões e próxima ação; não exibir `0/0` nem filtros inativos.
7. Reduzir cards a duas camadas; contextualizar CTA e próximo passo com base em pendências reais.
8. Eliminar strings de versão técnica do front e padronizar microcopy simples sem perder rastreabilidade técnica em log.
9. Preservar `create()` → `/review/:id`, campanhas existentes, approval guard, RBAC, provider failover e telemetria.

### P1 — Descoberta orientada por evidências

1. Estruturar `SuggestionCandidate` com `id`, `keyword`, `category`, `group`, `marketplace?`, `signalType`, `sourceProvider`, `observedAt?`, `confidence?`, `isHypothesis`, `reason`, `cursor?`.
2. Criar fonte de sugestões a partir de sinais já persistidos (`marketSignals`), histórico próprio, taxonomia e seeds editoriais; nenhuma sugestão deve exigir API paga.
3. Adicionar tabs de discovery, seleção por setor/categoria, paginação/cursor e deduplicação/novidade.
4. Esconder aba "Mais procurados" e "Em crescimento" quando dados não suportarem a afirmação, com alternativa "Para explorar".
5. Consolidar produtos equivalentes quando equivalência estiver bem fundamentada.
6. Adicionar resumo de progresso da busca por marketplace e badges de proveniência/freshness.

### P2 — Personalização e produtividade

1. Aprender preferências com evidência longitudinal e controle explícito.
2. Guardar pesquisas e filtros recentes sem impedir novas buscas.
3. Salvar oportunidades para depois e comparar produtos selecionados.
4. Melhorar ligação entre Radar → Campanhas → Resultados, com loop de aprendizado medido.
5. Testar quantitativamente funil, tempo até primeiro resultado e até primeira campanha revisável.

## 8. Critérios de aceite para QA

**Teste leigo de 30 segundos:** uma pessoa que nunca usou afiliados entra no Radar e identifica onde pesquisar, quais marketplaces são pesquisáveis e como explorar sugestões sem instrução externa.

**Teste de 2 minutos:** a mesma pessoa seleciona sugestão, encontra oferta, entende o porquê da indicação, cria rascunho e chega à revisão. Se houver pendência, sabe exatamente como resolvê-la.

**Busca de fontes:** se ML retornar e Shopee falhar, mostrar ML e avisar sobre Shopee, mantendo acesso ao fallback. Se ambas falharem, não inventar produtos, vendas ou comissões.

**Dados e compliance:** fonte/timestamp para fatos, `Product Truth Lock`, direitos de imagem, título/copy sem afirmação não comprovada, afiliado e aprovação final obrigatórios.

**Regressão:** testes de fluxo, cards, UI mobile 360/390, desktop 1366+, light/dark, tradução pt/en/es, navegação por teclado, screen reader, reentrada por URL, sessão, permissões e comportamento offline/4G.

**Release seguro:** feature flag de UI, preview homologado, gates de lint/typecheck/unit/integration/e2e/build/a11y/visual, rollback, sem migrações destrutivas e sem custos novos.

## 9. Métricas de UX

Medir: `radar_opened`, `radar_search_submitted`, `radar_suggestion_impression`, `radar_suggestion_selected`, `radar_provider_partial`, `radar_product_opened`, `radar_product_selected`, `radar_campaign_created`, `radar_search_zero_results`, `radar_manual_import_opened`. Registrar taxas de abandono por etapa e tempos percebidos. Não coletar conteúdo sensível desnecessário.

Metas de produto sugeridas **para validação**, não dados medidos: identificação da ação principal em 5–10 segundos; escolha de primeira sugestão sem rolagem no mobile; primeira oportunidade relevante antes do grande bloco de configurações; queda na necessidade de importação manual para quem deseja descoberta; menor tempo de Radar → campanha revisável. Ajustar alvos com baseline real.

## 10. Regras que não podem ser quebradas

Preservar o princípio **"Hoje → Revisar → Aprovar → Publicar"** da arquitetura mestre; Radar continua exploratório. Não trocar Truth Lock por heurística, não fingir demanda validada, não falsificar reviews/vendas/estoque/comissão, não acionar cobrança/API paga, não usar scraping indevido, não contornar aprovação humana e não anunciar integração como ativa sem capacidade real.

## 11. Resumo executivo

**Refazer a jornada, não o sistema.** O novo Radar abre com uma busca clara e boas ideias, ajuda o usuário leigo a escolher uma oferta sem compreender a complexidade, leva à criação do Pin e informa sempre a próxima ação. Importação, evidências avançadas e configurações continuam disponíveis apenas quando fizerem sentido.