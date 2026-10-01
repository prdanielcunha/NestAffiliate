# NestAffiliate — UI/UX Master Design System & Product Experience

**Versão:** 1.0  
**Data:** 30/09/2026  
**Produto:** NestAffiliate  
**Ecossistema:** MillionsNest  
**Documento:** Arquitetura Visual, UX/UI, Responsividade, Contas e Experiência Completa  
**Formato inicial:** Markdown  
**Objetivo:** servir como fonte de verdade visual e funcional para design, frontend e implementação.

---

# 1. Visão de produto

O NestAffiliate deve parecer um **SaaS premium de última geração**, mas nunca sacrificar clareza por estética.

A experiência precisa transmitir simultaneamente:

- inteligência;
- confiança;
- velocidade;
- automação;
- controle;
- modernidade;
- precisão.

O produto não deve parecer:

- ERP;
- painel administrativo antigo;
- dashboard genérico de template;
- ferramenta “de afiliado” cheia de banners;
- sistema confuso com dezenas de menus;
- editor visual estilo Canva;
- app experimental de IA.

O NestAffiliate deve parecer:

> **um operador inteligente que já fez o trabalho e só precisa da aprovação final.**

A estética é premium, tecnológica e editorial.

A UX é simples o suficiente para que uma pessoa leiga consiga operar o sistema sem treinamento.

---

# 2. Princípio central de UX

## Menos cliques. Mais contexto. Menos decisão desnecessária.

Cada tela deve responder:

1. **O que está acontecendo?**
2. **Preciso fazer alguma coisa?**
3. **Qual é a melhor próxima ação?**
4. **Por que o sistema recomenda isso?**
5. **O que acontece depois?**

Nenhum usuário deve precisar “descobrir” o caminho.

A interface deve sempre apresentar:

- contexto;
- recomendação;
- ação principal;
- alternativa;
- explicação opcional.

---

# 3. Personalidade visual

## 3.1 Conceito

**AI Commerce Intelligence**

Mistura de:

- Linear;
- Apple;
- Vercel;
- Stripe;
- Arc;
- Raycast;
- dashboards financeiros premium;
- interfaces de IA modernas.

Mas com identidade própria.

## 3.2 Sensação desejada

Ao abrir o app:

> “Esse sistema está trabalhando por mim.”

Ao revisar uma campanha:

> “Está tudo pronto. Só preciso decidir.”

Ao olhar analytics:

> “Eu entendo exatamente o que está funcionando.”

Ao editar com IA:

> “Posso simplesmente pedir.”

---

# 4. Direção estética

## 4.1 Tema principal

**Dark Premium como experiência principal.**

Fundo:

- carvão quase preto;
- superfícies profundas;
- contraste suave;
- luz sutil;
- gradientes discretos;
- glass somente onde agrega profundidade.

Evitar:

- preto puro em tudo;
- neon exagerado;
- roxo “IA genérica” em excesso;
- bordas brilhantes por todos os lados;
- sombras dramáticas demais.

## 4.2 Light Mode

Também obrigatório.

O light mode deve parecer:

- sofisticado;
- editorial;
- limpo;
- profissional.

Não apenas inverter as cores.

## 4.3 Accent

Usar uma única cor primária forte para:

- CTA principal;
- seleção;
- progresso;
- foco;
- estados positivos controlados.

A cor deve ter versão:

- default;
- hover;
- active;
- soft;
- glow.

Não usar 8 cores competindo na tela.

---

# 5. Sistema de cores

Os valores definitivos devem ser criados como tokens.

Exemplo conceitual:

```css
--bg-canvas
--bg-surface-1
--bg-surface-2
--bg-elevated
--bg-glass

--text-primary
--text-secondary
--text-tertiary
--text-inverse

--border-subtle
--border-default
--border-strong

--accent-primary
--accent-primary-hover
--accent-primary-soft

--success
--warning
--danger
--info

--score-excellent
--score-good
--score-medium
--score-low
```

## 5.1 Regra

Nunca hardcodar cores em componentes.

Tudo por token semântico.

---

# 6. Tipografia

## 6.1 Máximo de duas famílias

### Interface
Fonte sans moderna, altamente legível.

### Display opcional
Uma segunda fonte apenas para:

- números grandes;
- hero;
- headings especiais;
- momentos de marca.

## 6.2 Escala sugerida

```text
Display XL   56–64
Display L    44–52
H1           32–40
H2           26–32
H3           20–24
Body L       17–18
Body         15–16
Body S       13–14
Caption      11–12
```

## 6.3 Mobile

Redução proporcional sem perder hierarquia.

Nunca usar texto abaixo de tamanho confortável.

---

# 7. Grid e espaçamento

Base de 4px.

Escala:

```text
4
8
12
16
20
24
32
40
48
64
80
96
```

Cards devem respirar.

Não empilhar informação.

---

# 8. Radius

Visual contemporâneo, não infantil.

Sugestão:

```text
xs: 8
sm: 12
md: 16
lg: 20
xl: 24
2xl: 32
```

Botões principais:

- 12–16px.

Cards:

- 18–24px.

Modal:

- 24–28px.

---

# 9. Sombras e profundidade

Usar profundidade em camadas:

1. Canvas
2. Surface
3. Elevated
4. Floating
5. Modal

No dark mode:

- sombras suaves;
- borda de luz mínima;
- blur moderado.

No light:

- sombras quase invisíveis;
- bordas suaves.

---

# 10. Glass

Glassmorphism apenas em:

- topbar;
- command palette;
- floating AI bar;
- modal rápido;
- overlays contextuais.

Não usar glass em todos os cards.

---

# 11. Motion Design

Movimento precisa comunicar estado.

## 11.1 Durações

```text
micro: 120–160ms
normal: 180–240ms
panel: 240–320ms
page: 320–420ms
```

## 11.2 Efeitos permitidos

- fade;
- scale sutil;
- slide curto;
- blur in/out;
- number morph;
- progress animation;
- glow leve;
- card elevation.

## 11.3 Proibido

- animações longas;
- bounce infantil;
- excesso de parallax;
- loading sem feedback;
- efeitos que atrasem a tarefa.

## 11.4 Reduced Motion

Respeitar preferência do sistema.

---

# 12. Responsividade

O NestAffiliate deve funcionar perfeitamente em:

- smartphone pequeno;
- smartphone grande;
- tablet portrait;
- tablet landscape;
- notebook;
- desktop;
- ultrawide;
- PWA.

## Breakpoints sugeridos

```text
xs    < 480
sm    480–767
md    768–1023
lg    1024–1279
xl    1280–1535
2xl   1536–1919
3xl   >= 1920
```

Não projetar “desktop e depois adaptar”.

Projetar mobile-first.

---

# 13. Layout responsivo

## Mobile

- bottom navigation;
- header compacto;
- uma coluna;
- cards full width;
- ações principais na zona do polegar;
- preview de Pin com zoom;
- drawers em vez de modals grandes.

## Tablet

