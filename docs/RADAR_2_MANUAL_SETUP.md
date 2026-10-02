# NestAffiliate — Radar 2.0 Manual Setup Runbook

## 0. Mercado Livre — recommended automatic setup

The recommended flow is now:

1. Open NestAffiliate → Conexões → Mercado Livre.
2. In Mercado Livre DevCenter, create the app and register exactly:
   `https://nestaffiliate.millionsnest.com/integrations/meli/callback`
3. Add the repository variable `NESTAFFILIATE_SIGNAL_ORG_ID`.
4. Add GitHub repository secrets:
   - `MELI_CLIENT_ID`
   - `MELI_CLIENT_SECRET`
5. Back in NestAffiliate, enter only the public App ID and click **Autorizar Mercado Livre**.
6. Approve the Mercado Livre authorization with the administrator account.
7. The callback validates `state` + PKCE and displays a one-time bootstrap bundle.
8. Copy that bundle directly into the GitHub repository secret `MELI_BOOTSTRAP_BUNDLE`. Do not send it through chat, email or messaging.
9. Run GitHub Actions → **NestAffiliate Mercado Livre OAuth Bootstrap** → Run workflow.
10. After success, delete the one-time `MELI_BOOTSTRAP_BUNDLE` secret.
11. Run **NestAffiliate Mercado Livre Signal Sync** once manually to seed the Radar.
12. From then on, the scheduled workflow refreshes the rotating token and synchronizes official Trends/Highlights.

The access token is short-lived. Mercado Livre returns a new refresh token on each refresh, and only the latest refresh token remains valid. The sync workflow therefore stores the rotated refresh token in the backend-only `providerSecretState` document; browser clients cannot read or modify it.

If any credential step is not ready, use the manual JSON import below. It feeds the exact same normalized ranking engine.

---

**Status:** immediate zero-cost operation  
**Goal:** use official marketplace evidence now without exposing provider credentials in the browser.

## 1. Mercado Livre — official trends

Official endpoint:
`GET https://api.mercadolibre.com/trends/MLB`

Optional category endpoint:
`GET https://api.mercadolibre.com/trends/MLB/{CATEGORY_ID}`

The official response contains 50 entries:
- positions 1–10: fastest-growing searches;
- positions 11–30: most desired searches;
- positions 31–50: popular rising trends.

### Manual workflow

1. Create/configure a Mercado Livre developer application.
2. Prefer the automatic OAuth bootstrap above. For fallback/manual use, obtain an authenticated response using Mercado Livre's official tools.
3. Use an authenticated API client/API explorer to call the trends endpoint.
4. Copy **only the JSON response body**. Never copy Authorization headers or tokens.
5. Open NestAffiliate → Radar.
6. In **Sinais Oficiais**, choose `/trends/MLB`.
7. Paste the JSON response.
8. Click **Importar sinais**.
9. Search for the relevant intent/keyword.
10. The Radar automatically merges those signals into NestScore 2.0 and explains the evidence.

## 2. Mercado Livre — best sellers

Official endpoint:
`GET https://api.mercadolibre.com/highlights/MLB/category/{CATEGORY_ID}`

### Manual workflow

1. Choose the category relevant to the Pinterest niche.
2. Call the official endpoint in an authenticated API client/API explorer.
3. Copy **only the JSON response body**.
4. Open NestAffiliate → Radar → Sinais Oficiais.
5. Choose `/highlights/MLB/category/…`.
6. Paste the JSON and import.
7. Products returned by normal Mercado Livre search that match those IDs receive explicit bestseller evidence and ranking weight.

## 3. Shopee — official/manual signal workflow

No private scraping is used.

1. Open the Shopee Affiliate area.
2. Check **Recomendação / Oferta de Produto**.
3. Prefer products with useful visual fit for Pinterest.
4. If available, filter for **Comissão Extra**.
5. If the product is shown under **Vendas Principais**, record that signal.
6. In NestAffiliate → Radar → Importação Oficial / Manual:
   - Marketplace = Shopee;
   - product title;
   - official product URL;
   - optional affiliate URL;
   - price if confirmed;
   - Shopee signal type;
   - commission percentage if confirmed;
   - ranking position if confirmed;
   - intent/keyword.
7. Create the opportunity.
8. NestScore 2.0 incorporates those confirmed signals.

## 4. Affiliate tracking

Every Radar opportunity receives a stable tracking code such as:

`NA_SH_ORGANIZADOR_COZINHA_123456`

### Shopee
Use that value as a `Sub_id` when generating the affiliate link in Link de Conversão / Oferta de Produto.

### Mercado Livre
Keep the tracking code attached to the NestAffiliate campaign and use the official Mercado Livre affiliate-link tool to generate the final affiliate URL. The product URL and tracking code are available in Review and Publisher.

## 5. Pinterest Trends future adapter

The app already has:
- `PINTEREST_TRENDS_API` feature flag;
- `PinterestTrendsProvider` contract;
- normalized `PINTEREST_DEMAND` signal;
- NestScore 2.0 support for Pinterest demand;
- disabled provider fallback.

When Pinterest Trends access becomes available, only the provider implementation changes. Radar, scoring, campaigns and analytics remain unchanged.

## 6. Safety rules

Never paste into the NestAffiliate frontend:
- Mercado Livre Client Secret;
- access token;
- refresh token;
- Authorization headers;
- Pinterest client secret;
- any private provider credential.

Only official response data and confirmed commercial facts belong in Product Truth / market signal snapshots.
