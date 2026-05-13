import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Users, Mail, Phone, PhoneCall, Star, Sparkles, MessageSquare, Send, Trash2, Loader2, GripVertical, Briefcase, X, Mic, Play, LayoutGrid, List, ArrowUpDown, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Download, Calendar } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from 'react-i18next';
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";

interface Candidate {
  id: string;
  jobId: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  pipelineStage: string;
  aiScore: number | null;
  aiSummary: string | null;
  aiStrengths: string[] | null;
  aiWeaknesses: string[] | null;
  aiRecommendation: string | null;
  aiSkillsScore: number | null;
  aiExperienceScore: number | null;
  aiEducationScore: number | null;
  cvFileName: string | null;
  totalExperienceYears: number | null;
  currentCompany: string | null;
  currentDesignation: string | null;
  skills: string[] | null;
  callStatus: string | null;
  callScore: number | null;
  callAttempts: number | null;
  callDuration: number | null;
  callSummary: string | null;
  callTranscript: string | null;
  callRecordingUrl: string | null;
  lastCallAt: string | null;
  createdAt: string;
  jobTitle?: string;
}

interface Comment {
  id: string;
  candidateId: string;
  userId: string;
  content: string;
  authorName: string;
  createdAt: string;
}

interface Job {
  id: string;
  title: string;
  department: string | null;
  status: string;
}

const STAGES = [
  { value: "uploaded", label: "Uploaded", headerColor: "bg-slate-500", dotColor: "bg-slate-400" },
  { value: "ai_screened", label: "AI Screened", headerColor: "bg-blue-500", dotColor: "bg-blue-400" },
  { value: "shortlisted", label: "Shortlisted", headerColor: "bg-cyan-500", dotColor: "bg-cyan-400" },
  { value: "interview_scheduled", label: "Interview Scheduled", headerColor: "bg-amber-500", dotColor: "bg-amber-400" },
  { value: "interviewed", label: "Interviewed", headerColor: "bg-purple-500", dotColor: "bg-purple-400" },
  { value: "hired", label: "Hired", headerColor: "bg-emerald-500", dotColor: "bg-emerald-400" },
  { value: "rejected", label: "Rejected", headerColor: "bg-red-500", dotColor: "bg-red-400" },
];

function getStageInfo(stage: string) {
  return STAGES.find(s => s.value === stage) || STAGES[0];
}

function CandidateCard({ candidate, index, onOpen }: { candidate: Candidate; index: number; onOpen: (c: Candidate) => void }) {
  return (
    <Draggable draggableId={candidate.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`mb-2 ${snapshot.isDragging ? 'z-50' : ''}`}
        >
          <Card
            className={`cursor-pointer transition-shadow ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary/30' : ''}`}
            onClick={() => onOpen(candidate)}
            data-testid={`card-candidate-${candidate.id}`}
          >
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <div {...provided.dragHandleProps} className="mt-1 cursor-grab active:cursor-grabbing" data-testid={`drag-handle-${candidate.id}`}>
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {candidate.firstName[0]}{candidate.lastName?.[0] || ""}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate" data-testid={`text-candidate-name-${candidate.id}`}>
                        {candidate.firstName} {candidate.lastName || ""}
                      </p>
                      {candidate.currentDesignation && (
                        <p className="text-xs text-muted-foreground truncate">{candidate.currentDesignation}</p>
                      )}
                    </div>
                    {(candidate as any).appliedInOtherJobs && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0" data-testid={`badge-cross-job-${candidate.id}`}>Other jobs</Badge>
                    )}
                  </div>

                  {candidate.currentCompany && (
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                      <Briefcase className="h-3 w-3 shrink-0" />
                      <span className="truncate">{candidate.currentCompany}</span>
                    </div>
                  )}

                  {candidate.skills && candidate.skills.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap mt-1.5">
                      {candidate.skills.slice(0, 2).map(skill => (
                        <Badge key={skill} variant="outline" className="text-[10px] px-1.5 py-0">
                          {skill}
                        </Badge>
                      ))}
                      {candidate.skills.length > 2 && (
                        <span className="text-[10px] text-muted-foreground">+{candidate.skills.length - 2}</span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    {candidate.aiScore !== null ? (
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                        <span className="text-xs font-medium" data-testid={`text-score-${candidate.id}`}>{candidate.aiScore}/100</span>
                      </div>
                    ) : (
                      <span />
                    )}
                    <div className="flex items-center gap-1.5">
                      {candidate.callStatus === 'completed' && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                          <PhoneCall className="h-2.5 w-2.5 mr-0.5" />
                          {candidate.callScore ?? ''}
                        </Badge>
                      )}
                      {(candidate.callStatus === 'in_progress' || candidate.callStatus === 'ringing') && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                          <PhoneCall className="h-2.5 w-2.5 mr-0.5" />
                        </Badge>
                      )}
                      {candidate.callStatus === 'queued' && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700">
                          <Phone className="h-2.5 w-2.5 mr-0.5" />
                        </Badge>
                      )}
                      {(candidate.callStatus === 'failed' || candidate.callStatus === 'no_answer' || candidate.callStatus === 'busy' || candidate.callStatus === 'cancelled') && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800">
                          <Phone className="h-2.5 w-2.5 mr-0.5" />
                        </Badge>
                      )}
                      {candidate.totalExperienceYears != null && (
                        <span className="text-[10px] text-muted-foreground">{candidate.totalExperienceYears} yrs exp</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  );
}

