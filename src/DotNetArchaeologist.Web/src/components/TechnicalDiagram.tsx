import React, { useState, useMemo, useEffect, useRef } from 'react'
import type {
  SolutionDescriptor,
  AssemblyDescriptor,
  ArchitectureGraphDto,
} from '../types/api'
import { narrateArchitectureConnections } from '../utils/architectureNarrator'

interface TechnicalDiagramProps {
  solution: SolutionDescriptor | null
  assembly: AssemblyDescriptor | null
  sessionId?: string | null
  selectedTypeFullName?: string | null
  onOpenAssemblyPath: (assemblyPath: string) => void
  onSelectType?: (typeFullName: string) => void
  onClose?: () => void
}

interface DiagramNode {
  id: string
  title: string
  category: 'Service' | 'Database' | 'Batch' | 'Web' | 'Domain' | 'Class' | 'Interface' | 'Struct' | 'Enum' | 'Record' | 'Assembly' | 'Namespace'
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
  style?: 'inheritance' | 'implements' | 'dependency' | 'data'
}

type LayerFilter = 'all' | 'services' | 'databases' | 'batch' | 'classes' | 'interfaces'
type EdgeMode = 'focus' | 'all' | 'none'

function formatShortTech(tech: unknown): string {
  if (!tech || typeof tech !== 'string') return typeof tech === 'number' ? `Modulo #${tech}` : ''
  if (tech.includes('Entity Framework') || tech.includes('ObjectContext') || tech.includes('DbContext')) {
    return 'Entity Framework'
  }
  if (tech.includes('ASP.NET MVC')) return 'MVC Controller'
  if (tech.includes('Web API')) return 'Web API (REST)'
  if (tech.includes('WCF Service')) return 'WCF Service'
  if (tech.includes('Console Batch') || tech.includes('Scheduled Worker')) return 'Batch Worker'
  return tech
}

function renderTechnicalItem(item: string, idx: number): React.ReactNode {
  const tagMatch = item.match(/^\[([^\]]+)\]\s*(.*)$/)
  if (tagMatch) {
    const rawTag = tagMatch[1].trim()
    const rest = tagMatch[2].trim()

    let tagBg = '#f1f5f9'
    let tagColor = '#475569'
    let tagBorder = '#cbd5e1'

    if (rawTag === 'GET') {
      tagBg = '#e0f2fe'
      tagColor = '#0369a1'
      tagBorder = '#bae6fd'
    } else if (rawTag === 'POST') {
      tagBg = '#dcfce7'
      tagColor = '#15803d'
      tagBorder = '#bbf7d0'
    } else if (rawTag.includes('POST') && rawTag.includes('GET')) {
      tagBg = '#ede9fe'
      tagColor = '#6d28d9'
      tagBorder = '#ddd6fe'
    } else if (rawTag.includes('TRIGGER')) {
      tagBg = '#fef3c7'
      tagColor = '#b45309'
      tagBorder = '#fde68a'
    } else if (rawTag.includes('TABLE') || rawTag.includes('ENTITY')) {
      tagBg = '#ecfdf5'
      tagColor = '#047857'
      tagBorder = '#a7f3d0'
    } else if (rawTag === 'DELETE') {
      tagBg = '#fee2e2'
      tagColor = '#b91c1c'
      tagBorder = '#fecaca'
    } else if (rawTag === 'PUT') {
      tagBg = '#ffedd5'
      tagColor = '#c2410c'
      tagBorder = '#fed7aa'
    }

    return (
      <div
        key={idx}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          fontSize: '10px',
          lineHeight: '16px',
          marginBottom: '2px',
          overflow: 'hidden',
        }}
        title={item}
      >
        <span
          style={{
            fontSize: '8.5px',
            fontWeight: 'bold',
            fontFamily: 'Consolas, monospace',
            backgroundColor: tagBg,
            color: tagColor,
            border: `1px solid ${tagBorder}`,
            borderRadius: '2px',
            padding: '0 4px',
            lineHeight: '12px',
            flexShrink: 0,
          }}
        >
          {rawTag}
        </span>
        <span
          style={{
            fontFamily: 'Consolas, monospace',
            color: '#1f2937',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontSize: '10px',
          }}
        >
          {rest}
        </span>
      </div>
    )
  }

  return (
    <div
      key={idx}
      style={{
        fontSize: '10px',
        fontFamily: 'Consolas, monospace',
        color: '#1f2937',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        lineHeight: '16px',
      }}
      title={item}
    >
      {item}
    </div>
  )
}


