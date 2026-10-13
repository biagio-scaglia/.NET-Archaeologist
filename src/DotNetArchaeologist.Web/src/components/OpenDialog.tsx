import React, { useState } from 'react'
import { TitleBar } from './TitleBar'

interface OpenDialogProps {
  isOpen: boolean
  onClose: () => void
  onInspectPath: (path: string) => Promise<void>
  onInspectFile: (file: File) => Promise<void>
  loading: boolean
  errorMessage: string | null
}

export const OpenDialog: React.FC<OpenDialogProps> = ({
  isOpen,
  onClose,
  onInspectPath,
  onInspectFile,
  loading,
  errorMessage
}) => {
  const [activeTab, setActiveTab] = useState<'path' | 'upload'>('path')
  const [localPath, setLocalPath] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (activeTab === 'path') {
      if (!localPath.trim()) return
      await onInspectPath(localPath.trim())
    } else {
      if (!selectedFile) return
      await onInspectFile(selectedFile)
    }
  }

  return (
    <div className="dialog-overlay">
      <div className="window dialog-window">
        <TitleBar title="Apri Assembly .NET" onClose={onClose} />
        <div className="window-body">
          <menu role="tablist">
            <li role="tab" aria-selected={activeTab === 'path'}>
              <button
                type="button"
                onClick={() => setActiveTab('path')}
                style={{ cursor: 'pointer' }}
              >
                Percorso Locale
              </button>
            </li>
            <li role="tab" aria-selected={activeTab === 'upload'}>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                style={{ cursor: 'pointer' }}
              >
                Carica File
              </button>
            </li>
          </menu>

          <div className="window" role="tabpanel" style={{ padding: 12, marginTop: -2 }}>
            <form onSubmit={handleSubmit}>
              {activeTab === 'path' ? (
                <div>
                  <p style={{ margin: '0 0 8px 0' }}>
                    Inserisci il percorso assoluto della libreria o eseguibile .NET (.dll, .exe):
                  </p>
                  <div className="field-row-stacked" style={{ marginBottom: 12 }}>
                    <label htmlFor="filePathInput">Percorso file:</label>
                    <input
                      id="filePathInput"
                      type="text"
                      value={localPath}
                      onChange={(e) => setLocalPath(e.target.value)}
                      placeholder="C:\percorso\assembly.dll"
                      style={{ width: '100%', boxSizing: 'border-box' }}
                      disabled={loading}
                    />
                  </div>
                  <div style={{ fontSize: '10px', color: '#555', marginBottom: 8 }}>
                    Esempio: C:\Users\biagio.scaglia\Desktop\cartella\gest-pdc\GestPdcNotify\bin\Debug\GestPdcNotify.Service.dll
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{ margin: '0 0 8px 0' }}>
                    Seleziona un file binario .NET (.dll o .exe) dal filesystem locale:
                  </p>
                  <div className="field-row" style={{ marginBottom: 12 }}>
                    <input
                      id="fileUploadInput"
                      type="file"
                      accept=".dll,.exe"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      disabled={loading}
                    />
                  </div>
                </div>
              )}

              {errorMessage && (
                <div style={{ color: '#b00000', marginBottom: 8, fontWeight: 'bold' }}>
                  [Errore]: {errorMessage}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 12 }}>
                <button
                  type="submit"
                  disabled={loading || (activeTab === 'path' ? !localPath.trim() : !selectedFile)}
                  style={{ minWidth: 70 }}
                >
                  {loading ? 'Lettura...' : 'Apri'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  style={{ minWidth: 70 }}
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
