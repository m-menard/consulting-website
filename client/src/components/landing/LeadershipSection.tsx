import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

interface LeaderCardProps {
  name: string;
  role: string;
  image: string;
  linkedinUrl: string;
  imageClassName?: string;
  index: number;
}

function LeaderCard({ name, role, image, linkedinUrl, imageClassName, index }: LeaderCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
      data-testid={`leadership-card-${name.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <a
        href={linkedinUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-4 block aspect-square w-full overflow-hidden rounded-xl bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176BD0] focus-visible:ring-offset-2"
        aria-label={`${name} on LinkedIn`}
        data-testid={`leadership-linkedin-${name.toLowerCase().replace(/\s+/g, "-")}`}
      >
        <img
          src={image}
          alt={name}
          className={`h-full w-full object-cover transition-transform duration-300 ${imageClassName ?? "scale-100 group-hover:scale-105"}`}
          loading="lazy"
        />
      </a>
      <h3 className="text-xl font-bold text-slate-900">{name}</h3>
      <p className="text-sm font-medium text-[#176BD0]">{role}</p>
    </motion.div>
  );
}

export function LeadershipSection() {
  const { t } = useTranslation();
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true });

  const leaders = [
    {
      name: t("landing.leadership.members.ceo.name"),
      role: t("landing.leadership.members.ceo.role"),
      linkedinUrl: t("landing.leadership.members.ceo.linkedin"),
      image: "/images/team/ceo.png",
      imageClassName: "scale-100 object-center group-hover:scale-105",
    },
    {
      name: t("landing.leadership.members.cto.name"),
      role: t("landing.leadership.members.cto.role"),
      linkedinUrl: t("landing.leadership.members.cto.linkedin"),
      image: "/images/team/cto.png",
      imageClassName: "scale-100 object-top group-hover:scale-105",
    },
    {
      name: t("landing.leadership.members.cpo.name"),
      role: t("landing.leadership.members.cpo.role"),
      linkedinUrl: t("landing.leadership.members.cpo.linkedin"),
      image: "/images/team/cpo.png",
      imageClassName: "scale-100 object-top group-hover:scale-105",
    },
  ];

  return (
    <section
      ref={sectionRef}
      className="bg-white py-16 sm:py-20 md:py-24"
      data-testid="leadership-section"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <span className="mb-4 inline-flex rounded-full border border-[#176BD0]/20 bg-[#EFF5FF] px-4 py-1 text-xs font-semibold tracking-wide text-[#176BD0]">
            {t("landing.leadership.badge")}
          </span>
          <h2 className="mb-3 text-3xl font-bold text-slate-900 sm:text-4xl md:text-5xl">
            {t("landing.leadership.title")}
          </h2>
          <p className="mx-auto max-w-3xl text-base text-slate-600 sm:text-lg">
            {t("landing.leadership.subtitle")}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {leaders.map((leader, index) => (
            <LeaderCard
              key={leader.name}
              name={leader.name}
              role={leader.role}
              linkedinUrl={leader.linkedinUrl}
              image={leader.image}
              imageClassName={leader.imageClassName}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default LeadershipSection;
