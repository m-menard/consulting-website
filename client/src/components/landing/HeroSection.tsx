import { motion, useInView } from "framer-motion";
import { Check, ChevronDown, Phone } from "lucide-react";
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

const candidateCardData = [
  {
    typeKey: "landing.hero.cards.assessmentFor",
    roleKey: "landing.hero.cards.salesAssociate",
    image: "/images/hero/sales_associate.png",
  },
  {
    typeKey: "landing.hero.cards.trainingFor",
    roleKey: "landing.hero.cards.server",
    image: "/images/hero/server.png",
  },
  {
    typeKey: "landing.hero.cards.screeningFor",
    roleKey: "landing.hero.cards.practicalNurse",
    image: "/images/hero/nurse.png",
  },
  {
    typeKey: "landing.hero.cards.screeningFor",
    roleKey: "landing.hero.cards.retailSales",
    image: "/images/hero/retail_sales.png",
  },
];

const companyLogos = [
  { name: "RE MAX", className: "text-lg font-bold tracking-tight" },
  { name: "Claro", className: "text-xl font-semibold" },
  { name: "TOMORROWLAND", className: "text-sm font-light tracking-widest" },
  { name: "LIMITLESS", className: "text-base font-medium tracking-wide" },
  { name: "segware", className: "text-lg font-semibold" },
  { name: "wakefit", className: "text-lg font-medium italic" },
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
    return "/login";
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
              <StatsBadge value="10X" label={t('landing.hero.statsFasterScreening')} />
              <StatsBadge value="85%" label={t('landing.hero.statsTimeSaved')} />
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

      <div className="relative bg-gradient-to-b from-[#EFF5FF] via-[#C5DBFA] to-[#0B2D68] pt-4 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
          >
            {candidateCardData.map((card, i) => {
              const cardType = t(card.typeKey);
              const cardRole = t(card.roleKey);
              return (
              <motion.div
                key={card.roleKey}
                custom={i}
                variants={cardVariants}
                className="relative rounded-2xl overflow-hidden shadow-xl group cursor-default aspect-[3/4]"
                data-testid={`hero-card-${cardRole.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <img
                  src={card.image}
                  alt={`${cardType} ${cardRole}`}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#0B2D68]/60 via-transparent to-[#0B2D68]/30" />
                <div className="absolute top-0 left-0 right-0 p-4 md:p-5">
                  <p className="text-white/80 text-xs md:text-sm font-medium">{cardType}</p>
                  <p className="text-white text-base md:text-lg font-bold leading-tight">{cardRole}</p>
                </div>
                <div className="absolute bottom-3 left-3 md:bottom-4 md:left-4">
                  <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                    <Phone className="h-4 w-4 md:h-5 md:w-5 text-white" />
                  </div>
                </div>
              </motion.div>
              );
            })}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8, duration: 0.6 }}
          className="flex justify-center mt-10"
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
