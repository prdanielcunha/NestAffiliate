# NestAffiliate — Pinterest Developer Submission Pack

**Prepared:** 2026-10-02  
**App name:** NestAffiliate  
**Brand:** Achados do Nest  
**Official Pinterest profile:** https://br.pinterest.com/achadosdonest/  
**Product family:** MillionsNest  
**Production URL:** https://nestaffiliate.millionsnest.com  
**Privacy Policy:** https://nestaffiliate.millionsnest.com/privacy  
**Terms:** https://nestaffiliate.millionsnest.com/terms  
**Data deletion:** https://nestaffiliate.millionsnest.com/data-deletion  
**Support/contact:** nestaffiliate@millionsnest.com

## Launch state — start now

The official Pinterest profile is already created as **@achadosdonest**.

NestAffiliate does **not** need to wait for API approval to start validating the business. The production-safe path is:

1. generate and approve campaigns in NestAffiliate;
2. use Guided Publisher to download the 1000×1500 creative and copy the prepared metadata;
3. publish manually to @achadosdonest;
4. mark the campaign as published;
5. import performance manually until Pinterest analytics is connected.

This gives the Learning Engine real campaign decisions and metrics immediately, while the API approval track proceeds in parallel.

Current Pinterest platform behavior verified on 2026-10-02:
- Trial Access supports API testing in Sandbox;
- Pins and Boards created through Trial are visible only to the creator as Sandbox entities;
- Standard Access is required for production-level public API operation and higher rate limits.

## Trial application — suggested app description

NestAffiliate is an affiliate intelligence and publishing workflow for Pinterest. It helps an authenticated business user discover products from supported marketplaces, preserve verified Product Truth, build and review Pinterest campaign creatives, enforce compliance and affiliate disclosure, and prepare or publish Pins only after explicit human approval.

Pinterest integration is intended to connect the user's own Pinterest Business account through OAuth, read boards and Pins required for workspace synchronization, read Pin analytics for performance measurement, and — when the application has the required Pinterest access tier — create Pins explicitly selected and approved by the user.

NestAffiliate never collects Pinterest passwords or session cookies and does not use generative AI to invent product price, stock, commission, rating or other commercial facts.

## Requested scopes — minimum intended set

Request only scopes needed by the implemented use case:

- boards:read
- pins:read
- pins:write
- user_accounts:read

Only request additional analytics-related scopes if Pinterest's current API configuration requires them for the exact endpoints used. Do not request Ads scopes unless an Ads feature is actually built.

## OAuth design

1. User chooses “Connect Pinterest” inside NestAffiliate.
2. NestAffiliate generates a cryptographically strong state value and redirects to Pinterest OAuth Authorization Code flow.
3. User authenticates directly on Pinterest and explicitly approves requested scopes.
4. Pinterest redirects to the exact registered callback URI.
5. A backend-only broker exchanges the authorization code using App ID + App Secret.
6. Secret, access token and refresh token never enter client-visible Firestore documents, frontend env vars or browser source.
7. The broker refreshes tokens as required and returns only connection status/capability metadata to the frontend.

## Redirect URI

The production callback must be a direct HTTPS endpoint under the official domain or another MillionsNest-controlled backend endpoint. It must exactly match the URI registered in Pinterest and must not immediately redirect to a second callback URI.

Do not register a browser-only callback that would require exposing the App Secret.

**Current state:** the callback URI is intentionally not finalized until a secure backend broker is available. This remains an external/credential-path gate, not a frontend gap.

## Standard Access demo checklist

Record one continuous flow showing:

1. NestAffiliate production domain.
2. Connections → Pinterest.
3. User clicks Connect Pinterest.
4. Browser navigates to Pinterest OAuth.
5. User grants the requested scopes.
6. Browser returns to NestAffiliate.
7. NestAffiliate shows connected Pinterest account/status without exposing a token.
8. Read boards or Pins from Pinterest.
9. Open a campaign reviewed by a human.
10. Demonstrate the Pinterest API action supported in Trial/Sandbox.
11. Show Product Truth and affiliate disclosure.
12. Show public auto-publish gated while Standard Access is absent.
13. Open https://nestaffiliate.millionsnest.com/privacy.

## Standard Access request — concise use case

NestAffiliate connects a user's own Pinterest Business account to an affiliate publishing workspace. Users explicitly select and approve campaigns before any Pinterest publishing action. The integration reads the user's boards/Pins and analytics to synchronize the workspace and measure performance. Write access is used only for Pins explicitly approved by the user. Credentials are handled through OAuth Authorization Code flow, secrets/tokens are backend-only, and the application does not collect Pinterest login credentials or session cookies.

## Manual actions that still require the account owner

1. **Done:** official Pinterest profile created as @achadosdonest.
2. Confirm the account is a **Pinterest Business** account and its email is verified.
3. Open Pinterest Developers → My apps and accept the Developer Terms.
4. Submit Trial Access using the app description and Privacy Policy URL above.
5. After Trial approval, provision App ID/App Secret securely to the backend broker.
6. Register the exact redirect URI provided by the deployed broker.
7. Run the OAuth flow and Trial/Sandbox demo.
8. Record the Standard Access video.
9. Submit Upgrade to Standard Access.

Do not wait for steps 2–9 to begin publishing manually through Guided Publisher.

## Security non-negotiables

- Never paste App Secret, access token or refresh token into chat, GitHub, frontend env vars or client-readable Firestore.
- Never ask users for Pinterest passwords.
- Use OAuth state/CSRF protection.
- Use HTTPS/TLS only.
- Keep Standard/public publishing disabled until Pinterest grants the required access tier.
