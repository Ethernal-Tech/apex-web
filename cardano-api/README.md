# Cardano API for Apex Bridge usage written in Go

# How to generate config files
All options
``` shell
$ go run ./main.go generate-configs \      
        --output-dir "<path to config jsons output directory>" \
        --output-file-name "<config json output file name>.json" \
        --prime-network-id <network id of prime network> \
        --prime-network-magic <network magic of prime network> \
        --prime-ogmios-url "<ogmios URL for prime network>" \
        --prime-blockfrost-url "<blockfrost URL for prime network>" \
        --prime-blockfrost-api-key "<blockfrost API key for prime network>" \
        --prime-socket-path "<socket path for prime network>" \
        --prime-ttl-slot-inc <ttl slot increment for prime> \
        --vector-network-id <network id of vector network> \
        --vector-network-magic <network magic of vector network> \
        --vector-ogmios-url "<ogmios URL for vector network>" \
        --vector-blockfrost-url "<blockfrost URL for vector network>" \
        --vector-blockfrost-api-key "<blockfrost API key for vector network>" \
        --vector-socket-path "<socket path for vector network>" \
        --vector-ttl-slot-inc <ttl slot increment for vector> \
        --vector-is-enabled <chain enable flag for vector> \
        --nexus-is-enabled <chain enable flag for nexus> \
        --logs-path "<path to where logs will be stored>" \
        --utxo-cache-timeout <how long should utxos be locked> \
        --oracle-api-url <URL of Oracle API> \
        --oracle-api-key <API Key of Oracle API> \
        --api-port <port at which API should run> \
        --api-keys "<api key 1>" \
        --api-keys "<api key 2>" \
        --utxo-cache-keys "<utxo cache key 1>" \
        --utxo-cache-keys "<utxo cache key 2>"
```

Minimal example
``` shell
$ go run ./main.go generate-configs \
        --prime-network-magic 142 \
        --prime-blockfrost-url "https://cardano-preview.blockfrost.io/api/v0" \
        --vector-network-magic 242 \
        --vector-blockfrost-url "https://cardano-preview.blockfrost.io/api/v0" \
        --oracle-api-url "http://bridge-api-testnet.apexfusion.org:10003" \
        --oracle-api-key "test-api-key-001" \
        --api-keys "test_api_key_1" \
        --utxo-cache-keys "utxo_cache_test_api_key_1"
```

Full example
``` shell
$ go run main.go generate-configs\
		--output-dir "."\
		--output-file-name "config.json"\
		--prime-network-id 0\
		--prime-network-magic 3311\
		--prime-blockfrost-url "https://blockfrost-m1.demeter.run"\
                --prime-blockfrost-api-key "test_demeter_api_key_1"\
		--vector-network-id 1\
		--vector-network-magic 764824073\
		--vector-ogmios-url "http://ogmios.vector.testnet.apexfusion.org:1337"\
                --vector-is-enabled \
                --nexus-is-enabled \
		--logs-path "./logs"\
		--utxo-cache-timeout 1m30s\
                --oracle-api-url "http://bridge-api-testnet.apexfusion.org:10003" \
                --oracle-api-key "oracle_api_key_1" \
		--api-port 41000\
		--api-keys "cardano_api_key_1"\
                --utxo-cache-keys "utxo_cache_api_key_1"
```

# How to start cardano api
``` shell
$ go run main.go run-cardano-api --config "./config.json"
```

# Bridging transaction indexer
When the optional `indexer` section is present in the config, cardano api tracks bridging requests on source chains
(without waiting for confirmations) and exposes them on `GET /api/BridgingTx/GetNew?after=<seq>&limit=<n>`.
Web-api pulls them from there and stores them as `Pending` bridging transactions.

Per-chain keys match the ones in apex-bridge oracle configs, so RPC related settings can be copied over unchanged.
Durations are in nanoseconds.
```json
"indexer": {
    "dbsPath": "./indexer-dbs-reactor",
    "chainIDsConfigPath": "./chain_ids_config.json",
    "retentionPeriod": 259200000000000,
    "cardanoChains": {
        "prime": {
            "networkAddress": "relay.prime.example:3001",
            "startSlot": 1000,
            "startBlockHash": "<hash of the block at startSlot>",
            "resumeBlockDepth": 20
        },
        "vector": {
            "networkAddress": "relay.vector.example:3001",
            "startSlot": 1000,
            "startBlockHash": "<hash of the block at startSlot>"
        }
    },
    "ethChains": {
        "nexus": {
            "nodeUrl": "https://rpc.nexus.example",
            "gatewayAddress": "0x...",
            "startBlockNumber": 100000,
            "syncBatchSize": 20,
            "poolIntervalMs": 5000,
            "rescanConfirmationStrategy": "finalized",
            "rescanInterval": 300000000000,
            "rescanMaxBlocks": 200
        }
    }
}
```
- Cardano chains must also be defined in `cardanoChains` (network magic is taken from there). `networkAddress` is a
  cardano-node relay (node-to-node), the same one apex-bridge uses for its indexer. Ogmios can not be used for indexing.
- The bridging address of each Cardano chain is the one from the config, kept up to date on validator change.
- `gatewayAddress` is the Reactor gateway on Nexus.
- EVM logs are tracked with zero confirmations. Every `rescanInterval` (and after each restart) blocks after the safe
  block (`finalized`, or latest - `rescanNumBlockConfirmations`) are read again, so txs moved by reorgs are not missed.
- `chainIDsConfigPath` points to the same chain IDs file apex-bridge uses (`{"chainIDs": [...]}`).
- Output of block syncers and event trackers is written to `<chainID>-indexer.log` next to the main log file
  (same as in apex-bridge). Its level can be set with `indexer.logLevel` (hclog levels, e.g. `3` for info);
  by default the app log level is used. Newly indexed txs and tracker restarts are logged to the main log.
- When a Reactor and a Skyline cardano api run on the same machine, each needs its own `dbsPath`.

# Telemetry
Indexer progress can be exported to Prometheus, the same way apex-bridge does it. Telemetry is enabled when
`telemetry.prometheusAddr` is set; metrics are then served on `http://<prometheusAddr>/metrics`.
```json
"telemetry": {
    "prometheusAddr": "0.0.0.0:5001",
    "pullTime": 10000000000
}
```
- `cardano_api_indexers_block_counter_<chainID>` is increased whenever the indexer of a chain moves to a new block
  (Cardano slot, EVM block number), checked every `pullTime` (nanoseconds, 10s by default). A counter
  that stops increasing means the indexer of that chain is stuck. A chain appears only after its first new block.
- Works only together with the `indexer` section.
