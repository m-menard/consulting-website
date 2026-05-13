import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Upload, FileArchive, FileText, CheckCircle, AlertCircle, Loader2, Star, XCircle, Phone, ChevronLeft, ChevronRight, Users, Copy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef, useMemo } from "react";
import { useTranslation } from 'react-i18next';
import { AuthStorage } from "@/lib/auth-storage";

interface Job {
  id: string;
  title: string;
  status: string;
}

interface CVUpload {
  id: string;
  jobId: string;
  fileName: string;
  fileSize: number | null;
  totalFiles: number;
  processedFiles: number;
  candidatesCreated: number;
  status: string;
  createdAt: string;
}

interface Candidate {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  pipelineStage: string;
  aiScore: number | null;
  aiSummary: string | null;
  cvFileName: string | null;
  appliedInOtherJobs?: boolean;
  otherJobCount?: number;
}

interface RejectedCV {
  fileName: string;
  reason: string;
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const authHeader = AuthStorage.getAuthHeader();
  if (authHeader) {
    headers["Authorization"] = authHeader;
  }
  return headers;
}

const PAGE_SIZE = 10;

export default function CVUploadPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [rejectedCvs, setRejectedCvs] = useState<RejectedCV[]>([]);
  const [duplicateCvs, setDuplicateCvs] = useState<RejectedCV[]>([]);
  const [uploadsPage, setUploadsPage] = useState(1);
  const [candidatesPage, setCandidatesPage] = useState(1);

  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: ["/api/hr/jobs"],
  });

  const { data: uploads = [], isLoading: uploadsLoading } = useQuery<CVUpload[]>({
    queryKey: ["/api/hr/cv-uploads", selectedJobId],
    queryFn: async () => {
      const url = selectedJobId ? `/api/hr/cv-uploads?jobId=${selectedJobId}` : "/api/hr/cv-uploads";
      const res = await fetch(url, { credentials: "include", headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: candidates = [] } = useQuery<Candidate[]>({
    queryKey: ["/api/hr/candidates", selectedJobId, "uploaded"],
    queryFn: async () => {
      if (!selectedJobId) return [];
      const res = await fetch(`/api/hr/candidates?jobId=${selectedJobId}`, { credentials: "include", headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!selectedJobId,
  });

  const paginatedUploads = useMemo(() => {
    const start = (uploadsPage - 1) * PAGE_SIZE;
    return uploads.slice(start, start + PAGE_SIZE);
  }, [uploads, uploadsPage]);

  const uploadsTotalPages = Math.max(1, Math.ceil(uploads.length / PAGE_SIZE));

  const cvCandidates = useMemo(() => candidates.filter(c => c.cvFileName), [candidates]);
  const paginatedCandidates = useMemo(() => {
    const start = (candidatesPage - 1) * PAGE_SIZE;
    return cvCandidates.slice(start, start + PAGE_SIZE);
  }, [cvCandidates, candidatesPage]);

  const candidatesTotalPages = Math.max(1, Math.ceil(cvCandidates.length / PAGE_SIZE));

  const handleUpload = async (file: File) => {
    if (!selectedJobId) {
      toast({ title: t('hr.cvUpload.pleaseSelectJob'), variant: "destructive" });
      return;
    }

    if (!file.name.endsWith(".zip") && !file.name.endsWith(".pdf") && !file.name.endsWith(".doc") && !file.name.endsWith(".docx")) {
      toast({ title: t('hr.cvUpload.unsupportedFormat'), description: t('hr.cvUpload.unsupportedFormatDesc'), variant: "destructive" });
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    setRejectedCvs([]);
    setDuplicateCvs([]);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("jobId", selectedJobId);

    try {
      setUploadProgress(30);
      const res = await fetch("/api/hr/cv-uploads", {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: getAuthHeaders(),
      });

      setUploadProgress(70);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      const result = await res.json();

      setUploadProgress(100);
      queryClient.invalidateQueries({ queryKey: ["/api/hr/cv-uploads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/candidates"] });

      if (result.rejectedCvs && result.rejectedCvs.length > 0) {
        setRejectedCvs(result.rejectedCvs);
      }
      if (result.duplicateCvs && result.duplicateCvs.length > 0) {
        setDuplicateCvs(result.duplicateCvs);
      }

      const accepted = result.candidatesCreated || 0;
      const rejected = result.rejectedCvs?.length || 0;
      const duplicates = result.duplicateCvs?.length || 0;

      if (rejected > 0 || duplicates > 0) {
        toast({
          title: `Upload complete: ${accepted} accepted${rejected ? `, ${rejected} rejected` : ''}${duplicates ? `, ${duplicates} duplicates skipped` : ''}`,
          description: rejected ? "CVs without a phone number were rejected." : duplicates ? "Duplicate candidates were skipped." : undefined,
          variant: accepted === 0 ? "destructive" : "default",
        });
      } else {
        toast({ title: `${accepted} CV${accepted !== 1 ? 's' : ''} uploaded successfully` });
      }
    } catch (error: any) {
      toast({ title: t('hr.cvUpload.uploadFailed'), description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const openJobs = jobs.filter(j => j.status === "open" || j.status === "paused");

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const statusIcons: Record<string, any> = {
    completed: <CheckCircle className="h-4 w-4 text-emerald-500" />,
    processing: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
    failed: <AlertCircle className="h-4 w-4 text-red-500" />,
    pending: <Loader2 className="h-4 w-4 text-amber-500" />,
  };

  const selectedJobTitle = jobs.find(j => j.id === selectedJobId)?.title;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">{t('hr.cvUpload.title')}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t('hr.cvUpload.subtitle')}</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <Select value={selectedJobId} onValueChange={(v) => { setSelectedJobId(v); setUploadsPage(1); setCandidatesPage(1); }}>
                  <SelectTrigger data-testid="select-job-for-upload">
                    <SelectValue placeholder={t('hr.cvUpload.selectJobForUpload')} />
                  </SelectTrigger>
                  <SelectContent>
                    {openJobs.map(job => (
                      <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging ? 'border-primary bg-primary/5' :
                selectedJobId ? 'border-primary/30 hover:border-primary/50 cursor-pointer' : 'border-muted opacity-50'
              }`}
              onClick={() => selectedJobId && fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (selectedJobId && !uploading) setIsDragging(true);
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (selectedJobId && !uploading) setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
                if (!selectedJobId || uploading) return;
                const file = e.dataTransfer.files?.[0];
                if (file) handleUpload(file);
              }}
              data-testid="dropzone-cv-upload"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,.pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                disabled={!selectedJobId || uploading}
              />
              {uploading ? (
                <div className="space-y-3">
                  <Loader2 className="h-10 w-10 mx-auto text-primary animate-spin" />
                  <p className="text-sm font-medium">{t('hr.cvUpload.uploadingProcessing')}</p>
                  <Progress value={uploadProgress} className="max-w-xs mx-auto" />
                </div>
              ) : isDragging ? (
                <>
                  <Upload className="h-10 w-10 mx-auto text-primary mb-3" />
                  <p className="font-medium mb-1 text-primary">{t('cvUpload.dropFile')}</p>
                  <p className="text-sm text-muted-foreground">{t('cvUpload.fileTypes')}</p>
                </>
              ) : (
                <>
                  <FileArchive className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="font-medium mb-1">
                    {selectedJobId ? t('hr.cvUpload.clickToUpload') : t('hr.cvUpload.selectJobFirst')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('hr.cvUpload.supportedFormats')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('cvUpload.phoneRequired')}
                  </p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {rejectedCvs.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              {t('cvUpload.rejectedCvs')} ({rejectedCvs.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('cvUpload.fileName')}</TableHead>
                  <TableHead>{t('cvUpload.reason')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rejectedCvs.map((cv, idx) => (
                  <TableRow key={idx} data-testid={`row-rejected-cv-${idx}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-destructive" />
                        <span className="font-medium">{cv.fileName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-destructive">
                        <Phone className="h-3.5 w-3.5" />
                        {cv.reason}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {duplicateCvs.length > 0 && (
        <Card className="border-amber-500/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Copy className="h-5 w-5 text-amber-500" />
              {t('cvUpload.duplicateSkipped')} ({duplicateCvs.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('cvUpload.fileName')}</TableHead>
                  <TableHead>{t('cvUpload.reason')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {duplicateCvs.map((cv, idx) => (
                  <TableRow key={idx} data-testid={`row-duplicate-cv-${idx}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-amber-500" />
                        <span className="font-medium">{cv.fileName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
                        <Copy className="h-3.5 w-3.5" />
                        {cv.reason}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {uploadsLoading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">{t('hr.cvUpload.loadingUploads')}</div>
      ) : uploads.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base">{t('hr.cvUpload.uploadHistory')}</CardTitle>
            <span className="text-sm text-muted-foreground">{uploads.length} upload{uploads.length !== 1 ? 's' : ''}</span>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('hr.cvUpload.file')}</TableHead>
                  <TableHead>{t('hr.cvUpload.size')}</TableHead>
                  <TableHead>{t('cvUpload.totalCvs')}</TableHead>
                  <TableHead>{t('cvUpload.processed')}</TableHead>
                  <TableHead>{t('cvUpload.candidatesCreated')}</TableHead>
                  <TableHead>{t('hr.cvUpload.status')}</TableHead>
                  <TableHead>{t('hr.cvUpload.uploaded')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUploads.map((upload) => (
                  <TableRow key={upload.id} data-testid={`row-upload-${upload.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{upload.fileName}</span>
                      </div>
                    </TableCell>
                    <TableCell>{formatFileSize(upload.fileSize)}</TableCell>
                    <TableCell>
                      <span className="font-medium">{upload.totalFiles || 1}</span>
                    </TableCell>
                    <TableCell>
                      <span>{upload.processedFiles || 0}/{upload.totalFiles || 1}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">{upload.candidatesCreated || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {statusIcons[upload.status]}
                        <span className="text-sm capitalize">{upload.status}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(upload.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          {uploadsTotalPages > 1 && (
            <CardFooter className="flex items-center justify-between gap-2 px-4 py-3 border-t">
              <span className="text-sm text-muted-foreground">
                Page {uploadsPage} of {uploadsTotalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={uploadsPage <= 1}
                  onClick={() => setUploadsPage(p => p - 1)}
                  data-testid="button-uploads-prev"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={uploadsPage >= uploadsTotalPages}
                  onClick={() => setUploadsPage(p => p + 1)}
                  data-testid="button-uploads-next"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>
      )}

      {selectedJobId && cvCandidates.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base">{t('hr.cvUpload.candidatesFromUploads')}</CardTitle>
            <span className="text-sm text-muted-foreground">{cvCandidates.length} candidate{cvCandidates.length !== 1 ? 's' : ''}</span>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('hr.pipeline.candidate')}</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>{t('hr.cvUpload.cvFile')}</TableHead>
                  <TableHead>{t('hr.cvUpload.aiScore')}</TableHead>
                  <TableHead>{t('hr.cvUpload.stage')}</TableHead>
                  <TableHead>{t('hr.cvUpload.summary')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCandidates.map((candidate) => (
                  <TableRow key={candidate.id} data-testid={`row-candidate-${candidate.id}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{candidate.firstName} {candidate.lastName || ""}</p>
                        <p className="text-xs text-muted-foreground">{candidate.email}</p>
                        {candidate.appliedInOtherJobs && (
                          <Badge variant="secondary" className="text-xs mt-1" data-testid={`badge-cross-job-${candidate.id}`}>
                            Applied in {candidate.otherJobCount || 'other'} other job{(candidate.otherJobCount || 0) !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{candidate.phone || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate max-w-[150px]">{candidate.cvFileName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {candidate.aiScore !== null ? (
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                          <span className="font-medium">{candidate.aiScore}/100</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">{t('hr.cvUpload.pending')}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{candidate.pipelineStage.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground truncate max-w-[250px]">
                        {candidate.aiSummary || t('hr.cvUpload.notYetScreened')}
                      </p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          {candidatesTotalPages > 1 && (
            <CardFooter className="flex items-center justify-between gap-2 px-4 py-3 border-t">
              <span className="text-sm text-muted-foreground">
                Page {candidatesPage} of {candidatesTotalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={candidatesPage <= 1}
                  onClick={() => setCandidatesPage(p => p - 1)}
                  data-testid="button-candidates-prev"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={candidatesPage >= candidatesTotalPages}
                  onClick={() => setCandidatesPage(p => p + 1)}
                  data-testid="button-candidates-next"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>
      )}
    </div>
  );
}
