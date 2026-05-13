/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * Original Author: BTPL Engineering Team
 * Website: https://diploy.in
 * Contact: cs@diploy.in
 *
 * Distributed under the Envato / CodeCanyon License Agreement.
 * Licensed to the purchaser for use as defined by the
 * Envato Market (CodeCanyon) Regular or Extended License.
 *
 * You are NOT permitted to redistribute, resell, sublicense,
 * or share this source code, in whole or in part.
 * Respect the author's rights and Envato licensing terms.
 * ============================================================
 */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileSearch,
  Calendar,
  Mail,
  UserPlus,
  Shield,
  FileCheck,
  Users,
  Heart,
  MessageSquare,
  Scale,
  Award,
  Megaphone,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ComponentType } from "react";

interface Agent {
  id: string;
  title: string;
  description: string;
  categories: string[];
  icon: ComponentType<{ className?: string }>;
  iconColor: string;
  bgColor: string;
}

const agents: Record<string, Agent> = {
  resumeScreener: {
    id: "resumeScreener",
    title: "Resume screening agent",
    description:
      "Automatically analyzes and scores incoming CVs against job requirements, shortlisting the best-fit candidates instantly.",
    categories: ["Technology", "Healthcare", "Enterprise"],
    icon: FileSearch,
    iconColor: "text-violet-600",
    bgColor: "bg-violet-50 dark:bg-violet-950/30",
  },
  interviewScheduler: {
    id: "interviewScheduler",
    title: "Interview scheduler",
    description:
      "Coordinates interview times with candidates and hiring managers, sending automated confirmations and reminders.",
    categories: ["Staffing", "Enterprise", "Startups"],
    icon: Calendar,
    iconColor: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
  },
  candidateOutreach: {
    id: "candidateOutreach",
    title: "Candidate outreach agent",
    description:
      "Reaches out to potential candidates via email and phone, nurturing passive talent and building your pipeline.",
    categories: ["Recruitment", "Staffing", "HR Tech"],
    icon: Mail,
    iconColor: "text-emerald-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  onboardingAssistant: {
    id: "onboardingAssistant",
    title: "Onboarding assistant",
    description:
      "Guides new hires through onboarding steps, collecting documents and providing company information automatically.",
    categories: ["Enterprise", "Startups", "HR Tech"],
    icon: UserPlus,
    iconColor: "text-violet-600",
    bgColor: "bg-violet-50 dark:bg-violet-950/30",
  },
  backgroundChecker: {
    id: "backgroundChecker",
    title: "Background check agent",
    description:
      "Automates reference checks and background verification, collecting feedback from previous employers efficiently.",
    categories: ["Enterprise", "Healthcare", "Finance"],
    icon: Shield,
    iconColor: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/30",
  },
  documentCollector: {
    id: "documentCollector",
    title: "Document collection agent",
    description:
      "Requests and tracks required hiring documents from candidates, ensuring compliance and completeness.",
    categories: ["Compliance", "Healthcare", "Government"],
    icon: FileCheck,
    iconColor: "text-indigo-600",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
  },
  teamCoordinator: {
    id: "teamCoordinator",
    title: "Hiring team coordinator",
    description:
      "Keeps hiring panels aligned by distributing candidate profiles, collecting feedback, and tracking decisions.",
    categories: ["Enterprise", "Technology", "Consulting"],
    icon: Users,
    iconColor: "text-cyan-600",
    bgColor: "bg-cyan-50 dark:bg-cyan-950/30",
  },
  candidateExperience: {
    id: "candidateExperience",
    title: "Candidate experience agent",
    description:
      "Ensures every candidate has a positive experience with timely updates, feedback, and personalized communication.",
    categories: ["Employer Branding", "Recruitment", "HR Tech"],
    icon: Heart,
    iconColor: "text-rose-600",
    bgColor: "bg-rose-50 dark:bg-rose-950/30",
  },
  interviewFeedback: {
    id: "interviewFeedback",
    title: "Interview feedback agent",
    description:
      "Collects structured feedback from interviewers after each round, generating consolidated candidate assessments.",
    categories: ["Technology", "Consulting", "Enterprise"],
    icon: MessageSquare,
    iconColor: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
  },
  complianceAgent: {
    id: "complianceAgent",
    title: "Hiring compliance agent",
    description:
      "Monitors hiring processes for compliance with employment laws, ensuring fair and unbiased recruitment practices.",
    categories: ["Government", "Enterprise", "Finance"],
    icon: Scale,
    iconColor: "text-violet-600",
    bgColor: "bg-violet-50 dark:bg-violet-950/30",
  },
  skillAssessment: {
    id: "skillAssessment",
    title: "Skill assessment agent",
    description:
      "Administers and evaluates technical assessments, coding challenges, and skill tests for candidates automatically.",
    categories: ["Technology", "Education", "Consulting"],
    icon: Award,
    iconColor: "text-pink-600",
    bgColor: "bg-pink-50 dark:bg-pink-950/30",
  },
  employerBranding: {
    id: "employerBranding",
    title: "Employer branding agent",
    description:
      "Promotes your company culture and job openings across channels, attracting top talent with compelling employer messaging.",
    categories: ["Marketing", "Startups", "Enterprise"],
    icon: Megaphone,
    iconColor: "text-indigo-600",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
  },
};