function CandidateDetailDialog({
  candidate,
  onClose,
  candidatesUrl,
}: {
  candidate: Candidate;
  onClose: () => void;
  candidatesUrl: string;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [commentText, setCommentText] = useState("");

  const { data: comments = [], isLoading: commentsLoading } = useQuery<Comment[]>({
    queryKey: [`/api/hr/candidates/${candidate.id}/comments`],
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/hr/candidates/${candidate.id}/comments`, { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/hr/candidates/${candidate.id}/comments`] });
      setCommentText("");
    },
    onError: () => {
      toast({ title: "Failed to add comment", variant: "destructive" });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await apiRequest("DELETE", `/api/hr/comments/${commentId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/hr/candidates/${candidate.id}/comments`] });
    },
  });

  const generateSummaryMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/hr/candidates/${candidate.id}/generate-summary`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => {
        const key = q.queryKey[0] as string;
        return key?.startsWith('/api/hr/candidates');
      }});
      toast({ title: "AI summary generated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to generate AI summary", description: error.message, variant: "destructive" });
    },
  });

  const stageInfo = getStageInfo(candidate.pipelineStage);

  return (
    <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {candidate.firstName[0]}{candidate.lastName?.[0] || ""}
            </AvatarFallback>
          </Avatar>
          <div>
            <span data-testid="text-detail-name">{candidate.firstName} {candidate.lastName || ""}</span>
            <div className="flex items-center gap-2 mt-0.5">
              <div className={`h-2 w-2 rounded-full ${stageInfo.dotColor}`} />
              <span className="text-xs font-normal text-muted-foreground">{t('hr.stages.' + stageInfo.value)}</span>
              {candidate.jobTitle && (
                <>
                  <span className="text-xs text-muted-foreground">for</span>
                  <span className="text-xs font-normal text-muted-foreground">{candidate.jobTitle}</span>
                </>
              )}
            </div>
          </div>
        </DialogTitle>
        <DialogDescription className="sr-only">
          Candidate details, AI summary and comments
        </DialogDescription>
      </DialogHeader>

      <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
        <div className="space-y-4 pb-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {candidate.email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{candidate.email}</span>
              </div>
            )}
            {candidate.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span>{candidate.phone}</span>
              </div>
            )}
            {candidate.currentCompany && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{candidate.currentCompany}</span>
              </div>
            )}
            {candidate.totalExperienceYears != null && (
              <div className="text-muted-foreground">
                {candidate.totalExperienceYears} years experience
              </div>
            )}
          </div>

          {candidate.skills && candidate.skills.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Skills</Label>
              <div className="flex flex-wrap gap-1">
                {candidate.skills.map(skill => (
                  <Badge key={skill} variant="outline" className="text-xs">{skill}</Badge>
                ))}
              </div>
            </div>
          )}

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Summary
              </Label>
              <Button
                size="sm"
                variant="outline"
                onClick={() => generateSummaryMutation.mutate()}
                disabled={generateSummaryMutation.isPending}
                data-testid="button-generate-summary"
              >
                {generateSummaryMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                )}
                {candidate.aiSummary ? "Regenerate" : "Generate"}
              </Button>
            </div>

            {candidate.aiSummary ? (
              <div className="space-y-3">
                <p className="text-sm p-3 bg-muted/50 rounded-md" data-testid="text-ai-summary">{candidate.aiSummary}</p>

                {candidate.aiScore !== null && (
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center p-2 bg-muted/30 rounded-md">
                      <p className="text-lg font-bold text-primary">{candidate.aiScore}</p>
                      <p className="text-[10px] text-muted-foreground">Overall</p>
                    </div>
                    {candidate.aiSkillsScore != null && (
                      <div className="text-center p-2 bg-muted/30 rounded-md">
                        <p className="text-lg font-bold">{candidate.aiSkillsScore}</p>
                        <p className="text-[10px] text-muted-foreground">Skills</p>
                      </div>
                    )}
                    {candidate.aiExperienceScore != null && (
                      <div className="text-center p-2 bg-muted/30 rounded-md">
                        <p className="text-lg font-bold">{candidate.aiExperienceScore}</p>
                        <p className="text-[10px] text-muted-foreground">Experience</p>
                      </div>
                    )}
                    {candidate.aiEducationScore != null && (
                      <div className="text-center p-2 bg-muted/30 rounded-md">
                        <p className="text-lg font-bold">{candidate.aiEducationScore}</p>
                        <p className="text-[10px] text-muted-foreground">Education</p>
                      </div>
                    )}
                  </div>
                )}

                {candidate.aiStrengths && candidate.aiStrengths.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Strengths</Label>
                    <ul className="text-sm space-y-0.5">
                      {candidate.aiStrengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-emerald-500 mt-0.5 shrink-0">+</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {candidate.aiWeaknesses && candidate.aiWeaknesses.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Areas of Concern</Label>
                    <ul className="text-sm space-y-0.5">
                      {candidate.aiWeaknesses.map((w, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-red-500 mt-0.5 shrink-0">-</span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {candidate.aiRecommendation && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Recommendation:</Label>
                    <Badge variant={candidate.aiRecommendation === 'hire' ? 'default' : candidate.aiRecommendation === 'consider' ? 'secondary' : 'destructive'}>
                      {candidate.aiRecommendation}
                    </Badge>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic p-3 bg-muted/30 rounded-md">
                No AI summary yet. Click Generate to analyze this candidate.
              </p>
            )}
          </div>

          {(candidate.callStatus && !['pending', null].includes(candidate.callStatus)) && (
            <div className="border-t pt-4">
              <Label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                <PhoneCall className="h-4 w-4 text-indigo-500" />
                AI Call Interview
              </Label>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center p-2 bg-muted/30 rounded-md">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="outline" className={`mt-1 text-[10px] ${
                    candidate.callStatus === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' :
                    candidate.callStatus === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800' :
                    candidate.callStatus === 'failed' || candidate.callStatus === 'no_answer' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800' :
                    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}>
                    {candidate.callStatus?.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div className="text-center p-2 bg-muted/30 rounded-md">
                  <p className="text-xs text-muted-foreground">Call Score</p>
                  <p className={`text-lg font-bold mt-0.5 ${
                    candidate.callScore !== null ?
                      (candidate.callScore >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                       candidate.callScore >= 60 ? 'text-blue-600 dark:text-blue-400' :
                       'text-red-600 dark:text-red-400') : ''
                  }`}>
                    {candidate.callScore ?? '--'}
                  </p>
                </div>
                <div className="text-center p-2 bg-muted/30 rounded-md">
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="text-lg font-bold mt-0.5 font-mono">
                    {candidate.callDuration ? `${Math.floor(candidate.callDuration / 60)}:${(candidate.callDuration % 60).toString().padStart(2, '0')}` : '--'}
                  </p>
                </div>
              </div>

              {candidate.callAttempts != null && candidate.callAttempts > 0 && (
                <p className="text-xs text-muted-foreground mb-2">
                  Attempt #{candidate.callAttempts}
                  {candidate.lastCallAt && ` | Last call: ${new Date(candidate.lastCallAt).toLocaleDateString()}`}
                </p>
              )}

              {candidate.callSummary && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Call Summary</p>
                  <p className="text-sm p-3 bg-muted/50 rounded-md" data-testid="text-call-summary">{candidate.callSummary}</p>
                </div>
              )}

              {candidate.callRecordingUrl && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    <Play className="h-3 w-3" /> Recording
                  </p>
                  <audio controls className="w-full" data-testid="audio-call-recording">
                    <source src={candidate.callRecordingUrl} />
                  </audio>
                </div>
              )}

              {candidate.callTranscript && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    <Mic className="h-3 w-3" /> Transcript
                  </p>
                  <ScrollArea className="h-[120px]">
                    <pre className="text-xs p-3 bg-muted/50 rounded-md whitespace-pre-wrap font-mono" data-testid="text-call-transcript">
                      {candidate.callTranscript}
                    </pre>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          <div className="border-t pt-4">
            <Label className="text-sm font-medium flex items-center gap-1.5 mb-3">
              <MessageSquare className="h-4 w-4" />
              Comments ({comments.length})
            </Label>

            <div className="space-y-2 mb-3">
              {commentsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-2">No comments yet</p>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="flex items-start gap-2 p-2 rounded-md bg-muted/30" data-testid={`comment-${comment.id}`}>
                    <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                      <AvatarFallback className="text-[10px]">{comment.authorName[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium">{comment.authorName}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); deleteCommentMutation.mutate(comment.id); }}
                            data-testid={`button-delete-comment-${comment.id}`}
                          >
                            <Trash2 className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm mt-0.5">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center gap-2">
              <Input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && commentText.trim()) {
                    addCommentMutation.mutate(commentText.trim());
                  }
                }}
                data-testid="input-comment"
              />
              <Button
                size="icon"
                onClick={() => { if (commentText.trim()) addCommentMutation.mutate(commentText.trim()); }}
                disabled={!commentText.trim() || addCommentMutation.isPending}
                data-testid="button-send-comment"
              >
                {addCommentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>
    </DialogContent>
  );
}

