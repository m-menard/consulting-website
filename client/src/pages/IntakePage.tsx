import { motion, useReducedMotion } from "framer-motion";
import { Loader2, Send, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { SEOHead } from "@/components/landing/SEOHead";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { useBranding } from "@/components/BrandingProvider";
import { useSeoSettings } from "@/hooks/useSeoSettings";
import { cn } from "@/lib/utils";

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "200+"] as const;
const AI_GOALS = [
  "automate_workflows",
  "ai_chatbot",
  "ai_agents",
  "internal_tools",
  "not_sure",
] as const;
const BUDGETS = ["under_5k", "5k_20k", "20k_50k", "50k_plus"] as const;
const TIMELINES = ["asap", "1_3_months", "3_6_months", "flexible"] as const;

const SECTION_KEYS = ["contact", "business", "problem", "aiGoals", "projectDetails"] as const;

const intakeFormSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  linkedinUrl: z.string().optional(),
  companyDescription: z.string().optional(),
  industry: z.string().min(1),
  companySize: z.enum(COMPANY_SIZES).optional(),
  mainProblem: z.string().min(1),
  obstacles: z.string().min(1),
  aiGoals: z.array(z.enum(AI_GOALS)).min(1),
  idealOutcome: z.string().optional(),
  budget: z.enum(BUDGETS).optional(),
  timeline: z.enum(TIMELINES).optional(),
});

type IntakeFormData = z.infer<typeof intakeFormSchema>;

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <span>
      {children}
      <span className="text-red-500 ml-0.5" aria-hidden="true">
        *
      </span>
    </span>
  );
}

function SectionHeader({
  step,
  title,
}: {
  step: number;
  title: string;
}) {
  return (
    <div className="flex items-start gap-4 pb-6 border-b border-slate-100">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#176BD0] text-sm font-bold text-white">
        {step}
      </span>
      <h2 className="text-lg sm:text-xl font-bold text-slate-900 pt-1">{title}</h2>
    </div>
  );
}

function ChipOption({
  selected,
  label,
  onClick,
  id,
}: {
  selected: boolean;
  label: string;
  onClick: () => void;
  id: string;
}) {
  return (
    <button
      type="button"
      id={id}
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-medium transition-all",
        selected
          ? "border-[#176BD0] bg-[#EFF5FF] text-[#176BD0] shadow-sm"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
      )}
    >
      {label}
    </button>
  );
}

function GoalCard({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-all",
        checked
          ? "border-[#176BD0] bg-[#EFF5FF] ring-1 ring-[#176BD0]/20"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80"
      )}
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className="data-[state=checked]:bg-[#176BD0] data-[state=checked]:border-[#176BD0]"
      />
      <span className="text-sm font-medium text-slate-800">{label}</span>
    </label>
  );
}

