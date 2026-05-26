import { motion } from "framer-motion";
import { useBranding } from "@/components/BrandingProvider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function FAQSection() {
  const { branding } = useBranding();
  const appName = branding.app_name || "Our platform";

  const faqs = [
    {
      question: `What is ${appName} and how does it work?`,
      answer: `${appName} is an AI consulting and delivery partner focused on production systems. We identify high-impact use cases, design the architecture, implement integrations, and deploy AI workflows tied to business KPIs.`,
    },
    {
      question: "What kinds of AI solutions do you build?",
      answer: "We build workflow automations, internal copilots, decision-support systems, forecasting models, and retrieval-powered assistants. Each solution is scoped around a measurable business outcome such as cycle-time reduction, cost savings, or revenue uplift.",
    },
    {
      question: "How do you choose the right use case first?",
      answer: "We run a short discovery process to map workflows, data readiness, operational constraints, and ROI potential. Then we prioritize opportunities by impact, feasibility, and deployment risk before implementation starts.",
    },
    {
      question: "Can you work with our existing tools and data stack?",
      answer: "Yes. We integrate with your current systems via APIs, webhooks, and data pipelines. We design solutions to fit your stack rather than forcing tool migrations.",
    },
    {
      question: "Do you provide strategy only, or implementation too?",
      answer: "Both. We can support strategy and architecture, but our core model is hands-on delivery. We build, deploy, and iterate in production with your team.",
    },
    {
      question: "How do you handle security and compliance requirements?",
      answer: "Security is built into design and deployment: access controls, encrypted data handling, auditability, and environment-aware architecture. We align implementation with your compliance and governance standards.",
    },
    {
      question: "How long does a typical engagement take?",
      answer: "Validation engagements can be completed in a few weeks, while larger production builds typically run in phases over one to three months depending on scope and integrations.",
    },
    {
      question: "How do we measure success after launch?",
      answer: "We define clear baseline metrics upfront and track operational impact post-launch. Success is measured with business outcomes such as reduced manual effort, faster turnaround times, improved service quality, and revenue impact.",
    },
  ];

  return (
    <section
      className="py-16 sm:py-20 md:py-24 bg-[#F8FAFC]"
      data-testid="faq-section"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2
            className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4"
            data-testid="text-faq-title"
          >
            Frequently Asked Questions
          </h2>
          <p className="text-base sm:text-lg text-slate-600">
            Everything you need to know about our AI consulting and delivery approach
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`faq-${index}`}
                className="bg-white border border-gray-200 rounded-md px-6"
                data-testid={`faq-item-${index}`}
              >
                <AccordionTrigger
                  className="text-left font-medium text-slate-900 py-4"
                  data-testid={`faq-trigger-${index}`}
                >
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent
                  className="text-slate-600 pb-4"
                  data-testid={`faq-answer-${index}`}
                >
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}

export default FAQSection;
