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
      sizeInBytes: 4096,
      resourceType: 'CompiledResources',
      humanDescription: 'Dizionario testi e icone'
    },
    {
      name: 'LegacyEnterpriseApp.Assets.logo.png',
      visibility: 'Public',
      offset: 5120,
      sizeInBytes: 15420,
      resourceType: 'ImagePng',
      mimeType: 'image/png',
      previewDataUri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      humanDescription: 'Logo aziendale incorporato'
    }
  ]
}

describe('AssemblyInsightsDialog Component', () => {
  it('renders non-technical overview tab with functional summary and glossary', () => {
    const handleClose = vi.fn()
    render(
      <AssemblyInsightsDialog
        isOpen={true}
        onClose={handleClose}
        assembly={mockAssembly}
      />
    )

    expect(screen.getByText(/Che cos'è e che cosa fa questo file\? \(Sintesi Funzionale\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Piccolo Glossario: Capire i termini tecnici/i)).toBeInTheDocument()
    expect(screen.getByText(/Che cos'è un Assembly/i)).toBeInTheDocument()
  })

  it('renders visual asset gallery and resources table with previews', () => {
    const handleClose = vi.fn()
    render(
      <AssemblyInsightsDialog
        isOpen={true}
        onClose={handleClose}
        assembly={mockAssembly}
      />
    )

    // Passa al tab Asset Grafici & Risorse
    const assetTab = screen.getByRole('button', { name: /Asset Grafici & Risorse/i })
    fireEvent.click(assetTab)

    expect(screen.getByText(/Galleria Immagini & Icone/i)).toBeInTheDocument()
    expect(screen.getByText('LegacyEnterpriseApp.Assets.logo.png')).toBeInTheDocument()
    expect(screen.getByText('Logo aziendale incorporato')).toBeInTheDocument()
  })

  it('filters strings and shows modernization audit correctly', () => {
    const handleClose = vi.fn()
    render(
      <AssemblyInsightsDialog
        isOpen={true}
        onClose={handleClose}
        assembly={mockAssembly}
      />
    )

    // Passa al tab Stringhe
    const strTab = screen.getByRole('button', { name: /Costanti & Stringhe/i })
    fireEvent.click(strTab)

    expect(screen.getByText('SELECT * FROM Utenti WHERE Attivo = 1')).toBeInTheDocument()
    expect(screen.getByText('Server=sqlserver.local;Database=ProdDb;')).toBeInTheDocument()

    // Filtra per SQL
    const sqlButton = screen.getByRole('button', { name: /SQL Inline/i })
    fireEvent.click(sqlButton)
    expect(screen.getByText('SELECT * FROM Utenti WHERE Attivo = 1')).toBeInTheDocument()
    expect(screen.queryByText('https://api.legacy.com/v1/auth')).not.toBeInTheDocument()

    // Passa al tab Modernizzazione
    const modTab = screen.getByRole('button', { name: /Audit Modernizzazione/i })
    fireEvent.click(modTab)
    expect(screen.getByText('System.Web')).toBeInTheDocument()
    expect(screen.getByText(/Severita: Critical/i)).toBeInTheDocument()
  })
})
