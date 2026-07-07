.PHONY: build run fmt vet test up down logs migrate seed

build:
	go build -o bin/engagepulse ./cmd/engagepulse

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
