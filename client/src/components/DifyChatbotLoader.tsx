import { useEffect } from "react";

function isCrawlerUserAgent(): boolean {
  if (typeof navigator === "undefined") return true;
  return /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|jina|gptbot|chatgpt/i.test(
    navigator.userAgent
  );
}

/**
 * Loads the Dify chatbot after idle time. Skipped for crawlers so pages
 * render quickly for tools like Jina Reader.
 */
export function DifyChatbotLoader() {
  useEffect(() => {
    const token = import.meta.env.VITE_DIFY_TOKEN;
    const baseUrl = import.meta.env.VITE_DIFY_BASE_URL;
    if (!token || !baseUrl || isCrawlerUserAgent()) return;

    const scriptId = `dify-chatbot-${token}`;
    if (document.getElementById(scriptId)) return;

    (window as Window & { difyChatbotConfig?: Record<string, unknown> }).difyChatbotConfig = {
      token,
      baseUrl,
      inputs: {},
      systemVariables: {},
      userVariables: {},
    };

    const loadScript = () => {
      if (document.getElementById(scriptId)) return;
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = `${baseUrl}/embed.min.js`;
      script.defer = true;
      document.body.appendChild(script);
    };

    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(loadScript, { timeout: 5000 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = setTimeout(loadScript, 3000);
    return () => clearTimeout(timeoutId);
  }, []);

  return null;
}
