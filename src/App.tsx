import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import { PreviewPage } from './pages/PreviewPage'
import { LandingPage } from './pages/LandingPage'
import { AppConsole } from './pages/AppConsole'
import { CrashBoundary } from './app/CrashBoundary'
import { PageLoader } from './components/ui'
import { SimulationSkeleton } from './components/simulation/SimulationSkeleton'
import Lenis from 'lenis'

// Lazy load Landing2 for code splitting
const Landing2Page = lazy(() => import('./pages/Landing2Page'))

// Simulation mode pulls in the OpenDrift engine and its own deck.gl layers, so
// it stays out of the console bundle until someone actually enters it.
const SimulationPage = lazy(() => import('./pages/SimulationPage'))

// Smooth scroll wrapper (only for landing page)
function SmoothScroll({ children, enabled = true }: { children: React.ReactNode; enabled?: boolean }) {
  const location = useLocation();

  useEffect(() => {
    if (!enabled) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, [enabled]);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return <>{children}</>;
}

function App() {
  return (
    <CrashBoundary name="App.Root">
      <BrowserRouter>
        <Routes>
          {/* Landing page (Landing2Page) - scroll-tied video */}
          <Route
            path="/"
            element={
              <Suspense fallback={<PageLoader />}>
                <Landing2Page />
              </Suspense>
            }
          />

          {/* Original landing page - now at /landing-classic */}
          <Route
            path="/landing-classic"
            element={
              <SmoothScroll enabled>
                <LandingPage />
              </SmoothScroll>
            }
          />

          {/* App console routes (no smooth scroll) */}
          <Route path="/app/*" element={<AppConsole />} />

          {/* Simulation mode - synthetic OpenDrift run, separate from case analysis */}
          <Route
            path="/simulation"
            element={
              <CrashBoundary name="App.Simulation">
                <Suspense fallback={<SimulationSkeleton />}>
                  <SimulationPage />
                </Suspense>
              </CrashBoundary>
            }
          />

          {/* Preview page */}
          <Route path="/preview" element={<PreviewPage />} />
        </Routes>
      </BrowserRouter>
    </CrashBoundary>
  )
}

export default App
