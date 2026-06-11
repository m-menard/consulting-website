import { useEffect } from "react";
import Link from "@/components/case-studies/AppLink";
import Image from "@/components/case-studies/AppImage";
import { CASE_STUDIES, caseStudyPath } from "@/lib/case-studies";
import FadeIn from "@/components/case-studies/FadeIn";
import TiltCard from "@/components/case-studies/TiltCard";
import Marquee from "@/components/case-studies/Marquee";
import CountUpStat from "@/components/case-studies/CountUpStat";
import ParticleField from "@/components/case-studies/ParticleField";
import ScrollStage from "@/components/case-studies/ScrollStage";
import CadrianNav from "@/components/case-studies/CadrianNav";
import CadrianFooter from "@/components/case-studies/CadrianFooter";
import "@/styles/case-studies.css";

const ArrowIcon = ({ className = "" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
  </svg>
);

export default function CadrianPage() {
  const cgLife = CASE_STUDIES.find((cs) => cs.slug === "cg-life")!;
  const givebutter = CASE_STUDIES.find((cs) => cs.slug === "givebutter")!;
  const allTools = [...cgLife.tools, ...givebutter.tools];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    document.title = "Cadrian · Client Case Studies";
  }, []);

  return (
    <div className="case-studies-root" data-theme="dark">
      <CadrianNav />
      <main>
        <section className="relative mx-auto max-w-6xl px-6 pb-24 pt-24 lg:pb-32 lg:pt-36">
          <div className="pointer-events-none absolute left-1/2 top-0 z-0 h-full w-screen -translate-x-1/2 overflow-hidden">
            <ParticleField />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg" />
          </div>

          <div className="relative z-10">
            <FadeIn>
              <div className="glass inline-flex items-center gap-2.5 rounded-full border border-line py-1.5 pl-2.5 pr-4">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                </span>
                <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                  Cadrian · Client Case Studies
                </span>
              </div>
            </FadeIn>

            <FadeIn delay={0.08}>
              <h1 className="mt-8 max-w-4xl text-6xl font-bold leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl">
                <span className="text-fg">We build AI</span>
                <br />
                <span className="text-accent-soft">that delivers.</span>
              </h1>
            </FadeIn>

            <FadeIn delay={0.16}>
              <p className="mt-8 max-w-xl text-xl leading-relaxed text-muted">
                Custom multi-agent systems for ambitious teams. Here&rsquo;s what two
                of them look like in production: measured, shipped, and working.
              </p>
            </FadeIn>

            <FadeIn delay={0.24}>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <a
                  href="#work"
                  className="group inline-flex items-center gap-2 rounded-full bg-fg px-6 py-3 text-sm font-semibold text-bg transition-transform hover:scale-[1.03]"
                >
                  See the work
                  <ArrowIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </a>
                <a
                  href="https://cadrian.com"
                  className="link-underline inline-flex items-center gap-2 px-2 py-3 text-sm font-semibold text-muted transition-colors hover:text-fg"
                >
                  Work with Cadrian
                </a>
              </div>
            </FadeIn>

            <FadeIn delay={0.32} y={36}>
              <div className="card-aurora mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border-line bg-line lg:grid-cols-4">
                {[
                  { value: "$5–8M", label: "Projected annual revenue impact" },
                  { value: "~50%", label: "Less research & strategy resourcing" },
                  { value: "5", label: "Production AI workflows shipped" },
                  { value: "14+", label: "Competitors benchmarked automatically" },
                ].map((stat, i) => (
                  <div key={i} className="bg-bg/40 px-6 py-8 backdrop-blur-sm">
                    <CountUpStat
                      value={stat.value}
                      className="font-mono text-3xl font-bold tracking-tight text-fg lg:text-4xl"
                    />
                    <p className="mt-2 text-sm leading-snug text-dim">{stat.label}</p>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </section>

        <section className="border-y border-line py-6">
          <p className="mb-5 text-center font-mono text-xs uppercase tracking-[0.22em] text-faint">
            Grounded in real data sources
          </p>
          <Marquee items={allTools} />
        </section>

        <section id="work" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-24 lg:py-32">
          <FadeIn>
            <div className="mb-14 flex items-end justify-between gap-6">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">
                  Selected work
                </p>
                <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
                  Two systems, in production
                </h2>
              </div>
              <span className="hidden font-mono text-sm text-faint sm:block">
                02 engagements
              </span>
            </div>
          </FadeIn>

          <div className="space-y-10">
            <ShowcaseCard
              index="01"
              cs={cgLife}
              visual={
                <Image
                  src="/images/cg-life/cg3.png"
                  alt="CG Life executives reviewing an AI-generated proposal"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  loading="eager"
                />
              }
            />
            <ShowcaseCard
              index="02"
              cs={givebutter}
              reverse
              visual={
                <Image
                  src="/images/givebutter/gb4.png"
                  alt="Givebutter volunteers reviewing a live fundraising dashboard at an event"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                />
              }
            />
          </div>
        </section>

        <ScrollStage />

        <section className="mx-auto max-w-6xl px-6 pb-12 pt-24 lg:pt-32">
          <FadeIn y={36}>
            <div className="card-aurora relative overflow-hidden rounded-3xl px-8 py-16 text-center lg:px-16 lg:py-20">
              <div className="bg-cs-glow absolute inset-0" />
              <div className="relative">
                <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                  Have a workflow worth automating?
                </h2>
                <p className="mx-auto mt-5 max-w-lg text-lg text-muted">
                  We design and ship custom multi-agent systems that move real
                  business metrics. Let&rsquo;s talk about yours.
                </p>
                <a
                  href="https://cadrian.com"
                  className="group mt-9 inline-flex items-center gap-2 rounded-full bg-fg px-7 py-3.5 text-sm font-semibold text-bg transition-transform hover:scale-[1.03]"
                >
                  Start a conversation
                  <ArrowIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </a>
              </div>
            </div>
          </FadeIn>
        </section>
      </main>
      <CadrianFooter />
    </div>
  );
}

function ShowcaseCard({
  index,
  cs,
  visual,
  reverse = false,
}: {
  index: string;
  cs: (typeof CASE_STUDIES)[number];
  visual: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <FadeIn y={40}>
      <Link href={caseStudyPath(cs.slug)} className="group block">
        <TiltCard max={4}>
          <div
            className="card-aurora grid overflow-hidden rounded-3xl lg:grid-cols-2 lg:[transform:translateZ(0)]"
            style={
              {
                "--csa": cs.accent,
                "--csa-ink": cs.accentInk,
              } as React.CSSProperties
            }
          >
            <div
              className={`relative min-h-[320px] overflow-hidden lg:min-h-[460px] ${
                reverse ? "lg:order-2" : ""
              }`}
            >
              {visual}
              <div className="showcase-visual-overlay absolute inset-0" />
            </div>

            <div
              className={`flex flex-col justify-center p-8 lg:p-14 ${
                reverse ? "lg:order-1" : ""
              }`}
            >
              <div className="mb-6 flex items-center gap-4">
                <span className="font-mono text-sm font-bold tabular-nums text-faint">
                  {index}
                </span>
                <span className="h-px w-8 bg-line-strong" />
                <span className="text-cs font-mono text-xs font-semibold uppercase tracking-[0.18em]">
                  {cs.industry}
                </span>
              </div>

              <h3 className="text-4xl font-bold tracking-tight sm:text-5xl">
                {cs.client}
              </h3>
              <p className="mt-4 max-w-sm leading-relaxed text-muted">
                {cs.tagline}
              </p>

              <div className="mt-10">
                <p className="text-cs font-mono text-5xl font-bold tracking-tight">
                  {cs.heroStat.value}
                </p>
                <p className="mt-1 text-sm text-dim">{cs.heroStat.label}</p>
              </div>

              <span className="text-cs mt-10 inline-flex items-center gap-2 text-sm font-semibold">
                Read case study
                <ArrowIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1.5" />
              </span>
            </div>
          </div>
        </TiltCard>
      </Link>
    </FadeIn>
  );
}
