import { SEOHead } from "@/components/landing/SEOHead";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { ImpactMetricsSection } from "@/components/landing/ImpactMetricsSection";
import { FeatureSection } from "@/components/landing/FeatureSection";
import { UseCasesSection } from "@/components/landing/UseCasesSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { IntegrationsGrid } from "@/components/landing/IntegrationsGrid";
import { PricingSection } from "@/components/landing/PricingSection";
import { ContactSection } from "@/components/landing/ContactSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";
import { useBranding } from "@/components/BrandingProvider";
import { useSeoSettings } from "@/hooks/useSeoSettings";

export default function LandingPage() {
  const { branding } = useBranding();
  const { data: seoSettings } = useSeoSettings();

  const defaultKeywords = [
    "AI hiring platform",
    "automated interviews",
    "CV screening",
    "AI recruitment",
    "candidate pipeline",
    "voice AI interviews",
    "bulk resume upload",
    "HR automation",
    "AI candidate scoring",
    "hiring workflow"
  ];

  const seoTitle = seoSettings?.defaultTitle || "AI-Powered HR Hiring Platform";
  const seoDescription = seoSettings?.defaultDescription || branding.app_tagline || "Transform your hiring with AI-powered screening and voice interviews. Upload CVs in bulk, score candidates automatically, and conduct AI phone interviews 24/7.";
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

        <section id="features">
          <FeatureSection />
        </section>

        <section id="use-cases">
          <UseCasesSection />
        </section>

        <section id="testimonials">
          <TestimonialsSection />
        </section>

        <section id="integrations">
          <IntegrationsGrid />
        </section>

        <section id="pricing">
          <PricingSection />
        </section>

        <section id="contact">
          <ContactSection />
        </section>

        <section id="faq">
          <FAQSection />
        </section>

        <CTASection />
      </main>

      <Footer />
    </div>
  );
}
