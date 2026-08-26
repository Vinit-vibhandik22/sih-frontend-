# Contributing to Orbital SAR

Welcome! We're glad you're interested in contributing to the SIH2026 oil spill detection platform.

## 📋 Quick Start

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
   ```bash
   git clone https://github.com/your-username/orbital-sar.git
   cd orbital-sar
   ```
3. **Install dependencies**
   ```bash
   npm install
   ```
4. **Start development server**
   ```bash
   npm run dev
   ```
5. **Create a branch** for your changes
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 🚧 Development Guidelines

### Code Style
- Use TypeScript strict mode
- Follow existing component patterns
- Use project design tokens (no hard-coded colors)
- All data/timestamps in `font-mono`
- Commit messages: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`

### File Organization
```
src/
  components/{feature}/{ComponentName}.tsx
  pages/{RouteName}.tsx
  store/{feature}Slice.ts
  types/{domain}.ts
  api/{service}.ts
```

### Branch Naming
- `feature/` — New features
- `fix/` — Bug fixes
- `docs/` — Documentation
- `test/` — Testing
- `refactor/` — Code restructuring

## 🧪 Testing

```bash
npm run lint        # Lint check
npm run build      # Build verify
npm run preview    # Local preview
```

## 📤 Pull Requests

1. **Update this branch** with latest main
   ```bash
   git fetch origin
   git rebase origin/main
   ```
2. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```
3. **Open a Pull Request** on GitHub
4. **Describe your changes** clearly
5. **Reference related issues** (if any)

## 🎯 Priority Areas

We're actively seeking contributions for:
- Weather data integration
- Drift modeling visualization
- Report generation UI
- Real-time API layer
- Mobile optimization

## 💬 Questions?

Open an issue or reach out to the SIH2026 NTRO team.

---

**Thank you for contributing! Every line of code helps protect our oceans.** 🌊
