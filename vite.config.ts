import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    sourcemap: true,
  },
  // NOTE: do NOT enable `esbuild.keepNames` here. It injects `__name(...)` helper
  // calls into every module; maplibre-gl/deck.gl build their web worker from bundled
  // source, and the `__name` helper is not defined in the worker blob scope, so the
  // worker throws "__name is not defined" (minified: "f is not defined"), the GL
  // render pipeline stalls, and the map paints nothing in production builds.
})
