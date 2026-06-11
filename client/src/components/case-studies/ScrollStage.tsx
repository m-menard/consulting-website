"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { useFx } from "@/components/case-studies/fx"

const STEPS = [
  {
    k: "01",
    t: "Discover",
    d: "We map the workflow, the data sources, and the decision points that actually move your metrics.",
  },
  {
    k: "02",
    t: "Design",
    d: "We architect a multi-agent system around your real constraints, not a generic template.",
  },
  {
    k: "03",
    t: "Ship",
    d: "We build and deploy to production. Working software in your stack, not a slide-deck demo.",
  },
  {
    k: "04",
    t: "Measure",
    d: "We instrument outcomes and tune against live results, so the impact is provable.",
  },
]

// True if the viewport is wide enough for pinned horizontal scroll and the user
// hasn't asked to reduce motion.
function useHorizontalCapable() {
  const [ok, setOk] = useState(false)
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1024px)")
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setOk(wide.matches && !reduce.matches)
    update()
    wide.addEventListener("change", update)
    reduce.addEventListener("change", update)
    return () => {
      wide.removeEventListener("change", update)
      reduce.removeEventListener("change", update)
    }
  }, [])
  return ok
}

export default function ScrollStage() {
  const on = useFx("scroll")
  const capable = useHorizontalCapable()
  const ref = useRef<HTMLDivElement>(null)

  // Hooks must run unconditionally; the values are only consumed in the
  // horizontal branch.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] })
  const x = useTransform(scrollYProgress, [0, 1], ["0vw", `-${(STEPS.length - 1) * 100}vw`])
  const progressWidth = useTransform(scrollYProgress, [0, 1], ["0%", "100%"])

  const horizontal = on && capable

  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-6 pt-24 lg:pt-32">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">How we work</p>
        <h2 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          Anatomy of an engagement
        </h2>
      </div>

      <div
        ref={ref}
        className="relative mt-10"
        style={horizontal ? { height: `${STEPS.length * 100}vh` } : undefined}
      >
        {horizontal ? (
          <div className="sticky top-0 flex h-screen items-center overflow-hidden">
            <motion.div style={{ x }} className="flex will-change-transform">
              {STEPS.map((s, i) => (
                <div
                  key={s.k}
                  className="flex h-screen w-screen shrink-0 items-center px-6 lg:px-24"
                >
                  <StepPanel step={s} index={i} />
                </div>
              ))}
            </motion.div>

            <div className="pointer-events-none absolute inset-x-0 bottom-12 mx-auto max-w-6xl px-6 lg:px-24">
              <div className="flex items-center gap-4">
                <span className="font-mono text-xs text-faint">
                  {STEPS[0].k} / {STEPS[STEPS.length - 1].k}
                </span>
                <div className="h-px flex-1 bg-line">
                  <motion.div style={{ width: progressWidth }} className="h-px bg-accent" />
                </div>
                <span className="font-mono text-xs text-faint">scroll →</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto grid max-w-6xl gap-5 px-6 sm:grid-cols-2">
            {STEPS.map((s, i) => (
              <div key={s.k} className="card-aurora rounded-2xl p-8 lg:p-10">
                <StepPanel step={s} index={i} compact />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function StepPanel({
  step,
  index,
  compact = false,
}: {
  step: (typeof STEPS)[number]
  index: number
  compact?: boolean
}) {
  const body = (
    <>
      <div className="flex items-center gap-4">
        <span className="font-mono text-sm font-bold tabular-nums text-accent">{step.k}</span>
        <span className="h-px w-10 bg-line-strong" />
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-faint">
          Step {index + 1} of {STEPS.length}
        </span>
      </div>
      <h3
        className={`mt-5 font-bold tracking-tight ${
          compact ? "text-3xl lg:text-4xl" : "text-5xl lg:text-7xl"
        }`}
      >
        {step.t}
      </h3>
      <p
        className={`mt-5 text-muted ${
          compact ? "text-base" : "max-w-xl text-xl lg:text-2xl"
        } leading-relaxed`}
      >
        {step.d}
      </p>
    </>
  )

  if (compact) return body
  return <div className="card-aurora w-full max-w-3xl rounded-3xl p-10 lg:p-16">{body}</div>
}
