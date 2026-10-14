import React, { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { THEMES } from './themes'
import type { RetroTheme, ThemeConfig } from './themes'

interface ThemeContextType {
  theme: RetroTheme
  currentConfig: ThemeConfig
  setTheme: (theme: RetroTheme) => void
  availableThemes: ThemeConfig[]
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const STORAGE_KEY = 'dotnet_archaeologist_theme'

function applyThemeDom(themeKey: RetroTheme) {
  if (typeof document === 'undefined') return
  const config = THEMES[themeKey] || THEMES.win98

  let styleTag = document.getElementById('retro-os-theme-css') as HTMLStyleElement | null
  if (!styleTag) {
    styleTag = document.createElement('style')
    styleTag.id = 'retro-os-theme-css'
    document.head.prepend(styleTag)
  }
  styleTag.textContent = config.cssContent

  document.body.className = config.bodyClass
  document.body.style.background = config.bodyBackground
  document.body.style.fontFamily = config.fontFamily
}

// Inizializzazione immediata all'avvio
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as RetroTheme | null
    const initialTheme: RetroTheme = saved && THEMES[saved] ? saved : 'win98'
    applyThemeDom(initialTheme)
  } catch {
    applyThemeDom('win98')
  }
}

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<RetroTheme>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY) as RetroTheme | null
        if (saved && THEMES[saved]) return saved
      } catch {
        // Fallback default
      }
    }
    return 'win98'
  })

  useEffect(() => {
    applyThemeDom(theme)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // Ignore storage errors
    }
  }, [theme])

  const setTheme = (newTheme: RetroTheme) => {
    if (THEMES[newTheme]) {
      setThemeState(newTheme)
    }
  }

  const value: ThemeContextType = {
    theme,
    currentConfig: THEMES[theme],
    setTheme,
    availableThemes: Object.values(THEMES)
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useRetroTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext)
  if (!context) {
    return {
      theme: 'win98',
      currentConfig: THEMES.win98,
      setTheme: () => {},
      availableThemes: Object.values(THEMES)
    }
  }
  return context
}
