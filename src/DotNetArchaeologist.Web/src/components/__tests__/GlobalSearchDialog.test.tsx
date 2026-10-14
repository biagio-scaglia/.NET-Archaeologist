import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { GlobalSearchDialog } from '../GlobalSearchDialog'
import type { SolutionDescriptor, TreeNamespaceGroup } from '../../types/api'

describe('GlobalSearchDialog Component', () => {
  const sampleSolution: SolutionDescriptor = {
    name: 'GestPdc',
    solutionPath: 'C:\\test\\GestPdc.sln',
    totalProjects: 1,
    totalServices: 1,
    totalDatabases: 1,
    totalBatchWorkers: 1,
    projects: [
      {
        name: 'GestPdc.Web',
        relativePath: 'src/GestPdc.Web.csproj',
        category: 'Web',
        targetFramework: 'net48',
        projectReferences: [],
        assemblyExists: true,
        outputAssemblyPath: 'C:\\test\\GestPdc.Web.dll'
      }
    ],
    services: [
      {
        serviceName: 'AdminController',
        projectName: 'GestPdc.Web',
        technology: 'ASP.NET MVC Controller',
        contractInterface: null,
        implementationType: 'AdminController',
        assemblyPath: 'C:\\test\\GestPdc.Web.dll',
        endpoints: [
          {
            name: 'Index',
            httpMethodOrContract: 'GET',
            routeOrAction: '/Admin/Index',
            returnType: 'ActionResult',
            parameters: []
          }
        ]
      }
    ],
    databases: [
      {
        name: 'PdcDbContext',
        projectName: 'GestPdc.Data',
        technology: 'Entity Framework 6',
        baseTypeOrPattern: 'DbContext',
        assemblyPath: null,
        entitiesOrTables: ['Users', 'Roles'],
        detectedStoredProceduresOrQueries: []
      }
    ],
    batchWorkers: [
      {
        workerName: 'BillingSyncJob',
        projectName: 'GestPdc.Worker',
        technology: 'Console Scheduled Task',
        entryPointOrJobClass: 'Program.Main',
        triggersOrSchedules: ['0 0 * * *'],
        assemblyPath: null
      }
    ]
  }

  const sampleNamespaces: TreeNamespaceGroup[] = [
    {
      namespace: 'GestPdc.Core',
      types: [
        {
          fullName: 'GestPdc.Core.UserProfile',
          name: 'UserProfile',
          kind: 'Class',
          accessibility: 'Public',
          isAbstract: false,
          isSealed: false,
          isStatic: false,
          membersCount: 8
        }
      ]
    }
  ]

  it('renders indexed items and allows searching', () => {
    const handleSelectType = vi.fn()
    const handleClose = vi.fn()

    render(
      <GlobalSearchDialog
        isOpen={true}
        onClose={handleClose}
        solution={sampleSolution}
        assembly={null}
        namespaces={sampleNamespaces}
        onSelectType={handleSelectType}
        onOpenAssemblyPath={vi.fn()}
        onOpenSitemap={vi.fn()}
        onOpenSolution={vi.fn()}
      />
    )

    expect(screen.getByText(/Trova nel Sistema/i)).toBeInTheDocument()
    expect(screen.getByText('UserProfile')).toBeInTheDocument()
    expect(screen.getByText('AdminController')).toBeInTheDocument()

    // Filtra per termine specifico
    const input = screen.getByPlaceholderText(/Cerca classi, interfacce/i)
    fireEvent.change(input, { target: { value: 'Users' } })

    expect(screen.getByText('Users')).toBeInTheDocument()
  })

  it('triggers selection callback when item is clicked', () => {
    const handleSelectType = vi.fn()
    const handleClose = vi.fn()

    render(
      <GlobalSearchDialog
        isOpen={true}
        onClose={handleClose}
        solution={sampleSolution}
        assembly={null}
        namespaces={sampleNamespaces}
        onSelectType={handleSelectType}
        onOpenAssemblyPath={vi.fn()}
        onOpenSitemap={vi.fn()}
        onOpenSolution={vi.fn()}
      />
    )

    fireEvent.click(screen.getByText('UserProfile'))
    expect(handleSelectType).toHaveBeenCalledWith('GestPdc.Core.UserProfile')
    expect(handleClose).toHaveBeenCalled()
  })
})