- sidebar compacta opcional;
- 2 colunas;
- preview + dados;
- painel lateral inteligente.

## Desktop

- sidebar fixa;
- content max-width inteligente;
- 12-column grid;
- review com preview à esquerda e decisão à direita.

## Ultrawide

Não esticar conteúdo indefinidamente.

Usar:

- max-width;
- painéis auxiliares;
- activity rail;
- analytics comparativos.

---

# 14. Navegação global

## 14.1 Desktop

Sidebar:

1. **Hoje**
2. **Radar**
3. **Campanhas**
4. **Resultados**

Separador.

5. **Biblioteca**
6. **Boards**
7. **Conexões**

Bottom:

- Ajuda;
- Configurações;
- Perfil/organização.

## 14.2 Mobile

Bottom navigation com 4 itens:

1. Hoje
2. Radar
3. Campanhas
4. Resultados

Menu/avatar:

- Biblioteca
- Boards
- Conexões
- Configurações
- Ajuda
- Conta

---

# 15. Command Bar global

Elemento premium essencial.

Atalho desktop:

`⌘ K` / `Ctrl K`

Mobile:

botão flutuante discreto.

Permite:

- procurar campanha;
- procurar produto;
- trocar marketplace;
- “criar campanha”;
- “mostrar oportunidades”;
- “publicar próximo Pin”;
- “abrir configurações”;
- “conectar Pinterest”;
- comandos em linguagem natural.

Exemplo:

> “Me mostre campanhas de cozinha com NestScore acima de 90.”

---

# 16. AI Action Bar

Barra contextual em telas de campanha.

Placeholder:

> **Peça qualquer alteração…**

Exemplos rápidos:

- Mais premium
- Trocar produto
- Outra headline
- Menos texto
- Refazer
- Ver alternativas

No mobile:

fica acima da área segura inferior.

No desktop:

fica fixa no rodapé do workspace de revisão.

---

# 17. Tela de Login

## 17.1 Visual

Minimalista.

Lado esquerdo desktop:

- marca;
- mensagem;
- motion/visual abstrato sutil.

Lado direito:

- card de login.

Mobile:

uma coluna.

## 17.2 CTA

**Continuar com Google**

Evitar múltiplos fluxos se não forem necessários.

## 17.3 Sessão

Se já autenticado no MillionsNest:

> **Continuar como Daniel**

Um clique.

## 17.4 Estados

- loading;
- account resolving;
- organization resolving;
- access denied;
- retry.

Nunca cair em loop visual.

---

# 18. Banco de dados — contas e organização

O design deve refletir uma estrutura real de conta.

## 18.1 Entidades

```text
users
organizations
memberships
profiles
providerConnections
affiliateAccounts
pinterestAccounts
userPreferences
organizationSettings
sessions/audit metadata
```

## 18.2 User

```ts
User {
  id
  email
  displayName
  avatarUrl
  locale
  timezone
  createdAt
  lastLoginAt
}
```

## 18.3 Organization

```ts
Organization {
  id
  name
  slug
  ownerUserId
  plan
  status
  locale
  timezone
  createdAt
}
```

## 18.4 Membership

```ts
Membership {
  userId
  organizationId
  role
  status
}
```

## 18.5 Roles

- owner
- admin
- editor
- viewer

Futuro:

- analyst
- approver

---

# 19. UX de organização

Se usuário pertence a uma organização apenas:

não perguntar qual organização.

Entrar direto.

Se pertence a várias:

mostrar switcher compacto no avatar.

Não criar tela desnecessária.

---

# 20. Onboarding

O onboarding deve ser curto, contextual e progressivo.

Não usar 15 telas antes de mostrar valor.

## 20.1 Etapa 1 — Bem-vindo

Headline:

> **Seu novo operador de afiliados.**

Texto:

> O NestAffiliate encontra oportunidades, prepara campanhas e deixa você apenas com a decisão final.

CTA:

**Começar**

---

# 21. Onboarding — escolha de objetivo

Pergunta:

> **Como você quer começar?**

Cards:

### Automático
Recomendado.

> O NestAffiliate escolhe oportunidades e prepara tudo.

### Explorar
> Você escolhe o tema e o sistema faz o resto.

Default:

**Automático**

---

# 22. Onboarding — canal inicial

Mostrar:

### Pinterest
Ativo / principal.

Outros canais:

“em breve” ou ocultos.

Não poluir.

---

# 23. Onboarding — marketplaces

Cards:

### Mercado Livre
Conectar/configurar.

### Shopee
Conectar/configurar.

### Amazon
**Depois**

Explicar em uma frase cada.

---

# 24. Onboarding — nicho inicial

Pré-selecionado:

**Casa & Organização**

Permitir editar.

Mas não obrigar a criar dezenas de categorias.

---

# 25. Onboarding — boards

Tela inteligente:

> **Criamos a estrutura inicial recomendada.**

Lista com:

- Cozinha Pequena e Organizada
- Organização de Cozinha
- Casa Bonita Gastando Pouco
- etc.

Ações:

- Aprovar tudo
- Editar
- Remover

CTA:

**Usar esta estrutura**

---

# 26. Onboarding — modo de IA

Explicar claramente:

### Zero Cost
Ativo.

- Creative Engine local
- IA gratuita quando disponível
- prompts prontos para ChatGPT
- nenhuma API paga

Badge:

**R$0**

---

# 27. Onboarding — final

Tela:

> **Tudo pronto. Agora o NestAffiliate trabalha.**

CTA:

**Ver minhas primeiras oportunidades**

Não mostrar configurações técnicas.

---

# 28. Home — “Hoje”

Tela mais importante.

## 28.1 Hero

Desktop:

```text
Bom dia, Daniel.

NestAffiliate trabalhou por você.
```

Resumo em linha:

```text
6.284 produtos observados
27 oportunidades analisadas
3 campanhas prontas
```

CTA:

**Revisar 3 campanhas**

---

# 29. Home — prioridade

Primeiro bloco:

## Precisa de você

Cards compactos:

### Campanha 1
- preview;
- NestScore;
- produto;
- marketplace;
- motivo;
- CTA.

### Campanha 2
...

Se não há nada:

> **Tudo em dia.**
> O NestAffiliate continua analisando oportunidades.

---

# 30. Home — atividade inteligente

Segundo bloco:

## O que aconteceu

Timeline resumida:

- Produto substituído
- Nova oportunidade detectada
- Pin publicado ganhou tração
- Link revalidado

Não transformar em log técnico.

---

# 31. Home — resultado

Card:

### Este mês

- Receita
- Cliques
- Pins
- EPM

Mostrar tendência.

Sem gráficos demais.

---

# 32. Radar

## 32.1 Objetivo

Mostrar oportunidades, não toneladas de dados.

## 32.2 Top area

Headline:

> **Oportunidades**

Subheadline:

> O que vale sua atenção agora.

Filtros em chips:

- Todos
- Casa
- Cozinha
- Banheiro
- ML
- Shopee
- Alta confiança

