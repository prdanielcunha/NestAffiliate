# NestAffiliate — Premium Experience 6.0
**Fonte complementar oficial do projeto — 13/10/2026**
**Repositório:** prdanielcunha/NestAffiliate
**Base preservada:** `docs/specs/NestAffiliate_UI_UX_Master_Design_2026-09-30.md`

## 1. Visão executiva
NestAffiliate é um operador inteligente de afiliados, priorizando Pinterest, pesquisa baseada em evidências, fidelidade ao produto e preparação editorial com aprovação humana. Não é um ERP, uma landing page genérica de IA ou uma promessa de ganhos.

**Direção estética:** dark premium editorial SaaS com superfícies em camadas, brilho verde discreto, tipografia expressiva, conteúdo objetivo e estados visíveis. Light mode precisa ter contraste equivalente. Nenhum cartão pode sugerir vendas, comissões ou avaliações não verificadas.

**Princípio de UX:** menos cliques, mais contexto e um próximo passo inequívoco. Cada superfície responde: o que aconteceu, o que precisa de mim, o que vem depois, de onde saiu a evidência e qual ação é segura.

## 2. Auditoria das telas reais
Fontes analisadas: PDF de revisão do Pin (`f215389315bb3c25413b8f8f30cde1ad9e9ffc4c.pdf`), PDF da Home (`21062e2d036e1e72af3c055e32c7608edd6af67f.pdf`), duas capturas Safari com a geração NestAI após o hotfix. Esses arquivos foram fornecidos na conversa e não precisam ser copiados para o Git.

### Problemas identificados
- Página de revisão longa, com CTA repetidos, três descrições extensas, prompts técnicos expostos e blocos de imagem competindo entre si.
- Copy da IA com frases não comprovadas sobre ausência de óleo, benefícios saudáveis, ergonomia, durabilidade e aquecimento uniforme.
- A Home dá destaque visual semelhante a métricas de pesquisa, telemetria, custos e campanhas; parte dos números refere-se a candidatos pesquisados, não vendas.
- No mobile: cards altos, densidade desigual, excesso de texto e leitura fatigante antes da próxima ação.
- Falta narrativa premium entre tela de entrada, Home e criação; nav ícone+texto ajuda orientação.

### Pontos preservados
- Identidade verde/dark e foco em uma ação por vez.
- Campanhas/versões existentes, Product Truth, autorização de referência de imagens, link de afiliado conferido no portal, conteúdo produzido localmente e NestAI opcional.
- Aprovação humana final e bloqueio de publicação não autorizada.
- Internacionalização PT/EN/ES e low-cost/zero-cost.

## 3. Linguagem visual e componentes
### Design tokens
- Dark: background profundo, superfície em duas elevações, texto off-white, acento verde-lima controlado, borda fina e sombra sutil.
- Light: branco/off-white e acento verde escuro legível; evitar texto claro com pouco contraste.
- Escala responsiva de heading via clamp, line-height de descrição 1.5–1.7, mínimo 44px para controles clicáveis, suporte a prefers-reduced-motion.
- Raio arredondado sistemático 12–32px, cards de 18–24px e hierarquia de superfície clara.

### Regra de informação
- **Primary:** etapa e ação do usuário, título da campanha, status, razão verificável.
- **Secondary:** opções de copy, preview 2:3, escolha do visual, referências.
- **On-demand:** SEO, telemetria, dados de pesquisa, logs, prompts extensos, debugging.
- Etiquetas de sucesso devem ser respaldadas por estado persistido, não esperança ou contagem de pesquisa.

## 4. Experiência por tela
### 4.1 Entrada / Login
- Headline de valor baseada em controle e inteligência, sem promessas de lucro.
- Jornada ilustrada em passos Radar → Revisão → Pinterest.
- Benefícios reais: evidência verificável, texto sem inventar atributos, aprovação humana.
- Autenticação MillionsNest existente preservada (sem novo provedor ou senha no app).

