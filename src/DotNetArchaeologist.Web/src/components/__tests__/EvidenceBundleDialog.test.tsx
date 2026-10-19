import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EvidenceBundleDialog } from '../EvidenceBundleDialog'
import * as evidenceService from '../../services/evidenceBundle'
import { EvidenceBundle } from '../../types/api'

describe('EvidenceBundleDialog Component', () => {
  const mockBundle: EvidenceBundle = {
    format: 'DotNetArchaeologist.EvidenceBundle',
    version: '1.0.0',
    bundleId: 'bundle-test-123',
    targetName: 'LegacyModule.dll',
    targetSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    targetKind: 'Assembly',
    createdAtUtc: new Date().toISOString(),
    summary: 'Bundle di prova per test',
    records: [
      {
        evidenceId: 'ev_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        category: 'AssemblyHeader',
        title: 'Ispezione intestazione ECMA-335',
        description: 'Target runtime net48 con MVID verificato.',
        subject: 'LegacyModule',
        confidence: 1.0,
        timestampUtc: new Date().toISOString(),
        attributes: {
          TargetFramework: '.NETFramework,Version=v4.8',
          TypeCount: 15
        }
      },
      {
        evidenceId: 'ev_9999456789abcdef0123456789abcdef0123456789abcdef0123456789999999',
        category: 'ServiceContract',
        title: 'Servizio WCF rilevato',
        description: 'Contratto IOrderService con 3 endpoint.',
        subject: 'IOrderService',
        confidence: 0.95,
        timestampUtc: new Date().toISOString(),
        attributes: {
          Technology: 'WCF SOAP'
        }
      }
    ],
    metadata: {
      TargetFramework: '.NETFramework,Version=v4.8'
    }
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <EvidenceBundleDialog
        isOpen={false}
        onClose={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('loads and displays evidence records for an active session', async () => {
    vi.spyOn(evidenceService, 'fetchAssemblyEvidenceBundle').mockResolvedValue(mockBundle)

    render(
      <EvidenceBundleDialog
        isOpen={true}
        onClose={vi.fn()}
        currentSessionId="sess-1"
        targetName="LegacyModule.dll"
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/Ispezione intestazione ECMA-335/i)).toBeInTheDocument()
      expect(screen.getByText(/Servizio WCF rilevato/i)).toBeInTheDocument()
    })

    expect(screen.getByText(/ev_01234567/i)).toBeInTheDocument()
  })

  it('shows detailed attributes and canonical REA ID when selecting an evidence record', async () => {
    vi.spyOn(evidenceService, 'fetchAssemblyEvidenceBundle').mockResolvedValue(mockBundle)

    render(
      <EvidenceBundleDialog
        isOpen={true}
        onClose={vi.fn()}
        currentSessionId="sess-1"
        targetName="LegacyModule.dll"
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/Ispezione intestazione ECMA-335/i)).toBeInTheDocument()
    })

    const recordRow = screen.getByText(/Ispezione intestazione ECMA-335/i)
    fireEvent.click(recordRow)

    expect(screen.getByText(/ID Canonico REA:/i)).toBeInTheDocument()
    expect(screen.getByText(/ev_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef/i)).toBeInTheDocument()
    expect(screen.getByText(/Attributi Osservati \(Zero-Execution\):/i)).toBeInTheDocument()
  })

  it('switches to import tab and allows validating JSON bundles', async () => {
    render(
      <EvidenceBundleDialog
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    const importTab = screen.getByText(/Importa \/ Valida/i)
    fireEvent.click(importTab)

    expect(screen.getByText(/Carica un file Evidence Bundle JSON/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /\[Valida e Visualizza Bundle\]/i })).toBeInTheDocument()
  })
})
