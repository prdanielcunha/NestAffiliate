# NestAffiliate — Documento Mestre de Produto, Arquitetura e Construção

**Versão:** 1.0  
**Data-base:** 30/09/2026  
**Repositório oficial:** https://github.com/prdanielcunha/NestAffiliate  
**Domínio planejado:** `nestaffiliate.millionsnest.com`  
**Produto:** NestAffiliate  
**Ecossistema:** MillionsNest  
**Status do repositório na data deste documento:** criado e vazio; este documento deve servir como especificação-fonte para o bootstrap e a implementação.

---

## 1. Resumo executivo

O **NestAffiliate** será um sistema de inteligência e automação para operação de afiliados, concebido inicialmente para vender por meio do **Pinterest**, com foco em **máxima automação e mínimo trabalho humano**, preservando uma regra central:

> **Nenhum Pin é publicado sem aprovação final humana.**

O sistema não deve ser apenas um “radar de produtos”, nem um “gerador de Pins”. Ele deve funcionar como um **operador autônomo de aquisição e receita para afiliados**.

O ciclo completo pretendido é:

**Sinais de demanda → tendência/intenção → produtos → análise comercial → NestScore → campanha → criativo → revisão → aprovação → pacote perfeito para publicação → publicação → analytics → vendas/comissões → aprendizado → melhores decisões futuras.**

No MVP, a estratégia deve ser **financeiramente zero-cost**, sem depender de APIs pagas de IA. O NestAffiliate deve utilizar:

1. regras, algoritmos e código determinístico sempre que IA não for necessária;
2. modelos de texto que possuam camada gratuita, quando disponíveis e permitidos;
3. um **Creative Engine próprio**, que monte Pins profissionais sem IA generativa paga;
4. um **Prompt Studio** capaz de preparar prompts completos para ChatGPT, Gemini ou outra IA externa quando o usuário desejar uma criação generativa;
5. arquitetura já preparada para, futuramente, habilitar OpenAI API, Gemini pago ou outros provedores sem reconstruir o produto.

O usuário deve atuar como **editor-chefe**, não como operador. Em condições normais, ele deve abrir o app e encontrar poucas campanhas altamente filtradas, já prontas, escolhendo entre:

- **Aprovar**
- **Editar**
- **Trocar produto**
- **Refazer**
- **Descartar**

O NestAffiliate deve esconder complexidade técnica e mostrar sempre o próximo passo de forma clara.

---

# 2. Princípios inegociáveis do produto

## 2.1 Automação primeiro

O software deve fazer o trabalho antes de solicitar atenção humana.

Nunca transformar automação em uma lista de 40 coisas para o usuário revisar.

Exemplo esperado:

- 6.000 produtos observados;
- 150 candidatos encontrados;
- 25 oportunidades analisadas;
- 7 oportunidades fortes;
- 3 campanhas selecionadas;
- **3 aguardando aprovação.**

O usuário não deve revisar os 6.000, 150, 25 ou 7 itens.

## 2.2 Aprovação humana final

O NestAffiliate poderá pesquisar, calcular, selecionar, criar, reescrever, trocar produtos, preparar assets, sugerir horário e montar o pacote de publicação automaticamente.

A publicação final, porém, deve permanecer sob aprovação explícita do usuário no escopo inicial.

Quando a Pinterest API estiver em produção, a aprovação poderá ser:

**Aprovar e publicar/agendar**

sem exigir outras etapas manuais.

## 2.3 Nunca peça ao usuário para descobrir o próximo passo

Se o sistema disser “publique este Pin”, ele precisa entregar:

- imagem pronta;
- arquivo no tamanho certo;
- nome do arquivo;
- título;
- descrição;
- disclosure;
- link;
- marketplace;
- pasta/board correta;
- nome da pasta caso ela ainda precise ser criada;
- tópicos/assuntos sugeridos;
- texto alternativo;
- data/horário sugeridos;
- instruções exatas de postagem;
- checklist de validação;
- motivo da recomendação.

## 2.4 Zero custo financeiro no MVP

O modo inicial deve funcionar sem compra de:

- OpenAI API;
- Tailwind;
- Pin Inspector;
- ferramentas pagas de geração;
- ferramentas pagas de SEO;
- tráfego pago.

Ferramentas com camada gratuita podem ser usadas, desde que haja:

- quota guard;
- fallback quando a cota acabar;
- proibição de upgrade automático para plano pago;
- visibilidade do consumo;
- nenhuma cobrança iniciada sem ação explícita do proprietário.

## 2.5 IA é um componente, não a arquitetura

O NestAffiliate nunca deve depender de um fornecedor específico.

O sistema deve pedir capacidades:

- `text_generation`
- `classification`
- `ranking_assist`
- `creative_direction`
- `image_prompt_generation`
- `image_generation`
- `image_edit`

e o **AI Router** decide qual provider atende cada capacidade.

Hoje pode ser Gemini Free + manual ChatGPT.  
Amanhã pode ser OpenAI API.  
Depois pode ser outro modelo.

O produto deve continuar funcionando.

## 2.6 Product Truth Lock

IA não deve inventar informações comerciais.

Dados factuais do produto ficam bloqueados e são provenientes de fonte confiável:

- nome;
- URL;
- marketplace;
- preço;
- comissão;
- vendedor;
- reputação;
- disponibilidade;
- imagem oficial/autorizada;
- avaliações quando disponíveis;
- frete quando disponível.

A IA pode criar **comunicação**; não pode criar “fatos”.

## 2.7 Valor antes de spam

Pinterest permite conteúdo afiliado, mas exige originalidade, transparência, valor e moderação.

O NestAffiliate deve ser construído para evitar:

- duplicação em massa;
- repetição visual;
- farm de Pins;
- múltiplas contas falsas;
- manipulação artificial de saves;
- títulos enganosos;
- spam por produto;
- links obscuros;
- claims não verificáveis.

## 2.8 Mobile-first

A operação deve ser totalmente viável no celular.

90% das decisões rotineiras devem caber em:

- abrir;
- revisar;
- pedir alteração;
- aprovar.

## 2.9 Explicável

Todo score/recomendação importante deve responder:

> “Por que o sistema escolheu isso?”

Nenhum número mágico sem explicação.

## 2.10 Aprender com o usuário e com dinheiro real

O sistema deve aprender com:

- campanhas aprovadas;
- campanhas rejeitadas;
- motivos de rejeição;
- produtos trocados;
- títulos editados;
- preferências visuais;
- impressões;
- saves;
- outbound clicks;
- vendas;
- comissão;
- receita por Pin.

O objetivo não é descobrir qual Pin “parece bonito”.

É descobrir qual abordagem **gera receita de forma saudável e sustentável**.

---

# 3. Marca, contas e posicionamento

## 3.1 Nome do produto

**NestAffiliate**

Nome interno, técnico e comercial do aplicativo.

### Descriptor

**Affiliate Intelligence by MillionsNest**

### Promessa de produto

> **Descubra o que as pessoas querem antes de decidir o que promover.**

## 3.2 Marca pública inicial no Pinterest

**Achados do Nest**

### Nome exibido sugerido

**Achados do Nest | Casa, Organização & Compras Inteligentes**

### Username desejado

`@achadosdonest`

A disponibilidade exata deve ser confirmada no momento da criação da conta.

### Bio sugerida

> Ideias para uma casa mais bonita, organizada e prática. Curadoria de produtos, soluções e inspirações que fazem sentido para o dia a dia. Alguns Pins contêm links de afiliados.

O disclosure específico deve ser reforçado também no conteúdo comercial quando necessário.

## 3.3 E-mail operacional

**`nestaffiliate@millionsnest.com`**

Usar para:

- Pinterest Business;
- contas de desenvolvedor;
- marketplace/afiliados quando permitido;
- alertas de API;
- política;
- credenciais operacionais;
- contato técnico do produto.

## 3.4 Domínio

**`nestaffiliate.millionsnest.com`**

Futuro domínio editorial opcional para conteúdo próprio/Amazon:

**`achados.millionsnest.com`**

Não é necessário no MVP de ML + Shopee, mas deve ser previsto.

---

# 4. Estratégia comercial inicial

## 4.1 Canal de aquisição principal

**Pinterest orgânico**

A hipótese central é que Pinterest se comporta fortemente como plataforma de descoberta, planejamento e busca visual.

Não devemos operar como página de “promoções”.

Devemos operar como **marca editorial de solução e inspiração**.

## 4.2 Marketplace inicial

### Prioridade 1 — Mercado Livre

Razões:

- programa de afiliados ativo no Brasil;
- até 16% em produtos/categorias elegíveis;
- Ganhos Extras oferecidos por alguns vendedores;
- enorme catálogo;
- uso permitido em redes sociais, inclusive Pinterest;
- janela de atribuição atual de 24h nas condições publicadas;
- boa disponibilidade de produtos nacionais.

### Prioridade 1 — Shopee

Entra junto com Mercado Livre.

Razões:

- integração oficial Shopee + Pinterest;
- marcação de produtos diretamente no Pin;
- geração automática de link afiliado na integração;
- estimativa de comissão;
- possibilidade atual de até 5 produtos marcados por Pin;
- suporte a `Sub_id` em links da plataforma para rastreamento;
- Comissão Extra em determinados produtos/lojas.

## 4.3 Amazon — fase posterior

Não usar Amazon como dependência do MVP.

A página de ajuda da Amazon Brasil atualmente aceita, para candidatura como mídia social, Facebook, Instagram, Twitter/X, YouTube e Twitch; Pinterest não consta.

Estratégia prevista:

**Pinterest → conteúdo/site próprio → Amazon**

O site precisa:

- ser nosso;
- ter conteúdo original;
- acrescentar valor;
- ser mantido;
- respeitar políticas do programa.

## 4.4 Internacional

Somente depois da validação no Brasil.

