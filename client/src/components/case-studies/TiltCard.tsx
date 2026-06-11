"use client"

import { useRef, useCallback } from "react"

interface TiltCardProps {
  children: React.ReactNode
  className?: string
  /** Max rotation in degrees. */
  max?: number
}

// Subtle 3D tilt + cursor-following glow. The glow position is exposed as
// --gx/--gy CSS vars so children can paint a highlight; on coarse pointers and
// reduced-motion the effect is skipped and the card stays flat.
export default function TiltCard({ children, className = "", max = 6 }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const raf = useRef(0)

  const handleMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = ref.current
      if (!el) return
      if (!window.matchMedia("(pointer: fine)").matches) return
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

      const rect = el.getBoundingClientRect()
      const px = (e.clientX - rect.left) / rect.width
      const py = (e.clientY - rect.top) / rect.height

      cancelAnimationFrame(raf.current)
      raf.current = requestAnimationFrame(() => {
        el.style.setProperty("--rx", `${(0.5 - py) * max}deg`)
        el.style.setProperty("--ry", `${(px - 0.5) * max}deg`)
        el.style.setProperty("--gx", `${px * 100}%`)
        el.style.setProperty("--gy", `${py * 100}%`)
      })
    },
    [max]
  )

  const reset = useCallback(() => {
    const el = ref.current
    if (!el) return
    cancelAnimationFrame(raf.current)
    el.style.setProperty("--rx", "0deg")
    el.style.setProperty("--ry", "0deg")
  }, [])

  return (
    <div style={{ perspective: "1200px" }} className={className}>
      <div
        ref={ref}
        onMouseMove={handleMove}
        onMouseLeave={reset}
        className="h-full transition-transform duration-300 ease-out [transform:rotateX(var(--rx,0))_rotateY(var(--ry,0))] [transform-style:preserve-3d]"
      >
        {children}
      </div>
    </div>
  )
}
