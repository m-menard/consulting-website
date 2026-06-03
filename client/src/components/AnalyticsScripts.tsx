import { useEffect } from "react";
import { gaMeasurementId } from "@/config/site";

/**
 * Optional Google Analytics (marketing site). Set VITE_GA_MEASUREMENT_ID at build time.
 */
export function AnalyticsScripts() {
  useEffect(() => {
    if (!gaMeasurementId || typeof window === "undefined") return;

    const scriptId = "ga-measurement";
    if (document.getElementById(scriptId)) return;

    const loader = document.createElement("script");
    loader.id = scriptId;
    loader.async = true;
    loader.src = `https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`;
    document.head.appendChild(loader);

    const inline = document.createElement("script");
    inline.textContent = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gaMeasurementId}');
    `;
    document.head.appendChild(inline);
  }, []);

  return null;
}
