"use client"

import { useCallback } from "react"

const STORAGE_KEY = "cadrian-theme"

// State lives on <html data-theme> (set pre-paint in index.html), so the icon
// is driven entirely by CSS and the button needs no React state, so there is no
// hydration mismatch and it works on first paint.
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const toggle = useCallback(() => {
    const root = document.querySelector(".case-studies-root") ?? document.documentElement
    const current = root.getAttribute("data-theme") === "light" ? "light" : "dark"
    const next = current === "light" ? "dark" : "light"
    root.setAttribute("data-theme", next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* storage unavailable; runtime toggle still works */
    }
  }, [])

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle color theme"
      title="Toggle theme"
      className={`group relative grid h-9 w-9 place-items-center rounded-full glass border border-line text-muted transition-colors hover:text-fg hover:border-line-strong ${className}`}
    >
      <span className="relative block h-[18px] w-[18px]">
        {/* Moon, shown in dark mode */}
        <svg
          className="theme-icon icon-moon absolute inset-0 h-[18px] w-[18px]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
        {/* Sun, shown in light mode */}
        <svg
          className="theme-icon icon-sun absolute inset-0 h-[18px] w-[18px]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      </span>
    </button>
  )
}