Possível evolução:

- Pinterest em inglês;
- marca editorial internacional;
- Amazon marketplaces elegíveis;
- Partner Tags corretos por marketplace;
- conteúdo localizado;
- moeda/localização;
- catálogo e ofertas por país.

---

# 5. Nicho inicial

## 5.1 Nicho de lançamento

**Casa + organização + decoração prática**

Motivos:

- visual;
- evergreen;
- grande variedade de produtos;
- permite conteúdo útil;
- mistura problema + solução + inspiração;
- boa compatibilidade com comportamento de busca do Pinterest;
- não depende de uma única marca.

## 5.2 Subnichos iniciais

1. Cozinha pequena
2. Organização de cozinha
3. Banheiro pequeno
4. Lavanderia
5. Quarto
6. Sala
7. Apartamento pequeno
8. Organização infantil
9. Decoração simples
10. Utilidades domésticas
11. Iluminação
12. Produtos que facilitam a rotina
13. Cantinho do café
14. Armazenamento inteligente
15. Presentes para casa

## 5.3 Expansões futuras

- beleza/autocuidado;
- bebê/maternidade;
- presentes;
- moda/acessórios;
- pet;
- escritório/home office;
- viagem.

A expansão deve ocorrer por **dados**, não apenas por preferência.

---

# 6. Boards/Pastas iniciais do Pinterest

Criar inicialmente cerca de 8–10 boards, com títulos orientados à intenção de busca e não ao marketplace.

Sugestão:

1. **Cozinha Pequena e Organizada**
2. **Organização de Cozinha**
3. **Ideias para Apartamento Pequeno**
4. **Casa Bonita Gastando Pouco**
5. **Organização de Banheiro**
6. **Quarto Organizado e Aconchegante**
7. **Lavanderia Pequena e Funcional**
8. **Achados Inteligentes para Casa**
9. **Decoração Simples e Bonita**
10. **Produtos que Facilitam a Rotina**

Evitar boards como:

- “Mercado Livre”
- “Shopee”
- “Promoções”
- “Compre Agora”

A necessidade do usuário deve vir antes do marketplace.

## 6.1 Board Intelligence

O NestAffiliate deve:

- manter cadastro dos boards existentes;
- saber quais foram criados;
- sugerir board automaticamente para cada Pin;
- explicar por que escolheu;
- detectar quando nenhum board atual é adequado;
- sugerir novo board;
- fornecer nome e descrição;
- impedir proliferação desnecessária de boards similares.

---

# 7. Modelo operacional do NestAffiliate

## 7.1 Fluxo macro

```text
Sinais de mercado
       ↓
Trend / Demand Radar
       ↓
Clusters de intenção
       ↓
Product Discovery
       ↓
Product Normalization
       ↓
NestScore + Confidence
       ↓
Opportunity Ranking
       ↓
Campaign Planner
       ↓
Creative Director
       ↓
Creative Engine / Prompt Studio
       ↓
Compliance Guard
       ↓
Review Queue
       ↓
APROVAÇÃO HUMANA
       ↓
Publish Package / Pinterest API
       ↓
Pinterest Analytics
       ↓
Affiliate Results
       ↓
Learning Engine
       └──────────────→ volta ao início
```

## 7.2 Estados de uma oportunidade

```text
DETECTED
→ ENRICHING
→ SCORED
→ SHORTLISTED
→ SELECTED
→ CAMPAIGN_BUILDING
→ REVIEW_READY
→ APPROVED
→ PUBLICATION_READY
→ PUBLISHED
→ MONITORING
→ LEARNING
→ ARCHIVED
```

Estados alternativos:

- `REJECTED`
- `EXPIRED`
- `PRODUCT_UNAVAILABLE`
- `COMPLIANCE_BLOCKED`
- `NEEDS_REVIEW`
- `REPLACED`

---

# 8. Tela “Hoje” — centro da experiência

A home não deve ser um dashboard complexo.

Ela deve responder:

1. O NestAffiliate encontrou algo importante?
2. O que precisa da minha decisão?
3. Quanto tempo vou gastar aqui?

Exemplo:

```text
Bom dia.

NestAffiliate trabalhou por você:

6.284 produtos observados
184 alterações detectadas
27 oportunidades analisadas
3 campanhas selecionadas

3 aguardam aprovação
Tempo de revisão estimado: ~2 min

[Revisar campanhas]
```

## 8.1 Cards de campanha

Cada card deve mostrar:

- preview;
- tema;
- produto principal;
- marketplace;
- NestScore;
- nível de confiança;
- motivo resumido;
- comissão/ganho potencial quando conhecido;
- status.

CTA principal:

**Revisar**

---

# 9. Review Queue

Tela mais importante da operação.

O usuário abre um Pin pronto e vê:

- preview real 2:3;
- produto;
- preço/fatos relevantes;
- marketplace;
- NestScore;
- por que foi escolhido;
- headline;
- descrição;
- board;
- palavras-chave;
- disclosure;
- link;
- horário sugerido;
- eventuais alertas.

Ações primárias:

1. **Aprovar**
2. **Editar**
3. **Trocar produto**
4. **Refazer**
5. **Descartar**

Não exibir dezenas de configurações técnicas.

---

# 10. Editar com linguagem natural

## 10.1 Experiência

Campo:

> **O que você quer mudar?**

Exemplos:

- “Achei carregado.”
- “Quero mais premium.”
- “Tira o preço.”
- “Troca esse produto.”
- “Quero um fundo mais claro.”
- “Não gostei do título.”
- “Mantém a arte, mas cria outra headline.”
- “Quero três opções bem diferentes.”
- “Refaça tudo.”
- “Procure outro produto até R$ 90.”
- “Prefira Mercado Livre.”
- “Mantenha o produto, troque a abordagem.”

## 10.2 Edição por objetos

Campanha deve ser armazenada em componentes independentes:

- product;
- productImage;
- background;
- layout;
- headline;
- subheadline;
- badge;
- CTA;
- brand;
- board;
- title;
- description;
- keywords;
- relatedTopics;
- altText;
- disclosure;
- affiliateLink;
- marketplace;
- schedule.

Assim:

> “Só troca o produto”

não refaz tudo desnecessariamente.

## 10.3 Versionamento

Toda edição gera versão:

- v1;
- v2;
- v3.

Permitir:

- comparar;
- desfazer;
- recuperar versão anterior;
- registrar motivo da mudança.

---

# 11. Autopilot e níveis de automação

## 11.1 Assistido

O sistema oferece mais opções e explicações.

Bom para:

- onboarding;
- treinamento;
- primeiros dias;
- quando confiança de dados é baixa.

## 11.2 Automático — padrão recomendado

O NestAffiliate:

- encontra;
- filtra;
- escolhe;
- prepara;
- cria;
- valida.

O usuário apenas revisa e aprova.

## 11.3 Autopilot+

Fase futura.

O sistema já conhece preferências e reduz ainda mais decisões.

Exemplo:

- “Nunca coloque preço no criativo.”
- “Prefira pouco texto.”
- “Sempre mantenha identidade editorial.”
- “Evite pessoas.”
- “Quando dois produtos tiverem retorno estimado semelhante, prefira melhor reputação.”

Aprovação final continua obrigatória inicialmente.

---

# 12. Opportunity Radar

## 12.1 Objetivo

Detectar a interseção:

**demanda + intenção + produto + margem/comissão + apelo visual + oportunidade editorial**

Não responder apenas:

> “Qual produto vende mais?”

Responder:

> “Qual desejo está crescendo, qual problema está sendo resolvido, qual produto atende melhor e qual abordagem visual pode converter?”

## 12.2 Fontes — MVP zero-cost

A arquitetura NÃO deve depender da Pinterest Trends API no MVP, pois o acesso atual é limitado a agências, clientes Enterprise e plataformas parceiras.

Usar uma combinação de:

### Sinais próprios

- Pinterest Analytics da própria conta quando acesso API estiver disponível;
- performance de Pins;
- saves;
- outbound clicks;
- top Pins;
- audiência;
- histórico interno.

### Sinais editoriais e sazonais

- calendário de datas;
- sazonalidade;
- Pinterest Predicts;
- seeds temáticos administrados pelo sistema;
- temas históricos vencedores.

### Sinais de marketplace

- catálogo;
- disponibilidade;
- reputação;
- faixa de preço;
- comissão;
- comissão extra;
- novos produtos;
- produtos elegíveis;
- qualidade de imagem;
- densidade de oferta;
- alterações relevantes.

### Sinais manuais mínimos

Permitir inserir/colar:

- keyword;
- URL de tendência;
- tema;
- categoria.

O app faz todo o resto.

## 12.3 Evolução

### Nível 1
Dados próprios + marketplaces + sazonalidade.

### Nível 2
Pinterest Organic Analytics + Audience Insights.

### Nível 3
Pinterest Trends API se o NestAffiliate conseguir elegibilidade/acesso.

### Nível 4
Outras fontes oficiais/autorizadas.

**Proibido construir o produto em cima de scraping frágil ou contrário aos termos da plataforma.**

---

# 13. Product Discovery

## 13.1 Mercado Livre

O conector deve suportar, conforme disponibilidade oficial:

- busca por termo/categoria;
- detalhes de item;
- imagens;
- categoria;
- vendedor;
- reputação;
- preço;
- disponibilidade;
- atributos relevantes;
- elegibilidade comercial quando determinável;
- link do produto.

Não assumir que toda informação de afiliado está exposta via API pública.

Informações exclusivas do portal de afiliados devem possuir adaptadores separados.

## 13.2 Shopee

Suportar:

- links afiliados;
- `Sub_id` quando aplicável;
- Comissão Extra;
- produtos do catálogo;
- fluxo especial de marcação no Pinterest;
- até 5 produtos por Pin quando a experiência editorial justificar.

