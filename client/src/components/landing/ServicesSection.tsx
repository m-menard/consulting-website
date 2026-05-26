import { motion, useInView } from "framer-motion";
import { Bot, CheckCircle2, LineChart, Server, Settings2 } from "lucide-react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

interface ServiceCardProps {
  title: string;
  description: string;
  bestFor: string;
  outcomes: string[];
  icon: React.ReactNode;
  badge: string;
  gradient: string;
  delay: number;
}

const ServiceCard = ({
  title,
  description,
  bestFor,
  outcomes,
  icon,
  badge,
  gradient,
  delay,
}: ServiceCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
    data-testid={`service-card-${title.toLowerCase().replace(/\s+/g, "-")}`}
  >
    <div className={`h-1.5 w-full ${gradient}`} />
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#EFF5FF] text-[#176BD0]">
          {icon}
        </div>
        <span className="rounded-full border border-[#176BD0]/20 bg-[#EFF5FF] px-3 py-1 text-xs font-medium text-[#176BD0]">
          {badge}
        </span>
      </div>

      <h3 className="mb-2 text-xl font-bold text-slate-900">{title}</h3>
      <p className="mb-5 text-sm leading-relaxed text-slate-600">{description}</p>

      <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
        <p className="text-xs uppercase tracking-wide text-slate-500">Best for</p>
        <p className="text-sm font-medium text-slate-800">{bestFor}</p>
      </div>

      <ul className="space-y-2">
        {outcomes.map((outcome) => (
          <li key={outcome} className="flex items-start gap-2 text-sm text-slate-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#176BD0]" />
            <span>{outcome}</span>
          </li>
        ))}
      </ul>
    </div>
  </motion.div>
);

export function ServicesSection() {
  const { t } = useTranslation();
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true });

  const services = [
    {
      title: t("landing.services.cards.workflowAutomation.title"),
      description: t("landing.services.cards.workflowAutomation.description"),
      bestFor: t("landing.services.cards.workflowAutomation.bestFor"),
      outcomes: [
        t("landing.services.cards.workflowAutomation.outcomes.0"),
        t("landing.services.cards.workflowAutomation.outcomes.1"),
        t("landing.services.cards.workflowAutomation.outcomes.2"),
      ],
      badge: t("landing.services.cards.workflowAutomation.badge"),
      gradient: "bg-gradient-to-r from-sky-500 to-blue-600",
      icon: <Settings2 className="h-6 w-6" />,
    },
    {
      title: t("landing.services.cards.aiAgents.title"),
      description: t("landing.services.cards.aiAgents.description"),
      bestFor: t("landing.services.cards.aiAgents.bestFor"),
      outcomes: [
        t("landing.services.cards.aiAgents.outcomes.0"),
        t("landing.services.cards.aiAgents.outcomes.1"),
        t("landing.services.cards.aiAgents.outcomes.2"),
      ],
      badge: t("landing.services.cards.aiAgents.badge"),
      gradient: "bg-gradient-to-r from-indigo-500 to-violet-600",
      icon: <Bot className="h-6 w-6" />,
    },
    {
      title: t("landing.services.cards.appliedML.title"),
      description: t("landing.services.cards.appliedML.description"),
      bestFor: t("landing.services.cards.appliedML.bestFor"),
      outcomes: [
        t("landing.services.cards.appliedML.outcomes.0"),
        t("landing.services.cards.appliedML.outcomes.1"),
        t("landing.services.cards.appliedML.outcomes.2"),
      ],
      badge: t("landing.services.cards.appliedML.badge"),
      gradient: "bg-gradient-to-r from-emerald-500 to-teal-600",
      icon: <LineChart className="h-6 w-6" />,
    },
    {
      title: t("landing.services.cards.aiInfrastructure.title"),
      description: t("landing.services.cards.aiInfrastructure.description"),
      bestFor: t("landing.services.cards.aiInfrastructure.bestFor"),
      outcomes: [
        t("landing.services.cards.aiInfrastructure.outcomes.0"),
        t("landing.services.cards.aiInfrastructure.outcomes.1"),
        t("landing.services.cards.aiInfrastructure.outcomes.2"),
      ],
      badge: t("landing.services.cards.aiInfrastructure.badge"),
      gradient: "bg-gradient-to-r from-amber-500 to-orange-600",
      icon: <Server className="h-6 w-6" />,
    },
  ];

  return (
    <section
      ref={sectionRef}
      className="bg-gradient-to-b from-white to-[#F8FBFF] py-16 sm:py-20 md:py-24"
      data-testid="services-section"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <span className="mb-4 inline-flex rounded-full border border-[#176BD0]/20 bg-[#EFF5FF] px-4 py-1 text-xs font-semibold tracking-wide text-[#176BD0]">
            {t("landing.services.badge")}
          </span>
          <h2 className="mb-3 text-3xl font-bold text-slate-900 sm:text-4xl md:text-5xl">
            {t("landing.services.title")}
          </h2>
          <p className="mx-auto max-w-3xl text-base text-slate-600 sm:text-lg">
            {t("landing.services.subtitle")}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-8 grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3 sm:p-5"
        >
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">{t("landing.services.stats.deliveryLabel")}</p>
            <p className="text-xl font-bold text-slate-900">{t("landing.services.stats.deliveryValue")}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">{t("landing.services.stats.impactLabel")}</p>
            <p className="text-xl font-bold text-slate-900">{t("landing.services.stats.impactValue")}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">{t("landing.services.stats.modelLabel")}</p>
            <p className="text-xl font-bold text-slate-900">{t("landing.services.stats.modelValue")}</p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {services.map((service, index) => (
            <ServiceCard
              key={service.title}
              title={service.title}
              description={service.description}
              bestFor={service.bestFor}
              outcomes={service.outcomes}
              icon={service.icon}
              badge={service.badge}
              gradient={service.gradient}
              delay={index * 0.08}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default ServicesSection;
