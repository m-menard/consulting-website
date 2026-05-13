import { motion, useInView } from "framer-motion";
import { Building2, GraduationCap, Car, Headphones, ShoppingCart, Heart } from "lucide-react";
import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";

interface UseCaseCardProps {
  icon: React.ReactNode;
  flag: string;
  title: string;
  description: string;
  industry: string;
  language: string;
  functionLabel: string;
  isActive: boolean;
  onClick: () => void;
  index: number;
  useCaseLabel: string;
  industryLabel: string;
  languageLabel: string;
  functionLabelText: string;
}

const UseCaseCard = ({ 
  icon, 
  flag, 
  title, 
  description, 
  industry, 
  language, 
  functionLabel,
  isActive,
  onClick,
  index,
  useCaseLabel,
  industryLabel,
  languageLabel,
  functionLabelText
}: UseCaseCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay: index * 0.1 }}
    onClick={onClick}
    className={`bg-white rounded-xl border p-6 cursor-pointer transition-all duration-300 ${
      isActive 
        ? 'border-[#176BD0] shadow-md shadow-[#176BD0]/10' 
        : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
    }`}
    data-testid={`use-case-card-${title.toLowerCase().replace(/\s+/g, "-").slice(0, 20)}`}
  >
    <div className="flex items-center gap-2 mb-4">
      <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{useCaseLabel}</span>
    </div>
    
    <h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
      {title} <span>{flag}</span>
    </h3>
    
    <p className="text-sm text-slate-500 mb-6">{description}</p>
    
    <div className="grid grid-cols-3 gap-4 text-xs">
      <div>
        <div className="text-slate-400 mb-1">{industryLabel}</div>
        <div className="font-medium text-slate-800">{industry}</div>
      </div>
      <div>
        <div className="text-slate-400 mb-1">{languageLabel}</div>
        <div className="font-medium text-slate-800">{language}</div>
      </div>
      <div>
        <div className="text-slate-400 mb-1">{functionLabelText}</div>
        <div className="font-medium text-slate-800">{functionLabel}</div>
      </div>
    </div>
  </motion.div>
);

export function UseCasesSection() {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  const useCases = [
    {
      icon: <Building2 />,
      flag: "US",
      title: t('landing.useCases.items.techStartups.title'),
      description: t('landing.useCases.items.techStartups.description'),
      industry: t('landing.useCases.items.techStartups.industry'),
      language: t('landing.useCases.items.techStartups.language'),
      functionLabel: t('landing.useCases.items.techStartups.function'),
    },
    {
      icon: <GraduationCap />,
      flag: "SG",
      title: t('landing.useCases.items.universities.title'),
      description: t('landing.useCases.items.universities.description'),
      industry: t('landing.useCases.items.universities.industry'),
      language: t('landing.useCases.items.universities.language'),
      functionLabel: t('landing.useCases.items.universities.function'),
    },
    {
      icon: <Car />,
      flag: "BR",
      title: t('landing.useCases.items.automotive.title'),
      description: t('landing.useCases.items.automotive.description'),
      industry: t('landing.useCases.items.automotive.industry'),
      language: t('landing.useCases.items.automotive.language'),
      functionLabel: t('landing.useCases.items.automotive.function'),
    },
    {
      icon: <Headphones />,
      flag: "IN",
      title: t('landing.useCases.items.bpo.title'),
      description: t('landing.useCases.items.bpo.description'),
      industry: t('landing.useCases.items.bpo.industry'),
      language: t('landing.useCases.items.bpo.language'),
      functionLabel: t('landing.useCases.items.bpo.function'),
    },
    {
      icon: <ShoppingCart />,
      flag: "UK",
      title: t('landing.useCases.items.retail.title'),
      description: t('landing.useCases.items.retail.description'),
      industry: t('landing.useCases.items.retail.industry'),
      language: t('landing.useCases.items.retail.language'),
      functionLabel: t('landing.useCases.items.retail.function'),
    },
    {
      icon: <Heart />,
      flag: "DE",
      title: t('landing.useCases.items.healthcare.title'),
      description: t('landing.useCases.items.healthcare.description'),
      industry: t('landing.useCases.items.healthcare.industry'),
      language: t('landing.useCases.items.healthcare.language'),
      functionLabel: t('landing.useCases.items.healthcare.function'),
    }
  ];

  return (
    <section 
      ref={ref}
      className="py-20 md:py-32 bg-white" 
      data-testid="use-cases-section"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
            {t('landing.useCases.title')}
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            {t('landing.useCases.subtitle')}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {useCases.map((useCase, index) => (
            <UseCaseCard
              key={index}
              icon={useCase.icon}
              flag={useCase.flag}
              title={useCase.title}
              description={useCase.description}
              industry={useCase.industry}
              language={useCase.language}
              functionLabel={useCase.functionLabel}
              isActive={activeIndex === index}
              onClick={() => setActiveIndex(index)}
              index={index}
              useCaseLabel={t('landing.useCases.labels.useCase')}
              industryLabel={t('landing.useCases.labels.industry')}
              languageLabel={t('landing.useCases.labels.language')}
              functionLabelText={t('landing.useCases.labels.function')}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default UseCasesSection;
