import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, Video, Phone, Clock, Star, Play, FileText, MessageSquare,
  Loader2, Plus, Calendar, Mic, RotateCcw, Mail, Briefcase, User,
  AlertCircle, ThumbsUp, ThumbsDown, Minus, ChevronDown, ChevronUp,
  PhoneCall, PhoneOff, Info, X, ChevronLeft, ChevronRight
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { set } from "date-fns";

interface CallAttempt {
  id: string;
  attemptNumber: number;
  status: string;
  provider: string;
  direction: string;
  fromNumber: string | null;
  toNumber: string | null;
  duration: number | null;
  callScore: number | null;
  recordingUrl: string | null;
  transcript: string | null;
  summary: string | null;
  aiEvaluation: string | null;
  aiRecommendation: string | null;
  sentimentScore: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
}

interface InterviewSession {
  id: string;
  candidateId: string;
  jobId: string;
  agentId: string | null;
  callId: string | null;
  status: string;
  interviewType: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  duration: number | null;
  transcript: string | null;
  aiEvaluation: any | null;
  overallScore: number | null;
  recordingUrl: string | null;
  createdAt: string;
  candidateName?: string;
  candidatePhone?: string;
  candidateEmail?: string;
  candidateAiScore?: number | null;
  candidateDesignation?: string;
  candidateCompany?: string;
  candidateExperience?: number | null;
  jobTitle?: string;
  attemptNumber?: number;
  totalAttempts?: number;
  hasRecording?: boolean;
  hasTranscript?: boolean;
  latestSummary?: string | null;
  latestAiEvaluation?: string | null;
  latestAiRecommendation?: string | null;
  latestSentimentScore?: string | null;
  latestCallScore?: number | null;
  callDuration?: number | null;
  latestDirection?: string | null;
  callAttempts?: CallAttempt[];
  totalInterviews?: number;
}

interface Job {
  id: string;
  title: string;
}

interface Candidate {
  id: string;
  firstName: string;
  lastName?: string;
  phone: string;
  email: string;
}

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  ringing: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  queued: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelled: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  no_answer: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  no_show: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  busy: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

const sentimentIcons: Record<string, typeof ThumbsUp> = {
  positive: ThumbsUp,
  negative: ThumbsDown,
  neutral: Minus,
};

const sentimentColors: Record<string, string> = {
  positive: "text-emerald-600 dark:text-emerald-400",
  negative: "text-red-600 dark:text-red-400",
  neutral: "text-slate-500 dark:text-slate-400",
};

