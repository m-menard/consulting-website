import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Briefcase,
  Users,
  MoreHorizontal,
  Pencil,
  Trash2,
  Pause,
  Play,
  FileText,
  Mail,
  UserCheck,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Filter,
  Loader2,
  Eye,
  PhoneCall,
  Phone,
  Square,
  AlertTriangle,
  Code2,
  Copy,
  Check,
  ExternalLink,
  Globe,
  ChevronDown,
} from "lucide-react";
import { SiIndeed, SiFacebook, SiInstagram, SiTiktok, SiGlassdoor } from "react-icons/si";
import { FaLinkedin } from "react-icons/fa";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from 'react-i18next';


interface Job {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  department: string | null;
  location: string | null;
  locationType: string | null;
  employmentType: string | null;
  experienceLevel: string | null;
  salaryMin: string | null;
  salaryMax: string | null;
  salaryCurrency: string | null;
  source: string | null;
  sourceUrl: string | null;
  requiredSkills: string[] | null;
  preferredSkills: string[] | null;
  minExperienceYears: number | null;
  maxExperienceYears: number | null;
  educationLevel: string | null;
  status: string;
  widgetEnabled: boolean;
  autoCallEnabled: boolean;
  minAiScoreForCall: number;
  callScript: string | null;
  telephonyProvider: string | null;
  callingStatus: string | null;
  callingPhoneNumberId: string | null;
  maxConcurrentCalls: number;
  callRetryAttempts: number;
  retryDelayMinutes: number;
  agentId: string | null;
  totalCalled: number;
  totalCallCompleted: number;
  totalCallFailed: number;
  createdAt: string;
  candidateCount?: number;
  stageCounts?: Record<string, number>;
}

