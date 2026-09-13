# AGENTS.md

Full-stack calculator: a Go backend (`backend/`) that evaluates mathematical expressions, and a React + TypeScript frontend (`frontend/`) that consumes it. Two independent build systems — no shared toolchain.

## Layout

- `backend/` — Go 1.27 + chi. Listens on `:3000`. Module path `github.com/aledeltoro/simple-calculator-app`.
- `frontend/` — Vite + React 18 + TypeScript strict. SPA with no router.
- `SPEC.md` — authoritative frontend design plan (layering, expression mapping, error taxonomy).
- `API_RESOURCES.md` — authoritative API contract (`GET /health`, `POST /api/v1/calculations`).

## Commands (run from the respective directory)

Backend (`cd backend`):
- `go test ./...` — run all tests.
- `go run ./cmd/api` — start the API on `:3000`.
- `go build ./...`, `go vet ./...`.

Frontend (`cd frontend`; requires `npm install` first):
- `npm run dev` — Vite dev server.
- `npm run build` — **runs `tsc && vite build`**; typecheck happens first, so type errors break the build.
- `npm run test` — Vitest **watch** mode.
- `npm run test:coverage` — one-shot coverage run; fails if line coverage drops below 85%.

Run a single frontend test file: `npm run test -- <pattern>` (e.g. `npm run test -- transform`), or `npx vitest run src/api/client.test.ts`.

## Architecture / boundaries (enforced by SPEC.md)

The frontend is strictly layered; keep imports directional:
- `calculator/` — pure logic (transform, formatters, reducer, validation). No React, no `api/`, no `hooks/`. These are the coverage backbone (~100% lines).
- `api/` — typed fetch wrapper (`client.ts`) + types. No React, no `calculator/`.
- `hooks/useCalculator.ts` and `components/` — the only places layers meet.

Key behavior encoded in `calculator/` (don't re-implement elsewhere): UI tokens map to backend expressions (`×`→`*`, `÷`→`/`, `√x`→`(x)^0.5`, `%x`→`(x)/100`, `±`→`-(...)`). The backend is the source of truth for domain errors (division by zero, complex results); `validation.ts` only pre-empts syntax issues client-side.

## API / CORS model (no proxy)

The browser calls the backend cross-origin directly. There is **no Vite `server.proxy` and no nginx `proxy_pass`** — the backend's chi CORS middleware (wildcard origins, `AllowCredentials: false`) handles it.

- Base URL resolves from `import.meta.env.VITE_API_BASE_URL`, falling back to `http://localhost:3000`.
- `.env.development` and `.env.production` are committed (all set to `http://localhost:3000`); `.env` / `.env.*.local` are gitignored.

## Testing & coverage

- Vitest runs in `jsdom` with globals on; setup file `src/tests/setup.ts` loads `jest-dom`.
- Coverage uses `@vitest/coverage-v8`, threshold **>85% lines** configured inline in `vite.config.ts` (there is no separate coverage file). `src/api/types.ts` is type-only and excluded via `coverage.exclude`.
- `api/` and `hooks/` tests mock the API layer (`vi.mock('../api/client', …)` / `vi.stubGlobal('fetch', …)`) to avoid network I/O.

## TypeScript gotchas

`frontend/tsconfig.json` enables strict flags beyond default TS: `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. Indexed access returns `T | undefined`, and optional props must not be explicitly assigned `undefined`. New code must typecheck under these.

## Docker

`docker compose up --build` from the repo root starts `api` (`:3000`) and `frontend` (`:8080`). The backend Dockerfile lives at the non-standard path `backend/cmd/api/build/Dockerfile` (referenced from `docker-compose.yml`). The frontend image is built with `ARG VITE_API_BASE_URL=http://localhost:3000` baked in at build time; nginx serves static files with an SPA fallback (`try_files … /index.html`).
