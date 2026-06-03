import { motion } from "framer-motion";
import { 
  FileText, Mic, GraduationCap, Users,
  Briefcase, Globe, Heart, Code,
  ArrowRight, Check,
  Sparkles, Zap, Shield, BarChart3, Clock, Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { SEOHead } from "@/components/landing/SEOHead";
import { Link } from "wouter";
import { useBranding } from "@/components/BrandingProvider";
import { useSeoSettings } from "@/hooks/useSeoSettings";

interface UseCaseProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  stats: { value: string; label: string }[];
  gradient: string;
  iconBg: string;
  badge?: string;
  reverse?: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const FloatingParticle = ({ delay, duration, x, y, size }: { delay: number; duration: number; x: string; y: string; size: number }) => (
  <motion.div
    className="absolute rounded-full bg-gradient-to-r from-blue-400/20 to-cyan-400/20 blur-xl"
    style={{ left: x, top: y, width: size, height: size }}
    animate={{
      y: [0, -30, 0],
      opacity: [0.3, 0.6, 0.3],
      scale: [1, 1.2, 1],
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
);

const UseCase = ({ icon, title, subtitle, description, features, stats, gradient, iconBg, badge, reverse }: UseCaseProps) => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.6 }}
    className="relative"
  >
    <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center py-12 lg:py-20">
      <div className={`space-y-6 ${reverse ? 'lg:order-2' : 'lg:order-1'}`}>
        {badge && (
          <Badge className="bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30 px-3 py-1">
            <Sparkles className="w-3 h-3 mr-1" />
            {badge}
          </Badge>
        )}
        
        <div className={`w-16 h-16 rounded-2xl ${iconBg} flex items-center justify-center shadow-xl`}>
          <div className="text-white">{icon}</div>
        </div>
        
        <div>
          <p className="text-blue-600 dark:text-blue-400 font-medium mb-2">{subtitle}</p>
          <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">{title}</h3>
          <p className="text-muted-foreground text-lg leading-relaxed">{description}</p>
        </div>
        
        <ul className="space-y-3">
          {features.map((feature, i) => (
            <motion.li 
              key={i} 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex items-start gap-3"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-500 to-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-foreground/80">{feature}</span>
            </motion.li>
          ))}
        </ul>

        <Link href="/intake">
          <Button className="cta-button text-white font-medium border-0 mt-4" data-testid="button-get-started">
            Get Started Free
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>

      <div className={reverse ? 'lg:order-1' : 'lg:order-2'}>
        <div className={`relative p-1 rounded-3xl ${gradient}`}>
          <div className="bg-card rounded-[22px] p-6 lg:p-8">
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-2xl p-5 text-center border border-border/50 hover-elevate"
                >
                  <div className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </motion.div>
);

