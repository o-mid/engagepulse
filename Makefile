.PHONY: build run fmt vet test up down logs migrate seed loadgen soak demo replay replay-kafka rulepatch shadow

build:
	go build -o bin/engagepulse ./cmd/engagepulse
	go build -o bin/loadgen ./cmd/loadgen
	go build -o bin/soak ./cmd/soak

run:
	go run ./cmd/engagepulse

fmt:
	gofmt -w .

vet:
	go vet ./...

test:
	go test ./...

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

migrate:
	go run ./cmd/engagepulse -migrate-only

seed: migrate
	@echo "seed data applied via migrations"

loadgen:
	go run ./cmd/loadgen -n 8

soak:
	go run ./cmd/soak

demo:
	bash ./scripts/demo.sh

replay:
	go test ./internal/replay -count=1 -run 'TestReplayPacks$$|TestFormatTraces'

replay-kafka:
	go test ./internal/replay -count=1 -run TestReplayPacksViaKafka

REQUEST ?= raise velocity threshold
rulepatch:
	go run ./cmd/rulepatch -request "$(REQUEST)"

shadow:
	go run ./cmd/shadow