Se não houver API pública oficial para uma informação, **não criar scraping proibido**.

Prever:

- importação de export;
- entrada por URL;
- entrada por link afiliado;
- conectores oficiais futuros.

## 13.3 Amazon

Fase futura.

Usar site editorial próprio como camada de conteúdo quando necessário.

---

# 14. Product Normalization

Marketplaces descrevem o mesmo tipo de produto de maneiras diferentes.

Precisamos de uma entidade canônica:

```ts
CanonicalProduct {
  id
  organizationId
  canonicalName
  category
  useCases[]
  tags[]
  marketplaceOffers[]
  mediaAssets[]
  truthFields
  status
}
```

Uma oferta:

```ts
MarketplaceOffer {
  marketplace
  externalProductId
  title
  url
  affiliateUrl
  price
  currency
  commissionPercent
  extraCommissionPercent
  sellerName
  sellerReputation
  rating
  reviewCount
  shippingSignal
  availability
  imageUrls
  imageRightsStatus
  updatedAt
}
```

## 14.1 Deduplicação

Detectar ofertas equivalentes por:

- marca;
- modelo;
- atributos;
- título normalizado;
- imagem quando permitido;
- embeddings/fingerprint opcional;
- regras de categoria.

---

# 15. Product Truth Lock

## 15.1 Objetivo

Separar:

**FATO** de **CRIATIVIDADE**.

### Truth Fields

IA não pode alterar:

- produto;
- marca;
- modelo;
- preço;
- promoção;
- porcentagem;
- avaliação;
- número de reviews;
- material;
- medida;
- cor;
- características;
- frete;
- estoque;
- marketplace;
- comissão.

## 15.2 Claim Guard

Todo texto comercial deve ser classificado:

- `VERIFIED`
- `INFERRED_SAFE`
- `UNVERIFIED`
- `FORBIDDEN`

Exemplo:

“Organizador giratório de 30 cm”  
→ só publicar se 30 cm vier de fonte oficial.

“Pode ajudar a aproveitar melhor o espaço”  
→ claim editorial genérico aceitável quando coerente.

“O melhor organizador do Brasil”  
→ bloquear.

## 15.3 Preço

Preço é volátil.

Armazenar:

- valor;
- timestamp;
- fonte;
- TTL.

Se estiver velho:

- atualizar;
- ocultar do criativo;
- ou bloquear publicação.

Por padrão, **não colocar preço dentro da imagem** no MVP, a menos que exista atualização/validação confiável no momento da publicação.

---

# 16. Asset Rights Guard

Não presumir que qualquer imagem de produto pode ser baixada, alterada e redistribuída.

Todo asset deve possuir estado:

- `AUTHORIZED`
- `PLATFORM_PROVIDED`
- `USER_PROVIDED`
- `GENERATED`
- `UNKNOWN`
- `BLOCKED`

Creative Engine só deve usar diretamente em produção assets com status permitido pela política/regra aplicável.

Quando a situação for incerta:

- usar integração oficial do marketplace/Pinterest;
- solicitar asset autorizado;
- ou criar composição editorial sem copiar material protegido.

---

# 17. NestScore

## 17.1 Objetivo

Pontuação de oportunidade de 0 a 100.

Não deve ser um “palpite da IA”.

Deve resultar de componentes explicáveis.
## 17.2 Pesos iniciais

Proposta inicial:

| Dimensão | Peso |
|---|---:|
| Trend / Demand Momentum | 18 |
| Purchase Intent | 16 |
| Visual Fit | 14 |
| Commercial Yield | 14 |
| Product Quality | 12 |
| Competition Gap | 10 |
| Creative Surface | 8 |
| Seasonality | 4 |
| Data Confidence | 4 |
| **Total** | **100** |

## 17.3 Componentes

### Trend / Demand Momentum
Sinais de crescimento/interesse.

### Purchase Intent
Quão próxima a busca está de solução/compra.

### Visual Fit
Capacidade de produzir conteúdo forte no Pinterest.

### Commercial Yield
Comissão, ticket, incentivo, potencial de receita.

### Product Quality
Reputação, reviews, disponibilidade, qualidade do anúncio.

### Competition Gap
Oportunidade relativa entre demanda e saturação observável.

### Creative Surface
Quantidade de bons ângulos editoriais que o produto permite.

### Seasonality
Adequação ao momento.

### Data Confidence
Quanto da pontuação é sustentada por dados confiáveis.

## 17.4 Historical Performance

Depois de volume suficiente, o histórico próprio entra como camada separada.

Não substituir o score imediatamente.

Criar:

**NestScore Base**  
+ **Historical Adjustment**  
+ **Confidence**

Exemplo:

```text
NestScore: 91
Confiança: Alta

Motivos:
+ busca/tema crescente
+ forte intenção de solução
+ boa reputação
+ comissão acima da média do cluster
+ ótimo potencial visual
- concorrência moderada
```

## 17.5 Não vender certeza falsa

NestScore é:

- prioridade;
- apoio à decisão;
- ranking.

Não é previsão garantida de receita.

---

# 18. Multi-Marketplace Optimizer

Recebe um conceito/produto canônico e compara ofertas.

Exemplo:

```text
Produto: organizador giratório

Mercado Livre
R$ ...
Comissão ...
Reputação ...

Shopee
R$ ...
Comissão ...
Comissão extra ...

Amazon
R$ ...
Comissão ...
```

Decisão deve usar **receita esperada + confiança + experiência do comprador**, não apenas:

- menor preço;
- maior comissão.

## 18.1 Variáveis

- conversão histórica;
- ticket;
- comissão;
- comissão extra;
- disponibilidade;
- qualidade do vendedor;
- atrito;
- frete;
- confiança da oferta;
- compatibilidade com integração Pinterest;
- histórico de devolução/cancelamento quando disponível.

---

# 19. Campaign Planner

Transforma uma oportunidade em estratégia editorial.

Deve gerar:

- objetivo;
- público;
- intenção;
- problema;
- promessa;
- produto;
- ângulo;
- board;
- keyword principal;
- keywords secundárias;
- CTA;
- disclosure;
- formato;
- creative brief.

---

# 20. Creative Director

Para cada oportunidade, gerar internamente diferentes **ângulos**, não apenas variações cosméticas.

Exemplo:

### Problema
> Sua cozinha parece sempre cheia?

### Lista
> 7 ideias para ganhar espaço em cozinha pequena

### Transformação
> Um detalhe que mudou esta bancada

### Descoberta
> O espaço da cozinha que quase todo mundo desperdiça

### Inspiração
> Cozinha pequena, bonita e organizada

O sistema pontua os conceitos e apresenta **o melhor primeiro**.

Botão:

**Ver alternativas**

Evitar sobrecarregar o usuário.

---

# 21. Nest Creative Engine — geração de Pin a R$0

## 21.1 Objetivo

Gerar Pins profissionais sem chamar API de imagem paga.

## 21.2 Formato padrão

**1000 × 1500 px**  
**2:3**  
**PNG de alta qualidade**

Outros formatos podem existir depois, mas o MVP deve priorizar o formato vertical recomendado para Pin estático.

## 21.3 Renderização em camadas

```text
Background
↓
Context layer
↓
Product/authorized asset
↓
Shadows/effects
↓
Headline
↓
Subheadline
↓
Brand
↓
Optional disclosure visual
```

## 21.4 Texto NÃO deve ser rasterizado por IA

Headline e outros textos devem ser renderizados pelo próprio app.

Benefícios:

- ortografia correta;
- consistência;
- acessibilidade;
- edição rápida;
- identidade de marca;
- zero alucinação tipográfica.

## 21.5 Templates iniciais

1. Editorial Premium
2. Problem → Solution
3. Lista
4. Produto Destaque
5. Before/After conceitual
6. Minimal
7. Tipografia + Produto
8. Collection / Multiple Products
9. Seasonal
10. Utility / How-to

Cada template possui:

- safe areas;
- typography tokens;
- contrast validation;
- product zone;
- logo zone;
- max line count;
- headline rules.

## 21.6 Regras visuais

- mobile-readable;
- pouco texto;
- hierarquia forte;
- aparência editorial;
- não parecer encarte de supermercado;
- produto não deve ficar minúsculo;
- não usar claims inventados;
- evitar excesso de badges;
- manter consistência de marca;
- sempre validar contraste;
- não cortar elemento importante;
- não adicionar preço por padrão;
- não alterar embalagem real do produto.

## 21.7 Render engine técnico

Preferência MVP:

- composição via SVG/Canvas;
- renderização no cliente quando possível;
- export determinístico;
- assets versionados;
- templates JSON;
- testes de snapshot/visual regression.

Opção futura:

- render server-side com `sharp`/serviço de render quando necessário.

---

# 22. Background Removal / Image Processing

Priorizar custo zero.

Criar interface:

```ts
ImageProcessor {
  removeBackground()
  crop()
  smartFit()
  shadow()
  blur()
  mask()
  export()
}
```

Implementação pode utilizar:

- processamento local;
- WebAssembly;
- modelo open-source executado no cliente;
- fallback manual.

Nunca exigir serviço pago para funcionamento básico.

---

# 23. Prompt Studio — uso do ChatGPT Pro sem API

## 23.1 Objetivo

Aproveitar ferramentas externas que o usuário já possui sem transformar isso em dependência.

Botão:

**Gerar em outra IA**

Opções:

- ChatGPT
- Gemini
- Outra IA

## 23.2 Prompt Package

O NestAffiliate deve gerar automaticamente:

1. **Prompt de imagem**
2. **Prompt de copy**
3. **Contexto do produto**
4. **Restrições**
5. **Formato Pinterest**
6. **Direção de arte**
7. **Área para headline**
8. **O que não alterar**
9. **O que não inventar**

## 23.3 Prompt de imagem

Por padrão pedir:

