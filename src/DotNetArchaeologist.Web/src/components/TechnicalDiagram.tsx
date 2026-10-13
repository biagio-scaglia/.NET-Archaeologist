import React, { useState, useMemo } from 'react'
import type {
  SolutionDescriptor,
  AssemblyDescriptor,
} from '../types/api'

interface TechnicalDiagramProps {
  solution: SolutionDescriptor | null
  assembly: AssemblyDescriptor | null
  onOpenAssemblyPath: (assemblyPath: string) => void
  onSelectType?: (typeFullName: string) => void
  onClose?: () => void
}

interface DiagramNode {
  id: string
  title: string
  category: 'Service' | 'Database' | 'Batch' | 'Web' | 'Domain' | 'Class'
  technology: string
  subtitle?: string
  items: string[]
  assemblyPath?: string | null
  typeFullName?: string
  x: number
  y: number
  width: number
  height: number
}

interface DiagramEdge {
  fromId: string
  toId: string
  label?: string
  style?: 'inheritance' | 'dependency' | 'data'
}

type LayerFilter = 'all' | 'services' | 'databases' | 'batch' | 'classes'
type EdgeMode = 'focus' | 'all' | 'none'

function formatShortTech(tech: string): string {
  if (!tech) return ''
  if (tech.includes('Entity Framework') || tech.includes('ObjectContext') || tech.includes('DbContext')) {
    return 'Entity Framework'
  }
  if (tech.includes('ASP.NET MVC')) return 'MVC Controller'
  if (tech.includes('Web API')) return 'Web API (REST)'
  if (tech.includes('WCF Service')) return 'WCF Service'
  if (tech.includes('Console Batch') || tech.includes('Scheduled Worker')) return 'Batch Worker'
  return tech
}

