import React, { useState, useEffect } from 'react'
import type { EvidenceBundle, EvidenceRecord } from '../types/api'
import { fetchAssemblyEvidenceBundle, fetchSolutionEvidenceBundle, validateEvidenceBundle } from '../services/evidenceBundle'

interface EvidenceBundleDialogProps {
  isOpen: boolean
  onClose: () => void
  currentSessionId?: string | null
  currentSolutionPath?: string | null
  targetName?: string | null
}

export const EvidenceBundleDialog: React.FC<EvidenceBundleDialogProps> = ({
  isOpen,
  onClose,
  currentSessionId,
  currentSolutionPath,
  targetName
}) => {
  const [activeTab, setActiveTab] = useState<'view' | 'import'>('view')
  const [bundle, setBundle] = useState<EvidenceBundle | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<EvidenceRecord | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [searchFilter, setSearchFilter] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [importJsonText, setImportJsonText] = useState<string>('')
  const [importStatus, setImportStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    // Carica automaticamente il bundle dal target corrente se disponibile
    const loadCurrentBundle = async () => {
      setIsLoading(true)
      setErrorMessage(null)
      try {
        if (currentSessionId) {
          const res = await fetchAssemblyEvidenceBundle(currentSessionId)
          setBundle(res)
        } else if (currentSolutionPath) {
          const res = await fetchSolutionEvidenceBundle(currentSolutionPath)
          setBundle(res)
        }
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Impossibile generare il fascicolo evidenze.')
      } finally {
        setIsLoading(false)
      }
    }

    if (!bundle && (currentSessionId || currentSolutionPath)) {
      loadCurrentBundle()
    }
  }, [isOpen, currentSessionId, currentSolutionPath, bundle])

  if (!isOpen) return null

  const handleDownloadJson = () => {
    if (!bundle) return
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `EvidenceBundle_${bundle.targetName.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleValidateAndLoad = async (jsonContent: string) => {
    setIsLoading(true)
    setImportStatus(null)
    setErrorMessage(null)
    try {
      const res = await validateEvidenceBundle(jsonContent)
      if (res.isValid && res.bundle) {
        setBundle(res.bundle)
        setActiveTab('view')
        setImportStatus(`Fascicolo validato con successo: ${res.recordCount} evidenze caricate.`)
      } else {
        setErrorMessage(res.errorMessage || 'Formato Evidence Bundle non valido.')
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Errore durante la validazione del file.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setImportJsonText(content)
      handleValidateAndLoad(content)
    }
    reader.readAsText(file)
  }

  const records = bundle?.records || []
  const categories = Array.from(new Set(records.map(r => r.category))).sort()

  const filteredRecords = records.filter(r => {
    const matchesCategory = categoryFilter === 'ALL' || r.category === categoryFilter
    const matchesSearch = !searchFilter.trim() ||
      r.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.subject.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.evidenceId.toLowerCase().includes(searchFilter.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px'
      }}
    >
      <div
        className="window"
        style={{
          width: '940px',
          maxWidth: '96vw',
          height: '660px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '4px 4px 10px rgba(0,0,0,0.5)'
        }}
      >
        <div className="title-bar">
          <div className="title-bar-text">
            [REA] Fascicolo Evidenze Archeologiche (Evidence Bundle) - {bundle?.targetName || targetName || 'Nessun Target'}
          </div>
          <div className="title-bar-controls">
            <button aria-label="Close" onClick={onClose} />
          </div>
        </div>

        <div className="window-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', margin: '6px' }}>
          {/* Menu Schede */}
          <menu role="tablist" style={{ margin: '0 0 6px 0' }}>
            <li role="tab" aria-selected={activeTab === 'view'}>
              <a href="#view" onClick={(e) => { e.preventDefault(); setActiveTab('view') }}>
                Ispezione Evidenze [{records.length}]
              </a>
            </li>
            <li role="tab" aria-selected={activeTab === 'import'}>
              <a href="#import" onClick={(e) => { e.preventDefault(); setActiveTab('import') }}>
                Importa / Valida Bundle (.json)
              </a>
            </li>
          </menu>

          {errorMessage && (
            <div
              style={{
                backgroundColor: '#ffcccc',
                border: '1px solid #cc0000',
                padding: '6px 10px',
                marginBottom: '6px',
                color: '#990000',
                fontSize: '11px',
                fontFamily: 'MS Sans Serif, sans-serif'
              }}
            >
              [ERRORE] {errorMessage}
            </div>
          )}

          {importStatus && (
            <div
              style={{
                backgroundColor: '#d4edda',
                border: '1px solid #28a745',
                padding: '6px 10px',
                marginBottom: '6px',
                color: '#155724',
                fontSize: '11px',
                fontFamily: 'MS Sans Serif, sans-serif'
              }}
            >
              [INFO] {importStatus}
            </div>
          )}

          {activeTab === 'view' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Toolbar intestazione */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#c0c0c0',
                  padding: '4px 6px',
                  border: '1px solid #808080',
                  marginBottom: '6px',
                  fontSize: '11px'
                }}
              >
                <div>
                  <strong>Target:</strong> {bundle?.targetName || 'N/D'} | <strong>SHA-256:</strong>{' '}
                  <span style={{ fontFamily: 'monospace' }}>
                    {bundle?.targetSha256 ? `${bundle.targetSha256.substring(0, 16)}...` : 'N/D'}
                  </span>{' '}
                  | <strong>Evidenze:</strong> {records.length}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={handleDownloadJson} disabled={!bundle}>
                    [Esporta .json]
                  </button>
                </div>
              </div>

              {/* Filtri */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                <label style={{ fontSize: '11px' }}>Categoria:</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  style={{ fontSize: '11px', padding: '2px 4px' }}
                >
                  <option value="ALL">Tutte le categorie ({records.length})</option>
                  {categories.map(c => (
                    <option key={c} value={c}>
                      {c} ({records.filter(r => r.category === c).length})
                    </option>
                  ))}
                </select>

                <label style={{ fontSize: '11px', marginLeft: '8px' }}>Filtro testuale:</label>
                <input
                  type="text"
                  placeholder="Cerca per titolo, soggetto o ID..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  style={{ flex: 1, fontSize: '11px', padding: '2px 6px' }}
                />
              </div>

              {/* Corpo Principale a 2 Pannelli */}
              <div style={{ flex: 1, display: 'flex', gap: '6px', overflow: 'hidden' }}>
                {/* Tabella Evidenze */}
                <div
                  className="sunken-panel"
                  style={{
                    flex: 1.2,
                    background: '#fff',
                    overflowY: 'auto',
                    border: '1px solid #808080'
                  }}
                >
                  {isLoading ? (
                    <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px' }}>
                      Generazione ed estrazione del fascicolo evidenze in corso...
                    </div>
                  ) : filteredRecords.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: '#666' }}>
                      Nessuna evidenza trovata con i filtri correnti.
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                      <thead>
                        <tr style={{ background: '#dcdcdc', textAlign: 'left', borderBottom: '1px solid #808080' }}>
                          <th style={{ padding: '4px' }}>Cat.</th>
                          <th style={{ padding: '4px' }}>Soggetto</th>
                          <th style={{ padding: '4px' }}>Titolo Evidenza</th>
                          <th style={{ padding: '4px' }}>ID Evidenza</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRecords.map((r) => {
                          const isSelected = selectedRecord?.evidenceId === r.evidenceId
                          return (
                            <tr
                              key={r.evidenceId}
                              onClick={() => setSelectedRecord(r)}
                              style={{
                                cursor: 'pointer',
                                background: isSelected ? '#000080' : 'transparent',
                                color: isSelected ? '#fff' : '#000',
                                borderBottom: '1px solid #eee'
                              }}
                            >
                              <td style={{ padding: '4px', whiteSpace: 'nowrap' }}>[{r.category}]</td>
                              <td style={{ padding: '4px', fontWeight: 'bold' }}>{r.subject}</td>
                              <td style={{ padding: '4px' }}>{r.title}</td>
                              <td style={{ padding: '4px', fontFamily: 'monospace', fontSize: '10px' }}>
                                {r.evidenceId.substring(0, 12)}...
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Pannello Dettaglio Evidenza */}
                <div
                  className="sunken-panel"
                  style={{
                    flex: 0.9,
                    background: '#f4f4f4',
                    padding: '8px',
                    overflowY: 'auto',
                    border: '1px solid #808080',
                    fontSize: '11px'
                  }}
                >
                  {selectedRecord ? (
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>
                        {selectedRecord.title}
                      </div>
                      <div style={{ color: '#444', marginBottom: '8px' }}>
                        {selectedRecord.description}
                      </div>

                      <div style={{ marginBottom: '6px' }}>
                        <strong>ID Canonico REA:</strong>
                        <div style={{ fontFamily: 'monospace', fontSize: '10px', wordBreak: 'break-all', background: '#fff', padding: '3px', border: '1px solid #bbb' }}>
                          {selectedRecord.evidenceId}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                        <div><strong>Categoria:</strong> {selectedRecord.category}</div>
                        <div><strong>Confidenza:</strong> {Math.round(selectedRecord.confidence * 100)}%</div>
                      </div>

                      <div>
                        <strong>Attributi Osservati (Zero-Execution):</strong>
                        <pre
                          style={{
                            background: '#fff',
                            border: '1px solid #bbb',
                            padding: '6px',
                            margin: '4px 0 0 0',
                            fontSize: '10px',
                            maxHeight: '260px',
                            overflowY: 'auto',
                            whiteSpace: 'pre-wrap'
                          }}
                        >
                          {JSON.stringify(selectedRecord.attributes, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: '#666', marginTop: '40px' }}>
                      Seleziona un'evidenza dalla tabella per visualizzare i dettagli completi, gli attributi e l'identificatore canonico REA.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'import' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
              <div style={{ fontSize: '11px', color: '#333' }}>
                Carica un file Evidence Bundle JSON prodotto in precedenza o scambiato con flussi REA.
                L'importazione opera a sola lettura a <strong>Zero-Execution</strong> e convalida la conformità del fascicolo.
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ fontSize: '11px' }}>Carica file (.json):</label>
                <input type="file" accept=".json" onChange={handleFileUpload} />
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '11px', marginBottom: '4px' }}>Oppure incolla il JSON qui:</label>
                <textarea
                  style={{
                    flex: 1,
                    minHeight: '240px',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    padding: '6px',
                    resize: 'none'
                  }}
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder="Incolla il contenuto JSON dell'Evidence Bundle..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                <button
                  onClick={() => handleValidateAndLoad(importJsonText)}
                  disabled={!importJsonText.trim() || isLoading}
                >
                  [Valida e Visualizza Bundle]
                </button>
              </div>
            </div>
          )}

          {/* Footer finestra */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '8px' }}>
            <button onClick={onClose}>[Chiudi]</button>
          </div>
        </div>
      </div>
    </div>
  )
}
