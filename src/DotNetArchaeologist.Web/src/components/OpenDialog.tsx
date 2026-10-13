import React, { useState } from 'react'
import { TitleBar } from './TitleBar'
import type { DiscoveredAssemblyItem, InspectFolderResponse } from '../types/api'

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
  const [activeTab, setActiveTab] = useState<'folder' | 'path' | 'upload'>('folder')
  const [folderPath, setFolderPath] = useState<string>('')
  const [localPath, setLocalPath] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const [scanningFolder, setScanningFolder] = useState<boolean>(false)
  const [discoveredAssemblies, setDiscoveredAssemblies] = useState<DiscoveredAssemblyItem[]>([])
  const [selectedDiscoveredPath, setSelectedDiscoveredPath] = useState<string | null>(null)
  const [folderScanError, setFolderScanError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleScanFolder = async () => {
    if (!folderPath.trim()) return
    setScanningFolder(true)
    setFolderScanError(null)
    setDiscoveredAssemblies([])
    setSelectedDiscoveredPath(null)

    try {
      const response = await fetch('/api/assemblies/inspect-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: folderPath.trim() })
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || `Errore HTTP ${response.status}`)
      }

      const data: InspectFolderResponse = await response.json()
      setDiscoveredAssemblies(data.assemblies || [])
      if (data.assemblies.length > 0) {
        setSelectedDiscoveredPath(data.assemblies[0].filePath)
      }
    } catch (err: any) {
      setFolderScanError(err.message || 'Errore durante la scansione della cartella.')
    } finally {
      setScanningFolder(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (activeTab === 'folder') {
      if (!selectedDiscoveredPath) return
      await onInspectPath(selectedDiscoveredPath)
    } else if (activeTab === 'path') {
      if (!localPath.trim()) return
      await onInspectPath(localPath.trim())
    } else {
      if (!selectedFile) return
      await onInspectFile(selectedFile)
    }
  }

  return (
    <div className="dialog-overlay">
      <div className="window dialog-window" style={{ width: 620 }}>
        <TitleBar title="Apri Assembly .NET / Cartella Progetto" onClose={onClose} />
        <div className="window-body">
          <menu role="tablist">
            <li role="tab" aria-selected={activeTab === 'folder'}>
              <button
                type="button"
                onClick={() => setActiveTab('folder')}
                style={{ cursor: 'pointer' }}
              >
                Cartella Progetto
              </button>
            </li>
            <li role="tab" aria-selected={activeTab === 'path'}>
              <button
                type="button"
                onClick={() => setActiveTab('path')}
                style={{ cursor: 'pointer' }}
              >
                Percorso File Singolo
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
              {activeTab === 'folder' ? (
                <div>
                  <p style={{ margin: '0 0 8px 0' }}>
                    Inserisci il percorso della cartella del progetto contenente le DLL:
                  </p>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    <input
                      id="folderPathInput"
                      type="text"
                      value={folderPath}
                      onChange={(e) => setFolderPath(e.target.value)}
                      placeholder="C:\Users\...\cartella\gest-pdc"
                      style={{ flex: 1 }}
                      disabled={loading || scanningFolder}
                    />
                    <button
                      type="button"
                      onClick={handleScanFolder}
                      disabled={!folderPath.trim() || scanningFolder || loading}
                      style={{ minWidth: 110 }}
                    >
                      {scanningFolder ? 'Scansione...' : 'Cerca DLL'}
                    </button>
                  </div>

                  {folderScanError && (
                    <div style={{ color: '#b00000', marginBottom: 8, fontSize: 11 }}>
                      [Errore scansione]: {folderScanError}
                    </div>
                  )}

                  {discoveredAssemblies.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <p style={{ margin: '4px 0', fontSize: 11, fontWeight: 'bold' }}>
                        Assembly .NET rilevati nella cartella ({discoveredAssemblies.length}):
                      </p>
                      <div style={{
                        maxHeight: 180,
                        overflowY: 'auto',
                        background: '#ffffff',
                        border: '2px inset #dfdfdf',
                        padding: 2
                      }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                          <thead>
                            <tr style={{ background: '#c0c0c0', borderBottom: '1px solid #808080', textAlign: 'left' }}>
                              <th style={{ padding: '2px 4px' }}>Assembly</th>
                              <th style={{ padding: '2px 4px' }}>Percorso Relativo</th>
                              <th style={{ padding: '2px 4px' }}>Tipi</th>
                              <th style={{ padding: '2px 4px' }}>Dimensione</th>
                            </tr>
                          </thead>
                          <tbody>
                            {discoveredAssemblies.map((item) => {
                              const isSelected = selectedDiscoveredPath === item.filePath
                              return (
                                <tr
                                  key={item.filePath}
                                  onClick={() => setSelectedDiscoveredPath(item.filePath)}
                                  onDoubleClick={async () => {
                                    setSelectedDiscoveredPath(item.filePath)
                                    await onInspectPath(item.filePath)
                                  }}
                                  style={{
                                    cursor: 'pointer',
                                    background: isSelected ? '#000080' : 'transparent',
                                    color: isSelected ? '#ffffff' : '#000000'
                                  }}
                                >
                                  <td style={{ padding: '2px 4px', fontWeight: 'bold' }}>{item.name}</td>
                                  <td style={{ padding: '2px 4px', fontFamily: 'monospace' }}>{item.relativePath}</td>
                                  <td style={{ padding: '2px 4px' }}>{item.typesCount}</td>
                                  <td style={{ padding: '2px 4px' }}>{(item.sizeBytes / 1024).toFixed(0)} KB</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>
                        * Fai doppio click su una riga per aprirla all'istante o selezionala e premi "Apri".
                      </div>
                    </div>
                  )}
                </div>
              ) : activeTab === 'path' ? (
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
                  disabled={
                    loading ||
                    (activeTab === 'folder'
                      ? !selectedDiscoveredPath
                      : activeTab === 'path'
                      ? !localPath.trim()
                      : !selectedFile)
                  }
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
