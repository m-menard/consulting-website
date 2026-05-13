import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Phone, PhoneOff, PhoneMissed, Clock, Play, Mic, FileText, Star, AlertCircle, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, RotateCcw } from "lucide-react";

interface HrCall {
  id: string;
  userId: string;
  jobId: string;
  candidateId: string;
  callSid: string | null;
  provider: string;
  direction: string;
  fromNumber: string | null;
  toNumber: string | null;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  duration: number | null;
  attemptNumber: number;
  recordingUrl: string | null;
  transcript: string | null;
  summary: string | null;
  callScore: number | null;
  aiEvaluation: string | null;
  aiRecommendation: string | null;
  sentimentScore: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Job {
  id: string;
  title: string;
}

interface CallDetailResponse {
  call: HrCall;
  candidate: {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string;
    phone: string | null;
  } | null;
  job: {
    id: string;
    title: string;
  } | null;
}

const statusColors: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  no_answer: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  busy: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  queued: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  ringing: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  cancelled: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

const recommendationColors: Record<string, string> = {
  advance: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  hold: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  reject: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const sentimentColors: Record<string, string> = {
  positive: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  neutral: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  negative: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getScoreBarColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-red-500";
}

export default function HRCallsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [jobFilter, setJobFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/hr/calls/sync");
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Sync Complete",
        description: data.message || `Synced ${data.synced} calls`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/calls"] });
    },
    onError: () => {
      toast({ title: "Sync Failed", description: "Could not sync call data", variant: "destructive" });
    },
  });

  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: ["/api/hr/jobs"],
  });

  const { data: callsData, isLoading } = useQuery<{ calls: HrCall[]; total: number }>({
    queryKey: ["/api/hr/calls", jobFilter, statusFilter, providerFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (jobFilter !== "all") params.set("jobId", jobFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (providerFilter !== "all") params.set("provider", providerFilter);
      params.set("limit", "200");
      const url = `/api/hr/calls?${params.toString()}`;
      const res = await apiRequest("GET", url);
      return res.json();
    },
  });

  const calls = callsData?.calls || [];

  const { data: callDetail, isLoading: isDetailLoading } = useQuery<CallDetailResponse>({
    queryKey: ["/api/hr/calls", selectedCallId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/hr/calls/${selectedCallId}`);
      return res.json();
    },
    enabled: !!selectedCallId,
  });

  const completedCalls = calls.filter((c) => c.status === "completed").length;
  const failedCalls = calls.filter((c) => c.status === "failed").length;
  const scoredCalls = calls.filter((c) => c.callScore !== null);
  const avgScore =
    scoredCalls.length > 0
      ? Math.round(scoredCalls.reduce((sum, c) => sum + (c.callScore || 0), 0) / scoredCalls.length)
      : null;

  const jobMap = new Map(jobs.map((j) => [j.id, j.title]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            {t("hr.callsPage.title", "Call History")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("hr.callsPage.subtitle", "View all AI-powered candidate screening calls")}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          data-testid="button-sync-calls"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`} />
          {syncMutation.isPending ? "Syncing..." : "Sync Call Data"}
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                <Phone className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-calls">{calls.length}</p>
                <p className="text-xs text-muted-foreground">{t("hr.callsPage.totalCalls", "Total Calls")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Phone className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-completed-calls">{completedCalls}</p>
                <p className="text-xs text-muted-foreground">{t("hr.callsPage.completed", "Completed")}</p>
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
                <p className="text-2xl font-bold" data-testid="text-failed-calls">{failedCalls}</p>
                <p className="text-xs text-muted-foreground">{t("hr.callsPage.failed", "Failed")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Star className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-avg-score">{avgScore !== null ? avgScore : "-"}</p>
                <p className="text-xs text-muted-foreground">{t("hr.callsPage.avgScore", "Avg Score")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={jobFilter} onValueChange={setJobFilter}>
          <SelectTrigger className="w-[220px]" data-testid="select-job-filter">
            <SelectValue placeholder={t("hr.callsPage.allJobs", "All Jobs")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("hr.callsPage.allJobs", "All Jobs")}</SelectItem>
            {jobs.map((job) => (
              <SelectItem key={job.id} value={job.id}>
                {job.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
            <SelectValue placeholder={t("hr.callsPage.allStatuses", "All Statuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("hr.callsPage.allStatuses", "All Statuses")}</SelectItem>
            <SelectItem value="completed">{t("hr.callsPage.completed", "Completed")}</SelectItem>
            <SelectItem value="failed">{t("hr.callsPage.failed", "Failed")}</SelectItem>
            <SelectItem value="no_answer">{t("hr.callsPage.noAnswer", "No Answer")}</SelectItem>
            <SelectItem value="busy">{t("hr.callsPage.busy", "Busy")}</SelectItem>
            <SelectItem value="in_progress">{t("hr.callsPage.inProgress", "In Progress")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-provider-filter">
            <SelectValue placeholder={t("hr.callsPage.allProviders", "All Providers")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("hr.callsPage.allProviders", "All Providers")}</SelectItem>
            <SelectItem value="twilio">Twilio</SelectItem>
            <SelectItem value="plivo">Plivo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          {t("hr.callsPage.loading", "Loading calls...")}
        </div>
      ) : calls.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <PhoneMissed className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">{t("hr.callsPage.noCalls", "No calls found")}</h3>
            <p className="text-muted-foreground text-sm">
              {t("hr.callsPage.noCallsDesc", "AI screening calls will appear here once initiated")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("hr.callsPage.candidate", "Candidate")}</TableHead>
                  <TableHead>{t("hr.callsPage.job", "Job")}</TableHead>
                  <TableHead>{t("hr.callsPage.provider", "Provider")}</TableHead>
                  <TableHead>Attempt</TableHead>
                  <TableHead>{t("hr.callsPage.status", "Status")}</TableHead>
                  <TableHead>{t("hr.callsPage.score", "Score")}</TableHead>
                  <TableHead>{t("hr.callsPage.duration", "Duration")}</TableHead>
                  <TableHead>{t("hr.callsPage.date", "Date")}</TableHead>
                  <TableHead className="text-right">{t("hr.callsPage.actions", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.map((call) => (
                  <TableRow key={call.id} data-testid={`row-call-${call.id}`}>
                    <TableCell>
                      <p className="font-medium text-sm" data-testid={`text-call-candidate-${call.id}`}>
                        {call.toNumber || t("hr.callsPage.unknown", "Unknown")}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground">{jobMap.get(call.jobId) || "-"}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {call.provider}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1" data-testid={`text-attempt-${call.id}`}>
                        <RotateCcw className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium text-sm">{call.attemptNumber}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusColors[call.status] || ""}>
                        {call.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {call.callScore !== null ? (
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                          <span className={`font-medium text-sm ${getScoreColor(call.callScore)}`}>
                            {call.callScore}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDuration(call.duration)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(call.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {call.recordingUrl && (
                          <span aria-label="Has recording"><Play className="h-3.5 w-3.5 text-indigo-500" /></span>
                        )}
                        {call.summary && (
                          <span aria-label="Has AI summary"><FileText className="h-3.5 w-3.5 text-emerald-500" /></span>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedCallId(call.id)}
                          data-testid={`button-view-call-${call.id}`}
                        >
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          {t("hr.callsPage.details", "Details")}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={!!selectedCallId}
        onOpenChange={(open) => {
          if (!open) setSelectedCallId(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{t("hr.callsPage.callDetails", "Call Details")}</DialogTitle>
          </DialogHeader>
          {isDetailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : callDetail ? (
            <ScrollArea className="flex-1">
              <div className="space-y-4 pr-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">{t("hr.callsPage.candidate", "Candidate")}</p>
                    <p className="font-medium" data-testid="text-detail-candidate">
                      {callDetail.candidate
                        ? `${callDetail.candidate.firstName}${callDetail.candidate.lastName ? ` ${callDetail.candidate.lastName}` : ""}`
                        : t("hr.callsPage.unknown", "Unknown")}
                    </p>
                    {callDetail.candidate?.phone && (
                      <p className="text-xs text-muted-foreground">{callDetail.candidate.phone}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("hr.callsPage.job", "Job")}</p>
                    <p className="font-medium">{callDetail.job?.title || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("hr.callsPage.status", "Status")}</p>
                    <Badge variant="secondary" className={statusColors[callDetail.call.status] || ""}>
                      {callDetail.call.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("hr.callsPage.duration", "Duration")}</p>
                    <p className="font-medium">{formatDuration(callDetail.call.duration)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("hr.callsPage.provider", "Provider")}</p>
                    <Badge variant="secondary" className="capitalize">{callDetail.call.provider}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("hr.callsPage.direction", "Direction")}</p>
                    <p className="font-medium capitalize">{callDetail.call.direction}</p>
                  </div>
                </div>

                {callDetail.call.callScore !== null && (
                  <div>
                    <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                      <Star className="h-4 w-4" />
                      {t("hr.callsPage.callScore", "Call Score")}
                    </p>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <span className={`text-2xl font-bold ${getScoreColor(callDetail.call.callScore)}`}>
                            {callDetail.call.callScore}/100
                          </span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${getScoreBarColor(callDetail.call.callScore)}`}
                            style={{ width: `${callDetail.call.callScore}%` }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {(callDetail.call.aiRecommendation || callDetail.call.sentimentScore) && (
                  <div className="flex items-center gap-3 flex-wrap">
                    {callDetail.call.aiRecommendation && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">{t("hr.callsPage.recommendation", "Recommendation")}</p>
                        <Badge
                          variant="secondary"
                          className={recommendationColors[callDetail.call.aiRecommendation] || ""}
                          data-testid="badge-recommendation"
                        >
                          {callDetail.call.aiRecommendation}
                        </Badge>
                      </div>
                    )}
                    {callDetail.call.sentimentScore && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">{t("hr.callsPage.sentiment", "Sentiment")}</p>
                        <Badge
                          variant="secondary"
                          className={sentimentColors[callDetail.call.sentimentScore] || ""}
                          data-testid="badge-sentiment"
                        >
                          {callDetail.call.sentimentScore}
                        </Badge>
                      </div>
                    )}
                  </div>
                )}

                {callDetail.call.summary && (
                  <div>
                    <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                      <FileText className="h-4 w-4" />
                      {t("hr.callsPage.summary", "AI Summary")}
                    </p>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{callDetail.call.summary}</p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {callDetail.call.aiEvaluation && (
                  <div>
                    <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                      <Star className="h-4 w-4" />
                      {t("hr.callsPage.aiEvaluation", "AI Evaluation")}
                    </p>
                    <Card>
                      <CardContent className="p-4">
                        <pre className="text-sm whitespace-pre-wrap text-muted-foreground">
                          {callDetail.call.aiEvaluation}
                        </pre>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {callDetail.call.transcript && (
                  <div>
                    <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                      <Mic className="h-4 w-4" />
                      {t("hr.callsPage.transcript", "Transcript")}
                    </p>
                    <Card>
                      <CardContent className="p-4">
                        <pre className="text-sm whitespace-pre-wrap text-muted-foreground">
                          {callDetail.call.transcript}
                        </pre>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {callDetail.call.recordingUrl && (
                  <div>
                    <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                      <Play className="h-4 w-4" />
                      {t("hr.callsPage.recording", "Recording")}
                    </p>
                    <audio
                      controls
                      className="w-full"
                      src={callDetail.call.recordingUrl}
                      data-testid="audio-recording"
                    >
                      {t("hr.callsPage.audioNotSupported", "Your browser does not support audio playback.")}
                    </audio>
                  </div>
                )}

                {callDetail.call.errorMessage && (
                  <div>
                    <p className="text-sm font-medium mb-2 flex items-center gap-1.5 text-red-600 dark:text-red-400">
                      <AlertCircle className="h-4 w-4" />
                      {t("hr.callsPage.error", "Error")}
                    </p>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-red-600 dark:text-red-400">{callDetail.call.errorMessage}</p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
