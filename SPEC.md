# SPEC — Simple Calculator App (Frontend)

## Overview & Goal

Full-stack calculator. A React frontend consumes a Go backend microservice to evaluate
mathematical expressions. The backend is complete; this SPEC defines the frontend work.

- Frontend: **React 18 + TypeScript (strict)** in `frontend/`.
- Backend (complete): Go + chi, listens on `:3000`, CORS already enabled.

---

## Backend API Contract (authoritative)

| Method | Path | Request | Success | Errors |
|---|---|---|---|---|
| `GET` | `/health` | — | `200 {"status":"ok"}` | — |
| `POST` | `/api/v1/calculations` | `{"expression":"2 + 3 * 5 + (12 / 10)"}` | `200 {"result":18.2}` | `400 {"code":"bad_request","message":"..."}` / `500 {"code":"internal_service_error","message":"Internal server error"}` |

- `result` is a JSON **number** (`float64`).
- Expression language (Go `parser.ParseExpr` + AST evaluator):
  - `+ - * /` (float division), unary `-`
  - exponentiation `^` (`math.Pow`), square root `x^0.5`, percentage `x/100`
  - parentheses `()`
  - **Not supported:** `%` operator, implicit multiplication, functions
- `bad_request` messages (already user-facing): `"division by zero not allowed"`,
  `"expression parsing failed"`, `"unsupported mathematical operation"`,
  `"calculations resulting in complex numbers are not supported"`, `"empty expression"`.
- CORS: `go-chi/cors` with wildcard origins and `AllowCredentials: false` (resolved in backend).

---

## Design Decisions

### Stack
| Concern | Choice | Rationale |
|---|---|---|
| Build | **Vite** (`react-ts`) | Minimal config, modern ESM, fast dev. No SSR/routing needs. |
| Language | **TypeScript (strict)** | Required; typed API contracts. |
| Test | **Vitest + React Testing Library + user-event + jest-dom + jsdom** | Same Vite ecosystem; fast; built-in `expect`. |
| Coverage | **@vitest/coverage-v8** | Native provider; `text`/`html`/`lcov`. |
| Styling | **CSS Modules** | Scoped, zero deps, fits ~5 components. Design tokens via CSS custom properties. |
| State | **`useReducer` in a hook** | Single view; no Redux/Zustand needed. |

Deliberately avoided: routers, UI kits, CSS frameworks, schema/validation libs, state libs.

### Layering (testability — key NFR)
```
frontend/src/
  config.ts                 # API base URL resolution
  api/
    types.ts                # CalculateRequest/Response, ApiError, Result union
    client.ts               # typed fetch wrapper (timeout, error taxonomy)
  calculator/               # PURE logic — no React, no fetch
    transform.ts            # button token -> expression string
    formatters.ts           # number -> display string
    reducer.ts              # calculator state machine
    validation.ts           # client-side pre-validation
  hooks/
    useCalculator.ts        # reducer + API + error + race safety
  components/
    App.tsx, Display.tsx, Keypad.tsx, Button.tsx, ErrorBanner.tsx  (+ *.module.css)
  styles/index.css          # reset + design tokens
```

Boundary rules: `calculator/` imports nothing from React/`api/`; `api/` imports nothing from
React/`calculator/`; `hooks/`/`components/` are the only place the layers meet.

### API Base URL (CORS resolved → no proxy)
- Code: `const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000"`.
- `.env.development` / `.env.production` set `VITE_API_BASE_URL`.
- No Vite `server.proxy`; no nginx reverse-proxy. Browser calls the API directly (CORS allows it).

### API Client (typed fetch wrapper)
Returns a discriminated union instead of throwing:

```ts
type ApiResult =
  | { kind: "success"; result: number }
  | { kind: "bad_request"; message: string }
  | { kind: "server" }
  | { kind: "network" }
  | { kind: "timeout" };
```

