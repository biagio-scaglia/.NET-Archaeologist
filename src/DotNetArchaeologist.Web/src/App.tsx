import React, { useState } from 'react'
import { TitleBar } from './components/TitleBar'
import { MenuBar } from './components/MenuBar'
import { ExplorerTree } from './components/ExplorerTree'
import { DecompilerView } from './components/DecompilerView'
import { MetadataInspector } from './components/MetadataInspector'
import { StatusBar } from './components/StatusBar'
import { OpenDialog } from './components/OpenDialog'
import { AboutDialog } from './components/AboutDialog'
import type { AssemblyDescriptor, TreeNamespaceGroup, TypeInfo } from './types/api'

export const App: React.FC = () => {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [assembly, setAssembly] = useState<AssemblyDescriptor | null>(null)
  const [namespaces, setNamespaces] = useState<TreeNamespaceGroup[]>([])
  const [selectedTypeFullName, setSelectedTypeFullName] = useState<string | null>(null)
  const [decompiledCode, setDecompiledCode] = useState<string>('')
  
  const [loading, setLoading] = useState<boolean>(false)
  const [decompileLoading, setDecompileLoading] = useState<boolean>(false)
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false)
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false)
  const [statusMessage, setStatusMessage] = useState<string>('Pronto')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const selectedTypeInfo = React.useMemo<TypeInfo | null>(() => {
    if (!assembly || !selectedTypeFullName) return null
    return assembly.types.find(t => t.fullName === selectedTypeFullName) || null
  }, [assembly, selectedTypeFullName])

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

  // Seleziona un tipo e richiede la decompilazione C#
  const handleSelectType = async (fullName: string) => {
    if (!sessionId) return
    setSelectedTypeFullName(fullName)
    setDecompileLoading(true)
    setStatusMessage(`Decompilazione tipo: ${fullName}...`)
    try {
      const res = await fetch(`/api/assemblies/${sessionId}/decompile?type=${encodeURIComponent(fullName)}`)
      if (res.ok) {
        const decompileData = await res.json()
        setDecompiledCode(decompileData.code || '// Nessun codice sorgente disponibile.')
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

  const handleReset = () => {
    setSessionId(null)
    setAssembly(null)
    setNamespaces([])
    setSelectedTypeFullName(null)
    setDecompiledCode('')
    setStatusMessage('Sessione reimpostata.')
  }

  const windowTitle = assembly
    ? `.NET Archaeologist - [${assembly.name} (${assembly.targetFramework || 'CLI'})]`
    : '.NET Archaeologist'

  return (
    <div className="window main-window">
      <TitleBar title={windowTitle} />

      <div className="window-body window-body-custom">
        <MenuBar
          onOpenClick={() => setIsDialogOpen(true)}
          onResetClick={handleReset}
          onAboutClick={() => setIsAboutOpen(true)}
        />

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
              />
            </div>

            <div style={{ flex: 1.5, marginTop: 4, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div className="window" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div className="title-bar" style={{ height: 18, padding: '1px 3px' }}>
                  <div className="title-bar-text" style={{ fontSize: 10 }}>Ispettore Metadati</div>
                </div>
                <div className="window-body" style={{ flex: 1, margin: 0, padding: 0, overflowY: 'auto' }}>
                  <MetadataInspector typeInfo={selectedTypeInfo} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <StatusBar
          statusText={statusMessage}
          assemblyInfo={assembly ? `${assembly.name} [${assembly.targetFramework || 'CLI'}]` : undefined}
          typesCount={assembly?.totalTypesCount}
          selectedItem={selectedTypeFullName || undefined}
        />
      </div>

      <OpenDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onInspectPath={handleInspectPath}
        onInspectFile={handleInspectFile}
        loading={loading}
        errorMessage={errorMessage}
      />

      <AboutDialog
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />
    </div>
  )
}

export default App
