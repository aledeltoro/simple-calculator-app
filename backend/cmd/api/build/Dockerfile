# syntax=docker/dockerfile:1
FROM golang:1.27.1-alpine AS build

# Create work directory
WORKDIR /app

# Copy and install dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy packages
COPY . ./

# Build binary
RUN CGO_ENABLED=0 GOOS=linux go build -v -o /api cmd/api/main.go

# Run stage
FROM alpine:3.24

COPY --from=build /api ./

# Expose API port
EXPOSE 3000

CMD ["/api"]