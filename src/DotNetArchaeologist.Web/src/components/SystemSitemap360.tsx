import React, { useState, useMemo } from 'react'
import type { SolutionDescriptor } from '../types/api'

interface SystemSitemap360Props {
  solution: SolutionDescriptor
  onOpenAssemblyPath: (assemblyPath: string) => void
  onClose: () => void
}

type ViewMode360 = 'flow' | 'tree' | 'api'

interface SitemapItem {
  id: string
  title: string
  kind: 'page' | 'controller' | 'service' | 'contract' | 'database' | 'table' | 'procedure' | 'batch'
  section: string
  description: string
  routeOrCall?: string
  connectedServices: string[]
  connectedTables: string[]
  connectedBatch: string[]
  assemblyPath?: string | null
}

export const SystemSitemap360: React.FC<SystemSitemap360Props> = ({
  solution,
  onOpenAssemblyPath,
  onClose,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode360>('flow')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    web: true,
    services: true,
    data: true,
    batch: true,
  })

  const toggleSection = (sec: string) => {
    setExpandedSections(prev => ({ ...prev, [sec]: !prev[sec] }))
  }

  // Costruzione della Sitemap funzionale integrata a 360 gradi
  const sitemapItems = useMemo<SitemapItem[]>(() => {
    const items: SitemapItem[] = []

    const webProjects = solution.projects.filter(p => p.category === 'Web')
    const services = solution.services || []
    const databases = solution.databases || []
    const batchWorkers = solution.batchWorkers || []

    // 1. Pagine Web e Controller
    webProjects.forEach(wp => {
      // In base ai servizi e alle tecnologie, deduce le pagine/aree principali
      const relatedServices = services.filter(s =>
        wp.projectReferences.some(pr => pr.toLowerCase() === s.projectName.toLowerCase()) ||
        wp.name.toLowerCase() === s.projectName.toLowerCase() ||
        s.projectName.toLowerCase().includes('service')
      )

      const relatedDbs = databases.filter(d =>
        wp.projectReferences.some(pr => pr.toLowerCase() === d.projectName.toLowerCase())
      )

      items.push({
        id: `web-${wp.name}`,
        title: wp.name,
        kind: 'page',
        section: 'Frontend & Pagine Web',
        routeOrCall: `/${wp.name.replace(/\.Web$/i, '')}`,
        description: `Punto di ingresso web per gli operatori. Gestisce le viste utente e orchestra le chiamate verso la logica di business.`,
        connectedServices: relatedServices.map(s => s.serviceName),
        connectedTables: relatedDbs.flatMap(d => d.entitiesOrTables.slice(0, 3)),
        connectedBatch: batchWorkers.map(b => b.workerName),
        assemblyPath: wp.outputAssemblyPath,
      })

      // Genera sezioni/controller logici dedotti per dare una mappa reale e comprensibile
      relatedServices.forEach(svc => {
        const areaName = svc.serviceName.replace(/^(Ws|Service|Controller)/i, '').replace(/Service$/i, '') || 'Pratiche'
        items.push({
          id: `ctrl-${wp.name}_${areaName}`,
          title: `Area ${areaName} (Controller / Viste)`,
          kind: 'controller',
          section: 'Frontend & Pagine Web',
          routeOrCall: `/${areaName}/*`,
          description: `Sezione web dedicata alla consultazione e gestione dell'area ${areaName}. Interagisce con il servizio ${svc.serviceName}.`,
          connectedServices: [svc.serviceName],
          connectedTables: relatedDbs.flatMap(d => d.entitiesOrTables.slice(0, 2)),
          connectedBatch: batchWorkers.map(b => b.workerName),
          assemblyPath: wp.outputAssemblyPath,
        })
      })
    })

    // 2. Servizi & Contratti WCF / REST
    services.forEach(svc => {
      const relDbs = databases.filter(d =>
        svc.projectName.toLowerCase() === d.projectName.toLowerCase() ||
        d.projectName.toLowerCase().includes('data') ||
        d.projectName.toLowerCase().includes('dal')
      )

      items.push({
        id: `svc-${svc.projectName}_${svc.serviceName}`,
        title: svc.serviceName,
        kind: 'service',
        section: 'Microservizi & Logica di Business',
        routeOrCall: svc.contractInterface ? `Contratto: ${svc.contractInterface}` : `${svc.technology}`,
        description: `Servizio di business (${svc.technology}). Riceve le richieste applicative, valida i dati e scrive/legge sulla persistenza.`,
        connectedServices: svc.contractInterface ? [svc.contractInterface] : [],
        connectedTables: relDbs.flatMap(d => d.entitiesOrTables),
        connectedBatch: batchWorkers.map(b => b.workerName),
        assemblyPath: svc.assemblyPath,
      })

      if (svc.contractInterface) {
        items.push({
          id: `contract-${svc.projectName}_${svc.contractInterface}`,
          title: svc.contractInterface,
          kind: 'contract',
          section: 'Contratti di Interfaccia (API / WCF)',
          routeOrCall: `Operazioni: ${svc.endpoints.length} metodi`,
          description: `Interfaccia contrattuale formale. Definisce le firme dei metodi (${svc.endpoints.map(e => e.name).slice(0, 3).join(', ') || 'Metodi esposti'}) senza dipendere dall'implementazione.`,
          connectedServices: [svc.serviceName],
          connectedTables: relDbs.flatMap(d => d.entitiesOrTables.slice(0, 2)),
          connectedBatch: [],
          assemblyPath: svc.assemblyPath,
        })
      }
    })

    // 3. Database, Tabelle e Stored Procedures
    databases.forEach(db => {
      items.push({
        id: `db-${db.projectName}_${db.name}`,
        title: db.name,
        kind: 'database',
        section: 'Persistenza & Database',
        routeOrCall: `${db.technology} [${db.baseTypeOrPattern || 'ORM'}]`,
        description: `Contesto di persistenza dati. Mappa le tabelle relazionali e gestisce le transazioni SQL.`,
        connectedServices: services.map(s => s.serviceName),
        connectedTables: db.entitiesOrTables,
        connectedBatch: batchWorkers.map(b => b.workerName),
        assemblyPath: db.assemblyPath,
      })

      // Tabelle individuali per vista a 360 gradi
      db.entitiesOrTables.forEach(t => {
        items.push({
          id: `tbl-${db.name}_${t}`,
          title: `Tabella: ${t}`,
          kind: 'table',
          section: 'Tabelle & Entità SQL',
          routeOrCall: `Entità mappata in ${db.name}`,
          description: `Tabella di archiviazione persistente per l'entità ${t}. Utilizzata dai servizi e dai processi batch.`,
          connectedServices: services.map(s => s.serviceName),
          connectedTables: [t],
          connectedBatch: batchWorkers.map(b => b.workerName),
          assemblyPath: db.assemblyPath,
        })
      })

      // Stored Procedure individuali
      db.detectedStoredProceduresOrQueries.forEach(p => {
        items.push({
          id: `proc-${db.name}_${p}`,
          title: `Stored Proc: ${p}`,
          kind: 'procedure',
          section: 'Stored Procedures & Query SQL',
          routeOrCall: `Procedura SQL compilata`,
          description: `Procedura memorizzata su database per logica batch, report o transazioni complesse.`,
          connectedServices: services.map(s => s.serviceName),
          connectedTables: db.entitiesOrTables.slice(0, 2),
          connectedBatch: batchWorkers.map(b => b.workerName),
          assemblyPath: db.assemblyPath,
        })
      })
    })

    // 4. Batch & Worker
    batchWorkers.forEach(b => {
      items.push({
        id: `batch-${b.projectName}_${b.workerName}`,
        title: b.workerName,
        kind: 'batch',
        section: 'Processi Batch & Schedulati',
        routeOrCall: b.triggersOrSchedules.join(', ') || 'Esecuzione periodica',
        description: `Processo in background (${b.technology}). Esegue elaborazioni asincrone, notifiche o allineamento dati senza bloccare il web.`,
        connectedServices: services.map(s => s.serviceName),
        connectedTables: databases.flatMap(d => d.entitiesOrTables),
        connectedBatch: [b.workerName],
        assemblyPath: b.assemblyPath,
      })
    })

    return items
  }, [solution])

  // Filtraggio per ricerca rapida
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return sitemapItems
    const q = searchQuery.toLowerCase().trim()
    return sitemapItems.filter(i =>
      i.title.toLowerCase().includes(q) ||
      i.description.toLowerCase().includes(q) ||
      (i.routeOrCall && i.routeOrCall.toLowerCase().includes(q)) ||
      i.section.toLowerCase().includes(q)
    )
  }, [sitemapItems, searchQuery])

  const selectedItem = useMemo(() => {
    return sitemapItems.find(i => i.id === selectedItemId) ?? (filteredItems[0] ?? null)
  }, [sitemapItems, filteredItems, selectedItemId])

  // Raggruppamento per sezione per la vista ad albero
  const groupedSections = useMemo(() => {
    const groups: Record<string, SitemapItem[]> = {}
    filteredItems.forEach(item => {
      if (!groups[item.section]) groups[item.section] = []
      groups[item.section].push(item)
    })
    return groups
  }, [filteredItems])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--retro-surface)',
        padding: '6px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        fontSize: '11px',
      }}
    >
      {/* Banner Intestazione Visione Globale 360° */}
      <fieldset style={{ marginBottom: '6px', padding: '6px 10px' }}>
        <legend style={{ fontWeight: 'bold' }}>
          Sitemap &amp; Mappa Architetturale a 360°: {solution.name}.sln
        </legend>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ color: 'var(--retro-selection)', fontWeight: 'bold', fontSize: '12px' }}>
              Visione Integrata End-to-End: Dalle Pagine Web ai Database e ai Processi Batch
            </div>
            <div style={{ color: '#333', marginTop: '2px' }}>
              Spiega in linguaggio chiaro chi parla con chi, quali route esistono, quali contratti e tabelle sono coinvolti.
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ padding: '2px 8px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Chiudi Mappa
          </button>
        </div>
      </fieldset>

      {/* Toolbar Comandi & Modalità Vista */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--retro-surface-light)',
          border: '1px solid var(--retro-border)',
          padding: '4px 8px',
          marginBottom: '6px',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <strong>Vista:</strong>
          <button
            onClick={() => setViewMode('flow')}
            className={viewMode === 'flow' ? 'active-view-tab' : ''}
            style={{
              cursor: 'pointer',
              padding: '2px 8px',
            }}
          >
            [Flusso End-to-End 360°]
          </button>
          <button
            onClick={() => setViewMode('tree')}
            className={viewMode === 'tree' ? 'active-view-tab' : ''}
            style={{
              cursor: 'pointer',
              padding: '2px 8px',
            }}
          >
            [Sitemap Gerarchica]
          </button>
          <button
            onClick={() => setViewMode('api')}
            className={viewMode === 'api' ? 'active-view-tab' : ''}
            style={{
              cursor: 'pointer',
              padding: '2px 8px',
            }}
          >
            [Catalogo Contratti &amp; API]
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label>Cerca nel Sistema:</label>
          <input
            type="text"
            placeholder="Cerca pagina, servizio, tabella..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '220px', fontSize: '11px', padding: '2px 4px' }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ padding: '1px 5px' }}
            >
              x
            </button>
          )}
          <span style={{ color: '#555' }}>({filteredItems.length} elementi)</span>
        </div>
      </div>

      {/* Area Contenuto Principale: Visualizzazione + Dettaglio Laterale */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, gap: '6px' }}>
        
        {/* Riquadro di Sinistra: La Visualizzazione Selezionata */}
        <div
          style={{
            flex: 1,
            backgroundColor: '#ffffff',
            border: '2px inset #dfdfdf',
            overflowY: 'auto',
            padding: '10px',
            boxSizing: 'border-box',
          }}
        >
          {/* MODALITÀ 1: FLUSSO END-TO-END A 360 GRADI */}
          {viewMode === 'flow' && (
            <div>
              <div style={{ marginBottom: '12px', padding: '6px', backgroundColor: '#eef3fc', border: '1px solid #b0c4de' }}>
                <strong>Pipeline a 360° del Sistema:</strong> Segui il percorso di una richiesta dal browser web attraverso i contratti di servizio fino alla persistenza e ai worker. Clicca su un componente per tracciarlo.
              </div>

              {/* Le 4 Colonne della Pipeline */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {/* 1. FRONTEND / WEB */}
                <div style={{ border: '2px solid #550055', backgroundColor: '#faedfa', padding: '8px', minHeight: '380px' }}>
                  <div style={{ fontWeight: 'bold', color: '#550055', borderBottom: '2px solid #550055', paddingBottom: '4px', marginBottom: '8px' }}>
                    1. WEB &amp; SITEMAP (Ingresso)
                  </div>
                  {filteredItems.filter(i => i.kind === 'page' || i.kind === 'controller').length === 0 ? (
                    <div style={{ fontSize: '10px', color: '#666', fontStyle: 'italic' }}>Nessun elemento</div>
                  ) : (
                    filteredItems.filter(i => i.kind === 'page' || i.kind === 'controller').map(item => {
                      const isSel = selectedItem?.id === item.id
                      return (
                        <div
                          key={item.id}
                          className={`sitemap-card ${isSel ? 'selected' : ''}`}
                          onClick={() => setSelectedItemId(item.id)}
                          style={{
                            padding: '6px',
                            marginBottom: '6px',
                            backgroundColor: isSel ? '#550055' : undefined,
                            color: isSel ? '#ffffff' : '#000000',
                            border: isSel ? '2px solid #000' : '1px solid #cc99cc',
                            cursor: 'pointer',
                            boxShadow: isSel ? '2px 2px 4px rgba(0,0,0,0.3)' : undefined,
                          }}
                        >
                          <div style={{ fontWeight: 'bold', fontSize: '11px' }}>{item.title}</div>
                          <div style={{ fontSize: '10px', opacity: 0.85 }}>Route: {item.routeOrCall}</div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* 2. SERVIZI & CONTRATTI */}
                <div style={{ border: '2px solid #000080', backgroundColor: '#eef3fc', padding: '8px', minHeight: '380px' }}>
                  <div style={{ fontWeight: 'bold', color: '#000080', borderBottom: '2px solid #000080', paddingBottom: '4px', marginBottom: '8px' }}>
                    2. SERVIZI &amp; API (Business)
                  </div>
                  {filteredItems.filter(i => i.kind === 'service' || i.kind === 'contract').length === 0 ? (
                    <div style={{ fontSize: '10px', color: '#666', fontStyle: 'italic' }}>Nessun elemento</div>
                  ) : (
                    filteredItems.filter(i => i.kind === 'service' || i.kind === 'contract').map(item => {
                      const isSel = selectedItem?.id === item.id
                      const isLinked = selectedItem?.connectedServices.includes(item.title)
                      return (
                        <div
                          key={item.id}
                          className={`sitemap-card ${isSel ? 'selected' : ''}`}
                          onClick={() => setSelectedItemId(item.id)}
                          style={{
                            padding: '6px',
                            marginBottom: '6px',
                            backgroundColor: isSel ? '#000080' : isLinked ? '#fff2cc' : undefined,
                            color: isSel ? '#ffffff' : '#000000',
                            border: isSel ? '2px solid #000' : isLinked ? '2px solid #ff9900' : '1px solid #99aacc',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ fontWeight: 'bold', fontSize: '11px' }}>
                            [{item.kind === 'contract' ? 'IFACE' : 'SVC'}] {item.title}
                          </div>
                          <div style={{ fontSize: '10px', opacity: 0.85 }}>{item.routeOrCall}</div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* 3. DATABASE & TABELLE */}
                <div style={{ border: '2px solid #006633', backgroundColor: '#eefbf3', padding: '8px', minHeight: '380px' }}>
                  <div style={{ fontWeight: 'bold', color: '#006633', borderBottom: '2px solid #006633', paddingBottom: '4px', marginBottom: '8px' }}>
                    3. DATABASE &amp; DATI (Persistenza)
                  </div>
                  {filteredItems.filter(i => i.kind === 'database' || i.kind === 'table' || i.kind === 'procedure').length === 0 ? (
                    <div style={{ fontSize: '10px', color: '#666', fontStyle: 'italic' }}>Nessun elemento</div>
                  ) : (
                    filteredItems.filter(i => i.kind === 'database' || i.kind === 'table' || i.kind === 'procedure').slice(0, 10).map(item => {
                      const isSel = selectedItem?.id === item.id
                      const isLinked = selectedItem?.connectedTables.some(t => item.title.includes(t))
                      return (
                        <div
                          key={item.id}
                          className={`sitemap-card ${isSel ? 'selected' : ''}`}
                          onClick={() => setSelectedItemId(item.id)}
                          style={{
                            padding: '6px',
                            marginBottom: '6px',
                            backgroundColor: isSel ? '#006633' : isLinked ? '#fff2cc' : undefined,
                            color: isSel ? '#ffffff' : '#000000',
                            border: isSel ? '2px solid #000' : isLinked ? '2px solid #ff9900' : '1px solid #99ccaa',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ fontWeight: 'bold', fontSize: '11px' }}>{item.title}</div>
                          <div style={{ fontSize: '10px', opacity: 0.85 }}>{item.routeOrCall}</div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* 4. BATCH & BACKGROUND WORKER */}
                <div style={{ border: '2px solid #994400', backgroundColor: '#fff6ed', padding: '8px', minHeight: '380px' }}>
                  <div style={{ fontWeight: 'bold', color: '#994400', borderBottom: '2px solid #994400', paddingBottom: '4px', marginBottom: '8px' }}>
                    4. BATCH WORKER (Asincrono)
                  </div>
                  {filteredItems.filter(i => i.kind === 'batch').length === 0 ? (
                    <div style={{ fontSize: '10px', color: '#666', fontStyle: 'italic' }}>Nessun elemento</div>
                  ) : (
                    filteredItems.filter(i => i.kind === 'batch').map(item => {
                      const isSel = selectedItem?.id === item.id
                      return (
                        <div
                          key={item.id}
                          className={`sitemap-card ${isSel ? 'selected' : ''}`}
                          onClick={() => setSelectedItemId(item.id)}
                          style={{
                            padding: '6px',
                            marginBottom: '6px',
                            backgroundColor: isSel ? '#994400' : undefined,
                            color: isSel ? '#ffffff' : '#000000',
                            border: isSel ? '2px solid #000' : '1px solid #ccaa88',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ fontWeight: 'bold', fontSize: '11px' }}>[JOB] {item.title}</div>
                          <div style={{ fontSize: '10px', opacity: 0.85 }}>{item.routeOrCall}</div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* MODALITÀ 2: SITEMAP GERARCHICA AD ALBERO */}
          {viewMode === 'tree' && (
            <div>
              <div style={{ marginBottom: '10px', color: '#333' }}>
                Esplora le sezioni del software organizzate per area funzionale. Clicca su una sezione per espandere o contrarre.
              </div>
              {Object.entries(groupedSections).map(([sectionName, items]) => {
                const isExp = expandedSections[sectionName] ?? true
                return (
                  <div key={sectionName} style={{ marginBottom: '10px' }}>
                    <div
                      onClick={() => toggleSection(sectionName)}
                      style={{
                        backgroundColor: 'var(--retro-surface-light)',
                        border: '1px solid var(--retro-border)',
                        padding: '4px 8px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>{isExp ? '[-] ' : '[+] '} {sectionName} ({items.length})</span>
                      <span style={{ fontSize: '10px', color: '#555' }}>Clicca per espandere/contrarre</span>
                    </div>

                    {isExp && (
                      <div style={{ paddingLeft: '16px', borderLeft: '2px dashed var(--retro-border)', marginTop: '4px' }}>
                        {items.map(item => {
                          const isSel = selectedItem?.id === item.id
                          return (
                            <div
                              key={item.id}
                              className={`sitemap-card ${isSel ? 'selected' : ''}`}
                              onClick={() => setSelectedItemId(item.id)}
                              style={{
                                padding: '4px 8px',
                                marginBottom: '3px',
                                backgroundColor: isSel ? 'var(--retro-selection)' : undefined,
                                color: isSel ? 'var(--retro-selection-text)' : '#000000',
                                border: '1px solid var(--retro-border-light)',
                                cursor: 'pointer',
                              }}
                            >
                              <div style={{ fontWeight: 'bold' }}>{item.title}</div>
                              <div style={{ fontSize: '10px', opacity: 0.85 }}>{item.description}</div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* MODALITÀ 3: CATALOGO CONTRATTI & API 360° */}
          {viewMode === 'api' && (
            <div>
              <div style={{ marginBottom: '10px', color: '#333' }}>
                Tutte le interfacce formali, contratti WCF e operazioni SOAP/REST esposte dal sistema:
              </div>
              <table className="retro-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '6px' }}>Contratto / Interfaccia</th>
                    <th style={{ textAlign: 'left', padding: '6px' }}>Servizio Implementativo</th>
                    <th style={{ textAlign: 'left', padding: '6px' }}>Tecnologia</th>
                    <th style={{ textAlign: 'left', padding: '6px' }}>Operazioni / Firme</th>
                  </tr>
                </thead>
                <tbody>
                  {solution.services.map(svc => (
                    <tr
                      key={svc.serviceName}
                      onClick={() => setSelectedItemId(`svc-${svc.projectName}_${svc.serviceName}`)}
                      className={selectedItem?.title === svc.serviceName ? 'selected' : ''}
                      style={{
                        cursor: 'pointer',
                      }}
                    >
                      <td style={{ padding: '6px', fontWeight: 'bold', color: '#660066' }}>
                        {svc.contractInterface || 'Interfaccia Implicita'}
                      </td>
                      <td style={{ padding: '6px' }}>{svc.serviceName}</td>
                      <td style={{ padding: '6px' }}>{svc.technology}</td>
                      <td style={{ padding: '6px', fontFamily: 'monospace', fontSize: '10px' }}>
                        {svc.endpoints.map(ep => ep.name).join(', ') || 'Nessun endpoint rilevato'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Riquadro di Destra: Scheda Dettaglio Funzionale a 360° */}
        <div
          style={{
            width: '320px',
            backgroundColor: 'var(--retro-surface-light)',
            border: '1px solid var(--retro-border)',
            display: 'flex',
            flexDirection: 'column',
            padding: '8px',
            boxSizing: 'border-box',
            overflowY: 'auto',
          }}
        >
          {selectedItem ? (
            <div>
              <div
                style={{
                  backgroundColor: '#000080',
                  color: '#ffffff',
                  padding: '4px 6px',
                  fontWeight: 'bold',
                  fontSize: '11px',
                  marginBottom: '8px',
                }}
              >
                Visione a 360° del Componente
              </div>

              <fieldset style={{ marginBottom: '8px', backgroundColor: '#fff' }}>
                <legend style={{ fontWeight: 'bold' }}>Identità &amp; Ruolo</legend>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#000080' }}>
                  {selectedItem.title}
                </div>
                <div style={{ marginTop: '2px', color: '#555' }}>
                  Sezione: <strong>{selectedItem.section}</strong>
                </div>
                {selectedItem.routeOrCall && (
                  <div style={{ marginTop: '2px', fontFamily: 'monospace', fontSize: '10px', color: '#222' }}>
                    Riferimento: {selectedItem.routeOrCall}
                  </div>
                )}
              </fieldset>

              <fieldset style={{ marginBottom: '8px', backgroundColor: '#fff' }}>
                <legend style={{ fontWeight: 'bold' }}>Cosa Fa (Spiegazione Funzionale)</legend>
                <p style={{ margin: 0, lineHeight: '15px' }}>
                  {selectedItem.description}
                </p>
              </fieldset>

              {/* Box Discorsivo Parlante */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #b0c4de',
                  borderRadius: '2px',
                  padding: '8px',
                  fontSize: '11px',
                  lineHeight: '1.55',
                  marginBottom: '8px',
                  color: '#1a1a2e',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)',
                }}
              >
                <div style={{ fontWeight: 'bold', color: '#000080', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>🎙️</span>
                  <em>L'Archeologo racconta questo percorso:</em>
                </div>
                <div>
                  {`Questo componente appartiene alla sezione '${selectedItem.section}'. ${selectedItem.description} ${
                    selectedItem.connectedServices.length > 0
                      ? `Comunica direttamente con ${selectedItem.connectedServices.length} servizio/i di backend (${selectedItem.connectedServices.join(', ')}).`
                      : ''
                  } ${
                    selectedItem.connectedTables.length > 0
                      ? `Interagisce con le tabelle di database: ${selectedItem.connectedTables.join(', ')}.`
                      : ''
                  } ${
                    selectedItem.connectedBatch.length > 0
                      ? `È sincronizzato o correlato ai processi batch: ${selectedItem.connectedBatch.join(', ')}.`
                      : ''
                  }`}
                </div>
              </div>

              <fieldset style={{ marginBottom: '8px', backgroundColor: '#fff' }}>
                <legend style={{ fontWeight: 'bold' }}>Relazioni a 360°</legend>
                <div style={{ marginBottom: '6px' }}>
                  <strong>Servizi Connessi:</strong>
                  {selectedItem.connectedServices.length > 0 ? (
                    <ul style={{ margin: '2px 0 0 16px', padding: 0, fontSize: '10px' }}>
                      {selectedItem.connectedServices.map((s, idx) => <li key={idx}>{s}</li>)}
                    </ul>
                  ) : (
                    <span style={{ color: '#777', marginLeft: '4px' }}>Nessuno diretto</span>
                  )}
                </div>

                <div style={{ marginBottom: '6px' }}>
                  <strong>Tabelle &amp; Dati Coinvolti:</strong>
                  {selectedItem.connectedTables.length > 0 ? (
                    <ul style={{ margin: '2px 0 0 16px', padding: 0, fontSize: '10px' }}>
                      {selectedItem.connectedTables.map((t, idx) => <li key={idx}>{t}</li>)}
                    </ul>
                  ) : (
                    <span style={{ color: '#777', marginLeft: '4px' }}>Nessuna tabella diretta</span>
                  )}
                </div>

                <div>
                  <strong>Processi Batch Collegati:</strong>
                  {selectedItem.connectedBatch.length > 0 ? (
                    <ul style={{ margin: '2px 0 0 16px', padding: 0, fontSize: '10px' }}>
                      {selectedItem.connectedBatch.map((b, idx) => <li key={idx}>{b}</li>)}
                    </ul>
                  ) : (
                    <span style={{ color: '#777', marginLeft: '4px' }}>Nessun batch collegato</span>
                  )}
                </div>
              </fieldset>

              {selectedItem.assemblyPath && (
                <button
                  onClick={() => onOpenAssemblyPath(selectedItem.assemblyPath!)}
                  style={{
                    padding: '6px 12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    width: '100%',
                    backgroundColor: '#e1e1e1',
                  }}
                >
                  Decompila e Ispeziona Codice &gt;&gt;
                </button>
              )}
            </div>
          ) : (
            <div style={{ color: '#666', textAlign: 'center', marginTop: '20px' }}>
              Seleziona un elemento della sitemap per vederne la mappa a 360 gradi.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
