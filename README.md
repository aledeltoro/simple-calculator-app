# Simple Calculator

[![codecov](https://codecov.io/github/aledeltoro/simple-calculator-app/branch/ci%2Fadd-code-coverage-workflow/graph/badge.svg?token=V45KDDC0HT)](https://codecov.io/github/aledeltoro/simple-calculator-app)

Full-stack calculator app. A React frontend renders the UI and maps button gestures
into expression strings; a Go backend parses and evaluates them. No math happens in
the browser — the backend is the source of truth.

```
┌──────────────┐   HTTP (cross-origin)   ┌──────────────┐
│   Frontend   │ ───────────────────────→│    Backend   │
│  React + TS  │   POST /api/v1/...      │   Go + chi   │
│  :8080       │                         │   :3000      │
└──────────────┘                         └──────────────┘
```

- **Frontend docs:** [frontend/README.md](frontend/README.md)
- **Backend docs:** [backend/README.md](backend/README.md)
- **API contract:** [API_RESOURCES.md](API_RESOURCES.md)
- **Frontend design plan:** [SPEC.md](SPEC.md)

## Prerequisites

- **Node.js 20** + npm
- **Go 1.27**
- **Docker + Docker Compose** (for containerized deployment)

## Local development

Start the backend and frontend in separate terminals:

```sh
# Terminal 1 — backend (starts on :3000)
cd backend
go mod download
go run ./cmd/api

# Terminal 2 — frontend (starts on :5173)
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies nothing — the browser
calls the backend directly at `http://localhost:3000` (CORS is enabled on the
backend).

### API base URL override

The frontend reads `VITE_API_BASE_URL` (default `http://localhost:3000`). To point
at a different API, set it before starting the dev server or rebuild the Docker
image with `--build-arg VITE_API_BASE_URL=https://api.example.com`.

## Docker Compose (full stack)

From the repo root:

```sh
docker compose up --build
```

| Service | URL | Notes |
|---|---|---|
| **Frontend** | `http://localhost:8080` | nginx serving static SPA |
| **Backend** | `http://localhost:3000` | Go API |

The frontend image is built with `VITE_API_BASE_URL=http://localhost:3000` baked in
at build time. nginx serves the SPA with an immutable cache on hashed assets and a
`no-store` policy on `index.html`. There is no `proxy_pass` — the browser calls the
API cross-origin (CORS allows it).

**Hard refresh** (Cmd+Shift+R / Ctrl+Shift+R) if you see stale bundles after a
rebuild.

## API examples

**Health check:**

```sh
curl http://localhost:3000/health
# → {"status":"ok"}
```

**Calculate:**

```sh
curl -X POST http://localhost:3000/api/v1/calculations \
  -H "Content-Type: application/json" \
  -d '{"expression": "2 + 3 * 5 + (12 / 10)"}'
# → {"result":18.2}
```

**Division by zero:**

```sh
curl -X POST http://localhost:3000/api/v1/calculations \
  -H "Content-Type: application/json" \
  -d '{"expression": "1 / 0"}'
# → {"code":"bad_request","message":"division by zero not allowed"}
```

**Square root (via exponentiation):**

```sh
curl -X POST http://localhost:3000/api/v1/calculations \
  -H "Content-Type: application/json" \
  -d '{"expression": "9 ^ 0.5"}'
# → {"result":3}
```

Full request/response specs: [API_RESOURCES.md](API_RESOURCES.md).

## Expression language

The backend accepts standard mathematical notation via Go's `go/parser.ParseExpr`:

| Operation | Syntax | Example |
|---|---|---|
| Addition | `a + b` | `2 + 3` |
| Subtraction | `a - b` | `10 - 4` |
| Multiplication | `a * b` | `3 * 5` |
| Division | `a / b` | `10 / 3` |
| Exponentiation | `a ^ b` | `2 ^ 3` |
| Square root | `x ^ 0.5` | `9 ^ 0.5` |
| Percentage | `x / 100` | `50 / 100` |
| Unary minus | `-x` | `-5` |
| Parentheses | `(expr)` | `(2 + 3) * 4` |

The frontend maps friendly UI symbols to this subset (`√x` → `(x)^0.5`, `%x` →
`(x)/100`, `±` → `-(...)`, `×` → `*`, `÷` → `/`, `xʸ` → `^`).

## Testing

```sh
# Backend
cd backend && go test ./...

# Frontend
cd frontend && npm run test:coverage
```

Coverage thresholds: backend uses `go test -cover`, frontend enforces **>85% lines**
(currently 100%).

## Project structure

```
simple-calculator-app/
├── backend/                  # Go API (chi + go/parser)
│   ├── cmd/api/              # entry point + Dockerfile
│   └── internal/             # handler, service, evaluation, models
├── frontend/                 # React + TypeScript (Vite + Vitest)
│   └── src/
│       ├── api/              # typed fetch client
│       ├── calculator/       # pure logic (transform, reducer, validation)
│       ├── hooks/            # useCalculator (reducer + API wiring)
│       ├── components/       # UI (App, Display, Keypad, Button, ErrorBanner)
│       └── styles/           # CSS Modules + design tokens
├── API_RESOURCES.md          # API contract
├── SPEC.md                   # Frontend design plan
├── docker-compose.yml        # Full-stack deployment
└── README.md                 # ← you are here
```

## Design decisions

- **No proxy.** The browser calls the backend directly cross-origin. The backend's
  CORS middleware (`go-chi/cors`, wildcard origins, no credentials) handles it.
- **Backend is the source of truth.** All math, including division-by-zero and
  complex-number checks, happens server-side. The frontend only pre-empts syntax
  issues client-side for faster UX.
- **Strict layering on both sides.** Frontend: `calculator/` is pure (no React, no
  fetch), `api/` is typed fetch only, they only meet in hooks/components. Backend:
  `evaluation/` is pure computation, `handler/` owns HTTP, `service/` bridges them.
- **Deliberately minimal stack.** No routers, state libraries, UI kits, CSS
  frameworks, or external math libraries. `useReducer` and `go/parser` are enough.

See [frontend/README.md](frontend/README.md) and [backend/README.md](backend/README.md)
for full rationale per layer.
