.PHONY: lint
lint: check-lint
	golangci-lint run --config .golangci.yml

.PHONY: build
build: check-go check-git
	$(eval COMMIT_HASH = $(shell git rev-parse HEAD))
	$(eval BRANCH = $(shell git rev-parse --abbrev-ref HEAD | tr -d '\040\011\012\015\n'))
	$(eval TIME = $(shell date))
	go build -o cardano-api -ldflags="\
		-X 'github.com/Ethernal-Tech/cardano-api/versioning.Commit=$(COMMIT_HASH)'\
		-X 'github.com/Ethernal-Tech/cardano-api/versioning.Branch=$(BRANCH)'\
		-X 'github.com/Ethernal-Tech/cardano-api/versioning.BuildTime=$(TIME)'" \
	main.go

.PHONY: unit-test
unit-test: check-go
	go test -race -shuffle=on -coverprofile coverage.out -timeout 20m `go list ./... | grep -v e2e`	

.PHONY: check-lint
check-lint:
	@which golangci-lint > /dev/null || (echo "golangci-lint is not installed. Please install and try again."; exit 1)

.PHONY: check-go
check-go:
	@which go > /dev/null || (echo "Go is not installed.. Please install and try again."; exit 1)

.PHONY: check-git
check-git:
	@which git > /dev/null || (echo "git is not installed. Please install and try again."; exit 1)

.PHONY: swag-install
swag-install:
	go install github.com/swaggo/swag/cmd/swag@latest
.PHONY: swag-generate
swag-generate:
	swag init --parseDependency -g api/controllers/skyline_tx_controller.go -o ../../apex-bridge/docs/cardano-api -ot yaml