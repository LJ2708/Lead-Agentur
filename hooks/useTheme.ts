"use client"

import { useCallback, useEffect, useState } from "react"

type Theme = "light" | "dark" | "system"

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? getSystemTheme() : theme
  const root = document.documentElement
  if (resolved === "dark") {
    root.classList.add("dark")
  } else {
    root.classList.remove("dark")
  }
}

export function useTheme(): {
  theme: Theme
  setTheme: (t: Theme) => void
} {
  const [theme, setThemeState] = useState<Theme>("system")

  // Initialise from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null
    const initial: Theme = stored ?? "system"
    setThemeState(initial)
    applyTheme(initial)
  }, [])

  // Listen for system preference changes when theme is "system"
  useEffect(() => {
    if (theme !== "system") return

    const mql = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => applyTheme("system")
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [theme])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    localStorage.setItem("theme", t)
    applyTheme(t)
  }, [])

  return { theme, setTheme }
}
