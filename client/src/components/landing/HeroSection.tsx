import { motion, useInView } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, useState, useEffect } from "react";
import { Link } from "wouter";
import { AuthStorage } from "@/lib/auth-storage";
import { useTranslation } from 'react-i18next';

const TypingWord = ({ words }: { words: string[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentWord = words[currentIndex];
    const typingSpeed = isDeleting ? 50 : 100;
    const pauseDuration = 2000;

    if (!isDeleting && displayText === currentWord) {
      const timeout = setTimeout(() => setIsDeleting(true), pauseDuration);
      return () => clearTimeout(timeout);
    }

    if (isDeleting && displayText === "") {
      setIsDeleting(false);
      setCurrentIndex((prev) => (prev + 1) % words.length);
      return;
    }

    const timeout = setTimeout(() => {
      if (isDeleting) {
        setDisplayText(currentWord.slice(0, displayText.length - 1));
      } else {
        setDisplayText(currentWord.slice(0, displayText.length + 1));
      }
    }, typingSpeed);

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, currentIndex, words]);

  return (
    <span className="inline-block min-w-[200px] text-left">
      <span className="text-[#176BD0]">
        {displayText}
      </span>
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
        className="inline-block w-[3px] h-[0.9em] bg-[#176BD0] ml-1 align-middle"
      />
    </span>
  );
};

const StatsBadge = ({ value, label }: { value: string; label: string }) => (
  <div 
    className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-white border border-slate-200 shadow-sm"
    data-testid={`stats-badge-${label.toLowerCase().replace(/\s+/g, "-")}`}
  >
    <span className="text-lg font-bold text-[#176BD0]">{value}</span>
    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span>
  </div>
);

const TrustBadge = ({ text }: { text: string }) => (
  <div className="flex items-center gap-2 text-sm text-slate-600">
    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
      <Check className="h-3 w-3 text-emerald-600" />
    </div>
    <span>{text}</span>
  </div>
);

const architectureItems = [
  {
    titleKey: "landing.hero.architecture.items.userInput.title",
    descriptionKey: "landing.hero.architecture.items.userInput.description",
    shortDescriptionKey: "landing.hero.architecture.items.userInput.shortDescription",
    image: "/images/architecture/user-input.png",
  },
  {
    titleKey: "landing.hero.architecture.items.orchestration.title",
    descriptionKey: "landing.hero.architecture.items.orchestration.description",
    shortDescriptionKey: "landing.hero.architecture.items.orchestration.shortDescription",
    image: "/images/architecture/orchestration.png",
  },
  {
    titleKey: "landing.hero.architecture.items.businessOutput.title",
    descriptionKey: "landing.hero.architecture.items.businessOutput.description",
    shortDescriptionKey: "landing.hero.architecture.items.businessOutput.shortDescription",
    image: "/images/architecture/business-output.png",
  },
  {
    titleKey: "landing.hero.architecture.items.intelligenceLayer.title",
    descriptionKey: "landing.hero.architecture.items.intelligenceLayer.description",
    shortDescriptionKey: "landing.hero.architecture.items.intelligenceLayer.shortDescription",
    image: "/images/architecture/intelligence-layer.png",
  },
];

const companyLogos = [
  { name: "Linear", className: "text-lg font-bold tracking-tight" },
  { name: "Triple Whale", className: "text-xl font-semibold" },
  { name: "Simple Practice", className: "text-sm font-light tracking-widest" },
  { name: "Avesha", className: "text-base font-medium tracking-wide" },
  { name: "Machinify", className: "text-lg font-semibold" },
  { name: "TomoCredit", className: "text-lg font-medium italic" },
  { name: "AVENTIS", className: "text-base font-semibold tracking-wide" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.4, 0.25, 1],
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      delay: 0.8 + i * 0.15,
      ease: [0.25, 0.4, 0.25, 1],
    },
  }),
};

