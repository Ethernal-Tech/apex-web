---
paths:
  - "cardano-api/**"
---

# cardano-api

- Wiring lives in `cli/cardano-api/cardano_api.go`: load `core.AppConfig`, `config.FillOut`, then
  the API controllers, the validator-change watcher and, when configured, the indexer and
  telemetry. Why: a new component has to be started and disposed there.
- `config.FillOut` fetches direction and chain config from the oracle over HTTP. There is no
  local directions-config override. Why: the old `directionsConfig.json` override was removed.
- `txindexer/` reads Cardano blocks from a cardano-node relay (node-to-node, optionally mutual
  TLS; Ogmios cannot index) and Nexus gateway events, with zero confirmations and periodic
  rescans. Its state lives in bbolt DBs under `indexer.dbsPath`. Why: Reactor and Skyline
  instances on one machine each need their own `dbsPath`.
- `api/utxo_transformer/` keeps UTxOs used in recent txs out of new txs until
  `utxoCacheTimeout` expires. Why: otherwise concurrent txs double-spend inputs.
- Durations in config JSON are nanoseconds. Why: they decode straight into `time.Duration`.
- `gorules/` holds go-ruleguard rules that golangci-lint runs. Why: lint failures can come from
  there, not only from the linters in `.golangci.yml`.
- `cardano-infrastructure`, `gouroboros`, `blockchain-event-tracker` and `ethgo` are
  Ethernal-Tech forks. Fix them upstream, then bump the pseudo-version in `go.mod`. Why: there
  is no vendored copy.
