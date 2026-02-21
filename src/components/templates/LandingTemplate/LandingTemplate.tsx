import {
  LandingNav,
  HeroSection,
  FeaturesSection,
  CTASection,
  LandingFooter,
} from "@/components/organisms";

export function LandingTemplate() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <HeroSection />
      <FeaturesSection />
      <CTASection />
      <LandingFooter />
    </div>
  );
}
