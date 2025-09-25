FROM golang:latest

WORKDIR /app
COPY .  .
RUN go mod download
RUN go build -o cardano-api main.go

CMD ["/app/cardano-api","run-cardano-api" ,"--config" ,"config.json"]
