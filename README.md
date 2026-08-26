# Orbital SAR — Oil Spill Detection & Vessel Attribution

[![SIH2026](https://img.shields.io/badge/SIH2026-NTRO-amber.svg)](https://sih.gov.in/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Real-time SAR imagery analysis with forensic vessel attribution for oil spill detection.**

> Every spill leaves a wake. We read it.

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## 🛠️ Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 6 + Tailwind CSS v4
- **Routing**: React Router v7
- **State**: Zustand
- **Mapping**: react-map-gl + MapLibre GL + deck.gl
- **3D**: React Three Fiber + Three.js
- **Animation**: Framer Motion, GSAP, Lenis
- **Icons**: Lucide React

## 📁 Architecture

```
/src
  /components/
    /ui/           # Primitives: Button, Panel, Badge
    /layout/       # AppShell, ConsoleLayout, Navigation
    /map/          # RouteMap, LayerManager, Inspector
    /pipeline/     # DetectionPipeline (SAR, drift, attribution)
    /timeline/     # Timeline (4D sync, keyframes)
    /analysis/     # VesselAnalysis (AIS, scoring)
  /pages/          # Routes: LandingPage, AppConsole
  /store/          # Zustand state management
  /api/            # Mock data layer (swap for real backend)
  /styles/         # Design tokens, global CSS
  /types/          # TypeScript contracts
```

## 🎨 Design System

**"Orbital SAR Intelligence"** — Dark mission control aesthetics with forensic precision.

- **Base Palette**: Abyss (`#05080F`) → Deep (`#0A1626`) → Steel (`#13233B`)
- **Signal Colors**: Radar cyan (`#38E1D0`), Alert amber (`#FFB020`), Sheen violet (`#9B6DFF`)
- **Typography**: Space Grotesk (display) + Inter (body) + IBM Plex Mono (data)
- **Rule**: All timestamps, coordinates, metrics—mono.

## 📊 Features

### ✅ Implemented
- [x] Foundation & Design System
- [x] Landing Page (scroll-driven narrative)
- [x] App Shell & Navigation (3-panel console)
- [x] Map Core (SAR-styled interactive map)
- [x] Detection Pipeline (SAR → Characterization → Drift → Attribution)
- [x] Timeline (4D synchronized scrubbing)
- [x] Vessel Analysis (AIS tracks, attribution scoring)

### 🚧 Planned
- [ ] Weather Data Integration (wind/wave visualization)
- [ ] Drift Modeling Hindsight/Foresight
- [ ] Report Generation System
- [ ] Real-time API Integration

## 🔧 Configuration

### Environment Variables (optional)
```bash
# Map provider API key (fallback: free styles)
VITE_MAP_KEY=your_api_key_here

# API endpoint (default: mock data)
VITE_API_URL=https://api.your-service.com
```

## 🚢 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

**Auto-detection**: Vercel recognizes Vite via `vercel.json` config.

### Manual Build
```bash
npm run build
# Upload `dist/` to your hosting platform
```

## 🎯 Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (http://localhost:5173) |
| `npm run build` | Production build (outputs to `dist/`) |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint check |

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

## 🤝 Contributing

This is an SIH2026 project. For collaboration:
1. Fork the repository
2. Create a feature branch
3. Commit with clear messages
4. Push to your fork
5. Open a pull request

## 👥 Team

**SIH2026 — NTRO**  
Space Technology Division

**Built with**: 🧠 Claude + ⚛️ React + 🚀 Vite

---

*"From orbit to insight — because the ocean tells no lies."*
