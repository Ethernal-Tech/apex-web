# Cardano API for Apex Bridge usage written in Go

# How to generate config files
All options
``` shell
$ go run ./main.go generate-configs \      
        --output-dir "<path to config jsons output directory>" \
        --output-file-name "<config json output file name>.json" \
        --prime-network-id <network id of prime network> \
        --prime-network-magic <network magic of prime network> \
        --prime-bridging-fallback-address "<bridging fallback address for prime network>" \
        --prime-ogmios-url "<ogmios URL for prime network>" \
        --prime-blockfrost-url "<blockfrost URL for prime network>" \
        --prime-blockfrost-api-key "<blockfrost API key for prime network>" \
        --prime-socket-path "<socket path for prime network>" \
        --prime-ttl-slot-inc <ttl slot increment for prime> \
        --vector-network-id <network id of vector network> \
        --vector-network-magic <network magic of vector network> \
        --vector-bridging-fallback-address "<bridging fallback address for vector network>" \
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
		--prime-bridging-fallback-address "addr_test1vqfuetznnmngqzquslwcu0ygn2hq29vjlpytlpwss762vcgun5vvw"\
		--prime-blockfrost-url "https://blockfrost-m1.demeter.run"\
                --prime-blockfrost-api-key "test_demeter_api_key_1"\
		--vector-network-id 1\
		--vector-network-magic 764824073\
		--vector-bridging-fallback-address "addr1w8nv7cp7revdt70yuc96z4ke9pasa70grc5clhyf7q70f4spev3dn"\
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
