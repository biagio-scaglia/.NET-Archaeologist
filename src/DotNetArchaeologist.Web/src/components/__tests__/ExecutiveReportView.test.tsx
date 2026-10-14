import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ExecutiveReportView } from '../ExecutiveReportView'
import type { ExecutiveReport } from '../../types/api'

describe('ExecutiveReportView Component', () => {
  const mockReport: ExecutiveReport = {
    title: 'Report Architetturale Esecutivo: ContosoERP',
    targetName: 'ContosoERP',
    targetType: 'Solution',
    generatedAt: '2026-10-14T10:00:00.000Z',
    executiveSummary: "L'analisi architetturale condotta sulla soluzione 'ContosoERP' evidenzia un'architettura enterprise legacy con servizi WCF e accesso diretto a database.",
    conversationalWalkthrough: "Benvenuto nell'audit di ContosoERP! Questo sistema presenta una struttura N-Tier classica degli anni 2010.",
    naturalLanguageInsights: [
      {
        question: 'Come sono gestite le chiamate di rete?',
        answer: 'I contratti WCF operano su protocollo SOAP.',
        topic: 'Network'
      }
    ],
    techDebtScore: 75,
    techDebtRating: 'D - Legacy Critico (Consigliata Migrazione)',
    architecturalStyle: 'Monolite N-Tier Enterprise con Servizi SOAP WCF e Processi Batch',
    keyFindings: [
      'Rilevati 2 servizi con 1 operazione esposta.',
      'Rilevati contratti WCF SOAP privi di supporto nativo in .NET 8.'
    ],
    serviceCatalog: [
      {
        serviceName: 'WsBillingService',
        technology: 'WCF Service (SOAP)',
        contractInterface: 'IWsBillingService',
        endpointsCount: 1,
        exposedEndpoints: ['ProcessInvoice'],
        migrationRecommendation: 'Migrare verso ASP.NET Core Minimal APIs o gRPC.'
      }
    ],
    dataPersistence: [
      {
        contextName: 'ContosoErpDbContext',
        technology: 'Entity Framework',
        tables: ['Invoices', 'Customers'],
        storedProcedures: ['sp_InsertInvoice'],
        architecturalImpact: 'Alto: presenza di stored procedure su database.'
      }
    ],
    batchWorkers: [
      {
        workerName: 'BillingBatchWorker',
        entryPoint: 'BillingBatchWorker.Program.Main',
        triggers: ['Console EntryPoint (Main)'],
        containerizationRecommendation: 'Incapsulare in un container Docker / Kubernetes CronJob.'
      }
    ],
    identifiedRisks: [
      {
        category: 'Obsolescenza',
        title: 'Contratti WCF Legacy',
        severity: 'Alta',
        description: 'WCF non è supportato in .NET Core/.NET 8 su Linux.',
        mitigation: 'Convertire in Minimal APIs.'
      }
    ],
    modernizationRoadmap: [
      {
        phase: 1,
        title: 'Disaccoppiamento API',
        objective: 'Esporre un canale REST moderno.',
        details: 'Implementazione di Minimal APIs parallele.',
        complexity: 'Media',
        riskLevel: 'Basso'
      }
    ],
    markdownContent: '# Report Architetturale Esecutivo: ContosoERP\n\n- Debito: 75/100\n\n## 1. Sintesi Esecutiva'
  }

  it('renders report title, tech debt score and executive summary', () => {
    const handleClose = vi.fn()
    render(<ExecutiveReportView report={mockReport} onClose={handleClose} />)

    expect(screen.getAllByText(/Report Architetturale Esecutivo: ContosoERP/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('75 / 100')).toBeInTheDocument()
    expect(screen.getByText(/D - Legacy Critico/i)).toBeInTheDocument()
    expect(screen.getByText(/L'analisi architetturale condotta sulla soluzione 'ContosoERP'/i)).toBeInTheDocument()
    expect(screen.getByText('WsBillingService')).toBeInTheDocument()
    expect(screen.getByText('ContosoErpDbContext')).toBeInTheDocument()
    expect(screen.getAllByText(/BillingBatchWorker/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/\[ALTA\] Contratti WCF Legacy/i)).toBeInTheDocument()
    expect(screen.getByText(/Benvenuto nell'audit di ContosoERP!/i)).toBeInTheDocument()
    expect(screen.getByText(/Come sono gestite le chiamate di rete\?/i)).toBeInTheDocument()
    expect(screen.getByText(/I contratti WCF operano su protocollo SOAP\./i)).toBeInTheDocument()
  })

  it('triggers window.print and clipboard actions', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})
    const clipboardSpy = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: {
        writeText: clipboardSpy
      }
    })

    render(<ExecutiveReportView report={mockReport} />)

    const printBtn = screen.getByRole('button', { name: /\[Stampa \/ Esporta PDF\]/i })
    fireEvent.click(printBtn)
    expect(printSpy).toHaveBeenCalled()

    const copyBtn = screen.getByRole('button', { name: /\[Copia\]/i })
    await act(async () => {
      fireEvent.click(copyBtn)
    })
    expect(clipboardSpy).toHaveBeenCalledWith(mockReport.markdownContent)

    printSpy.mockRestore()
  })

  it('switches between visual document and raw markdown view', () => {
    render(<ExecutiveReportView report={mockReport} />)

    const mdBtn = screen.getByRole('button', { name: /\[Sorgente Markdown\]/i })
    fireEvent.click(mdBtn)

    expect(screen.getByText(/# Report Architetturale Esecutivo: ContosoERP/i)).toBeInTheDocument()

    const visualBtn = screen.getByRole('button', { name: /\[Documento Impaginato\]/i })
    fireEvent.click(visualBtn)

    expect(screen.getByText(/1. Sintesi Esecutiva Narrativa/i)).toBeInTheDocument()
  })

  it('renders loading state when loading is true', () => {
    render(<ExecutiveReportView report={null} loading={true} />)
    expect(screen.getByText(/Generazione del Report Esecutivo in linguaggio naturale/i)).toBeInTheDocument()
  })
})
