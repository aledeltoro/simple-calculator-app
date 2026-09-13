# Simple Calculator — Backend

Go HTTP service that evaluates mathematical expressions. The frontend sends raw
expression strings (e.g. `2 + 3 * 5 + (12 / 10)`) and receives a numeric result.
Parsing and evaluation are handled entirely in Go via `go/parser` and a recursive
AST walker — no external math libraries.

## Prerequisites

- **Go 1.27** (matches the `go 1.27.0` directive in `go.mod` and the
  `golang:1.27.1-alpine` build image in the Dockerfile).

## Setup

```sh
cd backend
go mod download
go run ./cmd/api
```

The server starts on **`:3000`**.

## Scripts

| Command | What it does |
|---|---|
| `go run ./cmd/api` | Build and run the API server on `:3000`. |
| `go build ./...` | Compile all packages (catches type errors). |
| `go vet ./...` | Static analysis for common mistakes. |
| `go test ./...` | Run all tests. |
| `go test -cover ./...` | Run tests with coverage summary. |

## Design Decisions

### Stack

| Concern | Choice | Rationale |
|---|---|---|
| Router | **go-chi/chi/v5** | Lightweight, idiomatic Go router with middleware support. No magic. |
| CORS | **go-chi/cors** | Companion middleware; wildcard origins for dev simplicity. |
| Parsing | **go/parser.ParseExpr** | Standard library — turns raw strings into typed ASTs with zero dependencies. |
| Evaluation | **Custom recursive AST walker** | Full control over supported operations; maps cleanly to Go's `ast` and `token` packages. |
| Testing | **testify/require** | Fail-fast assertions; no need for a full test framework. |

Deliberately avoided: external math libraries, database drivers, config loaders,
frameworks.

### Error taxonomy

Seven sentinel errors in `internal/models/errors.go` drive all API responses:

| Error | HTTP status | `code` |
|---|---|---|
| `ErrEmptyExpression` | 400 | `bad_request` |
| `ErrExpressionParsingFailed` | 400 | `bad_request` |
| `ErrUnsupportedMathOperation` | 400 | `bad_request` |
| `ErrDivisionByZero` | 400 | `bad_request` |
| `ErrComplexNumberCalculationsNotSupported` | 400 | `bad_request` |
| `ErrRequestParseFailed` | 400 | `bad_request` |
| `ErrUnsupportedExpressionFound` | 500 | `internal_service_error` |

`WriteErrorResponse` in `internal/api/response.go` maps sentinel errors to HTTP
status codes and JSON envelopes. The `statusCode` and wrapped `err` are never
serialized — only `code` and `message` reach the client.

### CORS

The backend enables CORS for all `http://*` origins with `AllowCredentials: false`
and a 5-minute preflight cache. The frontend calls the API directly cross-origin;
there is no reverse proxy or dev-server proxy.

## Architecture

```
backend/
├── cmd/api/
│   ├── main.go                  # entry point: wires router, CORS, middleware, routes
│   └── build/Dockerfile         # multi-stage build (golang → alpine)
├── internal/
│   ├── api/
│   │   ├── error.go             # APIErr type (code + message JSON envelope)
│   │   ├── response.go          # WriteJSONResponse / WriteErrorResponse
│   │   └── handler/
│   │       └── handler.go       # HTTP controller: JSON decode → service → JSON encode
│   ├── evaluation/
│   │   └── evaluate.go          # recursive AST walker (Binary, Unary, Paren, BasicLit)
│   ├── models/
│   │   ├── models.go            # CalculateRequest / CalculateResponse DTOs
│   │   └── errors.go            # 7 sentinel errors
│   └── service/
│       └── service.go           # business logic: validate → parse string → AST
├── go.mod
└── go.sum
```

**Layers import only inward** (top → bottom):

- `cmd/api/main.go` wires everything together (router, middleware, handler, service).
- `handler/` decodes HTTP requests, calls the service, encodes responses. It knows
  `models`, `api`, and `service` — but never `evaluation` directly.
- `service/` owns the business logic interface (`CalculatorService`). It knows
  `models` and `evaluation` — but never `api` or `handler`.
- `evaluation/` is pure computation. It knows only `models` (for sentinel errors)
  and the standard library (`go/ast`, `go/token`, `math`).
- `models/` is the leaf layer. It holds data structs and sentinel errors with zero
  imports from the rest of the codebase.

### Data flow

