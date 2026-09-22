# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**ClaireAdresse** — a French web app: the user enters an address (or a commune name) and gets a
cartographic, plain-language read of its surroundings before renting or buying: prices, risks,
urbanism, transport, neighbourhood amenities, demographics, crime, climate, elections, historical
imagery, plus AI-written one-liners per card and a client-side PDF export.

The codebase, comments, commit messages and docs are **in French**. Keep new comments and
user-facing strings in French.

There is **no test suite** and no linter configured. `pnpm typecheck` is the only automated check.

## Commands

pnpm workspace (`pnpm@10`); root delegates to the `frontend` package.

```bash
pnpm install
pnpm dev          # next dev on :3000 (PUBLIC variant)
pnpm build
pnpm typecheck    # tsc --noEmit — the only check; run it before declaring work done

# From frontend/ — variant-specific runs (see "Site variants")
pnpm dev:pro      # NEXT_PUBLIC_SITE_VARIANT=PRO next dev
pnpm build:all    # builds both PUBLIC and PRO
```

SQL migrations are plain files applied in filename order, idempotent via
`CREATE TABLE IF NOT EXISTS`:

```bash
for f in frontend/src/server-shared/infrastructure/database/migrations/*.sql; do
  psql "$POSTGRES_URL" -f "$f"
done
```

Python import scripts live in [scripts/](scripts/) (own venv + `requirements.txt`); they populate
the Postgres/PostGIS tables the app reads. Run **migrations first** — several scripts fill tables
the migrations create. See the README table for per-source details and download sizes.

Deployment: `buildPush.sh` builds and pushes two Docker images (PUBLIC + PRO) to GHCR; `update.sh`
runs on the VPS (git pull → docker compose pull → replay migrations → restart).

## Architecture

### Server: DDD modules under `frontend/src/server-modules/<domain>/`

Every data domain (`address`, `mobility`, `risks`, `real-estate`, `cadastre`, `air-quality`,
`neighborhood`, `demographics`, `elections`, `climate`, `security`, `school-sector`,
`commune-stats`, `commune-equipment`, `summary`, `narrative`) follows the same three-layer shape:

- `domain/` — types only
- `application/` — a `*.service.ts` interface + `*.service.impl.ts`, depending on the provider interface
- `infrastructure/` — providers: HTTP calls to public APIs, or SQL against Postgres/PostGIS

Cross-cutting pieces sit in `server-shared/` (pg pool, `InMemoryCache` + `buildGeoKey`, http client,
logger, DTOs, migrations).

**There is no DI container.** Wiring is done by hand at module scope in the API route —
[analyze/route.ts](frontend/src/app/api/location/analyze/route.ts) constructs
`LocationAnalysisUseCase` with every service/provider pair. Adding a domain means touching that
route, the `Dependencies` interface in
[location-analysis.use-case.ts](frontend/src/server-modules/analysis/application/location-analysis.use-case.ts),
and the DTO.

`LocationAnalysisUseCase` is the orchestrator: it reverse-geocodes first (it needs `citycode`),
then fans out every service in one `Promise.all`. A failing source must degrade to null/empty
rather than reject — the analysis page never fails as a whole because one source is down.

### `AnalysisMode` — the central branching concept

The BAN suggestion `type` (`housenumber` | `street` | `locality` | `municipality`) is collapsed
**once**, in the use-case, into `AnalysisMode = "address" | "commune"` and exposed as
`LocationAnalysisDto.mode`. Everything downstream (cards, PDF, services like
`RealEstateService.getMarketData`) reads that field.

In `commune` mode the use-case short-circuits point-based sources (cadastre, neighbourhood POIs,
school sector) to empty values, loads the commune contour, and DVF switches from a 1 km radius to
`WHERE code_commune = ?`. No code outside the use-case should compare against `"municipality"`.

### Commune mode vs SEO commune pages

Two "commune" experiences share nothing but the word — different routes, data, components and AI
text:

