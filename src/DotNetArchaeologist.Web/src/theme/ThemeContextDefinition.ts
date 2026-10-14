import { createContext } from 'react'
import type { RetroTheme, ThemeConfig } from './themes'

export interface ThemeContextType {
  theme: RetroTheme
  currentConfig: ThemeConfig
  setTheme: (theme: RetroTheme) => void
  availableThemes: ThemeConfig[]
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined)
