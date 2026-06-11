import { SEOHead } from "@/components/landing/SEOHead";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { ImpactMetricsSection } from "@/components/landing/ImpactMetricsSection";
import { ServicesSection } from "@/components/landing/ServicesSection";
import { FeatureSection } from "@/components/landing/FeatureSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { CaseStudiesSection } from "@/components/landing/CaseStudiesSection";
import { ServicePackagesSection } from "@/components/landing/ServicePackagesSection";
import { LeadershipSection } from "@/components/landing/LeadershipSection";
import { ContactSection } from "@/components/landing/ContactSection";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";
import { useBranding } from "@/components/BrandingProvider";
import { useSeoSettings } from "@/hooks/useSeoSettings";

export default function LandingPage() {
  const { branding } = useBranding();
  const { data: seoSettings } = useSeoSettings();

  const defaultKeywords = [
    "AI consulting company",
    "production AI systems",
    "workflow automation",
    "AI agents",
    "RAG implementation",
    "applied machine learning",
    "AI governance",
    "responsible AI",
    "enterprise AI deployment",
    "AI strategy and execution",
    "business process automation"
  ];
  // AI Consulting for Production Systems
  const seoTitle = seoSettings?.defaultTitle || "AcceLLM - Engineering the Future of Intelligence";
  const seoDescription = seoSettings?.defaultDescription || branding.app_tagline || "Design, build, and deploy production-grade AI systems that reduce cost, increase speed, and unlock measurable business outcomes.";
  const seoKeywords = (seoSettings?.defaultKeywords && seoSettings.defaultKeywords.length > 0) 
    ? seoSettings.defaultKeywords 
    : defaultKeywords;
  const seoOgImage = seoSettings?.defaultOgImage || undefined;
  const seoCanonicalUrl = seoSettings?.canonicalBaseUrl || undefined;

  return (
    <div className="min-h-screen bg-white" data-testid="landing-page">
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        canonicalUrl={seoCanonicalUrl}
        ogImage={seoOgImage}
        ogSiteName={branding.app_name}
        keywords={seoKeywords}
        twitterSite={seoSettings?.twitterHandle || undefined}
        twitterCreator={seoSettings?.twitterHandle || undefined}
        googleVerification={seoSettings?.googleVerification || undefined}
        bingVerification={seoSettings?.bingVerification || undefined}
        facebookAppId={seoSettings?.facebookAppId || undefined}
        structuredDataOrg={seoSettings?.structuredDataOrg}
        structuredDataFaq={seoSettings?.structuredDataFaq}
        structuredDataProduct={seoSettings?.structuredDataProduct}
      />

      <Navbar />

      <main>
        <HeroSection />

        <section id="impact">
          <ImpactMetricsSection />
        </section>

        <section id="services">
          <ServicesSection />
        </section>

        <section id="features">
          <FeatureSection />
        </section>

        <section id="process">
          <HowItWorks />
        </section>

        <section id="case-studies" className="scroll-mt-20">
          <CaseStudiesSection />
        </section>

        <section id="pricing">
          <ServicePackagesSection />
        </section>

        <section id="leadership">
          <LeadershipSection />
        </section>

        <section id="contact">
          <ContactSection />
        </section>

        <CTASection />
      </main>

      <Footer />
    </div>
  );
}