- `fetch(`${API_BASE_URL}/api/v1/calculations`, …)` with `AbortSignal.timeout(8000)`.
- No `credentials` (backend `AllowCredentials: false`).
- Maps by HTTP status + `code`: `400` + `bad_request` → surface `message`; `500` → `server`;
  `TypeError` → `network`; `AbortError` → `timeout`.

### Expression Mapping (correctness core — pure, unit-tested)
| UI | Emitted token | Notes |
|---|---|---|
| digits, `.` | literal | `.` at start/after operator → `0.` |
| `+` `−` `×` `÷` | `+` `-` `*` `/` | `×`→`*`, `÷`→`/` |
| `xʸ` | `^` | binary power |
| `√x` | `(x)^0.5` | wrap operand |
| `%x` | `(x)/100` | backend has no `%` |
| `±` | `-(...)` | unary minus, wrap compound operand |
| `( )` | `( )` | passthrough |

Wrap helper: plain non-negative numbers are not wrapped; compound operands are parenthesized.

### Input Validation (client vs server)
- **Client (fast UX, pre-flight):** empty/whitespace, allowed charset, balanced parens, no
  trailing/dangling operator, leading-dot disambiguation.
- **Server (source of truth):** division by zero, complex results, parse errors — surfaced verbatim.

### State & Race Safety
- `useReducer` with explicit actions (`append`, `toggleSign`, `sqrt`, `percent`, `backspace`,
  `clear`, `evaluate`, `success`, `failure`).
- API side-effect lives in `useCalculator` (keeps reducer pure/testable).
- Request-id sequence counter + `AbortController` to drop stale responses on rapid `=`.

### Responsive
- Mobile-first single column, `max-width` ~420px.
- Keypad = CSS Grid `repeat(4, 1fr)`; touch targets ≥ 44px.
- Fluid type via `clamp()`; design tokens (colors/fonts/spacing/radius) in `global.css`.

---

## Testing & Coverage

| Unit | Test | Strategy |
|---|---|---|
| `calculator/*` (transform/formatters/reducer/validation) | pure | no mocks; table-driven; target ~100% |
| `api/client` | `client.test.ts` | `vi.stubGlobal('fetch', …)`; assert URL/method/body + union mapping |
| `hooks/useCalculator` | `useCalculator.test.ts` | `vi.mock` the api module |
| components | `App.test.tsx` etc. | RTL + user-event; mock api module |

Commands: `npm run test` (watch), `npm run test:coverage` (threshold >85% lines).

---

## Deployment (Docker)

- `frontend/Dockerfile`: multi-stage — `node:20-alpine` build (`npm ci && npm run build`)
  → `nginx:1.27-alpine` serving `dist/`.
- Build-time `ARG VITE_API_BASE_URL=http://localhost:3000`.
- `frontend/nginx.conf`: static serve + SPA fallback (`try_files … /index.html`). No `proxy_pass`.
- `docker-compose.yml`: add `frontend` service on `8080:80`, `depends_on: api`. Browser calls
  `http://localhost:3000` cross-origin (CORS-allowed).

---

## Ordered Task List

1. Scaffold `frontend/` (Vite react-ts) + install deps.
2. `config.ts` (API base URL).
3. `api/types.ts`, `api/client.ts` (+ tests).
4. `calculator/transform.ts`, `formatters.ts`, `reducer.ts`, `validation.ts` (+ tests).
5. `hooks/useCalculator.ts` (+ test).
6. Components + CSS Modules + `styles/index.css`.
7. Coverage config + run; close gaps.
8. `Dockerfile`, `nginx.conf`, `.dockerignore`; update `docker-compose.yml`.
9. `frontend/README.md` (setup + design rationale).
10. Verify: `npm run test:coverage`, `npm run build`, `docker compose up --build`.

---

## Assumptions

- The backend is authoritative and already correct (including CORS). No backend code changes
  are part of this scope beyond documentation fixes.
- Full expression support is delivered through the backend; the frontend only maps UI gestures
  into valid Go expression strings.
- `VITE_API_BASE_URL` defaults to `http://localhost:3000` for local development.
