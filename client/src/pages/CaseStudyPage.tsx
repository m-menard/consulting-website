import { useEffect } from "react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Link, Redirect, useParams } from "wouter";
import { SEOHead } from "@/components/landing/SEOHead";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import CountUpStat from "@/components/case-studies/CountUpStat";
import FadeIn from "@/components/case-studies/FadeIn";
import CgLifeWorkflow from "@/components/case-studies/illustrations/CgLifeWorkflow";
import GivebutterPipeline from "@/components/case-studies/illustrations/GivebutterPipeline";
import { caseStudyPath, getCaseStudy, CASE_STUDIES, type CaseStudy } from "@/lib/case-studies";
import { useBranding } from "@/components/BrandingProvider";
import { useSeoSettings } from "@/hooks/useSeoSettings";

const WORKFLOW_COMPONENTS = {
  "cg-life": CgLifeWorkflow,
  givebutter: GivebutterPipeline,
} as const;

const workflowIllustrationVars = {
  "--ill-surface": "#ffffff",
  "--ill-surface-2": "#f1f5f9",
  "--ill-surface-3": "#e2e8f0",
  "--ill-stroke": "rgba(15, 23, 42, 0.12)",
  "--ill-stroke-strong": "rgba(15, 23, 42, 0.2)",
  "--ill-text": "#0f172a",
  "--ill-text-dim": "#64748b",
} as React.CSSProperties;

