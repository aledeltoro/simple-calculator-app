# Simple Calculator — Frontend

React 18 + TypeScript (strict) client for the Simple Calculator app. It renders a
calculator UI, maps button gestures into backend-compatible expression strings, and
delegates evaluation to the Go backend over HTTP. No evaluation happens in the
browser — the backend is the source of truth for all math.

## Prerequisites

- **Node.js 20** (matches the `node:20-alpine` base image in the Dockerfile). npm is
  installed alongside Node.
- **Go backend running on `:3000`**. The frontend calls it directly cross-origin
  (CORS is already enabled on the backend), so it must be reachable at whatever
  `VITE_API_BASE_URL` points to. See the backend `/health` and
  `/api/v1/calculations` endpoints in [API_RESOURCES.md](../API_RESOURCES.md).

## Setup

```sh
npm install
npm run dev
```

`npm run dev` starts the Vite dev server. The app calls the backend directly from
the browser (no dev-server proxy), so no separate proxy configuration is required.

### API base URL

The API base URL is resolved in `src/config.ts`:

```ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
```

Set `VITE_API_BASE_URL` to override the default. The repo ships three environment
files, each currently pointing at `http://localhost:3000`:

- `.env.development` — used by `npm run dev`
- `.env.production` — used by `npm run build`
- `.env.example` — committed template (copy to `.env.local` for local overrides)

The backend has CORS enabled with wildcard origins, so the browser calls the API
directly. There is deliberately no Vite `server.proxy` and no nginx `proxy_pass`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server (HMR, no type check). |
| `npm run build` | Type-check (`tsc`) then produce an optimized production bundle in `dist/`. |
| `npm run preview` | Serve the production `dist/` build locally. |
| `npm run test` | Run Vitest once in watch mode. |
| `npm run test:coverage` | Run Vitest once with v8 coverage and enforce the threshold. |

## Design Decisions

### Stack

| Concern | Choice | Rationale |
|---|---|---|
| Build | **Vite** (`react-ts`) | Minimal config, modern ESM, fast dev. No SSR/routing needs. |
| Language | **TypeScript (strict)** | Typed API contracts; strict flags (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) enforced. |
| Test | **Vitest + React Testing Library + user-event + jest-dom + jsdom** | Same Vite ecosystem; fast; built-in `expect`. |
| Coverage | **@vitest/coverage-v8** | Native provider; `text`/`html`/`lcov`. |
| Styling | **CSS Modules** | Scoped, zero deps, fits ~5 components. Design tokens via CSS custom properties. |
| State | **`useReducer` in a hook** | Single view; no Redux/Zustand needed. |

Deliberately avoided: routers, UI kits, CSS frameworks, schema/validation libs, state libs.

### Responsive

- Mobile-first single column, `max-width` ~420px.
- Keypad = CSS Grid `repeat(4, 1fr)`; touch targets ≥ 44px.
- Fluid type via `clamp()`; design tokens (colors/fonts/spacing/radius) in `global.css`.

## Architecture

The codebase is layered so that pure logic is fully unit-testable in isolation.
Layers import only inward (top → bottom):

```
frontend/src/
  config.ts                 # API base URL resolution (import.meta.env)
  api/
    types.ts                # CalculateRequest/Response, ApiError, ApiResult union
    client.ts               # typed fetch wrapper (timeout, error taxonomy)
  calculator/               # PURE logic — no React, no fetch
    transform.ts            # button token -> expression string
    formatters.ts           # number -> display string
    reducer.ts              # calculator state machine (useReducer)
    validation.ts           # client-side pre-validation
  hooks/
    useCalculator.ts        # reducer + API + error + race safety
  components/
    App.tsx, Display.tsx, Keypad.tsx, Button.tsx, ErrorBanner.tsx  (+ *.module.css)
  styles/index.css          # reset + design tokens
```

**Boundary rules**

- `calculator/` imports nothing from React, `api/`, or `hooks/`. It is pure and
  deterministic.
- `api/` imports nothing from React or `calculator/`. It only knows `config.ts`
  and its own types.