const recommendationColors: Record<string, string> = {
  advance: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  hold: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  reject: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export default function InterviewsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedJobId, setSelectedJobId] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [viewInterview, setViewInterview] = useState<InterviewSession | null>(null);
  const [expandedAttempt, setExpandedAttempt] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleJobId, setScheduleJobId] = useState("");
  const [scheduleCandidateId, setScheduleCandidateId] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleCandidatePhone, setScheduleCandidatePhone] = useState("");
  const [scheduleNotes, setScheduleNotes] = useState("");
  const [expandedRecording, setExpandedRecording] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 400); // 400ms delay
  const [scheduleMode, setScheduleMode] = useState<"create" | "reschedule">("create");
  const [selectedInterview, setSelectedInterview] = useState<InterviewSession | null>(null);

  // Scroll arrow state
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [arrowTop, setArrowTop] = useState<number | null>(null);
  const [arrowLeft, setArrowLeft] = useState(0);
  const [arrowRight, setArrowRight] = useState(0);

  const updateScrollArrows = useCallback(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  const updateArrowPositions = useCallback(() => {
    const wrapper = tableWrapperRef.current;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const visibleTop = Math.max(rect.top, 0);
    const visibleBottom = Math.min(rect.bottom, viewportH);
    if (visibleBottom <= visibleTop) {
      setArrowTop(null);
      return;
    }
    setArrowTop((visibleTop + visibleBottom) / 2);
    setArrowLeft(rect.left);
    setArrowRight(window.innerWidth - rect.right);
  }, []);

  const scrollTable = useCallback((direction: "left" | "right") => {
    const el = tableScrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.4;
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  }, []);

  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: ["/api/hr/jobs"],
  });

  const { data: interviews = [], isLoading } = useQuery<InterviewSession[]>({
    queryKey: ["/api/hr/interviews", selectedJobId],
    queryFn: async () => {
      const url = selectedJobId ? `/api/hr/interviews?jobId=${selectedJobId}` : "/api/hr/interviews";
      const res = await apiRequest("GET", url);
      return res.json();
    },
  });

  const handleJobChange = (value: string) => {
    const jobId = value === "all" ? "" : value;

    setSelectedJobId(jobId);

    // reset filters when job changes
    setSearch("");
    setStatusFilter("all");
  };

  const filteredInterviews = interviews.filter((i) => {
    const term = debouncedSearch.toLowerCase().trim();

    const matchesSearch =
      !term ||
      i.candidateName?.toLowerCase().includes(term) ||
      i.jobTitle?.toLowerCase().includes(term) ||
      i.candidatePhone?.toLowerCase().includes(term);

    const matchesStatus =
      statusFilter === "all" || i.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      updateScrollArrows();
      updateArrowPositions();
    });
    observer.observe(el);
    el.addEventListener("scroll", updateScrollArrows, { passive: true });
    const onScroll = () => requestAnimationFrame(updateArrowPositions);
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onScroll, { passive: true });
    updateScrollArrows();
    updateArrowPositions();
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", updateScrollArrows);
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [updateScrollArrows, updateArrowPositions, filteredInterviews.length]);

  const { data: candidates = [] } = useQuery<Candidate[]>({
    queryKey: ["/api/hr/candidates", scheduleJobId],
    queryFn: async () => {
      if (!scheduleJobId) return [];
      const res = await apiRequest("GET", `/api/hr/candidates?jobId=${scheduleJobId}`);
      return res.json();
    },
    enabled: !!scheduleJobId,
  });

  // const scheduleMutation = useMutation({
  //   mutationFn: async () => {
  //     if (!scheduleJobId || !scheduleCandidateId || !scheduleDate) {
  //       throw new Error("Please fill in all required fields");
  //     }
  //     const parsedDate = new Date(scheduleDate);
  //     if (isNaN(parsedDate.getTime())) {
  //       throw new Error("Invalid date selected");
  //     }
  //     let phone = scheduleCandidatePhone.replace(/[\s\-\.\(\)]/g, '');
  //     if (!phone.startsWith('+')) {
  //       throw new Error("Phone number must start with + followed by the country code (e.g. +91, +1)");
  //     }
  //     if (phone.length < 8 || phone.length > 16) {
  //       throw new Error("Phone number appears invalid. Please include the full number with country code.");
  //     }
  //     await apiRequest("POST", `/api/hr/jobs/${scheduleJobId}/interviews`, {
  //       candidateId: scheduleCandidateId,
  //       interviewType: 'phone',
  //       scheduledAt: parsedDate.toISOString(),
  //       candidatePhone: phone,
  //       metadata: { notes: scheduleNotes },
  //     });
  //   },
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ["/api/hr/interviews"] });
  //     toast({ title: "Interview Scheduled", description: "The interview has been scheduled successfully." });
  //     setScheduleOpen(false);
  //     setScheduleJobId("");
  //     setScheduleCandidateId("");
  //     setScheduleDate("");
  //     setScheduleCandidatePhone("");
  //     setScheduleNotes("");
  //   },
  //   onError: (error: any) => {
  //     toast({ title: "Failed to Schedule", description: error.message || "Could not schedule the interview.", variant: "destructive" });
  //   },
  // });

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      if (!scheduleJobId || !scheduleCandidateId || !scheduleDate) {
        throw new Error("Please fill in all required fields");
      }

      const parsedDate = new Date(scheduleDate);

      let phone = scheduleCandidatePhone.replace(/[\s\-\.\(\)]/g, '');

      if (!phone.startsWith('+')) {
        throw new Error("Phone number must start with +");
      }

      if (scheduleMode === "reschedule" && selectedInterview) {
        // RESCHEDULE API
        await apiRequest("PATCH", `/api/hr/interviews/reschedule/${selectedInterview.id}`, {
          scheduledAt: parsedDate.toISOString(),
          candidatePhone: phone,
          metadata: { notes: scheduleNotes },
        });
      } else {
        // CREATE API
        await apiRequest("POST", `/api/hr/jobs/${scheduleJobId}/interviews`, {
          candidateId: scheduleCandidateId,
          interviewType: 'phone',
          scheduledAt: parsedDate.toISOString(),
          candidatePhone: phone,
          metadata: { notes: scheduleNotes },
        });
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/interviews"] });

      toast({
        title: scheduleMode === "reschedule"
          ? "Interview Rescheduled"
          : "Interview Scheduled",
      });

      setScheduleOpen(false);
      setSelectedInterview(null);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (interviewId: string) => {
      await apiRequest("POST", `/api/hr/interviews/${interviewId}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/interviews"] });
      toast({ title: "Interview Cancelled", description: "The interview has been cancelled." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to Cancel", description: error.message || "Could not cancel the interview.", variant: "destructive" });
    },
  });

  const handleCandidateChange = (candidateId: string) => {
    setScheduleCandidateId(candidateId);
    const candidate = candidates.find((c) => c.id === candidateId);
    if (candidate?.phone) {
      setScheduleCandidatePhone(candidate.phone);
    }
  };


  const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getCallStatusIcon = (status: string) => {
    if (status === 'completed') return <PhoneCall className="h-3.5 w-3.5 text-emerald-500" />;
    if (['failed', 'no_answer', 'busy', 'cancelled'].includes(status)) return <PhoneOff className="h-3.5 w-3.5 text-red-500" />;
    return <Phone className="h-3.5 w-3.5 text-amber-500" />;
  };

  const getRecordingCount = (interview: InterviewSession): number => {
    const attemptRecs = interview.callAttempts?.filter(a => a.recordingUrl).length ?? 0;
    const topLevelRec = (interview.recordingUrl && !interview.callAttempts?.some(a => a.recordingUrl === interview.recordingUrl)) ? 1 : 0;
    return attemptRecs + topLevelRec;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t('hr.interviewsPage.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('hr.interviewsPage.subtitle')}</p>
        </div>
        <Button onClick={() => {
          setScheduleMode("create");
          setSelectedInterview(null);
          setScheduleOpen(true);
        }} data-testid="button-schedule-interview">
          <Plus className="h-4 w-4 mr-1" />
          Schedule Interview
        </Button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-stat-scheduled">{interviews.filter(i => i.status === "scheduled").length}</p>
                <p className="text-xs text-muted-foreground">Scheduled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Loader2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-stat-in-progress">{interviews.filter(i => i.status === "in_progress").length}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Video className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-stat-completed">{interviews.filter(i => i.status === "completed").length}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <PhoneOff className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-stat-failed">{interviews.filter(i => i.status === "failed").length}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <PhoneOff className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-stat-no-answer">{interviews.filter(i => i.status === "no_answer").length}</p>
                <p className="text-xs text-muted-foreground">No Answer</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Phone className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-stat-total">{interviews.reduce((sum, i) => sum + (i.totalAttempts || 0), 0)}</p>
                <p className="text-xs text-muted-foreground">Total Calls</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedJobId || "all"} onValueChange={handleJobChange}>
          <SelectTrigger className="w-[250px]" data-testid="select-job-filter">
            <SelectValue placeholder="All Jobs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Jobs</SelectItem>
            {jobs.map(job => (
              <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by candidate, job, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-interviews"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-status-filter">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="no_answer">No Answer</SelectItem>
            <SelectItem value="no_show">No Show</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading interviews...
        </div>
      ) : filteredInterviews.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Video className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">No Interviews Yet</h3>
            <p className="text-muted-foreground text-sm">Interviews will appear here when candidates are called or scheduled.</p>
          </CardContent>
        </Card>
      ) : (
        <div ref={tableWrapperRef} className="relative">
          <Card>
            <CardContent className="p-0">
              <div ref={tableScrollRef} className="overflow-x-auto">
                <Table className="min-w-[1000px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Job</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Calls</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>AI Verdict</TableHead>
                      <TableHead>Sentiment</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInterviews.map((interview) => {
                      const recCount = getRecordingCount(interview);
                      return (
                        <TableRow key={interview.id} data-testid={`row-interview-${interview.id}`}>
                          <TableCell>
                            <div>
                              <p className="font-medium" data-testid={`text-interview-candidate-${interview.id}`}>
                                {interview.candidateName || 'Unknown'}
                                {interview.totalInterviews && interview.totalInterviews > 1 && (
                                  <Badge variant="secondary" className="ml-1.5 text-[10px]">
                                    {interview.totalInterviews} sessions
                                  </Badge>
                                )}
                              </p>
                              {interview.candidatePhone && (
                                <p className="text-xs text-muted-foreground">{interview.candidatePhone}</p>
                              )}
                              {interview.candidateDesignation && (
                                <p className="text-xs text-muted-foreground">{interview.candidateDesignation}{interview.candidateCompany ? ` @ ${interview.candidateCompany}` : ''}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">{interview.jobTitle || "-"}</p>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const dir = interview.latestDirection || (interview.callAttempts?.[0]?.direction);
                              const isIncoming = dir === 'inbound' || dir === 'incoming';
                              return (
                                <Badge
                                  variant="secondary"
                                  className={isIncoming
                                    ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                                    : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                                  }
                                  data-testid={`badge-direction-${interview.id}`}
                                >
                                  {isIncoming ? (
                                    <><PhoneCall className="h-3 w-3 mr-1" />Incoming</>
                                  ) : dir ? (
                                    <><Phone className="h-3 w-3 mr-1" />Outgoing</>
                                  ) : (
                                    <><Calendar className="h-3 w-3 mr-1" />Scheduled</>
                                  )}
                                </Badge>
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`capitalize ${statusColors[interview.status] || ""}`} data-testid={`badge-status-${interview.id}`}>
                              {interview.status.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm" data-testid={`text-calls-${interview.id}`}>
                              <span className="font-medium">{interview.totalAttempts || 0}</span>
                              {interview.callDuration ? (
                                <span className="text-muted-foreground ml-1 text-xs">{formatDuration(interview.callDuration)}</span>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            {interview.latestCallScore !== null && interview.latestCallScore !== undefined ? (
                              <div className="flex items-center gap-1" data-testid={`text-score-${interview.id}`}>
                                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                                <span className="font-medium text-sm">{interview.latestCallScore}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {interview.latestAiRecommendation ? (
                              <Badge variant="secondary" className={`text-xs capitalize ${recommendationColors[interview.latestAiRecommendation] || ""}`} data-testid={`badge-verdict-${interview.id}`}>
                                {interview.latestAiRecommendation}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {interview.latestSentimentScore ? (
                              (() => {
                                const SentimentIcon = sentimentIcons[interview.latestSentimentScore] || Minus;
                                const color = sentimentColors[interview.latestSentimentScore] || "";
                                return (
                                  <div className={`flex items-center gap-1 text-sm ${color}`} data-testid={`text-sentiment-${interview.id}`}>
                                    <SentimentIcon className="h-3.5 w-3.5" />
                                    <span className="capitalize">{interview.latestSentimentScore}</span>
                                  </div>
                                );
                              })()
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 flex-wrap" data-testid={`text-details-${interview.id}`}>
                              {recCount > 0 ? (
                                <Badge
                                  variant="secondary"
                                  className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                  data-testid={`badge-recording-${interview.id}`}
                                >
                                  <Mic className="h-3 w-3 mr-0.5" />
                                  {recCount} Rec
                                </Badge>
                              ) : (
                                <Badge
                                  variant="secondary"
                                  className="text-xs opacity-40"
                                  data-testid={`badge-recording-${interview.id}`}
                                >
                                  <Mic className="h-3 w-3 mr-0.5" />
                                  No Rec
                                </Badge>
                              )}
                              {interview.hasTranscript && (
                                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" data-testid={`badge-transcript-${interview.id}`}>
                                  <FileText className="h-3 w-3 mr-0.5" />
                                  Text
                                </Badge>
                              )}
                              {interview.latestSummary && (
                                <Badge variant="secondary" className="text-xs bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" data-testid={`badge-summary-${interview.id}`}>
                                  <MessageSquare className="h-3 w-3 mr-0.5" />
                                  AI
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground" data-testid={`text-date-${interview.id}`}>
                            {formatDateTime(interview.scheduledAt || interview.startedAt || interview.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setViewInterview(interview); setExpandedAttempt(null); }}
                                data-testid={`button-view-interview-${interview.id}`}
                              >
                                <FileText className="h-3.5 w-3.5 mr-1" />
                                View
                              </Button>
                                 <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setScheduleMode("reschedule");
                                  setSelectedInterview(interview);

                                  setScheduleJobId(interview.jobId);
                                  setScheduleCandidateId(interview.candidateId);
                                  setScheduleCandidatePhone(interview.candidatePhone || "");
                                  setScheduleNotes(interview?.metadata?.notes || "");

                                  if (interview.scheduledAt) {
                                    const d = new Date(interview.scheduledAt);
                                    setScheduleDate(d.toISOString().slice(0, 16));
                                  }

                                  setScheduleOpen(true);
                                }}
                              >
                                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                Reschedule
                              </Button>
                              {['scheduled', 'in_progress'].includes(interview.status) && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600 dark:text-red-400"
                                  onClick={() => cancelMutation.mutate(interview.id)}
                                  disabled={cancelMutation.isPending}
                                  data-testid={`button-cancel-interview-${interview.id}`}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              )}

                           
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Scroll arrows */}
          {canScrollLeft && arrowTop !== null && (
            <button
              onClick={() => scrollTable("left")}
              className="fixed z-50 h-10 w-10 flex items-center justify-center rounded-full bg-background/95 border shadow-lg backdrop-blur-sm"
              style={{ top: arrowTop - 20, left: arrowLeft }}
              data-testid="button-scroll-left"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {canScrollRight && arrowTop !== null && (
            <button
              onClick={() => scrollTable("right")}
              className="fixed z-50 h-10 w-10 flex items-center justify-center rounded-full bg-background/95 border shadow-lg backdrop-blur-sm"
              style={{ top: arrowTop - 20, right: arrowRight }}
              data-testid="button-scroll-right"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>
      )}

      <Dialog open={!!viewInterview} onOpenChange={(open) => { if (!open) { setViewInterview(null); setExpandedAttempt(null); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Interview Details
            </DialogTitle>
          </DialogHeader>
          {viewInterview && (
            <ScrollArea className="flex-1">
              <div className="space-y-5 pr-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Candidate</p>
                    <p className="font-medium">{viewInterview.candidateName || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Job</p>
                    <p className="font-medium">{viewInterview.jobTitle || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge variant="secondary" className={statusColors[viewInterview.status] || ""}>
                      {viewInterview.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  {viewInterview.candidatePhone && (
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="font-medium text-sm">{viewInterview.candidatePhone}</p>
                    </div>
                  )}
                  {viewInterview.scheduledAt && (
                    <div>
                      <p className="text-xs text-muted-foreground">Scheduled</p>
                      <p className="font-medium text-sm">{formatDateTime(viewInterview.scheduledAt)}</p>
                    </div>
                  )}
                  {viewInterview.callDuration && (
                    <div>
                      <p className="text-xs text-muted-foreground">Duration</p>
                      <p className="font-medium text-sm">{formatDuration(viewInterview.callDuration)}</p>
                    </div>
                  )}
                </div>

                {viewInterview.latestSummary && (
                  <div>
                    <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                      <MessageSquare className="h-4 w-4 text-violet-500" />
                      AI Summary
                    </p>
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewInterview.latestSummary}</p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {viewInterview.latestAiEvaluation && (() => {
                  let parsed: any = null;
                  try { parsed = typeof viewInterview.latestAiEvaluation === 'string' ? JSON.parse(viewInterview.latestAiEvaluation) : viewInterview.latestAiEvaluation; } catch { }
                  if (!parsed) return null;
                  return (
                    <div>
                      <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                        <Star className="h-4 w-4 text-amber-500" />
                        AI Analysis
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {parsed.communicationScore !== undefined && (
                          <Card><CardContent className="p-3 text-center">
                            <p className="text-xl font-bold">{parsed.communicationScore}<span className="text-sm text-muted-foreground">/10</span></p>
                            <p className="text-xs text-muted-foreground">Communication</p>
                          </CardContent></Card>
                        )}
                        {parsed.technicalScore !== undefined && (
                          <Card><CardContent className="p-3 text-center">
                            <p className="text-xl font-bold">{parsed.technicalScore}<span className="text-sm text-muted-foreground">/10</span></p>
                            <p className="text-xs text-muted-foreground">Technical</p>
                          </CardContent></Card>
                        )}
                        {parsed.cultureFitScore !== undefined && (
                          <Card><CardContent className="p-3 text-center">
                            <p className="text-xl font-bold">{parsed.cultureFitScore}<span className="text-sm text-muted-foreground">/10</span></p>
                            <p className="text-xs text-muted-foreground">Culture Fit</p>
                          </CardContent></Card>
                        )}
                        {parsed.overallScore !== undefined && (
                          <Card><CardContent className="p-3 text-center">
                            <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{parsed.overallScore}<span className="text-sm text-muted-foreground">/100</span></p>
                            <p className="text-xs text-muted-foreground">Overall</p>
                          </CardContent></Card>
                        )}
                      </div>
                      {parsed.recommendation && (
                        <div className="mt-2">
                          <Badge variant="secondary" className={`capitalize ${recommendationColors[parsed.recommendation] || ""}`}>
                            {parsed.recommendation}
                          </Badge>
                          {parsed.sentiment && (
                            <Badge variant="secondary" className="ml-2 capitalize">
                              {parsed.sentiment} sentiment
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {viewInterview.callAttempts && viewInterview.callAttempts.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                      <Phone className="h-4 w-4 text-indigo-500" />
                      Call Attempts ({viewInterview.callAttempts.length})
                    </p>
                    <div className="space-y-2">
                      {viewInterview.callAttempts.map((attempt) => (
                        <Card key={attempt.id}>
                          <CardContent className="p-3">
                            <div
                              className="flex items-center justify-between cursor-pointer"
                              onClick={() => setExpandedAttempt(expandedAttempt === attempt.id ? null : attempt.id)}
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                {getCallStatusIcon(attempt.status)}
                                <span className="text-sm font-medium">Attempt #{attempt.attemptNumber}</span>
                                <Badge variant="secondary" className={`text-xs capitalize ${statusColors[attempt.status] || ""}`}>
                                  {attempt.status.replace(/_/g, " ")}
                                </Badge>
                                {attempt.duration && (
                                  <span className="text-xs text-muted-foreground">{formatDuration(attempt.duration)}</span>
                                )}
                                {attempt.direction && (
                                  <Badge variant="secondary" className="text-xs capitalize">
                                    {attempt.direction}
                                  </Badge>
                                )}
                                {attempt.recordingUrl && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 cursor-pointer"
                                    onClick={(e) => { e.stopPropagation(); setExpandedRecording(expandedRecording === attempt.id ? null : attempt.id); }}
                                    data-testid={`badge-rec-attempt-${attempt.id}`}
                                  >
                                    {expandedRecording === attempt.id ? <ChevronUp className="h-3 w-3 mr-0.5" /> : <Play className="h-3 w-3 mr-0.5" />}
                                    Rec
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">{formatDateTime(attempt.startedAt || attempt.createdAt)}</span>
                                {expandedAttempt === attempt.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </div>
                            </div>

                            {expandedRecording === attempt.id && attempt.recordingUrl && (
                              <div className="mt-2 pt-2 border-t">
                                <audio autoPlay controls className="w-full h-8" src={attempt.recordingUrl} data-testid={`audio-mini-${attempt.id}`}>
                                  Audio not supported
                                </audio>
                              </div>
                            )}

                            {expandedAttempt === attempt.id && (
                              <div className="mt-3 space-y-3 border-t pt-3">
                                {attempt.errorMessage && (
                                  <div className="flex items-start gap-2 p-2 rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
                                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs">{attempt.errorMessage}</p>
                                  </div>
                                )}

                                {(attempt.callScore !== null || attempt.aiRecommendation || attempt.sentimentScore) && (
                                  <div className="flex items-center gap-3 flex-wrap">
                                    {attempt.callScore !== null && (
                                      <div className="flex items-center gap-1">
                                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                                        <span className="text-sm font-medium">Score: {attempt.callScore}/100</span>
                                      </div>
                                    )}
                                    {attempt.aiRecommendation && (
                                      <Badge variant="secondary" className={`text-xs capitalize ${recommendationColors[attempt.aiRecommendation] || ""}`}>
                                        {attempt.aiRecommendation}
                                      </Badge>
                                    )}
                                    {attempt.sentimentScore && (() => {
                                      const SentimentIcon = sentimentIcons[attempt.sentimentScore] || Minus;
                                      const color = sentimentColors[attempt.sentimentScore] || "";
                                      return (
                                        <div className={`flex items-center gap-1 text-sm ${color}`}>
                                          <SentimentIcon className="h-3.5 w-3.5" />
                                          <span className="capitalize">{attempt.sentimentScore}</span>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                )}

                                {attempt.recordingUrl && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                      <Play className="h-3 w-3" /> Recording
                                    </p>
                                    <audio controls className="w-full" src={attempt.recordingUrl} data-testid={`audio-attempt-${attempt.id}`}>
                                      Audio not supported
                                    </audio>
                                  </div>
                                )}

                                {attempt.transcript && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                      <FileText className="h-3 w-3" /> Transcript
                                    </p>
                                    <Card>
                                      <CardContent className="p-3">
                                        <pre className="text-xs whitespace-pre-wrap text-muted-foreground max-h-48 overflow-y-auto">{attempt.transcript}</pre>
                                      </CardContent>
                                    </Card>
                                  </div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {scheduleMode === "reschedule" ? "Reschedule Interview" : "Schedule Interview"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Job <span className="text-destructive">*</span></Label>
              <Select value={scheduleJobId} onValueChange={setScheduleJobId}>
                <SelectTrigger data-testid="select-schedule-job">
                  <SelectValue placeholder="Select a job" />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map(job => (
                    <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {scheduleJobId && (
              <div className="space-y-2">
                <Label>Candidate <span className="text-destructive">*</span></Label>
                <Select value={scheduleCandidateId} onValueChange={handleCandidateChange}>
                  <SelectTrigger data-testid="select-schedule-candidate">
                    <SelectValue placeholder="Select a candidate" />
                  </SelectTrigger>
                  <SelectContent>
                    {candidates.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.firstName} {c.lastName || ''} — {c.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Phone Number <span className="text-destructive">*</span></Label>
              <Input
                placeholder="+1234567890"
                value={scheduleCandidatePhone}
                onChange={(e) => setScheduleCandidatePhone(e.target.value)}
                data-testid="input-schedule-phone"
              />
              <p className="text-xs text-muted-foreground">Must include country code (e.g. +91, +1)</p>
            </div>

            <div className="space-y-2">
              <Label>Date & Time <span className="text-destructive">*</span></Label>
              <Input
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                data-testid="input-schedule-date"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Any notes for this interview..."
                value={scheduleNotes}
                onChange={(e) => setScheduleNotes(e.target.value)}
                rows={2}
                data-testid="input-schedule-notes"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setScheduleOpen(false)}>Cancel</Button>
              {/* <Button
                onClick={() => scheduleMutation.mutate()}
                disabled={scheduleMutation.isPending}
                data-testid="button-confirm-schedule"
              >
                {scheduleMutation.isPending ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Scheduling...</> : "Schedule Interview"}
              </Button> */}

              <Button onClick={() => scheduleMutation.mutate()}>
                {scheduleMutation.isPending
                  ? "Saving..."
                  : scheduleMode === "reschedule"
                    ? "Update Schedule"
                    : "Schedule Interview"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
