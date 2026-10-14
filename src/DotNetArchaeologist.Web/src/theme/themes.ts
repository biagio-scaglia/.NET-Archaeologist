import win98Css from '98.css/dist/98.css?inline'
import xpCss from 'xp.css/dist/XP.css?inline'
import win7Css from '7.css/dist/7.css?inline'

export const RETRO_THEMES = ['win98', 'winxp', 'win7'] as const
export type RetroTheme = (typeof RETRO_THEMES)[number]
export const RetroTheme = {
  Win98: 'win98' as const,
  WinXP: 'winxp' as const,
  Win7: 'win7' as const
}

export interface ThemeConfig {
  id: RetroTheme
  name: string
  cssContent: string
  bodyClass: string
  bodyBackground: string
  fontFamily: string
}

export const THEMES: Record<RetroTheme, ThemeConfig> = {
  win98: {
    id: 'win98',
    name: 'Windows 98 (Classic)',
    cssContent: win98Css,
    bodyClass: 'theme-win98',
    bodyBackground: '#008080',
    fontFamily: '"MS Sans Serif", Arial, sans-serif'
  },
  winxp: {
    id: 'winxp',
    name: 'Windows XP (Luna Blue)',
    cssContent: xpCss,
    bodyClass: 'theme-winxp',
    bodyBackground: 'linear-gradient(135deg, #0058e6 0%, #3b88fc 100%)',
    fontFamily: '"Tahoma", "Segoe UI", Arial, sans-serif'
  },
  win7: {
    id: 'win7',
    name: 'Windows 7 (Aero Glass)',
    cssContent: win7Css,
    bodyClass: 'theme-win7',
    bodyBackground: 'linear-gradient(135deg, #0b2e59 0%, #1e5799 50%, #2989d8 100%)',
    fontFamily: '"Segoe UI", "Tahoma", Arial, sans-serif'
  }
}
