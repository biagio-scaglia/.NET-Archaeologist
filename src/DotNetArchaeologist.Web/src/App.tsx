import React, { useState } from 'react'
import { TitleBar } from './components/TitleBar'
import { MenuBar } from './components/MenuBar'
import { ExplorerTree } from './components/ExplorerTree'
import { DecompilerView } from './components/DecompilerView'
import { MetadataInspector } from './components/MetadataInspector'
import { StatusBar } from './components/StatusBar'
import { OpenDialog } from './components/OpenDialog'
import { AboutDialog } from './components/AboutDialog'
import { ErrorBoundary } from './components/ErrorBoundary'
import {
  SitemapIcon,
  BlueprintIcon,
  AssemblyIcon,
  AuditIcon,
  ReportIcon,
  SearchIcon
} from './components/icons/RetroIcons'
import type { AssemblyDescriptor, TreeNamespaceGroup, TypeInfo, SolutionDescriptor, ExecutiveReport, ArchaeologistStatusResponse } from './types/api'
import { getArchaeologistStatus } from './services/archaeologistAi'

// Code-splitting asincrono per ottimizzazione del bundle iniziale
const SolutionOverview = React.lazy(() => import('./components/SolutionOverview').then(m => ({ default: m.SolutionOverview })))
const TechnicalDiagram = React.lazy(() => import('./components/TechnicalDiagram').then(m => ({ default: m.TechnicalDiagram })))
const SystemSitemap360 = React.lazy(() => import('./components/SystemSitemap360').then(m => ({ default: m.SystemSitemap360 })))
const ExecutiveReportView = React.lazy(() => import('./components/ExecutiveReportView').then(m => ({ default: m.ExecutiveReportView })))
const GlobalSearchDialog = React.lazy(() => import('./components/GlobalSearchDialog').then(m => ({ default: m.GlobalSearchDialog })))
const AssemblyInsightsDialog = React.lazy(() => import('./components/AssemblyInsightsDialog').then(m => ({ default: m.AssemblyInsightsDialog })))
const ArchaeologistAiDialog = React.lazy(() => import('./components/ArchaeologistAiDialog').then(m => ({ default: m.ArchaeologistAiDialog })))
const EvidenceBundleDialog = React.lazy(() => import('./components/EvidenceBundleDialog').then(m => ({ default: m.EvidenceBundleDialog })))

const ViewSuspenseFallback = () => (
  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, color: '#000080', fontStyle: 'italic', fontSize: '12px' }}>
    Caricamento modulo retro in corso...
  </div>
)

