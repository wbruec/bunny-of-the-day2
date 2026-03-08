# CLAUDE.md

## Project
Angular 19 single-page app — shows one bunny photo per day, sourced from the Pixabay API.

## Commands
```bash
npm start          # dev server (uses environment.ts key directly)
npm run build      # production build — requires PIXABAY_API_KEY env var
npm test           # Karma/Jasmine unit tests
```

## Architecture
- **Single standalone component** — all logic lives in `src/app/app.component.ts`. No services, no routing, no NgModule.
- `src/environments/environment.ts` — dev API key (committed, not secret for dev use)
- `src/environments/environment.prod.ts` — generated at build time by `scripts/set-env.js` from `PIXABAY_API_KEY` env var; never commit this file
- `scripts/set-env.js` — pre-build script that writes `environment.prod.ts`; runs automatically via `npm run build`

## Key patterns
- **Daily image selection**: `getDayOfYear() % hits.length` — deterministic, no backend needed
- **Caching**: `localStorage` under key `bunny-of-the-day-v1`, invalidated by date string comparison
- **HttpClient**: provided via `bootstrapApplication` in `main.ts` (not in component imports)
- **Strict TypeScript**: full strict mode + `strictTemplates` — do not weaken compiler options

## Design tokens (CSS)
- Background: `#f6f3ee` (warm off-white)
- Brand accent: `#db7b3d` (orange)
- Text: `#2d1a0e` (dark brown), muted `#7a6652`
- Card max-width: `680px`, border-radius: `16px`
- Fonts: `Fraunces` (title), `Space Grotesk` (body) — loaded externally

## Do not
- Do not add NgModules — keep everything standalone
- Do not commit `src/environments/environment.prod.ts`
- Do not introduce a backend or server-side rendering; this is intentionally a static build
- Do not change the `CACHE_KEY` constant without migrating existing cached data
