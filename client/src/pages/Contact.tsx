import { motion, useReducedMotion } from "framer-motion";
import { 
  Mail, 
  Send, 
  Shield, 
  Loader2,
  HelpCircle,
  ExternalLink,
  BookOpen,
  TicketCheck
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { CONTACT_INBOX_EMAIL } from "@shared/contact-inbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { SEOHead } from "@/components/landing/SEOHead";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { useBranding } from "@/components/BrandingProvider";
import { useSeoSettings } from "@/hooks/useSeoSettings";

const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  company: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

const faqItemKeys = [
  { id: "faq-1", key: "responseTime" },
  { id: "faq-2", key: "scheduleDemo" },
  { id: "faq-3", key: "customIntegrations" },
  { id: "faq-4", key: "paymentMethods" }
];

export default function Contact() {
  const { branding } = useBranding();
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      company: "",
      message: "",
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to send message');
      }
      
      form.reset();
      toast({
        title: t("landing.contactPage.form.successTitle"),
        description: t("landing.contactPage.form.successDescription"),
      });
    } catch (error: any) {
      toast({
        title: t("landing.contactPage.form.errorTitle", "Error"),
        description: error.message || t("landing.contactPage.form.errorDescription", "Failed to send message. Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const { data: seoSettings } = useSeoSettings();

  const supportChannels = [
    {
      icon: TicketCheck,
      title: t("landing.contactPage.supportChannels.ticket.title"),
      description: t("landing.contactPage.supportChannels.ticket.description"),
      action: t("landing.contactPage.supportChannels.ticket.action"),
      href: "https://diploy.ticksy.com",
      external: true,
      testId: "card-support-ticket"
    },
    {
      icon: Mail,
      title: t("landing.contactPage.supportChannels.email.title"),
      description: t("landing.contactPage.supportChannels.email.description"),
      action: t("landing.contactPage.supportChannels.email.action"),
      href: `mailto:${CONTACT_INBOX_EMAIL}`,
      external: false,
      testId: "card-support-email"
    },
    {
      icon: BookOpen,
      title: t("landing.contactPage.supportChannels.docs.title"),
      description: t("landing.contactPage.supportChannels.docs.description"),
      action: t("landing.contactPage.supportChannels.docs.action"),
      href: "/docs.html",
      external: true,
      testId: "card-support-docs"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`Contact Us | ${branding.app_name}`}
        description={`Get in touch with ${branding.app_name}. We're here to help you transform your hiring process with AI-powered recruitment.`}
        canonicalUrl={seoSettings?.canonicalBaseUrl ? `${seoSettings.canonicalBaseUrl}/contact` : undefined}
        ogImage={seoSettings?.defaultOgImage || undefined}
        keywords={["contact", "support", "AI hiring", "recruitment", "CV screening", "demo", branding.app_name]}
        ogSiteName={branding.app_name}
        twitterSite={seoSettings?.twitterHandle || undefined}
        twitterCreator={seoSettings?.twitterHandle || undefined}
        googleVerification={seoSettings?.googleVerification || undefined}
        bingVerification={seoSettings?.bingVerification || undefined}
        facebookAppId={seoSettings?.facebookAppId || undefined}
        structuredDataOrg={seoSettings?.structuredDataOrg}
      />
      
      <Navbar />

      <section 
        className="pt-24 pb-12 md:pt-32 md:pb-16"
        data-testid="section-hero"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            <h1 
              className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 dark:text-white"
              data-testid="heading-contact"
            >
              {t("landing.contactPage.title")}
            </h1>
            <p 
              className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto"
              data-testid="text-contact-subheading"
            >
              {t("landing.contactPage.subtitle")}
            </p>
          </motion.div>
        </div>
      </section>

      <section 
        className="py-8 md:py-12"
        data-testid="section-support-channels"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            {supportChannels.map((channel, index) => (
              <motion.div
                key={channel.testId}
                initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <a
                  href={channel.href}
                  target={channel.external ? "_blank" : undefined}
                  rel={channel.external ? "noopener noreferrer" : undefined}
                  className="block h-full"
                  data-testid={channel.testId}
                >
                  <Card className="p-6 h-full hover-elevate transition-all duration-200 border border-gray-200 dark:border-gray-800">
                    <div className="flex flex-col h-full gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#176BD0]/10 dark:bg-[#176BD0]/20 flex items-center justify-center">
                        <channel.icon className="w-6 h-6 text-[#176BD0]" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{channel.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{channel.description}</p>
                      </div>
                      <div className="flex items-center gap-1 text-sm font-medium text-[#176BD0]">
                        {channel.action}
                        <ExternalLink className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </Card>
                </a>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section 
        className="py-12 md:py-16"
        data-testid="section-contact-form"
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="p-8 md:p-10" data-testid="card-contact-form">
              <div className="space-y-1 mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="heading-form">
                  {t("landing.contactPage.form.title")}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {t("landing.contactPage.form.subtitle")}
                </p>
              </div>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                  data-testid="form-contact"
                >
                  <div className="grid sm:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("landing.contactPage.form.labels.name")}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t("landing.contactPage.form.placeholders.name")}
                              data-testid="input-name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("landing.contactPage.form.labels.email")}</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder={t("landing.contactPage.form.placeholders.email")}
                              data-testid="input-email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("landing.contactPage.form.labels.company")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("landing.contactPage.form.placeholders.company")}
                            data-testid="input-company"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("landing.contactPage.form.labels.message")}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t("landing.contactPage.form.placeholders.message")}
                            className="min-h-[140px] resize-none"
                            data-testid="input-message"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={isSubmitting}
                    data-testid="button-submit-contact"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        {t("landing.contactPage.form.submitting")}
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5" />
                        {t("landing.contactPage.form.submit")}
                      </>
                    )}
                  </Button>

                  <p
                    className="text-xs text-gray-500 dark:text-gray-500 text-center flex items-center justify-center gap-1.5"
                    data-testid="text-privacy-notice"
                  >
                    <Shield className="h-3.5 w-3.5" />
                    {t("landing.contactPage.form.privacyNotice")}
                  </p>
                </form>
              </Form>
            </Card>
          </motion.div>
        </div>
      </section>

      <section 
        className="py-12 md:py-16 bg-gray-50 dark:bg-gray-900/30"
        data-testid="section-faq"
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center space-y-3 mb-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300">
              <HelpCircle className="h-4 w-4" />
              {t("landing.contactPage.faq.badge")}
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="heading-faq">
              {t("landing.contactPage.faq.title")}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              {t("landing.contactPage.faq.subtitle")}
            </p>
          </motion.div>

          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card>
              <Accordion type="single" collapsible className="w-full">
                {faqItemKeys.map((item, index) => (
                  <AccordionItem 
                    key={item.id} 
                    value={item.id}
                    className={index === faqItemKeys.length - 1 ? "border-b-0" : ""}
                  >
                    <AccordionTrigger 
                      className="px-6 py-4 text-left hover:no-underline hover:bg-muted/50 transition-colors"
                      data-testid={`faq-trigger-${index + 1}`}
                    >
                      <span className="font-semibold">{t(`landing.contactPage.faq.questions.${item.key}.question`)}</span>
                    </AccordionTrigger>
                    <AccordionContent 
                      className="px-6 pb-4 text-gray-600 dark:text-gray-400"
                      data-testid={`faq-content-${index + 1}`}
                    >
                      {t(`landing.contactPage.faq.questions.${item.key}.answer`)}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Card>
          </motion.div>

          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center mt-10"
          >
            <p className="text-gray-500 dark:text-gray-400 mb-4 text-sm" data-testid="text-more-questions">
              {t("landing.contactPage.faq.moreQuestions")}
            </p>
            <a href="https://diploy.ticksy.com" target="_blank" rel="noopener noreferrer">
              <Button 
                variant="outline"
                data-testid="button-contact-cta"
              >
                <TicketCheck className="h-4 w-4" />
                {t("landing.contactPage.faq.contactSupport")}
              </Button>
            </a>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
