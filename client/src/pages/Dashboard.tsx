import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  Briefcase,
  FileText,
  Mail,
  UserCheck,
  Loader2,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  Download,
  Sparkles,
  MapPin,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from 'react-i18next';

interface User {
  id: string;
  name: string;
  email: string;
}

interface DashboardStats {
  totalJobs: number;
  openJobs: number;
  totalCandidates: number;
  candidatesByStage: Record<string, number>;
  jobsByStatus: Record<string, number>;
  totalInterviews: number;
  completedInterviews: number;
  averageScore: number;
  hireRate: number;
  recentJobs: Array<{
    id: string;
    title: string;
    department: string | null;
    status: string;
    candidateCount: number;
    createdAt: string;
  }>;
  recentCandidates: Array<{
    id: string;
    firstName: string;
    lastName: string | null;
    email: string | null;
    location: string | null;
    employmentType: string | null;
    pipelineStage: string;
    jobTitle: string;
    createdAt: string;
  }>;
}

const stageColors: Record<string, string> = {
  uploaded: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  ai_screened: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  shortlisted: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  interview_scheduled: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  interviewed: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  hired: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const stageDisplayLabels: Record<string, string> = {
  uploaded: "Uploaded",
  ai_screened: "Screening",
  shortlisted: "Shortlisted",
  interview_scheduled: "Interview",
  interviewed: "Interviewed",
  hired: "Completed",
  rejected: "Rejected",
};

const employmentTypeLabels: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
};

function getGreeting(t: (key: string) => string) {
  const hour = new Date().getHours();
  if (hour < 12) return t('hr.dashboard.greeting');
  if (hour < 18) return t('hr.dashboard.greetingAfternoon');
  return t('hr.dashboard.greetingEvening');
}

