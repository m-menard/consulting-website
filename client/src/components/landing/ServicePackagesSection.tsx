import { motion, useInView } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

interface PackageCardProps {
  name: string;
  price: string;
  timeline: string;
  features: string[];
  bestForLabel: string;
  popularLabel: string;
  highlighted?: boolean;
  index: number;
}

function PackageCard({
  name,
  price,
  timeline,
  features,
  bestForLabel,
  popularLabel,
  highlighted = false,
  index,
}: PackageCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className={`relative rounded-2xl border p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg ${
        highlighted
          ? "border-[#176BD0]/40 bg-blue-50/40"
          : "border-slate-200 bg-white"
      }`}
      data-testid={`service-package-card-${name.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {highlighted && (
        <span className="absolute -top-3 right-6 inline-flex items-center gap-1 rounded-full bg-[#176BD0] px-3 py-1 text-xs font-semibold text-white">
          <Sparkles className="h-3.5 w-3.5" />
          {popularLabel}
        </span>
      )}

      <p className="text-sm font-semibold uppercase tracking-wide text-[#176BD0]">{name}</p>
      <p className="mt-3 text-3xl font-bold text-slate-900">{price}</p>
      <p className="mt-1 text-sm text-slate-500">{timeline}</p>

      <ul className="mt-5 space-y-2">
        <li className="pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {bestForLabel}
        </li>
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#176BD0]" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

export function ServicePackagesSection() {
  const { t } = useTranslation();
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true });

  const packages = [
    {
      name: t("landing.servicePackages.items.mvp.name"),
      price: t("landing.servicePackages.items.mvp.price"),
      timeline: t("landing.servicePackages.items.mvp.timeline"),
      features: [
        t("landing.servicePackages.items.mvp.features.0"),
        t("landing.servicePackages.items.mvp.features.1"),
        t("landing.servicePackages.items.mvp.features.2"),
      ],
    },
    {
      name: t("landing.servicePackages.items.projectDelivery.name"),
      price: t("landing.servicePackages.items.projectDelivery.price"),
      timeline: t("landing.servicePackages.items.projectDelivery.timeline"),
      features: [
        t("landing.servicePackages.items.projectDelivery.features.0"),
        t("landing.servicePackages.items.projectDelivery.features.1"),
        t("landing.servicePackages.items.projectDelivery.features.2"),
      ],
      highlighted: true,
    },
    {
      name: t("landing.servicePackages.items.ongoingSupport.name"),
      price: t("landing.servicePackages.items.ongoingSupport.price"),
      timeline: t("landing.servicePackages.items.ongoingSupport.timeline"),
      features: [
        t("landing.servicePackages.items.ongoingSupport.features.0"),
        t("landing.servicePackages.items.ongoingSupport.features.1"),
        t("landing.servicePackages.items.ongoingSupport.features.2"),
      ],
    },
  ];

  return (
    <section
      ref={sectionRef}
      className="bg-[#F8FBFF] py-16 sm:py-20 md:py-24"
      data-testid="service-packages-section"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <span className="mb-4 inline-flex rounded-full border border-[#176BD0]/20 bg-[#EFF5FF] px-4 py-1 text-xs font-semibold tracking-wide text-[#176BD0]">
            {t("landing.servicePackages.badge")}
          </span>
          <h2 className="mb-3 text-3xl font-bold text-slate-900 sm:text-4xl md:text-5xl">
            {t("landing.servicePackages.title")}
          </h2>
          <p className="mx-auto max-w-3xl text-base text-slate-600 sm:text-lg">
            {t("landing.servicePackages.subtitle")}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {packages.map((pkg, index) => (
            <PackageCard
              key={pkg.name}
              name={pkg.name}
              price={pkg.price}
              timeline={pkg.timeline}
              features={pkg.features}
              bestForLabel={t("landing.servicePackages.bestForLabel")}
              popularLabel={t("landing.servicePackages.popularLabel")}
              highlighted={pkg.highlighted}
              index={index}
            />
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-4xl text-center text-sm text-slate-500">
          {t("landing.servicePackages.finalNote")}
        </p>
      </div>
    </section>
  );
}

export default ServicePackagesSection;
