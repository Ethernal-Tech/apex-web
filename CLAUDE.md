# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Apex Web is the web layer of the Apex bridge (Skyline and Reactor): a user-facing bridge app plus
audit/explorer pages. It is a monorepo of independent projects, each with its own dependencies
and no root-level build.

## Layout

| Dir | What | Stack |
| --- | --- | --- |
| `cardano-api/` | Builds unsigned Cardano bridging transactions and serves bridge settings | Go 1.24, cobra CLI |
| `web-api/` | Backend for the frontends: bridge tx history, settings, stats, prices, locked tokens | NestJS, TypeORM, PostgreSQL |
| `frontend-new/` | Current frontend; recent feature work lands here | TanStack Start/Router, React Query, Tailwind, Radix, Vite |
| `frontend/` | Legacy frontend (CRA + Redux); logic migrated to `frontend-new` in #198 | React, react-app-rewired |
| `postman-collections/` | Manual API test collections | – |

## Runtime topology

- Two `cardano-api` instances run side by side, one per bridge:
  `go run main.go run-cardano-api --config config_skyline.json` and `--config config_reactor.json`.
- One `web-api` talks to both `cardano-api` instances and both bridge oracles, configured via
  `ORACLE_{SKYLINE,REACTOR}_{URL,API_KEY}` and `CARDANO_API_{SKYLINE,REACTOR}_{URL,API_KEY}`.
  Copy `web-api/.env.development.example` to `web-api/.env`.
- The frontends talk only to `web-api`.
- `cardano-api` loads its direction config (chains and directions) from the oracle over HTTP.

## Commands

### cardano-api (run from `cardano-api/`)

```bash
make build                        # go build with version ldflags
make lint                         # golangci-lint (config is v1 format)
make unit-test                    # go test -race -shuffle=on, excludes e2e
go test ./api/... -run TestName   # single test
make swag-generate                # writes swagger into ../../apex-bridge/docs/cardano-api
```

### web-api (run from `web-api/`)

```bash
npm install --legacy-peer-deps    # mjml/nodemailer peer conflict; without it npm ci rejects the lock
npm run start:debug               # watch mode
npm run lint
npm test                          # jest
npx jest src/bridgeTransaction/txTtl.spec.ts   # single file
npx jest -t "test name"                        # single test
npm --name=<name> run migration:generate       # TypeORM migration into src/database/migrations
npm run migration:run
npm run swagger:generate
```

Requires Node 24 and PostgreSQL 14 (README.md has the DB/role setup).

### frontend-new (run from `frontend-new/`)

```bash
npm run dev
npm run build
npm run lint
npm test                          # vitest run
npx vitest run path/to/file.test.ts
```

### frontend (legacy, run from `frontend/`)

```bash
npm start
npm run lint
npm run swagger                   # regenerate API client with nswag
```

## Architecture notes

- **web-api**: one NestJS module per domain in `src/<domain>/` (controller, service, dto, entity,
  module). A global `ApiKeyGuard` (`src/common/guards/api-key.guard.ts`) protects every route.
  Background polling lives in services (`bridgeTransaction`, `settings`, `lockedTokens`,
  `tokenPrice`): a 10 s cron (`updateStatusesJob`) refreshes non-final bridge tx statuses from
  the Skyline/Reactor oracles or LayerZero, gated by `statusUpdateModesSupported`, and settings (bridging and
  gateway addresses) are pulled from `cardano-api`. The DB data source is
  `src/database/data.source.ts`.
- **cardano-api**: entry `main.go` -> `cli/`; `cli/cardano-api` runs the HTTP server in `api/`.
  `api/controllers/skyline_tx_controller.go` and `reactor_tx_controller.go` are the two bridge
  flavours; `core/` holds config and interfaces, `cardano/` the chain-specific helpers.
- **frontend-new**: file-based routes in `src/routes/` (`routeTree.gen.ts` is generated, do not
  edit). The typed API client is `src/swagger/apexBridgeApiService.ts`; environment settings are
  `src/settings/appSettings_{development,production}.json`.
- Supported chains span Cardano, EVM (Nexus, Base, etc.), and Solana; wallet and fee logic is
  per-chain in the frontend.

## CI

`.github/workflows/lint.yml` (golangci-lint for `cardano-api`, ESLint for `web-api` and `frontend`)
and `unit-test.yml` (cardano-api unit tests) run on PRs and on pushes to `main` and `feat/skyline`.

## Deployment note

Depending on deployment, copy `llms.txt` and `llm.txt` (mainnet) or `llms_testnet.txt` (testnet)
from `frontend/public_example` to `frontend/public/`; `llm.txt` and `llms.txt` must be identical.

## Stack

Languages: Go, JavaScript, TypeScript.

- Go 1.24.1 (cardano-api)

## Verification

- Before a push: `(cd cardano-api && GOTOOLCHAIN=local golangci-lint run && GOTOOLCHAIN=local go test ./...)` (the fast gate).
- Before a PR: `(cd cardano-api && GOTOOLCHAIN=local golangci-lint run && GOTOOLCHAIN=local go test -race ./... && GOTOOLCHAIN=local go run golang.org/x/vuln/cmd/govulncheck@v1.8.0 ./...)` (the full gate).
- Build (go): `go vet ./...` (or `golangci-lint run`), `go test ./...` and `govulncheck ./...`,
  each with `GOTOOLCHAIN=local`; a `net/http` service also gets API E2E tests through
  `httptest` against a real database (testcontainers-go), then scripted HTTP requests.
- Then ask Claude to run its verify skill: a Scenario, Layer, Outcome table from real output.
- Results come from real output; anything not run is reported as not run.

## Rules

- Conventional commits, `<type>(<scope>): <summary>`. Why: the squash commit takes the PR
  title, and a readable history is the project's record of changes.
- Claude verifies a task, then leaves its changes unstaged and names the files; the engineer
  commits them. Why: the engineer owns every commit.
- New environment variables go into `.env.example` with a name and no value. Why: secrets stay
  out of git and out of the model's context.
- Adopt the newest stable release of a dependency; fix the code instead of pinning back. Why:
  old versions pile up security fixes that are hard to catch up on.

## Don't

- Don't commit, push or open a PR unless asked; never push to `main` or force-push.
- Don't merge with a red or missing required check.
- Don't read, print or commit `.env` files.
- Don't describe unverified behaviour as verified.
