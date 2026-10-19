import React, { useState, useEffect, useRef } from 'react'
import type {
  SolutionDescriptor,
  AssemblyDescriptor,
  ArchaeologistChatMessage,
  ArchaeologistStatusResponse
} from '../types/api'
import { getArchaeologistStatus, askArchaeologist } from '../services/archaeologistAi'

export interface ArchaeologistAiDialogProps {
  isOpen: boolean
  onClose: () => void
  solution?: SolutionDescriptor | null
  assembly?: AssemblyDescriptor | null
  selectedTypeFullName?: string | null
  codeSnippet?: string | null
  initialPrompt?: string | null
}

export const ArchaeologistAiDialog: React.FC<ArchaeologistAiDialogProps> = ({
  isOpen,
  onClose,
  solution,
  assembly,
  selectedTypeFullName,
  codeSnippet,
  initialPrompt
}) => {
  const [messages, setMessages] = useState<ArchaeologistChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Benvenuto nel laboratorio dell\'Archeologo. Posso guidarti nell\'esplorazione stratigrafica di assembly .NET legacy, decifrare i contratti WCF, analizzare i flussi SQL e progettare la migrazione verso .NET 8+. Come posso assisterti?'
    }
  ])
  const [prompt, setPrompt] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [status, setStatus] = useState<ArchaeologistStatusResponse | null>(null)
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      getArchaeologistStatus().then(setStatus).catch(() => {})
      if (initialPrompt) {
        setPrompt(initialPrompt)
      }
    }
  }, [isOpen, initialPrompt])

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loading])

  if (!isOpen) return null

  const handleSend = async (questionText?: string) => {
    const textToSend = (questionText ?? prompt).trim()
    if (!textToSend || loading) return

    const userMsg: ArchaeologistChatMessage = { role: 'user', content: textToSend }
    const updatedHistory = [...messages, userMsg]
    setMessages(updatedHistory)
    setPrompt('')
    setLoading(true)

    try {
      const response = await askArchaeologist({
        prompt: textToSend,
        solutionName: solution?.name,
        assemblyName: assembly?.name,
        selectedNodeTitle: selectedTypeFullName ?? undefined,
        codeSnippet: codeSnippet ?? undefined,
        history: updatedHistory.slice(-6)
      })

      let finalContent = response.answer
      if (response.diagnosticMessage) {
        finalContent += `\n\n*(Nota diagnostica: ${response.diagnosticMessage})*`
      }

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: finalContent
        }
      ])
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Errore di comunicazione con il consulente: ${err.message}`
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleCopyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopyFeedback('Copiato!')
      setTimeout(() => setCopyFeedback(null), 2000)
    } catch {
      setCopyFeedback('Impossibile copiare.')
      setTimeout(() => setCopyFeedback(null), 2000)
    }
  }

  const quickPrompts = [
    '📋 Sintesi Architetturale del sistema caricato',
    '⚡ Analisi dei Punti Critici & Accoppiamento',
    '🚀 Strategia di Migrazione a .NET 8 / C# 12',
    '🗄️ Disaccoppiamento query SQL e Stored Procedure',
    '🧩 Suggerisci refactoring secondo Clean Architecture'
  ]

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px'
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="window active"
        style={{
          width: '740px',
          maxWidth: '96vw',
          height: '620px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)'
        }}
      >
        {/* Title Bar */}
        <div className="title-bar" style={{ cursor: 'move', userSelect: 'none' }}>
          <div className="title-bar-text" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🏛️</span>
            <strong>L'Archeologo AI - Consulente Architetturale Live</strong>
          </div>
          <div className="title-bar-controls">
            <button aria-label="Close" onClick={onClose} />
          </div>
        </div>

        {/* Window Body */}
        <div
          className="window-body"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            margin: 6,
            minHeight: 0,
            gap: 6
          }}
        >
          {/* Header Status & Context Bar */}
          <div
            style={{
              padding: '6px 8px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '2px',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '4px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: status?.hasApiKey || status?.provider === 'ollama' ? '#16a34a' : '#d97706'
                }}
              />
              <span>
                <strong>Provider:</strong> {status?.provider ?? 'ollama'} ({status?.model ?? 'deepseek-v4.1-flash'})
              </span>
              <span style={{ color: '#64748b' }}>|</span>
              <span>
                <strong>Chiave API:</strong> {status?.hasApiKey ? 'Configurata in .env' : 'Non rilevata (usando locale/fallback)'}
              </span>
            </div>

            <div style={{ fontSize: '10.5px', color: '#0369a1' }}>
              {selectedTypeFullName
                ? `Tipo: ${selectedTypeFullName}`
                : assembly
                ? `Assembly: ${assembly.name}`
                : solution
                ? `Solution: ${solution.name}`
                : 'Nessun contesto selezionato'}
            </div>
          </div>

          {/* Quick Prompts Chips */}
          <div
            style={{
              display: 'flex',
              gap: '4px',
              overflowX: 'auto',
              paddingBottom: '2px',
              whiteSpace: 'nowrap'
            }}
          >
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                type="button"
                disabled={loading}
                onClick={() => handleSend(qp)}
                style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  backgroundColor: '#ffffff',
                  border: '1px solid #94a3b8',
                  borderRadius: '3px',
                  flexShrink: 0
                }}
              >
                {qp}
              </button>
            ))}
          </div>

          {/* Chat Messages Container */}
          <div
            style={{
              flex: 1,
              backgroundColor: '#ffffff',
              border: '1px solid #94a3b8',
              borderRadius: '2px',
              overflowY: 'auto',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              minHeight: 0
            }}
          >
            {messages.map((m, idx) => {
              const isAssistant = m.role === 'assistant'
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignSelf: isAssistant ? 'flex-start' : 'flex-end',
                    maxWidth: '85%'
                  }}
                >
                  <div
                    style={{
                      fontSize: '9.5px',
                      color: isAssistant ? '#002277' : '#047857',
                      fontWeight: 'bold',
                      marginBottom: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>{isAssistant ? '🏛️ L\'Archeologo' : '👤 Tu'}</span>
                  </div>
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: isAssistant ? '0 8px 8px 8px' : '8px 0 8px 8px',
                      backgroundColor: isAssistant ? '#f8fafc' : '#eff6ff',
                      border: isAssistant ? '1px solid #cbd5e1' : '1px solid #bfdbfe',
                      borderLeft: isAssistant ? '3px solid #002277' : undefined,
                      borderRight: !isAssistant ? '3px solid #2563eb' : undefined,
                      fontSize: '11px',
                      lineHeight: '1.55',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      color: '#1e293b'
                    }}
                  >
                    {m.content}
                  </div>
                  {isAssistant && (
                    <div style={{ marginTop: '2px', display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => handleCopyMessage(m.content)}
                        style={{
                          fontSize: '9px',
                          padding: '1px 4px',
                          border: 'none',
                          background: 'none',
                          color: '#64748b',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        [Copia risposta]
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            {loading && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  padding: '8px 12px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderLeft: '3px solid #002277',
                  borderRadius: '0 8px 8px 8px',
                  fontSize: '11px',
                  color: '#002277',
                  fontStyle: 'italic',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>⏳</span>
                <span>L'Archeologo sta esaminando i metadati architetturali...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {copyFeedback && (
            <div style={{ fontSize: '10px', color: '#16a34a', fontWeight: 'bold' }}>
              ✓ {copyFeedback}
            </div>
          )}

          {/* Input & Action Bar */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Chiedi all'Archeologo (Invio per inviare, Shift+Invio per a capo)..."
              rows={2}
              style={{
                flex: 1,
                resize: 'none',
                padding: '6px',
                fontSize: '11px',
                fontFamily: 'inherit',
                border: '1px solid #94a3b8',
                borderRadius: '2px'
              }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '130px' }}>
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={loading || !prompt.trim()}
                style={{
                  flex: 1,
                  fontWeight: 'bold',
                  fontSize: '11px',
                  cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer',
                  backgroundColor: '#ffffff',
                  border: '1px solid #002277',
                  color: '#002277'
                }}
              >
                Invia Domanda ➔
              </button>
              <button
                type="button"
                onClick={() =>
                  setMessages([
                    {
                      role: 'assistant',
                      content: 'Cronologia azzerata. Quale altra area architetturale desideri esaminare?'
                    }
                  ])
                }
                style={{
                  fontSize: '9.5px',
                  padding: '2px',
                  cursor: 'pointer'
                }}
              >
                Pulisci Chat
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