export default function IntakePage() {
  const { branding } = useBranding();
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: seoSettings } = useSeoSettings();

  const form = useForm<IntakeFormData>({
    resolver: zodResolver(intakeFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      linkedinUrl: "",
      companyDescription: "",
      industry: "",
      mainProblem: "",
      obstacles: "",
      aiGoals: [],
      idealOutcome: "",
    },
  });

  const onSubmit = async (data: IntakeFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to submit form");
      }
      form.reset();
      toast({
        title: t("landing.intakePage.form.successTitle"),
        description: t("landing.intakePage.form.successDescription"),
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : t("landing.intakePage.form.errorDescription");
      toast({
        title: t("landing.intakePage.form.errorTitle"),
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const label = (key: string, required = false) =>
    required ? (
      <RequiredLabel>{t(`landing.intakePage.form.labels.${key}`)}</RequiredLabel>
    ) : (
      t(`landing.intakePage.form.labels.${key}`)
    );

  const inputClassName =
    "h-11 rounded-lg border-slate-200 bg-slate-50/50 focus:bg-white focus-visible:ring-[#176BD0]/30";
  const textareaClassName =
    "min-h-[120px] rounded-lg border-slate-200 bg-slate-50/50 focus:bg-white resize-y focus-visible:ring-[#176BD0]/30";

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-white to-[#EFF5FF]">
      <SEOHead
        title={t("landing.intakePage.seoTitle", { appName: branding.app_name })}
        description={t("landing.intakePage.intro")}
        canonicalUrl={
          seoSettings?.canonicalBaseUrl
            ? `${seoSettings.canonicalBaseUrl}/intake`
            : undefined
        }
        ogImage={seoSettings?.defaultOgImage || undefined}
        keywords={["client intake", "AI consulting", branding.app_name]}
        ogSiteName={branding.app_name}
      />

      <Navbar />

      <section className="pt-24 pb-12 md:pt-28 md:pb-16" data-testid="section-intake-hero">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-5"
          >
            <span className="inline-flex rounded-full border border-[#176BD0]/20 bg-[#EFF5FF] px-4 py-1.5 text-xs font-semibold tracking-wide text-[#176BD0]">
              {t("landing.intakePage.badge")}
            </span>
            <h1
              className="text-3xl md:text-4xl lg:text-[2.75rem] font-bold tracking-tight text-slate-900 leading-tight"
              data-testid="heading-intake"
            >
              {t("landing.intakePage.title", { appName: branding.app_name })}
            </h1>
            <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              {t("landing.intakePage.intro")}
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              {SECTION_KEYS.map((key, index) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-3 py-1 text-xs text-slate-500"
                >
                  <span className="font-semibold text-[#176BD0]">{index + 1}</span>
                  {t(`landing.intakePage.sections.${key}`).replace(/^Section \d+: /, "")}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="pb-20 md:pb-28" data-testid="section-intake-form">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
          >
            <Card className="overflow-hidden border-slate-200/80 shadow-xl shadow-slate-200/50">
              <div className="h-1.5 w-full bg-gradient-to-r from-[#176BD0] via-[#3B82F6] to-[#1E40AF]" />

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="divide-y divide-slate-100"
                  data-testid="form-intake"
                >
                  <div className="p-6 sm:p-8 md:p-10 space-y-6">
                    <SectionHeader step={1} title={t("landing.intakePage.sections.contact")} />
                    <div className="grid sm:grid-cols-2 gap-5">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-700">{label("name", true)}</FormLabel>
                            <FormControl>
                              <Input
                                className={inputClassName}
                                placeholder={t("landing.intakePage.form.placeholders.name")}
                                data-testid="input-intake-name"
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
                            <FormLabel className="text-slate-700">{label("email", true)}</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                className={inputClassName}
                                placeholder={t("landing.intakePage.form.placeholders.email")}
                                data-testid="input-intake-email"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-700">{label("phone")}</FormLabel>
                            <FormControl>
                              <Input
                                type="tel"
                                className={inputClassName}
                                placeholder={t("landing.intakePage.form.placeholders.phone")}
                                data-testid="input-intake-phone"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="linkedinUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-700">{label("linkedinUrl")}</FormLabel>
                            <FormControl>
                              <Input
                                className={inputClassName}
                                placeholder={t("landing.intakePage.form.placeholders.linkedinUrl")}
                                data-testid="input-intake-linkedin"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="p-6 sm:p-8 md:p-10 space-y-6 bg-slate-50/40">
                    <SectionHeader step={2} title={t("landing.intakePage.sections.business")} />
                    <FormField
                      control={form.control}
                      name="companyDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-700">{label("companyDescription")}</FormLabel>
                          <FormDescription className="text-slate-500">
                            {t("landing.intakePage.form.hints.companyDescription")}
                          </FormDescription>
                          <FormControl>
                            <Textarea
                              className={textareaClassName}
                              placeholder={t(
                                "landing.intakePage.form.placeholders.companyDescription"
                              )}
                              data-testid="input-intake-company-description"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="industry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-700">{label("industry", true)}</FormLabel>
                          <FormControl>
                            <Input
                              className={inputClassName}
                              placeholder={t("landing.intakePage.form.placeholders.industry")}
                              data-testid="input-intake-industry"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="companySize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-700">{label("companySize")}</FormLabel>
                          <FormControl>
                            <div
                              className="flex flex-wrap gap-2 pt-1"
                              data-testid="input-intake-company-size"
                            >
                              {COMPANY_SIZES.map((size) => (
                                <ChipOption
                                  key={size}
                                  id={`company-size-${size}`}
                                  label={t(`landing.intakePage.form.options.companySize.${size}`)}
                                  selected={field.value === size}
                                  onClick={() =>
                                    field.onChange(field.value === size ? undefined : size)
                                  }
                                />
                              ))}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="p-6 sm:p-8 md:p-10 space-y-6">
                    <SectionHeader step={3} title={t("landing.intakePage.sections.problem")} />
                    <FormField
                      control={form.control}
                      name="mainProblem"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-700">{label("mainProblem", true)}</FormLabel>
                          <FormControl>
                            <Textarea
                              className={textareaClassName}
                              data-testid="input-intake-main-problem"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="obstacles"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-700">{label("obstacles", true)}</FormLabel>
                          <FormControl>
                            <Textarea
                              className={textareaClassName}
                              data-testid="input-intake-obstacles"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="p-6 sm:p-8 md:p-10 space-y-6 bg-slate-50/40">
                    <SectionHeader step={4} title={t("landing.intakePage.sections.aiGoals")} />
                    <FormField
                      control={form.control}
                      name="aiGoals"
                      render={() => (
                        <FormItem>
                          <FormLabel className="text-slate-700">{label("aiGoals", true)}</FormLabel>
                          <div className="grid sm:grid-cols-2 gap-3 pt-1">
                            {AI_GOALS.map((goal) => (
                              <FormField
                                key={goal}
                                control={form.control}
                                name="aiGoals"
                                render={({ field }) => (
                                  <GoalCard
                                    id={`ai-goal-${goal}`}
                                    label={t(`landing.intakePage.form.options.aiGoals.${goal}`)}
                                    checked={field.value?.includes(goal)}
                                    onCheckedChange={(checked) => {
                                      const next = checked
                                        ? [...(field.value ?? []), goal]
                                        : (field.value ?? []).filter((v) => v !== goal);
                                      field.onChange(next);
                                    }}
                                  />
                                )}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="idealOutcome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-700">{label("idealOutcome")}</FormLabel>
                          <FormControl>
                            <Textarea
                              className={textareaClassName}
                              data-testid="input-intake-ideal-outcome"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="p-6 sm:p-8 md:p-10 space-y-6">
                    <SectionHeader
                      step={5}
                      title={t("landing.intakePage.sections.projectDetails")}
                    />
                    <FormField
                      control={form.control}
                      name="budget"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-700">{label("budget")}</FormLabel>
                          <FormControl>
                            <div
                              className="flex flex-wrap gap-2 pt-1"
                              data-testid="input-intake-budget"
                            >
                              {BUDGETS.map((budget) => (
                                <ChipOption
                                  key={budget}
                                  id={`budget-${budget}`}
                                  label={t(`landing.intakePage.form.options.budget.${budget}`)}
                                  selected={field.value === budget}
                                  onClick={() =>
                                    field.onChange(field.value === budget ? undefined : budget)
                                  }
                                />
                              ))}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="timeline"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-700">{label("timeline")}</FormLabel>
                          <FormControl>
                            <div
                              className="flex flex-wrap gap-2 pt-1"
                              data-testid="input-intake-timeline"
                            >
                              {TIMELINES.map((timeline) => (
                                <ChipOption
                                  key={timeline}
                                  id={`timeline-${timeline}`}
                                  label={t(`landing.intakePage.form.options.timeline.${timeline}`)}
                                  selected={field.value === timeline}
                                  onClick={() =>
                                    field.onChange(
                                      field.value === timeline ? undefined : timeline
                                    )
                                  }
                                />
                              ))}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="p-6 sm:p-8 md:p-10 bg-slate-50 border-t border-slate-100 space-y-4">
                    <Button
                      type="submit"
                      size="lg"
                      disabled={isSubmitting}
                      className="w-full h-12 text-base font-semibold bg-[#176BD0] hover:bg-[#1259B0] rounded-xl shadow-lg shadow-blue-500/20"
                      data-testid="button-submit-intake"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          {t("landing.intakePage.form.submitting")}
                        </>
                      ) : (
                        <>
                          <Send className="h-5 w-5" />
                          {t("landing.intakePage.form.submit")}
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-slate-500 text-center flex items-center justify-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 shrink-0" />
                      {t("landing.intakePage.form.privacyNotice")}
                    </p>
                  </div>
                </form>
              </Form>
            </Card>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
