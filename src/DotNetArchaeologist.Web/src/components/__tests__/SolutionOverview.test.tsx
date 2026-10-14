import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SolutionOverview } from '../SolutionOverview'
import type { SolutionDescriptor } from '../../types/api'

describe('SolutionOverview Component', () => {
  const mockSolution: SolutionDescriptor = {
    name: 'ContosoERP',
    solutionPath: 'C:\\cartella\\ContosoERP.sln',
    totalProjects: 2,
    totalServices: 1,
    totalDatabases: 1,
    totalBatchWorkers: 1,
    projects: [
      {
        name: 'ContosoERP.Service',
        projectPath: 'C:\\cartella\\ContosoERP.Service\\ContosoERP.Service.csproj',
        relativePath: 'ContosoERP.Service\\ContosoERP.Service.csproj',
        outputAssemblyPath: 'C:\\cartella\\ContosoERP.Service\\bin\\ContosoERP.Service.dll',
        assemblyExists: true,
        category: 'Service',
        projectReferences: ['ContosoERP.Common'],
        packageReferences: ['System.ServiceModel'],
        detectedTechnologies: ['WCF Service (SOAP)'],
      },
      {
        name: 'ContosoERP.Data',
        projectPath: 'C:\\cartella\\ContosoERP.Data\\ContosoERP.Data.csproj',
        relativePath: 'ContosoERP.Data\\ContosoERP.Data.csproj',
        outputAssemblyPath: 'C:\\cartella\\ContosoERP.Data\\bin\\ContosoERP.Data.dll',
        assemblyExists: true,
        category: 'Database',
        projectReferences: [],
        packageReferences: ['EntityFramework'],
        detectedTechnologies: ['Entity Framework'],
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
            parameters: ['int invoiceId', 'string payload'],
          },
        ],
      },
    ],
    databases: [
      {
        name: 'ContosoErpDbContext',
        projectName: 'ContosoERP.Data',
        technology: 'Entity Framework ObjectContext/DbContext',
        baseTypeOrPattern: 'ObjectContext',
        assemblyPath: 'C:\\cartella\\ContosoERP.Data\\bin\\ContosoERP.Data.dll',
        entitiesOrTables: ['Invoices', 'Customers', 'Documents'],
        detectedStoredProceduresOrQueries: ['sp_InsertInvoice', 'usp_GetCustomer'],
      },
    ],
    batchWorkers: [
      {
        workerName: 'BillingBatchWorker',
        projectName: 'BillingBatchWorker',
        technology: 'Console Batch Job / Worker',
        entryPointOrJobClass: 'BillingBatchWorker.Program',
        assemblyPath: 'C:\\cartella\\BillingBatchWorker\\bin\\BillingBatchWorker.exe',
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

    expect(screen.getByText(/Mappa Architetturale Sistema: ContosoERP.sln/i)).toBeInTheDocument()
    expect(screen.getAllByText('WsBillingService').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/ProcessInvoice/i)).toBeInTheDocument()
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

    expect(screen.getAllByText('ContosoErpDbContext').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('[TBL] Invoices')).toBeInTheDocument()
    expect(screen.getByText('[PROC] sp_InsertInvoice')).toBeInTheDocument()
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

    expect(handleOpen).toHaveBeenCalledWith('C:\\cartella\\ContosoERP.Service\\bin\\ContosoERP.Service.dll')
  })
})
