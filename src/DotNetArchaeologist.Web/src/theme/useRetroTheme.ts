import { useContext } from 'react'
import { ThemeContext } from './ThemeContextDefinition'
import type { ThemeContextType } from './ThemeContextDefinition'
import { THEMES } from './themes'

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
