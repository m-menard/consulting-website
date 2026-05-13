import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Users,
  FileText,
  Plus,
  MoreHorizontal,
  Trash2,
  Eye,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  ArrowRight,
  X,
  Download,
  Search,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from 'react-i18next';

interface Candidate {
  id: string;
  jobId: string;
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  linkedinUrl: string | null;
  introduction: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  currentLocation: string | null;
  currentCompany: string | null;
  currentDesignation: string | null;
  totalExperienceYears: number | null;
  expectedSalary: string | null;
  currentSalary: string | null;
  noticePeriod: string | null;
  skills: string[] | null;
  hobbies: string[] | null;
  education: { degree: string; institution: string; field?: string; startYear?: number; endYear?: number; grade?: string }[] | null;
  workExperience: { company: string; role: string; startDate?: string; endDate?: string; duration?: string; description?: string; location?: string }[] | null;
  certifications: string[] | null;
  languages: string[] | null;
  pipelineStage: string;
  aiScore: number | null;
  aiSkillsScore: number | null;
  aiExperienceScore: number | null;
  aiEducationScore: number | null;
  aiSummary: string | null;
  aiStrengths: string[] | null;
  aiWeaknesses: string[] | null;
  aiRecommendation: string | null;
  cvFileName: string | null;
  tags: string[] | null;
  notes: string | null;
  source: string | null;
  parsedData?: any;
  createdAt: string;
  jobTitle?: string;
}

interface Job {
  id: string;
  title: string;
}

interface EducationEntry {
  degree: string;
  institution: string;
  field: string;
  year: string;
}

interface ExperienceEntry {
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
}

const stageToTab: Record<string, string> = {
  uploaded: "new",
  ai_screened: "in_review",
  shortlisted: "assessment",
  interview_scheduled: "interview",
  interviewed: "interview",
  hired: "offered",
  rejected: "rejected",
};

