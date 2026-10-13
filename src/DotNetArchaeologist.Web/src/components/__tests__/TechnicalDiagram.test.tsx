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
})
