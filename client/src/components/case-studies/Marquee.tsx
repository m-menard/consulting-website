interface MarqueeProps {
  items: string[]
  /** Seconds for one full loop. */
  duration?: number
  className?: string
}

// Seamless infinite ticker. Renders the item list twice and translates -50%,
// so the loop is continuous. Pauses on hover (see globals.css .marquee).
export default function Marquee({ items, duration = 38, className = "" }: MarqueeProps) {
  return (
    <div
      className={`marquee group relative overflow-hidden ${className}`}
      style={{ "--marquee-duration": `${duration}s` } as React.CSSProperties}
      aria-hidden="true"
    >
      {/* edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-bg to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-bg to-transparent" />
      <div className="marquee-track">
        {[0, 1].map((dup) => (
          <ul key={dup} className="flex shrink-0 items-center">
            {items.map((item, i) => (
              <li key={`${dup}-${i}`} className="flex items-center">
                <span className="px-7 font-mono text-sm tracking-wide text-dim">
                  {item}
                </span>
                <span className="h-1 w-1 rounded-full bg-accent/50" />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  )
}
