import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ArchaeologistAiDialog } from '../ArchaeologistAiDialog'
import { StatusBar } from '../StatusBar'
import { DecompilerView } from '../DecompilerView'

// Mock global fetch for testing
beforeEach(() => {
  vi.restoreAllMocks()
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes('/api/archaeologist/status')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            provider: 'ollama',
            baseUrl: 'https://ollama.com/v1',
            model: 'deepseek-v4.1-flash',
            hasApiKey: true,
            isConfigured: true
          })
      })
    }
    if (url.includes('/api/archaeologist/ask')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            answer: 'Risposta archeologica di test: disaccoppiare con pattern Repository.',
            modelUsed: 'deepseek-v4.1-flash',
            provider: 'ollama',
            fallbackUsed: false
          })
      })
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
  })
})

describe('Archaeologist AI Integration', () => {
  it('renders ArchaeologistAiDialog when open and displays status and welcome message', async () => {
    render(
      <ArchaeologistAiDialog
        isOpen={true}
        onClose={vi.fn()}
        solution={{ name: 'TestSolution', solutionPath: 'C:\\test.sln', projects: [], detectedArchitectures: [] }}
      />
    )

    expect(screen.getByText(/L'Archeologo AI - Consulente Architetturale Live/i)).toBeInTheDocument()
    expect(screen.getByText(/Benvenuto nel laboratorio dell'Archeologo/i)).toBeInTheDocument()

    // Attendi caricamento stato
    await waitFor(() => {
      expect(screen.getByText(/deepseek-v4.1-flash/i)).toBeInTheDocument()
    })
  })

  it('sends prompt and renders answer in ArchaeologistAiDialog', async () => {
    render(
      <ArchaeologistAiDialog
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    const textarea = screen.getByPlaceholderText(/Chiedi all'Archeologo/i)
    fireEvent.change(textarea, { target: { value: 'Quali sono i rischi architetturali?' } })

    const sendBtn = screen.getByText(/Invia Domanda ➔/i)
    fireEvent.click(sendBtn)

    await waitFor(() => {
      expect(screen.getByText(/Risposta archeologica di test: disaccoppiare con pattern Repository./i)).toBeInTheDocument()
    })
  })

  it('renders AI indicator in StatusBar and calls onAiClick', () => {
    const handleAiClick = vi.fn()
    render(
      <StatusBar
        statusText="Pronto"
        aiStatusText="AI: deepseek-v4.1-flash (Online)"
        onAiClick={handleAiClick}
      />
    )

    const aiField = screen.getByText('AI: deepseek-v4.1-flash (Online)')
    expect(aiField).toBeInTheDocument()
    fireEvent.click(aiField)
    expect(handleAiClick).toHaveBeenCalledTimes(1)
  })

  it('renders Spiega con AI button in DecompilerView and calls onAskAiAboutCode', () => {
    const handleAskAi = vi.fn()
    render(
      <DecompilerView
        selectedType="MyNamespace.MyService"
        code="public class MyService { }"
        loading={false}
        onAskAiAboutCode={handleAskAi}
      />
    )

    const aiBtn = screen.getByText(/Spiega con AI/i)
    expect(aiBtn).toBeInTheDocument()
    fireEvent.click(aiBtn)
    expect(handleAskAi).toHaveBeenCalledWith('public class MyService { }')
  })
})
