import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Briefcase, Video, TrendingUp, Loader2, BarChart3 } from "lucide-react";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';

interface DashboardStats {
  totalJobs: number;
  activeJobs: number;
  totalCandidates: number;
  totalInterviews: number;
  completedInterviews: number;
  hiringRate: number;
  avgTimeToHire: number;
  topJobs: Array<{ id: string; title: string; candidates: number }>;
}

interface Job {
  id: string;
  title: string;
  status: string;
  department?: string;
  location?: string;
  createdAt: string;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  pipelineStage: string;
  jobId: string;
  aiScore: number | null;
  source?: string;
  createdAt: string;
}

const FUNNEL_STAGES = [
  { key: "uploaded", label: "Uploaded", color: "bg-indigo-500" },
  { key: "ai_screened", label: "AI Screened", color: "bg-blue-500" },
  { key: "shortlisted", label: "Shortlisted", color: "bg-violet-500" },
  { key: "interview_scheduled", label: "Interview Scheduled", color: "bg-amber-500" },
  { key: "interviewed", label: "Interviewed", color: "bg-emerald-500" },
  { key: "hired", label: "Hired", color: "bg-green-500" },
];

const STATUS_COLORS: Record<string, string> = {
  open: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  closed: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  draft: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  paused: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  archived: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
};

