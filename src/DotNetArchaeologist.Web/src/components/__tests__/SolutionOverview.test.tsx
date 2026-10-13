import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SolutionOverview } from '../SolutionOverview'
import type { SolutionDescriptor } from '../../types/api'

describe('SolutionOverview Component', () => {
  const mockSolution: SolutionDescriptor = {
    name: 'GestPdC',
    solutionPath: 'C:\\cartella\\GestPdC.sln',
    totalProjects: 2,
    totalServices: 1,
    totalDatabases: 1,
    totalBatchWorkers: 1,
    projects: [
      {
        name: 'GestPdC.Service',
        projectPath: 'C:\\cartella\\GestPdC.Service\\GestPdC.Service.csproj',
        relativePath: 'GestPdC.Service\\GestPdC.Service.csproj',
        outputAssemblyPath: 'C:\\cartella\\GestPdC.Service\\bin\\GestPdC.Service.dll',
        assemblyExists: true,
        category: 'Service',
        projectReferences: ['GestPdC.Common'],
        packageReferences: ['System.ServiceModel'],
        detectedTechnologies: ['WCF Service (SOAP)'],
      },
      {
        name: 'GestPdC.Data',
        projectPath: 'C:\\cartella\\GestPdC.Data\\GestPdC.Data.csproj',
        relativePath: 'GestPdC.Data\\GestPdC.Data.csproj',
        outputAssemblyPath: 'C:\\cartella\\GestPdC.Data\\bin\\GestPdC.Data.dll',
        assemblyExists: true,
        category: 'Database',
        projectReferences: [],
        packageReferences: ['EntityFramework'],
        detectedTechnologies: ['Entity Framework'],
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
            parameters: ['int praticaId', 'string payload'],
          },
        ],
      },
    ],
    databases: [
      {
        name: 'GestPdCObjectContext',
        projectName: 'GestPdC.Data',
        technology: 'Entity Framework ObjectContext/DbContext',
        baseTypeOrPattern: 'ObjectContext',
        assemblyPath: 'C:\\cartella\\GestPdC.Data\\bin\\GestPdC.Data.dll',
        entitiesOrTables: ['Pratiche', 'Utenti', 'Documenti'],
        detectedStoredProceduresOrQueries: ['sp_InserisciNotifica', 'usp_GetPratica'],
      },
    ],
    batchWorkers: [
      {
        workerName: 'GestPdcBatch',
        projectName: 'GestPdcBatch',
        technology: 'Console Batch Job / Worker',
        entryPointOrJobClass: 'GestPdcBatch.Program',
        assemblyPath: 'C:\\cartella\\GestPdcBatch\\bin\\GestPdcBatch.exe',
        triggersOrSchedules: ['Console EntryPoint (Main)'],
      },
    ],
    domainComponents: [],
  }

  it('renders solution header and services tab correctly', () => {
    const handleOpen = vi.fn()
    const handleClose = vi.fn()

    render(
      <SolutionOverview
        solution={mockSolution}
        onOpenAssemblyPath={handleOpen}
        onClose={handleClose}
      />
    )

    expect(screen.getByText(/Mappa Architetturale Sistema: GestPdC.sln/i)).toBeInTheDocument()
    expect(screen.getAllByText('WsGestPdcService').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/NotificaPratica/i)).toBeInTheDocument()
  })

  it('switches to databases tab and displays tables and stored procedures', () => {
    const handleOpen = vi.fn()
    const handleClose = vi.fn()

    render(
      <SolutionOverview
        solution={mockSolution}
        onOpenAssemblyPath={handleOpen}
        onClose={handleClose}
      />
    )

    const dbTab = screen.getByText(/Database & Persistenza/i)
    fireEvent.click(dbTab)

    expect(screen.getAllByText('GestPdCObjectContext').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('[TBL] Pratiche')).toBeInTheDocument()
    expect(screen.getByText('[PROC] sp_InserisciNotifica')).toBeInTheDocument()
  })

  it('invokes onOpenAssemblyPath when Decompila Assembly button is clicked', () => {
    const handleOpen = vi.fn()
    const handleClose = vi.fn()

    render(
      <SolutionOverview
        solution={mockSolution}
        onOpenAssemblyPath={handleOpen}
        onClose={handleClose}
      />
    )

    const decompileBtn = screen.getByRole('button', { name: /Decompila Assembly/i })
    fireEvent.click(decompileBtn)

    expect(handleOpen).toHaveBeenCalledWith('C:\\cartella\\GestPdC.Service\\bin\\GestPdC.Service.dll')
  })
})
