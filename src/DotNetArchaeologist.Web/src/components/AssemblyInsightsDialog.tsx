import React, { useState, useMemo } from 'react'
import type { AssemblyDescriptor, ExtractedConstantString, ManifestResourceDescriptor } from '../types/api'

interface AssemblyInsightsDialogProps {
  isOpen: boolean
  onClose: () => void
  assembly: AssemblyDescriptor | null
}

type TabType = 'overview' | 'assets' | 'strings' | 'modernization'

export const AssemblyInsightsDialog: React.FC<AssemblyInsightsDialogProps> = ({
  isOpen,
  onClose,
  assembly
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [stringCategory, setStringCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [previewImage, setPreviewImage] = useState<ManifestResourceDescriptor | null>(null)

  const strings: ExtractedConstantString[] = useMemo(() => {
    return assembly?.userStrings || []
  }, [assembly])

  const findings = useMemo(() => {
    return assembly?.modernizationFindings || []
  }, [assembly])

  const resources: ManifestResourceDescriptor[] = useMemo(() => {
    return assembly?.manifestResources || []
  }, [assembly])

  // Asset grafici (immagini, icone)
  const imageAssets = useMemo(() => {
    return resources.filter(r =>
      r.previewDataUri ||
      (r.resourceType && r.resourceType.toLowerCase().includes('image')) ||
      (r.mimeType && r.mimeType.startsWith('image/')) ||
      r.name.toLowerCase().endsWith('.png') ||
      r.name.toLowerCase().endsWith('.jpg') ||
      r.name.toLowerCase().endsWith('.jpeg') ||
      r.name.toLowerCase().endsWith('.ico') ||
      r.name.toLowerCase().endsWith('.bmp') ||
      r.name.toLowerCase().endsWith('.gif') ||
      r.name.toLowerCase().endsWith('.svg')
    )
  }, [resources])

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
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(val)
      setCopiedIndex(idx)
      setTimeout(() => setCopiedIndex(null), 1500)
    }
  }

  // Helpers per esportazione dati
  const downloadBlob = (filename: string, content: string, mimeType: string) => {
    try {
      if (typeof window === 'undefined') return
      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download fallito', err)
    }
  }

  const escapeCsvCell = (cell: string | number): string => {
    const str = String(cell ?? '')
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const exportStringsJson = () => {
    const payload = {
      assembly: assembly?.name || 'unknown',
      totalCount: filteredStrings.length,
      category: stringCategory,
      exportedAt: new Date().toISOString(),
      strings: filteredStrings
    }
    downloadBlob(`${assembly?.name || 'assembly'}_strings.json`, JSON.stringify(payload, null, 2), 'application/json')
  }

  const exportStringsCsv = () => {
    const headers = ['Categoria', 'Valore']
    const rows = filteredStrings.map(s => [escapeCsvCell(s.category), escapeCsvCell(s.value)])
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n')
    downloadBlob(`${assembly?.name || 'assembly'}_strings.csv`, csvContent, 'text/csv;charset=utf-8;')
  }

  const exportAssetsJson = () => {
    const payload = {
      assembly: assembly?.name || 'unknown',
      totalResources: resources.length,
      exportedAt: new Date().toISOString(),
      resources: resources.map(r => ({
        name: r.name,
        sizeInBytes: r.sizeInBytes,
        resourceType: r.resourceType,
        mimeType: r.mimeType,
        humanDescription: r.humanDescription
      }))
    }
    downloadBlob(`${assembly?.name || 'assembly'}_resources.json`, JSON.stringify(payload, null, 2), 'application/json')
  }

  const exportAssetsCsv = () => {
    const headers = ['Nome Risorsa', 'Tipo', 'Dimensione Bytes', 'MimeType', 'Descrizione']
    const rows = resources.map(r => [
      escapeCsvCell(r.name),
      escapeCsvCell(r.resourceType || ''),
      r.sizeInBytes,
      escapeCsvCell(r.mimeType || ''),
      escapeCsvCell(r.humanDescription || '')
    ])
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n')
    downloadBlob(`${assembly?.name || 'assembly'}_resources.csv`, csvContent, 'text/csv;charset=utf-8;')
  }

  // Format dimensione byte in KB / MB
  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes <= 0) return '0 Byte'
    if (bytes < 1024) return `${bytes} Byte`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  if (!isOpen || !assembly) return null

  // Sintesi non tecnica automatica
  const hasSql = stats.sql > 0 || stats.connection > 0
  const hasUi = imageAssets.length > 0 || resources.some(r => r.name.toLowerCase().endsWith('.resources'))
  const appRole = hasUi
    ? 'Applicazione con Interfaccia Grafica Utente (finestre, schermate, icone e bottoni)'
    : hasSql
      ? 'Modulo Servizio / Accesso Dati per elaborazione e salvataggio su Database'
      : 'Libreria di Supporto e Calcolo Logico di Business'

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
          width: '950px',
          maxWidth: '96vw',
          height: '640px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="title-bar">
          <div className="title-bar-text">
            Ispezione Avanzata: Asset Grafici, Stringhe &amp; Guida Non Tecnica - {assembly.name}
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
            backgroundColor: 'var(--retro-surface-soft)',
            flexWrap: 'wrap'
          }}
        >
          <button
            type="button"
            className={activeTab === 'overview' ? 'active-view-tab' : ''}
            onClick={() => setActiveTab('overview')}
            style={{ padding: '3px 10px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Guida Chiara (Per Non Tecnici)
          </button>
          <button
            type="button"
            className={activeTab === 'assets' ? 'active-view-tab' : ''}
            onClick={() => setActiveTab('assets')}
            style={{ padding: '3px 10px', fontSize: '11px', cursor: 'pointer' }}
          >
            Asset Grafici &amp; Risorse #{resources.length} {imageAssets.length > 0 && `(${imageAssets.length} immagini)`}
          </button>
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
        </div>

        {/* Contenuto Tab */}
        <div className="window-body" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '8px', overflowY: 'auto' }}>
          {/* TAB 1: GUIDA NON TECNICA */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Box riassuntivo a colpo d'occhio */}
              <div
                style={{
                  border: '1px solid var(--retro-border-dark)',
                  backgroundColor: 'var(--retro-surface-soft)',
                  padding: '12px'
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>
                  Che cos'è e che cosa fa questo file? (Sintesi Funzionale)
                </div>
                <div style={{ fontSize: '12px', lineHeight: 1.5, color: '#222' }}>
                  Il file analizzato <strong>{assembly.name}</strong> è un modulo software compilato per l'ambiente{' '}
                  <strong>{assembly.targetFramework || '.NET Framework'}</strong>.
                  <br />
                  In base all'analisi dei suoi contenuti interni, il suo ruolo principale è:{' '}
                  <span style={{ fontWeight: 'bold', color: '#000080' }}>{appRole}</span>.
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 8,
                    marginTop: 10
                  }}
                >
                  <div style={{ backgroundColor: '#fff', border: '1px solid var(--retro-border-light)', padding: '6px 8px' }}>
                    <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>Elementi di Codice</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{assembly.totalTypesCount} strutture logiche</div>
                    <div style={{ fontSize: '10px', color: '#555' }}>Classi, interfacce e modelli dati</div>
                  </div>

                  <div style={{ backgroundColor: '#fff', border: '1px solid var(--retro-border-light)', padding: '6px 8px' }}>
                    <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>Grafica &amp; Risorse</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{imageAssets.length} immagini / {resources.length} file</div>
                    <div style={{ fontSize: '10px', color: '#555' }}>Loghi, icone, file di testo o configurazione</div>
                  </div>

                  <div style={{ backgroundColor: '#fff', border: '1px solid var(--retro-border-light)', padding: '6px 8px' }}>
                    <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>Database &amp; Connessioni</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{stats.sql + stats.connection} istruzioni SQL</div>
                    <div style={{ fontSize: '10px', color: '#555' }}>{hasSql ? 'Comunica con banche dati' : 'Nessun SQL inline trovato'}</div>
                  </div>

                  <div style={{ backgroundColor: '#fff', border: '1px solid var(--retro-border-light)', padding: '6px 8px' }}>
                    <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>Rischio Migrazione</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: findings.some(f => f.severity === 'Critical') ? '#cc0000' : '#006600' }}>
                      {findings.length > 0 ? `${findings.length} attenzioni` : 'Compatibile'}
                    </div>
                    <div style={{ fontSize: '10px', color: '#555' }}>Verifica per passaggio a .NET moderno</div>
                  </div>
                </div>
              </div>

              {/* Glossario per chi non è del settore */}
              <div style={{ border: '1px solid var(--retro-border-dark)', backgroundColor: '#fff', padding: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>
                  Piccolo Glossario: Capire i termini tecnici senza essere programmatori
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '11px', lineHeight: 1.4 }}>
                  <div>
                    <strong>Che cos'è un Assembly (.dll o .exe)?</strong>
                    <div style={{ color: '#444' }}>
                      È la "scatola sigillata" del programma. Contiene tutto il codice già pronto per far funzionare il software, insieme alle immagini e alle regole di funzionamento.
                    </div>
                  </div>

                  <div>
                    <strong>Cosa fa questo strumento (.NET Archaeologist)?</strong>
                    <div style={{ color: '#444' }}>
                      Funziona come una "radiografia passiva": guarda dentro la scatola senza mai accendere né eseguire il software. In questo modo è sicuro al 100% e non rischia di rompere o alterare nulla.
                    </div>
                  </div>

                  <div>
                    <strong>Cosa sono le Risorse e gli Asset?</strong>
                    <div style={{ color: '#444' }}>
                      Sono i file "allegati" all'interno del programma: il logo aziendale, le icone delle finestre, i testi tradotti in altre lingue e le tabelle di configurazione.
                    </div>
                  </div>

                  <div>
                    <strong>Perché cerchiamo le stringhe SQL e gli URL?</strong>
                    <div style={{ color: '#444' }}>
                      Perché spesso nei vecchi programmi gli indirizzi dei server e le formule per leggere i dati dei clienti erano scritti direttamente dentro il codice, permettendoci di ricostruire l'architettura in pochi secondi.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ASSET GRAFICI E RISORSE */}
          {activeTab === 'assets' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', color: '#444' }}>
                  Asset grafici, icone, file XML e risorse incorporate estratte direttamente dallo stream del binario.
                </div>
                {resources.length > 0 && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      onClick={exportAssetsCsv}
                      style={{ fontSize: '10px', padding: '2px 6px', cursor: 'pointer' }}
                      title="Esporta elenco risorse in formato CSV"
                    >
                      Esporta CSV
                    </button>
                    <button
                      type="button"
                      onClick={exportAssetsJson}
                      style={{ fontSize: '10px', padding: '2px 6px', cursor: 'pointer' }}
                      title="Esporta elenco risorse in formato JSON"
                    >
                      Esporta JSON
                    </button>
                  </div>
                )}
              </div>

              {/* Galleria Visiva se sono presenti immagini */}
              {imageAssets.length > 0 && (
                <div style={{ border: '1px solid var(--retro-border-dark)', backgroundColor: 'var(--retro-surface-soft)', padding: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '6px' }}>
                    Galleria Immagini &amp; Icone ({imageAssets.length} elementi)
                  </div>
                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: '4px' }}>
                    {imageAssets.map((img, idx) => (
                      <div
                        key={idx}
                        onClick={() => setPreviewImage(img)}
                        style={{
                          backgroundColor: '#fff',
                          border: '1px solid var(--retro-border-dark)',
                          padding: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 4,
                          cursor: 'pointer',
                          minWidth: '120px',
                          maxWidth: '160px'
                        }}
                        title="Clicca per ingrandire l'asset"
                      >
                        <div
                          style={{
                            width: '64px',
                            height: '64px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#f5f5f5',
                            border: '1px dashed #ccc'
                          }}
                        >
                          {img.previewDataUri ? (
                            <img
                              src={img.previewDataUri}
                              alt={img.name}
                              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                            />
                          ) : (
                            <span style={{ fontSize: '9px', color: '#666' }}>[Icona/Grafica]</span>
                          )}
                        </div>
                        <div style={{ fontSize: '9px', fontWeight: 'bold', textAlign: 'center', wordBreak: 'break-all' }}>
                          {img.name.split('.').slice(-2).join('.')}
                        </div>
                        <div style={{ fontSize: '8px', color: '#666' }}>
                          {formatBytes(img.sizeInBytes)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tabella di tutti i file di risorsa con descrizione in linguaggio naturale */}
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
                    Nessuna risorsa incorporata o asset grafico rilevato in questo assembly.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--retro-surface-soft)', borderBottom: '1px solid var(--retro-border-dark)', textAlign: 'left' }}>
                        <th style={{ padding: '4px 6px', width: '40px', textAlign: 'center' }}>Anteprima</th>
                        <th style={{ padding: '4px 6px' }}>Nome Risorsa</th>
                        <th style={{ padding: '4px 6px', width: '110px' }}>Tipo</th>
                        <th style={{ padding: '4px 6px', width: '80px', textAlign: 'right' }}>Dimensione</th>
                        <th style={{ padding: '4px 6px' }}>Cosa rappresenta (Spiegazione semplice)</th>
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
                          <td style={{ padding: '4px', textAlign: 'center' }}>
                            {r.previewDataUri ? (
                              <img
                                src={r.previewDataUri}
                                alt={r.name}
                                style={{ width: '20px', height: '20px', objectFit: 'contain', cursor: 'pointer' }}
                                onClick={() => setPreviewImage(r)}
                                title="Ingrandisci"
                              />
                            ) : (
                              <span style={{ fontSize: '10px', opacity: 0.6 }}>-</span>
                            )}
                          </td>
                          <td style={{ padding: '4px 6px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                            {r.name}
                          </td>
                          <td style={{ padding: '4px 6px' }}>
                            <span className="badge badge-class" style={{ fontSize: '9px' }}>
                              {r.resourceType || 'Embedded'}
                            </span>
                          </td>
                          <td style={{ padding: '4px 6px', textAlign: 'right', fontFamily: 'monospace' }}>
                            {formatBytes(r.sizeInBytes)}
                          </td>
                          <td style={{ padding: '4px 6px', color: '#333', fontSize: '10px' }}>
                            {r.humanDescription || 'File di supporto interno.'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: STRINGHE E COSTANTI */}
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
                    style={{ fontSize: '11px', height: '22px', padding: '2px 6px', width: '160px' }}
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
                  {filteredStrings.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={exportStringsCsv}
                        style={{ fontSize: '10px', height: '22px', padding: '0 6px', cursor: 'pointer' }}
                        title="Esporta stringhe filtrate in CSV"
                      >
                        CSV
                      </button>
                      <button
                        type="button"
                        onClick={exportStringsJson}
                        style={{ fontSize: '10px', height: '22px', padding: '0 6px', cursor: 'pointer' }}
                        title="Esporta stringhe filtrate in JSON"
                      >
                        JSON
                      </button>
                    </>
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

          {/* TAB 4: AUDIT MODERNIZZAZIONE */}
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
        </div>

        {/* Modal ingrandimento immagine asset */}
        {previewImage && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              zIndex: 1100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
            onClick={() => setPreviewImage(null)}
          >
            <div
              className="window"
              style={{ maxWidth: '600px', width: '90%', padding: '10px', backgroundColor: 'var(--retro-surface)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="title-bar" style={{ marginBottom: '8px' }}>
                <div className="title-bar-text">Anteprima Asset: {previewImage.name}</div>
                <div className="title-bar-controls">
                  <button aria-label="Close" onClick={() => setPreviewImage(null)} style={{ cursor: 'pointer' }} />
                </div>
              </div>
              <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#fff', border: '1px solid var(--retro-border-dark)' }}>
                {previewImage.previewDataUri ? (
                  <img
                    src={previewImage.previewDataUri}
                    alt={previewImage.name}
                    style={{ maxWidth: '100%', maxHeight: '350px', objectFit: 'contain' }}
                  />
                ) : (
                  <div>Nessuna anteprima grafica disponibile per questo formato.</div>
                )}
                <div style={{ marginTop: '12px', fontSize: '11px', color: '#333', textAlign: 'left' }}>
                  <div><strong>Nome file:</strong> {previewImage.name}</div>
                  <div><strong>Dimensione:</strong> {formatBytes(previewImage.sizeInBytes)} ({previewImage.sizeInBytes} byte)</div>
                  <div><strong>Formato MIME:</strong> {previewImage.mimeType || 'Non specificato'}</div>
                  <div><strong>Spiegazione funzionale:</strong> {previewImage.humanDescription}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  style={{ minWidth: '70px', padding: '2px 10px', cursor: 'pointer' }}
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        )}

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
            Zero-Execution: ispezione passiva dei metadati ECMA-335, delle risorse PE e dei corpi IL.
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