---

# 33. Opportunity Card

Visual premium.

Elementos:

- imagem temática/produto;
- keyword;
- NestScore;
- Confidence;
- marketplace;
- estimativa de potencial;
- motivo em 1 linha;
- chip “Novo”, “Em alta”, “Evergreen”.

CTA:

**Ver oportunidade**

Secondary:

`•••`

---

# 34. Opportunity Detail

Desktop:

2 colunas.

Esquerda:

- visão;
- produto recomendado;
- dados.

Direita:

- motivos;
- riscos;
- alternativas;
- CTA.

## CTA principal

**Criar campanha**

Mas se o sistema já criou:

**Ver campanha pronta**
---

# 35. NestScore UI

Não mostrar apenas “92”.

Mostrar:

```text
92
Excelente oportunidade
Confiança alta
```

Ao expandir:

```text
Trend        17/18
Intent       15/16
Visual       14/14
Yield        12/14
Quality      11/12
Competition   9/10
Creative      8/8
Seasonality   3/4
Confidence    3/4
```

Tooltip:

explica cada item.

---

# 36. Campanhas

Tabs:

- **Para revisar**
- Aprovadas
- Publicadas
- Arquivadas

Default:

Para revisar.

Filtros escondidos em botão.

---

# 37. Review Workspace — Desktop

Estrutura:

```text
┌───────────────────────────┬──────────────────────────┐
│                           │                          │
│        PIN PREVIEW        │      DECISION PANEL      │
│                           │                          │
│                           │ Product                  │
│                           │ Why this                 │
│                           │ Title                    │
│                           │ Description              │
│                           │ Board                    │
│                           │ Link                     │
│                           │                          │
└───────────────────────────┴──────────────────────────┘
        AI ACTION BAR FIXA
```

---

# 38. Review Workspace — Mobile

Fluxo vertical:

1. preview;
2. score;
3. produto;
4. por quê;
5. copy;
6. board;
7. ações.

Sticky bottom:

**Aprovar**

Secondary:

**Editar**

More:

- Trocar produto
- Refazer
- Descartar

---

# 39. Preview do Pin

Deve parecer exatamente com o arquivo final.

Recursos:

- zoom;
- full screen;
- alternar “Pinterest Preview”;
- mostrar safe areas;
- comparar versão anterior;
- abrir imagem.

---

# 40. Decision Panel

Blocos colapsáveis.

### Produto
produto + marketplace + reputação.

### Por que escolhemos
3–5 motivos.

### Conteúdo
title + description.

### Pinterest
board + tópicos + alt.

### Link
status.

### Publicação
horário.

Somente detalhes importantes abertos.

---

# 41. Ações principais

Ação 1:

**Aprovar**

Ação 2:

**Editar**

Ações secundárias:

- trocar produto;
- gerar alternativa;
- descartar.

Não usar 8 botões iguais.

---

# 42. Editar

Ao clicar:

abrir **AI Edit Drawer**.

Input:

> O que quer mudar?

Quick actions:

- Mais clean
- Mais premium
- Trocar headline
- Outro produto
- Outra composição
- Sem preço
- Menos texto

---

# 43. Editor manual avançado

Existe, mas escondido.

Botão:

**Editar manualmente**

Permite:

- headline;
- subheadline;
- board;
- título;
- descrição;
- alt;
- CTA;
- asset;
- layout.

Não virar Canva.

---

# 44. Trocar produto

Bottom sheet/modal.

Topo:

> **Melhores alternativas**

Cards:

### Recomendado
- produto;
- preço;
- marketplace;
- reputação;
- NestScore delta.

### Mais barato

### Melhor reputação

### Melhor comissão

CTA:

**Trocar por este**

O sistema refaz links e metadados automaticamente.

---

# 45. Refazer

Modal simples:

> **O que quer manter?**

Checkboxes:

- produto;
- tema;
- board.

Default:

tema mantido.

Quick choices:

- Novo visual
- Novo ângulo
- Novo produto
- Refazer tudo

---

# 46. Descartar

Um clique abre chips opcionais:

- Produto ruim
- Visual
- Copy
- Repetitivo
- Comissão
- Não gostei

Botão:

**Descartar**

Não exigir texto.

---

# 47. Aprovação

Ao aprovar:

microanimation de check.

Mensagem:

> **Aprovado. Preparando publicação…**

Sem tela intermediária desnecessária.

Vai direto para:

**Pronto para publicar**

---

# 48. Pronto para publicar

Tela extremamente prática.

Hero:

> **Seu Pin está pronto.**

Status:

- imagem ✓
- link ✓
- board ✓
- disclosure ✓
- compliance ✓

Preview.

---

# 49. Publish Package

## Imagem

**Baixar imagem**

Nome:

`cozinha-pequena-organizador-giratorio-01.png`

## Título

campo read-only + botão copiar.

## Descrição

campo + copiar.

## Link

campo + copiar.

## Pasta

**Cozinha Pequena e Organizada**

Se não existir:

> Crie esta pasta.

Botão:

**Copiar nome**

## Tópicos

chips.

## Alt text

campo + copiar.

---

# 50. Modo Guiado

CTA principal:

**Publicar passo a passo**

Abre fluxo full screen.

---

# 51. Modo Guiado — Mobile

Etapa 1:

> **Baixe sua imagem**

Botão.

Etapa 2:

> **Abra o Pinterest**

Botão deep link quando possível.

Etapa 3:

> **Crie um Pin**

Imagem ilustrativa opcional.

Etapa 4:

> **Envie este arquivo**

Mostrar nome.

Etapa 5:

> **Cole o título**

Botão copiar.

Etapa 6:

> **Cole descrição e link**

Etapa 7:

> **Salve na pasta**
> Cozinha Pequena e Organizada

Etapa 8:

> **Publique**

Etapa final:

**Marcar como publicado**

---

# 52. Modo Guiado — Desktop

Split view:

esquerda:

- checklist.

direita:

- package.

Permitir completar sem sair da página, abrindo Pinterest em nova aba.

---

# 53. Fluxo Shopee

Se campanha Shopee:

banner contextual:

> **Esta campanha usa a integração Shopee + Pinterest.**

Passos adaptados:

1. criar Pin;
2. upload;
3. copy;
4. Marcar produtos;
5. pesquisar produto indicado;
6. conferir;
7. salvar na pasta;
8. publicar.

Mostrar até 5 produtos quando campanha for collection.

---

# 54. Biblioteca

Não é menu principal inicial.

Contém:

- produtos;
- assets;
- templates;
- prompts;
- histórico visual.

Tabs:

**Produtos | Criativos | Templates**

---

# 55. Product Library

Cards simples.

Mostrar:

- produto;
- marketplace;
- disponibilidade;
- último uso;
- performance;
- status.

Pesquisa inteligente.

Filtros escondidos.

---

# 56. Creative Library

Grid visual.

Hover desktop:

- campanha;
- resultado;
- template.

Mobile tap.

