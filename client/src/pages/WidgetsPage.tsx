import { useState, useRef } from "react";
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { AuthStorage } from "@/lib/auth-storage";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Copy, Globe, ExternalLink, Pencil, Briefcase, Users, Check, Plus, Loader2, Upload, X, Eye, FileText } from "lucide-react";

type WebsiteWidget = {
  id: string;
  name: string;
  brandName?: string;
  primaryColor?: string;
  iconUrl?: string;
  embedToken: string;
  status: string;
  launcherText?: string;
  launcherPosition?: string;
  allowSkipCV?: boolean;
  launcherIcon?: string;
  widgetViews?: number;
  widgetApplications?: number;
};

type Job = {
  id: string;
  title: string;
  status: string;
  department?: string;
  location?: string;
  widgetEnabled: boolean;
  candidateCount?: number;
};

const LAUNCHER_ICONS = [
  { value: "briefcase", label: "Briefcase", emoji: "💼" },
  { value: "star", label: "Star", emoji: "⭐" },
  { value: "rocket", label: "Rocket", emoji: "🚀" },
  { value: "sparkle", label: "Sparkle", emoji: "✨" },
  { value: "none", label: "No Icon", emoji: "" },
];

function CodeSnippet({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <Button size="sm" variant="outline" onClick={copy} data-testid={`button-copy-${label.toLowerCase().replace(/\s+/g, '-')}`}>
          {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="bg-muted rounded-md p-3 text-xs overflow-x-auto whitespace-pre-wrap break-all border">{code}</pre>
    </div>
  );
}

function StatBox({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/40 border flex-1 min-w-[140px]">
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

export default function WidgetsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    widgetName: "",
    brandName: "",
    brandColor: "#4f46e5",
    brandLogoUrl: "",
    launcherText: "",
    inlineHeading: "",
    launcherPosition: "bottom-right",
    allowSkipCV: true,
    launcherIcon: "briefcase",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", brandColor: "#4f46e5" });

  const { data: widgets = [], isLoading: widgetsLoading } = useQuery<WebsiteWidget[]>({
    queryKey: ["/api/widgets"],
  });

  const { data: jobs = [], isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/hr/jobs"],
  });

  const widget = widgets[0] || null;
  const baseUrl = window.location.origin;
  const token = widget?.embedToken || "YOUR_EMBED_TOKEN";

  const floatingCode = `<script src="${baseUrl}/hiring-widget/embed.js" data-token="${token}"></script>`;
  const inlineCode = `<div data-hiring-widget data-token="${token}" data-mode="inline"></div>\n<script src="${baseUrl}/hiring-widget/embed.js"></script>`;

  const updateWidgetMutation = useMutation({
    mutationFn: async (data: typeof editForm & { id: string; logoFile: File | null }) => {
      const body: Record<string, any> = {
        name: data.widgetName,
        brandName: data.brandName,
        primaryColor: data.brandColor,
        launcherText: data.launcherText,
        welcomeMessage: data.inlineHeading,
        launcherPosition: data.launcherPosition,
        allowSkipCV: data.allowSkipCV,
        launcherIcon: data.launcherIcon,
      };
      if (data.brandLogoUrl) body.iconUrl = data.brandLogoUrl;

      const res = await apiRequest("PATCH", `/api/widgets/${data.id}`, body);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || "Failed to update widget");
      }

      if (data.logoFile) {
        const fd = new FormData();
        fd.append("icon", data.logoFile);
        const iconRes = await fetch(`/api/widgets/${data.id}/icon`, {
          method: "POST",
          headers: { Authorization: AuthStorage.getAuthHeader() || "" },
          body: fd,
          credentials: "include",
        });
        if (!iconRes.ok) {
          throw new Error("Widget saved but logo upload failed");
        }
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/widgets"] });
      setEditOpen(false);
      setLogoFile(null);
      setLogoPreview(null);
      toast({ title: "Widget updated", description: "Settings saved successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to update widget", variant: "destructive" });
    },
  });

  const createWidgetMutation = useMutation({
    mutationFn: async (data: { name: string; brandColor: string }) => {
      const res = await apiRequest("POST", "/api/widgets", {
        name: data.name || "Hiring Widget",
        primaryColor: data.brandColor,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || "Failed to create widget");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/widgets"] });
      setCreateOpen(false);
      toast({ title: "Widget created", description: "Your hiring widget is ready to embed." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to create widget", variant: "destructive" });
    },
  });

  const toggleJobMutation = useMutation({
    mutationFn: async ({ id, widgetEnabled }: { id: string; widgetEnabled: boolean }) => {
      const res = await apiRequest("PATCH", `/api/hr/jobs/${id}`, { widgetEnabled });
      if (!res.ok) throw new Error("Failed to update job");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/jobs"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update job widget setting", variant: "destructive" });
    },
  });

  const openEdit = () => {
    if (!widget) return;
    setEditForm({
      widgetName: widget.name || "",
      brandName: widget.brandName || widget.name || "",
      brandColor: widget.primaryColor || "#4f46e5",
      brandLogoUrl: "",
      launcherText: widget.launcherText || "Apply Now",
      inlineHeading: widget.welcomeMessage || "Find your next opportunity",
      launcherPosition: widget.launcherPosition || "bottom-right",
      allowSkipCV: widget.allowSkipCV !== false,
      launcherIcon: widget.launcherIcon || "briefcase",
    });
    setLogoFile(null);
    setLogoPreview(widget.iconUrl || null);
    setEditOpen(true);
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const clearLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  if (widgetsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!widget) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{t('widgets.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('widgets.description')}</p>
        </div>
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold mb-2">{t('widgets.setup')}</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
              Create a widget to get your embed token and start receiving applications directly from your company website.
            </p>
            <Button onClick={() => setCreateOpen(true)} data-testid="button-create-widget">
              <Plus className="h-4 w-4 mr-2" />
              {t('widgets.create')}
            </Button>
          </CardContent>
        </Card>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('widgets.create')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>{t('widgets.widgetName')}</Label>
                <Input
                  placeholder={t('widgets.widgetNamePlaceholder')}
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  data-testid="input-widget-name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>{t('widgets.brandColor')}</Label>
                <div className="flex items-center gap-3 mt-1">
                  <input
                    type="color"
                    value={createForm.brandColor}
                    onChange={(e) => setCreateForm({ ...createForm, brandColor: e.target.value })}
                    className="h-9 w-12 rounded-md border cursor-pointer"
                    data-testid="input-brand-color"
                  />
                  <Input
                    value={createForm.brandColor}
                    onChange={(e) => setCreateForm({ ...createForm, brandColor: e.target.value })}
                    placeholder="#4f46e5"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                onClick={() => createWidgetMutation.mutate(createForm)}
                disabled={createWidgetMutation.isPending}
                data-testid="button-create-widget-submit"
              >
                {createWidgetMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Widget
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('widgets.title')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('widgets.description')}
        </p>
      </div>

      {/* Analytics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('widgets.analytics')}</CardTitle>
          <CardDescription>{t('widgets.analyticsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <StatBox
              icon={Eye}
              label="Total Views"
              value={widget.widgetViews ?? 0}
              color="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
            />
            <StatBox
              icon={FileText}
              label="Applications Received"
              value={widget.widgetApplications ?? 0}
              color="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
            />
          </div>
        </CardContent>
      </Card>

      {/* Embed Code */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap pb-3">
          <div>
            <CardTitle className="text-base">{t('widgets.embedCode')}</CardTitle>
            <CardDescription>{t('widgets.embedCodeDesc')}</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/hiring-widget/preview.html?token=${token}`, "_blank")}
            data-testid="button-preview-widget"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Preview
          </Button>
        </CardHeader>
        <CardContent>
          <CodeSnippet code={floatingCode} label={t('widgets.floatingButton')} />
          <CodeSnippet code={inlineCode} label={t('widgets.inlineEmbed')} />
        </CardContent>
      </Card>

      {/* Widget Appearance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap pb-3">
          <div>
            <CardTitle className="text-base">{t('widgets.appearance')}</CardTitle>
            <CardDescription>{t('widgets.appearanceDesc')}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={openEdit} data-testid="button-edit-appearance">
            <Pencil className="h-3 w-3 mr-1" />
            Edit Appearance
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            {widget.iconUrl && (
              <img src={widget.iconUrl} alt="logo" className="h-10 w-10 rounded-md object-cover border" />
            )}
            <div className="flex items-center gap-3">
              <div
                className="h-8 w-8 rounded-md border"
                style={{ background: widget.primaryColor || "#4f46e5" }}
                title="Brand Color"
              />
              <div>
                <div className="font-medium text-sm">{widget.brandName || widget.name}</div>
                <div className="text-xs text-muted-foreground">{widget.primaryColor || "#4f46e5"}</div>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-3 flex-wrap">
              {widget.launcherText && (
                <span className="text-xs text-muted-foreground">"{widget.launcherText}"</span>
              )}
              <Badge variant={widget.allowSkipCV !== false ? "secondary" : "outline"} className="text-xs">
                {widget.allowSkipCV !== false ? "Skip CV: On" : "Skip CV: Off"}
              </Badge>
              <Badge variant={widget.status === "active" ? "default" : "secondary"}>
                {widget.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jobs in Widget */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('widgets.jobsShown')}</CardTitle>
          <CardDescription>{t('widgets.jobsShownDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {jobsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading jobs…
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>{t('widgets.noJobs')}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {jobs.map((job, i) => (
                <div key={job.id}>
                  {i > 0 && <Separator className="my-1" />}
                  <div className="flex items-center justify-between gap-4 py-2 flex-wrap">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{job.title}</div>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          {job.department && (
                            <span className="text-xs text-muted-foreground">{job.department}</span>
                          )}
                          {job.location && (
                            <span className="text-xs text-muted-foreground">{job.location}</span>
                          )}
                          <Badge
                            variant={job.status === "open" ? "default" : "secondary"}
                            className="text-xs h-4"
                          >
                            {job.status}
                          </Badge>
                          {typeof job.candidateCount === "number" && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {job.candidateCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {job.widgetEnabled ? "Visible" : "Hidden"}
                      </span>
                      <Switch
                        checked={!!job.widgetEnabled}
                        onCheckedChange={(checked) => toggleJobMutation.mutate({ id: job.id, widgetEnabled: checked })}
                        disabled={toggleJobMutation.isPending}
                        data-testid={`switch-widget-job-${job.id}`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Appearance Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Widget Appearance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Widget Name */}
            <div>
              <Label>{t('widgets.widgetName')}</Label>
              <Input
                placeholder={t('widgets.widgetNamePlaceholder')}
                value={editForm.widgetName}
                onChange={(e) => setEditForm({ ...editForm, widgetName: e.target.value })}
                data-testid="input-edit-widget-name"
                className="mt-1"
              />
            </div>

            {/* Company Name */}
            <div>
              <Label>{t('widgets.companyName')}</Label>
              <Input
                placeholder={t('widgets.companyNamePlaceholder')}
                value={editForm.brandName}
                onChange={(e) => setEditForm({ ...editForm, brandName: e.target.value })}
                data-testid="input-edit-brand-name"
                className="mt-1"
              />
            </div>

            {/* Brand Color */}
            <div>
              <Label>{t('widgets.brandColor')}</Label>
              <div className="flex items-center gap-3 mt-1">
                <input
                  type="color"
                  value={editForm.brandColor}
                  onChange={(e) => setEditForm({ ...editForm, brandColor: e.target.value })}
                  className="h-9 w-12 rounded-md border cursor-pointer"
                  data-testid="input-edit-brand-color"
                />
                <Input
                  value={editForm.brandColor}
                  onChange={(e) => setEditForm({ ...editForm, brandColor: e.target.value })}
                  placeholder="#4f46e5"
                  className="flex-1"
                />
              </div>
            </div>

            {/* Logo Upload */}
            <div>
              <Label>Logo</Label>
              <div className="mt-1 space-y-2">
                {logoPreview && (
                  <div className="flex items-center gap-3">
                    <img src={logoPreview} alt="Logo preview" className="h-12 w-12 rounded-md object-cover border" />
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={clearLogo}
                      data-testid="button-clear-logo"
                    >
                      <X className="h-3 w-3 mr-1" /> Remove
                    </Button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileChange}
                    className="hidden"
                    id="logo-upload-input"
                    data-testid="input-logo-file"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    data-testid="button-upload-logo"
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    {logoFile ? logoFile.name : "Upload Logo"}
                  </Button>
                  {!logoFile && !logoPreview && (
                    <>
                      <span className="text-xs text-muted-foreground">or</span>
                      <Input
                        placeholder="https://yoursite.com/logo.png"
                        value={editForm.brandLogoUrl}
                        onChange={(e) => setEditForm({ ...editForm, brandLogoUrl: e.target.value })}
                        data-testid="input-edit-logo-url"
                        className="flex-1"
                      />
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Button Display Name */}
            <div>
              <Label>{t('widgets.floatingButtonText')}</Label>
              <Input
                placeholder={t('widgets.floatingButtonPlaceholder')}
                value={editForm.launcherText}
                onChange={(e) => setEditForm({ ...editForm, launcherText: e.target.value })}
                data-testid="input-edit-launcher-text"
                className="mt-1"
              />
            </div>

            {/* Inline Embed Heading */}
            <div>
              <Label>{t('widgets.inlineEmbedHeading')}</Label>
              <Input
                placeholder={t('widgets.inlineEmbedPlaceholder')}
                value={editForm.inlineHeading}
                onChange={(e) => setEditForm({ ...editForm, inlineHeading: e.target.value })}
                data-testid="input-edit-inline-heading"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Text shown on the inline embed button</p>
            </div>

            {/* Button Icon */}
            <div>
              <Label>Button Icon</Label>
              <Select
                value={editForm.launcherIcon}
                onValueChange={(v) => setEditForm({ ...editForm, launcherIcon: v })}
              >
                <SelectTrigger className="mt-1" data-testid="select-launcher-icon">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LAUNCHER_ICONS.map((icon) => (
                    <SelectItem key={icon.value} value={icon.value}>
                      {icon.emoji ? `${icon.emoji} ` : ""}{icon.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Widget Position */}
            <div>
              <Label>{t('widgets.position')}</Label>
              <Select
                value={editForm.launcherPosition}
                onValueChange={(v) => setEditForm({ ...editForm, launcherPosition: v })}
              >
                <SelectTrigger className="mt-1" data-testid="select-launcher-position">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom-right">Bottom Right (default)</SelectItem>
                  <SelectItem value="bottom-left">Bottom Left</SelectItem>
                  <SelectItem value="top-right">Top Right</SelectItem>
                  <SelectItem value="top-left">Top Left</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Allow CV Skip */}
            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div>
                <Label className="cursor-pointer">Let candidates skip CV upload</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  When enabled, candidates can proceed without attaching a CV
                </p>
              </div>
              <Switch
                checked={editForm.allowSkipCV}
                onCheckedChange={(v) => setEditForm({ ...editForm, allowSkipCV: v })}
                data-testid="switch-allow-skip-cv"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              onClick={() => updateWidgetMutation.mutate({ id: widget.id, ...editForm, logoFile })}
              disabled={updateWidgetMutation.isPending}
              data-testid="button-save-appearance"
            >
              {updateWidgetMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
