/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * Original Author: BTPL Engineering Team
 * Website: https://diploy.in
 * Contact: cs@diploy.in
 *
 * Distributed under the Envato / CodeCanyon License Agreement.
 * Licensed to the purchaser for use as defined by the
 * Envato Market (CodeCanyon) Regular or Extended License.
 *
 * You are NOT permitted to redistribute, resell, sublicense,
 * or share this source code, in whole or in part.
 * Respect the author's rights and Envato licensing terms.
 * ============================================================
 */
import { useState, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  AlertCircle, 
  Phone, 
  RefreshCw,
  Layers,
  PlayCircle,
  StopCircle,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Calendar,
  Tag,
  AlertTriangle
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

interface BatchJobStats {
  total: number;
  completed: number;
  failed: number;
  inProgress: number;
  pending: number;
}

interface BatchJob {
  campaignId: string;
  campaignName: string;
  batchJobId: string;
  batchJobStatus: string;
  agentName?: string;
  totalContacts: number;
  totalCallsScheduled?: number;
  totalCallsDispatched?: number;
  createdAt?: string;
  lastUpdatedAt?: string;
  completedCalls?: number;
  stats?: {
    pending: number;
    scheduled: number;
    dispatched: number;
    in_progress: number;
    completed: number;
    failed: number;
    total: number;
    progress: number;
  };
  error?: string;
}

interface BatchJobsResponse {
  batchJobs: BatchJob[];
}

function CopyableId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={(e) => { e.stopPropagation(); handleCopy(); }}
          className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover-elevate rounded px-1 py-0.5"
          data-testid={`button-copy-id-${id}`}
        >
          <span>{id.slice(0, 10)}...</span>
          {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
        </button>
      </TooltipTrigger>
      <TooltipContent>{copied ? "Copied!" : "Click to copy full ID"}</TooltipContent>
    </Tooltip>
  );
}

function getTypeBadge(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("hr scheduled") || lower.includes("scheduled call")) {
    return (
      <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
        <Phone className="h-3 w-3 mr-1" />
        Scheduled
      </Badge>
    );
  }
  if (lower.includes("hr screening") || lower.includes("screening")) {
    return (
      <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
        <Layers className="h-3 w-3 mr-1" />
        Screening
      </Badge>
    );
  }
  return (
    <Badge variant="secondary">
      <Tag className="h-3 w-3 mr-1" />
      Campaign
    </Badge>
  );
}

