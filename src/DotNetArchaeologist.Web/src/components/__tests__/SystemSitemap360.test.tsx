import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SystemSitemap360 } from '../SystemSitemap360'
import type { SolutionDescriptor } from '../../types/api'

describe('SystemSitemap360 Component', () => {
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

  it('renders header, 360 degree flow columns and explanation', () => {
    const handleOpen = vi.fn()
    const handleClose = vi.fn()
    render(
      <SystemSitemap360
        solution={mockSolution}
        onOpenAssemblyPath={handleOpen}
        onClose={handleClose}
      />
    )

    expect(screen.getByText(/Sitemap & Mappa Architetturale a 360°/i)).toBeInTheDocument()
    expect(screen.getByText(/1. WEB & SITEMAP/i)).toBeInTheDocument()
    expect(screen.getByText(/2. SERVIZI & API/i)).toBeInTheDocument()
    expect(screen.getByText(/3. DATABASE & DATI/i)).toBeInTheDocument()
    expect(screen.getByText(/4. BATCH WORKER/i)).toBeInTheDocument()
  })

  it('switches between flow, tree and api catalog view modes', () => {
    const handleOpen = vi.fn()
    const handleClose = vi.fn()
    render(
      <SystemSitemap360
        solution={mockSolution}
        onOpenAssemblyPath={handleOpen}
        onClose={handleClose}
      />
    )

    const treeBtn = screen.getByRole('button', { name: /\[Sitemap Gerarchica\]/i })
    fireEvent.click(treeBtn)
    expect(screen.getByText(/Esplora le sezioni del software/i)).toBeInTheDocument()

    const apiBtn = screen.getByRole('button', { name: /\[Catalogo Contratti & API\]/i })
    fireEvent.click(apiBtn)
    expect(screen.getAllByText(/IWsBillingService/i).length).toBeGreaterThan(0)
  })

  it('filters items when typing into search box and updates detail panel', () => {
    const handleOpen = vi.fn()
    const handleClose = vi.fn()
    render(
      <SystemSitemap360
        solution={mockSolution}
        onOpenAssemblyPath={handleOpen}
        onClose={handleClose}
      />
    )

    const searchInput = screen.getByPlaceholderText(/Cerca pagina, servizio, tabella/i)
    fireEvent.change(searchInput, { target: { value: 'WsBilling' } })

    expect(screen.getAllByText(/WsBillingService/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Visione a 360° del Componente/i)).toBeInTheDocument()

    // Seleziona esplicitamente il blocco del servizio
    const svcCard = screen.getByText(/\[SVC\] WsBillingService/)
    fireEvent.click(svcCard)

    // Clicca sul pulsante di decompilazione codice
    const decompileBtn = screen.getByRole('button', { name: /Decompila e Ispeziona Codice/i })
    fireEvent.click(decompileBtn)
    expect(handleOpen).toHaveBeenCalledWith('C:\\cartella\\ContosoERP.Service\\bin\\ContosoERP.Service.dll')

    // Clicca sul pulsante Chiudi Mappa
    const closeBtn = screen.getByRole('button', { name: /Chiudi Mappa/i })
    fireEvent.click(closeBtn)
    expect(handleClose).toHaveBeenCalled()
  })
})