- `hooks/` and `components/` are the only layers where `calculator/` and `api/`
  meet.

### Expression mapping

The correctness core lives in `calculator/transform.ts`. UI gestures are translated
into the expression subset the Go parser understands:

| UI | Emitted token | Notes |
|---|---|---|
| digits, `.` | literal | a `.` at start/after an operator becomes `0.` |
| `+` `−` `×` `÷` | `+` `-` `*` `/` | `×` → `*`, `÷` → `/` |
| `xʸ` | `^` | binary power |
| `√x` | `(x)^0.5` | wraps the operand |
| `%x` | `(x)/100` | the backend has no `%` operator |
| `±` | `-(...)` | unary minus; plain numbers negate bare, compounds wrap |
| `( )` | `( )` | passthrough |

A wrap helper (`wrapOperand`) leaves plain non-negative numbers bare but
parenthesizes compound operands.

### Client vs server validation

- **Client (fast UX, pre-flight)** in `calculator/validation.ts`: rejects
  empty/whitespace, disallowed characters, unbalanced parentheses, and trailing or
  leading dangling operators. This avoids needless API round-trips.
- **Server (source of truth)**: division by zero, complex results, and parse
  errors are surfaced verbatim from the backend via the `bad_request` envelope.

### State and race safety

- The reducer (`calculator/reducer.ts`) is a pure state machine with explicit
  actions (`append`, `toggleSign`, `sqrt`, `percent`, `backspace`, `clear`,
  `evaluate`, `success`, `failure`). It performs no I/O.
- `hooks/useCalculator.ts` owns the async side effect and guarantees that only the
  **latest** evaluation may update state: a monotonic request-id sequence plus an
  `AbortController` drop stale responses on rapid `=` presses, and an
  in-flight request is aborted on unmount.

## Testing

```sh
npm run test            # watch mode
npm run test:coverage   # single run with coverage + threshold
```

Coverage is enforced at **>85% lines** (currently **100%**). The suite uses Vitest,
React Testing Library, `user-event`, `jest-dom`, and `jsdom`.

- **`calculator/`** (transform/formatters/reducer/validation): pure, table-driven,
  no mocks. These target ~100% line coverage because they hold the correctness
  logic (expression mapping and display formatting).
- **`api/client`**: `vi.stubGlobal('fetch', ...)` asserts URL/method/body and the
  `ApiResult` union mapping.
- **`hooks/useCalculator`**: `vi.mock`s the api module to exercise race-safety and
  error mapping.
- **components**: RTL + `user-event` with the api module mocked.

## Coverage

Threshold enforced: **>85% lines** (configured in `vite.config.ts`).
Run `./scripts/coverage.sh` from `frontend/` to regenerate.

| Metric | Coverage |
|---|---|
| Statements | 100% (596/596) |
| Branches | 98.22% (221/225) |
| Functions | 88.46% (46/52) |
| Lines | 100% (596/596) |

## Docker

The app ships with a multi-stage `Dockerfile` (`node:20-alpine` build →
`nginx:1.27-alpine` serving `dist/`). Build and run the full stack (backend + frontend)
from the repo root with Compose:

```sh
docker compose up --build
```

- `docker-compose.yml` builds the `frontend` service with build arg
  `VITE_API_BASE_URL=http://localhost:3000` and publishes it on `8080:80`, with
  `depends_on: api`.
- The `VITE_API_BASE_URL` value is baked into the static bundle at **build time**.
  To target a deployed API, rebuild with
  `docker build --build-arg VITE_API_BASE_URL=https://api.example.com .`
- `nginx.conf` serves the static assets and provides an SPA fallback
  (`try_files … /index.html`). It has no `proxy_pass`; the browser calls the API
  cross-origin (CORS allows it).

## Backend API contract

The frontend consumes two backend endpoints (full reference in
[API_RESOURCES.md](../API_RESOURCES.md)):

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

`result` is a JSON number (`float64`). `bad_request` messages are surfaced verbatim
in the UI. The `api/client.ts` wrapper converts these responses (and network/timeout
conditions) into a discriminated `ApiResult` union rather than throwing.
