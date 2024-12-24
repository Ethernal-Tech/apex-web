# Cardano API for Apex Bridge usage written in Go

# How to generate config files for Reactor
All options
``` shell
$ go run ./main.go generate-configs \      
        --output-dir "<path to config jsons output directory>" \
        --output-file-name "<config json output file name>.json" \
        --prime-network-id <network id of prime network> \
        --prime-network-magic <network magic of prime network> \
        --prime-bridging-address "<bridging address for prime network>" \
        --prime-bridging-fee-address "<bridging fee address for prime network>" \
        --prime-bridging-fallback-address "<bridging fallback address for prime network>" \
        --prime-ogmios-url "<ogmios URL for prime network>" \
        --prime-blockfrost-url "<blockfrost URL for prime network>" \
        --prime-blockfrost-api-key "<blockfrost API key for prime network>" \
        --prime-socket-path "<socket path for prime network>" \
        --prime-ttl-slot-inc <ttl slot increment for prime> \
        --vector-network-id <network id of vector network> \
        --vector-network-magic <network magic of vector network> \
        --vector-bridging-address "<bridging address for vector network>" \
        --vector-bridging-fee-address "<bridging fee address for vector network>" \
        --vector-bridging-fallback-address "<bridging fallback address for vector network>" \
        --vector-ogmios-url "<ogmios URL for vector network>" \
        --vector-blockfrost-url "<blockfrost URL for vector network>" \
        --vector-blockfrost-api-key "<blockfrost API key for vector network>" \
        --vector-socket-path "<socket path for vector network>" \
        --vector-ttl-slot-inc <ttl slot increment for vector> \
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
        --prime-bridging-address "addr_example" \
        --prime-bridging-fee-address "addr_example" \
        --prime-blockfrost-url "https://cardano-preview.blockfrost.io/api/v0" \
        --vector-network-magic 242 \
        --vector-bridging-address "addr_example" \
        --vector-bridging-fee-address "addr_example" \
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
		--prime-bridging-address "addr_test1wrz24vv4tvfqsywkxn36rv5zagys2d7euafcgt50gmpgqpq4ju9uv"\
		--prime-bridging-fee-address "addr_test1wq5dw0g9mpmjy0xd6g58kncapdf6vgcka9el4llhzwy5vhqz80tcq"\
		--prime-bridging-fallback-address "addr_test1vqfuetznnmngqzquslwcu0ygn2hq29vjlpytlpwss762vcgun5vvw"\
		--prime-ogmios-url "http://ogmios.prime.testnet.apexfusion.org:1337"\
		--vector-network-id 2\
		--vector-network-magic 1127\
		--vector-bridging-address "vector_test1w2h482rf4gf44ek0rekamxksulazkr64yf2fhmm7f5gxjpsdm4zsg"\
		--vector-bridging-fee-address "vector_test1wtyslvqxffyppmzhs7ecwunsnpq6g2p6kf9r4aa8ntfzc4qj925fr"\
		--vector-bridging-fallback-address "vector_test1w2h482rf4gf44ek0rekamxksulazkr64yf2fhmm7f5gxjpsdm4zsg"\
		--vector-ogmios-url "http://ogmios.vector.testnet.apexfusion.org:1337"\
		--logs-path "./logs"\
		--utxo-cache-timeout 1m30s\
                --oracle-api-url "http://bridge-api-testnet.apexfusion.org:10003" \
                --oracle-api-key "test-api-key-001" \
		--api-port 41000\
		--api-keys "cardano_api_key_1"\
		--api-keys "cardano_api_key_2" \
                --utxo-cache-keys "utxo_cache_api_key_1" \
                --utxo-cache-keys "utxo_cache_api_key_2"
```

# How to generate config files for Skyline
All options
``` shell
$ go run ./main.go generate-configs skyline \      
        --output-dir "<path to config jsons output directory>" \
        --output-file-name "<config json output file name>.json" \
        --prime-network-id <network id of prime network> \
        --prime-network-magic <network magic of prime network> \
        --prime-bridging-address "<bridging address for prime network>" \
        --prime-bridging-fee-address "<bridging fee address for prime network>" \
        --prime-bridging-fallback-address "<bridging fallback address for prime network>" \
        --prime-ogmios-url "<ogmios URL for prime network>" \
        --prime-blockfrost-url "<blockfrost URL for prime network>" \
        --prime-blockfrost-api-key "<blockfrost API key for prime network>" \
        --prime-socket-path "<socket path for prime network>" \
        --prime-ttl-slot-inc <ttl slot increment for prime> \
        --cardano-network-id <network id of cardano network> \
        --cardano-network-magic <network magic of cardano network> \
        --cardano-bridging-address "<bridging address for cardano network>" \
        --cardano-bridging-fee-address "<bridging fee address for cardano network>" \
        --cardano-bridging-fallback-address "<bridging fallback address for cardano network>" \
        --cardano-ogmios-url "<ogmios URL for cardano network>" \
        --cardano-blockfrost-url "<blockfrost URL for cardano network>" \
        --cardano-blockfrost-api-key "<blockfrost API key for cardano network>" \
        --cardano-socket-path "<socket path for cardano network>" \
        --cardano-ttl-slot-inc <ttl slot increment for cardano> \
        --logs-path "<path to where logs will be stored>" \
        --utxo-cache-timeout <how long should utxos be locked> \
        --oracle-api-url <URL of Oracle API> \
        --oracle-api-key <API Key of Oracle API> \
        --api-port <port at which API should run> \
        --api-keys "<api key 1>" \
        --api-keys "<api key 2>" \
        --utxo-cache-keys "<utxo cache key 1>" \
        --utxo-cache-keys "<utxo cache key 2>" \
        --prime-cardano-token-name "<wrapped token name for Cardano Ada>" \
        --cardano-prime-token-name "<wrapped token name for Prime Apex>"
```

