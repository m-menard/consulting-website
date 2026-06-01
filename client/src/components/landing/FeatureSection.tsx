import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { Check, FileText, Mic, GitBranch, User, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

const CapabilityBadge = ({ text, delay }: { text: string; delay: number }) => (
  <motion.div 
    className="flex items-center gap-1.5"
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.5 }}
  >
    <div className="w-4 h-4 rounded-full bg-[#176BD0]/15 flex items-center justify-center">
      <div className="w-1.5 h-1.5 rounded-full bg-[#176BD0]" />
    </div>
    <span className="text-slate-600 font-medium text-sm">{text}</span>
  </motion.div>
);

const ConnectingLine = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });
  
  const pathLength = useTransform(scrollYProgress, [0, 0.5], [0, 1]);
  
  return (
    <div ref={ref} className="flex justify-center py-8">
      <svg 
        width="4" 
        height="120" 
        viewBox="0 0 4 120" 
        fill="none" 
        className="overflow-visible"
      >
        <motion.path
          d="M2 0 Q2 30 2 60 Q2 90 2 120"
          stroke="url(#connectingGradientLight)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          style={{ pathLength }}
        />
        <defs>
          <linearGradient id="connectingGradientLight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="#93C5FD" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

const CVScreeningVisual = () => {
  const { t } = useTranslation();
  return (
    <div className="relative flex justify-center">
      <div className="bg-white rounded-2xl border border-blue-100 p-6 space-y-4 shadow-sm w-full max-w-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#EFF5FF] flex items-center justify-center">
            <FileText className="w-5 h-5 text-[#176BD0]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{t('landing.featureSection.mockup.language')}</p>
            <p className="text-xs text-slate-400">{t('landing.featureSection.mockup.filesUploaded')}</p>
          </div>
        </div>
        <div className="space-y-3">
          {[
            { name: "Sarah Chen", score: 92, width: "w-[92%]" },
            { name: "James Wilson", score: 85, width: "w-[85%]" },
            { name: "Maria Lopez", score: 78, width: "w-[78%]" },
          ].map((candidate, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700 font-medium">{candidate.name}</span>
                <span className="text-sm font-semibold text-[#176BD0]">{candidate.score}%</span>
              </div>
              <div className="h-1.5 bg-blue-50 rounded-full">
                <div className={`${candidate.width} h-full bg-[#176BD0] rounded-full`} />
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-2">
          <Check className="w-4 h-4 text-green-500" />
          <span className="text-xs text-slate-500">{t('landing.featureSection.mockup.autoShortlisted')}</span>
        </div>
      </div>
    </div>
  );
};

const VoiceInterviewVisual = () => {
  const { t } = useTranslation();
  return (
    <div className="relative flex justify-center">
      <div className="bg-white rounded-2xl border border-blue-100 p-6 space-y-4 shadow-sm w-full max-w-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#EFF5FF] flex items-center justify-center">
            <Mic className="w-5 h-5 text-[#176BD0]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{t('landing.featureSection.mockup.voice')}</p>
            <p className="text-xs text-slate-400">{t('landing.featureSection.mockup.inProgress')}</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-start gap-3 px-3 py-2.5 bg-[#EFF5FF] rounded-xl">
            <div className="w-6 h-6 rounded-full bg-[#176BD0] flex items-center justify-center shrink-0 mt-0.5">
              <Mic className="w-3 h-3 text-white" />
            </div>
            <p className="text-sm text-slate-700">{t('landing.featureSection.mockup.aiQuestion')}</p>
          </div>
          <div className="flex items-start gap-3 px-3 py-2.5 bg-slate-50 rounded-xl">
            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mt-0.5">
              <User className="w-3 h-3 text-slate-500" />
            </div>
            <p className="text-sm text-slate-600">{t('landing.featureSection.mockup.candidateAnswer')}</p>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-400">{t('landing.featureSection.mockup.duration')}</span>
          <span className="text-xs font-medium text-[#176BD0]">{t('landing.featureSection.mockup.score')}</span>
        </div>
      </div>
    </div>
  );
};

const PipelineVisual = () => {
  const { t } = useTranslation();
  return (
    <div className="relative flex justify-center">
      <div className="bg-white rounded-2xl border border-blue-100 p-6 space-y-4 shadow-sm w-full max-w-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#EFF5FF] flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-[#176BD0]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{t('landing.featureSection.mockup.hiringPipeline')}</p>
            <p className="text-xs text-slate-400">{t('landing.featureSection.mockup.seniorDeveloper')}</p>
          </div>
        </div>
        <div className="space-y-2.5">
          {[
            { stage: t('landing.featureSection.mockup.applied'), count: 124, color: "bg-slate-200" },
            { stage: t('landing.featureSection.mockup.screened'), count: 45, color: "bg-blue-200" },
            { stage: t('landing.featureSection.mockup.interviewed'), count: 18, color: "bg-[#176BD0]" },
            { stage: t('landing.featureSection.mockup.offered'), count: 4, color: "bg-green-400" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${item.color}`} />
              <span className="text-sm text-slate-700 flex-1">{item.stage}</span>
              <span className="text-sm font-semibold text-slate-800">{item.count}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-2">
          <Calendar className="w-4 h-4 text-[#176BD0]" />
          <span className="text-xs text-slate-500">{t('landing.featureSection.mockup.interviewsScheduled')}</span>
        </div>
      </div>
    </div>
  );
};

interface FeatureCardProps {
  title: string;
  description: string;
  bullets: string[];
  mockup: React.ReactNode;
  imagePosition: "left" | "right";
}

const FeatureCard = ({ title, description, bullets, mockup, imagePosition }: FeatureCardProps) => {
  const { t } = useTranslation();
  const isLeft = imagePosition === "left";
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6 }}
      className="py-8 md:py-12"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className={isLeft ? "order-2 md:order-2" : "order-2 md:order-1"}>
            <div className="bg-[#EFF5FF] rounded-2xl p-8">
              <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">{title}</h3>
              <p className="text-slate-600 mb-6 leading-relaxed">{description}</p>
              
              <ul className="space-y-3 mb-8">
                {bullets.map((bullet, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#176BD0]/15 flex items-center justify-center mt-0.5 shrink-0">
                      <Check className="h-3 w-3 text-[#176BD0]" />
                    </div>
                    <span className="text-slate-700">{bullet}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/intake">
                  <Button
                    className="bg-[#176BD0] hover:bg-[#1259B0] text-white rounded-lg px-6 w-full sm:w-auto"
                    data-testid={`button-feature-strategy-call-${title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {t('landing.featureSection.freeTrial')}
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    variant="outline"
                    className="border-2 border-[#176BD0] text-[#176BD0] rounded-lg px-6 w-full sm:w-auto"
                    data-testid={`button-feature-cta-${title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {t('landing.featureSection.getStarted')}
                  </Button>
                </Link>
              </div>
              <div className="flex items-center gap-2 mt-4 text-sm text-slate-500">
                <Check className="h-4 w-4 text-[#176BD0]" />
                <span>{t('landing.featureSection.freeCredit')}</span>
              </div>
            </div>
          </div>

          <div className={isLeft ? "order-1 md:order-1" : "order-1 md:order-2"}>
            {mockup}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export function FeatureSection() {
  const { t } = useTranslation();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  
  return (
    <section 
      ref={ref}
      className="relative bg-white" 
      data-testid="feature-section"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-4 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-4"
        >
          {t('landing.featureSection.title')}
        </motion.h2>
        
        <div className="flex flex-wrap justify-center gap-3 md:gap-5">
          <CapabilityBadge text={t('landing.featureSection.capabilities.screenResumes')} delay={0} />
          <CapabilityBadge text={t('landing.featureSection.capabilities.conductInterviews')} delay={0.1} />
          <CapabilityBadge text={t('landing.featureSection.capabilities.scoreCandidates')} delay={0.2} />
          <CapabilityBadge text={t('landing.featureSection.capabilities.trackPipeline')} delay={0.3} />
        </div>
      </div>

      <FeatureCard
        title={t('landing.featureSection.feature1.title')}
        description={t('landing.featureSection.feature1.description')}
        bullets={[
          t('landing.featureSection.feature1.bullet1'),
          t('landing.featureSection.feature1.bullet2'),
          t('landing.featureSection.feature1.bullet3')
        ]}
        mockup={<CVScreeningVisual />}
        imagePosition="right"
      />

      <ConnectingLine />

      <FeatureCard
        title={t('landing.featureSection.feature2.title')}
        description={t('landing.featureSection.feature2.description')}
        bullets={[
          t('landing.featureSection.feature2.bullet1'),
          t('landing.featureSection.feature2.bullet2')
        ]}
        mockup={<VoiceInterviewVisual />}
        imagePosition="left"
      />

      <ConnectingLine />

      <FeatureCard
        title={t('landing.featureSection.feature3.title')}
        description={t('landing.featureSection.feature3.description')}
        bullets={[
          t('landing.featureSection.feature3.bullet1'),
          t('landing.featureSection.feature3.bullet2'),
          t('landing.featureSection.feature3.bullet3'),
          t('landing.featureSection.feature3.bullet4')
        ]}
        mockup={<PipelineVisual />}
        imagePosition="right"
      />
    </section>
  );
}

export default FeatureSection;
