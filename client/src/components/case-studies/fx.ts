"use client"

import { useCallback, useSyncExternalStore } from "react"

// Motion-FX preferences (particle hero, scroll cinematics). State is persisted
// to localStorage and broadcast via a window event so every subscriber stays in
// sync without React context spanning the server/client tree.

export type FxKey = "particles" | "scroll"

const STORAGE_KEYS: Record<FxKey, string> = {
  particles: "cadrian-fx-particles",
  scroll: "cadrian-fx-scroll",
}

export const FX_DEFAULTS: Record<FxKey, boolean> = {
  particles: true,
  scroll: true,
}

const EVENT = "cadrian-fx"

export function getFx(key: FxKey): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEYS[key])
    return v === null ? FX_DEFAULTS[key] : v === "on"
  } catch {
    return FX_DEFAULTS[key]
  }
}

export function setFx(key: FxKey, on: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEYS[key], on ? "on" : "off")
  } catch {
    /* storage unavailable; runtime change still broadcasts */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { key, on } }))
}

export function subscribeFx(cb: (key: FxKey, on: boolean) => void): () => void {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent).detail as { key: FxKey; on: boolean }
    cb(detail.key, detail.on)
  }
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}

// Reads the external (localStorage + event) store. The server snapshot is the
// default, so SSR and first client render agree; React swaps in the real value
// after hydration. Returns a primitive, so snapshot identity is never an issue.
export function useFx(key: FxKey): boolean {
  const subscribe = useCallback(
    (onChange: () => void) =>
      subscribeFx((k) => {
        if (k === key) onChange()
      }),
    [key]
  )
  return useSyncExternalStore(
    subscribe,
    () => getFx(key),
    () => FX_DEFAULTS[key]
  )
}
