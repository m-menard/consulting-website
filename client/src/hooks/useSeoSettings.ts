import { useMemo } from "react";
import { siteSeo } from "@/config/site";

export interface PublicSeoSettings {
  defaultTitle: string | null;
  defaultDescription: string | null;
  defaultKeywords: string[];
  defaultOgImage: string | null;
  canonicalBaseUrl: string | null;
  twitterHandle: string | null;
  facebookAppId: string | null;
  googleVerification: string | null;
  bingVerification: string | null;
  structuredDataOrg: null;
  structuredDataFaq: null;
  structuredDataProduct: null;
}

export function useSeoSettings() {
  const data = useMemo<PublicSeoSettings>(
    () => ({
      defaultTitle: siteSeo.defaultTitle,
      defaultDescription: siteSeo.defaultDescription,
      defaultKeywords: siteSeo.defaultKeywords,
      defaultOgImage: siteSeo.defaultOgImage,
      canonicalBaseUrl: siteSeo.canonicalBaseUrl,
      twitterHandle: siteSeo.twitterHandle,
      facebookAppId: null,
      googleVerification: siteSeo.googleVerification,
      bingVerification: null,
      structuredDataOrg: null,
      structuredDataFaq: null,
      structuredDataProduct: null,
    }),
    []
  );

  return {
    data,
    isLoading: false,
    isError: false,
  };
}
