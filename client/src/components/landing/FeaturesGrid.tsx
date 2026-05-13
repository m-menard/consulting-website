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
import { Card } from "@/components/ui/card";
import { FileText, GitBranch, Calendar, LineChart, Mic, Target } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    title: "AI Resume Screening",
    description: "Upload CVs in bulk. AI reads, analyzes, and scores every resume against your job requirements in minutes.",
    icon: FileText,
    iconColor: "from-blue-500 to-cyan-500",
    shadowColor: "shadow-blue-500/20"
  },
  {
    title: "Smart Candidate Pipelines",
    description: "Track candidates through customizable hiring stages with drag-and-drop pipeline management.",
    icon: GitBranch,
    iconColor: "from-green-500 to-emerald-500",
    shadowColor: "shadow-green-500/20"
  },
  {
    title: "AI Interview Scheduling",
    description: "Let your AI hiring agents schedule and conduct phone interviews with shortlisted candidates automatically.",
    icon: Calendar,
    iconColor: "from-purple-500 to-pink-500",
    shadowColor: "shadow-purple-500/20"
  },
  {
    title: "Hiring Analytics",
    description: "Track screening metrics, interview completion rates, and hiring funnel performance through comprehensive dashboards.",
    icon: LineChart,
    iconColor: "from-indigo-500 to-violet-500",
    shadowColor: "shadow-indigo-500/20"
  },
  {
    title: "AI Voice Interviews",
    description: "Natural-sounding AI voice interviews powered by ElevenLabs deliver structured candidate assessments.",
    icon: Mic,
    iconColor: "from-red-500 to-rose-500",
    shadowColor: "shadow-red-500/20"
  },
  {
    title: "Intelligent Candidate Scoring",
    description: "Automatically score candidates based on CV quality, experience match, and interview performance.",
    icon: Target,
    iconColor: "from-indigo-500 to-violet-500",
    shadowColor: "shadow-indigo-500/20"
  }
];

export function FeaturesGrid() {
  return (
    <section 
      id="features" 
      className="py-12 sm:py-16 md:py-24 lg:py-32 relative overflow-hidden"
      data-testid="section-features"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-violet-50/30 via-transparent to-indigo-50/20 dark:from-violet-900/10 dark:via-transparent dark:to-indigo-900/10" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center space-y-4 mb-8 md:mb-16"
        >
          <h2 
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold px-2"
            data-testid="heading-features"
          >
            Powerful <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-500">AI Hiring</span> Features
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
            Everything you need to screen, interview, and hire top talent
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              data-testid={`card-feature-${index}`}
            >
              <Card className="p-4 sm:p-6 md:p-8 rounded-2xl md:rounded-3xl hover-elevate transition-all h-full group border-indigo-200/20 dark:border-indigo-800/20">
                <motion.div 
                  className={`h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-gradient-to-br ${feature.iconColor} flex items-center justify-center mb-4 sm:mb-6 shadow-lg ${feature.shadowColor}`}
                  initial={{ scale: 1, rotate: 0 }}
                  whileInView={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  viewport={{ once: true }}
                  transition={{ 
                    delay: index * 0.15,
                    duration: 0.6,
                    ease: "easeOut"
                  }}
                  whileHover={{ 
                    scale: 1.1,
                    rotate: 5
                  }}
                  data-testid={`icon-feature-${index}`}
                >
                  <feature.icon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                </motion.div>
                <h3 
                  className="text-lg sm:text-xl font-bold mb-2 sm:mb-4"
                  data-testid={`title-feature-${index}`}
                >
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FeaturesGrid;