Filtros:

- melhor CTR;
- melhor EPM;
- recente;
- categoria.

---

# 57. Boards

Tela visual.

Cada board:

- nome;
- descrição;
- quantidade de Pins;
- performance;
- estado de conexão.

CTA:

**Criar board**

Mas o sistema deve criar/sugerir automaticamente quando necessário.

---

# 58. Conexões

Cards grandes.

### Pinterest
Status.

### Mercado Livre
Status.

### Shopee
Status.

### Gemini
Free mode.

### ChatGPT
Manual Studio.

### OpenAI
Future / Off.

Cada card:

- status;
- última sincronização;
- ação.

Não mostrar credenciais.

---

# 59. IA

Settings simplificada.

Topo:

### Modo atual

**Zero Cost**

Texto:

> Nenhum serviço de IA paga será usado.

Toggle bloqueado por owner:

**Bloquear serviços pagos**

Ativo.

---

# 60. AI Provider UI

Mostrar:

### Gemini Free
Ativo.

### ChatGPT Manual
Disponível.

### OpenAI API
Desativada.

Badge:

**Futuro**

Não pedir API key no onboarding.

---

# 61. Prompt Studio

Tela premium.

Preview do prompt.

Tabs:

- Imagem
- Copy
- Análise

Botões:

**Copiar para ChatGPT**

**Copiar para Gemini**

**Copiar prompt**

Depois:

**Importar resultado**

---

# 62. Importar imagem de IA

Drag & drop.

Validação visual:

- proporção;
- resolução;
- qualidade;
- formato.

Se errado:

> Ajustaremos automaticamente.

CTA:

**Usar esta imagem**

Depois o app aplica:

- crop;
- headline;
- branding;
- export.

---

# 63. Resultados

Não fazer dashboard com 20 gráficos.

Topo:

### Receita
### EPM
### Cliques
### Vendas

Período:

7 dias / 30 dias / mês / personalizado.

---

# 64. Resultado — principais insights

Cards de IA:

> **Pins de lista estão gerando 32% mais outbound clicks.**

> **Cozinha pequena tem o maior EPM neste mês.**

> **Shopee está convertendo melhor em produtos abaixo de R$100.**

Sempre explicar de onde vem.

---

# 65. Resultado — gráficos

Máximo de 1–2 gráficos por tela.

Exemplos:

- receita no tempo;
- EPM por categoria.

Detalhes em drill-down.

---

# 66. Resultados por Pin

Tabela responsiva.

Desktop:

```text
Pin | Impressões | Cliques | Vendas | Receita | EPM
```

Mobile:

cards.

Ordenação.

---

# 67. Resultados por Board

Mostrar:

- board;
- Pins;
- CTR;
- EPM;
- receita.

CTA:

**Ver oportunidades semelhantes**

---

# 68. Results → Action

Analytics deve gerar ação.

Exemplo:

> **Cozinha pequena está acima da média.**

CTA:

**Encontrar mais oportunidades**

Nunca deixar dados sem próximo passo.

---

# 69. Empty States

Devem ser úteis.

## Sem campanhas

> **Nada precisa da sua atenção agora.**
> O NestAffiliate está analisando oportunidades.

## Sem conexão

> **Conecte o Pinterest para acompanhar seus Pins.**

CTA.

## Sem resultado

> **Ainda é cedo para comparar performance.**
> Publique alguns Pins para começarmos a aprender.

---

# 70. Loading States

Nunca spinner gigante solitário.

Usar:

- skeleton;
- progress label;
- streaming text quando IA;
- etapas.

Exemplo:

```text
Analisando produto…
Comparando ofertas…
Preparando campanha…
```

---

# 71. Error States

Erros devem ser humanos.

Ruim:

`HTTP 429 Provider Error`

Bom:

> **O Gemini atingiu a cota gratuita por hoje.**
> O NestAffiliate continuará usando o modo local. Você também pode gerar esta etapa no ChatGPT com o prompt pronto.

CTA:

**Gerar prompt**

---

# 72. Toasts

Curtos.

- Campanha aprovada.
- Link copiado.
- Produto substituído.
- Board salvo.
- Imagem baixada.

Não usar toast para informação crítica.

---

# 73. Confirmation Dialogs

Só em ações destrutivas.

Não confirmar:

- copiar;
- baixar;
- aprovar quando reversível antes de publicar.

Confirmar:

- excluir;
- remover integração;
- apagar campanha;
- desconectar conta.

---

# 74. Sistema de componentes

## Base

- Button
- IconButton
- Input
- Textarea
- Select
- Combobox
- Checkbox
- Radio
- Switch
- Slider
- Tooltip
- Popover
- Drawer
- Modal
- Sheet
- Dropdown
- Tabs
- Segmented Control
- Badge
- Chip
- Avatar
- Skeleton
- Toast
- Progress
- EmptyState

---

# 75. Componentes do produto

- OpportunityCard
- NestScore
- ConfidenceBadge
- ProductCard
- OfferCompare
- CampaignCard
- PinPreview
- AIActionBar
- EditWithAI
- PublishPackage
- GuidedStep
- BoardSuggestion
- ComplianceStatus
- LinkHealth
- QuotaMeter
- ProviderStatus
- MetricCard
- InsightCard
- TimelineEvent
- CreativeVersionSwitcher

---

# 76. Botões

Hierarquia:

### Primary
1 por contexto.

### Secondary
apoio.

### Ghost
ações leves.

### Danger
somente destrutivo.

Nunca 4 CTAs primários lado a lado.

---

# 77. Ícones

Ícones funcionais apenas.

Nada decorativo sem propósito.

Todos:

- mesma família;
- mesmo peso;
- mesma grade.

---

# 78. Tooltips

Usar para:

- NestScore;
- Confidence;
- EPM;
- tracking;
- compliance.

Não esconder ação essencial em tooltip.

---

# 79. Mobile ergonomics

Ações principais na parte inferior.

Touch target:

mínimo confortável.

Preview:

tap para full screen.

Copy buttons:

grandes.

Não usar hover como requisito.

---

# 80. One-thumb mode

Tela de revisão mobile deve permitir:

- aprovar;
- editar;
- trocar;
- avançar;

sem precisar alcançar topo da tela.

Sticky action area.

---
# 81. Tablet experience

Tablet deve ser premium, não “mobile esticado”.

Usar:

- split panels;
- preview maior;
- drawer de edição;
- side navigation compacta.

---

# 82. Desktop keyboard UX

Atalhos:

```text
A = Aprovar
E = Editar
R = Refazer
S = Trocar produto
← / → = campanha anterior/próxima
⌘K = Command
Esc = Fechar
```

Mostrar apenas para usuários avançados.

---

# 83. Accessibility

- WCAG AA;
- focus visible;
- teclado;
- screen reader;
- labels;
- contraste;
- sem depender de cor;
- reduced motion;
- text scaling;
- aria-live em etapas de IA.

---

# 84. Internacionalização

UI pronta para:

- pt-BR;
- en;
- es.

Layouts não podem quebrar com texto maior.

Evitar largura fixa de botão por texto.

---

# 85. Timezone e moeda

Configuração por organização.

Exemplo:

- América/São_Paulo;
- BRL.

Dados de marketplace exibidos na moeda local.

---

# 86. Segurança visual

Nunca mostrar:

- token;
- secret;
- client secret;
- API key.

Campos sensíveis:

- mascarados;
- rotacionáveis;
- auditados.

---

# 87. Conta do usuário

Página:

**Conta**

- nome;
- e-mail;
- avatar;
- idioma;
- fuso;
- aparência.

Não misturar com organização.

---

# 88. Organização

Página:

**Workspace**

- nome;
- slug;
- membros;
- roles;
- conexões;
- segurança;
- auditoria.

---

# 89. Membros

Tabela simples.

Desktop:

Nome | E-mail | Role | Status

Mobile:

cards.

Ação:

**Convidar membro**

Futuro SaaS.

---

# 90. Preferências editoriais

Tela opcional.

Exemplos:

- usar preço no criativo;
- evitar pessoas;
- preferir fundo claro;
- densidade de texto;
- marketplace preferido;
- faixa de preço;
- categorias bloqueadas.

O sistema pode sugerir preferências baseado no comportamento.

---

# 91. Learned Preferences

Card:

> **Percebemos uma preferência**

> Você removeu preços de 9 campanhas recentes.

CTA:

**Nunca mostrar preço**

Secondary:

**Continuar perguntando**

---

# 92. Notification Center

Somente notificações importantes:

- campanha pronta;
- produto indisponível;
- integração caiu;
- política mudou;
- Pin com desempenho anormal;
- cota acabando.

Nada de spam.

---

# 93. Notification severity

- Info
- Action
- Warning
- Critical

Critical:

sempre persistente até resolvido.

---

# 94. Policy Watch UI

Card em Configurações/Compliance.

Exemplo:

> **Pinterest atualizou uma política**
> Entrada em vigor: 12/11/2026

CTA:

**Ver impacto**

Não despejar texto jurídico.

Mostrar:

- o que mudou;
- impacto;
- se exige ação.

---

# 95. Compliance UI

Na campanha:

badge:

**Pronto**

ou:

**Atenção**

ou:

**Bloqueado**

Ao abrir:

- disclosure;
- asset;
- link;
- claim;
- duplicação.

---

# 96. Estados do link

- valid;
- stale;
- unavailable;
- redirected;
- unknown.

Visual simples.

---

# 97. Product unavailable UX

Banner:

> **O produto ficou indisponível.**

Logo abaixo:

> Encontramos uma alternativa melhor.

Preview.

CTA:

**Aprovar troca**

Secondary:

**Ver outras opções**

---

# 98. Offline / rede ruim

PWA deve:

- manter navegação básica;
- mostrar dados cacheados;
- guardar edits localmente;
- sincronizar depois;
- não fingir que publicou.

Banner:

> **Você está offline. Alterações serão sincronizadas quando a conexão voltar.**

---

# 99. Performance UX

Objetivo:

- primeira tela útil rapidamente;
- skeleton instantâneo;
- imagens progressivas;
- ações otimistas quando seguras.

Não bloquear tela inteira para uma operação secundária.

---

# 100. Design tokens técnicos

Estrutura sugerida:

```ts
tokens = {
  color: {},
  typography: {},
  spacing: {},
  radius: {},
  shadow: {},
  motion: {},
  zIndex: {},
  breakpoint: {}
}
```

Exportar para:

- CSS variables;
- TypeScript;
- Figma futuramente.

---

# 101. Z-index

Definir escala.

Exemplo:

```text
base
sticky
dropdown
popover
drawer
modal
command
toast
```

Evitar `z-index: 999999`.

---

# 102. Safe areas

Mobile iOS/Android.

Usar:

- `env(safe-area-inset-bottom)`
- `env(safe-area-inset-top)`

Bottom actions nunca atrás de home indicator.

---

# 103. Browser support

Prioridade:

- Chrome;
- Safari;
- Edge;
- Firefox moderno.

PWA:

- Android;
- iOS Safari add-to-home;
- desktop installable.

---

# 104. Microcopy

Tom:

- claro;
- inteligente;
- confiante;
- curto.

Ruim:

> “Submeter campanha para processamento”

Bom:

> **Preparar campanha**

Ruim:

> “Execução concluída com sucesso”

Bom:

> **Pronto.**

---

# 105. Explicações contextuais

Usar:

- “Por que isso?”
- “Como calculamos?”
- “O que acontece depois?”

Evitar páginas de documentação para coisas simples.

---

# 106. Help Mode

Toggle opcional:

**Mostrar dicas**

Quando ativo:

- tooltips;
- explicações;
- mini tutoriais.

Depois usuário pode desligar.

---

# 107. First-run Coachmarks

Máximo de 3 por tela.

Exemplo Review:

1. Aqui está o Pin.
2. Peça qualquer alteração aqui.
3. Quando gostar, aprove.

Depois desaparecem.

---

# 108. UX de busca

Busca global por:

- produto;
- keyword;
- campanha;
- board;
- marketplace.

Search as you type.

Normalizar:

- acentos;
- plural;
- símbolos;
- variações.

---

# 109. Filtros

Não mostrar painel fixo complexo.

Desktop:

botão **Filtros**.

Mobile:

bottom sheet.

Chips dos filtros ativos.

Botão:

**Limpar**

---

# 110. Datas

Usar linguagem natural quando útil:

- Hoje
- Ontem
- há 2 dias

E data completa em tooltip/detalhe.

---

# 111. Números

Formatar:

- `R$ 1.234,56`
- `12,4 mil`
- `%`

Não mostrar casas decimais desnecessárias.

---

# 112. Status de automação

No header:

pequeno indicador.

Exemplo:

**Automação ativa**

Ao clicar:

- última execução;
- próximo ciclo;
- erros;
- modo zero-cost.

---

# 113. “Nest is working”

Microexperiência premium.

Quando análise ativa:

pequeno orb/indicator animado.

Tooltip:

> NestAffiliate está analisando novas oportunidades.

Não usar mascote infantil.

---

# 114. Nocturnal / background summary

Home pode mostrar:

> **Enquanto você estava fora**
> 184 produtos mudaram
> 7 oportunidades foram descartadas
> 3 campanhas foram preparadas

Sensação de autonomia.

---

# 115. Creative quality meter

Opcional e discreto.

Avalia:

- legibilidade;
- contraste;
- densidade;
- safe area;
- asset quality.

Não substituir avaliação humana.

---

# 116. Before / After edit

Quando IA altera:

slide ou compare.

Botões:

- Antes
- Depois

CTA:

**Usar nova versão**

---

# 117. Version history

Bottom sheet:

```text
v4 Atual
v3 Mais clean
v2 Produto trocado
v1 Inicial
```

Um toque restaura.

