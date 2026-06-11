import { motion, useInView } from "framer-motion";
import { ArrowUpRight, TrendingUp } from "lucide-react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";

interface CaseStudyCardProps {
  client: string;
  industry: string;
  title: string;
  description: string;
  impact1: string;
  impact2: string;
  impactLabel: string;
  image: string;
  accent: string;
  accentLight: string;
  index: number;
  href: string;
}

function CaseStudyCard({
  client,
  industry,
  title,
  description,
  impact1,
  impact2,
  impactLabel,
  image,
  accent,
  accentLight,
  index,
  href,
}: CaseStudyCardProps) {
  return (
    <Link href={href} className="group block h-full">
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        className="flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
        data-testid={`case-study-card-${index}`}
      >
        <div className="relative h-52 overflow-hidden sm:h-56">
          <img
            src={image}
            alt=""
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
            <div className="min-h-[3.25rem]">
              <p className="text-lg font-bold leading-tight text-white">{client}</p>
              <p className="mt-0.5 min-h-[2.5rem] text-sm leading-snug text-white/75">{industry}</p>
            </div>
            <span
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors group-hover:bg-white/25"
              style={{ color: "white" }}
            >
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col p-6 sm:p-7">
          <span
            className="mb-4 inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide"
            style={{
              borderColor: `${accent}33`,
              backgroundColor: accentLight,
              color: accent,
            }}
          >
            Case Study
          </span>

          <h3 className="mb-3 min-h-[5.25rem] line-clamp-3 text-xl font-bold leading-snug text-slate-900 sm:text-[1.35rem]">
            {title}
          </h3>
          <p className="mb-6 min-h-[7.875rem] line-clamp-5 text-sm leading-relaxed text-slate-600 sm:text-[0.9375rem]">
            {description}
          </p>

          <div
            className="mt-auto min-h-[8.25rem] space-y-2.5 rounded-xl border p-4"
            style={{ borderColor: `${accent}22`, backgroundColor: accentLight }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {impactLabel}
            </p>
            <div className="flex min-h-[2.75rem] items-start gap-2 text-sm leading-snug text-slate-800">
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0" style={{ color: accent }} />
              <span>{impact1}</span>
            </div>
            <div className="flex min-h-[2.75rem] items-start gap-2 text-sm leading-snug text-slate-800">
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0" style={{ color: accent }} />
              <span>{impact2}</span>
            </div>
          </div>
        </div>
      </motion.article>
    </Link>
  );
}

export function CaseStudiesSection() {
  const { t } = useTranslation();
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true });

  const caseStudies = [
    {
      client: "CG Life",
      industry: "Life Sciences",
      title: t("landing.caseStudies.items.cgLife.title"),
      description: t("landing.caseStudies.items.cgLife.description"),
      impact1: t("landing.caseStudies.items.cgLife.impact1"),
      impact2: t("landing.caseStudies.items.cgLife.impact2"),
      image: "/images/cg-life/cg3.png",
      accent: "#4f46e5",
      accentLight: "#eef2ff",
      href: "/case-studies/cg-life",
    },
    {
      client: "Givebutter",
      industry: "Nonprofit Technology",
      title: t("landing.caseStudies.items.givebutter.title"),
      description: t("landing.caseStudies.items.givebutter.description"),
      impact1: t("landing.caseStudies.items.givebutter.impact1"),
      impact2: t("landing.caseStudies.items.givebutter.impact2"),
      image: "/images/givebutter/gb4.png",
      accent: "#b45309",
      accentLight: "#fffbeb",
      href: "/case-studies/givebutter",
    },
  ];

  return (
    <section
      ref={sectionRef}
      className="bg-white py-16 sm:py-20 md:py-24"
      data-testid="case-studies-section"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <span className="mb-4 inline-flex rounded-full border border-[#176BD0]/20 bg-[#EFF5FF] px-4 py-1 text-xs font-semibold tracking-wide text-[#176BD0]">
            {t("landing.caseStudies.badge")}
          </span>
          <h2 className="mb-3 text-3xl font-bold text-slate-900 sm:text-4xl md:text-5xl">
            {t("landing.caseStudies.title")}
          </h2>
          <p className="mx-auto max-w-3xl text-base text-slate-600 sm:text-lg">
            {t("landing.caseStudies.subtitle")}
          </p>
        </motion.div>

        <div className="mx-auto grid max-w-5xl grid-cols-1 items-stretch gap-8 md:grid-cols-2">
          {caseStudies.map((study, index) => (
            <CaseStudyCard
              key={study.href}
              client={study.client}
              industry={study.industry}
              title={study.title}
              description={study.description}
              impact1={study.impact1}
              impact2={study.impact2}
              impactLabel={t("landing.caseStudies.impactLabel")}
              image={study.image}
              accent={study.accent}
              accentLight={study.accentLight}
              index={index}
              href={study.href}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default CaseStudiesSection;
