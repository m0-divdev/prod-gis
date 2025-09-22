# prod-gis — Investor Brief

## Executive summary

prod-gis is an API-first, agentic geospatial intelligence platform for site selection and market analysis. It serves four domains out of the box—Real Estate, Retail, Urban Planning, and Energy/Utilities. Every request returns:

- a concise, decision-ready analysis, and
- a truthful GeoJSON map (FeatureCollection) visualizing the findings.

The system integrates commercial and open data (Google Places Insights/Details, TomTom Search, events, weather, foot-traffic) via a resilient toolchain. It enforces safe rate-limits, suppresses fabrications, and guarantees a map on every request through multi-stage fallbacks.

## Problem

Decision-makers evaluating new sites or trade areas grapple with:

- Fragmented data across providers (POIs, foot-traffic, events, weather).
- Manual, slow workflows to aggregate, deduplicate, and visualize.
- Fragile analyses: easy to over/under-sample neighborhoods; brittle when APIs change.
- Lack of clear, shareable outputs (map + narrative) that teams can align on.

## Solution

prod-gis offers domain-specialized AI agents that orchestrate a robust toolset to:

- Fetch and normalize relevant local signals (density, competition, amenities, events, flows).
- Synthesize a narrative analysis tailored to each domain.
- Programmatically build accurate GeoJSON layers for instant visualization.
- Always return a map, backed by a fault-tolerant fallback chain that avoids fabrications.

## Product and use cases

Primary use cases:

- Real estate: viability around a proposed address, corridor, or neighborhood.
- Retail: competitive intensity and complementary mix near a planned store.
- Urban planning: amenities, mobility proxies, and service coverage around zones.
- Energy/Utilities: demand proxies, points-of-service, and infrastructure context.

Example prompts (API requests):

- “Assess multi-family viability near Brickell, Miami—competition, demand proxies, risks.”
- “Evaluate QSR expansion around ‘Mission District, San Francisco’—top corridors, gaps.”
- “Map healthcare access around ‘South LA’ and summarize underserved tracts.”
- “Utilities: summarize service locations and outage risks near ‘Plano, TX’.”

Each endpoint returns: { analysis, mapData (GeoJSON), metadata.toolsUsed/agentsUsed }.

## How it works (technical overview)

- Framework: NestJS (TypeScript) backend with modular controllers/services.
- Agents: Built on Mastra; domain agents (realEstate, retail, urbanPlanning, energyUtilities) plus a mapData agent.
- Tools: Google Places Insights, Google Place Details, TomTom fuzzy/POI search, events, weather, foot-traffic, plus a map-formatting tool.
- Memory: Shared LibSQL-backed memory with scoped message history per agent type.
- GeoJSON pipeline (“map on every request”):
  1. Promote GeoJSON from tool results if present.
  2. Programmatic synthesis: consolidate tool outputs via a format-map-data tool.
  3. Map-focused agent to generate FeatureCollections from the user message.
  4. Final deterministic fallback: TomTom fuzzy search → format-map-data.
- Safety & correctness:
  - Google Places Insights: two-stage strategy (COUNT → adjust radius → PLACES) to keep ≤100 results and avoid rate limits.
  - Payload validation: removed disallowed fields (e.g., operatingStatus/description in typeFilter) to prevent 400s.
  - No fabricated map points: format-map-data emits features only with real coordinates; no (0,0) placeholders.
  - Metadata fidelity: toolsUsed derives from actual toolResults and merges with any declared in agent JSON; agentsUsed is tracked.

## Architecture at a glance

- API layer: `places` module with domain-specific endpoints (no monolithic orchestrator).
- Agents & tools: defined under `src/mastra/agents` and `src/mastra/tools` with shared memory/utilities.
- Data providers: Google (Places), TomTom (Search/POI), optional events, weather, and foot-traffic providers.
- Persistence: LibSQL for agent memory; Prisma scaffold present for future data needs.
- Output contract: Unified response type with text analysis, GeoJSON, and metadata.

See `SYSTEM_DIAGRAM.md` for a visual.

## What’s unique

- Deterministic “map on every request” without hallucinations.
- Rate-limit–aware Insights strategy that adapts radius based on COUNT.
- Programmatic GeoJSON synthesis that merges multi-source signals.
- Clean separation: domain agents produce analysis; tools produce facts; formatter emits maps.
- Extensible tool registry to add new providers with low coupling.

