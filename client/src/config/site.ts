/**
 * Static site configuration for the marketing site (no database).
 * Override via VITE_* env vars at build time (Vercel Project Settings → Environment Variables).
 */

export interface SiteBranding {
  app_name: string;
  app_tagline: string;
  logo_url: string | null;
  logo_url_light: string | null;
  logo_url_dark: string | null;
  favicon_url: string | null;
  social_twitter_url: string | null;
  social_linkedin_url: string | null;
  social_github_url: string | null;
}

export interface SiteSeo {
  defaultTitle: string;
  defaultDescription: string;
  defaultKeywords: string[];
  defaultOgImage: string | null;
  canonicalBaseUrl: string | null;
  twitterHandle: string | null;
  googleVerification: string | null;
}

function env(key: string): string | undefined {
  const v = import.meta.env[key];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

export const siteBranding: SiteBranding = {
  app_name: env("VITE_APP_NAME") ?? "AcceLLM",
  app_tagline:
    env("VITE_APP_TAGLINE") ??
    "Design, build, and deploy production-grade AI systems.",
  logo_url: env("VITE_LOGO_URL") ?? null,
  logo_url_light: env("VITE_LOGO_URL_LIGHT") ?? env("VITE_LOGO_URL") ?? null,
  logo_url_dark: env("VITE_LOGO_URL_DARK") ?? env("VITE_LOGO_URL") ?? null,
  favicon_url: env("VITE_FAVICON_URL") ?? "/favicon.png",
  social_twitter_url: env("VITE_SOCIAL_TWITTER_URL") ?? null,
  social_linkedin_url: env("VITE_SOCIAL_LINKEDIN_URL") ?? null,
  social_github_url: env("VITE_SOCIAL_GITHUB_URL") ?? null,
};

const defaultKeywords = [
  "AI consulting company",
  "production AI systems",
  "workflow automation",
  "AI agents",
  "enterprise AI deployment",
];

export const siteSeo: SiteSeo = {
  defaultTitle:
    env("VITE_SEO_TITLE") ?? `${siteBranding.app_name} - Engineering the Future of Intelligence`,
  defaultDescription:
    env("VITE_SEO_DESCRIPTION") ?? siteBranding.app_tagline,
  defaultKeywords: env("VITE_SEO_KEYWORDS")
    ? env("VITE_SEO_KEYWORDS")!.split(",").map((k) => k.trim())
    : defaultKeywords,
  defaultOgImage: env("VITE_OG_IMAGE_URL") ?? "/og-image.png",
  canonicalBaseUrl: env("VITE_CANONICAL_BASE_URL") ?? null,
  twitterHandle: env("VITE_TWITTER_HANDLE") ?? null,
  googleVerification: env("VITE_GOOGLE_SITE_VERIFICATION") ?? null,
};

export const gaMeasurementId = env("VITE_GA_MEASUREMENT_ID");
