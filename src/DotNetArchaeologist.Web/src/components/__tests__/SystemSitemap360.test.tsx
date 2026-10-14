import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SystemSitemap360 } from '../SystemSitemap360'
import type { SolutionDescriptor } from '../../types/api'

describe('SystemSitemap360 Component', () => {
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
    expect(screen.getAllByText(/IWsGestPdcService/i).length).toBeGreaterThan(0)
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
    fireEvent.change(searchInput, { target: { value: 'WsGest' } })

    expect(screen.getAllByText(/WsGestPdcService/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Visione a 360° del Componente/i)).toBeInTheDocument()

    // Seleziona esplicitamente il blocco del servizio
    const svcCard = screen.getByText(/\[SVC\] WsGestPdcService/)
    fireEvent.click(svcCard)

    // Clicca sul pulsante di decompilazione codice
    const decompileBtn = screen.getByRole('button', { name: /Decompila e Ispeziona Codice/i })
    fireEvent.click(decompileBtn)
    expect(handleOpen).toHaveBeenCalledWith('C:\\cartella\\GestPdC.Service\\bin\\GestPdC.Service.dll')

    // Clicca sul pulsante Chiudi Mappa
    const closeBtn = screen.getByRole('button', { name: /Chiudi Mappa/i })
    fireEvent.click(closeBtn)
    expect(handleClose).toHaveBeenCalled()
  })
})