- 2:3;
- composição editorial;
- sem texto incorporado;
- espaço negativo para headline;
- sem deformar produto;
- sem inventar logo;
- sem preço;
- sem avaliação fictícia;
- contexto coerente com público;
- fotografia compatível com Pinterest.

## 23.4 Fluxo manual ChatGPT

O app mostra:

### Etapa 1
Baixe/copiar imagem de referência autorizada, se aplicável.

### Etapa 2
Copie o prompt.

### Etapa 3
Abra ChatGPT.

### Etapa 4
Anexe a referência quando necessário e cole o prompt.

### Etapa 5
Gere/edite.

### Etapa 6
Baixe a imagem.

### Etapa 7
Volte ao NestAffiliate.

### Etapa 8
Envie o resultado.

O NestAffiliate então:

- recorta;
- redimensiona;
- valida;
- adiciona headline;
- aplica marca;
- exporta.

## 23.5 Import AI Result

Criar wizard para:

- arrastar imagem;
- colar texto;
- validar tamanho;
- identificar versão;
- substituir background;
- manter Product Truth Lock.

---

# 24. AI Router

## 24.1 Interface

```ts
interface AIProvider {
  generateText(task, payload)
  classify(task, payload)
  rank(task, payload)
  generateImage?(task, payload)
  editImage?(task, payload)
}
```

## 24.2 Providers previstos

```text
RULE_ENGINE
GEMINI_FREE
MANUAL_CHATGPT
MANUAL_GEMINI
OPENAI_API
GEMINI_PAID
OTHER_PROVIDER
```

## 24.3 Estratégia MVP

### Código / Rule Engine
Usar primeiro sempre que possível.

### Gemini Free
Usar para tarefas de texto compatíveis com o nível gratuito vigente.

Possíveis usos:

- classificação;
- títulos;
- descrições;
- clusters;
- keyword normalization;
- intenção;
- creative angles;
- explicações;
- prompt generation.

### ChatGPT Pro manual
Usar para:

- criação visual premium;
- refinamento especial;
- casos importantes;
- edição de imagem;
- copy excepcional.

### OpenAI API
**Desativada no MVP.**

Código preparado, mas:

- nenhuma chave obrigatória;
- nenhuma cobrança;
- feature flag false.

## 24.4 Free-Tier Privacy Guard

Níveis gratuitos de IA podem possuir termos de tratamento de dados diferentes.

No zero-cost mode:

**NÃO enviar para IA gratuita:**

- tokens;
- chaves;
- PII;
- segredos;
- dados bancários;
- informações privadas de outros clientes;
- conteúdo confidencial.

Enviar apenas:

- metadados públicos de produtos;
- temas;
- dados editoriais;
- conteúdo de marketing sem sensibilidade.

Para futura versão SaaS, revisar requisitos de privacidade e usar tiers empresariais/pagos quando necessário.

---

# 25. Quota Guard

Obrigatório.

## 25.1 Deve controlar

- provider;
- modelo;
- requests/dia;
- tokens;
- erros por quota;
- cooldown;
- status;
- custo estimado futuro.

## 25.2 Comportamento no MVP

Se a cota gratuita acabar:

1. não cobrar;
2. não migrar para paid;
3. usar Rule Engine/templates;
4. colocar tarefa não urgente em espera;
5. oferecer Prompt Studio;
6. avisar de forma simples.

Exemplo:

> A cota gratuita de IA terminou por hoje. Sua campanha continua funcionando com o modo gratuito local. Se quiser, gere esta parte no ChatGPT com o prompt pronto.

---

# 26. Futuro OpenAI API

Deixar abstrações prontas.

Feature flags:

```text
OPENAI_TEXT_ENABLED=false
OPENAI_IMAGE_ENABLED=false
OPENAI_EDIT_ENABLED=false
```

Quando houver receita:

- configurar chave;
- estabelecer orçamento;
- configurar teto diário;
- habilitar gradualmente.

A experiência de produto não deve mudar.

O botão que hoje gera prompt pode virar:

**Gerar automaticamente**

---

# 27. AI Arena — fase futura

Não decidir para sempre qual modelo “é melhor”.

Executar experimentos controlados:

- OpenAI vs Gemini;
- template A vs B;
- copy model A vs B.

Métrica vencedora:

**resultado de negócio**, não preferência subjetiva.

Exemplos:

- outbound CTR;
- sales per click;
- earnings per 1,000 impressions;
- receita/Pin.

Não executar experimentos caros sem orçamento.

---

# 28. SEO / Pinterest Search Engine

Para cada campanha gerar:

- keyword principal;
- variações;
- long tails;
- intenção;
- board;
- título;
- descrição;
- alt text;
- related topics.

Exemplo:

```text
Keyword principal:
organização cozinha pequena

Long tails:
como organizar cozinha pequena
organizador para cozinha pequena
ideias organização cozinha
cozinha pequena organizada
```

Evitar keyword stuffing.

## 28.1 Keyword normalization

Normalizar:

- caixa;
- acentuação para comparação;
- símbolos;
- plural/singular quando apropriado;
- equivalências;
- sinônimos;
- variações comuns.

Não destruir a ortografia na copy final.

---

# 29. Pin Package

Todo Pin aprovado deve virar um objeto pronto para publicação.

```ts
PinPackage {
  campaignId
  creativeAsset
  filename
  width
  height
  title
  description
  disclosure
  destinationUrl
  affiliateMetadata
  boardId
  boardName
  relatedTopics[]
  altText
  suggestedPublishAt
  marketplaceInstructions
  checklist
}
```

---

# 30. Naming de arquivos

Automático.

Padrão:

```text
{keyword}-{product-slug}-{variation}.png
```

Exemplo:

`cozinha-pequena-organizador-giratorio-01.png`

Regras:

- minúsculas;
- hífens;
- sem caracteres problemáticos;
- legível;
- determinístico;
- sem IDs secretos.

---

# 31. Publicação guiada — requisito obrigatório

O MVP não pode terminar em “Pin pronto”.

Deve mostrar passo a passo.

## 31.1 Página “Pronto para publicar”

### Preview

- imagem;
- 1000x1500 ✓;
- 2:3 ✓;
- qualidade ✓;
- link ✓;
- produto ✓;
- compliance ✓.

### Download

**Baixar imagem**

Mostrar nome do arquivo.

### Pasta

> **Salvar em:** Cozinha Pequena e Organizada

Se não existir:

> Crie uma pasta chamada **Cozinha Pequena e Organizada**

Botão:

**Copiar nome**

## 31.2 Campos com copy button

- título;
- descrição;
- disclosure;
- link;
- nome da pasta;
- tópicos;
- alt text.

## 31.3 Tutorial genérico

1. Abra o Pinterest.
2. Escolha criar Pin.
3. Selecione o arquivo indicado.
4. Cole o título.
5. Cole a descrição.
6. Adicione o link.
7. Escolha a pasta indicada.
8. Adicione tópicos relevantes disponíveis na interface.
9. Preencha alt text quando disponível.
10. Confira o preview.
11. Publique/agende.
12. Volte ao NestAffiliate.
13. Marque como publicado ou conecte via API.

## 31.4 Tutorial responsivo

Ter instruções específicas para:

- mobile app;
- desktop/web.

Não congelar texto eternamente.

O tutorial deve ser versionável porque a interface do Pinterest muda.

---

# 32. Fluxo especial Shopee + Pinterest

Quando marketplace = Shopee e a integração oficial estiver disponível:

O NestAffiliate deve mudar a orientação.

Fluxo:

1. criar Pin;
2. upload;
3. preencher copy;
4. usar **Marcar produtos**;
5. filtrar/pesquisar Shopee;
6. selecionar produto;
7. conferir comissão estimada;
8. opcionalmente marcar outros produtos coerentes;
9. board;
10. publicar.

A integração atual permite até **5 produtos por Pin**.

O app deve mostrar exatamente:

- qual produto procurar;
- nome;
- link;
- ID quando houver;
- imagem de referência;
- posição na campanha.

---

# 33. Modo Guiado

Ideal para primeiras publicações.

Interface:

```text
Publique seu primeiro Pin
Etapa 1 de 7

Baixe a imagem
[Baixar]

[Já baixei]
```

Depois:

```text
Etapa 2 de 7
Abra o Pinterest
[Abrir Pinterest]
```

E assim sucessivamente.

## 33.1 Aprendizado do onboarding

Depois de algumas publicações:

> Você já sabe publicar Pins?

Se sim:

reduzir para modo compacto.

Tutorial continua disponível em **Como publicar**.

---

# 34. Publicação via Pinterest API — evolução

A Pinterest API permite criação de Pins e boards, mas Trial e Standard possuem diferenças.

Na camada Trial:

- criação pode ser testada;
- Pins/boards criados têm comportamento limitado/visibilidade de teste.

Para produção:

- buscar **Standard Access**;
- usar OAuth;
- escopos mínimos;
- refresh token seguro;
- botão **Aprovar e publicar**.

Não construir MVP dependente de Standard Access antes da aprovação.

---

# 35. Pinterest Analytics

Quando conectado, capturar:

- impressions;
- engagements;
- saves;
- save rate;
- Pin clicks;
- outbound clicks;
- taxas correspondentes;
- top Pins;
- performance por período.

A API de Organic Reporting atualmente permite:

- lookback de 90 dias para determinados relatórios;
- lifetime para vários Pins;
- top Pins;
- métricas por Pin.

## 35.1 Analytics por dimensão

Quebrar por:

- board;
- category;
- keyword;
- angle;
- template;
- product;
- marketplace;
- faixa de preço;
- horário;
- dia;
- creative style.

---

# 36. Affiliate Results

## 36.1 Problema

Nem todo marketplace possui API pública para dados de afiliado/conversão.

Não inventar integrações.

## 36.2 Estratégia

Camadas:

1. API oficial quando existir;
2. integração oficial;
3. export/CSV;
4. import manual simplificado;
5. Sub_id/campaign tags suportados pelo marketplace;
6. reconciliação.

## 36.3 Shopee

Usar `Sub_id` quando aplicável para identificar:

- Pin;
- campanha;
- categoria;
- board;
- data.

## 36.4 Links

Não usar encurtadores/redirects obscuros apenas para rastrear.

Pinterest exige transparência; alguns encurtadores podem não ser suportados.

Dar preferência a:

- URL afiliada oficial;
- marcações do marketplace;
- tracking nativo.

---

# 37. Métricas de negócio

Não usar seguidores como KPI central.

KPIs:

- impressões;
- saves;
- save rate;
- Pin clicks;
- outbound clicks;
- outbound CTR;
- vendas;
- conversion rate;
- comissão;
- receita afiliada;
- receita por clique;
- receita por Pin;
- receita por board;
- receita por keyword;
- receita por template;
- receita por produto;
- receita por cluster;
- receita por marketplace.

## 37.1 EPM

Métrica recomendada:

**Earnings per 1,000 Impressions**

```text
EPM = receita atribuída / impressões × 1000
```

Ajuda a responder:

> Qual conteúdo transforma distribuição em dinheiro?

---

# 38. Learning Engine

## 38.1 Creative DNA

Aprender:

- fundos;
- contraste;
- densidade de texto;
- posição do produto;
- template;
- uso de números;
- tamanho de headline;
- estilo editorial;
- CTA;
- presença/ausência de preço.

## 38.2 Product DNA

Aprender:

- categoria;
- faixa de preço;
- marketplace;- tipo de uso;
- comissão;
- reputação;
- ticket;
- momento sazonal.

## 38.3 Audience DNA

Aprender:

- temas;
- boards;
- intenção;
- horários;
- dispositivo quando disponível;
- interesses agregados do Pinterest.

## 38.4 Preference Learning

Cada ação humana vira sinal:

- `APPROVED`
- `EDITED`
- `REJECTED`
- `SWAPPED_PRODUCT`
- `REGENERATED`
- `PREFERRED_VARIANT`

Motivos opcionais:

- carregado;
- genérico;
- pouco premium;
- produto ruim;
- preço alto;
- não confio;
- imagem fraca;
- copy fraca;
- outro.

## 38.5 Não repetir erro

Preferências recorrentes devem virar regras.

Exemplo:

Usuário remove preço de 10 criativos.

Sugestão do sistema:

> Percebi que você prefere Pins sem preço. Deseja tornar isso padrão?

Só aplicar preferência permanente com decisão explícita.

---

# 39. Exploration vs Exploitation

Não repetir apenas o que já deu certo.

Depois de volume mínimo:

- ~80% estratégias comprovadas;
- ~20% experimentação controlada.

Percentuais devem ser configuráveis e não aplicados antes de dados suficientes.

---

# 40. Publishing Guard

Antes de recomendar publicação:

- produto disponível;
- preço fresco se exibido;
- link válido;
- disclosure;
- asset permitido;
- texto não enganoso;
- board coerente;
- duplicação aceitável;
- frequência saudável;
- conteúdo original;
- produto não repetido excessivamente;
- claims verificados;
- políticas atuais aplicadas.

Saídas:

- `PASS`
- `WARN`
- `BLOCK`

---

# 41. Duplicate & Spam Guard

## 41.1 Comparar

- produto;
- headline;
- descrição;
- template;
- imagem/perceptual hash;
- board;
- keyword;
- ângulo;
- período.

## 41.2 Regra

Não depender de um simples limite fixo.

Calcular similaridade.

Exemplo:

Mesmo produto + mesma imagem + headline quase idêntica + mesmo board + curto intervalo  
→ bloquear.

Mesmo produto + novo uso + novo visual + outro momento + valor editorial  
→ pode permitir.

---

# 42. Compliance Guard

## 42.1 Pinterest

Aplicar:

- conteúdo original;
- valor;
- transparência;
- moderação;
- não manipular distribuição;
- não usar contas falsas;
- não produzir Pins afiliados repetitivos em massa.

## 42.2 Disclosure

Criar biblioteca de disclosure.

Exemplo simples:

> Conteúdo com link de afiliado. Posso receber comissão por compras qualificadas, sem custo adicional para você.

Adaptar conforme:

- marketplace;
- legislação;
- localização;
- ferramenta disponível.

## 42.3 CONAR / legislação

Manter campo de política versionado.

Publicidade deve ser identificável.

Nunca esconder natureza comercial deliberadamente.

## 42.4 Policy Watch

Banco:

```ts
PolicySnapshot {
  provider
  version
  effectiveDate
  sourceUrl
  summary
  impact
  reviewedAt
}
```

Alertar quando mudança impactar:

- links;
- disclosure;
- volume;
- IA;
- conteúdo;
- API;
- publicidade.

---

# 43. Strategy Guard

O app não deve incentivar:

- “spam de 100 Pins/dia”;
- copiar criativos virais;
- reutilizar imagens alheias sem direito;
- comprar saves;
- contas falsas;
- cloaking;
- redirecionamento enganoso;
- fake reviews;
- urgência falsa;
- descontos inventados;
- avaliações inventadas.

---

# 44. Arquitetura técnica proposta

Como o repositório está vazio, a arquitetura pode nascer corretamente.

## 44.1 Frontend

Recomendação:

- React;
- TypeScript;
- Vite;
- PWA;
- Tailwind CSS ou sistema equivalente;
- design tokens;
- Zod;
- TanStack Query;
- Zustand ou estado mínimo equivalente;
- Firebase SDK.

Motivo:

- mobile-first;
- build estático simples;
- Firebase Hosting;
- baixo custo;
- PWA;
- fácil manutenção.

## 44.2 Backend

Camada abstrata para:

- Firebase / Google Cloud;
- funções/serviços somente quando necessários;
- integrações;
- secrets;
- OAuth;
- processamento não confiável no cliente.

No **Zero-Cost Mode**, priorizar:

- trabalho no cliente;
- Firestore dentro de quotas gratuitas;
- jobs disparados quando o usuário abre/sincroniza;
- automações gratuitas somente dentro de quotas permitidas.

Jobs 24/7 devem ser habilitados gradualmente e sempre protegidos por orçamento.

## 44.3 Hosting

**Firebase Hosting**

Não usar Vercel como dependência do projeto.

## 44.4 Autenticação

Integrar ao ecossistema MillionsNest/Hub.

Requisitos:

- Google login;
- sessão compartilhada quando a arquitetura do Hub permitir;
- organizationId;
- RBAC;
- usuário proprietário global;
- recuperação segura;
- sem loop de auth.

---

# 45. Multi-tenancy desde o início

Mesmo sendo operação interna inicialmente, preparar para SaaS.

Todo dado deve possuir:

- `organizationId`;
- `createdBy`;
- `createdAt`;
- `updatedAt`.

Roles:

- `owner`
- `admin`
- `editor`
- `viewer`

Futuro:

- `analyst`
- `approver`

---

# 46. i18n

Arquitetura desde o início:

- `pt-BR`
- `en`
- `es`

Nenhuma string crítica hardcoded em componente.

Aplicar i18n em:

- UI;
- toasts;
- emails;
- validações;
- tutoriais;
- datas;
- moeda;
- boards sugeridos;
- prompts;
- accessibility labels.

---

# 47. Estrutura recomendada do repositório

```text
NestAffiliate/
├─ apps/
│  └─ web/
│     ├─ src/
│     │  ├─ app/
│     │  ├─ components/
│     │  ├─ features/
│     │  │  ├─ today/
│     │  │  ├─ radar/
│     │  │  ├─ opportunities/
│     │  │  ├─ products/
│     │  │  ├─ campaigns/
│     │  │  ├─ review/
│     │  │  ├─ publisher/
│     │  │  ├─ analytics/
│     │  │  ├─ settings/
│     │  │  └─ onboarding/
│     │  ├─ hooks/
│     │  ├─ i18n/
│     │  ├─ lib/
│     │  ├─ services/
│     │  ├─ styles/
│     │  └─ types/
│     └─ public/
│
├─ packages/
│  ├─ core/
│  │  ├─ scoring/
│  │  ├─ entities/
│  │  ├─ state-machines/
│  │  └─ rules/
│  ├─ creative-engine/
│  │  ├─ renderer/
│  │  ├─ templates/
│  │  ├─ typography/
│  │  └─ image-processing/
│  ├─ ai-router/
│  │  ├─ providers/
│  │  ├─ prompts/
│  │  ├─ schemas/
│  │  └─ quota/
│  ├─ integrations/
│  │  ├─ pinterest/
│  │  ├─ mercadolivre/
│  │  ├─ shopee/
│  │  ├─ amazon/
│  │  └─ millionsnest/
│  ├─ compliance/
│  ├─ analytics/
│  ├─ ui/
│  └─ config/
│
├─ firebase/
│  ├─ firestore.rules
│  ├─ firestore.indexes.json
│  └─ config/
│
├─ functions/               # somente se necessário
├─ scripts/
├─ tests/
│  ├─ unit/
│  ├─ integration/
│  ├─ e2e/
│  └─ visual/
│
├─ docs/
│  ├─ architecture/
│  ├─ policies/
│  └─ runbooks/
│
├─ .github/
│  └─ workflows/
├─ README.md
└─ package.json
```

Não adicionar complexidade sem uso real.

---

# 48. Modelo de dados Firestore

Coleções sugeridas:

```text
organizations
users
memberships
providerConnections
affiliateAccounts
pinterestAccounts
boards
products
productOffers
productSnapshots
trendSignals
trendClusters
opportunities
opportunityScores
campaigns
campaignVersions
creativeAssets
creativeTemplates
promptPackages
approvalEvents
publicationPackages
publications
performanceDaily
affiliateResults
learningSignals
userPreferences
policySnapshots
complianceChecks
quotaUsage
auditEvents
featureFlags
```