| | Analysis, commune mode | SEO commune pages |
|---|---|---|
| URL | `/analyze?type=municipality&citycode=…` | `/commune/paris` (hub), `/commune/paris-15e`… |
| Communes | every commune, Paris/Lyon/Marseille arrondissements included | Paris, Lyon, Marseille and their arrondissements only |
| Rendering | client-side, data fetched on demand | server; arrondissements ISR 24 h, hubs `force-dynamic` |
| Data | `LocationAnalysisDto` (`mode === "commune"`) via the use-case | `CommuneStats` via `commune-stats` (throws for any other commune) |
| Components | `components/analysis/` | `components/commune/` |
| AI text | "En bref" (`card-insights`) | synthesis + legends (`commune-narrative`) |
| PDF, sharing | yes | no |
| Variant | always | `FEATURES.hasSEOPages` (PRO: no) |

- **Routing** — [commune-routing.ts](frontend/src/lib/commune-routing.ts), used by `SearchPanel`: a
  whole city (Paris, Lyon, Marseille) opens its SEO hub when `hasSEOPages`; everything else,
  arrondissements included, opens `/analyze`. The analysis cannot handle a whole city: BPE and
  INSEE only know arrondissements, so `75056` showed a zero price and one arrondissement's figures
  under the city name.
- **Entry points** — the landing's "Explorer par commune" links the three hubs; each hub lists its
  arrondissements. `app/sitemap.ts` lists every page.
- **Cross-links** — an arrondissement analysis links to its SEO page ("Voir la page Paris 15e");
  the SEO page links up to its city hub (for what is city-scale) and across to the detailed
  analysis (`analyzeUrlForCommune`, for what is address-scale).
- **Each domain sits at the scale where it is actually unique.** An arrondissement page
  carries what differs between arrondissements — prices, equipment, security, population
  (age, employment, households, housing), presidential election, history. The three city
  hubs carry what does not: climate (one Météo-France station covers the whole city),
  natural risks (read at `scope: "commune"`), and the 2026 municipal election, whose data
  has **no rows per arrondissement** — the ministry's files are cut by *secteur*, which does
  not map onto INSEE codes. Putting those three on 45 pages would have published the same
  block twenty times over.
- Both families reuse the analysis's bare sub-components (`EmploymentCharts`,
  `HouseholdsCharts`, `HousingCharts`, `SecurityIndicatorChart`, `ClimateCharts`,
  `RiskList`, `MunicipalesLists`) — exported without card frame, title or source notes.
- **Two disjoint anchor namespaces**, never crossed: `components/commune/sections.ts` for
  arrondissements, `hubSections.ts` for hubs. Both are exhaustive `Record`s — adding an id
  does not compile until it has a title *and* a display condition.
- **Still missing on arrondissement pages**: PDF export, and "En bref" on a few cards.
- `app/sitemap.ts` and `app/commune/page.tsx` still ignore `hasSEOPages`.

### Client

- `app/` — App Router. `api/` routes (`address/search`, `location/analyze`,
  `location/card-insights`, `health`, `debug/pois`), `analyze/`, and prerendered SEO pages
  under `commune/` (`paris`, `lyon`, `marseille` hubs + `[slug]` arrondissements).
- `components/analysis/` — one card per theme plus `AnalysisScreen`. Section order and labels are
  centralised in [sections.ts](frontend/src/components/analysis/sections.ts); `SectionNav` derives
  the sticky sidebar from it. Charts are hand-written SVG (`LineChart`, `StackedBar`,
  `DistributionChart`, …) with logic split into sibling `.ts` files — no chart library.
- `components/map/` — a single MapLibre `Map` component instantiated several times with prop
  subsets (`basemap`, `initialLayers`). Known debt: it is a ~10-prop catch-all that PLAN-V2 chose
  not to split.
- `features/` — hooks (`useLocationAnalysis`, `useCardInsights`, `useAddressSearch`) and
  `analysis-pdf/` (`@react-pdf/renderer`, dynamically imported; the map is captured as PNG from
  the MapLibre canvas, which is why `preserveDrawingBuffer: true` is set).
- Styling is one hand-written `styles/globals.css` (~3k lines) — no Tailwind, no CSS modules.

