# CLAUDE.md - Oil Spill Detection Frontend

**Project**: NTRO SIH2026 - Oil Spill Detection & Vessel Attribution  
**Stack**: Vite + React 18 + TypeScript + Tailwind CSS v4

---

## Design System: "Orbital SAR Intelligence"

### Philosophy
Avoid generic AI aesthetics. This interface represents radar backscatter, mission control telemetry, and the ocean seen from orbit at night.

### Color Tokens (CSS Variables)

**Base (Ocean from space)**
- `--abyss #05080F` — Page background
- `--deep #0A1626` — Panel backgrounds
- `--steel #13233B` — Elevated surfaces, borders
- `--steel-hover #1A2E4A` — Hover states

**Signal Colors**
- `--signal #38E1D0` — Radar cyan (primary accent, use sparingly)
- `--amber #FFB020` — Spill/alert highlights
- `--sheen #9B6DFF` — Iridescent oil-sheen violet (surreal accent)

**Text**
- `--ice #E6EDF3` — Primary text
- `--ice-dim #C8D4E0` — Secondary text
- `--mute #8CA0B3` — Tertiary text, labels
- `--mute-dim #6A7F94` — Muted captions

### Typography

**Fonts**: Space Grotesk (display), Inter (body), IBM Plex Mono (data)

**Rule**: All numbers, coordinates, timestamps, MMSI codes use `--font-mono`.

### Design Rules

1. **No hard-coded colors** — Use CSS variables only
2. **Mono for all data** — Numeric values, coordinates, timestamps
3. **Glow system** — Use `glow-signal`, `glow-amber`, `glow-sheen` classes for depth
4. **Dark theme first** — Structure supports light mode but ship dark
5. **Reduced motion** — Respect `prefers-reduced-motion`

---

## Folder Structure

```
/src/
  /components/
    /ui/           # Primitives: Button, Panel, Badge, etc.
    /layout/       # AppShell, navigation shell
    SarScanLoader.tsx  # Signature SAR scan animation
  /pages/          # Route pages
    PreviewPage.tsx    # Design token showcase (current)
  /types/          # TypeScript contracts (Spill, Vessel, AIS, etc.)
  /mock/           # Mock data fixtures
  /api/            # API layer (async functions over mocks)
  /store/          # Zustand state management
  /styles/         # Global CSS, tokens
```

---

## Mock Data Contracts

All data flows through `/src/api/index.ts`. Switching to a real backend: replace the import.

**Key types**:
- `SpillDetection` — Detected oil spill polygon, confidence, area
- `DriftPath` — Hindcast/forecast drift paths
- `OriginEstimate` — Calculated spill origin with uncertainty
- `Vessel` + `AisPoint` — Vessel registry + historical tracks
- `SuspectScore` — Ranked vessel attribution with evidence

---

## Signature Element: SAR Scan Loader

The `SarScanLoader` component implements the radar sweep motif:
- Boot sequence text animation
- Radar arm sweeping 360°
- Oil spill "blooming" on detection
- Reused across the app for loading states

---

## Development Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run preview  # Preview production build
```

---

## Chunk Status

- ✅ **Chunk 0**: Foundation & Design System
- ⬜ **Chunk 1**: Landing Page
- ⬜ **Chunk 2**: App Shell & Navigation
- ⬜ **Chunk 3**: Map Core
- ⬜ (Remaining chunks in plan document)