---

# 118. Designer Mode futuro

Não no MVP.

Pode permitir:

- brand kit;
- template editor;
- custom components.

Mas não misturar na interface principal.

---

# 119. Brand Kit

MVP básico:

- logo;
- accent;
- fonts;
- watermark;
- footer/disclosure style.

A marca pública “Achados do Nest” já vem com preset.

---

# 120. Achados do Nest — identidade do Pin

Objetivo:

parecer conteúdo editorial.

Assinatura discreta.

Não usar logo gigante.

Elementos:

- micro wordmark;
- accent;
- composição;
- tipografia.

---

# 121. Pinterest Preview Mode

Simular:

- crop;
- title snippet;
- account;
- board context.

Aviso:

> O Pinterest pode alterar a apresentação final.

---

# 122. Ações pós-publicação

Após marcar publicado:

Tela:

> **Publicado. Agora acompanhamos.**

Mostrar:

- data;
- produto;
- board;
- link;
- status.

CTA secundário:

**Ver campanha**

---

# 123. Analytics loading

Enquanto não há dados:

não mostrar zeros como fracasso.

Mostrar:

> **Aguardando dados do Pinterest.**

---

# 124. Data freshness

Mostrar quando importante:

> Atualizado há 8 min.

Preço:

> Verificado há 12 min.

Não exibir em tudo.

---

# 125. Banco — entidades visuais

Além de conta:

```text
boards
products
productOffers
opportunities
campaigns
campaignVersions
creativeAssets
approvalEvents
publicationPackages
publications
performanceDaily
affiliateResults
learningSignals
policySnapshots
quotaUsage
auditEvents
```

Cada tela deve consumir uma entidade clara.

---

# 126. UX ↔ banco

## Home
- opportunities
- campaigns
- auditEvents
- performanceDaily

## Radar
- opportunities
- opportunityScores
- productOffers

## Review
- campaigns
- campaignVersions
- creativeAssets

## Publish
- publicationPackages
- boards

## Results
- publications
- performanceDaily
- affiliateResults

## Learning
- learningSignals
- userPreferences

---

# 127. Campanha como fonte de verdade

Nunca salvar copy e asset desconectados.

Campaign contém referências para:

- product;
- creative;
- copy;
- board;
- score;
- publication.

Versionar.

---

# 128. Autosave

Toda edição:

salva automaticamente.

Mostrar:

**Salvo**

Não botão “Salvar” para cada campo.

---

# 129. Undo

Após ação reversível:

toast:

> Produto trocado. **Desfazer**

Melhor que modal de confirmação.

---

# 130. Importante: menos cliques

Metas de UX:

## Aprovar campanha
Home → Review → Aprovar

**2 cliques principais.**

## Trocar produto
Review → Trocar → Selecionar

**2–3 ações.**

## Publicar manualmente
Approve → Package → Guided Mode.

Sem navegar por menus.

## Editar headline
Review → pedir → aceitar.

2–3 ações.

---

# 131. Smart defaults

O sistema escolhe:

- board;
- template;
- headline;
- horário;
- marketplace;
- related topics;
- alt.

Usuário edita apenas se quiser.

---

# 132. Progressive automation

Primeiro dia:

mais explicação.

Décimo dia:

menos.

Após domínio:

modo compacto.

Interface se adapta à maturidade do usuário.

---

# 133. App Shell

## Desktop

```text
┌ Sidebar ┬─────────────────────────────────────────────┐
│         │ Topbar                                      │
│         ├─────────────────────────────────────────────┤
│         │                                             │
│         │ Content                                     │
│         │                                             │
│         └─────────────────────────────────────────────┘
```

## Mobile

```text
┌─────────────────┐
│ Header          │
│                 │
│ Content         │
│                 │
│                 │
├─────────────────┤
│ Bottom Nav      │
└─────────────────┘
```

---

# 134. Topbar

Desktop:

- page title;
- optional context;
- automation status;
- notifications;
- avatar.

Mobile:

- title;
- status;
- avatar.

Não adicionar search fixo se Command Bar resolve.

---

# 135. Sidebar

Collapsed mode:

icons.

Expanded:

labels.

Largura não excessiva.

Manter estado por usuário.

---

# 136. Cards

Tipos:

- action card;
- metric card;
- preview card;
- insight card;
- status card.

Nunca transformar tudo em card.

---

# 137. Tables

Use somente quando tabela for realmente melhor.

Mobile:

transformar em cards ou rows stacked.

Não fazer horizontal scroll como experiência principal.

---

# 138. Modal vs Drawer

### Modal
decisão curta.

### Drawer
edição/contexto.

### Full screenworkflow complexo.

---

# 139. Empty canvas

Evitar telas mortas.

Sempre:

- explicar;
- sugerir;
- CTA.

---

# 140. Premium details

- subtle cursor spotlight apenas desktop e muito suave;
- glass topbar;
- animated numeric counters;
- soft highlight ao aprovar;
- preview morph;
- intelligent skeleton;
- accent glow em NestScore alto;
- micro particles não usar.

---

# 141. “Wow” moments

## Primeiro
Ao concluir onboarding:

Dashboard já mostra análise pronta.

## Segundo
Ao clicar “Mais premium”:

preview se transforma suavemente.

## Terceiro
Ao aprovar:

package aparece pronto sem nova configuração.

## Quarto
Analytics:

> “Esse estilo está gerando 41% mais receita por mil impressões.”

---

# 142. Anti-gimmick rule

Se efeito:

- atrasa;
- confunde;
- polui;
- reduz contraste;
- distrai;

remover.

Premium não é excesso.

---

# 143. Design QA checklist

Antes de cada release:

- mobile 360px;
- mobile 390px;
- tablet;
- 1024;
- 1366;
- 1440;
- 1920;
- dark;
- light;
- pt-BR;
- en;
- keyboard;
- reduced motion;
- text zoom;
- slow network.

---

# 144. UX QA checklist

- usuário sabe próximo passo?
- CTA principal óbvio?
- pode voltar?
- ação é reversível?
- erro é explicado?
- loading informa?
- empty state ajuda?
- há clique desnecessário?
- sistema poderia escolher sozinho?
- dado técnico está sendo exibido sem necessidade?

---

# 145. Accessibility QA

- contrast;
- tab order;
- focus trap;
- aria labels;
- semantic headings;
- buttons not divs;
- status announcements;
- color independent.

---

# 146. Visual regression

Snapshots:

- Login
- Today
- Radar
- Review
- Publish Package
- Results
- Mobile nav
- Light/dark.

---

# 147. Design system no código

Componentes devem viver em:

```text
packages/ui
```

Com:

- Storybook ou equivalente;
- tokens;
- states;
- variants;
- docs.

---

# 148. Figma futuro

Quando criado:

Estrutura:

```text
00 Foundations
01 Tokens
02 Components
03 Patterns
04 Screens Mobile
05 Screens Tablet
06 Screens Desktop
07 Prototypes
08 Assets
```