export function HeroSection() {
  const { t } = useTranslation();
  const isAuthenticated = AuthStorage.isAuthenticated();
  const isAdmin = AuthStorage.isAdmin();
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true });

  const rotatingWords = [
    t('landing.hero.rotatingWords.screening'),
    t('landing.hero.rotatingWords.interviewing'),
    t('landing.hero.rotatingWords.hiring'),
    t('landing.hero.rotatingWords.onboarding'),
  ];

  const handleScrollDown = () => {
    window.scrollTo({
      top: window.innerHeight - 80,
      behavior: "smooth",
    });
  };

  const getDashboardLink = () => {
    if (isAuthenticated) {
      return isAdmin ? "/admin" : "/app";
    }
    return "/intake";
  };

  return (
    <section
      ref={sectionRef}
      className="relative flex flex-col overflow-hidden"
      data-testid="hero-section"
    >
      <div className="bg-gradient-to-b from-white via-white to-[#EFF5FF] pt-28 pb-16 text-center">
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="space-y-8"
          >
            <motion.div variants={itemVariants} className="flex justify-center">
              <span className="text-sm font-medium text-[#176BD0] tracking-wide uppercase">
                {t('landing.hero.badge')}
              </span>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] text-slate-900"
              data-testid="hero-headline"
            >
              {t('landing.hero.headline')}
              <br />
              <TypingWord words={rotatingWords} />
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed"
              data-testid="hero-subheadline"
            >
              {t('landing.hero.subheadlinePart1')}{" "}
              <span className="font-semibold text-slate-900">{t('landing.hero.subheadlineBold')}</span>
              {t('landing.hero.subheadlinePart2')}
            </motion.p>

            <motion.div 
              variants={itemVariants}
              className="flex flex-wrap justify-center gap-3 pt-2"
            >
              <StatsBadge value="3X" label={t('landing.hero.statsFasterScreening')} />
              <StatsBadge value="40%" label={t('landing.hero.statsTimeSaved')} />
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="flex justify-center items-center pt-4"
            >
              <Link href={getDashboardLink()}>
                <Button
                  size="lg"
                  className="h-14 px-10 text-base font-semibold bg-[#176BD0] hover:bg-[#1259B0] text-white border-0 rounded-full shadow-lg shadow-blue-500/20 transition-all duration-300 hover:shadow-blue-500/30"
                  data-testid="button-hero-get-started"
                >
                  {t('landing.hero.getStarted')}
                </Button>
              </Link>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 pt-2"
              data-testid="hero-trust-badges"
            >
              <TrustBadge text={t('landing.hero.trustFreeTrial')} />
              <TrustBadge text={t('landing.hero.trustNoCreditCard')} />
            </motion.div>
          </motion.div>
        </div>
      </div>

      <div className="relative bg-gradient-to-b from-[#EFF5FF] via-[#C5DBFA] to-[#0B2D68] pt-3 sm:pt-4 pb-14 sm:pb-18">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="mx-auto max-w-5xl"
          >
            <motion.div
              variants={cardVariants}
              custom={0}
              className="rounded-2xl sm:rounded-3xl border border-white/20 bg-[#0B2D68]/50 p-4 sm:p-5 md:p-6 shadow-2xl backdrop-blur-sm"
              data-testid="hero-architecture-panel"
            >
              <div className="mb-5 sm:mb-6 text-center">
                <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 sm:px-4 py-1 text-[10px] sm:text-xs font-medium uppercase tracking-wide text-white/80">
                  {t("landing.hero.architecture.badge")}
                </span>
                <h3 className="mt-3 sm:mt-4 text-xl sm:text-2xl md:text-3xl font-bold text-white leading-tight">
                  {t("landing.hero.architecture.title")}
                </h3>
                <p className="mx-auto mt-3 sm:mt-4 max-w-3xl text-xs sm:text-sm md:text-lg leading-relaxed text-blue-100/90">
                  {t("landing.hero.architecture.description")}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:gap-3.5 md:grid-cols-2">
                {architectureItems.map((item, i) => (
                  <motion.div
                    key={item.titleKey}
                    custom={i}
                    variants={cardVariants}
                    className="rounded-xl sm:rounded-2xl border border-white/15 bg-white/5 p-3 sm:p-3.5 md:p-4 text-left"
                    data-testid={`hero-architecture-item-${i}`}
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <span className="inline-flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-white/10 shrink-0">
                        <img
                          src={item.image}
                          alt={t(item.titleKey)}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </span>
                      <div className="min-w-0">
                        <p className="text-base sm:text-lg font-semibold text-white leading-snug">{t(item.titleKey)}</p>
                        <p className="mt-1 text-xs sm:text-sm text-blue-100/85 leading-snug">{t(item.descriptionKey)}</p>
                        <p className="mt-1 text-[11px] sm:text-xs text-blue-100/65 leading-snug">{t(item.shortDescriptionKey)}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8, duration: 0.6 }}
          className="flex justify-center mt-6 sm:mt-10"
        >
          <button
            onClick={handleScrollDown}
            className="group focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full p-2"
            aria-label="Scroll down"
            data-testid="button-scroll-indicator"
          >
            <ChevronDown className="h-6 w-6 text-white/60 animate-bounce group-hover:text-white transition-colors" />
          </button>
        </motion.div>
      </div>

      <div className="relative z-10 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-8 md:gap-12 lg:gap-16"
          >
            {companyLogos.map((logo) => (
              <div 
                key={logo.name}
                className={`text-slate-400 hover:text-slate-600 transition-colors cursor-default ${logo.className}`}
                data-testid={`logo-${logo.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {logo.name}
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