Minimal example
``` shell
$ go run ./main.go generate-configs skyline \
        --prime-network-id 0\
        --prime-network-magic 3311 \
        --prime-bridging-address "addr_test1wrz24vv4tvfqsywkxn36rv5zagys2d7euafcgt50gmpgqpq4ju9uv" \
        --prime-bridging-fee-address "addr_test1wq5dw0g9mpmjy0xd6g58kncapdf6vgcka9el4llhzwy5vhqz80tcq" \
        --prime-blockfrost-url "https://cardano-preview.blockfrost.io/api/v0" \
        --cardano-network-id 0\
        --cardano-network-magic 3311 \
        --cardano-bridging-address "addr_test1wrz24vv4tvfqsywkxn36rv5zagys2d7euafcgt50gmpgqpq4ju9uv" \
        --cardano-bridging-fee-address "addr_test1wq5dw0g9mpmjy0xd6g58kncapdf6vgcka9el4llhzwy5vhqz80tcq" \
        --cardano-blockfrost-url "https://cardano-preview.blockfrost.io/api/v0" \
        --oracle-api-url "http://bridge-api-testnet.apexfusion.org:10003" \
        --oracle-api-key "test-api-key-001" \
        --api-keys "test_api_key_1" \
        --utxo-cache-keys "utxo_cache_test_api_key_1" \
        --prime-cardano-token-name 29f8873beb52e126f207a2dfd50f7cff556806b5b4cba9834a7b26a8.4b6173685f546f6b656e \
        --cardano-prime-token-name 29f8873beb52e126f207a2dfd50f7cff556806b5b4cba9834a7b26a8.Route3
```

Full example
``` shell
$ go run main.go generate-configs skyline \
		--output-dir "."\
		--output-file-name "config.json"\
		--prime-network-id 0\
		--prime-network-magic 3311\
		--prime-bridging-address "addr_test1wrz24vv4tvfqsywkxn36rv5zagys2d7euafcgt50gmpgqpq4ju9uv"\
		--prime-bridging-fee-address "addr_test1wq5dw0g9mpmjy0xd6g58kncapdf6vgcka9el4llhzwy5vhqz80tcq"\
		--prime-bridging-fallback-address "addr_test1vqfuetznnmngqzquslwcu0ygn2hq29vjlpytlpwss762vcgun5vvw"\
		--prime-ogmios-url "http://ogmios.prime.testnet.apexfusion.org:1337"\
		--cardano-network-id 0\
		--cardano-network-magic 3311\
		--cardano-bridging-address "addr_test1wrz24vv4tvfqsywkxn36rv5zagys2d7euafcgt50gmpgqpq4ju9uv"\
		--cardano-bridging-fee-address "addr_test1wq5dw0g9mpmjy0xd6g58kncapdf6vgcka9el4llhzwy5vhqz80tcq"\
		--cardano-bridging-fallback-address "addr_test1vqfuetznnmngqzquslwcu0ygn2hq29vjlpytlpwss762vcgun5vvw"\
		--cardano-ogmios-url "http://ogmios.prime.testnet.apexfusion.org:1337"\
		--logs-path "./logs"\
		--utxo-cache-timeout 1m30s\
                --oracle-api-url "http://bridge-api-testnet.apexfusion.org:10003" \
                --oracle-api-key "test-api-key-001" \
		--api-port 41000\
		--api-keys "cardano_api_key_1"\
		--api-keys "cardano_api_key_2" \
                --utxo-cache-keys "utxo_cache_api_key_1" \
                --utxo-cache-keys "utxo_cache_api_key_2" \
                --prime-cardano-token-name 29f8873beb52e126f207a2dfd50f7cff556806b5b4cba9834a7b26a8.4b6173685f546f6b656e \
                --cardano-prime-token-name 29f8873beb52e126f207a2dfd50f7cff556806b5b4cba9834a7b26a8.Route3
```

# How to start cardano api
``` shell
$ go run main.go run-cardano-api --config "./config.json"
```