export default function UseCasesPage() {
  const { branding } = useBranding();
  const { data: seoSettings } = useSeoSettings();

  const useCases: UseCaseProps[] = [
    {
      icon: <FileText className="w-7 h-7" />,
      title: "Bulk CV Screening",
      subtitle: "Intelligent Resume Analysis",
      description: "Upload hundreds of CVs and let AI score, rank, and shortlist candidates by job fit. Eliminate manual resume screening and focus on the best-matched talent from day one.",
      features: [
        "Upload bulk CVs in PDF, DOCX, or plain text format",
        "AI-powered skill extraction and job-fit scoring",
        "Automated shortlisting based on customizable criteria",
        "Detailed candidate comparison reports and rankings",
        "Export shortlisted candidates to your ATS or HRIS"
      ],
      stats: [
        { value: "90%", label: "Time Saved on Screening" },
        { value: "500+", label: "CVs Processed per Hour" },
        { value: "95%", label: "Accuracy in Skill Matching" },
        { value: "3X", label: "Faster Shortlisting" }
      ],
      gradient: "bg-gradient-to-r from-blue-500 to-cyan-500",
      iconBg: "bg-gradient-to-br from-blue-500 to-cyan-600",
      badge: "Most Popular"
    },
    {
      icon: <Mic className="w-7 h-7" />,
      title: "AI Voice Interviews",
      subtitle: "Automated Phone Screening",
      description: "Conduct natural, conversational phone interviews powered by AI. Candidates are assessed on communication skills, technical knowledge, and cultural fit\u2014all without human interviewer bias.",
      features: [
        "Natural AI voice conversations with real-time scoring",
        "Customizable interview scripts per job role",
        "Automatic transcription and sentiment analysis",
        "Candidate scoring across multiple competency dimensions",
        "Seamless scheduling with SMS/email notifications"
      ],
      stats: [
        { value: "70%", label: "Faster Hiring Cycle" },
        { value: "24/7", label: "Interview Availability" },
        { value: "85%", label: "Candidate Satisfaction" },
        { value: "50%", label: "Cost Reduction" }
      ],
      gradient: "bg-gradient-to-r from-purple-500 to-pink-500",
      iconBg: "bg-gradient-to-br from-purple-500 to-pink-600",
      reverse: true,
      badge: "AI-Powered"
    },
    {
      icon: <GraduationCap className="w-7 h-7" />,
      title: "Campus Recruitment",
      subtitle: "University Hiring at Scale",
      description: "Streamline your campus recruitment with bulk screening and automated interview scheduling. Engage thousands of fresh graduates efficiently and identify top talent from universities worldwide.",
      features: [
        "Bulk processing of graduate applications and CVs",
        "Automated first-round screening interviews",
        "University-specific hiring criteria and scoring",
        "Campus event scheduling and candidate pipeline tracking",
        "Group assessment and batch shortlisting capabilities"
      ],
      stats: [
        { value: "5X", label: "More Candidates Screened" },
        { value: "60%", label: "Reduced Recruiter Workload" },
        { value: "100+", label: "Universities Supported" },
        { value: "2 Days", label: "Average Screening Time" }
      ],
      gradient: "bg-gradient-to-r from-indigo-500 to-blue-500",
      iconBg: "bg-gradient-to-br from-indigo-500 to-blue-600"
    },
    {
      icon: <Users className="w-7 h-7" />,
      title: "Volume Hiring (BPO/Retail)",
      subtitle: "High-Volume Recruitment",
      description: "Handle seasonal surges and high-volume hiring for BPO, retail, and entry-level positions. AI pre-screens hundreds of candidates daily, ensuring only qualified applicants reach human recruiters.",
      features: [
        "Process thousands of applications simultaneously",
        "Pre-built screening templates for common roles",
        "Automated candidate ranking and disposition",
        "Real-time hiring funnel analytics and conversion rates",
        "Multi-location hiring with centralized management"
      ],
      stats: [
        { value: "1000+", label: "Candidates/Day Capacity" },
        { value: "80%", label: "Screening Automation" },
        { value: "40%", label: "Lower Cost-per-Hire" },
        { value: "3X", label: "Faster Time-to-Fill" }
      ],
      gradient: "bg-gradient-to-r from-amber-500 to-orange-500",
      iconBg: "bg-gradient-to-br from-amber-500 to-orange-600",
      reverse: true
    },
    {
      icon: <Briefcase className="w-7 h-7" />,
      title: "Executive Search",
      subtitle: "Senior Leadership Hiring",
      description: "Conduct deep, comprehensive screening for C-suite and senior leadership roles. AI analyzes leadership competencies, strategic thinking, and cultural alignment with sophisticated assessment frameworks.",
      features: [
        "In-depth competency-based AI interview frameworks",
        "Leadership style and strategic thinking assessment",
        "Confidential screening with data privacy controls",
        "Comprehensive candidate profile reports for boards",
        "Multi-round progressive screening workflows"
      ],
      stats: [
        { value: "95%", label: "Assessment Accuracy" },
        { value: "45%", label: "Faster Executive Placement" },
        { value: "100%", label: "Confidentiality Guaranteed" },
        { value: "360\u00B0", label: "Competency Analysis" }
      ],
      gradient: "bg-gradient-to-r from-slate-500 to-zinc-600",
      iconBg: "bg-gradient-to-br from-slate-600 to-zinc-700"
    },
    {
      icon: <Globe className="w-7 h-7" />,
      title: "Global Hiring",
      subtitle: "Multi-Language Recruitment",
      description: "Recruit across borders with AI interviews in 30+ languages. Screen international talent pools, handle timezone differences automatically, and build diverse global teams with consistent evaluation standards.",
      features: [
        "AI voice interviews in 30+ languages and dialects",
        "Automatic timezone-aware interview scheduling",
        "Cross-cultural communication assessment",
        "Compliance with international hiring regulations",
        "Unified global candidate scoring and comparison"
      ],
      stats: [
        { value: "30+", label: "Languages Supported" },
        { value: "100+", label: "Countries Covered" },
        { value: "24/7", label: "Global Availability" },
        { value: "Zero", label: "Language Barriers" }
      ],
      gradient: "bg-gradient-to-r from-green-500 to-emerald-500",
      iconBg: "bg-gradient-to-br from-green-500 to-emerald-600",
      reverse: true,
      badge: "Global Scale"
    },
    {
      icon: <Heart className="w-7 h-7" />,
      title: "Healthcare Staffing",
      subtitle: "Compliance-Focused Screening",
      description: "Streamline healthcare recruitment with credential verification and compliance-focused screening. AI validates certifications, licenses, and regulatory requirements while assessing clinical competencies.",
      features: [
        "Automated credential and license verification",
        "Compliance-focused screening for healthcare regulations",
        "Clinical competency assessment through AI interviews",
        "Shift-based hiring and availability matching",
        "HIPAA-compliant candidate data management"
      ],
      stats: [
        { value: "98%", label: "Credential Accuracy" },
        { value: "75%", label: "Faster Credentialing" },
        { value: "100%", label: "Regulatory Compliance" },
        { value: "60%", label: "Reduced Admin Work" }
      ],
      gradient: "bg-gradient-to-r from-red-500 to-rose-500",
      iconBg: "bg-gradient-to-br from-red-500 to-rose-600"
    },
    {
      icon: <Code className="w-7 h-7" />,
      title: "Tech Hiring",
      subtitle: "Technical Skill Assessment",
      description: "Evaluate technical candidates with AI-powered screening that assesses programming knowledge, system design thinking, and problem-solving skills through structured conversational interviews.",
      features: [
        "Technical skill assessment through structured AI interviews",
        "Role-specific screening for engineering, data science, and DevOps",
        "Problem-solving and system design evaluation",
        "Technology stack proficiency scoring",
        "Integration with coding assessment platforms"
      ],
      stats: [
        { value: "85%", label: "Technical Fit Accuracy" },
        { value: "3X", label: "Faster Tech Screening" },
        { value: "50+", label: "Tech Stacks Covered" },
        { value: "92%", label: "Hiring Manager Satisfaction" }
      ],
      gradient: "bg-gradient-to-r from-violet-500 to-purple-500",
      iconBg: "bg-gradient-to-br from-violet-500 to-purple-600",
      reverse: true
    }
  ];

  const industries = [
    { icon: <Briefcase className="w-5 h-5" />, name: "Staffing Agencies", color: "from-blue-500 to-cyan-500" },
    { icon: <Heart className="w-5 h-5" />, name: "Healthcare", color: "from-red-500 to-pink-500" },
    { icon: <GraduationCap className="w-5 h-5" />, name: "Education", color: "from-purple-500 to-indigo-500" },
    { icon: <Users className="w-5 h-5" />, name: "BPO & Call Centers", color: "from-amber-500 to-orange-500" },
    { icon: <Code className="w-5 h-5" />, name: "Technology", color: "from-slate-500 to-zinc-500" },
    { icon: <Globe className="w-5 h-5" />, name: "Global Enterprises", color: "from-green-500 to-emerald-500" },
    { icon: <Briefcase className="w-5 h-5" />, name: "Retail & Hospitality", color: "from-indigo-500 to-cyan-500" },
    { icon: <Search className="w-5 h-5" />, name: "Executive Search Firms", color: "from-violet-500 to-purple-500" },
  ];

  const platformFeatures = [
    { icon: <BarChart3 className="w-5 h-5" />, label: "AI-Powered Scoring", description: "Smart candidate ranking" },
    { icon: <Globe className="w-5 h-5" />, label: "30+ Languages", description: "Global hiring coverage" },
    { icon: <Clock className="w-5 h-5" />, label: "24/7 Interviews", description: "Always-on screening" },
    { icon: <Shield className="w-5 h-5" />, label: "Enterprise Security", description: "GDPR & SOC2 compliant" },
  ];
  
  return (
    <div className="min-h-screen bg-background" data-testid="use-cases-page">
      <SEOHead
        title="Use Cases - AI-Powered Hiring Solutions"
        description="Discover how AI transforms recruitment with bulk CV screening, voice interviews, campus hiring, volume recruitment, executive search, and global staffing solutions."
        canonicalUrl={seoSettings?.canonicalBaseUrl ? `${seoSettings.canonicalBaseUrl}/use-cases` : undefined}
        ogImage={seoSettings?.defaultOgImage || undefined}
        ogSiteName={branding.app_name}
        twitterSite={seoSettings?.twitterHandle || undefined}
        twitterCreator={seoSettings?.twitterHandle || undefined}
        googleVerification={seoSettings?.googleVerification || undefined}
        bingVerification={seoSettings?.bingVerification || undefined}
        facebookAppId={seoSettings?.facebookAppId || undefined}
        structuredDataOrg={seoSettings?.structuredDataOrg}
      />

      <Navbar />

      <main className="pt-16">
        <section className="relative py-20 md:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#0f2847] to-slate-950" />
          
          <div className="absolute inset-0 overflow-hidden">
            <FloatingParticle delay={0} duration={8} x="10%" y="20%" size={300} />
            <FloatingParticle delay={2} duration={10} x="70%" y="10%" size={400} />
            <FloatingParticle delay={4} duration={9} x="80%" y="60%" size={250} />
            <FloatingParticle delay={1} duration={11} x="20%" y="70%" size={350} />
            <FloatingParticle delay={3} duration={7} x="50%" y="40%" size={200} />
          </div>
          
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjAyIiBkPSJNMCAwaDYwdjYwSDB6Ii8+PHBhdGggZD0iTTYwIDBIMHY2MCIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utb3BhY2l0eT0iLjAzIi8+PC9nPjwvc3ZnPg==')] opacity-50" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="text-center"
            >
              <motion.div variants={itemVariants} className="mb-6">
                <Badge className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400 border-blue-500/30 px-4 py-1.5 text-sm">
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI-Powered Hiring Solutions
                </Badge>
              </motion.div>

              <motion.h1 
                variants={itemVariants}
                className="text-4xl md:text-5xl lg:text-7xl font-bold mb-6 text-white"
                data-testid="text-hero-title"
              >
                Transform How You{" "}
                <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-300 bg-clip-text text-transparent">
                  Hire Talent
                </span>
              </motion.h1>
              
              <motion.p 
                variants={itemVariants}
                className="text-lg md:text-xl text-zinc-400 max-w-3xl mx-auto mb-10"
                data-testid="text-hero-subtitle"
              >
                From bulk CV screening to AI voice interviews, discover how our platform automates every stage of recruitment so you can find the best candidates faster.
              </motion.p>

              <motion.div 
                variants={itemVariants}
                className="flex flex-wrap justify-center gap-4 mb-12"
              >
                {platformFeatures.map((feature, i) => (
                  <div 
                    key={i}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm"
                    data-testid={`badge-platform-feature-${i}`}
                  >
                    <div className="text-blue-400">{feature.icon}</div>
                    <div className="text-left">
                      <div className="text-white text-sm font-medium">{feature.label}</div>
                      <div className="text-zinc-500 text-xs">{feature.description}</div>
                    </div>
                  </div>
                ))}
              </motion.div>

              <motion.div variants={itemVariants} className="flex flex-wrap justify-center gap-3">
                {industries.map((industry, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.05, y: -2 }}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r ${industry.color} bg-opacity-10 border border-white/10 backdrop-blur-sm cursor-default`}
                    data-testid={`badge-industry-${i}`}
                  >
                    <span className="text-white">{industry.icon}</span>
                    <span className="text-sm font-medium text-white">{industry.name}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>

        </section>

        <section className="py-8 lg:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {useCases.map((useCase, index) => (
              <div 
                key={index} 
                className={index < useCases.length - 1 ? "border-b border-border/50" : ""}
                data-testid={`card-use-case-${index}`}
              >
                <UseCase {...useCase} />
              </div>
            ))}
          </div>
        </section>

        <section className="py-20 md:py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-cyan-500/10" />
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4" data-testid="text-stats-title">
                Trusted by Hiring Teams Worldwide
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto" data-testid="text-stats-subtitle">
                Join thousands of companies that have transformed their recruitment with AI-powered screening and interviews.
              </p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
              {[
                { value: "2M+", label: "Candidates Screened", icon: <Users className="w-6 h-6" /> },
                { value: "5,000+", label: "Hiring Teams", icon: <Briefcase className="w-6 h-6" /> },
                { value: "99.9%", label: "Platform Uptime", icon: <Zap className="w-6 h-6" /> },
                { value: "30+", label: "Languages Supported", icon: <Globe className="w-6 h-6" /> },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center p-6 lg:p-8 rounded-3xl bg-card border border-border/50 hover-elevate"
                  data-testid={`card-stat-${i}`}
                >
                  <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center text-blue-500">
                    {stat.icon}
                  </div>
                  <div className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-muted-foreground mt-2">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 md:py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
          
          <div className="absolute inset-0 overflow-hidden">
            <FloatingParticle delay={0} duration={10} x="5%" y="30%" size={400} />
            <FloatingParticle delay={3} duration={8} x="85%" y="20%" size={300} />
            <FloatingParticle delay={5} duration={12} x="50%" y="60%" size={350} />
          </div>

          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <Badge className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400 border-blue-500/30 px-4 py-1.5">
                <Sparkles className="w-4 h-4 mr-2" />
                Start Hiring Smarter
              </Badge>

              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white" data-testid="text-cta-title">
                Ready to Transform Your{" "}
                <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Hiring Process?
                </span>
              </h2>
              
              <p className="text-lg text-zinc-400 max-w-2xl mx-auto" data-testid="text-cta-subtitle">
                Join thousands of companies using AI to screen candidates, conduct interviews, and build better teams\u2014all on one platform.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/intake">
                  <Button size="lg" className="cta-button text-white font-medium border-0 h-14 px-8 text-lg" data-testid="button-cta-start-trial">
                    Start Free Trial
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link href="/#pricing">
                  <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-white/20 text-white hover:bg-white/10" data-testid="button-cta-view-pricing">
                    View Pricing
                  </Button>
                </Link>
              </div>

              <p className="text-sm text-zinc-500" data-testid="text-trust-message">
                No credit card required. Free plan available. Cancel anytime.
              </p>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
