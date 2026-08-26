/**
 * LandingPage.tsx
 * The complete landing page with FoldHero and all sections.
 */

import { FoldHero } from '../components/landing/FoldHero';
import { ProblemSection } from './landing/ProblemSection';
import { HowItWorks } from './landing/HowItWorks';
import { InterfacePreview } from './landing/InterfacePreview';
import { Capabilities } from './landing/Capabilities';
import { FinalCTA } from './landing/FinalCTA';
import { Footer } from './landing/Footer';

export const LandingPage = () => {
  return (
    <main className="min-h-screen bg-abyss">
      <FoldHero />
      <ProblemSection />
      <HowItWorks />
      <InterfacePreview />
      <Capabilities />
      <FinalCTA />
      <Footer />
    </main>
  );
};

export default LandingPage;
