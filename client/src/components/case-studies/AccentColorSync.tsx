"use client"

import { useEffect } from "react"

// Sets the page accent as a CSS variable so layout-level chrome (the scroll
// progress bar) can pick up each case study's color. Resets on unmount so
// other routes fall back to the default indigo.
export default function AccentColorSync({ color }: { color: string }) {
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty("--cadrian-accent", color)
    return () => {
      root.style.removeProperty("--cadrian-accent")
    }
  }, [color])

  return null
}
