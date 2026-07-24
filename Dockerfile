FROM golang:1.22-alpine AS build
WORKDIR /src
RUN apk add --no-cache git ca-certificates
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /out/engagepulse ./cmd/engagepulse

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=build /out/engagepulse /app/engagepulse
COPY migrations /app/migrations
EXPOSE 8080 9090
ENTRYPOINT ["/app/engagepulse"]
