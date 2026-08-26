# Oil Spill Detection Frontend - Complete Build Prompts

## Status Tracker
- ✅ Chunk 0: Foundation & Design System (COMPLETE)
- ⬜ Chunk 1: Landing Page (SURREAL HERO - IN PROGRESS)
- ⬜ Chunk 2: App Shell & Navigation
- ⬜ Chunk 3: Map Core
- ⬜ Chunk 4: Satellite Imagery Layers (SAR & EO)
- ⬜ Chunk 5: Spill Detection & Characterization
- ⬜ Chunk 6: Master Timeline Controller
- ⬜ Chunk 7: Drift — Hindcast/Forecast + Environment
- ⬜ Chunk 8: AIS Vessels & Tracks
- ⬜ Chunk 9: Suspect Ranking & Attribution / Evidence
- ⬜ Chunk 10: Charts & Analytics Panel
- ⬜ Chunk 11: Workflow & Pipeline States
- ⬜ Chunk 12: Reporting, Cases & Export
- ⬜ Chunk 13: Global Polish

---

## CHUNK 1: Landing Page ("surreal" hero + scroll story)

### The Signature Moment
A **SAR scan-sweep hero**: a dark ocean field (subtle animated noise/speckle evoking real SAR backscatter). A radar sweep line rotates/passes across it. As it sweeps, a dark **oil slick blooms** on the water, then crisp detection outlines snap onto it (the "detection" beat), and a faint **vessel track** lights up threading away from the slick.

Build with Canvas/WebGL (R3F) or layered SVG + Framer Motion — whichever you can make smooth at 60fps. It must degrade to a static, still-beautiful frame under `prefers-reduced-motion`.

Over this, the hero headline (Clash Display), a one-line subhead, and a primary CTA ("Open the console" / "Launch analysis") plus a secondary ("See how it works"). A thin mono telemetry strip (fake but plausible: `LAT 18.94°N · LON 72.83°E · SAR C-BAND · PASS 06:42 UTC`) frames the hero like a mission readout.

### Page Structure (sections, in order)
1. **Hero** — the signature scan-sweep + headline + CTAs + telemetry strip. A subtle scroll-cue.
2. **The problem** — short, weighty copy: oil spills go unattributed; the ocean hides the culprit. One striking stat or line, set in display type. Ambient motion only.
3. **How it works** — a 4-beat horizontal or pinned-scroll sequence: (a) *Detect* — SAR/EO imagery → spill polygon; (b) *Characterize* — area, age, type; (c) *Hindcast* — trace drift back to origin using currents & wind; (d) *Attribute* — score AIS vessels by proximity, trajectory, anomaly.
4. **The interface** — a framed, angled preview mock of the app console with 2–3 callouts.
5. **Capabilities / stats** — a restrained grid: detection, hindcast + forecast, attribution scoring, exportable reports.
6. **Final CTA** — repeat the scan motif small, a strong closing line, the primary CTA into the app.

### Motion & Interaction Spec
- **Page-load "signal acquisition" sequence:** brief boot — telemetry strip types in, hero headline resolves from a blurred/de-speckled state, scan sweep begins. Keep it under ~1.5s.
- **Smooth scroll** with Lenis; **scroll-triggered** reveals with GSAP ScrollTrigger.
- **Hover micro-interactions**: CTA gets a subtle signal-glow.
- One pinned/parallax moment max (section 3).
- Respect `prefers-reduced-motion` everywhere.

### Copy Voice
Precise, technical, a little cinematic — mission control, not marketing fluff. Active voice.
Example hero line direction: *"Every spill leaves a wake. We read it."*

### Tech Requirements
- Route `/` in the app router; CTA routes to `/app`
- Componentize sections under `src/pages/landing/`
- Lazy-load the heavy hero scene; show the `SarScanLoader` fallback

### DO NOT
- Do not build the actual app console, map, or real data views
- Do not fall back to generic hero patterns
- Do not hard-code colors or use non-mono type for data

---

## CHUNK 2: App Shell & Navigation

### Goal
A routed application at `/app` with a persistent 3-region console layout, command palette, and status system.

### Deliverables
- **Routing** (react-router v6): `/`, `/app`, `/app/cases`, `/app/cases/:id`, `/app/reports`, `*`
- **Console layout**:
  - Top telemetry bar: brand mark, live UTC clock (mono), AOI label, status pill, `⌘K` hint
  - Left panel (dock): "Layers & Data" — empty for Chunk 3
  - Center: main stage — empty for map
  - Right panel (inspector): "Inspector" — empty for details
  - Bottom dock: reserved for timeline
- **Command palette** (`⌘K`): fuzzy actions
- **Keyboard shortcuts** + `?` help sheet
- **Notifications/toast** region

### DO NOT
Build the map, timeline, or any data view — just the frame.

---

## CHUNK 3: Map Core

### Goal
A performant MapLibre + deck.gl map in the console center, styled to "Orbital SAR Intelligence" dark theme.

### Deliverables
- **Map canvas** (react-map-gl + MapLibre) over Arabian Sea / Indian EEZ
- **deck.gl overlay** integrated — typed layer registry
- **Base layers**: dark ocean, satellite, bathymetry — switchable
- **Layer manager**: toggle visibility + opacity slider per layer
- **AOI tools**: draw rectangle/polygon, clear, read AOI area (km², mono)
- **Readouts**: live cursor coordinate (lat/long, mono), scale bar, zoom/compass

### DO NOT
Add spill polygons, vessels, drift, or timeline.

---

## CHUNK 4: Satellite Imagery Layers (SAR & EO)