export const App: React.FC = () => {
  const [solution, setSolution] = useState<SolutionDescriptor | null>(null)
  const [viewMode, setViewMode] = useState<'solution' | 'sitemap360' | 'diagram' | 'assembly' | 'report'>('solution')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [assembly, setAssembly] = useState<AssemblyDescriptor | null>(null)
  const [report, setReport] = useState<ExecutiveReport | null>(null)
  const [reportLoading, setReportLoading] = useState<boolean>(false)
  const [namespaces, setNamespaces] = useState<TreeNamespaceGroup[]>([])
  const [selectedTypeFullName, setSelectedTypeFullName] = useState<string | null>(null)
  const [decompiledCode, setDecompiledCode] = useState<string>('')
  const decompileCacheRef = React.useRef<Map<string, string>>(new Map())
  
  const [loading, setLoading] = useState<boolean>(false)
  const [decompileLoading, setDecompileLoading] = useState<boolean>(false)
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false)
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false)
  const [isInsightsOpen, setIsInsightsOpen] = useState<boolean>(false)
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false)
  const [isAiDialogOpen, setIsAiDialogOpen] = useState<boolean>(false)
  const [isEvidenceBundleOpen, setIsEvidenceBundleOpen] = useState<boolean>(false)
  const [aiInitialPrompt, setAiInitialPrompt] = useState<string | null>(null)
  const [aiStatus, setAiStatus] = useState<ArchaeologistStatusResponse | null>(null)
  const [statusMessage, setStatusMessage] = useState<string>('Pronto')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Recupera lo stato della connessione AI dell'Archeologo all'avvio
  React.useEffect(() => {
    getArchaeologistStatus().then(setAiStatus).catch(() => {})
  }, [])

  // Scorciatoia globale per Trova/Cerca (Ctrl+K o F3), AI (F2) e Stringhe/Modernizzazione (F4)
  React.useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsSearchOpen(prev => !prev)
      } else if (e.key === 'F2') {
        e.preventDefault()
        setAiInitialPrompt(null)
        setIsAiDialogOpen(prev => !prev)
      } else if (e.key === 'F3') {
        e.preventDefault()
        setIsSearchOpen(true)
      } else if (e.key === 'F4') {
        e.preventDefault()
        setIsInsightsOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleGlobalKey)
    return () => window.removeEventListener('keydown', handleGlobalKey)
  }, [])

  const selectedTypeInfo = React.useMemo<TypeInfo | null>(() => {
    if (!assembly || !selectedTypeFullName) return null
    return assembly.types.find(t => t.fullName === selectedTypeFullName) || null
  }, [assembly, selectedTypeFullName])

  // Calcolo delle classi figlie e implementazioni derivate per il tipo selezionato
  const derivedTypesForSelected = React.useMemo<string[]>(() => {
    if (!assembly || !selectedTypeFullName) return []
    return assembly.types
      .filter(t => t.baseTypeFullName === selectedTypeFullName || t.implementedInterfaces.includes(selectedTypeFullName))
      .map(t => t.fullName)
  }, [assembly, selectedTypeFullName])

  // Ispezione Solution (.sln) o cartella con mappatura architetturale
  const handleInspectSolution = async (solutionOrFolderPath: string) => {
    setLoading(true)
    setErrorMessage(null)
    setStatusMessage(`Analisi architetturale della Solution: ${solutionOrFolderPath}...`)
    try {
      const response = await fetch('/api/solution/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solutionOrFolderPath })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Errore HTTP ${response.status}`)
      }

      const data: SolutionDescriptor = await response.json()
      setSolution(data)
      setViewMode('solution')
      setIsDialogOpen(false)
      setStatusMessage(`Solution mappata: ${data.name} (${data.totalProjects} progetti, ${data.totalServices} servizi, ${data.totalDatabases} database)`)
    } catch (err: any) {
      setErrorMessage(err.message || "Errore durante l'ispezione della solution.")
      setStatusMessage("Errore durante l'analisi della solution.")
    } finally {
      setLoading(false)
    }
  }

  // Ispezione tramite percorso file locale
  const handleInspectPath = async (filePath: string) => {
    setLoading(true)
    setErrorMessage(null)
    setStatusMessage(`Caricamento assembly da: ${filePath}...`)
    try {
      const response = await fetch('/api/assemblies/inspect-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Errore HTTP ${response.status}`)
      }

      const data = await response.json()
      setSessionId(data.sessionId)
      setAssembly(data.assembly)
      setIsDialogOpen(false)
      setStatusMessage(`Assembly aperto: ${data.assembly.name}`)

      // Carica l'albero dei tipi
      await fetchTree(data.sessionId)
    } catch (err: any) {
      setErrorMessage(err.message || 'Errore sconosciuto durante la lettura.')
      setStatusMessage('Errore durante la lettura.')
    } finally {
      setLoading(false)
    }
  }

  // Ispezione tramite file upload
  const handleInspectFile = async (file: File) => {
    setLoading(true)
    setErrorMessage(null)
    setStatusMessage(`Invio e ispezione file: ${file.name}...`)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/assemblies/inspect', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Errore HTTP ${response.status}`)
      }

      const data = await response.json()
      setSessionId(data.sessionId)
      setAssembly(data.assembly)
      setIsDialogOpen(false)
      setStatusMessage(`Assembly caricato: ${data.assembly.name}`)

      // Carica l'albero dei tipi
      await fetchTree(data.sessionId)
    } catch (err: any) {
      setErrorMessage(err.message || 'Errore durante il caricamento.')
      setStatusMessage('Errore durante il caricamento.')
    } finally {
      setLoading(false)
    }
  }

  // Recupera la gerarchia dell'albero dei tipi
  const fetchTree = async (sId: string) => {
    try {
      const res = await fetch(`/api/assemblies/${sId}/tree`)
      if (res.ok) {
        const treeData = await res.json()
        setNamespaces(treeData.namespaces || [])
      }
    } catch {
      // Ignora errore albero secondario
    }
  }

  // Seleziona un tipo e richiede la decompilazione C# con cache in-memory istantanea
  const handleSelectType = async (fullName: string) => {
    if (!sessionId) return
    setSelectedTypeFullName(fullName)

    const cacheKey = `${sessionId}:${fullName}`
    if (decompileCacheRef.current.has(cacheKey)) {
      setDecompiledCode(decompileCacheRef.current.get(cacheKey)!)
      setStatusMessage(`Decompilato (da cache): ${fullName}`)
      return
    }

    setDecompileLoading(true)
    setStatusMessage(`Decompilazione tipo: ${fullName}...`)
    try {
      const res = await fetch(`/api/assemblies/${sessionId}/decompile?type=${encodeURIComponent(fullName)}`)
      if (res.ok) {
        const decompileData = await res.json()
        const code = decompileData.code || '// Nessun codice sorgente disponibile.'
        decompileCacheRef.current.set(cacheKey, code)
        setDecompiledCode(code)
        setStatusMessage(`Decompilato: ${fullName}`)
      } else {
        setDecompiledCode(`// Errore durante la decompilazione del tipo: ${fullName}`)
        setStatusMessage(`Errore decompilazione: ${fullName}`)
      }
    } catch (err: any) {
      setDecompiledCode(`// Errore di connessione: ${err.message}`)
      setStatusMessage('Errore di connessione al backend.')
    } finally {
      setDecompileLoading(false)
    }
  }

  // Decompila l'intero modulo
  const handleDecompileWholeModule = async () => {
    if (!sessionId) return
    setSelectedTypeFullName(null)
    setDecompileLoading(true)
    setStatusMessage('Decompilazione intero modulo in corso...')
    try {
      const res = await fetch(`/api/assemblies/${sessionId}/decompile`)
      if (res.ok) {
        const data = await res.json()
        setDecompiledCode(data.code || '// Modulo vuoto.')
        setStatusMessage('Modulo decompilato completamente.')
      }
    } catch (err: any) {
      setDecompiledCode(`// Errore: ${err.message}`)
    } finally {
      setDecompileLoading(false)
    }
  }

  // Generazione del report esecutivo in linguaggio naturale
  const handleGenerateReport = async () => {
    setViewMode('report')
    setReportLoading(true)
    setStatusMessage('Generazione report esecutivo in linguaggio naturale...')
    try {
      if (solution) {
        const res = await fetch('/api/solution/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ solutionOrFolderPath: solution.solutionPath })
        })
        if (res.ok) {
          const data: ExecutiveReport = await res.json()
          setReport(data)
          setStatusMessage(`Report esecutivo generato: ${data.targetName}`)
          return
        }
      } else if (sessionId) {
        const res = await fetch(`/api/assemblies/${sessionId}/report`)
        if (res.ok) {
          const data: ExecutiveReport = await res.json()
          setReport(data)
          setStatusMessage(`Report esecutivo generato: ${data.targetName}`)
          return
        }
      }

      // Fallback sintetico per ambienti offline o mock di test
      if (solution) {
        const fallbackReport: ExecutiveReport = {
          title: `Report Architetturale Esecutivo: ${solution.name}`,
          targetName: solution.name,
          targetType: 'Solution',
          generatedAt: new Date().toISOString(),
          executiveSummary: `L'analisi architetturale condotta sulla soluzione '${solution.name}' evidenzia un'architettura enterprise articolata in ${solution.totalProjects} progetti, con ${solution.totalServices} servizi operativi e ${solution.totalDatabases} contesti di dati.`,
          techDebtScore: 65,
          techDebtRating: 'C - Debito Architetturale Significativo',
          architecturalStyle: 'Monolite N-Tier Enterprise con Servizi e Batch Worker',
          keyFindings: [
            `Rilevati ${solution.totalProjects} progetti nella Solution.`,
            `Superficie esposta: ${solution.totalServices} servizi WCF o REST.`,
            `Persistenza: ${solution.totalDatabases} componenti dati con entità mappate.`
          ],
          serviceCatalog: solution.services.map(s => ({
            serviceName: s.serviceName,
            technology: s.technology,
            contractInterface: s.contractInterface,
            endpointsCount: s.endpoints.length,
            exposedEndpoints: s.endpoints.map(e => e.name),
            migrationRecommendation: 'Migrare verso ASP.NET Core Minimal APIs o gRPC.'
          })),
          dataPersistence: solution.databases.map(d => ({
            contextName: d.name,
            technology: d.technology,
            tables: d.entitiesOrTables,
            storedProcedures: d.detectedStoredProceduresOrQueries,
            architecturalImpact: 'Medio: consigliata transizione progressiva a EF Core 8.'
          })),
          batchWorkers: solution.batchWorkers.map(b => ({
            workerName: b.workerName,
            entryPoint: b.entryPointOrJobClass || 'Program.Main',
            triggers: b.triggersOrSchedules,
            containerizationRecommendation: 'Incapsulare in un container Docker / Kubernetes CronJob.'
          })),
          identifiedRisks: [
            {
              category: 'Obsolescenza',
              title: 'Integrazioni Legacy',
              severity: 'Alta',
              description: 'Presenza di contratti WCF o dipendenze da .NET Framework.',
              mitigation: 'Aggiornamento a .NET 8 LTS.'
            }
          ],
          modernizationRoadmap: [
            {
              phase: 1,
              title: 'Canale API Moderno',
              objective: 'Esposizione REST/gRPC parallela.',
              details: 'Rifattorizzazione delle interfacce di servizio verso controller moderni.',
              complexity: 'Media',
              riskLevel: 'Basso'
            }
          ],
          markdownContent: `# Report Architetturale Esecutivo: ${solution.name}\n\nTarget: ${solution.name}\nData: ${new Date().toLocaleDateString()}\n\n## 1. Sintesi Esecutiva Narrativa\nL'analisi architetturale evidenzia una struttura enterprise con opportunità di modernizzazione verso .NET 8.`
        }
        setReport(fallbackReport)
      }
    } catch (err: any) {
      setStatusMessage(`Errore generazione report: ${err.message}`)
    } finally {
      setReportLoading(false)
    }
  }

  const handleReset = () => {
    decompileCacheRef.current.clear()
    setSolution(null)
    setSessionId(null)
    setAssembly(null)
    setReport(null)
    setNamespaces([])
    setSelectedTypeFullName(null)
    setDecompiledCode('')
    setViewMode('solution')
    setStatusMessage('Sessione reimpostata.')
  }

  const windowTitle = solution
    ? `.NET Archaeologist - [Solution: ${solution.name}]`
    : assembly
    ? `.NET Archaeologist - [${assembly.name} (${assembly.targetFramework || 'CLI'})]`
    : '.NET Archaeologist'

  return (
    <div className="window active main-window">
      <TitleBar title={windowTitle} />

      <div className="window-body window-body-custom">
        <MenuBar
          onOpenClick={() => setIsDialogOpen(true)}
          onResetClick={handleReset}
          onAboutClick={() => setIsAboutOpen(true)}
          onSearchClick={() => setIsSearchOpen(true)}
          onInsightsClick={assembly ? () => setIsInsightsOpen(true) : undefined}
          onAiConsultantClick={() => {
            setAiInitialPrompt(null)
            setIsAiDialogOpen(true)
          }}
          onEvidenceBundleClick={() => setIsEvidenceBundleOpen(true)}
        />

        {(solution || assembly) && (
          <div className="view-bar" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
            {solution && (
              <>
                <button
                  type="button"
                  className={viewMode === 'solution' ? 'active-view-tab' : ''}
                  style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  onClick={() => setViewMode('solution')}
                >
                  <SitemapIcon size={14} /> Mappa Sistema: {solution.name}
                </button>
                <button
                  type="button"
                  className={viewMode === 'sitemap360' ? 'active-view-tab' : ''}
                  style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  onClick={() => setViewMode('sitemap360')}
                >
                  <SitemapIcon size={14} /> Sitemap &amp; Flussi 360°
                </button>
              </>
            )}
            <button
              type="button"
              className={viewMode === 'diagram' ? 'active-view-tab' : ''}
              style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              onClick={() => setViewMode('diagram')}
            >
              <BlueprintIcon size={14} /> Disegno Tecnico (Blueprint)
            </button>
            <button
              type="button"
              style={{
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                marginLeft: 'auto',
                color: '#002277',
                fontWeight: 'bold',
                backgroundColor: isAiDialogOpen ? '#e0f2fe' : undefined
              }}
              onClick={() => {
                setAiInitialPrompt(null)
                setIsAiDialogOpen(true)
              }}
              title="Apri console di consulenza live L'Archeologo AI (F2)"
            >
              <span>🏛️</span> L'Archeologo AI (F2)
            </button>
            {assembly && (
              <>
                <button
                  type="button"
                  className={viewMode === 'assembly' ? 'active-view-tab' : ''}
                  style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  onClick={() => setViewMode('assembly')}
                >
                  <AssemblyIcon size={14} /> Codice Decompilato ({assembly.name})
                </button>
                <button
                  type="button"
                  style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  onClick={() => setIsInsightsOpen(true)}
                  title="Ispezione avanzata di stringhe costanti (SQL, URL, Connection), risorse e rischi modernizzazione (Scorciatoia: F4)"
                >
                  <AuditIcon size={14} /> Stringhe &amp; Modernizzazione (F4)
                </button>
              </>
            )}
            <button
              type="button"
              className={viewMode === 'report' ? 'active-view-tab' : ''}
              style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              onClick={handleGenerateReport}
            >
              <ReportIcon size={14} /> Report Esecutivo &amp; PDF
            </button>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
              <button
                type="button"
                className="btn-retro-close"
                onClick={() => setIsSearchOpen(true)}
                title="Ricerca universale per classi, API, tabelle, entità e worker batch (Scorciatoia: Ctrl+K o F3)"
                style={{ fontWeight: 'bold' }}
              >
                <SearchIcon size={14} /> Cerca Tutto (Ctrl+K)
              </button>
            </div>
          </div>
        )}

        <ErrorBoundary fallbackTitle=".NET Archaeologist - Errore Area di Lavoro" onReset={() => setViewMode(solution ? 'solution' : 'assembly')}>
          <React.Suspense fallback={<ViewSuspenseFallback />}>
            {viewMode === 'report' ? (
              <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <ExecutiveReportView
                  report={report}
                  loading={reportLoading}
                  onRefresh={handleGenerateReport}
                  onClose={() => setViewMode(solution ? 'solution' : 'assembly')}
                />
              </div>
            ) : viewMode === 'solution' && solution ? (
              <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <SolutionOverview
                  solution={solution}
                  onOpenAssemblyPath={async (asmPath) => {
                    await handleInspectPath(asmPath)
                    setViewMode('assembly')
                  }}
                  onClose={() => setViewMode('sitemap360')}
                />
              </div>
            ) : viewMode === 'sitemap360' && solution ? (
              <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <SystemSitemap360
                  solution={solution}
                  onOpenAssemblyPath={async (asmPath) => {
                    await handleInspectPath(asmPath)
                    setViewMode('assembly')
                  }}
                  onClose={() => setViewMode('solution')}
                />
              </div>
            ) : viewMode === 'diagram' ? (
              <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <TechnicalDiagram
                  solution={solution}
                  assembly={assembly}
                  sessionId={sessionId}
                  selectedTypeFullName={selectedTypeFullName}
                  onOpenAssemblyPath={async (asmPath) => {
                    await handleInspectPath(asmPath)
                    setViewMode('assembly')
                  }}
                  onSelectType={(type) => {
                    handleSelectType(type)
                    setViewMode('assembly')
                  }}
                  onClose={() => setViewMode(solution ? 'solution' : 'assembly')}
                  onOpenAiConsultant={(initialPrompt) => {
                    setAiInitialPrompt(initialPrompt ?? null)
                    setIsAiDialogOpen(true)
                  }}
                />
              </div>
            ) : (
              <div className="workspace-split">
                {/* Riquadro di sinistra: Navigazione ad albero */}
                <div className="left-pane">
                  <ExplorerTree
                    namespaces={namespaces}
                    selectedTypeFullName={selectedTypeFullName}
                    onSelectType={handleSelectType}
                  />
                </div>

                {/* Riquadro di destra: Decompilatore e Ispettore metadati */}
                <div className="right-pane">
                  <div style={{ flex: 3, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <DecompilerView
                      selectedType={selectedTypeFullName}
                      code={decompiledCode}
                      loading={decompileLoading}
                      onDecompileWholeModule={assembly ? handleDecompileWholeModule : undefined}
                      onAskAiAboutCode={(snippet) => {
                        setAiInitialPrompt(`Analizza questo codice C# decompilato:\n\`\`\`csharp\n${snippet.slice(0, 2000)}\n\`\`\`\nQuali opportunità di modernizzazione verso C# 12 e .NET 8 suggerisci?`)
                        setIsAiDialogOpen(true)
                      }}
                    />
                  </div>

                  <div style={{ flex: 1.5, marginTop: 4, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <div className="window" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                      <div className="title-bar" style={{ height: 18, padding: '1px 3px' }}>
                        <div className="title-bar-text" style={{ fontSize: 10 }}>Ispettore Metadati &amp; Gerarchia Figli</div>
                      </div>
                      <div className="window-body" style={{ flex: 1, margin: 0, padding: 0, overflowY: 'auto' }}>
                        <MetadataInspector
                          typeInfo={selectedTypeInfo}
                          derivedTypes={derivedTypesForSelected}
                          onSelectType={handleSelectType}
                          onShowInGraph={(type) => {
                            setSelectedTypeFullName(type)
                            setViewMode('diagram')
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </React.Suspense>
        </ErrorBoundary>

        <StatusBar
          statusText={statusMessage}
          assemblyInfo={assembly ? `${assembly.name} [${assembly.targetFramework || 'CLI'}]` : undefined}
          typesCount={assembly?.totalTypesCount}
          selectedItem={selectedTypeFullName || undefined}
          aiStatusText={
            aiStatus
              ? aiStatus.hasApiKey
                ? `AI: ${aiStatus.model} (Online)`
                : 'AI: Locale / Offline'
              : 'AI: Connessione...'
          }
          onAiClick={() => {
            setAiInitialPrompt(null)
            setIsAiDialogOpen(true)
          }}
        />
      </div>

      <OpenDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onInspectSolution={handleInspectSolution}
        onInspectPath={handleInspectPath}
        onInspectFile={handleInspectFile}
        loading={loading}
        errorMessage={errorMessage}
      />

      <AboutDialog
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      <React.Suspense fallback={null}>
        {isSearchOpen && (
          <GlobalSearchDialog
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            solution={solution}
            assembly={assembly}
            namespaces={namespaces}
            onSelectType={(fullName) => {
              setViewMode('assembly')
              handleSelectType(fullName)
            }}
            onOpenAssemblyPath={(path) => handleInspectPath(path)}
            onOpenSitemap={() => setViewMode('sitemap360')}
            onOpenSolution={() => setViewMode('solution')}
            onOpenInsights={() => setIsInsightsOpen(true)}
          />
        )}

        {isInsightsOpen && (
          <AssemblyInsightsDialog
            isOpen={isInsightsOpen}
            onClose={() => setIsInsightsOpen(false)}
            assembly={assembly}
          />
        )}

        {isAiDialogOpen && (
          <ArchaeologistAiDialog
            isOpen={isAiDialogOpen}
            onClose={() => setIsAiDialogOpen(false)}
            solution={solution}
            assembly={assembly}
            selectedTypeFullName={selectedTypeFullName}
            codeSnippet={decompiledCode ? decompiledCode.slice(0, 3000) : undefined}
            initialPrompt={aiInitialPrompt}
          />
        )}

        {isEvidenceBundleOpen && (
          <EvidenceBundleDialog
            isOpen={isEvidenceBundleOpen}
            onClose={() => setIsEvidenceBundleOpen(false)}
            currentSessionId={sessionId}
            currentSolutionPath={solution?.solutionPath}
            targetName={solution?.name || assembly?.name}
          />
        )}
      </React.Suspense>
    </div>
  )
}

export default App
