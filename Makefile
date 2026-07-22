.PHONY: build run fmt vet test up down logs migrate seed loadgen demo

build:
	go build -o bin/engagepulse ./cmd/engagepulse
	go build -o bin/loadgen ./cmd/loadgen

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

demo:
	bash ./scripts/demo.sh
