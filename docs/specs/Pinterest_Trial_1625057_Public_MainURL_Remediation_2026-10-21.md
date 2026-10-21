# Pinterest Developers — correção do acesso público (21/10/2026)

## Diagnóstico confirmado pelo suporte
- Aplicativo 1618597: Trial negado porque o nome da empresa não correspondia ao domínio.
- Aplicativo substituto 1625057 — MillionsNest — NestAffiliate: Trial negado por Periwinkle em 20/10/2026 porque o endereço principal exigia login.
- As URLs cadastradas seguem as mesmas: https://nestaffiliate.millionsnest.com/ e https://nestaffiliate.millionsnest.com/privacy.
- A instrução de criar novo aplicativo só se aplica se Main URL ou Privacy Policy URL precisarem mudar. Nesta correção nenhuma delas muda; solicitar revisão do mesmo ID 1625057.

## Implementação
- A URL principal agora mostra página informativa completa e pública quando o visitante está deslogado, sem acesso a campanhas privadas.
- Usuários autenticados continuam vendo seu dashboard em / e mantendo os mesmos acessos e dados.
- Área de login preservada em /login e caminhos privados continuam protegidos.
- /about é uma página pública independente da autenticação, com explicação da plataforma, uso para criadores, recursos, segurança, links legais e contato.
- HTML inicial oferece texto e links públicos mesmo sem JavaScript; metadados e indexação disponibilizados.
- /privacy, /terms, /data-deletion permanecem publicamente acessíveis; publicação automática API continua bloqueada.
- Testes Playwright de página pública, responsividade, WCAG e validação de produção da Main URL com visitante sem sessão.

## Resposta a enviar no mesmo chamado do Pinterest depois do deploy aprovado

> Hi Periwinkle,
>
> Thank you for identifying the access problem with replacement app ID **1625057** (MillionsNest — NestAffiliate).
>
> We corrected the existing website. The registered Main URL **https://nestaffiliate.millionsnest.com/** is now publicly accessible to anyone without requiring a login. Visitors can see a complete description of our product, its features, workflow, company identity, privacy information and contact details.
>
> Our dedicated public overview is also available at **https://nestaffiliate.millionsnest.com/about**.
>
> The private user workspace still requires login to protect customer data; the public website does not.
>
> The registered Main URL and Privacy Policy URL have **not changed**.
>
> Could you please re-review the **same app ID 1625057** for Trial API Access and let us know if further information is needed?
>
> Thank you,
> Daniel — NestAffiliate by MillionsNest

No tokens/secrets should be included in support messages, GitHub or frontend builds; OAuth and Standard API publishing remain disabled until actual Pinterest approval.