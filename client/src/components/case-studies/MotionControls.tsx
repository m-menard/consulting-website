"use client"

import { useEffect, useRef } from "react"
import { type FxKey, setFx, useFx } from "@/components/case-studies/fx"

// Compact dropdown for the motion layers (particle hero, scroll cinematics).
// The visual style is fixed ("Command"); only motion is user-adjustable.
export default function MotionControls() {
  const ref = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const el = ref.current
      if (el?.open && !el.contains(e.target as Node)) el.open = false
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && ref.current?.open) ref.current.open = false
    }
    document.addEventListener("pointerdown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [])

  return (
    <details ref={ref} className="fx-menu relative">
      <summary
        aria-label="Motion settings"
        title="Motion settings"
        className="flex h-9 cursor-pointer select-none items-center gap-2 rounded-full glass border border-line px-3 text-muted transition-colors hover:border-line-strong hover:text-fg"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12M20 18h0" />
          <circle cx="16" cy="6" r="2" />
          <circle cx="8" cy="12" r="2" />
          <circle cx="18" cy="18" r="2" />
        </svg>
        <span className="hidden font-mono text-xs uppercase tracking-[0.14em] sm:inline">
          Motion
        </span>
      </summary>

      <div className="glass-strong absolute right-0 z-50 mt-2.5 w-60 overflow-hidden rounded-xl border border-line p-1.5 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.6)]">
        <p className="px-3 pb-1 pt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
          Motion FX
        </p>
        <FxToggle fx="particles" label="Particle hero" desc="Cursor-reactive network" />
        <FxToggle fx="scroll" label="Scroll cinematics" desc="Pinned horizontal scroll" />
        <p className="px-3 pb-2 pt-2 text-[11px] leading-snug text-faint">
          Both respect reduced-motion automatically.
        </p>
      </div>
    </details>
  )
}

function FxToggle({ fx, label, desc }: { fx: FxKey; label: string; desc: string }) {
  const on = useFx(fx)
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => setFx(fx, !on)}
      className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-line"
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-fg">{label}</span>
        <span className="block truncate font-mono text-[11px] text-dim">{desc}</span>
      </span>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          on ? "bg-accent" : "bg-line-strong"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            on ? "translate-x-[18px]" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  )
}