### Deliverables
- **SAR raster overlay** — registered in layer manager
- **EO raster overlay** — toggleable
- **Swipe / split-screen compare** — draggable divider
- **Pass selector** — dropdown of acquisition passes
- **SAR legend** — backscatter intensity scale

---

## CHUNK 5: Spill Detection & Characterization

### Deliverables
- **Spill polygon layer** (deck.gl GeoJsonLayer) — filled with `--amber`/`--sheen`
- **Confidence heatmap** toggle
- **Click → Characterization panel**: area (km²), perimeter (km), estimated age (hrs), confidence, sensor
- **Multi-spill support**: list with select/hover
- **Origin hook**: marker for estimated origin

---

## CHUNK 6: Master Timeline Controller (4D Scrubber)

### THE MOST IMPORTANT INTERACTION IN THE APP

### Deliverables
- **Timeline component** in bottom dock
- **Transport controls**: play, pause, step, speed (0.5×–16×)
- **Scrubber**: draggable playhead; timestamp in mono UTC
- **Event markers**: origin (t0), detection (t_det), AIS-gap markers
- **Global time API**: hook (`useTime()`) for Chunks 7–10

---

## CHUNK 7: Drift — Hindcast/Forecast + Environment

### Deliverables
- **Hindcast path** (backward) and **Forecast path** (forward)
- **Time sync**: timeline plays → slick animates along path; scrub to t0 → slick collapses to origin
- **Origin estimate**: marker + uncertainty ellipse (tightest at t0, widens with time)
- **Ocean current field**: animated vectors/particles
- **Wind field**: vector overlay

---

## CHUNK 8: AIS Vessels & Tracks

### Deliverables
- **Vessel markers** (deck.gl IconLayer) — positions interpolate with timeline
- **Historical tracks** (PathLayer/TripsLayer)
- **Spatio-temporal filter**: distance-from-origin + time-window sliders
- **Hover tooltip**: name, MMSI, SOG, COG (mono)
- **Click → inspector card**: vessel details + speed sparkline
- **Anomaly hints**: AIS-gap segments (dashed), loitering clusters

---

## CHUNK 9: Suspect Ranking & Attribution / Evidence

### THE PAYOFF — "WHO DID IT"

### Deliverables
- **Suspect leaderboard**: ranked by total score; row = rank, name, MMSI (mono), flag, total score, multi-bar (proximity/trajectory/anomaly)
- **Score breakdown**: expand row → rationale per score
- **Linked selection (both ways)**: list ↔ map
- **Evidence view** ("Why this vessel?"): replay track intersecting origin window, list timestamped evidence
- **Confidence/caveat line**: probabilistic framing

---

## CHUNK 10: Charts & Analytics Panel

### Deliverables
- **Spill area over time** — playhead tracks timeline
- **Vessel proximity to origin over time** — suspect emphasized
- **Suspect score comparison** — horizontal bar, stacked factors
- **Environmental plots** — current speed, wind speed

---

## CHUNK 11: Workflow & Pipeline States

### Deliverables
- **New analysis flow**: AOI → date-time window → satellite pass → model parameters
- **Pipeline runner**: staged progress — `Ingest → Detect → Characterize → Hindcast → Reconstruct AIS → Score → Done`
- **States**: loading, success, error (clear + retry), empty
- **Cancel / re-run**

---

## CHUNK 12: Reporting, Cases & Export

### Deliverables
- **Incident report (PDF)**: branded, map snapshot, characterization, drift summary, ranked suspects
- **Data export**: GeoJSON, CSV, KML downloads
- **Case management**: `/app/cases` list with status (Under investigation / Attributed / Closed)
- **Shareable link**: encode view state in URL

---

## CHUNK 13: Global Polish

### THE COAT OF PAINT THAT WINS DEMOS

### Deliverables
- **Global search** in `⌘K`: MMSI, vessel name, case id, coordinate, date
- **Theme**: confirm dark flawless; optional light theme
- **State coverage**: every async surface has loading/empty/error
- **Onboarding tour**: guided walkthrough (detection → hindcast → traffic → suspect + evidence)
- **Responsiveness**: full audit 360px→1920px
- **Accessibility**: keyboard nav, visible focus, ARIA, contrast, prefers-reduced-motion
- **Performance**: lazy-load, memoize, throttle
- **Consistency sweep**: spacing, type, mono-for-data, color usage
- **404 + error boundary**

---

## Design System Reference (from Chunk 0)

### Color Tokens
- `--abyss #05080F` — Page background
- `--deep #0A1626` — Panel backgrounds
- `--steel #13233B` — Elevated surfaces, borders
- `--steel-hover #1A2E4A` — Hover states
- `--signal #38E1D0` — Radar cyan (primary accent)
- `--amber #FFB020` — Spill/alert highlights
- `--sheen #9B6DFF` — Iridescent oil-sheen violet
- `--ice #E6EDF3` — Primary text
- `--ice-dim #C8D4E0` — Secondary text
- `--mute #8CA0B3` — Tertiary text
- `--mute-dim #6A7F94` — Muted captions

### Typography
- **Space Grotesk** (display)
- **Inter** (body)
- **IBM Plex Mono** (data — ALL numbers, coordinates, timestamps, MMSI)

### Rules
1. No hard-coded colors — Use CSS variables only
2. Mono for all data — Numeric values, coordinates, timestamps
3. Glow system — Use `glow-signal`, `glow-amber`, `glow-sheen` classes
4. Dark theme first
5. Respect `prefers-reduced-motion`
