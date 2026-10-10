# Radar — Review do importador manual com pesquisa oficial por título
10/10/2026

## Falhas observadas
A URL curta meli.la não oferece, por si, SKU, variante, preço e foto. A versão anterior só interpretava texto colado e sempre pedia título, podendo misturar paste com campos irmãos. Criava campanha provisória com NestScore numérico mesmo sem identificação de anúncio.

## Correções desta entrega
- Parser separa links colados sem espaço, corta pontuação final e limpa repetição explícita de título.
- Evento de paste não altera campos paralelos; texto só processado no campo de importação.
- Se o usuário informar título, pode acionar a pesquisa já existente e selecionar **manualmente o anúncio exato** entre resultados oficiais; os dados vêm do broker autorizado (preço, foto e URL quando disponíveis).
- Se a fonte está limitada, o usuário continua com rascunho sem fatos inventados.
- URL curta pode ser aberta para inspeção mas não é apresentada como anúncio oficial resolvido ou link afiliado.
- NestScore fica **pendente** para campanhas manuais sem anúncio verificado.
- Não é gerado link de comissão fictício.

## Fora do escopo
Resolução automática de redirecionamentos via backend seguro e extração de print com OCR/visão. Exigem endpoint com SSRF guard, identidade exata de variante e compliance. A criação de link afiliado continua nas ferramentas aprovadas do marketplace, sem bypass de login/atribuição. Sem migração ou alterações destrutivas.

## QA
Parser + regressões, lint, TypeScript, build, E2E e smoke de autenticação real necessários antes de produção.
