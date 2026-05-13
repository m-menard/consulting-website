import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.4, 0.25, 1],
    },
  },
};

export function CTASection() {
  const [, setLocation] = useLocation();
  const shouldReduceMotion = useReducedMotion();
  const { t } = useTranslation();

  const handleNavigate = () => {
    setLocation("/login");
  };

  return (
    <section
      className="py-12 sm:py-16 md:py-24 lg:py-32 relative overflow-hidden"
      data-testid="cta-section"
    >
      <div 
        className="absolute inset-0"
        style={{
          background: "linear-gradient(135deg, #176BD0 0%, #1E40AF 100%)",
        }}
        data-testid="cta-background"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <motion.div
          variants={shouldReduceMotion ? {} : containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="space-y-8"
        >
          <motion.h2
            variants={shouldReduceMotion ? {} : itemVariants}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white"
            data-testid="cta-headline"
          >
            {t('landing.cta.title')}
          </motion.h2>

          <motion.p
            variants={shouldReduceMotion ? {} : itemVariants}
            className="text-sm sm:text-base md:text-lg text-white/90 max-w-2xl mx-auto"
            data-testid="cta-subheadline"
          >
            {t('landing.cta.description')}
          </motion.p>

          <motion.div
            variants={shouldReduceMotion ? {} : itemVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4"
          >
            <Button
              size="lg"
              className="h-14 px-8 text-lg bg-white text-[#176BD0] font-semibold border-0 shadow-lg group"
              onClick={handleNavigate}
              data-testid="button-cta-get-started"
            >
              {t('landing.cta.button')}
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" />
            </Button>
          </motion.div>

          <motion.p
            variants={shouldReduceMotion ? {} : itemVariants}
            className="text-white/80 text-sm"
            data-testid="cta-trust-message"
          >
            {t('landing.cta.trustMessage')}
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}

export default CTASection;
