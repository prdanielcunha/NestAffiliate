# NestAffiliate — Radar 8.0: sincronização privada e plano de crescimento com evidências

Data: 2026-10-14. Status: implementação em branch de homologação, publicação condicionada ao CI e deploy.

## Decisão de produto
O sistema não deve vender a ideia de "estratégia perfeita". Ele deve ajudar o afiliado a executar a próxima ação correta, registrar resultados e melhorar gradualmente com dados verificáveis.

## Implementação desta etapa
- Sincronização entre dispositivos opt-in (desligada por padrão), mantendo pesquisa local sempre disponível.
- Documento privado em users/{uid}/nestAffiliateRadarWorkspaces/{organizationId}, usuário proprietário apenas; escopo do usuário e organização validado no cliente. Regras do Hub: firestore.rules, seção users/{userId}/{document=**}, owner-only.
- Transação Firestore que verifica a versão remota antes de gravar; conflito resolvido pelo registro mais recente, exposto no texto do usuário. Não é edição colaborativa sem conflitos.
- Pesquisa salva e contexto local preservados durante falhas de conexão; status sync visível; exclusão explícita da cópia remota, sem apagar pesquisa local.
- Novo painel de próximos passos baseado somente em campanhas publicadas, métricas atribuídas e períodos dos relatórios. Ele recomenda importar observações, verificar comissões com o provedor e testar hipóteses visuais. Não promete CTR ou receita.
- Correção de verdade financeira: vendas/comissões vazias em formulário manual = desconhecidas; digitar explicitamente 0 representa a informação declarada zero. Registros históricos não serão alterados retroativamente sem evidência.
- CTA por ação e dados em PT/EN/ES, mobile-first.
- Testes unitários para isolamento lógico, versão, desconhecido versus zero, mínima evidência; E2E preservado.

## Regra de segurança e privacidade
A coleção userPreferences de organizações pode ser legível a outros membros; não usar para pesquisa privada. Nenhuma senha, token, foto privada ou chave é gravada no Radar. Não criar novas regras permissivas. Apagar cópia na nuvem é operação distinta de apenas desligar sincronização.

A implementação mantém a cópia local por navegador e usa o usuário autenticado como proprietário. Em edição simultânea, prevalece versão mais recente (last-write-wins); estado "sincronizado" confirma somente sucesso do transporte, não consenso entre aparelhos.

## Evidências para decidir
Diferenciar performance Pinterest (impressões, salvamentos, cliques) de vendas no programa (comissões importadas ou declaradas). Não presumir que ausência de relatório = zero receita. Janela da métrica é a data observada, não a data de importação.

O motor de aprendizado existente exige amostras mínimas e não deve alterar NestScore com poucas campanhas. O novo plano usa essas restrições.

## Auditoria API Mercado Livre (#99)
Inspeção inicial no backend principal MillionsNest, server.ts: integração de vários IDs usa /items/bulk?ids=. Não foram encontrados /items?ids= nem /users?ids= neste arquivo. Nenhuma mudança de URL foi aplicada sem reproduzir o contrato; validar demais serviços de backend antes de encerrar o issue.

## Pendências externas que não podem ser declaradas concluídas
- Pinterest OAuth/Standard Access e escopos autorizados: necessários para Analytics automatizado e Pins públicos por API; CSV/manual já existente continua como fallback.
- Comparação canônica automática de variantes: exige GTIN/modelo/cor/tamanho nas fontes oficiais e confirmação para ambiguidade; comparação manual mantém aviso de equivalência.
- Automação de postagem: respeita aprovação humana e permissões reais. Trial e ausência de credencial não permitem prometer publicação pública.

## Aceite de release
CI lint/typecheck/unit/integration/audit/build; E2E desktop/mobile, Revenue 3 e Radar V4, WebKit Safari; Firebase preview isolado; PR main→production, sem force push e sem migrações; Firebase production smoke API e domínio público; SHA final de main/production idêntico.