## 48.1 IDs

IDs internos não devem depender apenas de IDs externos.

Usar:

- ID interno estável;
- `externalId`;
- `provider`.

---

# 49. Exemplo de Campaign

```ts
Campaign {
  id
  organizationId
  opportunityId
  status
  marketplace
  productOfferId

  strategy: {
    audience
    intent
    problem
    angle
    keyword
    board
  }

  content: {
    pinterestTitle
    description
    disclosure
    relatedTopics
    altText
  }

  creative: {
    templateId
    version
    assetId
    headline
    subheadline
  }

  score: {
    nestScore
    confidence
    reasons[]
  }

  publication: {
    suggestedAt
    destinationUrl
    boardId
  }

  createdAt
  updatedAt
}
```

---

# 50. Status e auditoria

Toda ação relevante deve gerar evento:

```text
OPPORTUNITY_DETECTED
OPPORTUNITY_SELECTED
CAMPAIGN_GENERATED
COPY_REGENERATED
PRODUCT_SWAPPED
CREATIVE_CHANGED
USER_APPROVED
USER_REJECTED
COMPLIANCE_BLOCKED
PUBLICATION_PREPARED
PUBLISHED
PRODUCT_UNAVAILABLE
PRODUCT_REPLACED
METRICS_UPDATED
LEARNING_APPLIED
```

Isso permite:

- debugging;
- histórico;
- aprendizado;
- confiança.

---

# 51. Scheduler / automação zero-cost

Meta: automação sem cobrança inesperada.

## 51.1 Estratégia MVP

Prioridade:

1. sync inteligente quando app é aberto;
2. cache;
3. jobs pequenos;
4. deduplicação;
5. atualização incremental.

Opcional:

- GitHub Actions agendado dentro da franquia gratuita disponível;
- scheduler cloud somente depois de confirmar custo/limites.

## 51.2 Regra financeira

Nenhum serviço com billing variável deve ser habilitado sem:

- budget guard;
- alertas;
- documentação;
- aprovação.

---

# 52. Daily Agent

Fluxo:

```text
1. Determine o que mudou desde o último ciclo
2. Atualize produtos necessários
3. Atualize sinais de oportunidade
4. Expire itens velhos
5. Calcule NestScore
6. Crie shortlist
7. Remova duplicados
8. Gere campanhas
9. Rode Compliance Guard
10. Coloque somente melhores campanhas na Review Queue
```

## 52.1 Limites

Nunca gerar 100 criativos se 97 serão descartados.

Sequência:

**filtrar → pontuar → selecionar → criar**

e não:

**criar tudo → escolher depois**.

---

# 53. Produto indisponível

Ao detectar indisponibilidade:

1. marcar offer;
2. localizar equivalentes;
3. calcular substitutos;
4. atualizar NestScore;
5. selecionar melhor alternativa;
6. preservar campanha se possível;
7. trocar produto;
8. atualizar link;
9. validar visual;
10. pedir aprovação da substituição se o Pin ainda não foi publicado.

Exemplo:

> Produto original ficou indisponível. Encontramos uma alternativa com melhor reputação e preço semelhante.

Botões:

- **Aprovar troca**
- **Ver alternativas**

---

# 54. UX — navegação

Mobile:

1. **Hoje**
2. **Radar**
3. **Campanhas**
4. **Resultados**

Menu adicional:

- Conexões;
- Boards;
- Preferências;
- IA;
- Conta;
- Ajuda.

Não colocar 20 itens no menu principal.

---

# 55. Progressive Disclosure

Usuário iniciante vê:

> Potencial alto

Usuário avançado pode expandir:

```text
NestScore: 92
Trend: 17/18
Intent: 15/16
Visual: 14/14
Yield: 12/14
...
```

Não obrigar todos a entender métricas.

---

# 56. Design

Objetivo:

**premium, moderno, muito intuitivo, leve e “uau” sem poluição.**

Referências conceituais:

- Linear;
- Apple;
- Vercel;
- dashboards financeiros premium.

Características:

- hierarquia forte;
- espaços generosos;
- cards limpos;
- glass/blur com moderação;
- tipografia clara;
- movimentos sutis;
- dark/light preparados;
- mobile-first;
- skeletons rápidos;
- nenhuma tela parecendo ERP.

---

# 57. Performance

Metas:

- Home útil rapidamente;
- dados cacheados;
- optimistic UI;
- processamento pesado fora do thread principal;
- imagens lazy;
- thumbnails;
- virtualização quando necessário;
- nenhuma ação cotidiana levando segundos sem feedback.

---

# 58. Acessibilidade

- WCAG AA como alvo;
- contraste;
- teclado;
- labels;
- focus states;
- alt;
- botões grandes;
- não depender apenas de cor;
- reduced motion.

---

# 59. Segurança

## 59.1 Segredos

Nunca no frontend:

- tokens Pinterest;
- chaves Gemini;
- chaves futuras OpenAI;
- tokens marketplace;
- secrets MillionsNest.

Usar secret storage apropriado.

## 59.2 OAuth

- state;
- PKCE quando suportado;
- redirect allowlist;
- escopos mínimos;
- token rotation;
- revogação.

## 59.3 Firestore Rules

Isolamento obrigatório por `organizationId`.

Testes no Emulator.

## 59.4 Auditoria

Registrar:

- conexão;
- aprovação;
- alteração de provider;
- publicação;
- troca de link;
- regra de preferência;
- erro de compliance.

---

# 60. Rate Limit & Resilience

Cada integração deve implementar:

- retry com backoff;
- jitter;
- circuit breaker;
- cache;
- idempotency;
- timeout;
- status health.

Nunca transformar rate limit externo em loop infinito.

---

# 61. Feature Flags

Exemplos:

```text
PINTEREST_API_ENABLED
PINTEREST_AUTO_PUBLISH
PINTEREST_TRENDS_API
SHOPEE_NATIVE_FLOW
MELI_AFFILIATE_CONNECTOR
GEMINI_FREE_ENABLED
OPENAI_API_ENABLED
OPENAI_IMAGE_ENABLED
AMAZON_ENABLED
INTERNATIONAL_ENABLED
```

---

# 62. CI/CD

Branches recomendadas:

- `main` — desenvolvimento/homologação;
- `production` — código aprovado/publicado.

## 62.1 Pull Request checks

- lint;
- typecheck;
- unit tests;
- integration tests;
- Firestore rules tests;
- build;
- dependency audit;
- e2e crítico;
- visual regression crítico.

## 62.2 Deploy

Firebase Hosting.

Produção apenas após gates.

Não auto-publicar código com falha.

---

# 63. Testes obrigatórios

## 63.1 Unit

- NestScore;
- normalization;
- link validation;
- rules;
- keyword normalization;
- disclosure;
- state machine.

## 63.2 Integration

- Pinterest adapter;
- marketplace adapters;
- AI router;
- Firestore;
- auth;
- publication package.

## 63.3 Visual

Golden snapshots dos templates 1000x1500.

Validar:

- clipping;
- headline;
- safe area;
- branding;
- tamanhos;
- assets.

## 63.4 E2E

Playwright.

Fluxos:

- login;
- onboarding;
- analisar oportunidade;
- editar;
- trocar produto;
- aprovar;
- baixar Pin;
- guided publishing;
- marcar como publicado;
- analytics.

## 63.5 Compliance tests

Fixtures com:

- desconto falso;
- claim falso;
- preço velho;
- asset bloqueado;
- link inválido;
- duplicata.

Devem bloquear corretamente.

---

# 64. Observabilidade

Inicialmente simples e barata.

Registrar:

- falhas;
- provider;
- latency;
- quota;
- exceptions;
- pipeline status;
- API health.

Tela interna:

**System Health**

- Pinterest;
- Mercado Livre;
- Shopee;
- Gemini;
- Firebase.

---

# 65. Onboarding

Objetivo: pessoa leiga precisa começar sem manual externo.

## 65.1 Passos

1. Entrar.
2. Escolher mercado/país.
3. Explicar “como funciona” em 3 telas.
4. Conectar/cadastrar Pinterest.
5. Registrar Mercado Livre afiliado.
6. Registrar/conectar Shopee afiliado.
7. Criar/confirmar boards.
8. Escolher modo automático.
9. Gerar primeira oportunidade.
10. Publicar primeiro Pin guiado.

Cada etapa deve informar:

- por quê;
- o que clicar;
- como saber que deu certo.

---

# 66. Connection Center

Cards:

### Pinterest
`Não conectado / Conectado / API Trial / Standard`

### Mercado Livre
`Link afiliado configurado / integração`

### Shopee
`Conta afiliada / Pinterest conectado`

### Gemini Free
`Ativo / quota`

### ChatGPT Manual
`Disponível — nenhuma integração necessária`

### OpenAI API
`Desativada — futura`

Nunca mostrar secret em texto.

---

# 67. Campaign Quality Checklist

Antes de review:

- objetivo claro;
- boa headline;
- visual legível;
- problema/benefício coerente;
- produto confiável;
- link correto;
- board correto;
- disclosure;
- alt;
- keyword;
- asset permitido;
- sem duplicação.
---

# 68. Estratégia de conteúdo

## 68.1 Tipos

- problema/solução;
- listas;
- how-to;
- inspiração;
- organização;
- comparativos editoriais;
- checklists;
- ideias por ambiente;
- coleção de produtos;
- antes/depois conceitual;
- sazonal;
- presente;
- achado útil.

## 68.2 Evitar

- banner puro;
- “COMPRE AGORA” em todo Pin;
- preço gigante;
- “70% OFF” sem prova;
- visual de supermercado;
- duplicar foto de catálogo sem transformação editorial quando não apropriado.

