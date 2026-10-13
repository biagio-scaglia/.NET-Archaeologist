import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ErrorBoundary } from '../ErrorBoundary'

const ThrowingComponent = () => {
  throw new Error('Errore di test nel rendering')
}

describe('ErrorBoundary Component', () => {
  it('renders children normally when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Contenuto normale</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('Contenuto normale')).toBeInTheDocument()
  })

  it('catches render error and displays Win98 error dialog', () => {
    // Silenzia console.error per il test dell'errore atteso
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary fallbackTitle="Errore Area Test">
        <ThrowingComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('Errore Area Test')).toBeInTheDocument()
    expect(screen.getByText(/Si e verificata una condizione imprevista/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Errore di test nel rendering/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /Ripristina Vista/i })).toBeInTheDocument()

    spy.mockRestore()
  })

  it('invokes onReset callback when Ripristina Vista is clicked', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const handleReset = vi.fn()

    render(
      <ErrorBoundary onReset={handleReset}>
        <ThrowingComponent />
      </ErrorBoundary>
    )

    const resetBtn = screen.getByRole('button', { name: /Ripristina Vista/i })
    fireEvent.click(resetBtn)
    expect(handleReset).toHaveBeenCalled()

    spy.mockRestore()
  })
})
