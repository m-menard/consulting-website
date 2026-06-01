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
import { Search, Code2, Link2, LineChart, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Smart Analysis",
    description: "We assess your workflows, data readiness, and bottlenecks to identify the highest-impact AI opportunities first.",
    deliverables: ["Workflow and data audit", "Prioritized AI roadmap"],
    image: "/images/process/01-smart-analysis.png",
    icon: Search,
    color: "from-sky-600 to-blue-700"
  },
  {
    number: "02",
    title: "AI Development",
    description: "Our team builds tailored automation systems, agents, and intelligence layers designed for your operations.",
    deliverables: ["Production-grade implementation", "Evaluation and guardrails"],
    image: "/images/process/02-ai-development.png",
    icon: Code2,
    color: "from-indigo-600 to-violet-700"
  },
  {
    number: "03",
    title: "Seamless Integration",
    description: "We integrate solutions with your existing stack and processes so adoption is smooth and disruption stays minimal.",
    deliverables: ["Tool and data integration", "Team enablement and rollout"],
    image: "/images/process/03-seamless-integration.png",
    icon: Link2,
    color: "from-emerald-600 to-teal-700"
  },
  {
    number: "04",
    title: "Continuous Optimization",
    description: "After launch, we monitor, evaluate, and improve system performance to maximize long-term business outcomes.",
    deliverables: ["Performance tuning loops", "Ongoing KPI reporting"],
    image: "/images/process/04-continuous-optimization.png",
    icon: LineChart,
    color: "from-orange-600 to-amber-700"
  }
];

export function HowItWorks() {
  return (
    <section 
      className="py-14 sm:py-16 md:py-24 lg:py-28 bg-gradient-to-b from-[#F8FBFF] to-white"
      data-testid="section-how-it-works"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center space-y-3 sm:space-y-4 mb-8 sm:mb-12 md:mb-14"
        >
          <span className="inline-flex rounded-full border border-[#176BD0]/20 bg-[#EFF5FF] px-4 py-1 text-xs font-semibold tracking-wide text-[#176BD0]">
            OUR PROCESS
          </span>
          <h2 
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900"
            data-testid="heading-how-it-works"
          >
            Our Process
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-slate-600">
            Our simple, smart, and scalable approach for production AI delivery
          </p>
        </motion.div>

        <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8 max-w-7xl mx-auto">
          <div className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-10 hidden h-px bg-gradient-to-r from-[#176BD0]/0 via-[#176BD0]/35 to-[#176BD0]/0 lg:block" />
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              data-testid={`card-step-${index}`}
            >
              <Card className="p-4 sm:p-6 rounded-2xl h-full transition-all duration-300 group relative overflow-hidden border border-slate-200 bg-white shadow-sm hover:-translate-y-1 hover:shadow-xl">
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${step.color}`} />
                <div className="mb-3 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-slate-600">
                  Step {step.number}
                </div>

                <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  <img
                    src={step.image}
                    alt={step.title}
                    className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>

                <div className="flex items-start gap-4 mb-4">
                  <div 
                    className={`h-12 w-12 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}
                    data-testid={`icon-step-${index}`}
                  >
                    <step.icon className="h-6 w-6 text-white" />
                  </div>
                  <div 
                    className="text-5xl font-bold text-slate-100 group-hover:text-slate-200 transition-colors leading-none"
                    data-testid={`number-step-${index}`}
                  >
                    {step.number}
                  </div>
                </div>
                <h3 
                  className="text-lg sm:text-xl font-bold mb-2 text-slate-900"
                  data-testid={`title-step-${index}`}
                >
                  {step.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {step.description}
                </p>

                <div className="mt-4 space-y-2">
                  {step.deliverables.map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="h-4 w-4 text-[#176BD0] shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
