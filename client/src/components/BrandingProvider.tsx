import { createContext, useContext, useEffect, useMemo } from "react";
import { useTheme } from "./ThemeProvider";
import { siteBranding, siteSeo, type SiteBranding } from "@/config/site";

type BrandingProviderState = {
  branding: SiteBranding;
  currentLogo: string | null;
  showLogo: boolean;
  showFavicon: boolean;
  isLoading: boolean;
  refetch: () => void;
};

const BrandingProviderContext = createContext<BrandingProviderState | undefined>(
  undefined
);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const branding = siteBranding;

  useEffect(() => {
    if (branding.favicon_url) {
      const existing = document.querySelector("link[rel='icon']");
      if (existing) {
        existing.setAttribute("href", branding.favicon_url);
      } else {
        const favicon = document.createElement("link");
        favicon.rel = "icon";
        favicon.href = branding.favicon_url;
        document.head.appendChild(favicon);
      }
    }
  }, [branding.favicon_url]);

  useEffect(() => {
    const expectedTitle = siteSeo.defaultTitle;
    if (document.title !== expectedTitle) {
      document.title = expectedTitle;
    }
  }, []);

  const currentLogo =
    theme === "dark" ? branding.logo_url_dark : branding.logo_url_light;

  const value = useMemo<BrandingProviderState>(
    () => ({
      branding,
      currentLogo: currentLogo ?? null,
      showLogo: !!currentLogo,
      showFavicon: !!branding.favicon_url,
      isLoading: false,
      refetch: () => {},
    }),
    [branding, currentLogo]
  );

  return (
    <BrandingProviderContext.Provider value={value}>
      {children}
    </BrandingProviderContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingProviderContext);
  if (context === undefined) {
    throw new Error("useBranding must be used within a BrandingProvider");
  }
  return context;
}