## Recent engineering improvements

- Simplified flow: removed unified/orchestrator controller; domain endpoints call their domain agents directly.
- Tool execution hardening: normalized tool IDs; prevented recursion in plan/execute; stabilized dynamic dispatch.
- Metadata fidelity: toolsUsed derived from toolResults and merged with agent-declared lists; promotion of GeoJSON FeatureCollections from tool outputs.
- Google Places Insights fixes: valid payloads; two-stage COUNT-first then PLACES with radius control; avoids 400/429.
- Map everywhere: programmatic synthesis via formatter; fallback to map agent; final deterministic TomTom fuzzy-search seed to ensure GeoJSON.
- Truthfulness: formatter no longer emits (0,0) placeholders for Insights-only IDs.

## Data sources and licensing

- Google Places (Insights/Details): subject to Google Maps Platform terms and quotas.
- TomTom Search/POI: subject to TomTom terms and quotas.
- Optional integrations (events, weather, foot-traffic) with their respective licenses.
- We avoid storing provider data beyond what’s needed for responses; add caching per provider terms.

## Business model (proposed)

- B2B SaaS: per-seat monthly fee + usage-based overages (API calls/maps generated).
- Tiers by domain coverage (1–4 domains) and data provider access.
- Private cloud or on-prem for enterprise.

## Go-to-market

- Initial focus: multi-location Retail and Real Estate developers; Urban planning consultancies; Utility planners.
- Land with API and light hosted map viewer; expand with workflow features.
- Partnerships with data providers and SI firms.

## Competitive landscape

- Esri ecosystem, Placer.ai, SafeGraph, Foursquare Studio, CARTO.
- Differentiation: agentic analysis + guaranteed GeoJSON in one API request; rate-limit resilience; modular toolchain; lower setup friction.

## Roadmap (next 6–12 months)

- Provider breadth: add OpenStreetMap/Overpass, transit GTFS, mobility, demographics.
- Spatial features: polygon queries, heatmaps, time series layers, isochrones, hex tiling.
- Quality: de-duplication across providers; confidence scoring; caching and cost controls.
- Platform: auth, usage metering, billing; project/orgs; saved analyses and maps.
- Front-end: lightweight viewer + shareable links; export to GeoJSON/Mapbox/Esri.

## Risks & mitigations

- Provider dependencies and quota/costs → multi-provider fallback, caching, budget guards.
- Data quality variance by locale → confidence scoring, cross-source validation, user feedback.
- Compliance/licensing drift → provider-specific adapters and automated schema validation.
- Hallucinations/incorrect maps → strict formatter, no fabricated coordinates, deterministic final fallback.

## Security & compliance

- Secrets via environment variables; least-privilege keys per environment.
- Minimal PII; primarily public place/POI metadata.
- Audit logs of tool usage for cost and compliance reviews.

## KPIs to track

- Map fulfillment rate: % requests returning non-empty FeatureCollection.
- Cost per request (blended across providers).
- Tool error rate and automatic fallback rate.
- p95 latency per domain.
- User-reported decision satisfaction (qualitative) and time-to-insight.

## Demo checklist

1. Real Estate around “Brickell, Miami” → expect analysis + map; toolsUsed includes Google Insights; if coordinates weren’t present, fallback adds TomTom + formatter.
2. Retail in “Mission District, San Francisco” → competition and complementary mix + FeatureCollection.
3. Urban Planning “South LA” → amenities/service coverage + map; verify agentsUsed/toolsUsed reflect fallbacks if triggered.
4. Energy/Utilities “Plano, TX” → service points context + map.

## Implementation status

- Codebase compiles; lint errors resolved where material; remaining warnings localized to legacy tool data typing (does not block usage).
- Endpoints live in the `places` module; agents/tools registered in `mastra` index.
- “Map on every request” is enforced via synthesis → map agent → TomTom fallback.

## The ask (customize)

- Raise: [TBD, e.g., $X seed/Series A].
- Use of funds: core team hiring (backend, data, geospatial), data contracts, GTM.
- 12-month goals: provider breadth, frontend viewer GA, enterprise pilots, usage milestones.

## Appendix

- Repo structure, key modules, and `SYSTEM_DIAGRAM.md` for architecture visuals.
- API response contract and sample payloads available in `README.md`.
