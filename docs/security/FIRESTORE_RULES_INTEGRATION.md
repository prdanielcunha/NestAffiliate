# Firestore Rules integration

NestAffiliate uses the shared MillionsNest Firebase project, so a repository-local replacement `firestore.rules` would be unsafe.

The additive source is `firebase/nestaffiliate.rules.fragment`.

Before production data writes are enabled:

1. merge the helper functions into the canonical `prdanielcunha/millionsnest/firestore.rules`;
2. add the `products/nestaffiliate` match inside the organization scope;
3. verify overlapping generic product rules do not broaden access;
4. run the canonical MillionsNest rules regression suite;
5. deploy the canonical ruleset from the MillionsNest repository;
6. validate tenant A/B isolation with the emulator and production-safe probes.

Never store provider access tokens, refresh tokens, API keys or client secrets in NestAffiliate client documents.
