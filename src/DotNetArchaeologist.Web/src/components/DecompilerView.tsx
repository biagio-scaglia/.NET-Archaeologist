import React, { useRef, useState } from 'react'

interface DecompilerViewProps {
  selectedType: string | null
  code: string
  loading: boolean
  onDecompileWholeModule?: () => void
}

export const DecompilerView: React.FC<DecompilerViewProps> = ({
  selectedType,
  code,
  loading,
  onDecompileWholeModule
}) => {
  const codeRef = useRef<HTMLPreElement>(null)
  const [copySuccess, setCopySuccess] = useState(false)
  const [fontSize, setFontSize] = useState<number>(12)
  const [showLineNumbers, setShowLineNumbers] = useState<boolean>(true)
  const [codeFilter, setCodeFilter] = useState<string>('')

  const handleCopy = async () => {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch {
      // Fallback
    }
  }

  const handleSelectAll = () => {
    if (codeRef.current) {
      const range = document.createRange()
      range.selectNodeContents(codeRef.current)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
    }
  }

  // Suddivisione in righe per numerazione e filtro
  const lines = React.useMemo(() => {
    if (!code) return []
    return code.split('\n')
  }, [code])

  const lineNumbersText = React.useMemo(() => {
    if (!showLineNumbers || lines.length === 0) return ''
    return Array.from({ length: lines.length }, (_, i) => i + 1).join('\n')
  }, [showLineNumbers, lines.length])

  const matchCount = React.useMemo(() => {
    if (!codeFilter.trim() || !code) return 0
    const q = codeFilter.toLowerCase()
    return lines.filter(l => l.toLowerCase().includes(q)).length
  }, [lines, codeFilter, code])

  return (
    <div className="code-viewer-container">
      {/* Barra comandi decompilatore */}
      <div className="command-bar" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <strong>Vista Sorgente:</strong>
          <span style={{ fontWeight: selectedType ? 'bold' : 'normal' }}>
            {selectedType || 'Nessun tipo selezionato'}
          </span>
          {code && (
            <span style={{ fontSize: '10px', opacity: 0.8 }}>
              ({lines.length} righe)
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Ricerca nel codice */}
          {code && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <input
                type="text"
                value={codeFilter}
                onChange={e => setCodeFilter(e.target.value)}
                placeholder="Cerca nel sorgente..."
                style={{ height: 20, fontSize: '10px', width: '130px', padding: '1px 3px' }}
              />
              {codeFilter && (
                <button
                  type="button"
                  className="btn-clear-search"
                  onClick={() => setCodeFilter('')}
                  title="Azzera ricerca codice"
                  style={{ height: 20, minWidth: 20, padding: 0 }}
                >
                  ✕
                </button>
              )}
              {codeFilter && (
                <span style={{ fontSize: '10px', opacity: 0.85, marginRight: 4 }}>
                  ({matchCount})
                </span>
              )}
            </div>
          )}

          {/* Controlli font */}
          <button
            type="button"
            onClick={() => setFontSize(s => Math.max(10, s - 1))}
            title="Riduci dimensione carattere"
            style={{ padding: '1px 5px', height: 21, fontSize: '10px', cursor: 'pointer' }}
          >
            A-
          </button>
          <span style={{ fontSize: '10px', fontFamily: 'monospace', minWidth: '24px', textAlign: 'center' }}>
            {fontSize}px
          </span>
          <button
            type="button"
            onClick={() => setFontSize(s => Math.min(20, s + 1))}
            title="Aumenta dimensione carattere"
            style={{ padding: '1px 5px', height: 21, fontSize: '10px', cursor: 'pointer' }}
          >
            A+
          </button>

          <button
            type="button"
            onClick={() => setShowLineNumbers(prev => !prev)}
            title="Mostra o nascondi numeri di riga"
            className={showLineNumbers ? 'active-view-tab' : ''}
            style={{ padding: '1px 6px', height: 21, fontSize: '10px', cursor: 'pointer' }}
          >
            # Linee
          </button>

          {onDecompileWholeModule && (
            <button
              type="button"
              onClick={onDecompileWholeModule}
              disabled={loading}
              title="Decompila l'intero assembly in un unico file C#"
              style={{ height: 21, fontSize: '10px', cursor: 'pointer' }}
            >
              Intero Assembly
            </button>
          )}
          <button
            type="button"
            onClick={handleSelectAll}
            disabled={!code || loading}
            style={{ height: 21, fontSize: '10px', cursor: 'pointer' }}
          >
            Seleziona Tutto
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!code || loading}
            style={{ height: 21, fontSize: '10px', cursor: 'pointer' }}
          >
            {copySuccess ? 'Copiato!' : 'Copia Codice'}
          </button>
        </div>
      </div>

      {/* Area del testo del codice sorgente con numeri di riga e ricerca */}
      <div className="code-viewer" style={{ fontSize: `${fontSize}px`, padding: 0 }}>
        {loading ? (
          <div style={{ padding: 16, color: '#000080', fontStyle: 'italic' }}>
            Decompilazione in corso con ICSharpCode.Decompiler (ILSpy)...
          </div>
        ) : code ? (
          <pre
            ref={codeRef}
            style={{
              margin: 0,
              fontFamily: 'inherit',
              display: 'flex',
              minHeight: '100%',
              padding: '6px'
            }}
          >
            {showLineNumbers && (
              <div
                style={{
                  userSelect: 'none',
                  color: '#888',
                  paddingRight: '12px',
                  marginRight: '12px',
                  borderRight: '1px solid var(--retro-border-light)',
                  textAlign: 'right',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre',
                  lineHeight: 'inherit',
                  opacity: 0.7
                }}
              >
                {lineNumbersText}
              </div>
            )}
            <code style={{ flex: 1, overflowX: 'auto', display: 'block' }}>
              {codeFilter.trim() ? (
                lines.map((line, idx) => {
                  const isMatch = line.toLowerCase().includes(codeFilter.toLowerCase())
                  return (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: isMatch ? 'var(--retro-hover-soft)' : undefined,
                        fontWeight: isMatch ? 'bold' : 'normal'
                      }}
                    >
                      {line || '\n'}
                    </div>
                  )
                })
              ) : (
                code
              )}
            </code>
          </pre>
        ) : (
          <div style={{ padding: 16, color: '#666', fontStyle: 'italic' }}>
            Seleziona un tipo dall'albero a sinistra per visualizzare il codice C# decompilato.
          </div>
        )}
      </div>
    </div>
  )
}
