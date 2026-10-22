# Pinterest Trial — conexão e demonstração do Standard

App aprovado: **1625057**, MillionsNest — NestAffiliate. Confirmação recebida em 22/10/2026. Standard ainda não aprovado.

## Ações do titular (depois da publicação desta implementação)

1. Abra https://developers.pinterest.com/apps/ com a conta administradora do app.
2. Abra **1625057 → Manage/Configure → Redirect URIs**. Cadastre exatamente:
   `https://nestaffiliate.millionsnest.com/integrations/pinterest/callback`
   Sem barra final, sem parâmetros, sem alterar Main URL ou Privacy Policy.
3. Copie o **App Secret** desse mesmo app. Não copie o access token de teste. Não envie em chat, e-mail, imagem ou GitHub.
4. Abra https://nestaffiliate.millionsnest.com/connections com sua conta de administrador global MillionsNest, no workspace em que fará o teste.
5. No painel **Conectar e testar o Pinterest**, cole o secret no campo de senha e clique **Salvar chave no servidor**. O campo é limpo; o valor não volta nas respostas. A configuração fica privada e vinculada à organização escolhida. Não é uma opção BYOK para clientes.
6. Clique **Conectar Pinterest** na mesma aba. Autorize a conta correta no consentimento oficial do Pinterest. O retorno informa sucesso ou erro; o código é removido da URL e trocado somente no backend.
7. Clique **Voltar às Conexões**. A conexão deve indicar Sandbox. Preencha o nome de uma pasta de teste, marque a confirmação e clique **Criar pasta Sandbox**.
8. A pasta recém-criada já fica selecionada. Para consultar outras, clique **Carregar pastas Sandbox**. Páginas vazias com próxima página são comportamento documentado: use **Próxima página de pastas** se necessário.
9. Aguarde ao menos 30 segundos entre criações. Há limite local de dez tentativas por hora/usuário, além dos limites do Pinterest.
10. Escolha uma imagem própria/autorizada em PNG ou JPEG até 5 MB. Preencha título, descrição, destino HTTPS e texto alternativo. Informe claramente eventuais links de afiliado. Revise tudo, confirme direitos e autorize o Pin individual.
11. Clique **Criar somente este Pin no Sandbox**. Guarde a tela de resultado para a demonstração. Isso **não** registra uma campanha como publicada publicamente, não gera receita ou métricas reais e não aciona publicação em massa.
12. Se houver erro depois de um envio, confira seu perfil Sandbox antes de tentar novamente. O servidor não repete POST automaticamente e bloqueia reutilização da mesma tentativa.

## Vídeo contínuo para solicitar Standard

- Comece mostrando o domínio e a apresentação pública; não grave secrets, senhas ou tokens.
- Com a credencial já configurada antes da gravação, mostre Conexões → Conectar Pinterest → página oficial de consentimento → retorno de sucesso.
- Mostre consulta/criação de pasta Sandbox, a revisão de um Pin e o resultado da chamada real da API.
- Mostre que publicação pública exige Standard e que cada ação é escolhida pelo usuário.
- Mostre a política pública https://nestaffiliate.millionsnest.com/privacy.
- No Pinterest Developers, abra o app **1625057 → Upgrade** quando disponível e envie o vídeo com a descrição fiel ao fluxo demonstrado.

## Operação e segurança

O broker está no backend existente do Hub (`NestAffiliatePinterestService.ts`). Reutiliza verificação Firebase, membership, entitlement e autoridade administrativa do NestAffiliate em toda requisição. A credencial só pode ser configurada pela autoridade global reconhecida pelo backend. Tokens individuais são isolados por organização e usuário em `providerSecretState`, namespace que já nega todo acesso do browser pelas Rules. Não há novas regras permissivas, infraestrutura, serviços pagos, cron, ads ou mudanças no billing.

OAuth state de dez minutos, uso único, vinculado a usuário/organização/versão de credencial e validado no browser e servidor. Refresh tem lease transacional. Disconnect remove tokens locais e invalida OAuth pendente; para revogar a autorização no próprio Pinterest, use as configurações de apps conectados da conta. Somente tokens/estado operacional próprio são persistidos; respostas de pastas/Pins não são armazenadas no Firestore. Pedidos de teste têm controle de repetição e cotas. As chamadas de criação apontam exclusivamente para `api-sandbox.pinterest.com`.

## Limitação de certificação

Testes sintéticos verificam segurança e contratos. Só a autorização do titular e um teste real com a credencial do app aprovado certificam a comunicação real com Pinterest. Não declarar OAuth homologado nem Standard solicitado/aprovado antes dessas evidências.
