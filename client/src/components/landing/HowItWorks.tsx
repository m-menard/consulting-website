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
import { Search, Code2, Link2, LineChart } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Smart Analysis",
    description: "We assess your workflows, data readiness, and bottlenecks to identify the highest-impact AI opportunities first.",
    icon: Search,
    color: "from-slate-900 to-slate-800 dark:from-slate-100 dark:to-slate-200"
  },
  {
    number: "02",
    title: "AI Development",
    description: "Our team builds tailored automation systems, agents, and intelligence layers designed for your operations.",
    icon: Code2,
    color: "from-slate-900 to-slate-800 dark:from-slate-100 dark:to-slate-200"
  },
  {
    number: "03",
    title: "Seamless Integration",
    description: "We integrate solutions with your existing stack and processes so adoption is smooth and disruption stays minimal.",
    icon: Link2,
    color: "from-slate-900 to-slate-800 dark:from-slate-100 dark:to-slate-200"
  },
  {
    number: "04",
    title: "Continuous Optimization",
    description: "After launch, we monitor, evaluate, and improve system performance to maximize long-term business outcomes.",
    icon: LineChart,
    color: "from-slate-900 to-slate-800 dark:from-slate-100 dark:to-slate-200"
  }
];

export function HowItWorks() {
  return (
    <section 
      className="py-12 sm:py-16 md:py-24 lg:py-32 bg-muted/30"
      data-testid="section-how-it-works"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center space-y-3 sm:space-y-4 mb-8 sm:mb-12 md:mb-16"
        >
          <h2 
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold"
            data-testid="heading-how-it-works"
          >
            Our Process
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
            Our simple, smart, and scalable approach for production AI delivery
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8 max-w-7xl mx-auto">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              data-testid={`card-step-${index}`}
            >
              <Card className="p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl h-full hover-elevate transition-all group relative overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                <div className="flex items-start gap-4 sm:gap-6 mb-4 sm:mb-6">
                  <div 
                    className={`h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 rounded-xl sm:rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}
                    data-testid={`icon-step-${index}`}
                  >
                    <step.icon className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-white dark:text-slate-900" />
                  </div>
                  <div 
                    className="text-5xl sm:text-6xl md:text-7xl font-bold text-primary/10 group-hover:text-primary/20 transition-colors"
                    data-testid={`number-step-${index}`}
                  >
                    {step.number}
                  </div>
                </div>
                <h3 
                  className="text-lg sm:text-xl md:text-2xl font-bold mb-2 sm:mb-3"
                  data-testid={`title-step-${index}`}
                >
                  {step.title}
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
