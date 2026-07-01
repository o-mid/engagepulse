.PHONY: build run fmt vet test

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