export default function CaseStudyPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";
  const cs = getCaseStudy(slug);
  const { branding } = useBranding();
  const { data: seoSettings } = useSeoSettings();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [slug]);

  useEffect(() => {
    if (!cs) {
      document.title = branding.app_name;
      return;
    }
    document.title = `${cs.client} Case Study | ${branding.app_name}`;
  }, [cs, branding.app_name]);

  if (!cs) return <Redirect to="/#use-cases" />;

  const currentIndex = CASE_STUDIES.findIndex((study) => study.slug === cs.slug);
  const next =
    currentIndex === -1 || CASE_STUDIES.length < 2
      ? undefined
      : CASE_STUDIES[(currentIndex + 1) % CASE_STUDIES.length];
  const Workflow = WORKFLOW_COMPONENTS[cs.workflow.kind];

  const seoTitle = `${cs.client} Case Study | ${branding.app_name}`;
  const seoDescription = cs.tagline;

  return (
    <div className="min-h-screen bg-white" data-testid="case-study-page">
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        canonicalUrl={
          seoSettings?.canonicalBaseUrl
            ? `${seoSettings.canonicalBaseUrl}${caseStudyPath(cs.slug)}`
            : undefined
        }
        ogSiteName={branding.app_name}
      />

      <Navbar />

      <main>
        <PhotoHero cs={cs} />

        <section className="border-y border-slate-200 bg-slate-50 py-6">
          <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Grounded in real data sources
          </p>
          <div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-x-8 gap-y-2 px-4 sm:px-6 lg:px-8">
            {cs.tools.map((tool) => (
              <span key={tool} className="font-mono text-sm tracking-wide text-slate-500">
                {tool}
              </span>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 lg:grid-cols-4">
              {cs.results.map((result, index) => (
                <div key={index} className="bg-white px-6 py-8">
                  <CountUpStat
                    value={result.value}
                    className="font-mono text-3xl font-bold tracking-tight text-slate-900 lg:text-4xl"
                  />
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{result.label}</p>
                  {result.note && (
                    <p className="mt-1 text-sm italic text-slate-400">{result.note}</p>
                  )}
                </div>
              ))}
            </div>
          </FadeIn>
        </section>

        <SplitSection
          cs={cs}
          number="01"
          label="Client Overview"
          body={cs.overview}
          image={cs.overviewImage}
        />

        <SplitSection
          cs={cs}
          number="02"
          label="The Challenge"
          headline={cs.challengeHeadline}
          body={cs.challenge}
          image={cs.challengeImage}
          reverse
          badges={cs.challengeBadges}
          muted
        />

        <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8 lg:pt-12">
          <FadeIn>
            <SectionLabel cs={cs} number="03">
              The Solutions
            </SectionLabel>
            <h2 className="max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              {cs.solutionHeadline}
            </h2>
          </FadeIn>
        </section>

        {cs.solutionFeature && (
          <FeaturePanel feature={cs.solutionFeature} className="pt-10 lg:pt-12" />
        )}

        <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8 lg:pt-12">
          <FadeIn>
            <div
              className="rounded-2xl border border-slate-200 bg-slate-50 p-6 lg:p-10"
              style={workflowIllustrationVars}
            >
              <p className="mb-8 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {cs.workflow.label}
              </p>
              <Workflow />
            </div>
          </FadeIn>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="space-y-16 lg:space-y-20">
            {cs.solutions.map((solution, solutionIndex) => (
              <div key={solution.title}>
                <FadeIn delay={solutionIndex * 0.04}>
                  <div className="mb-4 flex items-baseline gap-4">
                    <span
                      className="font-mono text-sm font-bold tabular-nums"
                      style={{ color: cs.accentInk }}
                    >
                      {String(solutionIndex + 1).padStart(2, "0")}
                    </span>
                    <h3 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">
                      {solution.title}
                    </h3>
                  </div>
                  <p className="mb-10 max-w-2xl pl-9 text-lg leading-relaxed text-slate-600">
                    {solution.description}
                  </p>
                </FadeIn>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {solution.capabilities.map((capability, capabilityIndex) => (
                    <FadeIn key={capability.title} delay={capabilityIndex * 0.04}>
                      <div className="group h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
                        <div className="mb-4 flex items-center justify-between">
                          <span
                            className="font-mono text-xs font-bold tabular-nums"
                            style={{ color: cs.accentInk }}
                          >
                            {String(capabilityIndex + 1).padStart(2, "0")}
                          </span>
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: cs.accent }}
                          />
                        </div>
                        <p className="mb-3 text-base font-semibold leading-snug text-slate-900">
                          {capability.title}
                        </p>
                        <p className="text-sm leading-relaxed text-slate-600">
                          {capability.description}
                        </p>
                      </div>
                    </FadeIn>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <FeaturePanel feature={cs.depthFeature} />

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <FadeIn>
            <SectionLabel cs={cs} number="04">
              What&apos;s Next
            </SectionLabel>
            <div className="mt-2 grid gap-6 sm:grid-cols-3">
              {cs.whatsNext.map((item, index) => (
                <FadeIn key={item} delay={index * 0.06}>
                  <div className="h-full rounded-2xl border border-slate-200 bg-slate-50 p-7">
                    <span
                      className="font-mono text-sm font-bold tabular-nums"
                      style={{ color: cs.accentInk }}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <p className="mt-3 text-base leading-relaxed text-slate-800 lg:text-lg">
                      {item}
                    </p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </FadeIn>
        </section>

        {cs.quote && (
          <section className="border-y border-slate-200 bg-[#EFF5FF] py-14">
            <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
              <blockquote className="text-2xl font-light italic leading-relaxed text-slate-700">
                &ldquo;{cs.quote.text}&rdquo;
              </blockquote>
              <p className="mt-4 text-sm font-semibold text-slate-900">{cs.quote.author}</p>
              <p className="text-sm text-slate-500">{cs.quote.role}</p>
            </div>
          </section>
        )}

        {next && next.slug !== cs.slug && (
          <section className="mx-auto max-w-7xl px-4 pb-8 pt-4 sm:px-6 lg:px-8">
            <FadeIn y={24}>
              <Link href={caseStudyPath(next.slug)} className="group block">
                <div
                  className="flex flex-col items-start justify-between gap-6 overflow-hidden rounded-2xl border bg-slate-50 p-8 transition-all hover:-translate-y-1 hover:shadow-lg sm:flex-row sm:items-center lg:p-12"
                  style={{ borderColor: `${next.accent}44` }}
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Next case study
                    </p>
                    <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900 lg:text-4xl">
                      {next.client}
                    </p>
                    <p className="mt-2 max-w-md text-slate-600">{next.tagline}</p>
                  </div>
                  <span
                    className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold"
                    style={{ color: next.accentInk }}
                  >
                    Read next
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </div>
              </Link>
            </FadeIn>
          </section>
        )}

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <FadeIn>
            <Link
              href="/#use-cases"
              className="inline-flex items-center gap-2 text-sm text-slate-600 transition-colors hover:text-[#176BD0]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to all case studies
            </Link>
          </FadeIn>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function PhotoHero({ cs }: { cs: CaseStudy }) {
  return (
    <section className="relative flex min-h-[min(88vh,820px)] flex-col justify-end overflow-hidden bg-slate-900 pt-16">
      <img
        src={cs.heroImage.src}
        alt={cs.heroImage.alt}
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/30" />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/60 via-transparent to-transparent" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-16 pt-12 sm:px-6 lg:px-8 lg:pb-20">
        <FadeIn>
          <div className="mb-8 flex flex-wrap items-center gap-3">
            <Link
              href="/#use-cases"
              className="inline-flex items-center gap-1.5 text-sm text-white/70 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Case Studies
            </Link>
            <span className="text-white/25">·</span>
            <span
              className="text-xs font-semibold uppercase tracking-[0.18em]"
              style={{ color: cs.accent }}
            >
              {cs.industry}
            </span>
          </div>
        </FadeIn>

        <FadeIn delay={0.08}>
          <h1 className="mb-6 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-7xl">
            {cs.client}
          </h1>
        </FadeIn>

        <FadeIn delay={0.14}>
          <p className="mb-12 max-w-2xl text-xl font-light leading-snug text-white/85 sm:text-2xl lg:text-3xl">
            {cs.tagline}
          </p>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="flex flex-wrap items-end gap-10 lg:gap-12">
            <div>
              <p
                className="font-mono text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl"
                style={{ color: cs.accent }}
              >
                {cs.heroStat.value}
              </p>
              <p className="mt-2 text-lg text-white/75">{cs.heroStat.label}</p>
              {cs.heroStat.note && (
                <p className="mt-1 text-sm text-white/45">{cs.heroStat.note}</p>
              )}
            </div>
            <p className="pb-1 text-sm text-white/45">{cs.publishedAt}</p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

function SplitSection({
  cs,
  number,
  label,
  headline,
  body,
  image,
  reverse = false,
  badges,
  muted = false,
}: {
  cs: CaseStudy;
  number: string;
  label: string;
  headline?: string;
  body: string;
  image: { src: string; alt: string };
  reverse?: boolean;
  badges?: [string, string];
  muted?: boolean;
}) {
  return (
    <section className={muted ? "bg-slate-50 py-12 lg:py-16" : "py-12 lg:py-16"}>
      <FadeIn>
        <div className="mx-auto grid max-w-7xl items-stretch gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:px-8">
          <div
            className={`relative min-h-[280px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 lg:min-h-[360px] ${
              reverse ? "order-2 lg:order-1" : ""
            }`}
          >
            <img src={image.src} alt={image.alt} className="h-full w-full object-cover object-center" />
            {badges && (
              <div className="absolute inset-x-5 bottom-5 flex justify-between gap-3">
                <span className="rounded-md bg-white/90 px-2 py-1 text-xs text-slate-800 backdrop-blur">
                  {badges[0]}
                </span>
                <span className="rounded-md bg-white/90 px-2 py-1 text-xs text-slate-800 backdrop-blur">
                  {badges[1]}
                </span>
              </div>
            )}
          </div>

          <div className={`flex flex-col justify-center ${reverse ? "order-1 lg:order-2" : ""}`}>
            <SectionLabel cs={cs} number={number}>
              {label}
            </SectionLabel>
            {headline ? (
              <h2 className="mb-6 max-w-lg text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
                {headline}
              </h2>
            ) : null}
            <p
              className={
                headline
                  ? "max-w-lg text-lg leading-relaxed text-slate-600"
                  : "max-w-lg text-xl font-light leading-relaxed text-slate-700 lg:text-2xl"
              }
            >
              {body}
            </p>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}

function FeaturePanel({
  feature,
  className = "",
}: {
  feature: {
    src: string;
    alt: string;
    eyebrow: string;
    headline: string;
  };
  className?: string;
}) {
  return (
    <FadeIn>
      <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>
        <div className="relative min-h-[320px] overflow-hidden rounded-2xl border border-slate-200 lg:min-h-[420px]">
          <img
            src={feature.src}
            alt={feature.alt}
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/55 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-8 lg:p-12">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
              {feature.eyebrow}
            </p>
            <p className="max-w-2xl text-2xl font-bold leading-snug tracking-tight text-white lg:text-3xl">
              {feature.headline}
            </p>
          </div>
        </div>
      </div>
    </FadeIn>
  );
}

function SectionLabel({
  cs,
  children,
  number,
}: {
  cs: CaseStudy;
  children: React.ReactNode;
  number?: string;
}) {
  return (
    <div className="mb-5 flex items-center gap-3">
      {number && (
        <span
          className="font-mono text-xs font-bold tabular-nums tracking-wider"
          style={{ color: cs.accentInk }}
        >
          {number}
        </span>
      )}
      {number && <span className="h-px w-6 bg-slate-200" />}
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{children}</p>
    </div>
  );
}