export default function BatchJobsMonitor() {
  const { t } = useTranslation();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data: batchData, isLoading, refetch, isRefetching } = useQuery<BatchJobsResponse>({
    queryKey: ["/api/admin/batch-jobs"],
    refetchInterval: 15000,
  });

  const batchJobs = batchData?.batchJobs || [];

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const aggregateStats = batchJobs.reduce<BatchJobStats>((acc, job) => {
    switch (job.batchJobStatus) {
      case "completed":
        acc.completed++;
        break;
      case "failed":
        acc.failed++;
        break;
      case "in_progress":
        acc.inProgress++;
        break;
      case "pending":
      case "scheduled":
        acc.pending++;
        break;
    }
    acc.total++;
    return acc;
  }, { total: 0, completed: 0, failed: 0, inProgress: 0, pending: 0 });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <Clock className="h-3 w-3 mr-1" />
            {t('admin.batchJobs.pending')}
          </Badge>
        );
      case "scheduled":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <Clock className="h-3 w-3 mr-1" />
            Scheduled
          </Badge>
        );
      case "in_progress":
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            {t('admin.batchJobs.inProgress')}
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            {t('admin.batchJobs.completed')}
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            {t('admin.batchJobs.failed')}
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="outline" className="text-slate-600 dark:text-slate-400">
            <StopCircle className="h-3 w-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return "N/A";
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    try {
      return format(new Date(dateString), "MMM d, yyyy h:mm a");
    } catch {
      return "—";
    }
  };

  const getProgressValue = (job: BatchJob) => {
    if (job.stats?.progress !== undefined) {
      return job.stats.progress;
    }
    if (job.totalCallsScheduled && job.totalCallsDispatched !== undefined) {
      return Math.round((job.totalCallsDispatched / job.totalCallsScheduled) * 100);
    }
    return 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold">Interview Batch Jobs</h2>
          <p className="text-sm text-muted-foreground">
            Monitor batch calling jobs across all interview campaigns (auto-refreshes every 15s)
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetch()}
          disabled={isRefetching}
          data-testid="button-refresh-batch-jobs"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Layers className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-batch-total">
              {isLoading ? "..." : aggregateStats.total}
            </div>
            <p className="text-xs text-muted-foreground">All batch jobs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.batchJobs.pending')}</CardTitle>
            <Clock className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-batch-pending">
              {isLoading ? "..." : aggregateStats.pending}
            </div>
            <p className="text-xs text-muted-foreground">Waiting to start</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.batchJobs.inProgress')}</CardTitle>
            <PlayCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-batch-in-progress">
              {isLoading ? "..." : aggregateStats.inProgress}
            </div>
            <p className="text-xs text-muted-foreground">Currently calling</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.batchJobs.completed')}</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-batch-completed">
              {isLoading ? "..." : aggregateStats.completed}
            </div>
            <p className="text-xs text-muted-foreground">Successfully finished</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.batchJobs.failed')}</CardTitle>
            <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-batch-failed">
              {isLoading ? "..." : aggregateStats.failed}
            </div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Batch Jobs
          </CardTitle>
          <CardDescription>
            Click any row to expand and see detailed call statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : batchJobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Layers className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No batch jobs found</p>
              <p className="text-sm mt-1">Start an interview campaign to create a batch calling job</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Interview Campaign</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden md:table-cell">Hiring Agent</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="hidden sm:table-cell">Calls</TableHead>
                    <TableHead className="hidden lg:table-cell">Created</TableHead>
                    <TableHead className="hidden lg:table-cell">Last Update</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchJobs.map((job) => {
                    const isExpanded = expandedRows.has(job.batchJobId);
                    return (
                      <Fragment key={job.batchJobId}>
                        <TableRow 
                          key={job.batchJobId} 
                          data-testid={`row-batch-job-${job.batchJobId}`}
                          className="cursor-pointer hover-elevate"
                          onClick={() => toggleRow(job.batchJobId)}
                        >
                          <TableCell className="w-8 pr-0">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(job.batchJobStatus)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <Link href={`/admin/campaigns/${job.campaignId}`}>
                                <span className="font-medium hover:underline cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                  {job.campaignName}
                                </span>
                              </Link>
                              <CopyableId id={job.batchJobId} />
                            </div>
                          </TableCell>
                          <TableCell>
                            {getTypeBadge(job.campaignName)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-sm">{job.agentName || "N/A"}</span>
                          </TableCell>
                          <TableCell>
                            <div className="w-24 sm:w-32 space-y-1">
                              <Progress value={getProgressValue(job)} className="h-2" />
                              <span className="text-xs text-muted-foreground">
                                {getProgressValue(job)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <div className="flex flex-col text-sm">
                              {job.stats ? (
                                <span className="text-muted-foreground">
                                  {job.stats.completed + job.stats.failed} / {job.stats.total}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  {job.totalCallsDispatched || 0} / {job.totalCallsScheduled || job.totalContacts}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-sm text-muted-foreground">
                                  {formatTime(job.createdAt)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>{formatDate(job.createdAt)}</TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-sm text-muted-foreground">
                                  {formatTime(job.lastUpdatedAt)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>{formatDate(job.lastUpdatedAt)}</TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Link href={`/admin/campaigns/${job.campaignId}`}>
                              <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()} data-testid={`button-view-campaign-${job.campaignId}`}>
                                View
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>

                        {isExpanded && (
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={10} className="p-0">
                              <div className="px-6 py-4 space-y-4">
                                {job.error && (
                                  <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                                    <span>{job.error}</span>
                                  </div>
                                )}

                                {job.stats ? (
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                                    <div className="p-3 rounded-md bg-muted/50 text-center">
                                      <p className="text-xs text-muted-foreground mb-1">{t('admin.batchJobs.pending')}</p>
                                      <p className="text-lg font-semibold">{job.stats.pending}</p>
                                    </div>
                                    <div className="p-3 rounded-md bg-blue-500/10 text-center">
                                      <p className="text-xs text-muted-foreground mb-1">Scheduled</p>
                                      <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">{job.stats.scheduled}</p>
                                    </div>
                                    <div className="p-3 rounded-md bg-cyan-500/10 text-center">
                                      <p className="text-xs text-muted-foreground mb-1">Dispatched</p>
                                      <p className="text-lg font-semibold text-cyan-600 dark:text-cyan-400">{job.stats.dispatched}</p>
                                    </div>
                                    <div className="p-3 rounded-md bg-amber-500/10 text-center">
                                      <p className="text-xs text-muted-foreground mb-1">{t('admin.batchJobs.inProgress')}</p>
                                      <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">{job.stats.in_progress}</p>
                                    </div>
                                    <div className="p-3 rounded-md bg-emerald-500/10 text-center">
                                      <p className="text-xs text-muted-foreground mb-1">{t('admin.batchJobs.completed')}</p>
                                      <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{job.stats.completed}</p>
                                    </div>
                                    <div className="p-3 rounded-md bg-rose-500/10 text-center">
                                      <p className="text-xs text-muted-foreground mb-1">{t('admin.batchJobs.failed')}</p>
                                      <p className="text-lg font-semibold text-rose-600 dark:text-rose-400">{job.stats.failed}</p>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    <div className="p-3 rounded-md bg-muted/50 text-center">
                                      <p className="text-xs text-muted-foreground mb-1">Total Candidates</p>
                                      <p className="text-lg font-semibold">{job.totalContacts}</p>
                                    </div>
                                    <div className="p-3 rounded-md bg-blue-500/10 text-center">
                                      <p className="text-xs text-muted-foreground mb-1">Calls Scheduled</p>
                                      <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">{job.totalCallsScheduled ?? "—"}</p>
                                    </div>
                                    <div className="p-3 rounded-md bg-emerald-500/10 text-center">
                                      <p className="text-xs text-muted-foreground mb-1">Calls Dispatched</p>
                                      <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{job.totalCallsDispatched ?? "—"}</p>
                                    </div>
                                  </div>
                                )}

                                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground border-t pt-3">
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5" />
                                    <span>Created: {formatDate(job.createdAt)}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <RefreshCw className="h-3.5 w-3.5" />
                                    <span>Last updated: {formatDate(job.lastUpdatedAt)}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Tag className="h-3.5 w-3.5" />
                                    <span>Batch ID: {job.batchJobId}</span>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