export default function PipelinePage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [location] = useLocation();
  const params = new URLSearchParams(location.split("?")[1] || "");
  const initialJobId = params.get("jobId") || "";

  const [selectedJobId, setSelectedJobId] = useState(initialJobId);
  const [search, setSearch] = useState("");
  const [detailCandidate, setDetailCandidate] = useState<Candidate | null>(null);
  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [arrowTop, setArrowTop] = useState<number | null>(null);
  const [arrowLeft, setArrowLeft] = useState(0);
  const [arrowRight, setArrowRight] = useState(0);

  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: ["/api/hr/jobs"],
  });

  const candidatesUrl = selectedJobId ? `/api/hr/candidates?jobId=${selectedJobId}` : "/api/hr/candidates";
  const { data: candidates = [], isLoading } = useQuery<Candidate[]>({
    queryKey: [candidatesUrl],
  });

  const updateStageMutation = useMutation({
    mutationFn: async ({ candidateId, stage }: { candidateId: string; stage: string }) => {
      const res = await apiRequest("PATCH", `/api/hr/candidates/${candidateId}/stage`, { stage });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => {
        const key = q.queryKey[0] as string;
        return key?.startsWith('/api/hr/candidates') || key?.startsWith('/api/hr/jobs');
      }});
    },
    onError: (error: any) => {
      queryClient.invalidateQueries({ predicate: (q) => {
        const key = q.queryKey[0] as string;
        return key?.startsWith('/api/hr/candidates');
      }});
      toast({ title: "Failed to update stage", description: error.message, variant: "destructive" });
    },
  });

  const filteredCandidates = candidates.filter((c) => {
    if (viewMode === "list" && stageFilter !== "all" && c.pipelineStage !== stageFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return c.firstName.toLowerCase().includes(s) ||
      c.lastName?.toLowerCase().includes(s) ||
      c.email?.toLowerCase().includes(s) ||
      c.currentCompany?.toLowerCase().includes(s) ||
      c.currentDesignation?.toLowerCase().includes(s) ||
      c.skills?.some(sk => sk.toLowerCase().includes(s));
  });

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const sortedCandidates = [...filteredCandidates].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortField) {
      case "name": return dir * `${a.firstName} ${a.lastName || ""}`.localeCompare(`${b.firstName} ${b.lastName || ""}`);
      case "aiScore": return dir * ((a.aiScore || 0) - (b.aiScore || 0));
      case "callScore": return dir * ((a.callScore || 0) - (b.callScore || 0));
      case "experience": return dir * ((a.totalExperienceYears || 0) - (b.totalExperienceYears || 0));
      case "stage": return dir * (a.pipelineStage || "").localeCompare(b.pipelineStage || "");
      case "createdAt": return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      default: return 0;
    }
  });

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

  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el || viewMode !== "list") return;
    const observer = new ResizeObserver(() => {
      updateScrollArrows();
      updateArrowPositions();
    });
    observer.observe(el);
    el.addEventListener("scroll", updateScrollArrows, { passive: true });
    const onScroll = () => {
      requestAnimationFrame(updateArrowPositions);
    };
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
  }, [viewMode, updateScrollArrows, updateArrowPositions, candidates.length]);

  const scrollTable = useCallback((direction: "left" | "right") => {
    const el = tableScrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.4;
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  }, []);

  const candidatesByStage = STAGES.reduce((acc, stage) => {
    acc[stage.value] = filteredCandidates.filter(c => c.pipelineStage === stage.value);
    return acc;
  }, {} as Record<string, Candidate[]>);

  const onDragEnd = useCallback((result: DropResult) => {
    const { draggableId, destination } = result;
    console.log("DRAG RESULT:", result);
    if (!destination) return;

    const newStage = destination.droppableId;
    const candidate = candidates.find(c => c.id === draggableId);
    if (!candidate || candidate.pipelineStage === newStage) return;

    queryClient.setQueryData<Candidate[]>([candidatesUrl], (old) => {
      if (!old) return old;
      return old.map(c => c.id === draggableId ? { ...c, pipelineStage: newStage } : c);
    });

    updateStageMutation.mutate({ candidateId: draggableId, stage: newStage });
  }, [candidates, candidatesUrl, updateStageMutation]);

  const openDetail = useCallback((candidate: Candidate) => {
    setDetailCandidate(candidate);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="px-1 pb-3">
        <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">{t('hr.pipeline.title')}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{t('hr.pipeline.subtitle')}</p>
          </div>
          <div className="flex items-center gap-1 border rounded-md p-0.5">
            <Button
              variant={viewMode === "board" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("board")}
              data-testid="button-view-board"
            >
              <LayoutGrid className="h-4 w-4 mr-1.5" />
              Board
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              data-testid="button-view-list"
            >
              <List className="h-4 w-4 mr-1.5" />
              List
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Select value={selectedJobId || "all"} onValueChange={(v) => setSelectedJobId(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[220px]" data-testid="select-job-filter">
              <SelectValue placeholder={t('hr.pipeline.allJobs')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('hr.pipeline.allJobs')}</SelectItem>
              {jobs.map(job => (
                <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {viewMode === "list" && (
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-stage-filter">
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {STAGES.map(stage => (
                  <SelectItem key={stage.value} value={stage.value}>{stage.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('hr.pipeline.searchCandidates')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-candidates"
            />
          </div>
          {viewMode === "list" && (
            <span className="text-sm text-muted-foreground ml-auto">{filteredCandidates.length} candidates</span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          {t('hr.pipeline.loadingCandidates')}
        </div>
      ) : viewMode === "board" ? (
        <div className="flex-1 overflow-x-auto pb-4">
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-3 min-w-max px-1">
              {STAGES.map(stage => {
                const stageCandidates = candidatesByStage[stage.value] || [];
                return (
                  <div key={stage.value} className="w-[260px] flex flex-col" data-testid={`column-${stage.value}`}>
                    <div className={`${stage.headerColor} rounded-t-md px-3 py-2 flex items-center justify-between gap-2`}>
                      <span className="text-sm font-medium text-white truncate">{t('hr.stages.' + stage.value)}</span>
                      <Badge variant="secondary" className="bg-white/20 text-white text-xs no-default-hover-elevate no-default-active-elevate">
                        {stageCandidates.length}
                      </Badge>
                    </div>
                    <Droppable droppableId={stage.value}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 min-h-[200px] rounded-b-md border border-t-0 p-2 transition-colors ${
                            snapshot.isDraggingOver
                              ? 'bg-primary/5 border-primary/30'
                              : 'bg-muted/20 border-border'
                          }`}
                        >
                          {stageCandidates.length === 0 && !snapshot.isDraggingOver ? (
                            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground/50">
                              <Users className="h-6 w-6 mb-1" />
                              <span className="text-xs">No candidates</span>
                            </div>
                          ) : (
                            stageCandidates.map((candidate, index) => (
                              <CandidateCard
                                key={candidate.id}
                                candidate={candidate}
                                index={index}
                                onOpen={openDetail}
                              />
                            ))
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        </div>
      ) : (
        <div className="flex-1 px-1 pb-4 min-w-0 overflow-hidden">
          {sortedCandidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users className="h-8 w-8 mb-2" />
              <p className="text-sm">No candidates found</p>
            </div>
          ) : (
            <div ref={tableWrapperRef} className="relative border rounded-md overflow-hidden">
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
              <div ref={tableScrollRef} className="overflow-x-auto">
                <table className="w-full text-sm" style={{ minWidth: '1100px' }}>
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">
                        <button className="flex items-center gap-1 hover-elevate rounded px-1 py-0.5" onClick={() => toggleSort("name")} data-testid="sort-name">
                          Candidate
                          {sortField === "name" ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />}
                        </button>
                      </th>
                      <th className="text-left p-3 font-medium">Role / Company</th>
                      <th className="text-center p-3 font-medium">
                        <button className="flex items-center gap-1 hover-elevate rounded px-1 py-0.5 mx-auto" onClick={() => toggleSort("experience")} data-testid="sort-experience">
                          Exp.
                          {sortField === "experience" ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />}
                        </button>
                      </th>
                      <th className="text-center p-3 font-medium">
                        <button className="flex items-center gap-1 hover-elevate rounded px-1 py-0.5 mx-auto" onClick={() => toggleSort("aiScore")} data-testid="sort-ai-score">
                          AI Score
                          {sortField === "aiScore" ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />}
                        </button>
                      </th>
                      <th className="text-center p-3 font-medium">Call Status</th>
                      <th className="text-center p-3 font-medium">
                        <button className="flex items-center gap-1 hover-elevate rounded px-1 py-0.5 mx-auto" onClick={() => toggleSort("callScore")} data-testid="sort-call-score">
                          Call Score
                          {sortField === "callScore" ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />}
                        </button>
                      </th>
                      <th className="text-center p-3 font-medium">
                        <button className="flex items-center gap-1 hover-elevate rounded px-1 py-0.5 mx-auto" onClick={() => toggleSort("stage")} data-testid="sort-stage">
                          Stage
                          {sortField === "stage" ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />}
                        </button>
                      </th>
                      <th className="text-left p-3 font-medium">Skills</th>
                      <th className="text-left p-3 font-medium">Contact</th>
                      <th className="text-center p-3 font-medium">
                        <button className="flex items-center gap-1 hover-elevate rounded px-1 py-0.5 mx-auto" onClick={() => toggleSort("createdAt")} data-testid="sort-date">
                          Added
                          {sortField === "createdAt" ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />}
                        </button>
                      </th>
                      <th className="text-left p-3 font-medium">CV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCandidates.map((candidate) => {
                      const stageInfo = getStageInfo(candidate.pipelineStage);
                      return (
                        <tr
                          key={candidate.id}
                          className="border-b last:border-b-0 hover-elevate cursor-pointer"
                          onClick={() => openDetail(candidate)}
                          data-testid={`row-candidate-${candidate.id}`}
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-8 w-8 shrink-0">
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  {candidate.firstName[0]}{candidate.lastName?.[0] || ""}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-medium truncate max-w-[160px]" data-testid={`list-name-${candidate.id}`}>
                                  {candidate.firstName} {candidate.lastName || ""}
                                </p>
                                {candidate.jobTitle && (
                                  <p className="text-xs text-muted-foreground truncate max-w-[160px]">{candidate.jobTitle}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="min-w-0 max-w-[160px]">
                              {candidate.currentDesignation && (
                                <p className="text-sm truncate">{candidate.currentDesignation}</p>
                              )}
                              {candidate.currentCompany && (
                                <p className="text-xs text-muted-foreground truncate">{candidate.currentCompany}</p>
                              )}
                              {!candidate.currentDesignation && !candidate.currentCompany && (
                                <span className="text-xs text-muted-foreground">--</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            {candidate.totalExperienceYears != null ? (
                              <span className="text-sm">{candidate.totalExperienceYears} yrs</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">--</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {candidate.aiScore !== null ? (
                              <div className="flex items-center justify-center gap-1">
                                <Star className={`h-3.5 w-3.5 ${candidate.aiScore >= 70 ? 'text-amber-500 fill-amber-500' : candidate.aiScore >= 40 ? 'text-amber-400' : 'text-muted-foreground'}`} />
                                <span className={`text-sm font-medium ${
                                  candidate.aiScore >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                                  candidate.aiScore >= 60 ? 'text-blue-600 dark:text-blue-400' :
                                  candidate.aiScore >= 40 ? 'text-amber-600 dark:text-amber-400' :
                                  'text-red-600 dark:text-red-400'
                                }`}>{candidate.aiScore}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">--</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {candidate.callStatus ? (
                              <Badge variant="outline" className={`text-[10px] ${
                                candidate.callStatus === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' :
                                candidate.callStatus === 'in_progress' || candidate.callStatus === 'calling' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800' :
                                candidate.callStatus === 'queued' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800' :
                                candidate.callStatus === 'failed' || candidate.callStatus === 'no_answer' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800' :
                                'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                              }`}>
                                {candidate.callStatus.replace(/_/g, ' ')}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">--</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {candidate.callScore != null ? (
                              <span className={`text-sm font-medium ${
                                candidate.callScore >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                                candidate.callScore >= 60 ? 'text-blue-600 dark:text-blue-400' :
                                'text-red-600 dark:text-red-400'
                              }`}>{candidate.callScore}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">--</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="outline" className={`text-[10px] ${stageInfo.headerColor} text-white border-transparent`}>
                              {stageInfo.label}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1 flex-wrap max-w-[180px]">
                              {candidate.skills && candidate.skills.length > 0 ? (
                                <>
                                  {candidate.skills.slice(0, 3).map(skill => (
                                    <Badge key={skill} variant="outline" className="text-[10px] px-1.5 py-0">
                                      {skill}
                                    </Badge>
                                  ))}
                                  {candidate.skills.length > 3 && (
                                    <span className="text-[10px] text-muted-foreground">+{candidate.skills.length - 3}</span>
                                  )}
                                </>
                              ) : (
                                <span className="text-xs text-muted-foreground">--</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="min-w-0 max-w-[160px] space-y-0.5">
                              {candidate.email && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Mail className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{candidate.email}</span>
                                </div>
                              )}
                              {candidate.phone && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Phone className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{candidate.phone}</span>
                                </div>
                              )}
                              {!candidate.email && !candidate.phone && (
                                <span className="text-xs text-muted-foreground">--</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground justify-center">
                              <Calendar className="h-3 w-3" />
                              {new Date(candidate.createdAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="p-3">
                            {candidate.cvFileName ? (
                              <a
                                href={`/api/hr/candidates/${candidate.id}/cv`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 text-xs text-primary hover:underline"
                                data-testid={`link-cv-${candidate.id}`}
                              >
                                <Download className="h-3 w-3" />
                                CV
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground">--</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={!!detailCandidate} onOpenChange={(open) => { if (!open) setDetailCandidate(null); }}>
        {detailCandidate && (
          <CandidateDetailDialog
            candidate={detailCandidate}
            onClose={() => setDetailCandidate(null)}
            candidatesUrl={candidatesUrl}
          />
        )}
      </Dialog>
    </div>
  );
}
