import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Package } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface PluginInfo {
  name: string;
  displayName: string;
  version: string;
  description?: string;
  enabled: boolean;
  registered: boolean;
  error?: string;
}

interface PluginsResponse {
  success: boolean;
  data: {
    plugins: PluginInfo[];
    total: number;
    enabled: number;
    registered: number;
  };
}

export default function PluginsManagement() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<PluginsResponse>({
    queryKey: ["/api/admin/plugins"],
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ name, enable }: { name: string; enable: boolean }) => {
      const action = enable ? "enable" : "disable";
      const res = await apiRequest("PUT", `/api/admin/plugins/${name}/${action}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || `Failed to ${action} plugin`);
      }
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plugins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plugins/capabilities"] });
      toast({
        title: "Plugin Updated",
        description: result.message || "Plugin status changed. Restart the server to apply changes.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const plugins = data?.data?.plugins || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12" data-testid="plugins-loading">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card data-testid="plugins-error">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-destructive font-medium" data-testid="text-plugins-error">Failed to load plugins</p>
          <p className="text-xs text-muted-foreground mt-1">
            {(error as Error)?.message || "Could not connect to the server"}
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()} data-testid="button-retry-plugins">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('admin.plugins.retry')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold" data-testid="text-plugins-title">Installed Plugins</h3>
          <p className="text-sm text-muted-foreground">
            {data?.data?.enabled || 0} of {data?.data?.total || 0} plugins enabled
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          data-testid="button-refresh-plugins"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          {t('admin.plugins.refresh')}
        </Button>
      </div>

      {plugins.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground" data-testid="text-no-plugins">No plugins discovered</p>
            <p className="text-xs text-muted-foreground mt-1">
              Plugins should be placed in the plugins/ directory with a plugin.json manifest
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {plugins.map((plugin) => (
            <Card key={plugin.name} data-testid={`card-plugin-${plugin.name}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base" data-testid={`text-plugin-name-${plugin.name}`}>
                      {plugin.displayName}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      v{plugin.version}
                    </Badge>
                    {plugin.enabled && plugin.registered && (
                      <Badge variant="default" className="text-xs" data-testid={`badge-plugin-active-${plugin.name}`}>
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    )}
                    {plugin.enabled && !plugin.registered && (
                      <Badge variant="destructive" className="text-xs" data-testid={`badge-plugin-restart-${plugin.name}`}>
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Restart Required
                      </Badge>
                    )}
                    {!plugin.enabled && (
                      <Badge variant="secondary" className="text-xs" data-testid={`badge-plugin-disabled-${plugin.name}`}>
                        <XCircle className="h-3 w-3 mr-1" />
                        Disabled
                      </Badge>
                    )}
                  </div>
                  {plugin.description && (
                    <CardDescription className="text-sm">
                      {plugin.description}
                    </CardDescription>
                  )}
                  {plugin.error && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {plugin.error}
                    </p>
                  )}
                </div>
                <Switch
                  checked={plugin.enabled}
                  disabled={toggleMutation.isPending}
                  onCheckedChange={(checked) => {
                    toggleMutation.mutate({ name: plugin.name, enable: checked });
                  }}
                  data-testid={`switch-plugin-${plugin.name}`}
                />
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              After enabling or disabling a plugin, restart the server for changes to take full effect.
              Plugin database migrations may need to be run separately if this is the first time enabling a plugin.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
