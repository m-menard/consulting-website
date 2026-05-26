import { motion } from "framer-motion";
import { useBranding } from "@/components/BrandingProvider";

const metrics = [
  {
    value: "50+",
    label: "Production Deployments",
    description: "AI systems launched across operations, support, and revenue workflows",
  },
  {
    value: "35%",
    label: "Cycle Time Reduction",
    description: "Average reduction in manual process time after AI automation rollout",
  },
  {
    value: "99.9%",
    label: "Workflow Reliability",
    description: "Production-grade system availability with monitoring and guardrails",
  },
  {
    value: "3x",
    label: "Delivery Velocity",
    description: "Faster time from AI concept to measurable business impact",
  },
];

export function ImpactMetricsSection() {
  const { branding } = useBranding();

  return (
    <section
      className="py-16 sm:py-20 md:py-24 bg-[#EFF5FF]"
      data-testid="impact-metrics-section"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 sm:mb-16"
        >
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4"
            data-testid="text-impact-title"
          >
            AI impact you can measure.
          </h2>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
            {branding.app_name} helps teams move from AI ideas to production systems with measurable outcomes in cost, speed, and decision quality.
          </p>
        </motion.div>

        <div
          className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8"
          data-testid="impact-metrics-grid"
        >
          {metrics.map((metric, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="text-center p-6 sm:p-8 rounded-2xl bg-white border border-gray-100"
              data-testid={`impact-metric-${index}`}
            >
              <div
                className="text-4xl sm:text-5xl md:text-6xl font-bold mb-2"
                style={{ color: "#176BD0" }}
                data-testid={`text-metric-value-${index}`}
              >
                {metric.value}
              </div>
              <div
                className="text-base sm:text-lg font-semibold text-slate-900 mb-1"
                data-testid={`text-metric-label-${index}`}
              >
                {metric.label}
              </div>
              <div className="text-sm text-slate-500">
                {metric.description}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ImpactMetricsSection;
