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

  return (
    <div className="code-viewer-container">
      {/* Barra comandi decompilatore */}
      <div className="command-bar" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <strong>Vista Sorgente:</strong>
          <span>{selectedType || 'Nessun tipo selezionato'}</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {onDecompileWholeModule && (
            <button
              type="button"
              onClick={onDecompileWholeModule}
              disabled={loading}
              title="Decompila l'intero assembly in un unico file C#"
            >
              Intero Assembly
            </button>
          )}
          <button
            type="button"
            onClick={handleSelectAll}
            disabled={!code || loading}
          >
            Seleziona Tutto
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!code || loading}
          >
            {copySuccess ? 'Copiato!' : 'Copia Codice'}
          </button>
        </div>
      </div>

      {/* Area del testo del codice sorgente */}
      <div className="code-viewer">
        {loading ? (
          <div style={{ padding: 16, color: '#000080', fontStyle: 'italic' }}>
            Decompilazione in corso con ICSharpCode.Decompiler (ILSpy)...
          </div>
        ) : code ? (
          <pre ref={codeRef} style={{ margin: 0, fontFamily: 'inherit' }}>
            <code>{code}</code>
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
