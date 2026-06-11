"use client"

import { useEffect, useRef, useState } from "react"
import { useInView, useMotionValue, animate } from "framer-motion"

interface CountUpStatProps {
  value: string
  className?: string
}

// Parse a stat string into an optional animatable single number with prefix/suffix.
// Animatable only when there is exactly one number group and no range/word content
// (so "4 weeks", "~50%", "+30%", "14+" animate; "$5–8M", "6–8", "3-phase",
// "Self-serve" render statically).
function parseAnimatable(value: string): {
  prefix: string
  target: number
  suffix: string
  decimals: number
} | null {
  if (/–/.test(value)) return null // en dash = range
  const match = value.match(/^([^\d]*)(\d+(?:\.\d+)?)(.*)$/)
  if (!match) return null
  const [, prefix, numStr, suffix] = match
  // Reject if the suffix itself contains another number (multi-number string)
  if (/\d/.test(suffix)) return null
  const decimals = numStr.includes(".") ? numStr.split(".")[1].length : 0
  return { prefix, target: Number(numStr), suffix, decimals }
}

export default function CountUpStat({ value, className }: CountUpStatProps) {
  const ref = useRef<HTMLParagraphElement>(null)
  const inView = useInView(ref, { once: true, margin: "-40px" })
  const parsed = parseAnimatable(value)
  const motionValue = useMotionValue(0)
  const [display, setDisplay] = useState(parsed ? "0" : value)

  useEffect(() => {
    if (!parsed || !inView) return
    const controls = animate(motionValue, parsed.target, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        setDisplay(latest.toFixed(parsed.decimals))
      },
    })
    return () => controls.stop()
  }, [inView, parsed, motionValue])

  return (
    <p ref={ref} className={className}>
      {parsed ? (
        <>
          {parsed.prefix}
          <span className="tabular-nums">{display}</span>
          {parsed.suffix}
        </>
      ) : (
        value
      )}
    </p>
  )
}
