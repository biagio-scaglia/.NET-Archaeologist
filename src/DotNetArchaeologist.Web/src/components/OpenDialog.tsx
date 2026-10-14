import React, { useState } from 'react'
import { TitleBar } from './TitleBar'
import type { DiscoveredAssemblyItem, InspectFolderResponse } from '../types/api'

interface OpenDialogProps {
  isOpen: boolean
  onClose: () => void
  onInspectSolution?: (solutionOrFolderPath: string) => Promise<void>
  onInspectPath: (path: string) => Promise<void>
  onInspectFile: (file: File) => Promise<void>
  loading: boolean
  errorMessage: string | null
}

// Gestione cronologia percorsi recenti (MRU) salvati in localStorage
function getRecentPaths(key: string): string[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveRecentPath(key: string, path: string) {
  try {
    if (typeof window === 'undefined' || !path.trim()) return
    const current = getRecentPaths(key).filter(p => p.toLowerCase() !== path.trim().toLowerCase())
    const updated = [path.trim(), ...current].slice(0, 5)
    localStorage.setItem(key, JSON.stringify(updated))
  } catch {}
}

function clearRecentPaths(key: string) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key)
    }
  } catch {}
}

export const OpenDialog: React.FC<OpenDialogProps> = ({
  isOpen,
  onClose,
  onInspectSolution,
  onInspectPath,
  onInspectFile,
  loading,
  errorMessage
}) => {
  const [activeTab, setActiveTab] = useState<'solution' | 'folder' | 'path' | 'upload'>('solution')
  const [solutionInputPath, setSolutionInputPath] = useState<string>('')
  const [folderPath, setFolderPath] = useState<string>('')
  const [localPath, setLocalPath] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const [recentSolutions, setRecentSolutions] = useState<string[]>(() => getRecentPaths('dna_recent_solutions'))
  const [recentFolders, setRecentFolders] = useState<string[]>(() => getRecentPaths('dna_recent_folders'))
  const [recentAssemblies, setRecentAssemblies] = useState<string[]>(() => getRecentPaths('dna_recent_assemblies'))

  const [scanningFolder, setScanningFolder] = useState<boolean>(false)
  const [discoveredAssemblies, setDiscoveredAssemblies] = useState<DiscoveredAssemblyItem[]>([])
  const [selectedDiscoveredPath, setSelectedDiscoveredPath] = useState<string | null>(null)
  const [folderScanError, setFolderScanError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleScanFolder = async (folderToScan?: string) => {
    const target = folderToScan || folderPath
    if (!target.trim()) return
    saveRecentPath('dna_recent_folders', target.trim())
    setRecentFolders(getRecentPaths('dna_recent_folders'))
    setScanningFolder(true)
    setFolderScanError(null)
    setDiscoveredAssemblies([])
    setSelectedDiscoveredPath(null)

    try {
      const response = await fetch('/api/assemblies/inspect-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: target.trim() })
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
    if (activeTab === 'solution') {
      if (!solutionInputPath.trim() || !onInspectSolution) return
      saveRecentPath('dna_recent_solutions', solutionInputPath.trim())
      setRecentSolutions(getRecentPaths('dna_recent_solutions'))
      await onInspectSolution(solutionInputPath.trim())
    } else if (activeTab === 'folder') {
      if (!selectedDiscoveredPath) return
      saveRecentPath('dna_recent_folders', folderPath.trim())
      setRecentFolders(getRecentPaths('dna_recent_folders'))
      await onInspectPath(selectedDiscoveredPath)
    } else if (activeTab === 'path') {
      if (!localPath.trim()) return
      saveRecentPath('dna_recent_assemblies', localPath.trim())
      setRecentAssemblies(getRecentPaths('dna_recent_assemblies'))
      await onInspectPath(localPath.trim())
    } else {
      if (!selectedFile) return
      await onInspectFile(selectedFile)
    }
  }

  const renderRecentBadges = (
    items: string[],
    onSelect: (p: string) => void,
    storageKey: string,
    onClear: () => void
  ) => {
    if (items.length === 0) return null
    return (
      <div style={{ marginTop: 6, marginBottom: 8, fontSize: 11 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontWeight: 'bold', color: '#555' }}>Percorsi Recenti:</span>
          <button
            type="button"
            onClick={() => {
              clearRecentPaths(storageKey)
              onClear()
            }}
            style={{ fontSize: 9, padding: '1px 5px', cursor: 'pointer' }}
            title="Cancella cronologia recente"
          >
            Azzera
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {items.map((p, idx) => {
            const parts = p.split(/[\\/]/)
            const shortName = parts[parts.length - 1] || p
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSelect(p)}
                title={p}
                style={{
                  fontSize: 10,
                  padding: '2px 6px',
                  background: '#f0f0f0',
                  border: '1px solid #7f9db9',
                  cursor: 'pointer',
                  textAlign: 'left',
                  maxWidth: 280,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {shortName}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="dialog-overlay">
      <div className="window dialog-window" style={{ width: 640 }}>
        <TitleBar title="Apri Solution .NET / Cartella Progetto" onClose={onClose} />
        <div className="window-body">
          <menu role="tablist">
            <li role="tab" aria-selected={activeTab === 'solution'}>
              <button
                type="button"
                onClick={() => setActiveTab('solution')}
                style={{ cursor: 'pointer', fontWeight: 'bold' }}
              >
                [SLN] Solution .NET (.sln)
              </button>
            </li>
            <li role="tab" aria-selected={activeTab === 'folder'}>
              <button
                type="button"
                onClick={() => setActiveTab('folder')}
                style={{ cursor: 'pointer' }}
              >
                [DIR] Esplora Cartella DLL
              </button>
            </li>
            <li role="tab" aria-selected={activeTab === 'path'}>
              <button
                type="button"
                onClick={() => setActiveTab('path')}
                style={{ cursor: 'pointer' }}
              >
                [FIL] Percorso File Singolo
              </button>
            </li>
            <li role="tab" aria-selected={activeTab === 'upload'}>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                style={{ cursor: 'pointer' }}
              >
                [UPL] Carica File
              </button>
            </li>
          </menu>

          <div className="window" role="tabpanel" style={{ padding: 12, marginTop: -2 }}>
            <form onSubmit={handleSubmit}>
              {activeTab === 'solution' ? (
                <div>
                  <p style={{ margin: '0 0 6px 0', fontWeight: 'bold', color: '#000080' }}>
                    Mappa Automatica dell'Architettura da Solution (.sln):
                  </p>
                  <p style={{ margin: '0 0 10px 0', fontSize: 11, color: '#333' }}>
                    Inserisci il percorso del file <strong>.sln</strong> o della cartella principale del progetto.
                    .NET Archaeologist identificherà automaticamente i <strong>Microservizi / Servizi WCF / REST</strong>,
                    i moduli <strong>Database (DbContext, Repository, Stored Procedure)</strong>, i <strong>Processi Batch</strong> e
                    le dipendenze tra progetti.
                  </p>
                  <div className="field-row-stacked" style={{ marginBottom: 6 }}>
                    <label htmlFor="solutionPathInput" style={{ fontWeight: 'bold' }}>
                      Percorso Solution (.sln) o Cartella Progetto:
                    </label>
                    <input
                      id="solutionPathInput"
                      type="text"
                      value={solutionInputPath}
                      onChange={(e) => setSolutionInputPath(e.target.value)}
                      placeholder="C:\Users\...\cartella\file.sln"
                      style={{ width: '100%', boxSizing: 'border-box' }}
                      disabled={loading}
                    />
                  </div>
                  {renderRecentBadges(recentSolutions, setSolutionInputPath, 'dna_recent_solutions', () => setRecentSolutions([]))}
                  <div style={{ backgroundColor: '#ffffe1', border: '1px solid #d4c88b', padding: '6px 8px', fontSize: 11, marginBottom: 8 }}>
                    <strong>Suggerimento:</strong> Puoi incollare direttamente la cartella principale del progetto. Se presente, il file .sln verrà rilevato automaticamente!
                  </div>
                </div>
              ) : activeTab === 'folder' ? (
                <div>
                  <p style={{ margin: '0 0 8px 0' }}>
                    Inserisci il percorso della cartella del progetto contenente le DLL:
                  </p>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
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
                      onClick={() => handleScanFolder()}
                      disabled={!folderPath.trim() || scanningFolder || loading}
                      style={{ minWidth: 110 }}
                    >
                      {scanningFolder ? 'Scansione...' : 'Cerca DLL'}
                    </button>
                  </div>
                  {renderRecentBadges(recentFolders, (p) => { setFolderPath(p); handleScanFolder(p) }, 'dna_recent_folders', () => setRecentFolders([]))}

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
                  <div className="field-row-stacked" style={{ marginBottom: 6 }}>
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
                  {renderRecentBadges(recentAssemblies, setLocalPath, 'dna_recent_assemblies', () => setRecentAssemblies([]))}
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
                    (activeTab === 'solution'
                      ? !solutionInputPath.trim()
                      : activeTab === 'folder'
                        ? !selectedDiscoveredPath
                        : activeTab === 'path'
                          ? !localPath.trim()
                          : !selectedFile)
                  }
                  style={{ minWidth: 80, fontWeight: 'bold' }}
                >
                  {loading ? 'Analisi...' : (activeTab === 'solution' ? 'Mappa Solution' : 'Apri')}
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