### 4.2 Hoje / Home
- Primeiro plano: mensagem editorial forte e CTA útil.
- Próxima ação baseada no estado real de campanhas, bloqueios, agendamentos e agente.
- Contadores de campanhas guardadas, aguardando revisão, Pins marcados publicados; não usar métricas de venda ou comissões presumidas.
- Jornada visual 01 Descubra → 02 Escolha → 03 Crie → 04 Publique.
- Fila de campanhas logo após a área de ação.
- Radar 4.0 e telemetria do agente disponíveis em seções expansíveis, sem perda dos detalhes.
- Cards de campanhas com arte conceitual abstrata (nunca foto falsa de produto).

### 4.3 Radar / descoberta
- Priorização de oportunidades com origem/atualidade claras.
- Separar pesquisa de anúncio identificado, anúncio de comissão confirmada e conversão.
- Estados de indisponibilidade/limites honestos. Nunca mascarar 0 por ausência de dados.

### 4.4 Campanhas e revisão
- Uma ação principal, navegação rápida para texto/link/imagem/aprovação, resumo conciso do estado atual.
- NestAI sempre opcional: títulos e descrições só são aplicados com aprovação.
- Se a resposta for de 2 descrições, rotular a terceira como **alternativa local**, nunca atribuir falsamente à IA.
- Não usar promessas de saúde, desempenho técnico, durabilidade ou economia sem evidência explícita no contrato de dados.
- Seleção de textos e métodos de imagem progressivos. Modo ChatGPT, compositor local e importação mantidos.
- SEO, prompts e dados técnicos sob demanda. Sem eliminar guardas de Reference Lock.
- Pin preview fiel em 1000×1500 2:3, sem texto rasterizado ou foto falsa.

### 4.5 Publicação, Resultados e ferramentas
- Link conferido na conta afiliada, direitos autorais da referência e imagem validados antes de aprovar.
- Publicação manual guiada, registro de URL e métricas rastreáveis.
- Nenhuma automatização de postagem sem requisitos específicos de acesso/autorização.
- Páginas internas compartilham design tokens, navegação, botões, formulários e vazios padronizados.

## 5. Implementação
- `apps/web/src/features/PremiumHomeHero.tsx`: Home editorial e jornada.
- `apps/web/src/premium-experience.css`: camada de design system escopada, importada depois do CSS base.
- `apps/web/src/App.tsx`: Home, Login, sidebar/topbar/bottom-nav, disclosure de evidências/telemetria.
- Hotfix editorial e UX de review existente em PR #82, incorporado nas branches main/production antes deste ciclo.
- Documentação oficial incremental em `docs/specs/`, sem substituir os master docs históricos.

## 6. QA e política de release
- Pré-condições: lint, typecheck, testes unitários/integrados, auditoria de dependências, build e Playwright mobile/desktop.
- Checar larguras 360, 390, 768, 1024, 1440, 1920, alternância light/dark e PT/EN/ES, navegação teclado, a11y WCAG AA automatizada.
- Regressão em Revisão → imagem → aprovação → publicação; não mudar campanhas, Firestore ou links.
- Deploy somente após merge em main e promoção segura main→production. Evitar force-push e migrações destrutivas.
- Verificar status real do Firebase Hosting e resultado dos gates. Falha de CI = bloquear release.

## 7. Limites de garantia
Qualidade visual deve ser revisada também no navegador real. Teste automatizado de a11y não substitui auditoria manual. Publicação bem-sucedida só é afirmada após o workflow de produção concluído e os checks públicos. Sem integração de conta autorizada, vendas/ganhos/comissão não são verificados.

## 8. Próximas iterações recomendadas
- Capturas visuais automatizadas antes/depois para Home, Radar, Review, Publish e Resultados.
- Unificar microcopy/estrutura de empty states em PT/EN/ES.
- Modo compacto da criação, sem repetir descrições inteiras em três lugares.
- Biblioteca de padrões de UI e tokens como fonte reusável no ecossistema MillionsNest.
- Medir taxa de conclusão de fluxo e erros de navegação sem coletar dados pessoais sensíveis.