export const TechnicalDiagram: React.FC<TechnicalDiagramProps> = ({
  solution,
  assembly,
  onOpenAssemblyPath,
  onSelectType,
  onClose,
}) => {
  const [zoom, setZoom] = useState<number>(1)
  const [filter, setFilter] = useState<LayerFilter>('all')
  const [edgeMode, setEdgeMode] = useState<EdgeMode>('focus')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  // Costruzione dei nodi e degli archi del Disegno Tecnico
  const { nodes, edges } = useMemo(() => {
    const nList: DiagramNode[] = []
    const eList: DiagramEdge[] = []

    // 1. SE C'È UNA SOLUTION CARICATA: DISEGNO TECNICO DI SISTEMA
    if (solution) {
      const colWidth = 290
      const rowGap = 30
      const colGap = 110

      // Colonna 1: Web & Client (X = 40)
      const webProjects = solution.projects.filter(p => p.category === 'Web')
      let yWeb = 40
      webProjects.forEach(wp => {
        const id = `web-${wp.name}`
        nList.push({
          id,
          title: wp.name,
          category: 'Web',
          technology: wp.detectedTechnologies[0] ?? 'ASP.NET MVC Web App',
          subtitle: wp.relativePath,
          items: wp.projectReferences.map(r => `Dipendenza: ${r}`),
          assemblyPath: wp.outputAssemblyPath,
          x: 40,
          y: yWeb,
          width: colWidth,
          height: 120 + Math.min(wp.projectReferences.length * 16, 60),
        })
        yWeb += 130 + Math.min(wp.projectReferences.length * 16, 60) + rowGap
      })

      // Colonna 2: Microservizi & API (X = 40 + colWidth + colGap)
      const xSvc = 40 + colWidth + colGap
      let ySvc = 40
      solution.services.forEach(svc => {
        const id = `svc-${svc.serviceName}`
        const epItems = svc.endpoints.slice(0, 4).map(e => `[${e.httpMethodOrContract ?? 'ACTION'}] ${e.name}()`)
        nList.push({
          id,
          title: svc.serviceName,
          category: 'Service',
          technology: svc.technology,
          subtitle: svc.contractInterface ?? svc.projectName,
          items: epItems,
          assemblyPath: svc.assemblyPath,
          x: xSvc,
          y: ySvc,
          width: colWidth,
          height: 120 + Math.min(epItems.length * 16, 70),
        })
        ySvc += 130 + Math.min(epItems.length * 16, 70) + rowGap
      })

      // Colonna 3: Database & Persistenza (X = xSvc + colWidth + colGap)
      const xDb = xSvc + colWidth + colGap
      let yDb = 40
      solution.databases.forEach(db => {
        const id = `db-${db.name}`
        const dbItems = [
          ...db.entitiesOrTables.slice(0, 3).map(t => `[TBL] ${t}`),
          ...db.detectedStoredProceduresOrQueries.slice(0, 2).map(p => `[PROC] ${p}`),
        ]
        nList.push({
          id,
          title: db.name,
          category: 'Database',
          technology: db.technology,
          subtitle: db.baseTypeOrPattern ?? db.projectName,
          items: dbItems,
          assemblyPath: db.assemblyPath,
          x: xDb,
          y: yDb,
          width: colWidth,
          height: 120 + Math.min(dbItems.length * 16, 80),
        })
        yDb += 130 + Math.min(dbItems.length * 16, 80) + rowGap
      })

      // Colonna 4: Batch & Processi Background (X = xDb + colWidth + colGap)
      const xBatch = xDb + colWidth + colGap
      let yBatch = 40
      solution.batchWorkers.forEach(b => {
        const id = `batch-${b.workerName}`
        nList.push({
          id,
          title: b.workerName,
          category: 'Batch',
          technology: b.technology,
          subtitle: b.entryPointOrJobClass ?? b.projectName,
          items: b.triggersOrSchedules.map(t => `[TRIGGER] ${t}`),
          assemblyPath: b.assemblyPath,
          x: xBatch,
          y: yBatch,
          width: colWidth,
          height: 120 + Math.min(b.triggersOrSchedules.length * 16, 60),
        })
        yBatch += 130 + Math.min(b.triggersOrSchedules.length * 16, 60) + rowGap
      })

      // Connessioni Tecniche (Archi mirati basati su dipendenze di progetto reali)
      // Web -> Servizi
      webProjects.forEach(wp => {
        solution.services.forEach(svc => {
          if (
            wp.projectReferences.includes(svc.projectName) ||
            wp.name === svc.projectName ||
            svc.projectName.toLowerCase().includes('service')
          ) {
            eList.push({
              fromId: `web-${wp.name}`,
              toId: `svc-${svc.serviceName}`,
              label: 'Invoca Servizio',
              style: 'dependency',
            })
          }
        })
      })

      // Servizi -> Database (collegamento solo in caso di dipendenza reale di progetto o modulo)
      solution.services.forEach(svc => {
        const svcProject = solution.projects.find(p => p.name === svc.projectName)
        solution.databases.forEach(db => {
          const isRelated =
            svc.projectName === db.projectName ||
            (svcProject?.projectReferences.includes(db.projectName) ?? false) ||
            (svcProject?.projectReferences.some(pr => pr.toLowerCase().includes('data')) && db.projectName.toLowerCase().includes('data'))

          if (isRelated) {
            eList.push({
              fromId: `svc-${svc.serviceName}`,
              toId: `db-${db.name}`,
              label: 'Persistenza / Query',
              style: 'data',
            })
          }
        })
      })

      // Batch -> Database (collegamento solo in caso di dipendenza reale o modulo)
      solution.batchWorkers.forEach(b => {
        const batchProject = solution.projects.find(p => p.name === b.projectName)
        solution.databases.forEach(db => {
          const isRelated =
            b.projectName === db.projectName ||
            (batchProject?.projectReferences.includes(db.projectName) ?? false) ||
            (batchProject?.projectReferences.some(pr => pr.toLowerCase().includes('data')) && db.projectName.toLowerCase().includes('data'))

          if (isRelated) {
            eList.push({
              fromId: `batch-${b.workerName}`,
              toId: `db-${db.name}`,
              label: 'Accesso Dati',
              style: 'data',
            })
          }
        })
      })
    }
    // 2. SE È CARICATO UN SINGOLO ASSEMBLY: CLASS DIAGRAM TECNICO (Padri & Figli)
    else if (assembly) {
      const typeList = assembly.types.slice(0, 30) // Primi 30 tipi per chiarezza visiva
      let currX = 40
      let currY = 40
      const colWidth = 240
      const colHeight = 120

      typeList.forEach((t, idx) => {
        const id = `type-${t.fullName}`
        const memberItems = t.members.slice(0, 3).map(m => `+ ${m.name}(): ${m.returnTypeOrType}`)
        nList.push({
          id,
          title: t.name,
          category: 'Class',
          technology: `${t.kind} [${t.accessibility}]`,
          subtitle: t.namespace || '<Global>',
          items: memberItems,
          typeFullName: t.fullName,
          x: currX,
          y: currY,
          width: colWidth,
          height: colHeight + Math.min(memberItems.length * 15, 50),
        })

        // Connessione Padre-Figlio
        if (t.baseTypeFullName && t.baseTypeFullName !== 'System.Object') {
          const parentMatch = assembly.types.find(p => p.fullName === t.baseTypeFullName || p.name === t.baseTypeFullName)
          if (parentMatch) {
            eList.push({
              fromId: id,
              toId: `type-${parentMatch.fullName}`,
              label: 'Eredita da (Figlio -> Padre)',
              style: 'inheritance',
            })
          }
        }

        currX += colWidth + 50
        if ((idx + 1) % 4 === 0) {
          currX = 40
          currY += 190
        }
      })
    }

    return { nodes: nList, edges: eList }
  }, [solution, assembly])

  // Filtraggio per categoria
  const filteredNodes = useMemo(() => {
    if (filter === 'all') return nodes
    if (filter === 'services') return nodes.filter(n => n.category === 'Service')
    if (filter === 'databases') return nodes.filter(n => n.category === 'Database')
    if (filter === 'batch') return nodes.filter(n => n.category === 'Batch')
    if (filter === 'classes') return nodes.filter(n => n.category === 'Class')
    return nodes
  }, [nodes, filter])

  const selectedNode = useMemo(
    () => nodes.find(n => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  )

  const getCategoryColor = (cat: DiagramNode['category']) => {
    switch (cat) {
      case 'Service':
        return { border: '#000080', bg: '#eef3fc', header: '#000080', text: '#ffffff' }
      case 'Database':
        return { border: '#006633', bg: '#eefbf3', header: '#006633', text: '#ffffff' }
      case 'Batch':
        return { border: '#994400', bg: '#fff6ed', header: '#994400', text: '#ffffff' }
      case 'Web':
        return { border: '#550055', bg: '#faedfa', header: '#550055', text: '#ffffff' }
      case 'Domain':
      case 'Class':
      default:
        return { border: '#333333', bg: '#f8f9fa', header: '#444444', text: '#ffffff' }
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#c0c0c0',
        overflow: 'hidden',
        boxSizing: 'border-box',
        padding: '4px',
      }}
    >
      {/* Barra degli Strumenti Tecnico / Disegno CAD Win98 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#dfdfdf',
          border: '2px groove #fff',
          padding: '4px 8px',
          marginBottom: '4px',
          fontSize: '11px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <strong>[DISEGNO TECNICO ARCHITETTURALE]</strong>
          <span>|</span>
          <label>Filtro Layer:</label>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as LayerFilter)}
            style={{ fontSize: '11px' }}
          >
            <option value="all">Tutti i Componenti ({nodes.length})</option>
            <option value="services">Microservizi &amp; WCF/REST</option>
            <option value="databases">Database &amp; Tabelle EF/SQL</option>
            <option value="batch">Processi Batch &amp; Worker</option>
            {assembly && <option value="classes">Class Diagram (Padri/Figli)</option>}
          </select>
          <span>|</span>
          <label>Connessioni:</label>
          <select
            value={edgeMode}
            onChange={e => setEdgeMode(e.target.value as EdgeMode)}
            style={{ fontSize: '11px', fontWeight: 'bold' }}
          >
            <option value="focus">[Focus] Nodo Selezionato</option>
            <option value="all">[Tutte] Mostra Connessioni</option>
            <option value="none">[Nessuna] Solo Blocchi CAD</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => setZoom(z => Math.max(0.4, Number((z - 0.15).toFixed(2))))}
            style={{ padding: '1px 6px', fontSize: '11px', cursor: 'pointer' }}
          >
            [-] Zoom
          </button>
          <span style={{ fontFamily: 'monospace', minWidth: '40px', textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(z => Math.min(2.5, Number((z + 0.15).toFixed(2))))}
            style={{ padding: '1px 6px', fontSize: '11px', cursor: 'pointer' }}
          >
            [+] Zoom
          </button>
          <button
            onClick={() => setZoom(1)}
            style={{ padding: '1px 8px', fontSize: '11px', cursor: 'pointer' }}
          >
            1:1 Reset
          </button>
          {onClose && (
            <button
              onClick={onClose}
              style={{ padding: '1px 8px', fontSize: '11px', cursor: 'pointer', marginLeft: '6px' }}
            >
              Chiudi Disegno
            </button>
          )}
        </div>
      </div>

      {/* Area del Canvas a foglio millimetrato tecnico */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            backgroundColor: '#e6eaee',
            backgroundImage:
              'linear-gradient(#d5dce2 1px, transparent 1px), linear-gradient(90deg, #d5dce2 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            border: '2px inset #fff',
            position: 'relative',
          }}
        >
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: '0 0',
              minWidth: '1800px',
              minHeight: '1200px',
              position: 'relative',
              padding: '20px',
            }}
          >
            {/* SVG per le linee di collegamento tecniche */}
            {edgeMode !== 'none' && (
              <svg
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                }}
              >
                <defs>
                  <marker
                    id="arrow-tech"
                    viewBox="0 0 10 10"
                    refX="10"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#000080" />
                  </marker>
                  <marker
                    id="arrow-inherit"
                    viewBox="0 0 10 10"
                    refX="10"
                    refY="5"
                    markerWidth="7"
                    markerHeight="7"
                    orient="auto-start-reverse"
                  >
                    <polygon points="0,0 10,5 0,10" fill="#fff" stroke="#333" strokeWidth="1.5" />
                  </marker>
                  <marker
                    id="arrow-highlight"
                    viewBox="0 0 10 10"
                    refX="10"
                    refY="5"
                    markerWidth="7"
                    markerHeight="7"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#0000ff" />
                  </marker>
                </defs>

                {edges.map((e, idx) => {
                  const sourceNode = filteredNodes.find(n => n.id === e.fromId)
                  const targetNode = filteredNodes.find(n => n.id === e.toId)
                  if (!sourceNode || !targetNode) return null

                  // Calcolo ancoraggi orientati per impedire attraversamenti dei box
                  let x1: number, y1: number, x2: number, y2: number
                  const fromCenterX = sourceNode.x + sourceNode.width / 2
                  const toCenterX = targetNode.x + targetNode.width / 2

                  if (toCenterX >= fromCenterX) {
                    // Target a destra: esce dal bordo destro di source, entra nel bordo sinistro di target
                    x1 = sourceNode.x + sourceNode.width
                    y1 = sourceNode.y + sourceNode.height / 2
                    x2 = targetNode.x
                    y2 = targetNode.y + targetNode.height / 2
                  } else {
                    // Target a sinistra: esce dal bordo sinistro di source, entra nel bordo destro di target (es. Batch -> Database)
                    x1 = sourceNode.x
                    y1 = sourceNode.y + sourceNode.height / 2
                    x2 = targetNode.x + targetNode.width
                    y2 = targetNode.y + targetNode.height / 2
                  }

                  const dx = (x2 - x1) * 0.5
                  const pathData = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`

                  const isInherit = e.style === 'inheritance'
                  const isConnectedToSelected = selectedNodeId === e.fromId || selectedNodeId === e.toId
                  const isHighlight = isConnectedToSelected

                  // In modalità Focus mostra gli archi solo quando un nodo è selezionato
                  if (edgeMode === 'focus') {
                    if (!selectedNodeId || !isConnectedToSelected) {
                      return null
                    }
                  }

                  const opacity = isHighlight
                    ? 1
                    : (selectedNodeId ? 0.05 : (edgeMode === 'all' ? 0.7 : 0.22))
                  const strokeWidth = isHighlight ? 2.5 : 1.2
                  const strokeColor = isHighlight
                    ? '#0000ff'
                    : (isInherit ? '#555555' : e.style === 'data' ? '#006633' : '#000080')
                  const markerId = isHighlight
                    ? 'url(#arrow-highlight)'
                    : (isInherit ? 'url(#arrow-inherit)' : 'url(#arrow-tech)')

                  const showLabel = isHighlight || (edgeMode === 'all' && edges.length <= 6)

                  return (
                    <g key={`edge-${idx}`} style={{ opacity }}>
                      <path
                        d={pathData}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        strokeDasharray={isInherit ? '4 2' : 'none'}
                        markerEnd={markerId}
                      />
                      {e.label && showLabel && (
                        <g>
                          <rect
                            x={(x1 + x2) / 2 - 50}
                            y={(y1 + y2) / 2 - 10}
                            width="100"
                            height="16"
                            rx="3"
                            fill="#ffffff"
                            stroke={strokeColor}
                            strokeWidth="1"
                            opacity="0.95"
                          />
                          <text
                            x={(x1 + x2) / 2}
                            y={(y1 + y2) / 2}
                            fill="#000066"
                            fontSize="9"
                            fontFamily="monospace"
                            fontWeight="bold"
                            textAnchor="middle"
                            dominantBaseline="central"
                          >
                            {e.label}
                          </text>
                        </g>
                      )}
                    </g>
                  )
                })}
              </svg>
            )}

            {/* Render dei Blocchi Nodi del Disegno Tecnico */}
            {filteredNodes.map(node => {
              const isSelected = selectedNodeId === node.id
              const colors = getCategoryColor(node.category)

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  style={{
                    position: 'absolute',
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: `${node.width}px`,
                    minHeight: `${node.height}px`,
                    backgroundColor: colors.bg,
                    border: isSelected ? '2px solid #ff0000' : `2px solid ${colors.border}`,
                    boxShadow: isSelected ? '0 0 6px rgba(255,0,0,0.6)' : '2px 2px 0px rgba(0,0,0,0.15)',
                    cursor: 'pointer',
                    fontSize: '11px',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                  }}
                >
                  {/* Intestazione blocco tecnico */}
                  <div
                    style={{
                      backgroundColor: colors.header,
                      color: colors.text,
                      padding: '3px 8px',
                      fontWeight: 'bold',
                      fontSize: '11px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px',
                      overflow: 'hidden',
                      boxSizing: 'border-box',
                    }}
                  >
                    <span style={{ flexShrink: 0, letterSpacing: '0.5px', lineHeight: '14px' }}>
                      [{node.category.toUpperCase()}]
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        lineHeight: '14px',
                        opacity: 0.9,
                        textAlign: 'right',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flexShrink: 1,
                        minWidth: 0,
                      }}
                      title={node.technology}
                    >
                      {formatShortTech(node.technology)}
                    </span>
                  </div>

                  {/* Corpo del blocco */}
                  <div style={{ padding: '6px' }}>
                    <div
                      style={{
                        fontWeight: 'bold',
                        fontSize: '12px',
                        color: '#000080',
                        lineHeight: '16px',
                        marginBottom: '2px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={node.title}
                    >
                      {node.title}
                    </div>
                    {node.subtitle && (
                      <div
                        style={{
                          fontSize: '10px',
                          color: '#555',
                          lineHeight: '14px',
                          marginBottom: '6px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={node.subtitle}
                      >
                        {node.subtitle}
                      </div>
                    )}

                    {/* Voci tecniche (endpoint, tabelle, membri) */}
                    {node.items.length > 0 && (
                      <div style={{ borderTop: '1px solid #ccc', paddingTop: '4px', marginTop: '4px' }}>
                        {node.items.map((item, idx) => (
                          <div
                            key={idx}
                            style={{
                              fontSize: '10px',
                              fontFamily: 'monospace',
                              color: '#222',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              lineHeight: '15px',
                            }}
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Riquadro Dettaglio Tecnico Laterale Win98 */}
        {selectedNode && (
          <div
            style={{
              width: '300px',
              backgroundColor: '#dfdfdf',
              borderLeft: '2px groove #fff',
              display: 'flex',
              flexDirection: 'column',
              padding: '6px',
              boxSizing: 'border-box',
              overflowY: 'auto',
              fontSize: '11px',
            }}
          >
            <div
              style={{
                backgroundColor: '#000080',
                color: '#fff',
                padding: '4px 6px',
                fontWeight: 'bold',
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>Dettaglio Componente CAD</span>
              <button
                onClick={() => setSelectedNodeId(null)}
                style={{ padding: '0 4px', fontSize: '10px', cursor: 'pointer' }}
              >
                X
              </button>
            </div>

            <fieldset style={{ marginBottom: '8px' }}>
              <legend>Specifiche Tecniche</legend>
              <div><strong>Nome:</strong> {selectedNode.title}</div>
              <div><strong>Ruolo:</strong> [{selectedNode.category}]</div>
              <div><strong>Tecnologia:</strong> {selectedNode.technology}</div>
              {selectedNode.subtitle && (
                <div style={{ wordBreak: 'break-all', marginTop: '2px' }}>
                  <strong>Riferimento:</strong> {selectedNode.subtitle}
                </div>
              )}
            </fieldset>

            <fieldset style={{ marginBottom: '8px', flex: 1 }}>
              <legend>Elementi &amp; Interfacce ({selectedNode.items.length})</legend>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '10px' }}>
                {selectedNode.items.map((it, idx) => (
                  <li key={idx} style={{ marginBottom: '3px', wordBreak: 'break-all' }}>{it}</li>
                ))}
              </ul>
            </fieldset>

            {selectedNode.assemblyPath && (
              <button
                onClick={() => onOpenAssemblyPath(selectedNode.assemblyPath!)}
                style={{
                  padding: '4px 8px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  width: '100%',
                  marginTop: '4px',
                }}
              >
                Decompila Codice Assembly &gt;&gt;
              </button>
            )}

            {selectedNode.typeFullName && onSelectType && (
              <button
                onClick={() => onSelectType(selectedNode.typeFullName!)}
                style={{
                  padding: '4px 8px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  width: '100%',
                  marginTop: '4px',
                }}
              >
                Visualizza Classe nel Decompilatore &gt;&gt;
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
