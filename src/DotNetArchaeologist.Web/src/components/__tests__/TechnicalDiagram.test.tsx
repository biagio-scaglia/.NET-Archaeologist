import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TechnicalDiagram } from '../TechnicalDiagram'
import type { SolutionDescriptor } from '../../types/api'

describe('TechnicalDiagram Component', () => {
  const mockSolution: SolutionDescriptor = {
    name: 'ContosoERP',
    solutionPath: 'C:\\cartella\\ContosoERP.sln',
    totalProjects: 2,
    totalServices: 1,
    totalDatabases: 1,
    totalBatchWorkers: 1,
    projects: [
      {
        name: 'ContosoERP.Web',
        projectPath: 'C:\\cartella\\ContosoERP.Web\\ContosoERP.Web.csproj',
        relativePath: 'ContosoERP.Web\\ContosoERP.Web.csproj',
        outputAssemblyPath: 'C:\\cartella\\ContosoERP.Web\\bin\\ContosoERP.Web.dll',
        assemblyExists: true,
        category: 'Web',
        projectReferences: ['ContosoERP.Service'],
        packageReferences: [],
        detectedTechnologies: ['ASP.NET MVC'],
      },
    ],
    services: [
      {
        serviceName: 'WsBillingService',
        projectName: 'ContosoERP.Service',
        technology: 'WCF Service (SOAP)',
        contractInterface: 'IWsBillingService',
        implementationType: 'WsBillingService',
        assemblyPath: 'C:\\cartella\\ContosoERP.Service\\bin\\ContosoERP.Service.dll',
        endpoints: [
          {
            name: 'ProcessInvoice',
            httpMethodOrContract: 'SOAP Action',
            routeOrAction: 'ProcessInvoice',
            returnType: 'bool',
            parameters: ['int invoiceId'],
          },
        ],
      },
    ],
    databases: [
      {
        name: 'ContosoErpDbContext',
        projectName: 'ContosoERP.Data',
        technology: 'Entity Framework',
        baseTypeOrPattern: 'ObjectContext',
        assemblyPath: 'C:\\cartella\\ContosoERP.Data\\bin\\ContosoERP.Data.dll',
        entitiesOrTables: ['Invoices', 'Customers'],
        detectedStoredProceduresOrQueries: ['sp_InsertInvoice'],
      },
    ],
    batchWorkers: [
      {
        workerName: 'BillingBatchWorker',
        projectName: 'BillingBatchWorker',
        technology: 'Console Batch Worker',
        entryPointOrJobClass: 'Program',
        assemblyPath: 'C:\\cartella\\BillingBatchWorker\\bin\\BillingBatchWorker.exe',
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
    expect(screen.getByText('WsBillingService')).toBeInTheDocument()
    expect(screen.getByText('ContosoErpDbContext')).toBeInTheDocument()
    expect(screen.getByText('BillingBatchWorker')).toBeInTheDocument()
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

    const svcNode = screen.getByText('WsBillingService')
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
    fireEvent.change(searchInput, { target: { value: 'WsBilling' } })

    expect(screen.getByText('(2)')).toBeInTheDocument()
  })

  it('renders CAD minimap and synchronizes bidirectional selection', () => {
    const handleOpen = vi.fn()
    const handleSelectType = vi.fn()
    render(
      <TechnicalDiagram
        solution={mockSolution}
        assembly={null}
        selectedTypeFullName="WsBillingService"
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
    // Verifica che il progetto ContosoERP.Web sia renderizzato
    expect(screen.getByText('ContosoERP.Web')).toBeInTheDocument()
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

    // WsBillingService deve essere visibile come classe/servizio
    expect(screen.getByText('WsBillingService')).toBeInTheDocument()
    // Database e interfacce non devono apparire nel filtro solo classi
    expect(screen.queryByText('ContosoErpDbContext')).not.toBeInTheDocument()
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

    // L'interfaccia IWsBillingService deve essere presente
    expect(screen.getByText('IWsBillingService')).toBeInTheDocument()
    // Il database o il batch non devono apparire
    expect(screen.queryByText('ContosoErpDbContext')).not.toBeInTheDocument()
  })
})
