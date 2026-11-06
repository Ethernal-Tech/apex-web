# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Apex Web is the user-facing part of the Apex Fusion bridge (Reactor and Skyline): a React UI, a
NestJS backend and a Go Cardano API. The three are independent projects with no shared workspace
tooling, so run each command from that project's directory.

## Stack

- Go 1.27.3 (cardano-api)
- NestJS 10.4.15, TypeORM 0.3.20, PostgreSQL, TypeScript 5.7.2, Jest 29.7.0 (web-api)
- React 18.2.0 (CRA 5 + react-app-rewired), Redux Toolkit 2.2.2, MUI 5.15.10, TypeScript 4.9.5 (frontend)

## Layout

| Path | Holds |
| --- | --- |
| `cardano-api/` | Go service: builds bridging txs, serves UTxOs and balances, indexes bridging requests on source chains (`cardano-api/README.md`) |
| `web-api/` | NestJS backend for the frontend: stores bridging txs in PostgreSQL and tracks their status |
| `frontend/` | React bridge UI with Cardano (Mesh) and EVM wallets |
| `postman-collections/` | Manual test collections for Reactor, Ogmios and Blockfrost |
| `.github/` | Lint and unit-test workflows, issue templates |
| `docs/` | Efficiency journal |
| `.claude/` | Claude Code settings, the core plugin's `ethernal.json`, and `rules/` with per-project notes that load when matching files are read |

## Commands

### cardano-api (Go)

```bash
cd cardano-api
make build                                   # binary with version ldflags
make lint                                    # golangci-lint run --config .golangci.yml (CI: v2.15.0)
make unit-test                               # go test -race -shuffle=on ... (skips e2e)
go test -run TestName ./txindexer/...        # single test
go run main.go generate-configs ...          # writes config.json; flags in cardano-api/README.md
go run main.go run-cardano-api --config ./config.json
```

Some tests need the Cardano CLI tools on PATH (CI installs them with a cardano-node action).

### web-api (NestJS)

```bash
cd web-api
npm ci --legacy-peer-deps      # also when regenerating package-lock.json (mjml/nodemailer peer conflict)
npm run start:dev              # watch mode; start:debug adds the inspector
npm run lint
npm run format
npx jest                       # no npm "test" script; jest config lives in package.json
npx jest src/indexedTx/indexedTx.helper.spec.ts
npm run migration:generate --name=<Name>
npm run migration:run
npm run swagger:generate       # OpenAPI spec used to regenerate the frontend client
```

Plain `npm install` writes a lockfile that `npm ci` in CI then rejects.

### frontend (React)

```bash
cd frontend
npm ci
npm start      # react-app-rewired start
npm run build
npm run lint
```

CI (`.github/workflows/lint.yml`, `unit-test.yml`) runs lint for all three projects and Go unit
tests only. On a PR, `@claude` (`claude.yml`) and `@claude-review` (`claude-review-comment.yml`)
comments run Claude.

## Data flow

1. The frontend asks web-api to create a bridging tx. web-api forwards it to cardano-api
   (`CARDANO_API_URL` with `CARDANO_API_API_KEY`), which builds the Cardano tx. The user signs it
   in the wallet and submits it.
2. web-api stores the tx in PostgreSQL (`bridgeTransaction` module).
3. Status tracking runs as `@nestjs/schedule` cron jobs in web-api. Each job stops itself while
   it runs, so runs never overlap:
   - `indexedTx` (every 3 s, Reactor mode only) pulls newly indexed bridging requests from
     cardano-api `GET /api/BridgingTx/GetNew?after=<seq>&limit=<n>` and stores them as `Pending`.
   - `bridgeTransaction.updateStatuses` (every 10 s) asks the oracle (`ORACLE_URL`) for the state
     of every non-final tx.
   - `settings` (every 30 s) tracks validator-change status from cardano-api.
   - `STATUS_UPDATE_MODES_SUPPORTED` (e.g. `reactor`) decides which modes these jobs handle.

## Verification

- Before a push: `(cd cardano-api && golangci-lint run && go test ./...)` (the fast gate).
- Before a PR: `(cd cardano-api && golangci-lint run && go test -race ./... && go run golang.org/x/vuln/cmd/govulncheck@v1.9.0 ./...)` (the full gate).
- No `GOTOOLCHAIN=local`: `go.mod` needs Go 1.27.3 and the go toolchain downloads it when the
  installed `go` is older.
- web-api and frontend changes: `npm run lint` in that project (CI runs it), plus `npx jest` in web-api.
- Then ask Claude to run its verify skill: a Scenario, Layer, Outcome table from real output.
- Results come from real output; anything not run is reported as not run.

## Rules

- Conventional commits, `<type>(<scope>): <summary>`. Why: the squash commit takes the PR
  title, and a readable history is the project's record of changes.
- In local sessions, Claude verifies a task, then leaves its changes unstaged and names the
  files; the engineer commits them (the `@claude` GitHub workflow may commit to the PR branch).
  Why: the engineer owns every commit.
- New environment variables go into `.env.example` (web-api: `.env.development.example` and
  `.env.production.example`) with a name and no value. Why: secrets stay out of git and out of
  the model's context.
- Adopt the newest stable release of a dependency; fix the code instead of pinning back. Why:
  old versions pile up security fixes that are hard to catch up on.

## Don't

- Don't commit, push or open a PR unless asked; never push to `main` or force-push.
- Don't merge with a red or missing required check.
- Don't read, print or commit `.env` files.
- Don't describe unverified behaviour as verified.