const avatarColors = [
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function getScoreColor(score: number): { dot: string; text: string } {
  if (score >= 80) return { dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" };
  if (score >= 60) return { dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" };
  if (score >= 40) return { dot: "bg-orange-500", text: "text-orange-600 dark:text-orange-400" };
  return { dot: "bg-red-500", text: "text-red-600 dark:text-red-400" };
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  jobId: "",
  dateOfBirth: "",
  gender: "",
  currentLocation: "",
  linkedinUrl: "",
  introduction: "",
  currentCompany: "",
  currentDesignation: "",
  totalExperienceYears: "",
  noticePeriod: "",
  currentSalary: "",
  expectedSalary: "",
  skills: "",
  certifications: "",
  languages: "",
  hobbies: "",
  tags: "",
  notes: "",
};

const emptyEducation: EducationEntry = { degree: "", institution: "", field: "", year: "" };
const emptyExperience: ExperienceEntry = { company: "", role: "", startDate: "", endDate: "", description: "" };

function splitComma(val: string): string[] {
  return val.split(",").map((s) => s.trim()).filter(Boolean);
}

export default function CandidatesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [jobFilter, setJobFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editCandidateId, setEditCandidateId] = useState<string | null>(null);
  const [viewCandidate, setViewCandidate] = useState<Candidate | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [educationEntries, setEducationEntries] = useState<EducationEntry[]>([]);
  const [experienceEntries, setExperienceEntries] = useState<ExperienceEntry[]>([]);
  const [bulkStage, setBulkStage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [advancedFilters, setAdvancedFilters] = useState({
    aiScoreMin: "",
    aiScoreMax: "",
    experienceMin: "",
    experienceMax: "",
    source: "all",
    location: "",
  });
  const [appliedFilters, setAppliedFilters] = useState({
    aiScoreMin: "",
    aiScoreMax: "",
    experienceMin: "",
    experienceMax: "",
    source: "all",
    location: "",
  });

  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: ["/api/hr/jobs"],
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [jobFilter, debouncedSearchQuery, appliedFilters, stageFilter]);

  const candidatesUrl = useMemo(() => {
    const params = new URLSearchParams();

    if (jobFilter) {
      params.set("jobId", jobFilter);
    }

    if (debouncedSearchQuery) {
      params.set("search", debouncedSearchQuery);
    }

    if (appliedFilters.aiScoreMin) {
      params.set("aiScoreMin", appliedFilters.aiScoreMin);
    }

    if (appliedFilters.aiScoreMax) {
      params.set("aiScoreMax", appliedFilters.aiScoreMax);
    }

    if (appliedFilters.experienceMin) {
      params.set("experienceMin", appliedFilters.experienceMin);
    }

    if (appliedFilters.experienceMax) {
      params.set("experienceMax", appliedFilters.experienceMax);
    }

    if (appliedFilters.source && appliedFilters.source !== "all") {
      params.set("source", appliedFilters.source);
    }

    if (appliedFilters.location.trim()) {
      params.set("location", appliedFilters.location.trim());
    }

    const queryString = params.toString();
    return queryString ? `/api/hr/candidates?${queryString}` : "/api/hr/candidates";
  }, [appliedFilters, debouncedSearchQuery, jobFilter]);

  const { data: candidates = [], isLoading } = useQuery<Candidate[]>({
    queryKey: [candidatesUrl],
  });

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEducationEntries([]);
    setExperienceEntries([]);
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/hr/candidates", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith("/api/hr/candidates") });
      setIsAddOpen(false);
      resetForm();
      toast({ title: t('hr.candidates.candidateAdded') });
    },
    onError: (error: any) => {
      toast({ title: t('hr.candidates.failedAdd'), description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/hr/candidates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith("/api/hr/candidates") });
      toast({ title: t('hr.candidates.candidateRemoved') });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/hr/candidates/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith("/api/hr/candidates") });
      setIsEditOpen(false);
      setEditCandidateId(null);
      resetForm();
      toast({ title: t('hr.candidates.candidateUpdated') });
    },
    onError: (error: any) => {
      toast({ title: t('hr.candidates.failedUpdate'), description: error.message, variant: "destructive" });
    },
  });

  const bulkMoveMutation = useMutation({
    mutationFn: async ({ ids, stage }: { ids: string[]; stage: string }) => {
      await Promise.all(ids.map((id) => apiRequest("PATCH", `/api/hr/candidates/${id}/stage`, { stage })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith("/api/hr/candidates") });
      setSelectedCandidates(new Set());
      setBulkStage("");
      toast({ title: t('hr.candidates.bulkMoveSuccess', 'Candidates moved successfully') });
    },
    onError: (error: any) => {
      toast({ title: t('hr.candidates.bulkMoveFailed', 'Failed to move candidates'), description: error.message, variant: "destructive" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => apiRequest("DELETE", `/api/hr/candidates/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith("/api/hr/candidates") });
      setSelectedCandidates(new Set());
      toast({ title: t('hr.candidates.bulkDeleteSuccess', 'Candidates deleted successfully') });
    },
    onError: (error: any) => {
      toast({ title: t('hr.candidates.bulkDeleteFailed', 'Failed to delete candidates'), description: error.message, variant: "destructive" });
    },
  });

  const openEditDialog = (candidate: Candidate) => {
    setEditCandidateId(candidate.id);
    setForm({
      firstName: candidate.firstName,
      lastName: candidate.lastName || "",
      email: candidate.email,
      phone: candidate.phone || "",
      jobId: candidate.jobId,
      dateOfBirth: candidate.dateOfBirth || "",
      gender: candidate.gender || "",
      currentLocation: candidate.currentLocation || "",
      linkedinUrl: candidate.linkedinUrl || "",
      introduction: candidate.introduction || "",
      currentCompany: candidate.currentCompany || "",
      currentDesignation: candidate.currentDesignation || "",
      totalExperienceYears: candidate.totalExperienceYears !== null ? String(candidate.totalExperienceYears) : "",
      noticePeriod: candidate.noticePeriod || "",
      currentSalary: candidate.currentSalary || "",
      expectedSalary: candidate.expectedSalary || "",
      skills: candidate.skills?.join(", ") || "",
      certifications: candidate.certifications?.join(", ") || "",
      languages: candidate.languages?.join(", ") || "",
      hobbies: candidate.hobbies?.join(", ") || "",
      tags: candidate.tags?.join(", ") || "",
      notes: candidate.notes || "",
    });
    setEducationEntries(
      candidate.education?.map((e) => ({
        degree: e.degree || "",
        institution: e.institution || "",
        field: e.field || "",
        year: e.endYear ? String(e.endYear) : "",
      })) || []
    );
    setExperienceEntries(
      candidate.workExperience?.map((e) => ({
        company: e.company || "",
        role: e.role || "",
        startDate: e.startDate || "",
        endDate: e.endDate || "",
        description: e.description || "",
      })) || []
    );
    setIsEditOpen(true);
  };

  const handleEditSubmit = () => {
    if (!editCandidateId) return;
    const payload: any = {
      firstName: form.firstName,
      lastName: form.lastName || null,
      email: form.email,
      phone: form.phone || null,
      jobId: form.jobId,
      dateOfBirth: form.dateOfBirth || null,
      gender: form.gender || null,
      currentLocation: form.currentLocation || null,
      linkedinUrl: form.linkedinUrl || null,
      introduction: form.introduction || null,
      currentCompany: form.currentCompany || null,
      currentDesignation: form.currentDesignation || null,
      totalExperienceYears: form.totalExperienceYears ? Number(form.totalExperienceYears) : null,
      noticePeriod: form.noticePeriod || null,
      currentSalary: form.currentSalary || null,
      expectedSalary: form.expectedSalary || null,
      skills: form.skills ? splitComma(form.skills) : null,
      certifications: form.certifications ? splitComma(form.certifications) : null,
      languages: form.languages ? splitComma(form.languages) : null,
      hobbies: form.hobbies ? splitComma(form.hobbies) : null,
      tags: form.tags ? splitComma(form.tags) : null,
      notes: form.notes || null,
      education: educationEntries.length > 0 ? educationEntries.filter((e) => e.degree || e.institution).map((e) => ({
        degree: e.degree,
        institution: e.institution,
        field: e.field || undefined,
        endYear: e.year ? Number(e.year) : undefined,
      })) : null,
      workExperience: experienceEntries.length > 0 ? experienceEntries.filter((e) => e.company || e.role).map((e) => ({
        company: e.company,
        role: e.role,
        startDate: e.startDate || undefined,
        endDate: e.endDate || undefined,
        description: e.description || undefined,
      })) : null,
    };
    updateMutation.mutate({ id: editCandidateId, data: payload });
  };

  const handleSubmit = () => {
    const payload: any = {
      firstName: form.firstName,
      lastName: form.lastName || null,
      email: form.email,
      phone: form.phone || null,
      jobId: form.jobId,
      dateOfBirth: form.dateOfBirth || null,
      gender: form.gender || null,
      currentLocation: form.currentLocation || null,
      linkedinUrl: form.linkedinUrl || null,
      introduction: form.introduction || null,
      currentCompany: form.currentCompany || null,
      currentDesignation: form.currentDesignation || null,
      totalExperienceYears: form.totalExperienceYears ? Number(form.totalExperienceYears) : null,
      noticePeriod: form.noticePeriod || null,
      currentSalary: form.currentSalary || null,
      expectedSalary: form.expectedSalary || null,
      skills: form.skills ? splitComma(form.skills) : null,
      certifications: form.certifications ? splitComma(form.certifications) : null,
      languages: form.languages ? splitComma(form.languages) : null,
      hobbies: form.hobbies ? splitComma(form.hobbies) : null,
      tags: form.tags ? splitComma(form.tags) : null,
      notes: form.notes || null,
      education: educationEntries.length > 0 ? educationEntries.filter((e) => e.degree || e.institution).map((e) => ({
        degree: e.degree,
        institution: e.institution,
        field: e.field || undefined,
        endYear: e.year ? Number(e.year) : undefined,
      })) : null,
      workExperience: experienceEntries.length > 0 ? experienceEntries.filter((e) => e.company || e.role).map((e) => ({
        company: e.company,
        role: e.role,
        startDate: e.startDate || undefined,
        endDate: e.endDate || undefined,
        description: e.description || undefined,
      })) : null,
    };
    createMutation.mutate(payload);
  };

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { all: candidates.length, new: 0, in_review: 0, assessment: 0, interview: 0, offered: 0, rejected: 0 };
    candidates.forEach((c) => {
      const tab = stageToTab[c.pipelineStage] || "new";
      counts[tab] = (counts[tab] || 0) + 1;
    });
    return counts;
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    let result = candidates;

    if (stageFilter !== "all") {
      result = result.filter((c) => {
        const tab = stageToTab[c.pipelineStage] || "new";
        return tab === stageFilter;
      });
    }

    return result;
  }, [candidates, stageFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCandidates.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedCandidates = filteredCandidates.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleCandidate = (id: string) => {
    setSelectedCandidates((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedCandidates.size === paginatedCandidates.length) {
      setSelectedCandidates(new Set());
    } else {
      setSelectedCandidates(new Set(paginatedCandidates.map((c) => c.id)));
    }
  };

  const selectedJob = jobs.find((j) => j.id === jobFilter);

  const filterTabs = [
    { key: "all", label: t('hr.candidates.allCandidates'), count: stageCounts.all },
    { key: "new", label: t('hr.candidates.new'), count: stageCounts.new },
    { key: "in_review", label: t('hr.candidates.inReview'), count: stageCounts.in_review },
    { key: "assessment", label: t('hr.candidates.assessment'), count: stageCounts.assessment },
    { key: "interview", label: t('hr.candidates.interview'), count: stageCounts.interview },
    { key: "offered", label: t('hr.candidates.offered'), count: stageCounts.offered },
  ];

  const getPaginationNumbers = (): (number | "...")[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "...")[] = [];
    if (safePage <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push("...");
      pages.push(totalPages);
    } else if (safePage >= totalPages - 3) {
      pages.push(1);
      pages.push("...");
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push("...");
      pages.push(safePage - 1);
      pages.push(safePage);
      pages.push(safePage + 1);
      pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  const updateEducation = (index: number, field: keyof EducationEntry, value: string) => {
    setEducationEntries((prev) => prev.map((e, i) => i === index ? { ...e, [field]: value } : e));
  };

  const updateExperience = (index: number, field: keyof ExperienceEntry, value: string) => {
    setExperienceEntries((prev) => prev.map((e, i) => i === index ? { ...e, [field]: value } : e));
  };

  const handleExportCSV = () => {
    const headers = ["Name", "Email", "Phone", "Job", "Stage", "AI Score", "Experience Years", "Current Company", "Location", "Skills", "Applied Date"];
    const escapeCSV = (val: string) => {
      if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };
    const rows = filteredCandidates.map((c) => {
      const jobTitle = jobs.find((j) => j.id === c.jobId)?.title || c.jobTitle || "";
      return [
        escapeCSV(`${c.firstName} ${c.lastName || ""}`.trim()),
        escapeCSV(c.email || ""),
        escapeCSV(c.phone || ""),
        escapeCSV(jobTitle),
        escapeCSV(c.pipelineStage || ""),
        c.aiScore !== null ? String(c.aiScore) : "",
        c.totalExperienceYears !== null ? String(c.totalExperienceYears) : "",
        escapeCSV(c.currentCompany || ""),
        escapeCSV(c.currentLocation || ""),
        escapeCSV((c.skills || []).join("; ")),
        c.createdAt ? new Date(c.createdAt).toISOString().split("T")[0] : "",
      ].join(",");
    });
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];
    link.href = url;
    link.download = `candidates-export-${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: t('hr.candidates.exportSuccess', 'CSV exported successfully') });
  };

  const handleApplyFilters = () => {
    setAppliedFilters({ ...advancedFilters });
    setPage(1);
  };

  const handleClearFilters = () => {
    const cleared = { aiScoreMin: "", aiScoreMax: "", experienceMin: "", experienceMax: "", source: "all", location: "" };
    setAdvancedFilters(cleared);
    setAppliedFilters(cleared);
    setPage(1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t('hr.candidates.title')}</h1>
          {selectedJob && (
            <>
              <span className="text-2xl text-muted-foreground font-light">/</span>
              <span className="text-2xl text-muted-foreground" data-testid="text-job-title">{selectedJob.title}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('hr.candidates.searchPlaceholder', 'Search candidates...')}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="pl-9 w-[220px]"
              data-testid="input-search-candidates"
            />
          </div>
          <Select value={jobFilter || "all"} onValueChange={(v) => { setJobFilter(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger className="w-[220px]" data-testid="select-job-filter">
              <SelectValue placeholder={t('hr.candidates.allJobs')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('hr.candidates.allJobs')}</SelectItem>
              {jobs.map((job) => (
                <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportCSV} data-testid="button-export-csv">
            <Download className="h-4 w-4 mr-2" />
            {t('hr.candidates.exportCSV', 'Export CSV')}
          </Button>
          <Button onClick={() => setIsAddOpen(true)} data-testid="button-add-candidate">
            <Plus className="h-4 w-4 mr-2" />
            {t('hr.candidates.addCandidate')}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1 overflow-x-auto">
          {filterTabs.map((tab) => (
            <Button
              key={tab.key}
              variant={stageFilter === tab.key ? "default" : "ghost"}
              onClick={() => { setStageFilter(tab.key); setPage(1); }}
              data-testid={`button-filter-${tab.key}`}
            >
              {tab.label} ({tab.count})
            </Button>
          ))}
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" data-testid="button-filter">
              <Filter className="h-4 w-4 mr-2" />
              {t('hr.candidates.filter')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('hr.candidates.aiScoreRange', 'AI Score Range')}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder={t('hr.candidates.min', 'Min')}
                    value={advancedFilters.aiScoreMin}
                    onChange={(e) => setAdvancedFilters((prev) => ({ ...prev, aiScoreMin: e.target.value }))}
                    data-testid="input-filter-ai-score-min"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="number"
                    placeholder={t('hr.candidates.max', 'Max')}
                    value={advancedFilters.aiScoreMax}
                    onChange={(e) => setAdvancedFilters((prev) => ({ ...prev, aiScoreMax: e.target.value }))}
                    data-testid="input-filter-ai-score-max"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('hr.candidates.experienceRange', 'Experience Range (Years)')}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder={t('hr.candidates.min', 'Min')}
                    value={advancedFilters.experienceMin}
                    onChange={(e) => setAdvancedFilters((prev) => ({ ...prev, experienceMin: e.target.value }))}
                    data-testid="input-filter-experience-min"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="number"
                    placeholder={t('hr.candidates.max', 'Max')}
                    value={advancedFilters.experienceMax}
                    onChange={(e) => setAdvancedFilters((prev) => ({ ...prev, experienceMax: e.target.value }))}
                    data-testid="input-filter-experience-max"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('hr.candidates.source', 'Source')}</Label>
                <Select value={advancedFilters.source} onValueChange={(v) => setAdvancedFilters((prev) => ({ ...prev, source: v }))}>
                  <SelectTrigger data-testid="select-filter-source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('hr.candidates.allSources', 'All Sources')}</SelectItem>
                    <SelectItem value="upload">{t('hr.candidates.sourceUpload', 'Upload')}</SelectItem>
                    <SelectItem value="application">{t('hr.candidates.sourceApplication', 'Application')}</SelectItem>
                    <SelectItem value="manual">{t('hr.candidates.sourceManual', 'Manual')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('hr.candidates.location', 'Location')}</Label>
                <Input
                  placeholder={t('hr.candidates.locationPlaceholder', 'Filter by location...')}
                  value={advancedFilters.location}
                  onChange={(e) => setAdvancedFilters((prev) => ({ ...prev, location: e.target.value }))}
                  data-testid="input-filter-location"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleApplyFilters} className="flex-1" data-testid="button-apply-filters">
                  {t('hr.candidates.applyFilters', 'Apply Filters')}
                </Button>
                <Button variant="outline" onClick={handleClearFilters} className="flex-1" data-testid="button-clear-filters">
                  {t('hr.candidates.clearFilters', 'Clear Filters')}
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {filteredCandidates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">{t('hr.candidates.noCandidatesFound')}</h3>
            <p className="text-muted-foreground text-sm">{t('hr.candidates.noCandidatesDesc')}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-2 px-5 py-4 border-b">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-semibold" data-testid="text-candidates-list-title">{t('hr.candidates.candidatesList')}</h2>
              </div>
              <Button variant="ghost" size="icon" data-testid="button-list-menu">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 pl-5">
                    <Checkbox
                      checked={paginatedCandidates.length > 0 && selectedCandidates.size === paginatedCandidates.length}
                      onCheckedChange={toggleAll}
                      data-testid="checkbox-select-all"
                    />
                  </TableHead>
                  <TableHead>{t('hr.candidates.name')}</TableHead>
                  <TableHead>{t('hr.candidates.matchScore')}</TableHead>
                  <TableHead>{t('hr.candidates.resume')}</TableHead>
                  <TableHead>{t('hr.candidates.appliedAt')}</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCandidates.map((candidate) => {
                  const fullName = `${candidate.firstName} ${candidate.lastName || ""}`.trim();
                  const initials = `${candidate.firstName[0]}${candidate.lastName?.[0] || ""}`.toUpperCase();
                  const colorClass = getAvatarColor(fullName);
                  const score = candidate.aiScore;
                  const scoreColor = score !== null ? getScoreColor(score) : null;

                  return (
                    <TableRow key={candidate.id} data-testid={`row-candidate-${candidate.id}`}>
                      <TableCell className="pl-5">
                        <Checkbox
                          checked={selectedCandidates.has(candidate.id)}
                          onCheckedChange={() => toggleCandidate(candidate.id)}
                          data-testid={`checkbox-candidate-${candidate.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className={colorClass}>{initials}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium" data-testid={`text-candidate-name-${candidate.id}`}>{fullName}</span>
                          {(candidate as any).appliedInOtherJobs && (
                            <Badge variant="secondary" className="text-xs" data-testid={`badge-cross-job-${candidate.id}`}>Applied in other jobs</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {score !== null && scoreColor ? (
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${scoreColor.dot}`} />
                            <span className={`font-medium ${scoreColor.text}`}>{score}%</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {candidate.cvFileName ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-indigo-600 dark:text-indigo-400"
                            onClick={() => setViewCandidate(candidate)}
                            data-testid={`link-view-resume-${candidate.id}`}
                          >
                            <FileText className="h-4 w-4 mr-1.5" />
                            {t('hr.candidates.viewResume')}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">{t('hr.candidates.noResume')}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{formatDate(candidate.createdAt)}</span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" data-testid={`button-candidate-actions-${candidate.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewCandidate(candidate)} data-testid={`menu-view-${candidate.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              {t('hr.candidates.viewDetails')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(candidate)} data-testid={`menu-edit-${candidate.id}`}>
                              <Pencil className="h-4 w-4 mr-2" />
                              {t('hr.candidates.editCandidate')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setLocation(`/app/pipeline?jobId=${candidate.jobId}`)} data-testid={`menu-pipeline-${candidate.id}`}>
                              <FileText className="h-4 w-4 mr-2" />
                              {t('hr.candidates.viewInPipeline')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteMutation.mutate(candidate.id)}
                              className="text-destructive focus:text-destructive"
                              data-testid={`menu-delete-${candidate.id}`}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('hr.candidates.remove')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between gap-4 px-5 py-4 border-t flex-wrap">
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={safePage <= 1}
                  onClick={() => setPage(safePage - 1)}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {getPaginationNumbers().map((p, i) =>
                  p === "..." ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground text-sm">...</span>
                  ) : (
                    <Button
                      key={p}
                      variant={safePage === p ? "default" : "outline"}
                      size="icon"
                      onClick={() => setPage(p as number)}
                      data-testid={`button-page-${p}`}
                    >
                      {p}
                    </Button>
                  )
                )}
                <Button
                  variant="outline"
                  size="icon"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(safePage + 1)}
                  data-testid="button-next-page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{t('hr.candidates.show')}</span>
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                  <SelectTrigger className="w-[70px]" data-testid="select-page-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span>{t('hr.candidates.from')} {filteredCandidates.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isAddOpen} onOpenChange={(open) => { if (!open) { setIsAddOpen(false); resetForm(); } else { setIsAddOpen(true); } }}>
        <DialogContent className="max-w-2xl" data-testid="dialog-add-candidate">
          <DialogHeader>
            <DialogTitle>{t('hr.candidates.addCandidate')}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="personal" data-testid="tabs-add-candidate">
            <TabsList className="w-full" data-testid="tablist-add-candidate">
              <TabsTrigger value="personal" data-testid="tab-personal-info">{t('hr.candidates.personalInfo')}</TabsTrigger>
              <TabsTrigger value="professional" data-testid="tab-professional">{t('hr.candidates.professional')}</TabsTrigger>
              <TabsTrigger value="skills" data-testid="tab-skills-education">{t('hr.candidates.skillsEducation')}</TabsTrigger>
              <TabsTrigger value="experience" data-testid="tab-experience-other">{t('hr.candidates.experienceOther')}</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" data-testid="tabcontent-personal">
              <div className="space-y-4">
                <div>
                  <Label>{t('hr.candidates.job')} *</Label>
                  <Select value={form.jobId} onValueChange={(v) => setForm({ ...form, jobId: v })}>
                    <SelectTrigger data-testid="select-candidate-job">
                      <SelectValue placeholder={t('hr.candidates.selectJob')} />
                    </SelectTrigger>
                    <SelectContent>
                      {/* {jobs.map((job) => (
                        <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
                      ))} */}

                      {jobs
                        .filter((job) => job.status === "open")
                        .map((job) => (
                          <SelectItem key={job.id} value={job.id}>
                            {job.title}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('hr.candidates.firstName')} *</Label>
                    <Input
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      data-testid="input-candidate-firstname"
                    />
                  </div>
                  <div>
                    <Label>{t('hr.candidates.lastName')}</Label>
                    <Input
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      data-testid="input-candidate-lastname"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('hr.candidates.email')} *</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      data-testid="input-candidate-email"
                    />
                  </div>
                  <div>
                    <Label>{t('hr.candidates.phone')}</Label>
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      data-testid="input-candidate-phone"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('hr.candidates.dateOfBirth')}</Label>
                    <Input
                      value={form.dateOfBirth}
                      onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                      data-testid="input-candidate-dob"
                    />
                  </div>
                  <div>
                    <Label>{t('hr.candidates.gender')}</Label>
                    <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                      <SelectTrigger data-testid="select-candidate-gender">
                        <SelectValue placeholder={t('hr.candidates.gender')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">{t('hr.candidates.male')}</SelectItem>
                        <SelectItem value="female">{t('hr.candidates.female')}</SelectItem>
                        <SelectItem value="other">{t('hr.candidates.other')}</SelectItem>
                        <SelectItem value="prefer_not_to_say">{t('hr.candidates.preferNotToSay')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>{t('hr.candidates.currentLocation')}</Label>
                  <Input
                    value={form.currentLocation}
                    onChange={(e) => setForm({ ...form, currentLocation: e.target.value })}
                    data-testid="input-candidate-location"
                  />
                </div>
                <div>
                  <Label>{t('hr.candidates.linkedinUrl')}</Label>
                  <Input
                    value={form.linkedinUrl}
                    onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
                    data-testid="input-candidate-linkedin"
                  />
                </div>
                <div>
                  <Label>{t('hr.candidates.introduction')}</Label>
                  <Textarea
                    value={form.introduction}
                    onChange={(e) => setForm({ ...form, introduction: e.target.value })}
                    className="resize-none"
                    rows={3}
                    data-testid="textarea-candidate-introduction"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="professional" data-testid="tabcontent-professional">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('hr.candidates.currentCompany')}</Label>
                    <Input
                      value={form.currentCompany}
                      onChange={(e) => setForm({ ...form, currentCompany: e.target.value })}
                      data-testid="input-candidate-company"
                    />
                  </div>
                  <div>
                    <Label>{t('hr.candidates.currentDesignation')}</Label>
                    <Input
                      value={form.currentDesignation}
                      onChange={(e) => setForm({ ...form, currentDesignation: e.target.value })}
                      data-testid="input-candidate-designation"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('hr.candidates.totalExperience')}</Label>
                    <Input
                      type="number"
                      value={form.totalExperienceYears}
                      onChange={(e) => setForm({ ...form, totalExperienceYears: e.target.value })}
                      data-testid="input-candidate-experience"
                    />
                  </div>
                  <div>
                    <Label>{t('hr.candidates.noticePeriod')}</Label>
                    <Input
                      value={form.noticePeriod}
                      onChange={(e) => setForm({ ...form, noticePeriod: e.target.value })}
                      data-testid="input-candidate-notice"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('hr.candidates.currentSalary')}</Label>
                    <Input
                      value={form.currentSalary}
                      onChange={(e) => setForm({ ...form, currentSalary: e.target.value })}
                      data-testid="input-candidate-current-salary"
                    />
                  </div>
                  <div>
                    <Label>{t('hr.candidates.expectedSalary')}</Label>
                    <Input
                      value={form.expectedSalary}
                      onChange={(e) => setForm({ ...form, expectedSalary: e.target.value })}
                      data-testid="input-candidate-expected-salary"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="skills" data-testid="tabcontent-skills">
              <div className="space-y-4">
                <div>
                  <Label>{t('hr.candidates.skills')}</Label>
                  <Input
                    value={form.skills}
                    onChange={(e) => setForm({ ...form, skills: e.target.value })}
                    placeholder="React, Node.js, TypeScript"
                    data-testid="input-candidate-skills"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label>{t('hr.candidates.education')}</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEducationEntries([...educationEntries, { ...emptyEducation }])}
                      data-testid="button-add-education"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {t('hr.candidates.addEducation')}
                    </Button>
                  </div>
                  {educationEntries.map((edu, idx) => (
                    <div key={idx} className="space-y-2 p-3 border rounded-md">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>{t('hr.candidates.degree')}</Label>
                          <Input
                            value={edu.degree}
                            onChange={(e) => updateEducation(idx, "degree", e.target.value)}
                            data-testid={`input-edu-degree-${idx}`}
                          />
                        </div>
                        <div>
                          <Label>{t('hr.candidates.institution')}</Label>
                          <Input
                            value={edu.institution}
                            onChange={(e) => updateEducation(idx, "institution", e.target.value)}
                            data-testid={`input-edu-institution-${idx}`}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>{t('hr.candidates.fieldOfStudy')}</Label>
                          <Input
                            value={edu.field}
                            onChange={(e) => updateEducation(idx, "field", e.target.value)}
                            data-testid={`input-edu-field-${idx}`}
                          />
                        </div>
                        <div>
                          <Label>{t('hr.candidates.year')}</Label>
                          <Input
                            value={edu.year}
                            onChange={(e) => updateEducation(idx, "year", e.target.value)}
                            data-testid={`input-edu-year-${idx}`}
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setEducationEntries(educationEntries.filter((_, i) => i !== idx))}
                        data-testid={`button-remove-education-${idx}`}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        {t('hr.candidates.removeEducation')}
                      </Button>
                    </div>
                  ))}
                </div>
                <div>
                  <Label>{t('hr.candidates.certifications')}</Label>
                  <Input
                    value={form.certifications}
                    onChange={(e) => setForm({ ...form, certifications: e.target.value })}
                    placeholder="AWS Certified, PMP"
                    data-testid="input-candidate-certifications"
                  />
                </div>
                <div>
                  <Label>{t('hr.candidates.languages')}</Label>
                  <Input
                    value={form.languages}
                    onChange={(e) => setForm({ ...form, languages: e.target.value })}
                    placeholder="English, Spanish, French"
                    data-testid="input-candidate-languages"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="experience" data-testid="tabcontent-experience">
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label>{t('hr.candidates.workExperience')}</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExperienceEntries([...experienceEntries, { ...emptyExperience }])}
                      data-testid="button-add-experience"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {t('hr.candidates.addExperience')}
                    </Button>
                  </div>
                  {experienceEntries.map((exp, idx) => (
                    <div key={idx} className="space-y-2 p-3 border rounded-md">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>{t('hr.candidates.company')}</Label>
                          <Input
                            value={exp.company}
                            onChange={(e) => updateExperience(idx, "company", e.target.value)}
                            data-testid={`input-exp-company-${idx}`}
                          />
                        </div>
                        <div>
                          <Label>{t('hr.candidates.role')}</Label>
                          <Input
                            value={exp.role}
                            onChange={(e) => updateExperience(idx, "role", e.target.value)}
                            data-testid={`input-exp-role-${idx}`}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>{t('hr.candidates.startDate')}</Label>
                          <Input
                            value={exp.startDate}
                            onChange={(e) => updateExperience(idx, "startDate", e.target.value)}
                            data-testid={`input-exp-start-${idx}`}
                          />
                        </div>
                        <div>
                          <Label>{t('hr.candidates.endDate')}</Label>
                          <Input
                            value={exp.endDate}
                            onChange={(e) => updateExperience(idx, "endDate", e.target.value)}
                            data-testid={`input-exp-end-${idx}`}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>{t('hr.candidates.description')}</Label>
                        <Textarea
                          value={exp.description}
                          onChange={(e) => updateExperience(idx, "description", e.target.value)}
                          className="resize-none"
                          rows={2}
                          data-testid={`textarea-exp-desc-${idx}`}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setExperienceEntries(experienceEntries.filter((_, i) => i !== idx))}
                        data-testid={`button-remove-experience-${idx}`}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        {t('hr.candidates.removeExperience')}
                      </Button>
                    </div>
                  ))}
                </div>
                <div>
                  <Label>{t('hr.candidates.hobbies')}</Label>
                  <Input
                    value={form.hobbies}
                    onChange={(e) => setForm({ ...form, hobbies: e.target.value })}
                    placeholder="Reading, Swimming"
                    data-testid="input-candidate-hobbies"
                  />
                </div>
                <div>
                  <Label>{t('hr.candidates.tags')}</Label>
                  <Input
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    placeholder="priority, senior"
                    data-testid="input-candidate-tags"
                  />
                </div>
                <div>
                  <Label>{t('hr.candidates.notes')}</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="resize-none"
                    rows={3}
                    data-testid="textarea-candidate-notes"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddOpen(false); resetForm(); }} data-testid="button-cancel-add">{t('common.cancel')}</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.firstName || !form.email || !form.jobId || createMutation.isPending}
              data-testid="button-submit-candidate"
            >
              {createMutation.isPending ? t('hr.candidates.adding') : t('hr.candidates.addCandidate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewCandidate} onOpenChange={(open) => { if (!open) setViewCandidate(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="dialog-view-candidate">
          <DialogHeader>
            <DialogTitle>{t('hr.candidates.candidateDetails')}</DialogTitle>
          </DialogHeader>
          {viewCandidate && (() => {
            const vc = viewCandidate;
            const fullName = `${vc.firstName} ${vc.lastName || ""}`.trim();
            const initials = `${vc.firstName[0]}${vc.lastName?.[0] || ""}`.toUpperCase();
            const colorClass = getAvatarColor(fullName);
            const score = vc.aiScore;
            const scoreColor = score !== null ? getScoreColor(score) : null;

            return (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarFallback className={colorClass}>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-semibold" data-testid="text-view-name">{fullName}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" data-testid="badge-view-stage">
                        {vc.pipelineStage.replace(/_/g, " ")}
                      </Badge>
                      {score !== null && scoreColor && (
                        <div className="flex items-center gap-1.5">
                          <span className={`h-2.5 w-2.5 rounded-full ${scoreColor.dot}`} />
                          <span className={`font-bold ${scoreColor.text}`} data-testid="text-view-score">{score}%</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                      <span data-testid="text-view-email">{vc.email}</span>
                      {vc.phone && <span data-testid="text-view-phone">{vc.phone}</span>}
                    </div>
                  </div>
                </div>

                <Tabs defaultValue="overview" data-testid="tabs-view-candidate">
                  <TabsList className="w-full" data-testid="tablist-view-candidate">
                    <TabsTrigger value="overview" data-testid="tab-view-overview">{t('hr.candidates.overview')}</TabsTrigger>
                    <TabsTrigger value="skills_edu" data-testid="tab-view-skills">{t('hr.candidates.skillsEducation')}</TabsTrigger>
                    <TabsTrigger value="experience" data-testid="tab-view-experience">{t('hr.candidates.workExperience')}</TabsTrigger>
                    <TabsTrigger value="ai" data-testid="tab-view-ai">{t('hr.candidates.aiAnalysis')}</TabsTrigger>
                    <TabsTrigger value="resume" data-testid="tab-view-resume">{t('hr.candidates.resume')}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" data-testid="tabcontent-view-overview">
                    <div className="space-y-4">
                      {vc.introduction && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">{t('hr.candidates.introduction')}</p>
                          <p className="text-sm p-3 bg-muted/50 rounded-md" data-testid="text-view-introduction">{vc.introduction}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {vc.currentCompany && (
                          <div>
                            <p className="text-muted-foreground">{t('hr.candidates.currentCompany')}</p>
                            <p data-testid="text-view-company">{vc.currentCompany}</p>
                          </div>
                        )}
                        {vc.currentDesignation && (
                          <div>
                            <p className="text-muted-foreground">{t('hr.candidates.currentDesignation')}</p>
                            <p data-testid="text-view-designation">{vc.currentDesignation}</p>
                          </div>
                        )}
                        {vc.currentLocation && (
                          <div>
                            <p className="text-muted-foreground">{t('hr.candidates.currentLocation')}</p>
                            <p data-testid="text-view-location">{vc.currentLocation}</p>
                          </div>
                        )}
                        {vc.totalExperienceYears !== null && (
                          <div>
                            <p className="text-muted-foreground">{t('hr.candidates.totalExperience')}</p>
                            <p data-testid="text-view-experience">{t('hr.candidates.yearsExperience', { count: vc.totalExperienceYears })}</p>
                          </div>
                        )}
                        {vc.noticePeriod && (
                          <div>
                            <p className="text-muted-foreground">{t('hr.candidates.noticePeriod')}</p>
                            <p data-testid="text-view-notice">{vc.noticePeriod}</p>
                          </div>
                        )}
                        {vc.currentSalary && (
                          <div>
                            <p className="text-muted-foreground">{t('hr.candidates.currentSalary')}</p>
                            <p data-testid="text-view-current-salary">{vc.currentSalary}</p>
                          </div>
                        )}
                        {vc.expectedSalary && (
                          <div>
                            <p className="text-muted-foreground">{t('hr.candidates.expectedSalary')}</p>
                            <p data-testid="text-view-expected-salary">{vc.expectedSalary}</p>
                          </div>
                        )}
                        {vc.gender && (
                          <div>
                            <p className="text-muted-foreground">{t('hr.candidates.gender')}</p>
                            <p data-testid="text-view-gender">{vc.gender}</p>
                          </div>
                        )}
                        {vc.dateOfBirth && (
                          <div>
                            <p className="text-muted-foreground">{t('hr.candidates.dateOfBirth')}</p>
                            <p data-testid="text-view-dob">{vc.dateOfBirth}</p>
                          </div>
                        )}
                        {vc.linkedinUrl && (
                          <div>
                            <p className="text-muted-foreground">{t('hr.candidates.linkedinUrl')}</p>
                            <p data-testid="text-view-linkedin" className="truncate">{vc.linkedinUrl}</p>
                          </div>
                        )}
                        {vc.source && (
                          <div>
                            <p className="text-muted-foreground">{t('hr.candidates.source')}</p>
                            <p data-testid="text-view-source">{vc.source}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-muted-foreground">{t('hr.candidates.appliedAt')}</p>
                          <p data-testid="text-view-applied">{formatDate(vc.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="skills_edu" data-testid="tabcontent-view-skills">
                    <div className="space-y-4">
                      {vc.skills && vc.skills.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-2">{t('hr.candidates.skills')}</p>
                          <div className="flex flex-wrap gap-1">
                            {vc.skills.map((s) => (
                              <Badge key={s} variant="outline" data-testid={`badge-skill-${s}`}>{s}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {vc.education && vc.education.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-2">{t('hr.candidates.education')}</p>
                          <div className="space-y-2">
                            {vc.education.map((edu, idx) => (
                              <div key={idx} className="p-3 border rounded-md text-sm" data-testid={`education-entry-${idx}`}>
                                <p className="font-medium">{edu.degree}</p>
                                <p className="text-muted-foreground">{edu.institution}</p>
                                <div className="flex items-center gap-2 text-muted-foreground mt-1 flex-wrap">
                                  {edu.field && <span>{edu.field}</span>}
                                  {edu.endYear && <span>{edu.endYear}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {vc.certifications && vc.certifications.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-2">{t('hr.candidates.certifications')}</p>
                          <div className="flex flex-wrap gap-1">
                            {vc.certifications.map((c) => (
                              <Badge key={c} variant="outline" data-testid={`badge-cert-${c}`}>{c}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {vc.languages && vc.languages.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-2">{t('hr.candidates.languages')}</p>
                          <div className="flex flex-wrap gap-1">
                            {vc.languages.map((l) => (
                              <Badge key={l} variant="outline" data-testid={`badge-lang-${l}`}>{l}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {!vc.skills?.length && !vc.education?.length && !vc.certifications?.length && !vc.languages?.length && (
                        <p className="text-sm text-muted-foreground">{t('hr.candidates.noDataAvailable')}</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="experience" data-testid="tabcontent-view-experience">
                    <div className="space-y-4">
                      {vc.workExperience && vc.workExperience.length > 0 ? (
                        <div className="space-y-3">
                          {vc.workExperience.map((exp, idx) => (
                            <div key={idx} className="relative pl-6 pb-3 border-l-2 border-muted" data-testid={`experience-entry-${idx}`}>
                              <div className="absolute left-[-5px] top-1 h-2 w-2 rounded-full bg-primary" />
                              <p className="font-medium text-sm">{exp.role}</p>
                              <p className="text-sm text-muted-foreground">{exp.company}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                                {exp.startDate && <span>{exp.startDate}</span>}
                                {exp.startDate && exp.endDate && <span>-</span>}
                                {exp.endDate && <span>{exp.endDate}</span>}
                              </div>
                              {exp.description && (
                                <p className="text-sm mt-1">{exp.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">{t('hr.candidates.noDataAvailable')}</p>
                      )}
                      {vc.hobbies && vc.hobbies.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-2">{t('hr.candidates.hobbies')}</p>
                          <div className="flex flex-wrap gap-1">
                            {vc.hobbies.map((h) => (
                              <Badge key={h} variant="outline" data-testid={`badge-hobby-${h}`}>{h}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="ai" data-testid="tabcontent-view-ai">
                    <div className="space-y-4">
                      {(vc.aiScore !== null || vc.aiSkillsScore !== null || vc.aiExperienceScore !== null || vc.aiEducationScore !== null) && (
                        <div className="space-y-3">
                          {[
                            { label: t('hr.candidates.overallScore'), value: vc.aiScore },
                            { label: t('hr.candidates.skillsScore'), value: vc.aiSkillsScore },
                            { label: t('hr.candidates.experienceScore'), value: vc.aiExperienceScore },
                            { label: t('hr.candidates.educationScore'), value: vc.aiEducationScore },
                          ].map((item) => item.value !== null && (
                            <div key={item.label} data-testid={`ai-score-${item.label}`}>
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span>{item.label}</span>
                                <span className="font-medium">{item.value}%</span>
                              </div>
                              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${item.value}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {vc.aiSummary && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">{t('hr.candidates.aiSummary')}</p>
                          <p className="text-sm p-3 bg-muted/50 rounded-md" data-testid="text-view-ai-summary">{vc.aiSummary}</p>
                        </div>
                      )}
                      {vc.aiStrengths && vc.aiStrengths.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-2">{t('hr.candidates.strengths')}</p>
                          <div className="flex flex-wrap gap-1">
                            {vc.aiStrengths.map((s) => (
                              <Badge key={s} variant="outline" className="border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400" data-testid={`badge-strength-${s}`}>{s}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {vc.aiWeaknesses && vc.aiWeaknesses.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-2">{t('hr.candidates.weaknesses')}</p>
                          <div className="flex flex-wrap gap-1">
                            {vc.aiWeaknesses.map((w) => (
                              <Badge key={w} variant="outline" className="border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-400" data-testid={`badge-weakness-${w}`}>{w}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {vc.aiRecommendation && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">{t('hr.candidates.recommendation')}</p>
                          <p className="text-sm p-3 bg-muted/50 rounded-md" data-testid="text-view-ai-recommendation">{vc.aiRecommendation}</p>
                        </div>
                      )}
                      {!vc.aiScore && !vc.aiSummary && !vc.aiStrengths?.length && !vc.aiWeaknesses?.length && !vc.aiRecommendation && (
                        <p className="text-sm text-muted-foreground">{t('hr.candidates.noDataAvailable')}</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="resume" data-testid="tabcontent-view-resume">
                    <div className="space-y-4">
                      {vc.cvFileName ? (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">{t('hr.candidates.resumeFile')}</p>
                          <div className="flex items-center gap-3">
                            <p className="text-sm flex items-center gap-1.5" data-testid="text-view-cv">
                              <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                              {vc.cvFileName}
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = `/api/hr/candidates/${vc.id}/download-cv`;
                                link.download = vc.cvFileName || 'resume';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                              data-testid="button-download-cv"
                            >
                              <Download className="h-3.5 w-3.5 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">{t('hr.candidates.noResume')}</p>
                      )}
                      {vc.parsedData && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">{t('hr.candidates.parsedData')}</p>
                          <pre className="text-xs p-3 bg-muted/50 rounded-md overflow-auto max-h-60" data-testid="text-view-parsed-data">
                            {typeof vc.parsedData === "string" ? vc.parsedData : JSON.stringify(vc.parsedData, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={(open) => { if (!open) { setIsEditOpen(false); setEditCandidateId(null); resetForm(); } else { setIsEditOpen(true); } }}>
        <DialogContent className="max-w-2xl" data-testid="dialog-edit-candidate">
          <DialogHeader>
            <DialogTitle>{t('hr.candidates.editCandidate')}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="personal" data-testid="tabs-edit-candidate">
            <TabsList className="w-full" data-testid="tablist-edit-candidate">
              <TabsTrigger value="personal" data-testid="tab-edit-personal-info">{t('hr.candidates.personalInfo')}</TabsTrigger>
              <TabsTrigger value="professional" data-testid="tab-edit-professional">{t('hr.candidates.professional')}</TabsTrigger>
              <TabsTrigger value="skills" data-testid="tab-edit-skills-education">{t('hr.candidates.skillsEducation')}</TabsTrigger>
              <TabsTrigger value="experience" data-testid="tab-edit-experience-other">{t('hr.candidates.experienceOther')}</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" data-testid="tabcontent-edit-personal">
              <div className="space-y-4">
                <div>
                  <Label>{t('hr.candidates.job')}</Label>
                  <Select value={form.jobId} onValueChange={(v) => setForm({ ...form, jobId: v })}>
                    <SelectTrigger data-testid="select-edit-candidate-job">
                      <SelectValue placeholder={t('hr.candidates.selectJob')} />
                    </SelectTrigger>
                    <SelectContent>
                      {/* {jobs.map((job) => (
                        <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
                      ))} */}


                      {jobs.filter((job) => job.status === "open").map((job) => (
                        <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('hr.candidates.firstName')} *</Label>
                    <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} data-testid="input-edit-firstname" />
                  </div>
                  <div>
                    <Label>{t('hr.candidates.lastName')}</Label>
                    <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} data-testid="input-edit-lastname" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('hr.candidates.email')} *</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="input-edit-email" />
                  </div>
                  <div>
                    <Label>{t('hr.candidates.phone')}</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="input-edit-phone" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('hr.candidates.dateOfBirth')}</Label>
                    <Input value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} data-testid="input-edit-dob" />
                  </div>
                  <div>
                    <Label>{t('hr.candidates.gender')}</Label>
                    <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                      <SelectTrigger data-testid="select-edit-gender">
                        <SelectValue placeholder={t('hr.candidates.gender')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">{t('hr.candidates.male')}</SelectItem>
                        <SelectItem value="female">{t('hr.candidates.female')}</SelectItem>
                        <SelectItem value="other">{t('hr.candidates.other')}</SelectItem>
                        <SelectItem value="prefer_not_to_say">{t('hr.candidates.preferNotToSay')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>{t('hr.candidates.currentLocation')}</Label>
                  <Input value={form.currentLocation} onChange={(e) => setForm({ ...form, currentLocation: e.target.value })} data-testid="input-edit-location" />
                </div>
                <div>
                  <Label>{t('hr.candidates.linkedinUrl')}</Label>
                  <Input value={form.linkedinUrl} onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })} data-testid="input-edit-linkedin" />
                </div>
                <div>
                  <Label>{t('hr.candidates.introduction')}</Label>
                  <Textarea value={form.introduction} onChange={(e) => setForm({ ...form, introduction: e.target.value })} className="resize-none" rows={3} data-testid="textarea-edit-introduction" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="professional" data-testid="tabcontent-edit-professional">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('hr.candidates.currentCompany')}</Label>
                    <Input value={form.currentCompany} onChange={(e) => setForm({ ...form, currentCompany: e.target.value })} data-testid="input-edit-company" />
                  </div>
                  <div>
                    <Label>{t('hr.candidates.currentDesignation')}</Label>
                    <Input value={form.currentDesignation} onChange={(e) => setForm({ ...form, currentDesignation: e.target.value })} data-testid="input-edit-designation" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('hr.candidates.totalExperience')}</Label>
                    <Input type="number" value={form.totalExperienceYears} onChange={(e) => setForm({ ...form, totalExperienceYears: e.target.value })} data-testid="input-edit-experience" />
                  </div>
                  <div>
                    <Label>{t('hr.candidates.noticePeriod')}</Label>
                    <Input value={form.noticePeriod} onChange={(e) => setForm({ ...form, noticePeriod: e.target.value })} data-testid="input-edit-notice" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('hr.candidates.currentSalary')}</Label>
                    <Input value={form.currentSalary} onChange={(e) => setForm({ ...form, currentSalary: e.target.value })} data-testid="input-edit-current-salary" />
                  </div>
                  <div>
                    <Label>{t('hr.candidates.expectedSalary')}</Label>
                    <Input value={form.expectedSalary} onChange={(e) => setForm({ ...form, expectedSalary: e.target.value })} data-testid="input-edit-expected-salary" />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="skills" data-testid="tabcontent-edit-skills">
              <div className="space-y-4">
                <div>
                  <Label>{t('hr.candidates.skills')}</Label>
                  <Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="React, Node.js, TypeScript" data-testid="input-edit-skills" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label>{t('hr.candidates.education')}</Label>
                    <Button variant="outline" size="sm" onClick={() => setEducationEntries([...educationEntries, { ...emptyEducation }])} data-testid="button-edit-add-education">
                      <Plus className="h-4 w-4 mr-1" />
                      {t('hr.candidates.addEducation')}
                    </Button>
                  </div>
                  {educationEntries.map((edu, idx) => (
                    <div key={idx} className="space-y-2 p-3 border rounded-md">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>{t('hr.candidates.degree')}</Label>
                          <Input value={edu.degree} onChange={(e) => updateEducation(idx, "degree", e.target.value)} data-testid={`input-edit-edu-degree-${idx}`} />
                        </div>
                        <div>
                          <Label>{t('hr.candidates.institution')}</Label>
                          <Input value={edu.institution} onChange={(e) => updateEducation(idx, "institution", e.target.value)} data-testid={`input-edit-edu-institution-${idx}`} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>{t('hr.candidates.fieldOfStudy')}</Label>
                          <Input value={edu.field} onChange={(e) => updateEducation(idx, "field", e.target.value)} data-testid={`input-edit-edu-field-${idx}`} />
                        </div>
                        <div>
                          <Label>{t('hr.candidates.year')}</Label>
                          <Input value={edu.year} onChange={(e) => updateEducation(idx, "year", e.target.value)} data-testid={`input-edit-edu-year-${idx}`} />
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setEducationEntries(educationEntries.filter((_, i) => i !== idx))} data-testid={`button-edit-remove-education-${idx}`}>
                        <Trash2 className="h-3 w-3 mr-1" />
                        {t('hr.candidates.removeEducation')}
                      </Button>
                    </div>
                  ))}
                </div>
                <div>
                  <Label>{t('hr.candidates.certifications')}</Label>
                  <Input value={form.certifications} onChange={(e) => setForm({ ...form, certifications: e.target.value })} placeholder="AWS Certified, PMP" data-testid="input-edit-certifications" />
                </div>
                <div>
                  <Label>{t('hr.candidates.languages')}</Label>
                  <Input value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} placeholder="English, Spanish, French" data-testid="input-edit-languages" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="experience" data-testid="tabcontent-edit-experience">
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label>{t('hr.candidates.workExperience')}</Label>
                    <Button variant="outline" size="sm" onClick={() => setExperienceEntries([...experienceEntries, { ...emptyExperience }])} data-testid="button-edit-add-experience">
                      <Plus className="h-4 w-4 mr-1" />
                      {t('hr.candidates.addExperience')}
                    </Button>
                  </div>
                  {experienceEntries.map((exp, idx) => (
                    <div key={idx} className="space-y-2 p-3 border rounded-md">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>{t('hr.candidates.company')}</Label>
                          <Input value={exp.company} onChange={(e) => updateExperience(idx, "company", e.target.value)} data-testid={`input-edit-exp-company-${idx}`} />
                        </div>
                        <div>
                          <Label>{t('hr.candidates.role')}</Label>
                          <Input value={exp.role} onChange={(e) => updateExperience(idx, "role", e.target.value)} data-testid={`input-edit-exp-role-${idx}`} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>{t('hr.candidates.startDate')}</Label>
                          <Input value={exp.startDate} onChange={(e) => updateExperience(idx, "startDate", e.target.value)} data-testid={`input-edit-exp-start-${idx}`} />
                        </div>
                        <div>
                          <Label>{t('hr.candidates.endDate')}</Label>
                          <Input value={exp.endDate} onChange={(e) => updateExperience(idx, "endDate", e.target.value)} data-testid={`input-edit-exp-end-${idx}`} />
                        </div>
                      </div>
                      <div>
                        <Label>{t('hr.candidates.description')}</Label>
                        <Textarea value={exp.description} onChange={(e) => updateExperience(idx, "description", e.target.value)} className="resize-none" rows={2} data-testid={`textarea-edit-exp-desc-${idx}`} />
                      </div>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setExperienceEntries(experienceEntries.filter((_, i) => i !== idx))} data-testid={`button-edit-remove-experience-${idx}`}>
                        <Trash2 className="h-3 w-3 mr-1" />
                        {t('hr.candidates.removeExperience')}
                      </Button>
                    </div>
                  ))}
                </div>
                <div>
                  <Label>{t('hr.candidates.hobbies')}</Label>
                  <Input value={form.hobbies} onChange={(e) => setForm({ ...form, hobbies: e.target.value })} placeholder="Reading, Swimming" data-testid="input-edit-hobbies" />
                </div>
                <div>
                  <Label>{t('hr.candidates.tags')}</Label>
                  <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="priority, senior" data-testid="input-edit-tags" />
                </div>
                <div>
                  <Label>{t('hr.candidates.notes')}</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="resize-none" rows={3} data-testid="textarea-edit-notes" />
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditOpen(false); setEditCandidateId(null); resetForm(); }} data-testid="button-cancel-edit">{t('common.cancel')}</Button>
            <Button
              onClick={handleEditSubmit}
              disabled={!form.firstName || !form.email || updateMutation.isPending}
              data-testid="button-submit-edit"
            >
              {updateMutation.isPending ? t('hr.candidates.updating') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedCandidates.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50" data-testid="bulk-actions-bar">
          <Card className="shadow-lg">
            <CardContent className="flex items-center gap-4 px-5 py-3 flex-wrap">
              <span className="font-medium text-sm" data-testid="text-selected-count">
                {selectedCandidates.size} {t('hr.candidates.candidatesSelected', 'candidates selected')}
              </span>

              <div className="flex items-center gap-2">
                <Select value={bulkStage} onValueChange={setBulkStage}>
                  <SelectTrigger className="w-[180px]" data-testid="select-bulk-stage">
                    <SelectValue placeholder={t('hr.candidates.bulkMove', 'Move to Stage')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uploaded">{t('hr.candidates.stage.uploaded', 'Uploaded')}</SelectItem>
                    <SelectItem value="ai_screened">{t('hr.candidates.stage.aiScreened', 'AI Screened')}</SelectItem>
                    <SelectItem value="shortlisted">{t('hr.candidates.stage.shortlisted', 'Shortlisted')}</SelectItem>
                    <SelectItem value="interview_scheduled">{t('hr.candidates.stage.interviewScheduled', 'Interview Scheduled')}</SelectItem>
                    <SelectItem value="interviewed">{t('hr.candidates.stage.interviewed', 'Interviewed')}</SelectItem>
                    <SelectItem value="hired">{t('hr.candidates.stage.hired', 'Hired')}</SelectItem>
                    <SelectItem value="rejected">{t('hr.candidates.stage.rejected', 'Rejected')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  disabled={!bulkStage || bulkMoveMutation.isPending}
                  onClick={() => bulkMoveMutation.mutate({ ids: Array.from(selectedCandidates), stage: bulkStage })}
                  data-testid="button-bulk-move"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  {bulkMoveMutation.isPending ? t('hr.candidates.moving', 'Moving...') : t('hr.candidates.bulkMove', 'Move to Stage')}
                </Button>
              </div>

              <Button
                variant="destructive"
                disabled={bulkDeleteMutation.isPending}
                onClick={() => {
                  if (window.confirm(t('hr.candidates.bulkDeleteConfirm', `Are you sure you want to delete ${selectedCandidates.size} candidates?`))) {
                    bulkDeleteMutation.mutate(Array.from(selectedCandidates));
                  }
                }}
                data-testid="button-bulk-delete"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {bulkDeleteMutation.isPending ? t('hr.candidates.deleting', 'Deleting...') : t('hr.candidates.bulkDelete', 'Delete Selected')}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedCandidates(new Set())}
                data-testid="button-deselect-all"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