## 68.3 Frequência inicial

Começar conservador:

**1–2 Pins originais/dia**, com possibilidade de adaptação pelos dados.

Não hard-code isso como limite eterno.

Publishing Guard observa:

- performance;
- duplicação;
- qualidade;
- saúde;
- política.

---

# 69. Pin de múltiplos produtos

Especialmente útil no fluxo Shopee.

Exemplo:

**5 ideias para organizar sua bancada**

Produtos:

1. bandeja;
2. dispenser;
3. organizador;
4. pote;
5. suporte.

Regras:

- os produtos precisam fazer sentido juntos;
- não inserir 5 apenas porque o limite permite;
- manter narrativa editorial;
- explicar cada utilidade quando necessário.

---

# 70. “Por que escolhemos isso?”

Obrigatório em toda oportunidade.

Formato:

```text
Escolhemos este produto porque:
• pertence a um tema com forte potencial
• resolve um problema visualmente demonstrável
• possui boa reputação
• está numa faixa de preço atraente
• permite vários conceitos de conteúdo

Riscos:
• concorrência moderada
• preço pode variar
```

---

# 71. Confidence Score

Separar:

**NestScore** de **Confidence**.

Exemplo:

```text
NestScore 95
Confiança baixa
```

Isso é possível se:

- a ideia parece ótima;
- porém poucos dados estão disponíveis.

O sistema não deve esconder incerteza.

---

# 72. Manual Overrides

Permitir ao proprietário:

- bloquear categoria;
- bloquear marketplace;
- bloquear seller;
- favorecer marketplace;
- limitar faixa de preço;
- não usar pessoas;
- não usar preço;
- não usar determinada estética;
- não publicar em datas;
- pausar sistema.

Overrides devem ser auditáveis.

---

# 73. “Trocar produto”

Botão deve abrir automaticamente:

### Melhor substituto
### Mais barato
### Melhor reputação
### Melhor comissão
### Ver mais

Não jogar o usuário numa busca vazia.

---

# 74. “Refazer tudo”

Preserva:

- oportunidade;
- objetivo;
- histórico.

Mas cria campanha nova:

- outro produto opcional;
- novo ângulo;
- novo template;
- nova copy.

A versão anterior não é apagada.

---

# 75. “Descartar”

Pergunta opcional de um toque:

Por quê?

- produto;
- imagem;
- copy;
- tema;
- comissão;
- repetitivo;
- não gostei;
- outro.

Esse sinal treina o sistema interno.

---

# 76. Approval Event

```ts
ApprovalEvent {
  campaignId
  userId
  action
  reason
  previousVersion
  selectedVersion
  timestamp
}
```

---

# 77. Future fully-automatic publishing

Após Standard Access:

Pipeline:

```text
Campaign READY
↓
Human approves
↓
Freshness check
↓
Link validation
↓
Compliance Guard
↓
Final render
↓
Pinterest API
↓
Pin ID stored
↓
Analytics monitoring
```

Se o produto mudar entre aprovação e publicação:

**não publicar silenciosamente**.

Voltar para revisão se a mudança for material.

---

# 78. Scheduling Engine

Inicialmente: sugestão.

Depois: publicação agendada por API.

Levar em conta:

- performance histórica;
- board;
- categoria;
- sazonalidade;
- intervalo entre conteúdo semelhante;
- timezone;
- campanha.

Não inventar “melhor horário universal”.

Aprender com dados próprios.

---

# 79. Política de criação com IA

Quando IA generativa é usada:

Registrar:

- provider;
- model;
- prompt version;
- timestamp;
- asset origin.

Não expor prompt interno desnecessariamente na UI.

Manter:

- provenance;
- edição;
- compliance.

Acompanhar políticas de uso aceitável de IA do Pinterest.

---

# 80. Dados e retenção

Definir classes:

### Persistente
- campanhas;
- approvals;
- publicações;
- resultados;
- preferências.

### Snapshot
- preços;
- disponibilidade;
- score.

### Efêmero
- respostas intermediárias de IA;
- caches.

Evitar crescimento infinito de snapshots.

---

# 81. Cost Guard

Dashboard interno:

```text
Modo: ZERO COST
Gemini free: 38% quota
OpenAI: OFF
Paid services: OFF
Cloud jobs: within configured free allocation
```

Botão:

**Bloquear qualquer serviço pago**

Deve existir como policy global.

---

# 82. Planos de fallback

## Gemini indisponível

- regras;
- templates;
- Prompt Studio.

## Pinterest API indisponível

- modo guiado manual.

## Marketplace sem API

- URL/import;
- export;
- fluxo oficial.

## OpenAI não configurada

- nenhuma perda de funcionalidade básica.

## Imagem externa não permitida

- Creative Engine com asset permitido/contexto editorial.

---

# 83. Fase 0 — Bootstrap

Objetivo:

Transformar repositório vazio em base sólida.

Entregáveis:

- README;
- este documento em `/docs`;
- workspace;
- app web;
- Firebase setup;
- env;
- lint;
- formatting;
- test runner;
- CI;
- i18n;
- design tokens;
- auth skeleton;
- feature flags.

**Definition of Done:**

- build verde;
- lint verde;
- testes base;
- deploy de homologação;
- auth shell;
- nenhuma chave no repo.

---

# 84. Fase 1 — Foundation

Entregáveis:

- login;
- organization;
- RBAC;
- app shell;
- Today;
- Review Queue vazia;
- settings;
- boards;
- connection center;
- Firestore rules;
- audit.

DoD:

- mobile;
- acesso isolado;
- reload/session;
- sem loop;
- i18n base.

---

# 85. Fase 2 — Product Intelligence

Entregáveis:

- product model;
- offer model;
- Mercado Livre adapter;
- Shopee manual/official flows;
- normalization;
- Product Truth Lock;
- snapshots;
- NestScore v1;
- shortlist.

DoD:

- consegue cadastrar/importar produto;
- consegue comparar;
- score explicável;
- nenhum fato inventado.

---

# 86. Fase 3 — Opportunity Radar

Entregáveis:

- signal ingestion;
- seasonal engine;
- keyword clusters;
- radar;
- confidence;
- dedupe;
- filters.

DoD:

- produz shortlist real;
- usuário entende motivo;
- nenhum scraping proibido necessário.

---

# 87. Fase 4 — Zero-Cost AI

Entregáveis:

- AI Router;
- Rule Engine;
- Gemini Free provider;
- structured outputs;
- Prompt Studio;
- quota guard;
- privacy guard;
- fallbacks.

DoD:

- app opera se Gemini falhar;
- custo pago = zero;
- nenhuma chamada OpenAI.

---

# 88. Fase 5 — Creative Engine

Entregáveis:

- renderer 1000x1500;
- templates;
- typography;
- safe areas;
- export;
- filename;
- asset guard;
- Product Truth Lock visual;
- visual regression.

DoD:

- Pin pronto sem ferramenta externa;
- PNG correto;
- visual mobile-readable.

---

# 89. Fase 6 — Campaign Builder

Entregáveis:

- angles;
- title;
- description;
- keywords;
- alt;
- disclosure;
- board;
- preview;
- versions;
- natural-language edits;
- swap product;
- regenerate.

DoD:

- campanha completa em um fluxo;
- qualquer elemento editável;
- undo.

---

# 90. Fase 7 — Guided Publisher

Entregáveis:

- PinPackage;
- download;
- copy buttons;
- board instruction;
- mobile guide;
- desktop guide;
- Shopee special guide;
- mark as published.

DoD:

Pessoa leiga consegue publicar sem perguntar o que fazer.

---

# 91. Fase 8 — Pinterest Analytics

Entregáveis:

- OAuth;
- Trial API;
- organic metrics;
- top Pins;
- performance dashboard;
- campaign mapping.

DoD:

- métricas associadas ao Pin/campanha;
- falhas não quebram app.

---

# 92. Fase 9 — Learning Engine

Entregáveis:

- Creative DNA;
- Product DNA;
- Preference Learning;
- historical adjustment;
- learning explanations.

DoD:

- aprende sem sobrescrever regra humana;
- não usa amostra pequena como certeza.

---

# 93. Fase 10 — Standard Access / Auto Publish

Entregáveis:

- solicitar Standard;
- publish API;
- scheduling;
- final approval;
- fresh validation;
- status.

DoD:

**aprovar → publicar** sem trabalho adicional.

---

# 94. Fase 11 — OpenAI API

Somente após receita ou autorização de custo.

Entregáveis:

- provider;
- image generation;
- image editing;
- budget;
- cost dashboard;
- feature flags;
- fallback.

DoD:

- nunca excede teto configurado;
- desligar provider não quebra app.

---

# 95. Fase 12 — Amazon / site editorial

Entregáveis:

- site editorial;
- templates de artigo;
- original content;
- Amazon account support;
- product router;
- analytics.

DoD:

- políticas validadas;
- conteúdo realmente agrega valor.

---

# 96. Fase 13 — SaaS

Se operação própria provar resultado.

Entregáveis:

- onboarding externo;
- billing;
- plans;
- quotas;
- workspace;
- marketplace connectors;
- privacy/terms;
- support;
- per-tenant costs.

O produto nasce multi-tenant, mas comercialização só depois de validação.

---

# 97. O que NÃO construir no MVP

- ERP;
- CRM completo;
- social media manager genérico;
- automação de todas as redes;
- editor gráfico estilo Canva;
- browser scraper massivo;
- shortener próprio;
- ads manager completo;
- billing;
- SaaS público;
- Amazon internacional;
- geração de vídeo pesada;
- OpenAI API paga.

Foco:

**Pinterest Affiliate Intelligence.**

---

# 98. Critérios de sucesso do MVP

O MVP é bem-sucedido quando:

1. encontra oportunidades sem depender de trabalho manual constante;
2. gera campanha completa;
3. produz Pin 1000x1500 profissional gratuitamente;
4. gera copy;
5. recomenda board;
6. prepara link;
7. guia publicação;
8. registra o que foi publicado;
9. coleta dados possíveis;
10. aprende;
11. mantém custo de IA paga em R$0;
12. requer aprovação final;
13. não viola políticas;
14. usuário consegue operar pelo celular;
15. tempo humano por campanha fica muito baixo.

---

# 99. KPIs do produto NestAffiliate

Além dos KPIs de Pinterest:

- minutos humanos por campanha;
- campanhas prontas/dia;
- taxa de aprovação;
- taxa de edição;
- taxa de troca de produto;
- taxa de regeneração;
- campanhas bloqueadas por compliance;
- quota utilizada;
- custo por campanha;
- % campanhas 100% zero-cost;
- tempo até publicação;
- receita/tempo humano.

Métrica-chave interna:

> **Receita afiliada por minuto humano investido.**

---

# 100. Rotina ideal do usuário

## Manhã

Abrir app.

Ver:

> 3 campanhas prontas.

Revisar.

### Campanha 1
Aprovar.

### Campanha 2
“Troca o produto por um com melhor reputação.”

Sistema troca.

Aprovar.

### Campanha 3
“Faz mais clean.”

Creative Engine refaz.

Aprovar.

O restante:

NestAffiliate orienta ou publica conforme estágio de integração.

---

# 101. Rotina ideal do sistema

Enquanto o usuário não está operando:

- observa alterações;
- atualiza oportunidades;
- descarta produto ruim;
- mantém shortlist;
- evita repetição;
- aprende com resultado;
- prepara conteúdo.

Em **zero-cost estrito**, trabalhos background só devem usar mecanismos que não gerem cobrança inesperada. Quando execução 24/7 exigir infraestrutura paga, deve existir autorização explícita antes de ativar.

---

# 102. Checklist de criação da operação externa

## Pinterest

- [ ] Criar conta Business
- [ ] Nome: Achados do Nest
- [ ] Username: verificar `@achadosdonest`
- [ ] E-mail operacional
- [ ] Bio
- [ ] Avatar/logo
- [ ] 8–10 boards
- [ ] Ativar analytics
- [ ] Developer app quando necessário

## Mercado Livre

- [ ] Ingressar no programa
- [ ] Validar conta
- [ ] Confirmar canais
- [ ] Testar link
- [ ] Ler percentuais atuais
- [ ] Mapear Ganhos Extras

## Shopee

- [ ] Ingressar no programa
- [ ] Conectar Pinterest
- [ ] Confirmar marcação de produto
- [ ] Testar Sub_id
- [ ] Confirmar Comissão Extra

## NestAffiliate

- [ ] Conectar contas
- [ ] escolher nicho inicial
- [ ] confirmar boards
- [ ] usar modo Automático
- [ ] produzir primeiro Pin
- [ ] publicar em Modo Guiado

---

# 103. Regras de arquitetura para agentes de engenharia

Qualquer agente implementando este projeto deve seguir:

1. Ler o repositório inteiro antes de alterar arquitetura existente.
2. Não quebrar funcionalidades aprovadas.
3. Mudanças mínimas e seguras.
4. Manter `organizationId`.
5. Manter RBAC.
6. Nunca vazar secret.
7. Nunca hardcodar strings de UI.
8. Manter i18n.
9. Escrever testes.
10. Preservar Zero-Cost Mode.
11. Não introduzir SaaS pago sem aprovação.
12. Não depender de scraping proibido.
13. Não inventar integração inexistente.
14. Não colocar API paga como requisito.
15. Não publicar Pin automaticamente sem aprovação.
16. Usar feature flags para funcionalidades externas instáveis.
17. Atualizar documentação quando política/API mudar.

---

# 104. Definition of Done global

Uma feature só está concluída quando:

- implementada;
- testada;
- mobile;
- acessível;
- i18n;
- segura;
- logs;
- estados de erro;
- loading;
- empty state;
- offline/degraded behavior quando aplicável;
- docs;
- sem segredo no cliente;
- sem custo inesperado;
- funciona na produção alvo.

---

# 105. Riscos e mitigação

## Mudança de política

**Mitigação:** Policy Watch + versionamento.

## API restrita

**Mitigação:** adapters + manual guided fallback.

## Free tier acaba

**Mitigação:** Rule Engine + Prompt Studio.

## Produto some

**Mitigação:** replacement engine.

## Imagem sem direito

**Mitigação:** Asset Rights Guard.

## Spam

**Mitigação:** Publishing Guard + dedupe.

## IA inventa fatos

**Mitigação:** Product Truth Lock.

## Usuário sobrecarregado

**Mitigação:** shortlist agressiva + progressive disclosure.

## Dependência de provider

**Mitigação:** AI Router.

## Baixa conversão

**Mitigação:** learning por receita, não por estética.

---

# 106. Decisões já fechadas

1. Nome do app: **NestAffiliate**.
2. Repositório: `prdanielcunha/NestAffiliate`.
3. Foco inicial: Pinterest.
4. Marca pública proposta: **Achados do Nest**.
5. Nicho inicial: casa/organização/decoração prática.
6. Marketplaces iniciais: Mercado Livre + Shopee.
7. Amazon: fase posterior.
8. MVP: custo financeiro de IA = R$0.
9. OpenAI API: preparada, mas desligada.
10. ChatGPT Pro: aproveitado via Prompt Studio/manual.
11. Gemini Free: texto/estrutura dentro da cota gratuita vigente.
12. Creative Engine próprio: obrigatório.
13. Pin padrão: 1000×1500, 2:3.
14. Aprovação final humana.
15. App extremamente intuitivo.
16. Modo Guiado de publicação.
17. Board/pasta recomendado automaticamente.
18. App deve dizer exatamente como publicar.
19. Firebase Hosting como destino.
20. Arquitetura multi-tenant/RBAC/i18n desde o início.
21. Analytics e Learning Engine fazem parte da visão principal.
22. Não depender da Trends API do Pinterest no MVP.
23. Shopee terá fluxo próprio por sua integração nativa com Pinterest.
24. Compliance e spam guard são features de produto, não documentação externa.
25. Futuro: auto-publish após Standard Access e aprovação humana.
26. Futuro: NestAffiliate pode virar SaaS, somente depois de provar receita real.

---

# 107. Referências oficiais validadas na preparação deste documento

> Políticas e produtos mudam. Estas referências devem ser revalidadas antes de mudanças importantes de produção.

## Pinterest

Diretrizes de conteúdo comercial e afiliados:  
https://policy.pinterest.com/pt-br/commercial-and-branded-content-guidelines

Políticas:  
https://policy.pinterest.com/pt-br

Developer Platform:  
https://developers.pinterest.com/docs/

Access Tiers:  
https://developers.pinterest.com/docs/key-concepts/access-tiers/

Trends API:  
https://developers.pinterest.com/docs/analytics-and-reports/trends/

Organic Analytics:  
https://developers.pinterest.com/docs/analytics-and-reports/organic-reporting/

Audience Insights:  
https://developers.pinterest.com/docs/analytics-and-reports/audience-insights/

## Mercado Livre

Programa de Afiliados e Criadores:  
https://www.mercadolivre.com.br/l/afiliados-home

Ganhos por venda:  
https://www.mercadolivre.com.br/l/afiliados-ganhos-por-venda

Ganhos Extras:  
https://www.mercadolivre.com.br/l/afiliados-ganhos-extras

Afiliados com mídia paga:  
https://www.mercadolivre.com.br/l/afiliados-midia-paga

## Shopee

Parceria com Afiliados do Pinterest:  
https://help.shopee.com.br/portal/10/article/224179-Parceria-com-Afiliados-do-Pinterest

Links/Sub_id:  
https://help.shopee.com.br/portal/10/article/128461-Passo-a-Passo-para-Gerar-Seus-Links-de-Afiliado-ou-ID-de-produto

Termos do Programa de Afiliados:  
https://help.shopee.com.br/portal/10/article/124094-Programa-de-Afiliados-da-Shopee-Termos-e-Condi%C3%A7%C3%B5es

## Amazon Brasil

Requisitos de candidatura / mídias aceitas:  
https://associados.amazon.com.br/help/node/topic/G8TW5AE9XL2VX9VM

## Google Gemini

Pricing / Free Tier:  
https://ai.google.dev/gemini-api/docs/pricing

---
# 108. Próxima ação técnica recomendada

Como o repositório ainda está vazio, a próxima execução deve ser:

1. adicionar este documento em `docs/NESTAFFILIATE_MASTER_ARCHITECTURE.md`;
2. criar README;
3. bootstrap do monorepo;
4. Firebase;
5. auth;
6. design system;
7. data model;
8. Product Intelligence;
9. Zero-Cost AI;
10. Creative Engine;
11. Guided Publisher;
12. Analytics.

A implementação não deve começar pela “IA bonita”.

Deve começar por:

> **dados confiáveis → score → decisão → produto → campanha → criativo.**

Isso evita gastar tempo e cota gerando conteúdo para oportunidades ruins.

---

# 109. Visão final

O NestAffiliate deve se comportar como um funcionário digital que:

- pesquisa;
- observa;
- calcula;
- seleciona;
- escreve;
- cria;
- verifica;
- organiza;
- aprende;
- prepara;

e chega ao usuário apenas quando existe uma decisão realmente importante.

A interação ideal é:

> **Aprovar**

ou:

> **“Muda isso…”**

O objetivo final não é “automatizar postagem”.

É criar um sistema que descobre **o que vale a pena vender, para quem, em qual formato, com qual produto, em qual marketplace e com qual criativo**, enquanto reduz ao mínimo possível o tempo humano necessário para operar a máquina.

**NestAffiliate = Intelligence → Creation → Approval → Distribution → Learning → Revenue.**