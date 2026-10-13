import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TechnicalDiagram } from '../TechnicalDiagram'
import type { SolutionDescriptor } from '../../types/api'

describe('TechnicalDiagram Component', () => {
  const mockSolution: SolutionDescriptor = {
    name: 'GestPdC',
    solutionPath: 'C:\\cartella\\GestPdC.sln',
    totalProjects: 2,
    totalServices: 1,
    totalDatabases: 1,
    totalBatchWorkers: 1,
    projects: [
      {
        name: 'GestPdC.Web',
        projectPath: 'C:\\cartella\\GestPdC.Web\\GestPdC.Web.csproj',
        relativePath: 'GestPdC.Web\\GestPdC.Web.csproj',
        outputAssemblyPath: 'C:\\cartella\\GestPdC.Web\\bin\\GestPdC.Web.dll',
        assemblyExists: true,
        category: 'Web',
        projectReferences: ['GestPdC.Service'],
        packageReferences: [],
        detectedTechnologies: ['ASP.NET MVC'],
      },
    ],
    services: [
      {
        serviceName: 'WsGestPdcService',
        projectName: 'GestPdC.Service',
        technology: 'WCF Service (SOAP)',
        contractInterface: 'IWsGestPdcService',
        implementationType: 'WsGestPdcService',
        assemblyPath: 'C:\\cartella\\GestPdC.Service\\bin\\GestPdC.Service.dll',
        endpoints: [
          {
            name: 'NotificaPratica',
            httpMethodOrContract: 'SOAP Action',
            routeOrAction: 'NotificaPratica',
            returnType: 'bool',
            parameters: ['int praticaId'],
          },
        ],
      },
    ],
    databases: [
      {
        name: 'GestPdCObjectContext',
        projectName: 'GestPdC.Data',
        technology: 'Entity Framework',
        baseTypeOrPattern: 'ObjectContext',
        assemblyPath: 'C:\\cartella\\GestPdC.Data\\bin\\GestPdC.Data.dll',
        entitiesOrTables: ['Pratiche', 'Utenti'],
        detectedStoredProceduresOrQueries: ['sp_InserisciNotifica'],
      },
    ],
    batchWorkers: [
      {
        workerName: 'GestPdcBatch',
        projectName: 'GestPdcBatch',
        technology: 'Console Batch Worker',
        entryPointOrJobClass: 'Program',
        assemblyPath: 'C:\\cartella\\GestPdcBatch\\bin\\GestPdcBatch.exe',
        triggersOrSchedules: ['Console EntryPoint (Main)'],
      },
    ],
    domainComponents: [],
  }

  it('renders technical CAD blueprint toolbar and component blocks', () => {
    const handleOpen = vi.fn()
    render(
      <TechnicalDiagram
        solution={mockSolution}
        assembly={null}
        onOpenAssemblyPath={handleOpen}
      />
    )

    expect(screen.getByText(/\[DISEGNO TECNICO ARCHITETTURALE\]/i)).toBeInTheDocument()
    expect(screen.getByText('WsGestPdcService')).toBeInTheDocument()
    expect(screen.getByText('GestPdCObjectContext')).toBeInTheDocument()
    expect(screen.getByText('GestPdcBatch')).toBeInTheDocument()
  })

  it('changes zoom level when zoom buttons are clicked', () => {
    const handleOpen = vi.fn()
    render(
      <TechnicalDiagram
        solution={mockSolution}
        assembly={null}
        onOpenAssemblyPath={handleOpen}
      />
    )

    const zoomInBtn = screen.getByRole('button', { name: /\[\+\] Zoom/i })
    fireEvent.click(zoomInBtn)
    expect(screen.getByText('115%')).toBeInTheDocument()

    const resetBtn = screen.getByRole('button', { name: /1:1 Reset/i })
    fireEvent.click(resetBtn)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('opens side panel when a technical node is selected', () => {
    const handleOpen = vi.fn()
    render(
      <TechnicalDiagram
        solution={mockSolution}
        assembly={null}
        onOpenAssemblyPath={handleOpen}
      />
    )

    const svcNode = screen.getByText('WsGestPdcService')
    fireEvent.click(svcNode)

    expect(screen.getByText('Dettaglio Componente CAD')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Decompila Codice Assembly/i })).toBeInTheDocument()
  })

  it('filters and highlights nodes when searching via input', () => {
    const handleOpen = vi.fn()
    render(
      <TechnicalDiagram
        solution={mockSolution}
        assembly={null}
        onOpenAssemblyPath={handleOpen}
      />
    )

    const searchInput = screen.getByPlaceholderText('Nome tipo...')
    fireEvent.change(searchInput, { target: { value: 'WsGest' } })

    expect(screen.getByText('(2)')).toBeInTheDocument()
  })

  it('renders CAD minimap and synchronizes bidirectional selection', () => {
    const handleOpen = vi.fn()
    const handleSelectType = vi.fn()
    render(
      <TechnicalDiagram
        solution={mockSolution}
        assembly={null}
        selectedTypeFullName="WsGestPdcService"
        onOpenAssemblyPath={handleOpen}
        onSelectType={handleSelectType}
      />
    )

    expect(screen.getByText('Minimappa CAD')).toBeInTheDocument()
    expect(screen.getByText('Dettaglio Componente CAD')).toBeInTheDocument()
  })

  it('renders projects and references in graph mode when only solution is loaded without assembly', () => {
    const handleOpen = vi.fn()
    render(
      <TechnicalDiagram
        solution={mockSolution}
        assembly={null}
        onOpenAssemblyPath={handleOpen}
      />
    )

    const switchBtn = screen.getByRole('button', { name: /Grafo Dipendenze/i })
    fireEvent.click(switchBtn)

    // Verifica che il pulsante sia diventato "Torna a Mappa Sistema"
    expect(screen.getByRole('button', { name: /Torna a Mappa Sistema/i })).toBeInTheDocument()
    // Verifica che il progetto GestPdC.Web sia renderizzato
    expect(screen.getByText('GestPdC.Web')).toBeInTheDocument()
    // Verifica che il conteggio non sia 0
    expect(screen.queryByText(/Tutti i Componenti \(0\)/i)).not.toBeInTheDocument()
  })

  it('filters strictly by classes without leaking databases or batch', () => {
    const handleOpen = vi.fn()
    render(
      <TechnicalDiagram
        solution={mockSolution}
        assembly={null}
        onOpenAssemblyPath={handleOpen}
      />
    )

    const filterSelect = screen.getByDisplayValue(/Tutti i Componenti/i)
    fireEvent.change(filterSelect, { target: { value: 'classes' } })

    // WsGestPdcService deve essere visibile come classe/servizio
    expect(screen.getByText('WsGestPdcService')).toBeInTheDocument()
    // Database e interfacce non devono apparire nel filtro solo classi
    expect(screen.queryByText('GestPdCObjectContext')).not.toBeInTheDocument()
  })

  it('filters and displays contract interfaces when selecting interfaces filter', () => {
    const handleOpen = vi.fn()
    render(
      <TechnicalDiagram
        solution={mockSolution}
        assembly={null}
        onOpenAssemblyPath={handleOpen}
      />
    )

    const filterSelect = screen.getByDisplayValue(/Tutti i Componenti/i)
    fireEvent.change(filterSelect, { target: { value: 'interfaces' } })

    // L'interfaccia IWsGestPdcService deve essere presente
    expect(screen.getByText('IWsGestPdcService')).toBeInTheDocument()
    // Il database o il batch non devono apparire
    expect(screen.queryByText('GestPdCObjectContext')).not.toBeInTheDocument()
  })
})