interface TabConfig {
  id: string;
  label: string;
  agentIds: string[];
}

const tabsConfig: TabConfig[] = [
  {
    id: "screen",
    label: "Screen",
    agentIds: [
      "resumeScreener",
      "interviewScheduler",
      "candidateOutreach",
      "onboardingAssistant",
      "backgroundChecker",
      "documentCollector",
    ],
  },
  {
    id: "interview",
    label: "Interview",
    agentIds: [
      "interviewScheduler",
      "candidateOutreach",
      "backgroundChecker",
      "teamCoordinator",
      "candidateExperience",
      "interviewFeedback",
    ],
  },
  {
    id: "manage",
    label: "Manage",
    agentIds: [
      "teamCoordinator",
      "candidateExperience",
      "interviewFeedback",
      "complianceAgent",
      "skillAssessment",
      "employerBranding",
    ],
  },
];

interface AgentCardProps {
  agent: Agent;
  index: number;
}

function AgentCard({ agent, index }: AgentCardProps) {
  const IconComponent = agent.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="flex flex-col h-full"
      data-testid={`agent-card-${agent.id}`}
    >
      <div
        className={`${agent.bgColor} rounded-2xl p-4 mb-4 h-40 flex items-center justify-center relative overflow-hidden`}
      >
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            <pattern
              id={`pattern-${agent.id}`}
              x="0"
              y="0"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="2" cy="2" r="1" fill="currentColor" />
            </pattern>
            <rect
              width="100"
              height="100"
              fill={`url(#pattern-${agent.id})`}
            />
          </svg>
        </div>
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div
            className={`w-16 h-16 rounded-2xl bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center`}
          >
            <IconComponent className={`w-8 h-8 ${agent.iconColor}`} />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            <span>AI Powered</span>
          </div>
        </div>
      </div>

      <h3
        className="text-lg font-semibold mb-2"
        data-testid={`agent-title-${agent.id}`}
      >
        {agent.title}
      </h3>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {agent.categories.slice(0, 3).map((category) => (
          <Badge
            key={category}
            variant="secondary"
            className="text-xs font-normal px-2 py-0.5"
            data-testid={`agent-category-${agent.id}-${category.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {category}
          </Badge>
        ))}
      </div>

      <p
        className="text-sm text-muted-foreground leading-relaxed"
        data-testid={`agent-description-${agent.id}`}
      >
        {agent.description}
      </p>
    </motion.div>
  );
}

interface TabButtonProps {
  tab: TabConfig;
  isActive: boolean;
  onClick: () => void;
}

function TabButton({ tab, isActive, onClick }: TabButtonProps) {
  return (
    <button
      id={`tab-button-${tab.id}`}
      role="tab"
      aria-selected={isActive}
      aria-controls={`agent-grid-${tab.id}`}
      onClick={onClick}
      className={`flex items-center gap-3 py-2 px-4 transition-all duration-500 relative ${
        isActive
          ? "text-foreground font-semibold"
          : "text-muted-foreground hover:text-foreground"
      }`}
      data-testid={`tab-button-${tab.id}`}
    >
      <div className="relative w-2.5 flex items-center justify-center">
        {isActive && (
          <motion.div
            layoutId="activeTabIndicator"
            className="w-2.5 h-2.5 rounded-full bg-violet-600"
            transition={{ type: "spring", stiffness: 300, damping: 25, duration: 0.6 }}
          />
        )}
      </div>
      <span className="text-lg">{tab.label}</span>
    </button>
  );
}

export function UseCaseTabs() {
  const [activeTab, setActiveTab] = useState("screen");
  const [isMobile, setIsMobile] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const stickyContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile) return;

    const handleScroll = () => {
      if (!sectionRef.current) return;

      const section = sectionRef.current;
      const rect = section.getBoundingClientRect();
      const sectionHeight = section.offsetHeight;
      const viewportHeight = window.innerHeight;
      
      const scrollableHeight = sectionHeight - viewportHeight;
      const scrollProgress = Math.max(0, Math.min(1, -rect.top / scrollableHeight));
      
      const tabIndex = Math.min(
        Math.floor(scrollProgress * tabsConfig.length),
        tabsConfig.length - 1
      );
      
      const newActiveTab = tabsConfig[tabIndex]?.id || "screen";
      setActiveTab(newActiveTab);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [isMobile]);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    
    if (isMobile || !sectionRef.current) return;
    
    const section = sectionRef.current;
    const sectionTop = section.offsetTop;
    const sectionHeight = section.offsetHeight;
    const viewportHeight = window.innerHeight;
    const scrollableHeight = sectionHeight - viewportHeight;
    
    const tabIndex = tabsConfig.findIndex((t) => t.id === tabId);
    const targetProgress = tabIndex / tabsConfig.length;
    const targetScroll = sectionTop + (scrollableHeight * targetProgress);
    
    window.scrollTo({
      top: targetScroll,
      behavior: "smooth",
    });
  };

  const currentTab = tabsConfig.find((t) => t.id === activeTab) || tabsConfig[0];
  const currentAgents = currentTab.agentIds.map((id) => agents[id]);
  const displayedAgents = isMobile ? currentAgents.slice(0, 3) : currentAgents;

  return (
    <section
      ref={sectionRef}
      id="use-cases"
      className="relative bg-background py-16 md:py-0"
      style={isMobile ? {} : { height: "200vh" }}
      data-testid="use-cases-section"
    >
      <div
        ref={stickyContainerRef}
        className={isMobile ? "py-8" : "sticky top-0 h-screen flex flex-col justify-center py-12 md:py-16"}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8 md:mb-12"
          >
            <h2
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-4 md:mb-6 px-2"
              data-testid="use-cases-headline"
            >
              AI hiring agents for every recruitment need
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto px-4">
              From screening resumes to managing onboarding, use specialized AI agents
              that handle every hiring task. Or, build your own from the ground up.
            </p>
          </motion.div>

          <div className="space-y-6 md:space-y-8">
            <nav
              role="tablist"
              aria-label="Agent categories"
              className="flex justify-center gap-1 sm:gap-2 md:gap-4"
              data-testid="use-cases-tabs"
            >
              {tabsConfig.map((tab) => (
                <TabButton
                  key={tab.id}
                  tab={tab}
                  isActive={activeTab === tab.id}
                  onClick={() => handleTabClick(tab.id)}
                />
              ))}
            </nav>

            <div className="min-h-0 md:min-h-[600px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  id={`agent-grid-${activeTab}`}
                  role="tabpanel"
                  aria-labelledby={`tab-button-${activeTab}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8"
                  data-testid={`agent-grid-${activeTab}`}
                >
                  {displayedAgents.map((agent, index) => (
                    <AgentCard key={agent.id} agent={agent} index={index} />
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default UseCaseTabs;