```
POST /api/v1/calculations  { "expression": "2 + 3 * 5" }
        │
        ▼
   handler.HandleCalculate()
        │  JSON decode → CalculateRequest{Expression: "2 + 3 * 5"}
        │
        ▼
   service.Calculate("2 + 3 * 5")
        │  validate non-empty
        │  go/parser.ParseExpr → ast.Expr
        │
        ▼
   evaluation.Evaluate(ast)
        │  recursive walk: BinaryExpr(+), BinaryExpr(*), BasicLit(2), BasicLit(3), BasicLit(5)
        │  returns float64(17)
        │
        ▼
   handler encodes → CalculateResponse{Result: 17}
        │
        ▼
   200 { "result": 17 }
```

### Expression language

The Go parser (`go/parser.ParseExpr`) accepts standard mathematical notation:

| Operation | Syntax | Example | Notes |
|---|---|---|---|
| Addition | `a + b` | `2 + 3` | |
| Subtraction | `a - b` | `10 - 4` | |
| Multiplication | `a * b` | `3 * 5` | |
| Division | `a / b` | `10 / 3` | Float division; zero raises `ErrDivisionByZero` |
| Exponentiation | `a ^ b` | `2 ^ 3` | `math.Pow`; negative base raises `ErrComplexNumberCalculationsNotSupported` |
| Square root | `x ^ 0.5` | `9 ^ 0.5` | Use exponentiation; no `√` function |
| Percentage | `x / 100` | `50 / 100` | Use division; no `%` operator |
| Unary minus | `-x` | `-5` | |
| Parentheses | `(expr)` | `(2 + 3) * 4` | |

**Not supported:** `%` operator, implicit multiplication (`2x`), named functions
(`sqrt(x)`), variables, string expressions.

The frontend maps friendly UI symbols to this subset (e.g. `√x` → `(x)^0.5`,
`%x` → `(x)/100`, `±` → `-(...)`).

## Testing

```sh
go test ./...            # run all tests
go test -cover ./...     # run with coverage summary
```

There are **4 test files** (~341 lines) using `testify/require`:

| Package | File | What it covers |
|---|---|---|
| `service` | `service_test.go` | `Calculate` — success, parse failure, empty expression (3 cases) |
| `evaluation` | `evaluate_test.go` | Full AST walker — arithmetic, exponentiation, root, percent, errors (12 cases) |
| `api` | `response_test.go` | `WriteJSONResponse` + `WriteErrorResponse` — status mapping, encoding failures (5 cases) |
| `api/handler` | `handler_test.go` | HTTP handler — success, bad JSON, service error (3 cases) |

Tests use `httptest.NewRecorder` and `httptest.NewRequest` for HTTP layer tests.
Handler tests wire a real chi router and real service (not mocked) to verify the
full integration within the handler boundary.

## Coverage

Excludes `cmd/api/main.go` (wiring-only entry point, not unit-tested).
Run `./scripts/coverage.sh` from `backend/` to regenerate.

| Package | Coverage |
|---|---|
| `internal/api/handler` | 100.0% |
| `internal/service` | 100.0% |
| `internal/api` | 94.1% |
| `internal/evaluation` | 93.9% |
| `cmd/api` | 0.0% (excluded) |
| **Total** | **96.0%** |

## Docker

Multi-stage `Dockerfile` at `cmd/api/build/Dockerfile`:

1. **Build stage** (`golang:1.27.1-alpine`): downloads deps, compiles a static
   binary with `CGO_ENABLED=0`.
2. **Run stage** (`alpine:3.24`): copies the binary, exposes `3000`.

```sh
# From the repo root, with Compose:
docker compose up --build

# Or build standalone:
docker build -f backend/cmd/api/build/Dockerfile -t calculator-api backend/
docker run -p 3000:3000 calculator-api
```

The `api` service in `docker-compose.yml` builds from `backend/cmd/api/build/Dockerfile`
and publishes `:3000`. The frontend service (`:8080`) calls it directly cross-origin.

## API contract

Full reference in [API_RESOURCES.md](../API_RESOURCES.md).

**`GET /health`** → `200 {"status":"ok"}`

**`POST /api/v1/calculations`**

```json
// request
{ "expression": "2 + 3 * 5 + (12 / 10)" }
```

```json
// success 200
{ "result": 18.2 }
```

```json
// error 400
{ "code": "bad_request", "message": "division by zero not allowed" }
```

```json
// error 500
{ "code": "internal_service_error", "message": "Internal server error" }
```

`result` is a JSON number (`float64`). `bad_request` messages are the raw sentinel
error strings — the frontend surfaces them verbatim.
