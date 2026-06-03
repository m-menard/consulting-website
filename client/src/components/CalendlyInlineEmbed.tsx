import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const CALENDLY_EMBED_MIN_WIDTH = 975;
export const CALENDLY_EMBED_HEIGHT = 685;

/** Trim Calendly outer margins inside the iframe */
const CROP_TOP_PX = 32;
const CROP_SIDE_PX = 24;
const CROP_BOTTOM_PX = 32;

type CalendlyInlineEmbedProps = {
  url: string;
  className?: string;
  height?: number;
};

function buildEmbedUrl(url: string): string {
  const parsed = new URL(url);
  parsed.searchParams.set("embed_type", "Inline");
  if (typeof window !== "undefined") {
    parsed.searchParams.set("embed_domain", window.location.hostname);
  }
  parsed.searchParams.set("background_color", "ffffff");
  parsed.searchParams.set("text_color", "0d1b2a");
  parsed.searchParams.set("primary_color", "176bd0");
  return parsed.toString();
}

export function CalendlyInlineEmbed({
  url,
  className,
  height = CALENDLY_EMBED_HEIGHT,
}: CalendlyInlineEmbedProps) {
  const [isLoading, setIsLoading] = useState(true);
  const iframeHeight = height + CROP_TOP_PX + CROP_BOTTOM_PX;

  return (
    <div
      className={cn("relative w-full min-w-0 overflow-hidden bg-white leading-none", className)}
      style={{ minWidth: CALENDLY_EMBED_MIN_WIDTH, height }}
      data-testid="calendly-inline-embed"
    >
      {isLoading && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-white"
          aria-hidden={!isLoading}
        >
          <Loader2 className="h-8 w-8 animate-spin text-[#176BD0]" aria-label="Loading calendar" />
        </div>
      )}
      <iframe
        src={buildEmbedUrl(url)}
        title="Schedule a 30-minute strategy call"
        className="block min-w-[975px] border-0 bg-white"
        style={{
          width: `calc(100% + ${CROP_SIDE_PX * 2}px)`,
          height: iframeHeight,
          marginTop: -CROP_TOP_PX,
          marginBottom: -CROP_BOTTOM_PX,
          marginLeft: -CROP_SIDE_PX,
        }}
        onLoad={() => setIsLoading(false)}
        allow="fullscreen"
      />
    </div>
  );
}
