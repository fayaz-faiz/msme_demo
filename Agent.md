# AGENT.md

Purpose: give future agents a minimal-token map of this repo.

## 1) Quick Start (Only what matters)
- Stack: Next.js 14 App Router + TypeScript + Redux Toolkit + axios.
- Package manager: `npm` (`package-lock.json` is present).
- Run:
  - `npm run dev` (default port 3000)
  - `npm run dev:2300`
  - `npm run build`
  - `npm run lint`
- Path alias: `@/* -> src/*` (see `tsconfig.json`).

## 2) Project Layout (High-signal only)
- App routes: `src/app/**/page.tsx`
- Global shell/providers: `src/app/layout.tsx`, `src/app/providers.tsx`
- Redux store root: `src/redux/store.tsx`
- Legacy + feature slices both live in store:
  - Feature slices: `src/features/*/store/*`
  - Legacy slices: `src/redux/slices/*`
- API layer:
  - API functions: `src/api/index.tsx`
  - axios instance + interceptors: `src/api/apiInstance.tsx`
  - endpoint constants: `src/api/apiConstants.tsx`
- Domain/data/components pattern:
  - `src/features/<feature>/domain`
  - `src/features/<feature>/data`
  - `src/features/<feature>/components`

## 3) Runtime/Data Flow (Important)
- `Providers` creates store via `makeStore()`, injects it into axios (`injectStore`), hydrates persisted cart/auth/orders, and bootstraps guest/user auth.
- Auth tokens come from two places:
  - Redux persisted state (`apiResponse.accessToken`, `authToken.refreshToken`)
  - LocalStorage keys: `nearshop_access_token`, `nearshop_refresh_token`, `nearshop_login_role`
- Axios request interceptor reads bearer token from `store.getState().apiResponse.accessToken`.
- Axios response interceptor refreshes token on `401` using `postAccessTokenWeb`.

## 4) Environment Variables Used
- `NEXT_PUBLIC_BASE_URL`
- `NEXT_PUBLIC_API_URL_TIMEOUT`
- `NEXT_PUBLIC_SOLAR_BASE_URL`
- `NEXT_PUBLIC_ENV`
- `NEXT_PUBLIC_GOOGLE_API_KEY`
- `NEXT_PUBLIC_RAZORPAY_API_KEY`

## 5) Editing Rules For Future Tasks
- Prefer editing feature-first paths under `src/features/*` and route files under `src/app/*`.
- When API behavior changes:
  1. update `src/api/apiConstants.tsx`
  2. update/add function in `src/api/index.tsx`
  3. verify consumers in route/component files
- When auth/cart/order persistence changes:
  - check both Redux slice and corresponding storage helper in `src/features/*/store/*-storage.ts`.
- Keep changes TypeScript-strict; avoid `any` unless existing pattern forces it.

## 6) Fast Navigation (Token Saver)
- Find routes: `rg --files src/app | rg "page.tsx|layout.tsx"`
- Find store usage: `rg -n "useAppSelector|useAppDispatch|dispatch\\(" src`
- Find API usage: `rg -n "from \"@/api\"|from '@/api'|postAPIHelper|getAPIHelper" src`
- Find localStorage coupling: `rg -n "nearshop_|localStorage" src`

## 7) Known Constraints/Risks
- `next.config.mjs` has `eslint.ignoreDuringBuilds = true`; lint will not block builds.
- `src/api/index.tsx` is large and contains many `any`-typed wrappers; prefer incremental refactor, not big-bang rewrite.
- Store mixes legacy slices + feature slices; avoid broad restructuring unless explicitly requested.

## 8) Definition of Done (Default)
- `npm run lint` passes (or document current lint blockers if pre-existing).
- Changed pages/components compile in `npm run dev`.
- If touching API/auth/cart/order logic, verify affected user flow manually in browser.
