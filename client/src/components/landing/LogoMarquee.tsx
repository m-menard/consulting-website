const companyLogos = [
  { name: "Linear", src: "/images/logos/linear.png", height: "h-8" },
  { name: "Triple Whale", src: "/images/logos/triple-whale.png", height: "h-10" },
  { name: "SimplePractice", src: "/images/logos/simple-practice.png", height: "h-9" },
  { name: "Avesha", src: "/images/logos/avesha.png", height: "h-9" },
  { name: "Machinify", src: "/images/logos/machinify.png", height: "h-8" },
  { name: "TomoCredit", src: "/images/logos/tomocredit.png", height: "h-10" },
] as const;

type LogoMarqueeProps = {
  variant?: "light" | "dark";
  /** Clip scroll to parent width (e.g. align with System Overview panel) */
  bounded?: boolean;
};

export function LogoMarquee({ variant = "light", bounded = false }: LogoMarqueeProps) {
  const track = [...companyLogos, ...companyLogos];
  const isDark = variant === "dark";

  return (
    <div
      className={`relative w-full overflow-hidden ${
        bounded
          ? "[mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]"
          : ""
      }`}
      aria-label="Trusted by leading companies"
      data-testid="company-logo-marquee"
    >
      {!bounded && (
        <>
          <div
            className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-12 sm:w-20 ${
              isDark
                ? "bg-gradient-to-r from-[#0B2D68] to-transparent"
                : "bg-gradient-to-r from-white to-transparent"
            }`}
          />
          <div
            className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-12 sm:w-20 ${
              isDark
                ? "bg-gradient-to-l from-[#0B2D68] to-transparent"
                : "bg-gradient-to-l from-white to-transparent"
            }`}
          />
        </>
      )}

      <div className="flex w-max animate-logo-marquee items-center gap-10 py-1 sm:gap-14 md:gap-16 motion-reduce:animate-none">
        {track.map((logo, index) => (
          <div
            key={`${logo.name}-${index}`}
            className="flex shrink-0 items-center gap-3 px-2"
            data-testid={`logo-${logo.name.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <img
              src={logo.src}
              alt=""
              aria-hidden
              className={`${logo.height} w-auto max-w-[120px] object-contain opacity-80 transition-opacity duration-300 hover:opacity-100`}
              loading="lazy"
              draggable={false}
            />
            <span
              className={`whitespace-nowrap text-sm font-semibold tracking-wide ${
                isDark ? "text-blue-100/80" : "text-slate-500"
              }`}
            >
              {logo.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LogoMarquee;
