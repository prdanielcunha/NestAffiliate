# NestAffiliate 5.0 — Winning Product & Creative OS
**Data:** 08/10/2026 · **Status:** execução incremental · **Base:** production `9625cd9a` · **Branch:** `feature/nestaffiliate-5-trust-edit-foundation-20261008`

## 1. Objetivo verificável
O NestAffiliate não será avaliado pelo número de Pins gerados. A métrica principal continua **comissão aprovada por minuto humano**; métricas intermediárias são cliques de saída, CTR de saída, conversão rastreável, comissão pendente/aprovada, EPM, tempo de revisão e incidência de publicação bloqueada. Nenhum score editorial é probabilidade de venda.

Esta especificação preserva a arquitetura dos documentos-mestre de 30/09/2026: Product Truth Lock, Reference Lock, aprovação humana, custos iniciais baixos, separação de fornecedores, Firebase/Hub compartilhados, organização/tenant e múltiplos idiomas. A nova UX **não altera campanhas históricas** nem exige migrações destrutivas.

## 2. Diagnóstico consolidado / priorização

| Prioridade | Lacuna | Risco | Solução | Aceite |
|---|---|---|---|---|
| P0 | Link seguro confundido com link comissionável | Receita perdida, falsa segurança | Estado distinto de URL segura, conferência humana da conta/canal, futuro callback oficial | Nunca afirmar comissão verificada com base apenas em HTTPS |
| P0 | Editor “livre” finge executar pedidos | Pins inconsistentes / desconfiança | Planejador determinístico ou AI Router confiável, prévia antes de gravar, recusa explícita | Pedido não suportado não altera campanha nem vira descrição |
| P0 | Radar tenta contar aprovação ainda inexistente | Dashboard enganoso | Separar pesquisa, oferta, criação, revisão, publicação | Contadores somente da etapa que tem evidências |
| P1 | Referência de imagem envolve muitos passos | Abandono operacional | Assistente único com estados persistidos, recuperação e alternativas legítimas | Usuário sabe o próximo passo, sem inferir direitos de uso |
| P1 | Radar começa por catálogo e poucos seeds | Baixo valor comercial | Intenção/problema → shortlist por oferta → evidência/risco | Sinal de oferta nunca vira sinal de demanda |
| P1 | Três conceitos semelhantes | Creative Pack cosmético | Três narrativas *e layouts* visualmente distintos com miniaturas reais | Comparação em viewport 390px antes de aprovar |
| P1 | Atribuição manual fragmentada | Vencedores falsos | Importação assistida, dedupe e reconciliação | Proveniência, denominador, período e amostra explícitos |
| P2 | Biblioteca/Boards e agenda pouco operáveis | Atrito repetitivo | Boards reais, export/clipboard inteligente e lembretes confiáveis | Agendamento nunca é declarado como postagem |

## 3. O que entrou nesta primeira implementação da v5

### 3.1 Affiliate Link Trust — início (P0)
- Contrato aditivo `ProductTruth.affiliateAttestation` guarda uma **declaração do usuário**: link exato, marketplace, anúncio, canal Pinterest e momento da conferência.
- URLs HTTPS são **segurança técnica**, não prova de atribuição de comissão.
- Para rascunhos V4 marcados, a aprovação/publicação Mercado Livre requer uma conferência manual recente, vinculada ao produto exato e ao destino exato.
- Links com hosts não reconhecidos, alterações posteriores do link/listing, declaração ausente ou expirada bloqueiam esse novo fluxo.
- A UI exige uma ação explícita antes de salvar o link, sem coletar token, cookie, senha ou credencial.
- Campanhas anteriores preservam suas regras de aprovação; não há reescrita retroativa de dados.
- **Limitação declarada:** a confirmação humana **não é verificação oficial do programa**; a atribuição definitiva só poderá ser comprovada por relatórios/conectores autorizados.

### 3.2 Edição honesta (P0)
- O editor local aceita comandos limitados e **comportamento determinístico**: trocar headline/título/descrição/subheadline por texto explícito, aplicar estilo premium/minimal/light, novo ângulo editorial e remover preço já presente em texto editável.
- Mostra a **prévia renderizada do canvas** antes de persistir uma versão de campanha.
- Comando desconhecido é recusado sem alterar dados, sem fingir que uma IA trabalhou.
- Asset gerado manualmente permanece sujeito a Reference Lock, direitos e revisão de fidelidade.
- **Próximo passo:** AI Router com `EditPlan` estruturado, diff validado, permissões de campos, prévia e confirmação; se provider gratuito estiver indisponível, manter fallback determinístico.

### 3.3 Radar truth in UI (P0)
- O funil exibe candidatos, anúncios reconhecidos e itens para investigar.
- “Pronto para publicar” não aparece na etapa em que a aprovação humana não aconteceu.
- Números não observados continuam desconhecidos.

## 4. Experiência desejada (v5 completa)