export default function HRAnalyticsPage() {
  const { t } = useTranslation();
  const [jobStatusFilter, setJobStatusFilter] = useState("all");

  const { data: dashboard, isLoading: dashLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/hr/dashboard"],
  });

  const { data: jobs = [], isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/hr/jobs"],
  });

  const { data: candidates = [], isLoading: candidatesLoading } = useQuery<Candidate[]>({
    queryKey: ["/api/hr/candidates"],
  });

  const isLoading = dashLoading || jobsLoading || candidatesLoading;

  const funnelData = useMemo(() => {
    const stageCounts: Record<string, number> = {};
    FUNNEL_STAGES.forEach((s) => { stageCounts[s.key] = 0; });
    candidates.forEach((c) => {
      const stage = c.pipelineStage?.toLowerCase().replace(/\s+/g, "_") || "uploaded";
      if (stageCounts[stage] !== undefined) {
        stageCounts[stage]++;
      } else {
        stageCounts["uploaded"]++;
      }
    });
    const maxCount = Math.max(...Object.values(stageCounts), 1);
    return FUNNEL_STAGES.map((s) => ({
      ...s,
      count: stageCounts[s.key],
      percentage: candidates.length > 0 ? Math.round((stageCounts[s.key] / candidates.length) * 100) : 0,
      barWidth: Math.max((stageCounts[s.key] / maxCount) * 100, 2),
    }));
  }, [candidates]);

  const jobsOverview = useMemo(() => {
    return jobs
      .filter((j) => jobStatusFilter === "all" || j.status === jobStatusFilter)
      .map((job) => {
        const jobCandidates = candidates.filter((c) => c.jobId === job.id);
        const scores = jobCandidates.filter((c) => c.aiScore !== null).map((c) => c.aiScore as number);
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
        const stageCounts: Record<string, number> = { uploaded: 0, ai_screened: 0, shortlisted: 0, hired: 0, rejected: 0 };
        jobCandidates.forEach((c) => {
          const stage = c.pipelineStage?.toLowerCase().replace(/\s+/g, "_") || "uploaded";
          if (stageCounts[stage] !== undefined) {
            stageCounts[stage]++;
          }
        });
        return {
          ...job,
          candidatesCount: jobCandidates.length,
          avgScore,
          stages: stageCounts,
        };
      });
  }, [jobs, candidates, jobStatusFilter]);

  const sourceDistribution = useMemo(() => {
    const sources: Record<string, number> = {};
    candidates.forEach((c) => {
      const source = c.source || "unknown";
      sources[source] = (sources[source] || 0) + 1;
    });
    const maxCount = Math.max(...Object.values(sources), 1);
    return Object.entries(sources)
      .sort((a, b) => b[1] - a[1])
      .map(([source, count]) => ({
        source,
        count,
        barWidth: Math.max((count / maxCount) * 100, 2),
      }));
  }, [candidates]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="loading-spinner">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalCandidates = dashboard?.totalCandidates ?? candidates.length;
  const activeJobs = dashboard?.activeJobs ?? jobs.filter((j) => j.status === "open").length;
  const completedInterviews = dashboard?.completedInterviews ?? 0;
  const hiringRate = dashboard?.hiringRate ?? 0;

  return (
    <div className="space-y-6" data-testid="hr-analytics-page">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-50 via-violet-100/50 to-purple-50 dark:from-indigo-950/40 dark:via-violet-900/30 dark:to-purple-950/40 border border-indigo-100 dark:border-indigo-900/50 p-6 md:p-8">
        <div className="absolute inset-0 bg-grid-slate-200/50 dark:bg-grid-slate-700/20 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]" />
        <div className="relative flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <BarChart3 className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground" data-testid="text-hr-analytics-title">
              {t('hr.analytics.title', 'Hiring Analytics')}
            </h1>
            <p className="text-muted-foreground mt-0.5">
              {t('hr.analytics.subtitle', 'Track your recruitment pipeline and hiring metrics')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="metric-total-candidates">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="value-total-candidates">{totalCandidates}</p>
                <p className="text-xs text-muted-foreground">{t('hr.analytics.totalCandidates', 'Total Candidates')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="metric-active-jobs">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Briefcase className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="value-active-jobs">{activeJobs}</p>
                <p className="text-xs text-muted-foreground">{t('hr.analytics.activeJobs', 'Active Jobs')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="metric-interviews-completed">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                <Video className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="value-interviews-completed">{completedInterviews}</p>
                <p className="text-xs text-muted-foreground">{t('hr.analytics.interviewsCompleted', 'Interviews Completed')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="metric-hiring-rate">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="value-hiring-rate">{hiringRate}%</p>
                <p className="text-xs text-muted-foreground">{t('hr.analytics.hiringRate', 'Hiring Rate')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-hiring-funnel">
        <CardHeader>
          <CardTitle className="text-lg">{t('hr.analytics.hiringFunnel', 'Hiring Funnel')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {funnelData.map((stage) => (
              <div key={stage.key} className="flex items-center gap-3" data-testid={`funnel-stage-${stage.key}`}>
                <div className="w-36 text-sm font-medium text-muted-foreground truncate" data-testid={`funnel-label-${stage.key}`}>
                  {t(`hr.analytics.stages.${stage.key}`, stage.label)}
                </div>
                <div className="flex-1 relative">
                  <div className="h-8 bg-muted/40 rounded-md overflow-hidden">
                    <div
                      className={`h-full ${stage.color} rounded-md transition-all duration-500 flex items-center`}
                      style={{ width: `${stage.barWidth}%` }}
                    >
                      <span className="text-xs font-semibold text-white px-2 whitespace-nowrap">
                        {stage.count}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-12 text-right text-sm font-medium text-muted-foreground" data-testid={`funnel-pct-${stage.key}`}>
                  {stage.percentage}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-jobs-overview">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
          <CardTitle className="text-lg">{t('hr.analytics.jobsOverview', 'Jobs Overview')}</CardTitle>
          <Select value={jobStatusFilter} onValueChange={setJobStatusFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-job-status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('hr.analytics.allStatuses', 'All')}</SelectItem>
              <SelectItem value="open">{t('hr.analytics.open', 'Open')}</SelectItem>
              <SelectItem value="closed">{t('hr.analytics.closed', 'Closed')}</SelectItem>
              <SelectItem value="draft">{t('hr.analytics.draft', 'Draft')}</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          {jobsOverview.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Briefcase className="h-10 w-10 mb-3 opacity-50" />
              <p className="text-sm">{t('hr.analytics.noJobs', 'No jobs found')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('hr.analytics.jobTitle', 'Job Title')}</TableHead>
                  <TableHead className="text-center">{t('hr.analytics.candidates', 'Candidates')}</TableHead>
                  <TableHead className="text-center">{t('hr.analytics.avgAiScore', 'Avg AI Score')}</TableHead>
                  <TableHead className="text-center">{t('hr.analytics.uploaded', 'Uploaded')}</TableHead>
                  <TableHead className="text-center">{t('hr.analytics.screened', 'Screened')}</TableHead>
                  <TableHead className="text-center">{t('hr.analytics.shortlisted', 'Shortlisted')}</TableHead>
                  <TableHead className="text-center">{t('hr.analytics.hired', 'Hired')}</TableHead>
                  <TableHead className="text-center">{t('hr.analytics.rejected', 'Rejected')}</TableHead>
                  <TableHead>{t('hr.analytics.status', 'Status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobsOverview.map((job) => (
                  <TableRow key={job.id} data-testid={`row-job-${job.id}`}>
                    <TableCell className="font-medium" data-testid={`text-job-title-${job.id}`}>{job.title}</TableCell>
                    <TableCell className="text-center" data-testid={`text-job-candidates-${job.id}`}>{job.candidatesCount}</TableCell>
                    <TableCell className="text-center" data-testid={`text-job-score-${job.id}`}>
                      {job.avgScore !== null ? job.avgScore : "-"}
                    </TableCell>
                    <TableCell className="text-center">{job.stages.uploaded}</TableCell>
                    <TableCell className="text-center">{job.stages.ai_screened}</TableCell>
                    <TableCell className="text-center">{job.stages.shortlisted}</TableCell>
                    <TableCell className="text-center">{job.stages.hired}</TableCell>
                    <TableCell className="text-center">{job.stages.rejected}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={STATUS_COLORS[job.status] || ""} data-testid={`badge-job-status-${job.id}`}>
                        {job.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {sourceDistribution.length > 0 && (
        <Card data-testid="card-source-distribution">
          <CardHeader>
            <CardTitle className="text-lg">{t('hr.analytics.sourceDistribution', 'Source Distribution')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sourceDistribution.map((item) => (
                <div key={item.source} className="flex items-center gap-3" data-testid={`source-${item.source}`}>
                  <div className="w-28 text-sm font-medium text-muted-foreground capitalize truncate">
                    {t(`hr.analytics.source.${item.source}`, item.source)}
                  </div>
                  <div className="flex-1 relative">
                    <div className="h-6 bg-muted/40 rounded-md overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-md transition-all duration-500 flex items-center"
                        style={{ width: `${item.barWidth}%` }}
                      >
                        <span className="text-xs font-semibold text-white px-2 whitespace-nowrap">
                          {item.count}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}