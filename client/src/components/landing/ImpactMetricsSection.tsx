import { motion } from "framer-motion";
import { useBranding } from "@/components/BrandingProvider";

const metrics = [
  {
    value: "10M+",
    label: "Candidate Screenings",
    description: "CVs processed and scored by AI across all clients",
  },
  {
    value: "90%",
    label: "Faster Hiring Cycle",
    description: "Reduction in time-to-hire with automated screening",
  },
  {
    value: "75%",
    label: "Engagement Rate",
    description: "Candidate response rate through AI voice interviews",
  },
  {
    value: "15%",
    label: "Productivity Jump",
    description: "First month productivity improvement for hired candidates",
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
            We make impact.
          </h2>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
            {branding.app_name} transforms how companies hire — delivering measurable results at every stage of the recruitment pipeline.
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
