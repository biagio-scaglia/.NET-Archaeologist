import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AssemblyInsightsDialog } from '../AssemblyInsightsDialog'
import type { AssemblyDescriptor } from '../../types/api'

const mockAssembly: AssemblyDescriptor = {
  name: 'LegacyEnterpriseApp',
  version: '2.1.0.0',
  culture: null,
  publicKeyToken: null,
  targetFramework: '.NETFramework,Version=v4.5',
  mvid: '00000000-0000-0000-0000-000000000000',
  totalTypesCount: 2,
  references: [
    { name: 'System.Web', version: '4.0.0.0', culture: null, publicKeyToken: null }
  ],
  types: [],
  userStrings: [
    { value: 'SELECT * FROM Utenti WHERE Attivo = 1', category: 'Sql' },
    { value: 'Server=sqlserver.local;Database=ProdDb;', category: 'Connection' },
    { value: 'https://api.legacy.com/v1/auth', category: 'Url' },
    { value: 'Testo di log generico', category: 'General' }
  ],
  modernizationFindings: [
    {
      category: 'LegacyTechnology',
      target: 'System.Web',
      severity: 'Critical',
      description: 'Dipendenza da ASP.NET Legacy.',
      recommendation: 'Migrare a Minimal API o Controller ASP.NET Core.'
    }
  ],
  manifestResources: [
    {
      name: 'LegacyEnterpriseApp.Properties.Resources.resources',
      visibility: 'Public',
      offset: 1024,
      resourceType: 'CompiledResources'
    }
  ]
}

describe('AssemblyInsightsDialog Component', () => {
  it('renders strings tab with categories and search correctly', () => {
    const handleClose = vi.fn()
    render(
      <AssemblyInsightsDialog
        isOpen={true}
        onClose={handleClose}
        assembly={mockAssembly}
      />
    )

    expect(screen.getByText(/Ispezione Avanzata: Stringhe Costanti/i)).toBeInTheDocument()
    expect(screen.getByText('SELECT * FROM Utenti WHERE Attivo = 1')).toBeInTheDocument()
    expect(screen.getByText('Server=sqlserver.local;Database=ProdDb;')).toBeInTheDocument()

    // Filtra per SQL
    const sqlButton = screen.getByRole('button', { name: /SQL Inline/i })
    fireEvent.click(sqlButton)
    expect(screen.getByText('SELECT * FROM Utenti WHERE Attivo = 1')).toBeInTheDocument()
    expect(screen.queryByText('https://api.legacy.com/v1/auth')).not.toBeInTheDocument()
  })

  it('switches to modernization audit and manifests resources tabs', () => {
    const handleClose = vi.fn()
    render(
      <AssemblyInsightsDialog
        isOpen={true}
        onClose={handleClose}
        assembly={mockAssembly}
      />
    )

    // Passa al tab Modernizzazione
    const modTab = screen.getByRole('button', { name: /Audit Modernizzazione/i })
    fireEvent.click(modTab)

    expect(screen.getByText('System.Web')).toBeInTheDocument()
    expect(screen.getByText(/Severita: Critical/i)).toBeInTheDocument()
    expect(screen.getByText(/Migrare a Minimal API/i)).toBeInTheDocument()

    // Passa al tab Risorse Embeddate
    const resTab = screen.getByRole('button', { name: /Risorse Embeddate/i })
    fireEvent.click(resTab)

    expect(screen.getByText('LegacyEnterpriseApp.Properties.Resources.resources')).toBeInTheDocument()
    expect(screen.getByText('CompiledResources')).toBeInTheDocument()
  })
})
