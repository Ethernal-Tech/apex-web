module github.com/Ethernal-Tech/cardano-api

go 1.23.1

// Points to a forked version of the gouroboros library, which raises the CBOR nesting limit
// Replace directives are not inherited from dependencies, so the indexer would otherwise
// use the original library.
replace github.com/blinklabs-io/gouroboros => github.com/Ethernal-Tech/gouroboros v0.0.0-20260914132917-4454e1199f8f

require (
	github.com/blinklabs-io/gouroboros v0.103.1 // indirect
	github.com/felixge/httpsnoop v1.0.4 // indirect
	github.com/fxamacker/cbor/v2 v2.7.0
	github.com/hashicorp/go-hclog v1.6.3
	github.com/jinzhu/copier v0.4.0 // indirect
	github.com/utxorpc/go-codegen v0.12.0 // indirect
	github.com/x448/float16 v0.8.4 // indirect
	golang.org/x/crypto v0.29.0 // indirect
	google.golang.org/protobuf v1.35.2 // indirect
)

require (
	github.com/Ethernal-Tech/cardano-infrastructure v0.0.0-20261022131430-c1ab64eea8bc
	github.com/fatih/color v1.18.0 // indirect
	github.com/gorilla/handlers v1.5.2
	github.com/gorilla/mux v1.8.1
	github.com/mattn/go-colorable v0.1.13 // indirect
	github.com/mattn/go-isatty v0.0.20 // indirect
	github.com/spf13/cobra v1.8.1
	golang.org/x/sys v0.29.0 // indirect
)

require (
	github.com/ethereum/go-ethereum v1.14.11
	github.com/inconshreveable/mousetrap v1.1.0 // indirect
	github.com/ryanuber/columnize v2.1.2+incompatible
	github.com/spf13/pflag v1.0.6 // indirect
)

require (
	github.com/holiman/uint256 v1.3.1 // indirect
	github.com/sethvargo/go-retry v0.2.4
)

require (
	github.com/davecgh/go-spew v1.1.2-0.20180830191138-d8f796af33cc // indirect
	github.com/pmezard/go-difflib v1.0.1-0.20181226105442-5d4384ee4fb2 // indirect
	github.com/quasilyte/go-ruleguard v0.4.2
	github.com/stretchr/objx v0.5.2 // indirect
	github.com/stretchr/testify v1.10.0
	gopkg.in/yaml.v3 v3.0.1 // indirect
)

require (
	github.com/go-toolsmith/astcopy v1.0.2 // indirect
	github.com/go-toolsmith/astequal v1.0.3 // indirect
	github.com/quasilyte/go-ruleguard/dsl v0.3.22
	github.com/quasilyte/gogrep v0.5.0 // indirect
	github.com/quasilyte/stdinfo v0.0.0-20220114132959-f7386bf02567 // indirect
	golang.org/x/exp/typeparams v0.0.0-20240213143201-ec583247a57a // indirect
	golang.org/x/mod v0.19.0 // indirect
	golang.org/x/sync v0.10.0 // indirect
	golang.org/x/tools v0.23.0
)

require (
	github.com/Ethernal-Tech/blockchain-event-tracker v0.0.0-20261023113908-ed976452bc2d
	github.com/Ethernal-Tech/ethgo v0.0.0-20240902085129-307ec04e3e94
	github.com/hashicorp/go-metrics v0.5.4
	github.com/prometheus/client_golang v1.19.1
	go.etcd.io/bbolt v1.4.3
)

require (
	filippo.io/edwards25519 v1.1.0 // indirect
	github.com/andybalholm/brotli v1.1.0 // indirect
	github.com/beorn7/perks v1.0.1 // indirect
	github.com/btcsuite/btcd/btcec/v2 v2.3.4 // indirect
	github.com/cespare/xxhash/v2 v2.3.0 // indirect
	github.com/decred/dcrd/dcrec/secp256k1/v4 v4.3.0 // indirect
	github.com/google/gofuzz v1.2.0 // indirect
	github.com/gorilla/websocket v1.5.3 // indirect
	github.com/hashicorp/go-immutable-radix v1.0.0 // indirect
	github.com/hashicorp/golang-lru v0.5.0 // indirect
	github.com/klauspost/compress v1.17.9 // indirect
	github.com/mitchellh/mapstructure v1.5.0 // indirect
	github.com/prometheus/client_model v0.5.0 // indirect
	github.com/prometheus/common v0.48.0 // indirect
	github.com/prometheus/procfs v0.12.0 // indirect
	github.com/umbracle/fastrlp v0.1.1-0.20230504065717-58a1b8a9929d // indirect
	github.com/valyala/bytebufferpool v1.0.0 // indirect
	github.com/valyala/fasthttp v1.55.0 // indirect
	github.com/valyala/fastjson v1.6.4 // indirect
	gopkg.in/natefinch/lumberjack.v2 v2.2.1 // indirect
)