export const TechnicalDiagram: React.FC<TechnicalDiagramProps> = ({
  solution,
  assembly,
  sessionId,
  selectedTypeFullName,
  onOpenAssemblyPath,
  onSelectType,
  onClose,
}) => {
  const [zoom, setZoom] = useState<number>(1)
  const [filter, setFilter] = useState<LayerFilter>('all')
  const [edgeMode, setEdgeMode] = useState<EdgeMode>('focus')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<DiagramEdge | null>(null)
  const [activeSideTab, setActiveSideTab] = useState<'archaeologist' | 'specs'>('archaeologist')
  const [showArchaeologistPanel, setShowArchaeologistPanel] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [diagramView, setDiagramView] = useState<'system' | 'graph'>(solution ? 'system' : 'graph')
  const [showExternal, setShowExternal] = useState<boolean>(false)
  const [showMinimap, setShowMinimap] = useState<boolean>(true)
  const [backendGraph, setBackendGraph] = useState<ArchitectureGraphDto | null>(null)
  const [graphLoading, setGraphLoading] = useState<boolean>(false)

  const canvasScrollRef = useRef<HTMLDivElement>(null)

  // Caricamento del grafo architetturale remoto se sessionId è disponibile
  useEffect(() => {
    if (!sessionId) {
      const timer = setTimeout(() => setBackendGraph(null), 0)
      return () => clearTimeout(timer)
    }

    let isMounted = true
    const timer = setTimeout(() => {
      if (isMounted) setGraphLoading(true)
    }, 0)

    fetch(`/api/assemblies/${sessionId}/graph?includeReferences=true&includeExternal=${showExternal}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (isMounted && data) {
          setBackendGraph(data)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setGraphLoading(false)
      })

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [sessionId, showExternal])

  // Costruzione dei nodi e degli archi del Disegno Tecnico
  const { nodes, edges } = useMemo(() => {
    const nList: DiagramNode[] = []
    const eList: DiagramEdge[] = []

    // 1. MODALITÀ SISTEMA: ARCHITETTURA SOLUTION (Web, Microservizi, Database, Batch)
    if (diagramView === 'system' && solution) {
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

      // Colonna 2: Microservizi & Contratti di Interfaccia (X = 40 + colWidth + colGap)
      const xSvc = 40 + colWidth + colGap
      let ySvc = 40
      solution.services.forEach(svc => {
        const id = `svc-${svc.projectName}_${svc.serviceName}`
        const epItems = svc.endpoints.slice(0, 4).map(e => `[${e.httpMethodOrContract ?? 'ACTION'}] ${e.name}()`)
        nList.push({
          id,
          title: svc.serviceName,
          category: 'Service',
          technology: svc.technology,
          subtitle: svc.contractInterface ? `Implementa ${svc.contractInterface}` : svc.projectName,
          items: epItems,
          assemblyPath: svc.assemblyPath,
          x: xSvc,
          y: ySvc,
          width: colWidth,
          height: 120 + Math.min(epItems.length * 16, 70),
        })
        ySvc += 130 + Math.min(epItems.length * 16, 70) + rowGap

        // Genera il nodo reale per l'Interfaccia Contratto WCF/API se presente
        if (svc.contractInterface) {
          const ifaceId = `iface-${svc.projectName}_${svc.contractInterface}`
          const ifaceOps = svc.endpoints.slice(0, 4).map(e => `[CONTRACT] ${e.name}()`)
          nList.push({
            id: ifaceId,
            title: svc.contractInterface,
            category: 'Interface',
            technology: 'WCF / Service Contract',
            subtitle: `Interfaccia per ${svc.serviceName}`,
            items: ifaceOps,
            assemblyPath: svc.assemblyPath,
            x: xSvc,
            y: ySvc,
            width: colWidth,
            height: 100 + Math.min(ifaceOps.length * 16, 60),
          })
          ySvc += 110 + Math.min(ifaceOps.length * 16, 60) + rowGap

          eList.push({
            fromId: id,
            toId: ifaceId,
            label: 'implements',
            style: 'implements',
          })
        }
      })

      // Colonna 3: Database & Persistenza (X = xSvc + colWidth + colGap)
      const xDb = xSvc + colWidth + colGap
      let yDb = 40
      solution.databases.forEach(db => {
        const id = `db-${db.projectName}_${db.name}`
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
        const id = `batch-${b.projectName}_${b.workerName}`
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
            wp.projectReferences.some(pr =>
              pr.toLowerCase() === svc.projectName.toLowerCase() ||
              svc.projectName.toLowerCase().includes(pr.toLowerCase()) ||
              pr.toLowerCase().includes(svc.projectName.toLowerCase())
            ) ||
            wp.name.toLowerCase() === svc.projectName.toLowerCase() ||
            svc.projectName.toLowerCase().includes('service')
          ) {
            eList.push({
              fromId: `web-${wp.name}`,
              toId: `svc-${svc.projectName}_${svc.serviceName}`,
              label: 'Invoca Servizio',
              style: 'dependency',
            })
          }
        })
      })

      // Servizi -> Database
      solution.services.forEach(svc => {
        const svcProject = solution.projects.find(p => p.name.toLowerCase() === svc.projectName.toLowerCase())
        solution.databases.forEach(db => {
          const isRelated =
            svc.projectName.toLowerCase() === db.projectName.toLowerCase() ||
            (svcProject?.projectReferences.some(pr => {
              const prL = pr.toLowerCase()
              const dbProjL = db.projectName.toLowerCase()
              return prL === dbProjL || prL.includes(dbProjL) || dbProjL.includes(prL)
            }) ?? false) ||
            (svcProject?.projectReferences.some(pr => pr.toLowerCase().includes('data')) && db.projectName.toLowerCase().includes('data'))

          if (isRelated) {
            eList.push({
              fromId: `svc-${svc.projectName}_${svc.serviceName}`,
              toId: `db-${db.projectName}_${db.name}`,
              label: 'Persistenza / Query',
              style: 'data',
            })
          }
        })
      })

      // Batch -> Database
      solution.batchWorkers.forEach(b => {
        const batchProject = solution.projects.find(p => p.name.toLowerCase() === b.projectName.toLowerCase())
        solution.databases.forEach(db => {
          const isRelated =
            b.projectName.toLowerCase() === db.projectName.toLowerCase() ||
            (batchProject?.projectReferences.some(pr => {
              const prL = pr.toLowerCase()
              const dbProjL = db.projectName.toLowerCase()
              return prL === dbProjL || prL.includes(dbProjL) || dbProjL.includes(prL)
            }) ?? false) ||
            (batchProject?.projectReferences.some(pr => pr.toLowerCase().includes('data')) && db.projectName.toLowerCase().includes('data'))

          if (isRelated) {
            eList.push({
              fromId: `batch-${b.projectName}_${b.workerName}`,
              toId: `db-${db.projectName}_${db.name}`,
              label: 'Accesso Dati',
              style: 'data',
            })
          }
        })
      })
    }
    // 2. MODALITÀ GRAFO BACKEND CLI (Se è aperta una sessione assembly singola)
    else if (backendGraph && backendGraph.nodes.length > 0) {
      const colWidth = 260
      const colHeight = 110
      const colsCount = 4
      const spacingX = 330
      const spacingY = 160

      const typeNodes = backendGraph.nodes.filter(n => n.kind !== 'Assembly' && n.kind !== 'Namespace')

      typeNodes.forEach((node, idx) => {
        const col = idx % colsCount
        const row = Math.floor(idx / colsCount)
        const posX = 40 + col * spacingX
        const posY = 40 + row * spacingY

        const kindCategory = (
          node.kind === 'Interface' ? 'Interface' :
          node.kind === 'Struct' ? 'Struct' :
          node.kind === 'Enum' ? 'Enum' :
          node.kind === 'Record' ? 'Record' : 'Class'
        ) as DiagramNode['category']

        nList.push({
          id: node.id,
          title: node.label,
          category: kindCategory,
          technology: `[${node.kind.toUpperCase()}] ${node.metadata['Accessibility'] ?? ''}`.trim(),
          subtitle: node.namespace || '<Global>',
          items: node.metadata['IsExternal'] === 'true' ? ['[ESTERNO] Tipo Framework/SDK'] : [],
          typeFullName: node.id.replace('type:', ''),
          x: posX,
          y: posY,
          width: colWidth,
          height: colHeight,
        })
      })

      backendGraph.edges.forEach(edge => {
        if (edge.relation === 'Declares') return

        const style = (
          edge.relation === 'Inherits' ? 'inheritance' :
          edge.relation === 'Implements' ? 'implements' :
          'dependency'
        ) as DiagramEdge['style']

        eList.push({
          fromId: edge.source,
          toId: edge.target,
          label: edge.label,
          style,
        })
      })
    }
    // 3. MODALITÀ GRAFO PROGETTI & DIPENDENZE SOLUTION (Se c'è una solution ma non ancora un singolo assembly)
    else if (solution) {
      const colWidth = 290
      const colsCount = 3
      const spacingX = 360
      const spacingY = 220

      const projects = solution.projects || []
      const services = solution.services || []
      const databases = solution.databases || []
      const batchWorkers = solution.batchWorkers || []

      projects.forEach((prj, idx) => {
        const col = idx % colsCount
        const row = Math.floor(idx / colsCount)
        const posX = 40 + col * spacingX
        const posY = 40 + row * spacingY

        const prjName = (prj.name || '').toLowerCase()

        const relatedServices = services.filter(s => s.projectName && s.projectName.toLowerCase() === prjName)
        const relatedDbs = databases.filter(d => d.projectName && d.projectName.toLowerCase() === prjName)
        const relatedBatch = batchWorkers.filter(b => b.projectName && b.projectName.toLowerCase() === prjName)

        const pRefs = prj.projectReferences || []
        const items: string[] = [
          ...relatedServices.slice(0, 2).map(s => `[SVC] ${s.serviceName || 'Service'}`),
          ...relatedDbs.slice(0, 2).map(d => `[DB] ${d.name || 'Database'}`),
          ...relatedBatch.slice(0, 2).map(b => `[BAT] ${b.workerName || 'Worker'}`),
          ...pRefs.slice(0, 2).map(r => `-> ${r}`),
        ]

        // Supporta sia stringhe che interi numerici da enum C#
        const rawCat = prj.category as unknown
        const cat: DiagramNode['category'] =
          rawCat === 'Web' || rawCat === 3 ? 'Web' :
          rawCat === 'Service' || rawCat === 0 ? 'Service' :
          rawCat === 'Database' || rawCat === 1 ? 'Database' :
          rawCat === 'Batch' || rawCat === 2 ? 'Batch' : 'Class'

        const techLabel = (prj.detectedTechnologies && prj.detectedTechnologies.length > 0)
          ? String(prj.detectedTechnologies[0])
          : (cat === 'Web' ? 'ASP.NET Web / MVC' :
             cat === 'Service' ? 'WCF / Service' :
             cat === 'Database' ? 'Database / DAL' :
             cat === 'Batch' ? 'Batch Worker' : 'Libreria / Modulo')

        nList.push({
          id: `prj-${prj.name}`,
          title: prj.name,
          category: cat,
          technology: techLabel,
          subtitle: prj.relativePath || '',
          items,
          assemblyPath: prj.outputAssemblyPath,
          x: posX,
          y: posY,
          width: colWidth,
          height: 120 + Math.min(items.length * 16, 80),
        })

        // Connessioni basate su ProjectReference reali
        pRefs.forEach(refName => {
          if (!refName) return
          const refL = refName.toLowerCase()
          const targetPrj = projects.find(p => p.name && p.name.toLowerCase() === refL)
          if (targetPrj) {
            eList.push({
              fromId: `prj-${prj.name}`,
              toId: `prj-${targetPrj.name}`,
              label: 'dipende da',
              style: 'dependency',
            })
          }
        })
      })

      // Genera nodi per le Interfacce Contratto della Solution
      services.forEach((svc, sIdx) => {
        if (svc.contractInterface) {
          const ifaceId = `iface-${svc.projectName}_${svc.contractInterface}`
          if (!nList.some(n => n.id === ifaceId)) {
            const ifaceOps = svc.endpoints.slice(0, 3).map(e => `[CONTRACT] ${e.name}()`)
            nList.push({
              id: ifaceId,
              title: svc.contractInterface,
              category: 'Interface',
              technology: 'WCF / Service Contract',
              subtitle: `Contratto per ${svc.serviceName}`,
              items: ifaceOps,
              assemblyPath: svc.assemblyPath,
              x: 40 + (sIdx % colsCount) * spacingX,
              y: 40 + (Math.floor(projects.length / colsCount) + 1 + Math.floor(sIdx / colsCount)) * spacingY,
              width: colWidth,
              height: 110 + Math.min(ifaceOps.length * 16, 50),
            })

            eList.push({
              fromId: `prj-${svc.projectName}`,
              toId: ifaceId,
              label: 'espone contratto',
              style: 'implements',
            })
          }
        }
      })
    }
    // 4. MODALITÀ ASSEMBLY LOCALE (Class Diagram)
    else if (assembly) {
      const typeList = assembly.types.slice(0, 35)
      let currX = 40
      let currY = 40
      const colWidth = 260
      const colHeight = 120

      typeList.forEach((t, idx) => {
        const id = `type:${t.fullName}`
        const memberItems = t.members.slice(0, 3).map(m => `+ ${m.name}(): ${m.returnTypeOrType}`)
        const cat = (t.kind === 'Interface' ? 'Interface' : t.kind === 'Struct' ? 'Struct' : t.kind === 'Enum' ? 'Enum' : 'Class') as DiagramNode['category']

        nList.push({
          id,
          title: t.name,
          category: cat,
          technology: `${t.kind} [${t.accessibility}]`,
          subtitle: t.namespace || '<Global>',
          items: memberItems,
          typeFullName: t.fullName,
          x: currX,
          y: currY,
          width: colWidth,
          height: colHeight + Math.min(memberItems.length * 15, 50),
        })

        // Ereditarietà
        if (t.baseTypeFullName && t.baseTypeFullName !== 'System.Object') {
          const parentMatch = assembly.types.find(p => p.fullName === t.baseTypeFullName || p.name === t.baseTypeFullName)
          if (parentMatch) {
            eList.push({
              fromId: id,
              toId: `type:${parentMatch.fullName}`,
              label: 'inherits',
              style: 'inheritance',
            })
          }
        }

        // Interfacce
        t.implementedInterfaces.forEach(iface => {
          const ifaceMatch = assembly.types.find(p => p.fullName === iface || p.name === iface)
          if (ifaceMatch) {
            eList.push({
              fromId: id,
              toId: `type:${ifaceMatch.fullName}`,
              label: 'implements',
              style: 'implements',
            })
          }
        })

        currX += colWidth + 60
        if ((idx + 1) % 4 === 0) {
          currX = 40
          currY += 200
        }
      })
    }

    return { nodes: nList, edges: eList }
  }, [solution, assembly, diagramView, backendGraph])

  // ID effettivo del nodo selezionato (derivato da selezione utente o prop selectedTypeFullName)
  const effectiveSelectedNodeId = useMemo(() => {
    if (selectedNodeId) return selectedNodeId
    if (selectedTypeFullName && nodes.length > 0) {
      const match = nodes.find(n => n.typeFullName === selectedTypeFullName || n.title === selectedTypeFullName)
      if (match) return match.id
    }
    return null
  }, [selectedNodeId, selectedTypeFullName, nodes])

  // Conteggi reali dinamici per i layer del filtro
  const layerCounts = useMemo(() => {
    return {
      all: nodes.length,
      services: nodes.filter(n => n.category === 'Service').length,
      databases: nodes.filter(n => n.category === 'Database').length,
      batch: nodes.filter(n => n.category === 'Batch').length,
      classes: nodes.filter(n => n.category === 'Class' || n.category === 'Service').length,
      interfaces: nodes.filter(n => n.category === 'Interface').length,
    }
  }, [nodes])

  // Filtraggio per categoria e query di ricerca
  const filteredNodes = useMemo(() => {
    return nodes.filter(n => {
      if (filter === 'services' && n.category !== 'Service') return false
      if (filter === 'databases' && n.category !== 'Database') return false
      if (filter === 'batch' && n.category !== 'Batch') return false
      if (filter === 'classes') {
        if (n.category === 'Interface') return false
        if (n.category !== 'Class' && n.category !== 'Service' && n.category !== 'Record') return false
      }
      if (filter === 'interfaces') {
        if (n.category !== 'Interface') return false
      }

      return true
    })
  }, [nodes, filter])

  // Nodi che corrispondono alla ricerca
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase().trim()
    return filteredNodes.filter(n =>
      n.title.toLowerCase().includes(q) ||
      (n.subtitle && n.subtitle.toLowerCase().includes(q))
    )
  }, [filteredNodes, searchQuery])

  const selectedNode = useMemo(
    () => nodes.find(n => n.id === effectiveSelectedNodeId) ?? null,
    [nodes, effectiveSelectedNodeId]
  )

  const narration = useMemo(() => {
    return narrateArchitectureConnections(
      nodes,
      edges,
      selectedNode,
      selectedEdge,
      solution
    )
  }, [nodes, edges, selectedNode, selectedEdge, solution])

  // Calcolo dinamico dell'area canvas in base alla posizione reale di TUTTI i nodi
  const canvasBounds = useMemo(() => {
    if (nodes.length === 0) {
      return { width: 2200, height: 1600 }
    }
    const maxX = Math.max(...nodes.map(n => n.x + n.width))
    const maxY = Math.max(...nodes.map(n => n.y + n.height))
    return {
      width: Math.max(maxX + 400, 2200),
      height: Math.max(maxY + 400, 1600),
    }
  }, [nodes])

  const handleSelectFirstMatch = () => {
    if (searchMatches.length > 0) {
      setSelectedNodeId(searchMatches[0].id)
    }
  }

  const getCategoryColor = (cat: DiagramNode['category']) => {
    switch (cat) {
      case 'Service':
        return {
          border: '#003399',
          bg: '#f4f8fe',
          header: '#002277',
          headerGradient: 'linear-gradient(90deg, #001f5c 0%, #003399 100%)',
          text: '#ffffff',
          pillBg: 'rgba(255, 255, 255, 0.2)',
          accent: '#003399',
        }
      case 'Database':
        return {
          border: '#006633',
          bg: '#f2fbf6',
          header: '#00552b',
          headerGradient: 'linear-gradient(90deg, #004d26 0%, #007a3d 100%)',
          text: '#ffffff',
          pillBg: 'rgba(255, 255, 255, 0.2)',
          accent: '#006633',
        }
      case 'Batch':
        return {
          border: '#994400',
          bg: '#fff8f0',
          header: '#883800',
          headerGradient: 'linear-gradient(90deg, #7c2d12 0%, #b45309 100%)',
          text: '#ffffff',
          pillBg: 'rgba(255, 255, 255, 0.2)',
          accent: '#994400',
        }
      case 'Web':
        return {
          border: '#550055',
          bg: '#fbf2fb',
          header: '#4a004a',
          headerGradient: 'linear-gradient(90deg, #581c87 0%, #7e22ce 100%)',
          text: '#ffffff',
          pillBg: 'rgba(255, 255, 255, 0.2)',
          accent: '#550055',
        }
      case 'Interface':
        return {
          border: '#660066',
          bg: '#fdf4ff',
          header: '#550055',
          headerGradient: 'linear-gradient(90deg, #701a75 0%, #a21caf 100%)',
          text: '#ffffff',
          pillBg: 'rgba(255, 255, 255, 0.2)',
          accent: '#660066',
        }
      case 'Struct':
        return {
          border: '#005533',
          bg: '#f0faf4',
          header: '#004429',
          headerGradient: 'linear-gradient(90deg, #064e3b 0%, #059669 100%)',
          text: '#ffffff',
          pillBg: 'rgba(255, 255, 255, 0.2)',
          accent: '#005533',
        }
      case 'Enum':
        return {
          border: '#774400',
          bg: '#fff8ee',
          header: '#663900',
          headerGradient: 'linear-gradient(90deg, #78350f 0%, #d97706 100%)',
          text: '#ffffff',
          pillBg: 'rgba(255, 255, 255, 0.2)',
          accent: '#774400',
        }
      case 'Record':
        return {
          border: '#004466',
          bg: '#f0f8ff',
          header: '#003652',
          headerGradient: 'linear-gradient(90deg, #0c4a6e 0%, #0284c7 100%)',
          text: '#ffffff',
          pillBg: 'rgba(255, 255, 255, 0.2)',
          accent: '#004466',
        }
      case 'Class':
      default:
        return {
          border: '#334155',
          bg: '#f8fafc',
          header: '#1e293b',
          headerGradient: 'linear-gradient(90deg, #1e293b 0%, #475569 100%)',
          text: '#ffffff',
          pillBg: 'rgba(255, 255, 255, 0.2)',
          accent: '#334155',
        }
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
      {/* Barra degli Strumenti Tecnico / Disegno CAD Ribbon */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#ebe9ed',
          borderBottom: '2px solid #a0a0a0',
          padding: '6px 10px',
          fontSize: '11px',
          flexWrap: 'wrap',
          gap: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 'bold', color: '#000080', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span>📐</span> [DISEGNO TECNICO ARCHITETTURALE]
          </span>

          {solution && (
            <button
              onClick={() => setDiagramView(v => v === 'system' ? 'graph' : 'system')}
              style={{
                fontWeight: 'bold',
                cursor: 'pointer',
                padding: '3px 8px',
                fontSize: '11px',
                backgroundColor: diagramView === 'graph' ? '#000080' : '#ffffff',
                color: diagramView === 'graph' ? '#ffffff' : '#000000',
                border: '1px solid #7f9db9',
                borderRadius: '2px',
              }}
            >
              {diagramView === 'system' ? 'Mostra Grafo Dipendenze CLI >>' : '<< Torna a Mappa Sistema'}
            </button>
          )}

          <span style={{ color: '#aaa' }}>|</span>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <label style={{ fontWeight: '600' }}>Filtro Layer:</label>
            <select
              value={filter}
              onChange={e => setFilter(e.target.value as LayerFilter)}
              style={{ fontSize: '11px', padding: '2px 4px', border: '1px solid #7f9db9', borderRadius: '2px', backgroundColor: '#fff' }}
            >
              <option value="all">Tutti i Componenti ({layerCounts.all})</option>
              {diagramView === 'system' && (
                <>
                  <option value="services">Microservizi &amp; WCF ({layerCounts.services})</option>
                  <option value="databases">Database &amp; Tabelle EF ({layerCounts.databases})</option>
                  <option value="batch">Processi Batch &amp; Worker ({layerCounts.batch})</option>
                </>
              )}
              <option value="classes">Solo Classi Concrete ({layerCounts.classes})</option>
              <option value="interfaces">Solo Interfacce Contratto ({layerCounts.interfaces})</option>
            </select>
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <label style={{ fontWeight: '600' }}>Connessioni:</label>
            <select
              value={edgeMode}
              onChange={e => setEdgeMode(e.target.value as EdgeMode)}
              style={{ fontSize: '11px', fontWeight: 'bold', padding: '2px 4px', border: '1px solid #7f9db9', borderRadius: '2px', backgroundColor: '#fff' }}
            >
              <option value="focus">[Focus] Nodo Selezionato</option>
              <option value="all">[Tutte] Mostra Connessioni</option>
              <option value="none">[Nessuna] Solo Blocchi CAD</option>
            </select>
          </div>

          {diagramView === 'graph' && sessionId && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showExternal}
                onChange={e => setShowExternal(e.target.checked)}
              />
              Includi Tipi Esterni
            </label>
          )}

          <span style={{ color: '#aaa' }}>|</span>

          {/* Pulsante Evidenziato per L'Archeologo Spiega */}
          <button
            type="button"
            onClick={() => {
              setShowArchaeologistPanel(p => !p)
              setActiveSideTab('archaeologist')
            }}
            style={{
              fontWeight: 'bold',
              cursor: 'pointer',
              padding: '3px 10px',
              fontSize: '11px',
              backgroundColor: showArchaeologistPanel ? '#003399' : '#ffffff',
              color: showArchaeologistPanel ? '#ffffff' : '#002266',
              border: showArchaeologistPanel ? '1px solid #001144' : '1px solid #7f9db9',
              boxShadow: showArchaeologistPanel
                ? 'inset 0 1px 3px rgba(0,0,0,0.4), 0 0 6px rgba(0,51,153,0.4)'
                : '0 1px 2px rgba(0,0,0,0.1)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              borderRadius: '2px',
            }}
            title="Attiva o disattiva il pannello di narrazione in linguaggio naturale delle connessioni"
          >
            <span style={{ fontSize: '13px' }}>🎙️</span>
            <span>L'Archeologo Spiega Connessioni</span>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: showArchaeologistPanel ? '#4ade80' : '#94a3b8',
                display: 'inline-block',
                boxShadow: showArchaeologistPanel ? '0 0 5px #4ade80' : 'none',
              }}
            />
          </button>
        </div>

        {/* Ricerca e Zoom */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ fontSize: '10px', fontWeight: 'bold' }}>Trova:</span>
            <input
              type="text"
              placeholder="Nome tipo..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSelectFirstMatch()}
              style={{ fontSize: '11px', width: '120px', padding: '2px 5px', border: '1px solid #7f9db9', borderRadius: '2px', backgroundColor: '#fff' }}
            />
            {searchQuery && (
              <span style={{ fontSize: '10px', color: searchMatches.length > 0 ? '#006600' : '#880000', fontWeight: 'bold' }}>
                ({searchMatches.length})
              </span>
            )}
          </div>

          <button
            onClick={() => setZoom(z => Math.max(0.4, Number((z - 0.15).toFixed(2))))}
            style={{ padding: '2px 6px', fontSize: '11px', cursor: 'pointer', border: '1px solid #7f9db9', borderRadius: '2px', backgroundColor: '#fff' }}
          >
            [-] Zoom
          </button>
          <span style={{ fontFamily: 'monospace', minWidth: '40px', textAlign: 'center', fontWeight: 'bold' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(z => Math.min(2.5, Number((z + 0.15).toFixed(2))))}
            style={{ padding: '2px 6px', fontSize: '11px', cursor: 'pointer', border: '1px solid #7f9db9', borderRadius: '2px', backgroundColor: '#fff' }}
          >
            [+] Zoom
          </button>
          <button
            onClick={() => setZoom(1)}
            style={{ padding: '2px 6px', fontSize: '11px', cursor: 'pointer', border: '1px solid #7f9db9', borderRadius: '2px', backgroundColor: '#fff' }}
          >
            1:1 Reset
          </button>
          {onClose && (
            <button
              onClick={onClose}
              style={{ padding: '2px 8px', fontSize: '11px', cursor: 'pointer', marginLeft: '4px', border: '1px solid #7f9db9', borderRadius: '2px', backgroundColor: '#fff' }}
            >
              Chiudi
            </button>
          )}
        </div>
      </div>

      {graphLoading && (
        <div style={{ backgroundColor: '#ffffe0', border: '1px solid #999', padding: '2px 8px', fontSize: '11px', marginBottom: '2px' }}>
          Calcolo relazioni grafo architetturale in corso...
        </div>
      )}

      {/* Area del Canvas a foglio millimetrato tecnico */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
        <div
          ref={canvasScrollRef}
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
              width: `${canvasBounds.width}px`,
              height: `${canvasBounds.height}px`,
              minWidth: `${canvasBounds.width}px`,
              minHeight: `${canvasBounds.height}px`,
              position: 'relative',
              padding: '20px',
              boxSizing: 'border-box',
            }}
          >
            {/* SVG per le linee di collegamento tecniche a tutta estensione */}
            {edgeMode !== 'none' && (
              <svg
                width={canvasBounds.width}
                height={canvasBounds.height}
                viewBox={`0 0 ${canvasBounds.width} ${canvasBounds.height}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: `${canvasBounds.width}px`,
                  height: `${canvasBounds.height}px`,
                  pointerEvents: 'none',
                  overflow: 'visible',
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
                    <polygon points="0,0 10,5 0,10" fill="#fff" stroke="#000080" strokeWidth="1.5" />
                  </marker>
                  <marker
                    id="arrow-implements"
                    viewBox="0 0 10 10"
                    refX="10"
                    refY="5"
                    markerWidth="7"
                    markerHeight="7"
                    orient="auto-start-reverse"
                  >
                    <polygon points="0,0 10,5 0,10" fill="#fff" stroke="#880088" strokeWidth="1.5" />
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
                    x1 = sourceNode.x + sourceNode.width
                    y1 = sourceNode.y + sourceNode.height / 2
                    x2 = targetNode.x
                    y2 = targetNode.y + targetNode.height / 2
                  } else {
                    x1 = sourceNode.x
                    y1 = sourceNode.y + sourceNode.height / 2
                    x2 = targetNode.x + targetNode.width
                    y2 = targetNode.y + targetNode.height / 2
                  }

                  const dx = (x2 - x1) * 0.5
                  const pathData = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`

                  const isEdgeSelected = selectedEdge !== null && selectedEdge.fromId === e.fromId && selectedEdge.toId === e.toId
                  const isInherit = e.style === 'inheritance'
                  const isImplements = e.style === 'implements'
                  const isConnectedToSelected = effectiveSelectedNodeId === e.fromId || effectiveSelectedNodeId === e.toId
                  const isHighlight = isConnectedToSelected || isEdgeSelected

                  // In modalità Focus mostra gli archi solo quando un nodo o l'arco è selezionato
                  if (edgeMode === 'focus') {
                    if (!isEdgeSelected && (!effectiveSelectedNodeId || !isConnectedToSelected)) {
                      return null
                    }
                  }

                  const opacity = isEdgeSelected
                    ? 1
                    : (isHighlight
                      ? 1
                      : (effectiveSelectedNodeId || selectedEdge ? 0.05 : (edgeMode === 'all' ? 0.7 : 0.22)))
                  const strokeWidth = isEdgeSelected ? 3.5 : (isHighlight ? 2.5 : 1.2)
                  const strokeColor = isEdgeSelected
                    ? '#ff8800'
                    : (isHighlight
                      ? '#0000ff'
                      : (isInherit ? '#000080' : isImplements ? '#880088' : e.style === 'data' ? '#006633' : '#336699'))
                  const markerId = isEdgeSelected || isHighlight
                    ? 'url(#arrow-highlight)'
                    : (isInherit ? 'url(#arrow-inherit)' : isImplements ? 'url(#arrow-implements)' : 'url(#arrow-tech)')

                  const showLabel = isEdgeSelected || isHighlight || (edgeMode === 'all' && edges.length <= 6)

                  return (
                    <g key={`edge-${idx}`} style={{ opacity }}>
                      {/* Area invisibile spessa per facilitare il click sulla linea */}
                      <path
                        d={pathData}
                        fill="none"
                        stroke="transparent"
                        strokeWidth="14"
                        style={{ cursor: 'pointer' }}
                        onClick={ev => {
                          ev.stopPropagation()
                          setSelectedEdge(e)
                          setSelectedNodeId(null)
                          setShowArchaeologistPanel(true)
                          setActiveSideTab('archaeologist')
                        }}
                      />
                      <path
                        d={pathData}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        strokeDasharray={isImplements ? '4 3' : 'none'}
                        markerEnd={markerId}
                        style={{ cursor: 'pointer' }}
                        onClick={ev => {
                          ev.stopPropagation()
                          setSelectedEdge(e)
                          setSelectedNodeId(null)
                          setShowArchaeologistPanel(true)
                          setActiveSideTab('archaeologist')
                        }}
                      />
                      {e.label && showLabel && (
                        <g
                          style={{ cursor: 'pointer' }}
                          onClick={ev => {
                            ev.stopPropagation()
                            setSelectedEdge(e)
                            setSelectedNodeId(null)
                            setShowArchaeologistPanel(true)
                            setActiveSideTab('archaeologist')
                          }}
                        >
                          <rect
                            x={(x1 + x2) / 2 - 50}
                            y={(y1 + y2) / 2 - 10}
                            width="100"
                            height="16"
                            rx="3"
                            fill="#ffffff"
                            stroke={strokeColor}
                            strokeWidth={isEdgeSelected ? '2' : '1'}
                            opacity="0.95"
                          />
                          <text
                            x={(x1 + x2) / 2}
                            y={(y1 + y2) / 2}
                            fill={isEdgeSelected ? '#cc5500' : '#000066'}
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
              const isSelected = effectiveSelectedNodeId === node.id
              const isMatched = searchQuery.trim() !== '' && (
                node.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
                (node.subtitle && node.subtitle.toLowerCase().includes(searchQuery.toLowerCase().trim()))
              )
              const colors = getCategoryColor(node.category)

              return (
                <div
                  key={node.id}
                  onClick={() => {
                    setSelectedNodeId(node.id)
                    setSelectedEdge(null)
                    setShowArchaeologistPanel(true)
                    setActiveSideTab('archaeologist')
                  }}
                  style={{
                    position: 'absolute',
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: `${node.width}px`,
                    minHeight: `${node.height}px`,
                    backgroundColor: colors.bg,
                    border: isSelected
                      ? '2px solid #ef4444'
                      : isMatched
                      ? '2px solid #f59e0b'
                      : `2px solid ${colors.border}`,
                    borderRadius: '3px',
                    boxShadow: isSelected
                      ? '0 0 0 3px rgba(239,68,68,0.3), 0 4px 6px -1px rgba(0,0,0,0.1)'
                      : isMatched
                      ? '0 0 0 3px rgba(245,158,11,0.3), 0 4px 6px -1px rgba(0,0,0,0.1)'
                      : '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
                    cursor: 'pointer',
                    fontSize: '11px',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
                  }}
                >
                  {/* Intestazione blocco tecnico */}
                  <div
                    style={{
                      background: colors.headerGradient,
                      color: colors.text,
                      padding: '4px 8px',
                      fontWeight: 'bold',
                      fontSize: '11px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '6px',
                      overflow: 'hidden',
                      boxSizing: 'border-box',
                      borderBottom: `1px solid ${colors.border}`,
                    }}
                  >
                    <span style={{ flexShrink: 0, letterSpacing: '0.5px', lineHeight: '14px', fontSize: '10px' }}>
                      [{node.category.toUpperCase()}]
                    </span>
                    <span
                      style={{
                        fontSize: '9.5px',
                        lineHeight: '13px',
                        backgroundColor: colors.pillBg,
                        border: '1px solid rgba(255,255,255,0.3)',
                        borderRadius: '2px',
                        padding: '1px 5px',
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
                  <div style={{ padding: '7px 8px' }}>
                    <div
                      style={{
                        fontWeight: 'bold',
                        fontSize: '12px',
                        color: '#0f172a',
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
                          color: '#64748b',
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
                      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '5px', marginTop: '4px' }}>
                        {node.items.map((item, idx) => renderTechnicalItem(item, idx))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Minimappa CAD Windows 98 Flottante */}
        {showMinimap && nodes.length > 0 && (
          <div
            style={{
              position: 'absolute',
              right: (showArchaeologistPanel || selectedNode || selectedEdge) ? '396px' : '16px',
              bottom: '12px',
              width: '150px',
              backgroundColor: '#dfdfdf',
              border: '2px groove #fff',
              boxShadow: '2px 2px 4px rgba(0,0,0,0.3)',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                backgroundColor: '#000080',
                color: '#fff',
                padding: '2px 4px',
                fontSize: '9px',
                fontWeight: 'bold',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>Minimappa CAD</span>
              <button
                onClick={() => setShowMinimap(false)}
                style={{ padding: '0 2px', fontSize: '8px', cursor: 'pointer', height: '12px', lineHeight: '10px' }}
              >
                x
              </button>
            </div>
            <div style={{ padding: '4px', backgroundColor: '#e6eaee', position: 'relative', height: '90px' }}>
              <svg width="100%" height="100%" viewBox={`0 0 ${canvasBounds.width} ${canvasBounds.height}`}>
                {filteredNodes.map(n => {
                  const isSel = n.id === effectiveSelectedNodeId
                  return (
                    <rect
                      key={`mini-${n.id}`}
                      x={n.x}
                      y={n.y}
                      width={n.width}
                      height={n.height}
                      fill={isSel ? '#ff0000' : '#4466aa'}
                      stroke={isSel ? '#ffffff' : '#223366'}
                      strokeWidth={isSel ? 30 : 10}
                    />
                  )
                })}
              </svg>
            </div>
          </div>
        )}

        {/* Riquadro Dettaglio Tecnico & Spiegazione delle Connessioni */}
        {(showArchaeologistPanel || selectedNode || selectedEdge) && (
          <div
            style={{
              width: '380px',
              minWidth: '340px',
              maxWidth: '440px',
              backgroundColor: '#f1f5f9',
              borderLeft: '2px solid #cbd5e1',
              display: 'flex',
              flexDirection: 'column',
              padding: '8px',
              boxSizing: 'border-box',
              overflowY: 'auto',
              fontSize: '11px',
              zIndex: 5,
              boxShadow: '-2px 0 6px rgba(0,0,0,0.06)',
            }}
          >
            {/* Titlebar Stile Windows Classica / Enterprise con pulsante X isolato */}
            <div
              style={{
                background: 'linear-gradient(90deg, #0a246a 0%, #1084d0 100%)',
                color: '#ffffff',
                padding: '5px 8px',
                fontWeight: 'bold',
                marginBottom: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderRadius: '3px',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 1px 2px rgba(0,0,0,0.15)',
                minHeight: '26px',
                boxSizing: 'border-box',
                gap: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  minWidth: 0,
                  flex: 1,
                  overflow: 'hidden',
                }}
              >
                <span style={{ fontSize: '12px', flexShrink: 0 }}>🎙️</span>
                <span
                  style={{
                    fontSize: '11px',
                    letterSpacing: '0.3px',
                    textShadow: '0 1px 1px rgba(0,0,0,0.3)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title="L'Archeologo Spiega &amp; Risponde"
                >
                  L'Archeologo Spiega &amp; Risponde
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedNodeId(null)
                  setSelectedEdge(null)
                  setShowArchaeologistPanel(false)
                }}
                style={{
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  flexShrink: 0,
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: '1px solid #991b1b',
                  borderRadius: '2px',
                  lineHeight: '12px',
                  height: '20px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Chiudi pannello laterale"
              >
                ✕
              </button>
            </div>

            {/* Sottotitolo e Riferimento Componente CAD separato (anti-sovrapposizione) */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '3px',
                padding: '3px 8px',
                fontSize: '9.5px',
                marginBottom: '6px',
                boxSizing: 'border-box',
              }}
            >
              <span style={{ fontWeight: '600', color: '#002277' }}>
                Dettaglio Componente CAD
              </span>
              <span
                style={{
                  fontSize: '8.5px',
                  backgroundColor: '#e2e8f0',
                  color: '#475569',
                  padding: '1px 5px',
                  borderRadius: '2px',
                  fontWeight: 'bold',
                }}
              >
                INSPECTOR
              </span>
            </div>

            {/* Schede / Tab di Selezione */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
              <button
                type="button"
                onClick={() => setActiveSideTab('archaeologist')}
                style={{
                  flex: 1,
                  fontWeight: activeSideTab === 'archaeologist' ? 'bold' : 'normal',
                  backgroundColor: activeSideTab === 'archaeologist' ? '#ffffff' : '#e2e8f0',
                  color: activeSideTab === 'archaeologist' ? '#002277' : '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: '3px',
                  padding: '4px 6px',
                  cursor: 'pointer',
                  fontSize: '10.5px',
                  boxShadow: activeSideTab === 'archaeologist' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                🎙️ Spiegazione Parlata
              </button>
              {selectedNode && (
                <button
                  type="button"
                  onClick={() => setActiveSideTab('specs')}
                  style={{
                    flex: 1,
                    fontWeight: activeSideTab === 'specs' ? 'bold' : 'normal',
                    backgroundColor: activeSideTab === 'specs' ? '#ffffff' : '#e2e8f0',
                    color: activeSideTab === 'specs' ? '#002277' : '#334155',
                    border: '1px solid #cbd5e1',
                    borderRadius: '3px',
                    padding: '4px 6px',
                    cursor: 'pointer',
                    fontSize: '10.5px',
                    boxShadow: activeSideTab === 'specs' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  📐 Specifiche CAD
                </button>
              )}
            </div>

            {/* TAB: L'ARCHEOLOGO SPIEGA LE CONNESSIONI (Linguaggio Naturale) */}
            {activeSideTab === 'archaeologist' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                {/* Badge di contesto e bersaglio attivo */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '3px',
                    padding: '6px 8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <div style={{ overflow: 'hidden', minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 'bold',
                        fontSize: '11px',
                        color: '#0f172a',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={narration.headline}
                    >
                      {narration.headline}
                    </div>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '9px',
                        backgroundColor: '#002277',
                        color: '#ffffff',
                        padding: '1px 5px',
                        borderRadius: '2px',
                        fontWeight: 'bold',
                        marginTop: '3px',
                        letterSpacing: '0.4px',
                      }}
                    >
                      {narration.badge}
                    </span>
                  </div>
                  {(selectedNode || selectedEdge) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedNodeId(null)
                        setSelectedEdge(null)
                      }}
                      style={{
                        fontSize: '10px',
                        fontWeight: '600',
                        padding: '3px 8px',
                        cursor: 'pointer',
                        flexShrink: 0,
                        backgroundColor: '#f8fafc',
                        border: '1px solid #94a3b8',
                        borderRadius: '3px',
                      }}
                    >
                      [Mappa Globale]
                    </button>
                  )}
                </div>

                {/* Striscia Metriche Architetturali */}
                {narration.metrics && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '4px',
                      padding: '5px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '3px',
                      fontSize: '9.5px',
                    }}
                  >
                    <div style={{ textAlign: 'center', padding: '2px' }}>
                      <strong style={{ color: '#002277' }}>{narration.metrics.nodeCount}</strong> Nodi
                    </div>
                    <div style={{ textAlign: 'center', padding: '2px' }}>
                      <strong style={{ color: '#002277' }}>{narration.metrics.edgeCount}</strong> Connessioni
                    </div>
                    <div style={{ textAlign: 'center', padding: '2px' }}>
                      <strong style={{ color: '#006633' }}>{narration.metrics.servicesCount}</strong> Servizi
                    </div>
                    <div style={{ textAlign: 'center', padding: '2px' }}>
                      <strong style={{ color: '#006633' }}>{narration.metrics.databaseCount}</strong> Database
                    </div>
                    <div style={{ textAlign: 'center', padding: '2px' }}>
                      <strong style={{ color: '#994400' }}>{narration.metrics.batchCount}</strong> Worker
                    </div>
                    <div style={{ textAlign: 'center', padding: '2px' }}>
                      Max Conn: <strong style={{ color: '#dc2626' }}>{narration.metrics.maxHubDegree}</strong>
                    </div>
                  </div>
                )}

                {/* Box Discorsivo Parlante Audio-Guida */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderLeft: '4px solid #003399',
                    borderRadius: '3px',
                    padding: '10px',
                    fontSize: '11px',
                    lineHeight: '1.6',
                    color: '#1e293b',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 'bold',
                      color: '#002277',
                      marginBottom: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid #f1f5f9',
                      paddingBottom: '4px',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span>💬</span>
                      <em>L'Archeologo racconta:</em>
                    </span>
                    <span
                      style={{
                        fontSize: '8px',
                        fontWeight: 'bold',
                        backgroundColor: '#e0f2fe',
                        color: '#0369a1',
                        padding: '1px 5px',
                        borderRadius: '10px',
                        letterSpacing: '0.5px',
                      }}
                    >
                      AUDIO-GUIDA
                    </span>
                  </div>
                  <div style={{ whiteSpace: 'pre-line' }}>{narration.walkthrough}</div>
                </div>

                {/* Connessioni in Ingresso (Inflow) */}
                {narration.inflow.length > 0 && (
                  <fieldset
                    style={{
                      margin: 0,
                      padding: '6px 8px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '3px',
                    }}
                  >
                    <legend style={{ fontWeight: 'bold', color: '#002277', padding: '0 4px', fontSize: '10.5px' }}>
                      📥 Chiamate Ricevute (Inflow: {narration.inflow.length})
                    </legend>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {narration.inflow.map((inItem, idx) => (
                        <div
                          key={idx}
                          style={{
                            backgroundColor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderLeft: '3px solid #003399',
                            padding: '4px 6px',
                            fontSize: '10px',
                            borderRadius: '2px',
                          }}
                        >
                          <div style={{ fontWeight: 'bold', color: '#002277' }}>
                            {inItem.connectedNodeTitle} <span style={{ fontWeight: 'normal', color: '#64748b' }}>[{inItem.connectedNodeCategory}]</span>
                          </div>
                          <div style={{ color: '#334155', marginTop: '2px', lineHeight: '1.4' }}>{inItem.naturalExplanation}</div>
                        </div>
                      ))}
                    </div>
                  </fieldset>
                )}

                {/* Connessioni in Uscita (Outflow) */}
                {narration.outflow.length > 0 && (
                  <fieldset
                    style={{
                      margin: 0,
                      padding: '6px 8px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '3px',
                    }}
                  >
                    <legend style={{ fontWeight: 'bold', color: '#006633', padding: '0 4px', fontSize: '10.5px' }}>
                      📤 Dipendenze a Valle (Outflow: {narration.outflow.length})
                    </legend>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {narration.outflow.map((outItem, idx) => (
                        <div
                          key={idx}
                          style={{
                            backgroundColor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderLeft: '3px solid #059669',
                            padding: '4px 6px',
                            fontSize: '10px',
                            borderRadius: '2px',
                          }}
                        >
                          <div style={{ fontWeight: 'bold', color: '#006633' }}>
                            {outItem.connectedNodeTitle} <span style={{ fontWeight: 'normal', color: '#64748b' }}>[{outItem.connectedNodeCategory}]</span>
                          </div>
                          <div style={{ color: '#334155', marginTop: '2px', lineHeight: '1.4' }}>{outItem.naturalExplanation}</div>
                        </div>
                      ))}
                    </div>
                  </fieldset>
                )}

                {/* Verdetto su Accoppiamento e Rischio */}
                <div
                  style={{
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderLeft: '4px solid #d97706',
                    padding: '8px 10px',
                    borderRadius: '3px',
                    fontSize: '10.5px',
                    lineHeight: '1.5',
                  }}
                >
                  <div style={{ fontWeight: 'bold', color: '#92400e', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>⚡</span>
                    <span>Analisi di Accoppiamento:</span>
                  </div>
                  <div style={{ color: '#78350f' }}>{narration.couplingInsight}</div>
                </div>

                {/* Raccomandazione Archeologica */}
                <div
                  style={{
                    backgroundColor: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    borderLeft: '4px solid #0284c7',
                    padding: '8px 10px',
                    borderRadius: '3px',
                    fontSize: '10.5px',
                    lineHeight: '1.5',
                  }}
                >
                  <div style={{ fontWeight: 'bold', color: '#0369a1', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>💡</span>
                    <span>Consiglio di Modernizzazione:</span>
                  </div>
                  <div style={{ color: '#0c4a6e' }}>{narration.recommendation}</div>
                </div>

                {/* Domande e Risposte Rapide */}
                {narration.interactiveQuestions.length > 0 && (
                  <fieldset
                    style={{
                      margin: 0,
                      padding: '6px 8px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '3px',
                    }}
                  >
                    <legend style={{ fontWeight: 'bold', color: '#1e293b', padding: '0 4px', fontSize: '10.5px' }}>
                      ❓ Domande Frequenti su queste Connessioni
                    </legend>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {narration.interactiveQuestions.map((q, idx) => (
                        <div
                          key={idx}
                          style={{
                            backgroundColor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '3px',
                            padding: '6px 8px',
                            fontSize: '10px',
                          }}
                        >
                          <div style={{ fontWeight: 'bold', color: '#991b1b', marginBottom: '3px' }}>
                            Q: {q.question}
                          </div>
                          <div style={{ color: '#1e293b', lineHeight: '1.45' }}>
                            <strong style={{ color: '#0369a1' }}>R:</strong> {q.answer}
                          </div>
                        </div>
                      ))}
                    </div>
                  </fieldset>
                )}

                {/* Pulsanti Rapidi di Decompilazione se nodo selezionato */}
                {selectedNode?.assemblyPath && (
                  <button
                    type="button"
                    onClick={() => onOpenAssemblyPath(selectedNode.assemblyPath!)}
                    style={{
                      padding: '5px 8px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      width: '100%',
                      marginTop: '4px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #94a3b8',
                      borderRadius: '3px',
                      color: '#002277',
                    }}
                  >
                    Decompila Codice Assembly &gt;&gt;
                  </button>
                )}
                {selectedNode?.typeFullName && onSelectType && (
                  <button
                    type="button"
                    onClick={() => onSelectType(selectedNode.typeFullName!)}
                    style={{
                      padding: '5px 8px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      width: '100%',
                      marginTop: '4px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #94a3b8',
                      borderRadius: '3px',
                      color: '#002277',
                    }}
                  >
                    Visualizza Classe nel Decompilatore &gt;&gt;
                  </button>
                )}
              </div>
            ) : (
              /* TAB: SPECIFICHE CAD TRADIZIONALI */
              selectedNode && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                  <fieldset style={{ margin: 0, padding: '6px' }}>
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

                  <fieldset style={{ margin: 0, padding: '6px', flex: 1 }}>
                    <legend>Elementi &amp; Interfacce ({selectedNode.items.length})</legend>
                    <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '10px' }}>
                      {selectedNode.items.map((it, idx) => (
                        <li key={idx} style={{ marginBottom: '3px', wordBreak: 'break-all' }}>{it}</li>
                      ))}
                    </ul>
                  </fieldset>

                  {selectedNode.assemblyPath && (
                    <button
                      type="button"
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
                      type="button"
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
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}
