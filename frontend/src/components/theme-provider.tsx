import { createContext, useContext, useEffect, useState } from "react"

export type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

/** How long the colors take to fade when the mode changes (see .theme-fade in index.css). */
const FADE_MS = 400

function readSavedTheme(storageKey: string, fallback: Theme): Theme {
  try {
    const saved = localStorage.getItem(storageKey)
    return saved === "dark" || saved === "light" || saved === "system" ? saved : fallback
  } catch {
    return fallback
  }
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => readSavedTheme(storageKey, defaultTheme))

  // Light or dark follows the choice, and "system" (Automatic) follows the device live,
  // for example when the operating system switches to dark mode in the evening.
  useEffect(() => {
    const root = window.document.documentElement
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    let fadeTimer: number | undefined

    const apply = (animate: boolean) => {
      const resolved = theme === "system" ? (media.matches ? "dark" : "light") : theme

      if (animate) {
        root.classList.add("theme-fade")
        window.clearTimeout(fadeTimer)
        fadeTimer = window.setTimeout(() => root.classList.remove("theme-fade"), FADE_MS)
      }

      root.classList.remove("light", "dark")
      root.classList.add(resolved)
      root.style.colorScheme = resolved
    }

    // The first run only confirms what index.html already applied; later runs fade.
    apply(false)

    if (theme !== "system") return () => window.clearTimeout(fadeTimer)

    const onChange = () => apply(true)
    media.addEventListener("change", onChange)
    return () => {
      media.removeEventListener("change", onChange)
      window.clearTimeout(fadeTimer)
    }
  }, [theme])

  const value = {
    theme,
    setTheme: (next: Theme) => {
      // Fade the colors for the switch the user just made.
      const root = window.document.documentElement
      root.classList.add("theme-fade")
      window.setTimeout(() => root.classList.remove("theme-fade"), FADE_MS)

      try {
        localStorage.setItem(storageKey, next)
      } catch {
        // Private browsing can refuse storage; the choice still applies until the page closes.
      }
      setTheme(next)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