const statusConfig: Record<string, { label: string; colors: string }> = {
  open: { label: "Active", colors: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" },
  closed: { label: "Closed", colors: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700" },
  paused: { label: "Pending", colors: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800" },
  draft: { label: "Draft", colors: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700" },
};

const sourceIcons: Record<string, { icon: typeof FaLinkedin; color: string; bg: string }> = {
  linkedin: { icon: FaLinkedin, color: "text-[#0A66C2]", bg: "bg-[#0A66C2]/10" },
  indeed: { icon: SiIndeed, color: "text-[#2164f3]", bg: "bg-[#2164f3]/10" },
  glassdoor: { icon: SiGlassdoor, color: "text-[#0CAA41]", bg: "bg-[#0CAA41]/10" },
  social_media: { icon: SiFacebook, color: "text-[#1877F2]", bg: "bg-[#1877F2]/10" },
  naukri: { icon: SiIndeed, color: "text-[#4285F4]", bg: "bg-[#4285F4]/10" },
  referral: { icon: Users, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-100 dark:bg-violet-900/30" },
};

const departmentLabels: Record<string, string> = {
  design: "Design Position",
  engineering: "Engineering Position",
  marketing: "Marketing Position",
  development: "Development Position",
  sales: "Sales Position",
  hr: "HR Position",
  finance: "Finance Position",
  operations: "Operations Position",
  product: "Product Position",
};

function getDepartmentLabel(dept: string | null): string {
  if (!dept) return "Open Position";
  const lower = dept.toLowerCase();
  return departmentLabels[lower] || `${dept} Position`;
}

function getSourceDisplayName(source: string | null): string {
  const names: Record<string, string> = {
    linkedin: "LinkedIn",
    indeed: "Indeed",
    naukri: "Naukri",
    glassdoor: "Glassdoor",
    company_website: "Company Website",
    referral: "Referral",
    job_fair: "Job Fair",
    recruitment_agency: "Agency",
    social_media: "Social Media",
    other: "Other",
  };
  return source ? names[source] || source : "Direct";
}

export default function JobsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState("all");
  const [tempStatusFilter, setTempStatusFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [tempSearchText, setTempSearchText] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [callingJob, setCallingJob] = useState<Job | null>(null);

  const [callingForm, setCallingForm] = useState({
    autoCallEnabled: false,
    minAiScoreForCall: 60,
    maxConcurrentCalls: 3,
    callRetryAttempts: 2,
    retryDelayMinutes: 30,
    agentId: "" as string,
  });

  const [form, setForm] = useState({
    title: "",
    description: "",
    department: "",
    location: "",
    locationType: "onsite",
    employmentType: "full_time",
    experienceLevel: "mid",
    salaryMin: "",
    salaryMax: "",
    salaryCurrency: "USD",
    source: "",
    sourceUrl: "",
    requiredSkills: "",
    preferredSkills: "",
    minExperienceYears: "",
    maxExperienceYears: "",
    educationLevel: "any",
    widgetEnabled: true,
    agentId: "",
    aiScreeningThreshold: 50,
    shortlistingThreshold: 70,
    interviewScheduledThreshold: 85
  });

  const { data: jobs = [], isLoading } = useQuery<Job[]>({
    queryKey: ["/api/hr/jobs"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/hr/jobs", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/dashboard"] });
      setIsCreateOpen(false);
      resetForm();
      toast({ title: t('hr.jobs.jobCreated') });
    },
    onError: (error: any) => {
      toast({ title: t('hr.jobs.failedCreate'), description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/hr/jobs/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/dashboard"] });
      setEditJob(null);
      resetForm();
      toast({ title: t('hr.jobs.jobUpdated') });
    },
    onError: (error: any) => {
      toast({ title: t('hr.jobs.failedUpdate'), description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/hr/jobs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/dashboard"] });
      toast({ title: t('hr.jobs.jobDeleted') });
    },
  });

  const { data: agents = [] } = useQuery<{ id: string; name: string; type: string; engineType: string }[]>({
    queryKey: ["/api/agents"],
  });


  const saveCallingConfigMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/hr/jobs/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/jobs"] });
      toast({ title: "Calling configuration saved" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to save calling config", description: error.message, variant: "destructive" });
    },
  });

  const startCallingMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await apiRequest("POST", `/api/hr/jobs/${jobId}/calling/start`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/jobs"] });
      toast({ title: "Auto-calling started" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to start calling", description: error.message, variant: "destructive" });
    },
  });

  const pauseCallingMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await apiRequest("POST", `/api/hr/jobs/${jobId}/calling/pause`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/jobs"] });
      toast({ title: "Auto-calling paused" });
    },
  });

  const stopCallingMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await apiRequest("POST", `/api/hr/jobs/${jobId}/calling/stop`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/jobs"] });
      toast({ title: "Auto-calling stopped" });
    },
  });

  const openCallingDialog = (job: Job) => {
    setCallingJob(job);
    setCallingForm({
      autoCallEnabled: job.autoCallEnabled || false,
      minAiScoreForCall: job.minAiScoreForCall || 60,
      maxConcurrentCalls: job.maxConcurrentCalls || 3,
      callRetryAttempts: job.callRetryAttempts || 2,
      retryDelayMinutes: job.retryDelayMinutes || 30,
      agentId: job.agentId || "",
    });
  };

  const saveCallingConfig = () => {
    if (!callingJob) return;
    saveCallingConfigMutation.mutate({
      id: callingJob.id,
      data: {
        autoCallEnabled: callingForm.autoCallEnabled,
        minAiScoreForCall: callingForm.minAiScoreForCall,
        maxConcurrentCalls: callingForm.maxConcurrentCalls,
        callRetryAttempts: callingForm.callRetryAttempts,
        retryDelayMinutes: callingForm.retryDelayMinutes,
        agentId: callingForm.agentId || null,
      },
    });
  };

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      department: "",
      location: "",
      locationType: "onsite",
      employmentType: "full_time",
      experienceLevel: "mid",
      salaryMin: "",
      salaryMax: "",
      salaryCurrency: "USD",
      source: "",
      sourceUrl: "",
      requiredSkills: "",
      preferredSkills: "",
      minExperienceYears: "",
      maxExperienceYears: "",
      educationLevel: "any",
      widgetEnabled: true,
      agentId: "",
      aiScreeningThreshold: 50,
      shortlistingThreshold: 70,
      interviewScheduledThreshold: 85,
    });
  };

  const openEditDialog = (job: Job) => {
    setEditJob(job);
    setForm({
      title: job.title,
      description: job.description || "",
      department: job.department || "",
      location: job.location || "",
      locationType: job.locationType || "onsite",
      employmentType: job.employmentType || "full_time",
      experienceLevel: job.experienceLevel || "mid",
      salaryMin: job.salaryMin?.toString() || "",
      salaryMax: job.salaryMax?.toString() || "",
      salaryCurrency: job.salaryCurrency || "USD",
      source: job.source || "",
      sourceUrl: job.sourceUrl || "",
      requiredSkills: job.requiredSkills?.join(", ") || "",
      preferredSkills: job.preferredSkills?.join(", ") || "",
      minExperienceYears: job.minExperienceYears?.toString() || "",
      maxExperienceYears: job.maxExperienceYears?.toString() || "",
      educationLevel: job.educationLevel || "any",
      widgetEnabled: job.widgetEnabled,
      agentId: job.agentId || "",
      aiScreeningThreshold: job.aiScreeningThreshold || 50,
      shortlistingThreshold: job.shortlistingThreshold || 70,
      interviewScheduledThreshold: job.interviewScheduledThreshold || 85,
    });
  };

  const handleSubmit = () => {

    const payload = {
      title: form.title,
      description: form.description || null,
      department: form.department || null,
      location: form.location || null,
      locationType: form.locationType,
      employmentType: form.employmentType,
      experienceLevel: form.experienceLevel,
      salaryMin: form.salaryMin || null,
      salaryMax: form.salaryMax || null,
      salaryCurrency: form.salaryCurrency,
      source: form.source || null,
      sourceUrl: form.sourceUrl || null,
      requiredSkills: form.requiredSkills ? form.requiredSkills.split(",").map(s => s.trim()).filter(Boolean) : [],
      preferredSkills: form.preferredSkills ? form.preferredSkills.split(",").map(s => s.trim()).filter(Boolean) : [],
      minExperienceYears: form.minExperienceYears ? parseInt(form.minExperienceYears) : null,
      maxExperienceYears: form.maxExperienceYears ? parseInt(form.maxExperienceYears) : null,
      educationLevel: form.educationLevel === "any" ? null : form.educationLevel,
      widgetEnabled: form.widgetEnabled,
      agentId: form.agentId || null,
      aiScreeningThreshold: form.aiScreeningThreshold,
      shortlistingThreshold: form.shortlistingThreshold,
      interviewScheduledThreshold: form.interviewScheduledThreshold,
    };

    if (editJob) {
      updateMutation.mutate({ id: editJob.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const toggleStatus = (job: Job) => {
    const newStatus = job.status === "open" ? "paused" : "open";
    updateMutation.mutate({ id: job.id, data: { status: newStatus } });
  };

  const toggleJobSelection = (jobId: string) => {
    setSelectedJobs(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const filteredJobs = jobs.filter((job) => {
    // ✅ Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "active" && job.status !== "open") return false;
      if (statusFilter === "pending" && job.status !== "paused") return false;
      if (statusFilter === "draft" && job.status !== "draft") return false;
    }

    // ✅ Case-insensitive search
    if (searchText) {
      const search = searchText.toLowerCase();

      const matches =
        job.title?.toLowerCase().includes(search) ||
        job.department?.toLowerCase().includes(search) ||
        job.location?.toLowerCase().includes(search) ||
        job.description?.toLowerCase().includes(search);

      if (!matches) return false;
    }

    return true;
  });

  const totalApplied = jobs.reduce((sum, j) => sum + (j.candidateCount || 0), 0);
  const totalInterviews = jobs.reduce((sum, j) => {
    const sc = j.stageCounts || {};
    return sum + (sc.interview_scheduled || 0) + (sc.interviewed || 0);
  }, 0);
  const totalHired = jobs.reduce((sum, j) => sum + ((j.stageCounts || {}).hired || 0), 0);

  const formContent = (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t('hr.jobs.jobDetailsSection')}</p>
        <div className="space-y-3">
          <div>
            <Label>{t('hr.jobs.jobTitle')} *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Senior Software Engineer" data-testid="input-job-title" />
          </div>
          <div>
            <Label>{t('hr.jobs.description')}</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Job description and responsibilities..." className="min-h-[100px]" data-testid="input-job-description" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('hr.jobs.department')}</Label>
              <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="e.g. Engineering" data-testid="input-job-department" />
            </div>
            <div>
              <Label>{t('hr.jobs.location')}</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. New York, NY" data-testid="input-job-location" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>{t('hr.jobs.locationType')}</Label>
              <Select value={form.locationType} onValueChange={(v) => setForm({ ...form, locationType: v })}>
                <SelectTrigger data-testid="select-location-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="onsite">{t('hr.jobs.onsite')}</SelectItem>
                  <SelectItem value="remote">{t('hr.jobs.remote')}</SelectItem>
                  <SelectItem value="hybrid">{t('hr.jobs.hybrid')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('hr.jobs.employmentType')}</Label>
              <Select value={form.employmentType} onValueChange={(v) => setForm({ ...form, employmentType: v })}>
                <SelectTrigger data-testid="select-employment-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">{t('hr.jobs.fullTime')}</SelectItem>
                  <SelectItem value="part_time">{t('hr.jobs.partTime')}</SelectItem>
                  <SelectItem value="contract">{t('hr.jobs.contract')}</SelectItem>
                  <SelectItem value="internship">{t('hr.jobs.internship')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('hr.jobs.experienceLevel')}</Label>
              <Select value={form.experienceLevel} onValueChange={(v) => setForm({ ...form, experienceLevel: v })}>
                <SelectTrigger data-testid="select-experience-level"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entry">{t('hr.jobs.entryLevel')}</SelectItem>
                  <SelectItem value="mid">{t('hr.jobs.midLevel')}</SelectItem>
                  <SelectItem value="senior">{t('hr.jobs.seniorLevel')}</SelectItem>
                  <SelectItem value="lead">{t('hr.jobs.leadPrincipal')}</SelectItem>
                  <SelectItem value="executive">{t('hr.jobs.executive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t('hr.jobs.sourcingSection')}</p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('hr.jobs.source')}</Label>
              <Select value={form.source || "none"} onValueChange={(v) => setForm({ ...form, source: v === "none" ? "" : v })}>
                <SelectTrigger data-testid="select-job-source"><SelectValue placeholder={t('hr.jobs.sourcePlaceholder')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">--</SelectItem>
                  <SelectItem value="linkedin">{t('hr.jobs.sourceLinkedin')}</SelectItem>
                  <SelectItem value="indeed">{t('hr.jobs.sourceIndeed')}</SelectItem>
                  <SelectItem value="naukri">{t('hr.jobs.sourceNaukri')}</SelectItem>
                  <SelectItem value="glassdoor">{t('hr.jobs.sourceGlassdoor')}</SelectItem>
                  <SelectItem value="company_website">{t('hr.jobs.sourceCompanyWebsite')}</SelectItem>
                  <SelectItem value="referral">{t('hr.jobs.sourceReferral')}</SelectItem>
                  <SelectItem value="job_fair">{t('hr.jobs.sourceJobFair')}</SelectItem>
                  <SelectItem value="recruitment_agency">{t('hr.jobs.sourceRecruitmentAgency')}</SelectItem>
                  <SelectItem value="social_media">{t('hr.jobs.sourceSocialMedia')}</SelectItem>
                  <SelectItem value="other">{t('hr.jobs.sourceOther')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('hr.jobs.sourceUrl')}</Label>
              <Input value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} placeholder={t('hr.jobs.sourceUrlPlaceholder')} data-testid="input-source-url" />
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t('hr.jobs.compensationSection')}</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>{t('hr.jobs.minSalary')}</Label>
            <Input type="number" value={form.salaryMin} onChange={(e) => setForm({ ...form, salaryMin: e.target.value })} placeholder="50000" data-testid="input-salary-min" />
          </div>
          <div>
            <Label>{t('hr.jobs.maxSalary')}</Label>
            <Input type="number" value={form.salaryMax} onChange={(e) => setForm({ ...form, salaryMax: e.target.value })} placeholder="80000" data-testid="input-salary-max" />
          </div>
          <div>
            <Label>{t('hr.jobs.currency')}</Label>
            <Select value={form.salaryCurrency} onValueChange={(v) => setForm({ ...form, salaryCurrency: v })}>
              <SelectTrigger data-testid="select-currency"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
                <SelectItem value="INR">INR</SelectItem>
                <SelectItem value="AED">AED</SelectItem>
                <SelectItem value="CAD">CAD</SelectItem>
                <SelectItem value="AUD">AUD</SelectItem>
                <SelectItem value="JPY">JPY</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>



      <div>
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t('hr.jobs.requirementsSection')}</p>
        <div className="space-y-3">
          <div>
            <Label>{t('hr.jobs.requiredSkills')}</Label>
            <Input value={form.requiredSkills} onChange={(e) => setForm({ ...form, requiredSkills: e.target.value })} placeholder={t('hr.jobs.requiredSkillsPlaceholder')} data-testid="input-required-skills" />
          </div>
          <div>
            <Label>{t('hr.jobs.preferredSkills')}</Label>
            <Input value={form.preferredSkills} onChange={(e) => setForm({ ...form, preferredSkills: e.target.value })} placeholder={t('hr.jobs.preferredSkillsPlaceholder')} data-testid="input-preferred-skills" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>{t('hr.jobs.minExperience')}</Label>
              <Input type="number" value={form.minExperienceYears} onChange={(e) => setForm({ ...form, minExperienceYears: e.target.value })} placeholder="2" data-testid="input-min-experience" />
            </div>
            <div>
              <Label>{t('hr.jobs.maxExperience')}</Label>
              <Input type="number" value={form.maxExperienceYears} onChange={(e) => setForm({ ...form, maxExperienceYears: e.target.value })} placeholder="8" data-testid="input-max-experience" />
            </div>



            <div>
              <Label>{t('hr.jobs.educationLevel')}</Label>
              <Select value={form.educationLevel} onValueChange={(v) => setForm({ ...form, educationLevel: v })}>
                <SelectTrigger data-testid="select-education-level"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">{t('hr.jobs.anyEducation')}</SelectItem>
                  <SelectItem value="high_school">{t('hr.jobs.highSchool')}</SelectItem>
                  <SelectItem value="bachelors">{t('hr.jobs.bachelors')}</SelectItem>
                  <SelectItem value="masters">{t('hr.jobs.masters')}</SelectItem>
                  <SelectItem value="phd">{t('hr.jobs.phd')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>



      <div>
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          AI Pipeline Thresholds
        </p>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>AI Screening %</Label>
            <Input
              type="number"
              value={form.aiScreeningThreshold}
              onChange={(e) =>
                setForm({ ...form, aiScreeningThreshold: Number(e.target.value) })
              }
              placeholder="50"
            />
          </div>

          <div>
            <Label>Shortlisting %</Label>
            <Input
              type="number"
              value={form.shortlistingThreshold}
              onChange={(e) =>
                setForm({ ...form, shortlistingThreshold: Number(e.target.value) })
              }
              placeholder="70"
            />
          </div>

          <div>
            <Label>Interview %</Label>
            <Input
              type="number"
              value={form.interviewScheduledThreshold}
              onChange={(e) =>
                setForm({ ...form, interviewScheduledThreshold: Number(e.target.value) })
              }
              placeholder="85"
            />
          </div>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Hiring Agent</p>
        <div className="space-y-3">
          <div>
            <Label>Assign AI Agent</Label>
            <p className="text-xs text-muted-foreground mb-1.5">Choose a hiring agent to handle candidate phone interviews for this job.</p>
            <Select value={form.agentId || "none"} onValueChange={(v) => setForm({ ...form, agentId: v === "none" ? "" : v })}>
              <SelectTrigger data-testid="select-job-agent"><SelectValue placeholder="Select an agent..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- No agent assigned --</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name} ({agent.type === 'natural' ? 'Natural' : agent.type === 'flow' ? 'Flow' : agent.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {agents.length === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">No agents found. Create an agent first in the Hiring Agents section.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const filterTabs = [
    { key: "all", label: t('hr.jobs.allHiring') },
    { key: "active", label: t('hr.jobs.active') },
    { key: "pending", label: t('hr.jobs.pending') },
    { key: "draft", label: t('hr.jobs.draft') },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">{t('hr.jobs.openHiring')}</h1>
        <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-job">
              <Plus className="h-4 w-4 mr-2" />
              {t('hr.jobs.addNewJob')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('hr.jobs.createNewJob')}</DialogTitle>
            </DialogHeader>
            {formContent}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>{t('hr.jobs.cancel')}</Button>
              <Button onClick={handleSubmit} disabled={!form.title || createMutation.isPending} data-testid="button-submit-job">
                {createMutation.isPending ? t('hr.jobs.creating') : t('hr.jobs.createJob')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover-elevate" data-testid="card-stat-total-applied">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">{t('hr.jobs.totalApplied')}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-3xl font-bold">{totalApplied}</p>
                  {totalApplied > 0 && (
                    <span className="flex items-center text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <TrendingUp className="h-3 w-3 mr-0.5" />12%
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">+{totalApplied} {t('hr.jobs.fromLastYear')}</p>
              </div>
              <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
                <FileText className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <div className="flex items-center justify-end mt-1">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate" data-testid="card-stat-total-invitation">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">{t('hr.jobs.totalInvitation')}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-3xl font-bold">{totalInterviews}</p>
                  {totalInterviews > 0 && (
                    <span className="flex items-center text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <TrendingUp className="h-3 w-3 mr-0.5" />12%
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">+{totalInterviews} {t('hr.jobs.fromLastYear')}</p>
              </div>
              <div className="p-3 rounded-xl bg-violet-100 dark:bg-violet-900/30">
                <Mail className="h-6 w-6 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
            <div className="flex items-center justify-end mt-1">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate" data-testid="card-stat-total-hiring">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">{t('hr.jobs.totalHiring')}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-3xl font-bold">{totalHired}</p>
                  {totalHired > 0 ? (
                    <span className="flex items-center text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <TrendingUp className="h-3 w-3 mr-0.5" />8%
                    </span>
                  ) : (
                    <span className="flex items-center text-xs text-red-500 dark:text-red-400 font-medium">
                      <TrendingDown className="h-3 w-3 mr-0.5" />0%
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">{totalHired} {t('hr.jobs.fromLastYear')}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                <UserCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div className="flex items-center justify-end mt-1">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hiring Widget Link */}
      <Card data-testid="card-hiring-widget-panel">
        <CardContent className="p-0">
          <div className="flex items-center justify-between gap-3 px-5 py-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                <Globe className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="font-semibold text-sm">Hiring Widget</p>
                <p className="text-xs text-muted-foreground">Embed on your website so candidates can apply &amp; schedule interviews</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLocation("/app/tools/widgets")}
              data-testid="button-manage-widget"
            >
              <ExternalLink className="h-3 w-3 mr-1" /> Manage Widget
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                statusFilter === tab.key
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              data-testid={`button-filter-${tab.key}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <Button variant="outline" data-testid="button-filter">
          <Filter className="h-4 w-4 mr-2" />
          {t('hr.jobs.filter')}
        </Button>
      </div> */}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {filterTabs.map((tab) => (
            <Button
              key={tab.key}
              variant={statusFilter === tab.key ? "default" : "ghost"}
              onClick={() => setStatusFilter(tab.key)}
              data-testid={`button-filter-${tab.key}`}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Popover Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" data-testid="button-filter">
              <Filter className="h-4 w-4 mr-2" />
              {t('hr.jobs.filter')}
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-72" align="end">
            <div className="space-y-4">
              {/* Example filter options */}

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={tempStatusFilter}
                  onValueChange={(value) => setTempStatusFilter(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {filterTabs.map((tab) => (
                      <SelectItem key={tab.key} value={tab.key}>
                        {tab.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Add more filters if needed */}
              <div className="space-y-2">
                <Label>Search</Label>
                <Input
                  placeholder="Search jobs..."
                  value={tempSearchText}
                  onChange={(e) => setTempSearchText(e.target.value)}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  className="flex-1"
                  onClick={() => {
                    setStatusFilter(tempStatusFilter);
                    setSearchText(tempSearchText);
                  }}
                >
                  Apply
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setTempStatusFilter("all");
                    setTempSearchText("");
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {filteredJobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">{t('hr.jobs.noJobsFound')}</h3>
            <p className="text-muted-foreground text-sm mb-4">{t('hr.jobs.createFirstJobDesc')}</p>
            <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-first-job">
              <Plus className="h-4 w-4 mr-2" />
              {t('hr.jobs.createJob')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredJobs.map((job) => {
            const sc = job.stageCounts || {};
            const applied = job.candidateCount || 0;
            const reviewed = (sc.ai_screened || 0) + (sc.shortlisted || 0);
            const interviews = (sc.interview_scheduled || 0) + (sc.interviewed || 0);
            const rejected = sc.rejected || 0;
            const sourceKey = job.source || "";
            const sourceInfo = sourceIcons[sourceKey];
            const SourceIcon = sourceInfo?.icon;
            const statusCfg = statusConfig[job.status] || statusConfig.draft;

            return (
              <Card key={job.id} className="overflow-visible" data-testid={`card-job-${job.id}`}>
                <CardContent className="p-0">
                  <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedJobs.has(job.id)}
                        onCheckedChange={() => toggleJobSelection(job.id)}
                        data-testid={`checkbox-job-${job.id}`}
                      />
                      <span className="text-sm font-medium text-muted-foreground">{getDepartmentLabel(job.department)}</span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-job-menu-${job.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setLocation(`/app/pipeline?jobId=${job.id}`)} data-testid={`menu-view-pipeline-${job.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          {t('hr.jobs.viewPipeline')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(job)} data-testid={`menu-edit-${job.id}`}>
                          <Pencil className="h-4 w-4 mr-2" />
                          {t('hr.jobs.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleStatus(job)} data-testid={`menu-toggle-${job.id}`}>
                          {job.status === "open" ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                          {job.status === "open" ? t('hr.jobs.pause') : t('hr.jobs.resume')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openCallingDialog(job)} data-testid={`menu-calling-${job.id}`}>
                          <PhoneCall className="h-4 w-4 mr-2" />
                          AI Auto-Calling
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteMutation.mutate(job.id)}
                          data-testid={`menu-delete-${job.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t('hr.jobs.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div
                    className="flex items-center gap-3 px-4 pb-3 cursor-pointer"
                    onClick={() => setLocation(`/app/pipeline?jobId=${job.id}`)}
                  >
                    {SourceIcon ? (
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${sourceInfo.bg}`}>
                        <SourceIcon className={`h-5 w-5 ${sourceInfo.color}`} />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-muted">
                        <Briefcase className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate" data-testid={`text-job-title-${job.id}`}>{job.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('hr.jobs.postAt', { source: getSourceDisplayName(job.source) })}
                      </p>
                      {job.agentId && agents.find(a => a.id === job.agentId) && (
                        <p className="text-xs text-indigo-600 dark:text-indigo-400">
                          <Phone className="h-3 w-3 inline mr-0.5" />{agents.find(a => a.id === job.agentId)?.name}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {!job.agentId && (
                        <Badge variant="outline" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800 text-[10px]" data-testid={`badge-no-agent-${job.id}`}>
                          <Phone className="h-3 w-3 mr-0.5" /> No Agent
                        </Badge>
                      )}
                      {job.callingStatus === 'running' && (
                        <Badge variant="outline" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[10px]" data-testid={`badge-calling-${job.id}`}>
                          <PhoneCall className="h-3 w-3 mr-0.5 animate-pulse" /> Calling
                        </Badge>
                      )}
                      {job.callingStatus === 'paused' && (
                        <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800 text-[10px]" data-testid={`badge-calling-${job.id}`}>
                          <Pause className="h-3 w-3 mr-0.5" /> Paused
                        </Badge>
                      )}
                      <Badge variant="outline" className={`${statusCfg.colors} text-xs`} data-testid={`badge-job-status-${job.id}`}>
                        {statusCfg.label}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 border-t">
                    <div className="px-4 py-3 text-center border-r last:border-r-0">
                      <p className="text-[10px] text-muted-foreground leading-tight mb-1">{t('hr.jobs.totalApplied')}</p>
                      <p className="text-sm font-bold">{applied}</p>
                    </div>
                    <div className="px-4 py-3 text-center border-r last:border-r-0">
                      <p className="text-[10px] text-muted-foreground leading-tight mb-1">{t('hr.jobs.totalReviews')}</p>
                      <p className="text-sm font-bold">{reviewed}</p>
                    </div>
                    <div className="px-4 py-3 text-center border-r last:border-r-0">
                      <p className="text-[10px] text-muted-foreground leading-tight mb-1">{t('hr.jobs.totalInterview')}</p>
                      <p className="text-sm font-bold">{interviews}</p>
                    </div>
                    <div className="px-4 py-3 text-center">
                      <p className="text-[10px] text-muted-foreground leading-tight mb-1">{t('hr.jobs.totalReject')}</p>
                      <p className="text-sm font-bold">{rejected}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!editJob} onOpenChange={(open) => { if (!open) { setEditJob(null); resetForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('hr.jobs.editJob')}</DialogTitle>
          </DialogHeader>
          {formContent}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditJob(null); resetForm(); }}>{t('hr.jobs.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={!form.title || updateMutation.isPending} data-testid="button-update-job">
              {updateMutation.isPending ? t('hr.jobs.updating') : t('hr.jobs.updateJob')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!callingJob} onOpenChange={(open) => { if (!open) setCallingJob(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PhoneCall className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              AI Auto-Calling - {callingJob?.title}
            </DialogTitle>
          </DialogHeader>

          {callingJob && (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${callingJob.callingStatus === 'running' ? 'bg-emerald-500 animate-pulse' :
                    callingJob.callingStatus === 'paused' ? 'bg-amber-500' :
                      callingJob.callingStatus === 'completed' ? 'bg-blue-500' : 'bg-slate-400'
                    }`} />
                  <div>
                    <p className="font-medium text-sm">
                      Status: {callingJob.callingStatus === 'running' ? 'Running' :
                        callingJob.callingStatus === 'paused' ? 'Paused' :
                          callingJob.callingStatus === 'completed' ? 'Completed' : 'Idle'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {callingJob.totalCalled || 0} called / {callingJob.totalCallCompleted || 0} completed / {callingJob.totalCallFailed || 0} failed
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {callingJob.callingStatus === 'running' ? (
                    <>
                      <Button variant="outline" size="sm" onClick={() => pauseCallingMutation.mutate(callingJob.id)} disabled={pauseCallingMutation.isPending} data-testid="button-pause-calling">
                        <Pause className="h-4 w-4 mr-1" /> Pause
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => stopCallingMutation.mutate(callingJob.id)} disabled={stopCallingMutation.isPending} data-testid="button-stop-calling">
                        <Square className="h-4 w-4 mr-1" /> Stop
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" onClick={() => startCallingMutation.mutate(callingJob.id)} disabled={startCallingMutation.isPending || !callingForm.autoCallEnabled || !callingForm.agentId} data-testid="button-start-calling">
                      <Play className="h-4 w-4 mr-1" /> Start Calling
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label className="font-medium">Enable Auto-Calling</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Automatically call screened candidates who meet the score threshold</p>
                  </div>
                  <Checkbox
                    checked={callingForm.autoCallEnabled}
                    onCheckedChange={(checked) => setCallingForm(prev => ({ ...prev, autoCallEnabled: !!checked }))}
                    data-testid="checkbox-auto-call-enabled"
                  />
                </div>

                <div>
                  <Label>Min AI Score for Calling</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={callingForm.minAiScoreForCall}
                      onChange={(e) => setCallingForm(prev => ({ ...prev, minAiScoreForCall: parseInt(e.target.value) }))}
                      className="flex-1 accent-indigo-600"
                      data-testid="slider-min-ai-score"
                    />
                    <span className="text-sm font-mono font-medium w-8 text-right">{callingForm.minAiScoreForCall}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Max Concurrent Calls</Label>
                    <Select value={callingForm.maxConcurrentCalls.toString()} onValueChange={(v) => setCallingForm(prev => ({ ...prev, maxConcurrentCalls: parseInt(v) }))}>
                      <SelectTrigger data-testid="select-max-concurrent"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 call</SelectItem>
                        <SelectItem value="2">2 calls</SelectItem>
                        <SelectItem value="3">3 calls</SelectItem>
                        <SelectItem value="5">5 calls</SelectItem>
                        <SelectItem value="10">10 calls</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Retry Attempts</Label>
                    <Select value={callingForm.callRetryAttempts.toString()} onValueChange={(v) => setCallingForm(prev => ({ ...prev, callRetryAttempts: parseInt(v) }))}>
                      <SelectTrigger data-testid="select-retry-attempts"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">No retries</SelectItem>
                        <SelectItem value="1">1 retry</SelectItem>
                        <SelectItem value="2">2 retries</SelectItem>
                        <SelectItem value="3">3 retries</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Retry Delay</Label>
                    <Select value={callingForm.retryDelayMinutes.toString()} onValueChange={(v) => setCallingForm(prev => ({ ...prev, retryDelayMinutes: parseInt(v) }))}>
                      <SelectTrigger data-testid="select-retry-delay"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 minutes</SelectItem>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                        <SelectItem value="360">6 hours</SelectItem>
                        <SelectItem value="1440">24 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {!callingForm.agentId && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                    <p className="text-xs text-red-700 dark:text-red-300">You must assign an AI agent before starting or resuming calls. Select an agent below.</p>
                  </div>
                )}

                <div>
                  <Label>Select AI Agent</Label>
                  <p className="text-xs text-muted-foreground mb-2">Choose an agent to handle phone interviews. The agent's prompt, voice, and settings will be used for calls.</p>
                  <Select value={callingForm.agentId} onValueChange={(v) => setCallingForm(prev => ({ ...prev, agentId: v }))}>
                    <SelectTrigger data-testid="select-calling-agent"><SelectValue placeholder="Select an agent..." /></SelectTrigger>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name} ({agent.type === 'natural' ? 'Natural' : agent.type === 'flow' ? 'Flow' : agent.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {agents.length === 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">No agents found. Create an agent first to enable auto-calling.</p>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setCallingJob(null)}>Cancel</Button>
                <Button onClick={saveCallingConfig} disabled={saveCallingConfigMutation.isPending} data-testid="button-save-calling-config">
                  {saveCallingConfigMutation.isPending ? "Saving..." : "Save Configuration"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
