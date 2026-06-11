"use client"

import { useEffect, useRef } from "react"
import { useFx } from "@/components/case-studies/fx"

// A live "agent network": drifting nodes wired by proximity edges, with a few
// glowing hub agents, that react to the cursor. Canvas 2D (dependency-free,
// GPU-light) reading the active theme's --accent / --text so it adapts to every
// skin + light/dark. Pauses offscreen and when the tab is hidden; renders a
// single static frame under prefers-reduced-motion.
export default function ParticleField({ className = "" }: { className?: string }) {
  const on = useFx("particles")
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!on) return
    const canvas = canvasRef.current
    const parent = canvas?.parentElement
    const ctx = canvas?.getContext("2d")
    if (!canvas || !parent || !ctx) return

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    let width = 0
    let height = 0
    type Node = { x: number; y: number; vx: number; vy: number; r: number; hub: boolean }
    let nodes: Node[] = []
    const pointer = { x: -9999, y: -9999, active: false }

    let colAccent = "#6d72f6"
    let colNode = "#f4f4f8"
    const readColors = () => {
      const themeRoot = parent.closest(".case-studies-root") ?? document.documentElement
      const cs = getComputedStyle(themeRoot)
      colAccent = cs.getPropertyValue("--accent").trim() || colAccent
      colNode = cs.getPropertyValue("--text").trim() || colNode
    }

    const hexToRgb = (h: string) => {
      let s = h.replace("#", "")
      if (s.length === 3) s = s.split("").map((c) => c + c).join("")
      const n = parseInt(s, 16)
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
    }
    const withAlpha = (c: string, a: number) => {
      if (c.startsWith("#")) {
        const { r, g, b } = hexToRgb(c)
        return `rgba(${r},${g},${b},${a})`
      }
      if (c.startsWith("rgb")) {
        return c.replace(/rgba?\(([^)]+)\)/, (_m, inner: string) => {
          const p = inner.split(",").slice(0, 3).map((s) => s.trim())
          return `rgba(${p.join(",")},${a})`
        })
      }
      return c
    }

    const build = () => {
      const count = Math.max(24, Math.min(78, Math.round((width * height) / 22000)))
      nodes = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.5 + 1,
        hub: i % 9 === 0,
      }))
    }

    const resize = () => {
      const rect = parent.getBoundingClientRect()
      width = rect.width
      height = rect.height
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      build()
    }

    const MAX_DIST = 132
    const draw = () => {
      ctx.clearRect(0, 0, width, height)

      for (const p of nodes) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > width) p.vx *= -1
        if (p.y < 0 || p.y > height) p.vy *= -1
        if (pointer.active) {
          const dx = p.x - pointer.x
          const dy = p.y - pointer.y
          const d = Math.hypot(dx, dy)
          if (d < 170 && d > 0.01) {
            const f = ((170 - d) / 170) * 0.7
            p.x += (dx / d) * f
            p.y += (dy / d) * f
          }
        }
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]
          const b = nodes[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const d = Math.hypot(dx, dy)
          if (d < MAX_DIST) {
            const t = 1 - d / MAX_DIST
            ctx.strokeStyle = withAlpha(a.hub || b.hub ? colAccent : colNode, t * 0.2)
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      for (const p of nodes) {
        if (p.hub) {
          ctx.beginPath()
          ctx.fillStyle = withAlpha(colAccent, 0.16)
          ctx.arc(p.x, p.y, p.r + 7, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.beginPath()
        ctx.fillStyle = p.hub ? colAccent : withAlpha(colNode, 0.5)
        ctx.arc(p.x, p.y, p.hub ? p.r + 1.4 : p.r, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    let raf = 0
    let running = false
    const loop = () => {
      if (!running) return
      draw()
      raf = requestAnimationFrame(loop)
    }
    const start = () => {
      if (running || reduce) return
      running = true
      raf = requestAnimationFrame(loop)
    }
    const stop = () => {
      running = false
      cancelAnimationFrame(raf)
    }

    const onMove = (e: MouseEvent) => {
      const rect = parent.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      pointer.x = x
      pointer.y = y
      pointer.active = x >= 0 && x <= width && y >= 0 && y <= height
    }

    readColors()
    resize()
    draw()
    start()

    const ro = new ResizeObserver(resize)
    ro.observe(parent)
    const mo = new MutationObserver(readColors)
    const themeRoot = parent.closest(".case-studies-root") ?? document.documentElement
    mo.observe(themeRoot, { attributes: true, attributeFilter: ["data-theme"] })
    const io = new IntersectionObserver(
      ([entry]) => (entry?.isIntersecting ? start() : stop()),
      { threshold: 0 }
    )
    io.observe(parent)
    const onVis = () => (document.hidden ? stop() : start())
    window.addEventListener("mousemove", onMove, { passive: true })
    document.addEventListener("visibilitychange", onVis)

    return () => {
      stop()
      ro.disconnect()
      mo.disconnect()
      io.disconnect()
      window.removeEventListener("mousemove", onMove)
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [on])

  if (!on) return null
  return <canvas ref={canvasRef} aria-hidden="true" className={`absolute inset-0 h-full w-full ${className}`} />
}