### Site variants (PUBLIC / PRO)

Two products share the codebase, gated by `NEXT_PUBLIC_SITE_VARIANT`. **All** variant logic goes
through [site-features.ts](frontend/src/lib/site-features.ts): add a flag to `SiteFeatures` and
both feature objects, then read `FEATURES.x`. Env kill-switches (e.g.
`NEXT_PUBLIC_HIDE_AIR_QUALITY`) are applied *on top* and may only remove a section, never add one.
Because these are `NEXT_PUBLIC_*`, they are inlined at build time — `next dev` does not hot-reload
them, restart is required.

Per PLAN-V2, **PRO is out of scope** on `dev/v2`: status quo, don't invest effort there.

### Caching

Two tiers. `InMemoryCache` per source with source-appropriate TTLs (6 h for Atmo → 30 days for
climate normals), keyed on coordinates rounded to ~10 m (`buildGeoKey`), capped at 500 entries;
`DISABLE_CACHE=1` disables all of it. LLM text is cached in Postgres (`card_insights_cache`,
`commune_narrative_cache`) so it survives redeploys — the cache key includes the model and prompt
version, so bumping either retires old rows without any delete.

`NEXT_PUBLIC_DEBUG=true` bypasses the LLM cache on read *and* write — leave it off unless
debugging a prompt, it burns the API quota.

### LLM layer (`narrative` module)

Mistral (`mistral-small-latest`) behind an OpenAI-compatible `/chat/completions`, so swapping
providers is just `LLM_BASE_URL` + `LLM_API_KEY` (falls back to `MISTRAL_API_KEY`).

Two pipelines: `card-insights.*` (eight keys — `securite`, `demographie`, `logement`, `emploi`,
`menages`, `elections`, `municipales`, `climat` — in one call, for the "En bref" lines under card
titles) and
`commune-narrative.*` (editorial paragraphs for the `/commune/*` pages).

Non-negotiable invariants:
- **The list of keys in [card-insights.ts](frontend/src/server-shared/types/card-insights.ts) is
  the single source of truth** — the type, prompt output format, parser and cache all derive from it.
- **A key is produced iff its card renders.** `card-insights.input.ts` mirrors each card's render
  guard; the prompt's `cles_attendues` lists the displayed sections and the parser drops anything
  extra.
- **TypeScript computes, the model verbalises.** Trends, deltas vs. national, extrema and dominant
  classes are decided in TS against explicit thresholds; the model receives "down 31 %", never ten
  raw numbers.
- **The service never throws.** Missing key, exhausted quota, unparseable JSON or a dead DB all
  yield `insights: {}` and a 200 response; cards simply render without a sentence.
- `CARD_INSIGHTS_FIXTURE=1` (or `=slow`) serves fake sentences with no API call — use it to develop
  without a key. `COMMUNE_LEGENDS_FIXTURE` is the equivalent for `/commune/*` and must be set **at
  build time** (those pages are prerendered).

### Historical imagery coverage probe

The historical IGN layer is drawn *over* the current orthophoto, so a gap in the old layer shows
today's photo under a "1965-80" label. `historicalCoverage.ts` therefore probes one tile per era
before building the timeline. Absence of data takes **two** forms and both must be handled: an
`HTTP 404` carrying `<Exception>No data found</Exception>`, and an `HTTP 200` returning a fully
transparent palettised PNG (1 595 bytes).

## Conventions

- Path alias `@/*` → `frontend/src/*`; TypeScript `strict`.
- Zod validates API route query params / bodies.
- No global synthetic score, per design: each indicator is shown in its own units and, where
  meaningful, compared to a reference (commune, France). Interpretation is left to the reader plus
  the "En bref" sentences. The `summary` module still fills the DTO but is **no longer displayed**.
- Planning docs live in [PLAN-V2.md](PLAN-V2.md) (current, branch `dev/v2`), [PLAN.md](PLAN.md),
  [PLAN-PHASE-0.md](PLAN-PHASE-0.md), [memo.md](memo.md). The README is the long-form reference for
  data sources, licences, import commands and env vars — keep it in sync when you add a source.
