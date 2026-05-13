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
      answer: `${appName} is an AI-powered HR hiring platform that automates candidate screening and interviews. Upload CVs in bulk, let AI score and rank candidates based on job requirements, then conduct automated voice interviews — all from one dashboard.`,
    },
    {
      question: "How does AI CV screening work?",
      answer: "Our AI analyzes uploaded CVs against your specific job requirements, evaluating experience, skills, education, and qualifications. Each candidate receives a score from 0-100 with detailed breakdowns, helping you instantly identify top talent from hundreds of applications.",
    },
    {
      question: "What happens during an AI voice interview?",
      answer: "The AI interviewer calls candidates directly, conducts a natural conversation tailored to the job role, asks relevant screening questions, and evaluates responses in real-time. After the interview, you get a detailed transcript, scoring, and recommendation.",
    },
    {
      question: "Can I customize the screening criteria for different jobs?",
      answer: "Absolutely. Each Hiring Agent can be configured with specific job requirements, preferred qualifications, screening questions, and scoring criteria. You can create different agents for different roles with unique evaluation frameworks.",
    },
    {
      question: "How many CVs can I upload at once?",
      answer: "You can upload CVs in bulk via ZIP files containing hundreds of resumes. The AI processes them in parallel, scoring and ranking all candidates against your job requirements within minutes rather than days.",
    },
    {
      question: "Is candidate data secure and GDPR compliant?",
      answer: "Yes. All candidate data is encrypted at rest and in transit. We follow GDPR guidelines with data retention policies, candidate consent management, and the ability to delete candidate records on request. Your data is never shared with third parties.",
    },
    {
      question: "Can I integrate with my existing ATS or HRIS?",
      answer: "Yes. We offer webhooks, REST API access, and direct integrations with popular tools. You can push candidate data, interview results, and screening scores to your existing HR systems automatically.",
    },
    {
      question: "What languages does the AI interviewer support?",
      answer: "Our AI voice interviewer supports interviews in 50+ languages including English, Spanish, French, German, Hindi, Arabic, Portuguese, Mandarin, and many more — enabling truly global hiring campaigns.",
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
            Everything you need to know about our AI hiring platform
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