### “Sua próxima oportunidade”
1. **Problema de alguém** — 1 frase útil, intenção, origem e idade do sinal, confiança, risco e por que esta oferta entrou na shortlist.
2. **Oferta exata** — abrir anúncio, confirmar variantes e vendedor, gerar/linkar afiliação na plataforma, conferir canal e apresentar estado “comissão não verificada” enquanto não houver relatório.
3. **Como mostrar** — miniaturas 2:3 mobile-first: Problema→Solução, Inspiração, Editorial; mostrar diferenciação real e custo/limites de geração.
4. **Revisar Pin** — comparação lado a lado, Product Truth e direitos, prévia a 390px, legibilidade, link, destino, disclosure, board e risco de repetição. Ações: aprovar, editar, trocar produto, refazer, descartar.
5. **Publicar e aprender** — pacote compactado (PNG + título + descrição/disclosure + board + link + alt), registrar URL do Pin publicado, lembretes quando agendado, métricas de Pinterest e relatórios de comissão importados.

**Regra de uma tela:** uma ação principal, “por que isto?” opcional, próximas ações explícitas, estados de erro/sem dados/offline e nenhum êxito fictício.

### Estilo visual
Dark premium editorial, superfícies profundas, tipografia em até duas famílias, uma única cor de ação, contraste AA, microinterações discretas, comparação criativa sem cartões redundantes. Mobile 360–390px antes do desktop; navegação e área de decisão na zona do polegar. Não reconstruir os componentes existentes sem medição de ganho de usabilidade.

## 5. Roadmap por entregas pequenas
- **Fase A — Fundamentos e integridade (iniciada neste PR):** link com declaração auditável, edição com plano/prévia/negação honesta, métricas de estágio. Critérios: testes unitários, tipos, lint, build, regressão de campanhas existentes e aprovação humana.
- **Fase B — Creative Assistant unificado:** sessão persistente, source audit, Reference Lock, opções de material autorizado/editorial sem fotografia enganosa, retomada após importação do ChatGPT, thumbnails de três direções *genuinamente distintas*, diff de camadas.
- **Fase C — Radar por problema/intenção:** clusters com proveniência, expansão seletiva de consultas nos limites oficiais, contagem de fontes/dedup, contratos de demanda vs catálogo, shortlist interpretável, controles de cota.
- **Fase D — Revenue Learning:** ingestão CSV assistida (Pinterest + comissões), schemas dos marketplaces, matching por campaign/sub_id, dedupe, reembolso, receita aprovada vs pendente, amostra e janela de atribuição claras, qualidade das inferências.
- **Fase E — Operação sem atrito:** Biblioteca e Boards utilizáveis, pacote de publicação com menos gestos, agendamento com lembretes que não fingem auto-publicação, observabilidade e microcopy PT/EN/ES.

## 6. Testes e gates inegociáveis
- Tests: links maliciosos, descompasso de listing/link/declaração, vencimento; edição não suportada, sem alteração fictícia, render prévio, histórico/undo.
- QA: telas 360/390/768/1024/1440, dark/light, PT/EN/ES, leitor de tela, teclado, 200% zoom, rede ruim, E2E Radar → revisão → aprovação → pacote.
- Segurança: nenhuma credencial no frontend, Firestore Rules multi-tenant, nenhum bypass Admin, migração aditiva, nenhuma publicação sem aprovação, lock de imagem não substituído por texto.
- Custo: nenhum provider pago ativado, quota/fallback, sem scraping de painel privado, sem aumento oculto de execução periódica.
- Release: CI verde → preview → smoke com sessão real → merge controlado → monitoramento/rollback. **PR não é publicação.**
- Evidência necessária ainda ausente: teste autenticado real de arte/link/commission reporting e resultados comerciais próprios da conta.

## 7. Hipóteses de negócio a testar — não confundir com resultados
- **H1:** começar pela intenção de uso produz shortlist com maior CTR de saída que pesquisa apenas por produto.
- **H2:** conceitos visuais distintos melhoram distribuição/saves/cliques sem publicar duplicações.
- **H3:** fluxo com recuperação de sessão reduz tempo humano de criação.
- **H4:** relatórios conciliados predizem melhor receitas aprovadas que ranking editorial sozinho.

Comparar cohorts/períodos e registrar mudanças de tema/board/oferta. Não declarar “winner” ou causalidade com pouco volume.

## 8. Referências externas a revalidar no release
- Pinterest Commercial & Affiliate Guidelines: https://policy.pinterest.com/pt-br/commercial-and-branded-content-guidelines
- Pinterest criação de conteúdo afiliado: https://create.pinterest.com/blog/affiliate-marketing-link-basics/
- Mercado Livre geração de links: https://www.mercadolivre.com.br/l/comece-a-recomendar

**Critério final:** menos esforço humano com ofertas exatas, imagem fiel e direito de uso comprovado, link de monetização conferido e receita aprovada rastreável — sem promessas fictícias.
