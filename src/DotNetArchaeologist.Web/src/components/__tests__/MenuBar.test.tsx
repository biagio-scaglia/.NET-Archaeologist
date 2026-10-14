import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MenuBar } from '../MenuBar'
import { ThemeProvider } from '../../theme/ThemeContext'

describe('MenuBar Component', () => {
  it('renders menu items and triggers callbacks', () => {
    const handleOpen = vi.fn()
    const handleReset = vi.fn()
    const handleAbout = vi.fn()

    render(
      <ThemeProvider>
        <MenuBar
          onOpenClick={handleOpen}
          onResetClick={handleReset}
          onAboutClick={handleAbout}
        />
      </ThemeProvider>
    )

    fireEvent.click(screen.getByText(/ile - Apri Assembly/i))
    expect(handleOpen).toHaveBeenCalled()

    fireEvent.click(screen.getByText(/eimposta/i))
    expect(handleReset).toHaveBeenCalled()

    fireEvent.click(screen.getByText(/uida - Info/i))
    expect(handleAbout).toHaveBeenCalled()
  })

  it('allows switching retro OS themes between Win98, WinXP and Win7', () => {
    render(
      <ThemeProvider>
        <MenuBar
          onOpenClick={vi.fn()}
          onResetClick={vi.fn()}
          onAboutClick={vi.fn()}
        />
      </ThemeProvider>
    )

    const xpBtn = screen.getByRole('button', { name: /WinXP/i })
    fireEvent.click(xpBtn)
    expect(document.body.className).toBe('theme-winxp')

    const win7Btn = screen.getByRole('button', { name: /Win7/i })
    fireEvent.click(win7Btn)
    expect(document.body.className).toBe('theme-win7')

    const win98Btn = screen.getByRole('button', { name: /Win98/i })
    fireEvent.click(win98Btn)
    expect(document.body.className).toBe('theme-win98')
  })
})
