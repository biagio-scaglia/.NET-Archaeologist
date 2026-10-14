import React, { useState, useMemo } from 'react'
import type { AssemblyDescriptor, ExtractedConstantString } from '../types/api'

interface AssemblyInsightsDialogProps {
  isOpen: boolean
  onClose: () => void
  assembly: AssemblyDescriptor | null
}

type TabType = 'strings' | 'modernization' | 'resources'

export const AssemblyInsightsDialog: React.FC<AssemblyInsightsDialogProps> = ({
  isOpen,
  onClose,
  assembly
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('strings')
  const [stringCategory, setStringCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const strings: ExtractedConstantString[] = useMemo(() => {
    return assembly?.userStrings || []
  }, [assembly])

  const findings = useMemo(() => {
    return assembly?.modernizationFindings || []
  }, [assembly])

  const resources = useMemo(() => {
    return assembly?.manifestResources || []
  }, [assembly])

  // Statistiche stringhe
  const stats = useMemo(() => {
    const s = {
      all: strings.length,
      sql: 0,
      connection: 0,
      url: 0,
      path: 0,
      general: 0
    }
    strings.forEach(item => {
      const cat = item.category.toLowerCase()
      if (cat === 'sql') s.sql++
      else if (cat === 'connection') s.connection++
      else if (cat === 'url') s.url++
      else if (cat === 'path') s.path++
      else s.general++
    })
    return s
  }, [strings])

  // Filtraggio stringhe
  const filteredStrings = useMemo(() => {
    let result = strings
    if (stringCategory !== 'all') {
      result = result.filter(s => s.category.toLowerCase() === stringCategory.toLowerCase())
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(s => s.value.toLowerCase().includes(q))
    }
    return result
  }, [strings, stringCategory, searchQuery])

  const handleCopyString = (val: string, idx: number) => {
    navigator.clipboard.writeText(val)
    setCopiedIndex(idx)
    setTimeout(() => setCopiedIndex(null), 1500)
  }

  if (!isOpen || !assembly) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        className="window"
        style={{
          width: '900px',
          maxWidth: '96vw',
          height: '620px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="title-bar">
          <div className="title-bar-text">
            Ispezione Avanzata: Stringhe Costanti, Risorse &amp; Modernizzazione - {assembly.name}
          </div>
          <div className="title-bar-controls">
            <button aria-label="Close" onClick={onClose} style={{ cursor: 'pointer' }} />
          </div>
        </div>

        {/* Tab Selector */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            padding: '6px 8px 0',
            borderBottom: '1px solid var(--retro-border-dark)',
            backgroundColor: 'var(--retro-surface-soft)'
          }}
        >
          <button
            type="button"
            className={activeTab === 'strings' ? 'active-view-tab' : ''}
            onClick={() => setActiveTab('strings')}
            style={{ padding: '3px 10px', fontSize: '11px', cursor: 'pointer' }}
          >
            Costanti &amp; Stringhe #{strings.length}
          </button>
          <button
            type="button"
            className={activeTab === 'modernization' ? 'active-view-tab' : ''}
            onClick={() => setActiveTab('modernization')}
            style={{ padding: '3px 10px', fontSize: '11px', cursor: 'pointer' }}
          >
            Audit Modernizzazione .NET 8 #{findings.length}
          </button>
          <button
            type="button"
            className={activeTab === 'resources' ? 'active-view-tab' : ''}
            onClick={() => setActiveTab('resources')}
            style={{ padding: '3px 10px', fontSize: '11px', cursor: 'pointer' }}
          >
            Risorse Embeddate #{resources.length}
          </button>
        </div>

        {/* Contenuto Tab */}
        <div className="window-body" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '8px' }}>
          {activeTab === 'strings' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 8 }}>
              {/* Filtri categoria & ricerca */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold' }}>Filtra Categoria:</span>
                <button
                  type="button"
                  className={stringCategory === 'all' ? 'active-view-tab' : ''}
                  onClick={() => setStringCategory('all')}
                  style={{ fontSize: '10px', padding: '2px 6px', cursor: 'pointer' }}
                >
                  Tutte ({stats.all})
                </button>
                <button
                  type="button"
                  className={stringCategory === 'sql' ? 'active-view-tab' : ''}
                  onClick={() => setStringCategory('sql')}
                  style={{ fontSize: '10px', padding: '2px 6px', cursor: 'pointer' }}
                >
                  SQL Inline ({stats.sql})
                </button>
                <button
                  type="button"
                  className={stringCategory === 'connection' ? 'active-view-tab' : ''}
                  onClick={() => setStringCategory('connection')}
                  style={{ fontSize: '10px', padding: '2px 6px', cursor: 'pointer' }}
                >
                  Connessioni / DB ({stats.connection})
                </button>
                <button
                  type="button"
                  className={stringCategory === 'url' ? 'active-view-tab' : ''}
                  onClick={() => setStringCategory('url')}
                  style={{ fontSize: '10px', padding: '2px 6px', cursor: 'pointer' }}
                >
                  URL / Endpoints ({stats.url})
                </button>
                <button
                  type="button"
                  className={stringCategory === 'path' ? 'active-view-tab' : ''}
                  onClick={() => setStringCategory('path')}
                  style={{ fontSize: '10px', padding: '2px 6px', cursor: 'pointer' }}
                >
                  Percorsi File ({stats.path})
                </button>
                <button
                  type="button"
                  className={stringCategory === 'general' ? 'active-view-tab' : ''}
                  onClick={() => setStringCategory('general')}
                  style={{ fontSize: '10px', padding: '2px 6px', cursor: 'pointer' }}
                >
                  Generiche ({stats.general})
                </button>

                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Cerca testo stringa..."
                    style={{ fontSize: '11px', height: '22px', padding: '2px 6px', width: '180px' }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      style={{ fontSize: '10px', height: '22px', padding: '0 5px', cursor: 'pointer' }}
                    >
                      X
                    </button>
                  )}
                </div>
              </div>

              {/* Tabella stringhe */}
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  border: '1px solid var(--retro-border-dark)',
                  backgroundColor: '#fff'
                }}
              >
                {filteredStrings.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontStyle: 'italic', fontSize: '11px' }}>
                    Nessuna stringa costante trovata con i filtri selezionati.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', fontFamily: 'monospace' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--retro-surface-soft)', borderBottom: '1px solid var(--retro-border-dark)', textAlign: 'left' }}>
                        <th style={{ padding: '4px 6px', width: '90px' }}>Tipo</th>
                        <th style={{ padding: '4px 6px' }}>Valore Letterale</th>
                        <th style={{ padding: '4px 6px', width: '60px', textAlign: 'center' }}>Azione</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStrings.map((s, idx) => {
                        const isSql = s.category.toLowerCase() === 'sql'
                        const isConn = s.category.toLowerCase() === 'connection'
                        const isUrl = s.category.toLowerCase() === 'url'
                        const badgeClass = isSql ? 'badge-enum' : isConn ? 'badge-class' : isUrl ? 'badge-interface' : 'badge-struct'
                        return (
                          <tr
                            key={idx}
                            style={{
                              borderBottom: '1px solid #f0f0f0',
                              backgroundColor: idx % 2 === 0 ? '#fff' : '#fcfcfc'
                            }}
                          >
                            <td style={{ padding: '3px 6px', verticalAlign: 'top' }}>
                              <span className={`badge ${badgeClass}`} style={{ fontSize: '9px' }}>
                                {s.category.toUpperCase()}
                              </span>
                            </td>
                            <td
                              style={{
                                padding: '3px 6px',
                                wordBreak: 'break-all',
                                whiteSpace: 'pre-wrap',
                                color: isSql ? '#000080' : isConn ? '#800000' : isUrl ? '#006600' : '#222'
                              }}
                            >
                              {s.value}
                            </td>
                            <td style={{ padding: '3px 6px', textAlign: 'center', verticalAlign: 'top' }}>
                              <button
                                type="button"
                                onClick={() => handleCopyString(s.value, idx)}
                                title="Copia negli appunti"
                                style={{ fontSize: '10px', padding: '1px 5px', cursor: 'pointer' }}
                              >
                                {copiedIndex === idx ? 'Copiato' : 'Copia'}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {activeTab === 'modernization' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 8, overflowY: 'auto' }}>
              <div style={{ fontSize: '11px', color: '#444' }}>
                L'audit statico analizza l'assembly alla ricerca di API deprecate, namespace legacy incompatibili con .NET moderno e vincoli Windows-only.
              </div>

              {findings.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', backgroundColor: '#eefcee', border: '1px solid #8cc08c', fontSize: '12px' }}>
                  <strong>Nessun blocco critico rilevato.</strong>
                  <p style={{ margin: '4px 0 0', color: '#2a6a2a' }}>
                    L'assembly non presenta dipendenze dirette da componenti obsoleti noti (.NET Remoting, System.Web legacy, COM+ transazionali).
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {findings.map((f, idx) => {
                    const isCrit = f.severity.toLowerCase() === 'critical'
                    const isHigh = f.severity.toLowerCase() === 'high'
                    const borderColor = isCrit ? '#cc0000' : isHigh ? '#cc6600' : '#006699'
                    const bgColor = isCrit ? '#fff2f2' : isHigh ? '#fffbf0' : '#f0f7fc'

                    return (
                      <div
                        key={idx}
                        style={{
                          border: `1px solid ${borderColor}`,
                          backgroundColor: bgColor,
                          padding: '8px 10px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span
                              style={{
                                backgroundColor: borderColor,
                                color: '#fff',
                                fontWeight: 'bold',
                                fontSize: '10px',
                                padding: '1px 5px',
                                textTransform: 'uppercase'
                              }}
                            >
                              Severita: {f.severity}
                            </span>
                            <strong style={{ fontSize: '12px' }}>{f.target}</strong>
                            <span style={{ fontSize: '10px', color: '#666' }}>({f.category})</span>
                          </div>
                        </div>

                        <div style={{ fontSize: '11px', color: '#222' }}>{f.description}</div>

                        <div style={{ fontSize: '11px', marginTop: 2, padding: '4px 6px', backgroundColor: 'rgba(255,255,255,0.7)', border: '1px dashed var(--retro-border-dark)' }}>
                          <strong>Strategia di modernizzazione:</strong> {f.recommendation}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'resources' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 8 }}>
              <div style={{ fontSize: '11px', color: '#444' }}>
                Risorse incorporate (Manifest Resources) rilevate nei metadati ECMA-335 del binario analizzato.
              </div>

              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  border: '1px solid var(--retro-border-dark)',
                  backgroundColor: '#fff'
                }}
              >
                {resources.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontStyle: 'italic', fontSize: '11px' }}>
                    Nessuna risorsa incorporata presente in questo assembly.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--retro-surface-soft)', borderBottom: '1px solid var(--retro-border-dark)', textAlign: 'left' }}>
                        <th style={{ padding: '4px 6px' }}>Nome Risorsa</th>
                        <th style={{ padding: '4px 6px', width: '120px' }}>Tipo</th>
                        <th style={{ padding: '4px 6px', width: '90px' }}>Visibilita</th>
                        <th style={{ padding: '4px 6px', width: '90px', textAlign: 'right' }}>Offset Byte</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resources.map((r, idx) => (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: '1px solid #f0f0f0',
                            backgroundColor: idx % 2 === 0 ? '#fff' : '#fcfcfc'
                          }}
                        >
                          <td style={{ padding: '4px 6px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                            {r.name}
                          </td>
                          <td style={{ padding: '4px 6px' }}>
                            <span className="badge badge-class" style={{ fontSize: '9px' }}>
                              {r.resourceType || 'Embedded'}
                            </span>
                          </td>
                          <td style={{ padding: '4px 6px' }}>{r.visibility}</td>
                          <td style={{ padding: '4px 6px', textAlign: 'right', fontFamily: 'monospace' }}>
                            {r.offset.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Barra di chiusura inferiore */}
        <div
          style={{
            padding: '6px 8px',
            borderTop: '1px solid var(--retro-border-light)',
            backgroundColor: 'var(--retro-surface-soft)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ fontSize: '10px', color: '#555' }}>
            Zero-Execution: ispezione passiva dei metadati ECMA-335 e dei corpi IL.
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ minWidth: '80px', padding: '3px 12px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}
