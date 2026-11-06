---
paths:
  - "web-api/**"
---

# web-api

- One Nest module per domain under `src/` (`bridgeTransaction`, `indexedTx`, `transaction`,
  `settings`, `stats`, `contact`, `blockchain`, `mailer`). Why: new endpoints follow the same
  controller/service/entity split.
- Config merges defaults, then `src/appConfig/config/config.<NODE_ENV>.json` (or `config.json`),
  then env vars validated by envalid in `appConfig.helper.ts`. Read it through `getAppConfig()`
  or `AppConfigService`. Why: a new env var must be declared in `envOverrides` or it is ignored.
- A global `ApiKeyGuard` checks the `x-api-key` header against `WEB_API_API_KEYS`, and lets
  every request through when that list is empty. Why: local dev without keys is open by design.
- `NEXUS_RPC_URL` must point at the Nexus network that cardano-api serves gateways from.
  Why: otherwise startup keeps retrying.
- Migrations are in `src/database/migrations`, the data source in `src/database/data.source.ts`.
  Schema changes come from `npm run migration:generate`; data migrations are hand-written
  (e.g. `1785800000000-AmountWeiColumns.ts`), and a migration that ships is never edited.
  Why: TypeORM records each migration's name once it has run.
- Install with `--legacy-peer-deps`. Why: the mjml/nodemailer peer conflict makes a plain install
  write a lockfile that `npm ci` rejects.
