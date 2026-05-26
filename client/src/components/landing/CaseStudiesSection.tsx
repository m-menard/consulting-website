import { motion, useInView } from "framer-motion";
import { ArrowUpRight, Building2, TrendingUp } from "lucide-react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

interface CaseStudyCardProps {
  title: string;
  description: string;
  impact1: string;
  impact2: string;
  impactLabel: string;
  index: number;
}

function CaseStudyCard({ title, description, impact1, impact2, impactLabel, index }: CaseStudyCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
      data-testid={`case-study-card-${index}`}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFF5FF] text-[#176BD0]">
          <Building2 className="h-5 w-5" />
        </span>
        <ArrowUpRight className="h-4 w-4 text-slate-400 transition-colors group-hover:text-[#176BD0]" />
      </div>

      <h3 className="mb-3 text-xl font-bold text-slate-900">"{title}"</h3>
      <p className="mb-5 text-sm leading-relaxed text-slate-600">{description}</p>

      <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{impactLabel}</p>
        <div className="flex items-start gap-2 text-sm text-slate-800">
          <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-[#176BD0]" />
          <span>{impact1}</span>
        </div>
        <div className="flex items-start gap-2 text-sm text-slate-800">
          <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-[#176BD0]" />
          <span>{impact2}</span>
        </div>
      </div>
    </motion.div>
  );
}

export function CaseStudiesSection() {
  const { t } = useTranslation();
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true });

  const caseStudies = [
    {
      title: t("landing.caseStudies.items.machinify.title"),
      description: t("landing.caseStudies.items.machinify.description"),
      impact1: t("landing.caseStudies.items.machinify.impact1"),
      impact2: t("landing.caseStudies.items.machinify.impact2"),
    },
    {
      title: t("landing.caseStudies.items.tripleWhale.title"),
      description: t("landing.caseStudies.items.tripleWhale.description"),
      impact1: t("landing.caseStudies.items.tripleWhale.impact1"),
      impact2: t("landing.caseStudies.items.tripleWhale.impact2"),
    },
    {
      title: t("landing.caseStudies.items.tomoCredit.title"),
      description: t("landing.caseStudies.items.tomoCredit.description"),
      impact1: t("landing.caseStudies.items.tomoCredit.impact1"),
      impact2: t("landing.caseStudies.items.tomoCredit.impact2"),
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {caseStudies.map((study, index) => (
            <CaseStudyCard
              key={study.title}
              title={study.title}
              description={study.description}
              impact1={study.impact1}
              impact2={study.impact2}
              impactLabel={t("landing.caseStudies.impactLabel")}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default CaseStudiesSection;