function getJobStatusBarData(jobsByStatus: Record<string, number>, totalJobs: number) {
  const statusConfig = [
    { key: 'open', color: 'bg-indigo-500', label: 'posted' },
    { key: 'closed', color: 'bg-emerald-500', label: 'closed' },
    { key: 'draft', color: 'bg-blue-300 dark:bg-blue-700', label: 'draft' },
    { key: 'paused', color: 'bg-amber-400', label: 'paused' },
  ];

  return statusConfig.map(s => ({
    ...s,
    count: jobsByStatus[s.key] || 0,
    pct: totalJobs > 0 ? Math.round(((jobsByStatus[s.key] || 0) / totalJobs) * 100) : 0,
  }));
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/hr/dashboard"],
  });

  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/me"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const s = stats || {
    totalJobs: 0,
    openJobs: 0,
    totalCandidates: 0,
    candidatesByStage: {},
    jobsByStatus: {},
    totalInterviews: 0,
    completedInterviews: 0,
    averageScore: 0,
    hireRate: 0,
    recentJobs: [],
    recentCandidates: [],
  };

  const hired = s.candidatesByStage?.hired || 0;
  const userName = user?.name?.split(' ')[0] || 'User';
  const jobStatusBars = getJobStatusBarData(s.jobsByStatus || {}, s.totalJobs);
  const maxBarValue = Math.max(...jobStatusBars.map(b => b.count), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            {getGreeting(t)}, {userName}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{t('hr.dashboard.overviewSubtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" data-testid="button-export-report">
            <Download className="h-4 w-4 mr-2" />
            {t('hr.dashboard.exportReport')}
          </Button>
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {userName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover-elevate cursor-pointer" onClick={() => setLocation("/app/candidates")} data-testid="card-stat-total-applied">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">{t('hr.dashboard.totalApplied')}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-3xl font-bold">{s.totalCandidates}</p>
                  {s.totalCandidates > 0 && (
                    <span className="flex items-center text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <TrendingUp className="h-3 w-3 mr-0.5" />
                      {Math.min(Math.round(s.totalCandidates * 0.33), 100)}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">+{s.totalCandidates} {t('hr.dashboard.fromLastYear')}</p>
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

        <Card className="hover-elevate cursor-pointer" onClick={() => setLocation("/app/interviews")} data-testid="card-stat-total-invitations">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">{t('hr.dashboard.totalInvitations')}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-3xl font-bold">{s.totalInterviews}</p>
                  {s.totalInterviews > 0 && (
                    <span className="flex items-center text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <TrendingUp className="h-3 w-3 mr-0.5" />
                      12%
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">+{s.completedInterviews} {t('hr.dashboard.fromLastYear')}</p>
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

        <Card className="hover-elevate cursor-pointer" onClick={() => setLocation("/app/pipeline")} data-testid="card-stat-total-hiring">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">{t('hr.dashboard.totalHiring')}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-3xl font-bold">{hired}</p>
                  {hired > 0 ? (
                    <span className="flex items-center text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <TrendingUp className="h-3 w-3 mr-0.5" />
                      8%
                    </span>
                  ) : (
                    <span className="flex items-center text-xs text-red-500 dark:text-red-400 font-medium">
                      <TrendingDown className="h-3 w-3 mr-0.5" />
                      0%
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">{hired} {t('hr.dashboard.fromLastYear')}</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card data-testid="card-job-summary">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              {t('hr.dashboard.jobSummary')}
            </CardTitle>
            <Button variant="ghost" size="icon" data-testid="button-job-summary-more">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <p className="text-3xl font-bold">{s.totalJobs}</p>
              {s.totalJobs > 0 && (
                <span className="flex items-center text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <TrendingUp className="h-3 w-3 mr-0.5" />
                  12%
                </span>
              )}
            </div>

            <div className="flex items-end gap-2 h-24 mb-4">
              {jobStatusBars.map((bar) => (
                <div key={bar.key} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-md ${bar.color}`}
                    style={{
                      height: `${Math.max((bar.count / maxBarValue) * 100, 8)}%`,
                      minHeight: '6px',
                    }}
                    title={`${bar.label}: ${bar.count}`}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {jobStatusBars.map((bar) => (
                <div key={bar.key} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-sm ${bar.color}`} />
                    <span className="text-muted-foreground capitalize">
                      {t(`hr.dashboard.${bar.label}`)}
                    </span>
                  </div>
                  <span className="font-medium">{bar.pct} %</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-hiring-metrics">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('hr.dashboard.hiringMetrics')}
              <span className="text-2xl font-bold ml-2">{s.totalCandidates}</span>
              {s.totalCandidates > 0 && (
                <span className="flex items-center text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <TrendingUp className="h-3 w-3 mr-0.5" />
                  12%
                </span>
              )}
            </CardTitle>
            <Button variant="ghost" size="icon" data-testid="button-metrics-more">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 h-44">
              {(() => {
                const stages = ['uploaded', 'ai_screened', 'shortlisted', 'interview_scheduled', 'interviewed', 'hired', 'rejected'];
                const stageShortLabels: Record<string, string> = {
                  uploaded: 'Upload',
                  ai_screened: 'Screen',
                  shortlisted: 'Short',
                  interview_scheduled: 'Sched',
                  interviewed: 'Intv',
                  hired: 'Hired',
                  rejected: 'Rej',
                };
                const maxStageVal = Math.max(...stages.map(st => s.candidatesByStage?.[st] || 0), 1);
                return stages.map((stage) => {
                  const val = s.candidatesByStage?.[stage] || 0;
                  const heightPct = maxStageVal > 0 ? (val / maxStageVal) * 100 : 0;
                  const isHighlighted = stage === 'hired';
                  return (
                    <div key={stage} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-semibold text-foreground">{val > 0 ? val : ''}</span>
                      <div
                        className={`w-full rounded-md transition-all ${
                          isHighlighted
                            ? 'bg-indigo-600 dark:bg-indigo-500'
                            : 'bg-indigo-200 dark:bg-indigo-800/50'
                        }`}
                        style={{
                          height: `${Math.max(heightPct, 4)}%`,
                          minHeight: '4px',
                          backgroundImage: !isHighlighted && val > 0 ? 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 4px)' : undefined,
                        }}
                      />
                      <span className={`text-[10px] ${isHighlighted ? 'font-bold text-foreground bg-indigo-100 dark:bg-indigo-900/30 rounded-full px-1.5 py-0.5' : 'text-muted-foreground'}`}>
                        {stageShortLabels[stage]}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2" data-testid="card-applicant-list">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('hr.dashboard.applicantList')}
            </CardTitle>
            <Button variant="ghost" size="icon" data-testid="button-applicant-more">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {s.recentCandidates && s.recentCandidates.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 font-medium text-muted-foreground">{t('hr.dashboard.name')}</th>
                      <th className="pb-3 font-medium text-muted-foreground">{t('hr.dashboard.location')}</th>
                      <th className="pb-3 font-medium text-muted-foreground">{t('hr.dashboard.type')}</th>
                      <th className="pb-3 font-medium text-muted-foreground">{t('hr.dashboard.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.recentCandidates.map((candidate) => (
                      <tr
                        key={candidate.id}
                        className="border-b last:border-0 hover-elevate cursor-pointer"
                        onClick={() => setLocation("/app/candidates")}
                        data-testid={`row-candidate-${candidate.id}`}
                      >
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {candidate.firstName.charAt(0)}{candidate.lastName?.charAt(0) || ''}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{candidate.firstName} {candidate.lastName || ''}</p>
                              <p className="text-xs text-muted-foreground">{candidate.jobTitle}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          {candidate.location ? (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {candidate.location}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {candidate.employmentType
                            ? (employmentTypeLabels[candidate.employmentType] || candidate.employmentType.replace('_', ' '))
                            : '-'}
                        </td>
                        <td className="py-3">
                          <Badge
                            variant="secondary"
                            className={`text-xs ${stageColors[candidate.pipelineStage] || ''}`}
                          >
                            {stageDisplayLabels[candidate.pipelineStage] || candidate.pipelineStage}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm">{t('hr.dashboard.noApplicants')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white border-0" data-testid="card-ai-promo">
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5" />
                <p className="font-semibold">AgentHR AI</p>
              </div>
              <h3 className="text-lg font-bold mb-2">{t('hr.dashboard.aiPromoTitle')}</h3>
              <p className="text-sm text-white/80 mb-4">
                {t('hr.dashboard.aiPromoDescription')}
              </p>
            </div>
            <Button
              variant="secondary"
              className="w-fit bg-white/20 text-white border-white/30 border"
              onClick={() => setLocation("/app/cv-upload")}
              data-testid="button-get-analysis"
            >
              {t('hr.dashboard.getAnalysis')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