Variáveis conectadas a:

- colors;
- spacing;
- radius;
- typography.

---

# 149. Principal fluxo completo — operação diária

## Passo 1
Usuário abre app.

## Passo 2
Home mostra 3 campanhas prontas.

## Passo 3
Usuário toca “Revisar”.

## Passo 4
Vê Pin e motivo.

## Passo 5
Aprova ou pede mudança.

## Passo 6
Se pedir mudança, sistema refaz.

## Passo 7
Aprova.

## Passo 8
App vai para “Pronto para publicar”.

## Passo 9
Mostra imagem, title, description, link e board.

## Passo 10
Usuário segue modo guiado ou futura API publica.

## Passo 11
NestAffiliate acompanha.

Nenhum passo extra.

---

# 150. Fluxo de edição

1. Review.
2. Campo “Peça qualquer alteração”.
3. Usuário escreve.
4. App mostra o que entendeu.
5. Executa.
6. Mostra nova versão.
7. Usuário usa ou desfaz.

---

# 151. Fluxo de troca

1. Trocar produto.
2. Sistema traz melhores opções.
3. Usuário escolhe.
4. App atualiza:
   - asset;
   - link;
   - copy factual;
   - marketplace;
   - score;
   - compliance.
5. Preview novo.
6. Aprovar.

---

# 152. Fluxo zero-cost de imagem

1. Creative Engine tenta resolver internamente.
2. Se usuário quer visual generativo:
3. “Gerar em outra IA”.
4. App monta prompt.
5. Abrir ChatGPT/Gemini.
6. Usuário gera.
7. Importa.
8. NestAffiliate finaliza o Pin.

---

# 153. Fluxo futuro OpenAI

Mesma UX.

Diferença:

botão “Gerar em outra IA” pode virar:

**Gerar automaticamente**

Nada muda na arquitetura visual.

---

# 154. Estado “Conta não conectada”

Exemplo Pinterest:

> **Conecte o Pinterest para acompanhar performance e publicar automaticamente no futuro.**

CTA:

**Conectar Pinterest**

Secondary:

**Continuar manualmente**

Não bloquear o MVP.

---

# 155. Estado “Cota free acabou”

Banner não alarmista:

> **A cota gratuita de IA terminou por hoje.**
> O NestAffiliate continua funcionando com o modo local.

CTA:

**Usar ChatGPT com prompt pronto**

---

# 156. Estado “Tudo funcionando”

Não mostrar status técnico excessivo.

Indicador:

**Tudo certo**

Ao clicar:

- connections;
- provider;
- sync.

---

# 157. Estado crítico

Exemplo:

> **Pinterest desconectou.**
> Precisamos reconectar para continuar trazendo métricas.

CTA:

**Reconectar**

---

# 158. Dados sensíveis

Settings:

nunca revelar secret.

Mostrar:

`••••••••••••abcd`

Ação:

**Substituir chave**

---

# 159. Audit log

Somente admin/owner.

Visual:

- data;
- pessoa;
- ação;
- objeto.

Busca.

Não precisa ser tela principal.

---

# 160. Owner controls

Owner pode:

- bloquear paid AI;
- definir marketplaces;
- pausar automação;
- gerenciar membros;
- mudar domínio/config;
- definir limites.

---

# 161. Cost Control UI

Card:

## Custos

```text
Modo Zero Cost: ATIVO
IA paga: bloqueada
Gemini Free: 42% da cota
OpenAI API: desativada
```

CTA:

**Ver detalhes**

---

# 162. Quota meter

Não mostrar tokens para leigo.

Mostrar:

- uso baixo;
- médio;
- perto do limite.

Detalhes técnicos expandíveis.

---

# 163. Pricing futuro

Não construir na UI agora.

Arquitetura pronta.

---

# 164. Performance mobile

Evitar:

- blur pesado em todos elementos;
- vídeo contínuo;
- canvas gigante;
- animações contínuas;
- imagens full-res desnecessárias.

Premium precisa continuar rápido.

---

# 165. PWA

Install prompt contextual.

Não no primeiro segundo.

Depois de uso:

> **Instalar NestAffiliate**
> Acesse suas campanhas mais rápido.

---

# 166. Push notifications

Futuro e opt-in.

Somente:

- campanha pronta;
- produto crítico;
- integração;
- resultado excepcional.

---

# 167. Theme behavior

Default:

seguir sistema ou manter preferência.

Usuário escolhe:

- Dark
- Light
- System

---

# 168. Visual identity final

O NestAffiliate deve ter:

### Marca
limpa.

### Ícone
abstrato, inteligente, não clichê de carrinho.

### Motivos visuais
- signal;
- wave;
- node;
- orbit;
- pulse;
- nest abstrato.

Não usar:

- robô;
- cérebro;
- moeda;
- carrinho genérico.

---

# 169. Logo area

App sidebar:

wordmark horizontal.

Mobile:

símbolo + nome.

Favicon/PWA:

símbolo.

---

# 170. Copy de produto

Headline institucional:

> **Seu operador inteligente de afiliados.**

Subheadline:

> Descubra oportunidades, prepare campanhas e publique com muito menos trabalho.

---

# 171. UX writing — regras

Sempre:

- verbo claro;
- contexto;
- consequência.

Exemplo:

**Aprovar campanha**

não:

**Confirmar**

---

# 172. Status copy

`DRAFT` → Rascunho  
`READY` → Pronto para revisar  
`APPROVED` → Aprovado  
`PUBLICATION_READY` → Pronto para publicar  
`PUBLISHED` → Publicado  
`BLOCKED` → Precisa de atenção

Nunca expor enums.

---

# 173. Checklist de implementação visual

## Foundation
- [ ] tokens
- [ ] typography
- [ ] grid
- [ ] motion
- [ ] dark/light

## Shell
- [ ] sidebar
- [ ] bottom nav
- [ ] topbar
- [ ] command

## Core
- [ ] Today
- [ ] Radar
- [ ] Review
- [ ] Publish
- [ ] Results

## Intelligence
- [ ] NestScore
- [ ] AI bar
- [ ] insights
- [ ] confidence

## Account
- [ ] login
- [ ] organization
- [ ] members
- [ ] connections

## Responsive
- [ ] mobile
- [ ] tablet
- [ ] desktop
- [ ] ultrawide

---

# 174. Ordem ideal de design

1. Foundations.
2. App shell.
3. Today mobile.
4. Review mobile.
5. Publish mobile.
6. Today desktop.
7. Review desktop.
8. Radar.
9. Results.
10. Onboarding.
11. Connections.
12. Settings.
13. States.
14. Motion.
15. QA.

Mobile primeiro porque o uso real deve exigir pouquíssimo tempo.

---

# 175. Ordem ideal de frontend

1. Tokens.
2. UI primitives.
3. Shell.
4. Auth.
5. Today.
6. Campaign Review.
7. Guided Publisher.
8. Radar.
9. Results.
10. Connections.
11. Settings.
12. Edge states.

