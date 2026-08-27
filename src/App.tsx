import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import { PreviewPage } from './pages/PreviewPage'
import { LandingPage } from './pages/LandingPage'
import { AppConsole } from './pages/AppConsole'
import Lenis from 'lenis'

// Lazy load Landing2 for code splitting
const Landing2Page = lazy(() => import('./pages/Landing2Page'))

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
    <BrowserRouter>
      <Routes>
        {/* Landing page with smooth scroll */}
        <Route
          path="/"
          element={
            <SmoothScroll enabled>
              <LandingPage />
            </SmoothScroll>
          }
        />

        {/* App console routes (no smooth scroll) */}
        <Route
          path="/app/*"
          element={<AppConsole />}
        >
          <Route index element={<AppConsole />} />
          <Route path="cases" element={<AppConsole />} />
          <Route path="cases/:id" element={<AppConsole />} />
        </Route>

        {/* Preview page */}
        <Route path="/preview" element={<PreviewPage />} />

        {/* Landing2 page - scroll-tied video */}
        <Route
          path="/landing2"
          element={
            <Suspense fallback={<div className="h-screen w-full bg-[#05080F]" />}>
              <Landing2Page />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