---

# 176. Critério de excelência visual

Uma tela só deve ser considerada pronta quando:

- é bonita;
- é rápida;
- é óbvia;
- funciona mobile;
- funciona dark/light;
- tem empty/loading/error;
- não tem clique desnecessário;
- não expõe complexidade técnica;
- mantém hierarquia;
- tem foco claro.

---

# 177. Critério de excelência UX

O usuário deve conseguir:

### Abrir
e saber o que precisa fazer.

### Revisar
sem entender IA.

### Editar
sem entender design.

### Trocar produto
sem pesquisar manualmente.

### Publicar
sem conhecer Pinterest profundamente.

### Entender resultado
sem ser analista.

---

# 178. Regra “3 segundos”

Dentro de 3 segundos ao abrir qualquer tela, o usuário deve identificar:

- o objetivo da tela;
- o estado atual;
- a ação principal.

---

# 179. Regra “1 ação dominante”

Cada view tem uma ação dominante.

Exemplos:

Hoje → Revisar campanhas  
Review → Aprovar  
Publish → Publicar passo a passo  
Radar → Ver oportunidade  
Connection → Conectar

---

# 180. Regra “zero dead-end”

Nenhuma tela termina sem:

- ação;
- recomendação;
- próxima etapa;
- saída clara.

---

# 181. Regra “zero jargon”

Não mostrar para leigo:

- embeddings;
- OAuth scopes;
- TTL;
- provider routing;
- model temperature.

Isso fica interno.

---

# 182. Regra “explain on demand”

Se quiser entender:

botão:

**Como calculamos isso?**

Não exibir toda explicação sempre.

---

# 183. Futuro SaaS

A mesma UI deve suportar:

- múltiplas marcas;
- múltiplos canais;
- vários usuários;
- billing.

Mas sem aparecer agora.

---

# 184. Tela futura multi-brand

Switcher de marca no topbar.

Somente quando recurso existir.

Não antecipar complexidade.

---

# 185. Internacional

UI deve poder mostrar:

- marketplaces diferentes;
- moedas;
- idiomas;
- boards localizados.

---

# 186. Métrica de sucesso UX

Medir:

- tempo para revisar campanha;
- cliques por aprovação;
- tempo para publicar;
- abandono no onboarding;
- frequência de manual override;
- uso de AI edit;
- erros de publicação.

---

# 187. Meta operacional

Objetivo:

**menos de 2 minutos humanos para revisar e aprovar 3 campanhas simples.**

Publicação manual:

o mínimo possível até habilitar API.

---

# 188. Métrica de fricção

Criar:

**Human Effort Score**

Exemplo:

```text
cliques
tempo
edições
voltas
erros
```

Usar internamente para otimizar UX.

---

# 189. Telemetria de UX

Eventos:

```text
home_opened
campaign_reviewed
campaign_approved
campaign_edited
product_swapped
publish_guide_started
publish_guide_completed
prompt_copied
ai_result_imported
connection_completed
```

Sem rastrear conteúdo sensível desnecessário.

---

# 190. Privacy UX

Explicar:

> Seus dados privados não são enviados para serviços gratuitos de IA sem necessidade.

Configuração:

**Uso de IA**

Mostrar política resumida.

---

# 191. Design debt guard

Não permitir que features sejam adicionadas sem:

- componente consistente;
- mobile;
- loading;
- error;
- accessibility;
- i18n.

---

# 192. Premium without clutter

Regra final:

**o luxo está na precisão, não no excesso.**

O NestAffiliate deve surpreender porque:

- já sabe;
- já preparou;
- explica;
- responde;
- reage;
- aprende.

Não porque a tela pisca.

---

# 193. Tela ideal de amanhã

```text
Bom dia, Daniel.

3 campanhas prontas para você.
Tempo estimado: 2 min

[ Revisar campanhas ]

────────────

Enquanto você estava fora

6.284 produtos observados
27 oportunidades analisadas
3 selecionadas

────────────

Este mês

R$ xxx
Receita afiliada

x.x%
Outbound CTR

R$ xx
EPM
```

---

# 194. Review ideal

```text
[ PIN PREVIEW ]

NestScore 94
Confiança alta

Organizador Giratório
Mercado Livre

Por que escolhemos:
• forte encaixe com cozinha pequena
• ótima reputação
• bom potencial visual

Título
7 ideias para ganhar espaço...

Board
Cozinha Pequena e Organizada

[ Aprovar ]

[ Editar com IA ]

Trocar produto · Refazer · Descartar
```

---

# 195. Publish ideal

```text
Seu Pin está pronto ✓

[ PREVIEW ]

Arquivo
cozinha-pequena-organizador-01.png
[ Baixar ]

Título
[ Copiar ]

Descrição
[ Copiar ]

Link
[ Copiar ]

Salvar em
Cozinha Pequena e Organizada
[ Copiar nome ]

[ Publicar passo a passo ]
```

---

# 196. Experiência de banco e conta — regra final

Conta deve existir para sustentar o produto, não dominar o produto.

Usuário não deve ver banco.

Ele vê:

- Minha conta
- Meu workspace
- Minhas conexões
- Minhas preferências

Por trás:
- user;
- organization;
- membership;
- provider connection;
- audit.

---

# 197. Definition of Done — UI/UX

Uma feature visual só está pronta quando possui:

- desktop;
- mobile;
- tablet;
- light;
- dark;
- loading;
- empty;
- error;
- success;
- keyboard;
- accessibility;
- i18n;
- telemetry;
- responsividade;
- design tokens;
- zero hardcoded styling crítico;
- QA visual.

---

# 198. Resumo executivo de implementação

O NestAffiliate deve nascer com a seguinte ordem de prioridade visual:

### 1. App shell premium
Fundações, responsive, theme, nav.

### 2. Home “Hoje”
O sistema mostra que trabalhou.

### 3. Review
A decisão humana mais importante.

### 4. AI Edit
Editar tudo com linguagem natural.

### 5. Guided Publisher
Nenhuma dúvida sobre como publicar.

### 6. Radar
Inteligência sem poluição.

### 7. Results
Dados que viram ação.

### 8. Connections
Integrações simples.

### 9. Account/Workspace
Estrutura multi-tenant real.

### 10. Polish
Motion, states, accessibility, QA.

---

# 199. Visão final

A interface do NestAffiliate não deve vender a complexidade do sistema.

Ela deve esconder essa complexidade.

O usuário deve sentir:

> **“O sistema trabalhou. Eu só decido.”**

O software pode ter centenas de regras, integrações, scores, providers e estados.

Mas a experiência principal deve continuar sendo:

**Hoje → Revisar → Aprovar → Publicar.**

E quando algo não agradar:

**“Muda isso.”**

Esse é o padrão de UX que deve orientar todo o produto.

---

# 200. Assinatura de produto

**NestAffiliate**  
**Affiliate Intelligence by MillionsNest**

> Intelligence → Creation → Approval → Distribution → Learning → Revenue