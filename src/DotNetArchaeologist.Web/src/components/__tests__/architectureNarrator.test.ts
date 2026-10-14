import { describe, it, expect } from 'vitest'
import { narrateArchitectureConnections } from '../../utils/architectureNarrator'
import type { DiagramNodeLike, DiagramEdgeLike } from '../../utils/architectureNarrator'

describe('architectureNarrator', () => {
  const mockNodes: DiagramNodeLike[] = [
    {
      id: 'web-Contoso.Web',
      title: 'Contoso.Web',
      category: 'Web',
      technology: 'ASP.NET MVC',
      items: ['HomeController']
    },
    {
      id: 'svc-Contoso.Service',
      title: 'BillingService',
      category: 'Service',
      technology: 'WCF Service (SOAP)',
      items: ['ProcessInvoice']
    },
    {
      id: 'db-Contoso.Data',
      title: 'ContosoDbContext',
      category: 'Database',
      technology: 'Entity Framework (ObjectContext)',
      items: ['Invoices', 'Customers']
    }
  ]

  const mockEdges: DiagramEdgeLike[] = [
    {
      fromId: 'web-Contoso.Web',
      toId: 'svc-Contoso.Service',
      label: 'calls',
      style: 'dependency'
    },
    {
      fromId: 'svc-Contoso.Service',
      toId: 'db-Contoso.Data',
      label: 'persists',
      style: 'data'
    }
  ]

  it('generates global system topology walkthrough when no node or edge is selected', () => {
    const narration = narrateArchitectureConnections(mockNodes, mockEdges, null, null, null)

    expect(narration.headline).toContain("L'Archeologo Spiega la Topologia")
    expect(narration.badge).toBe('PANORAMA DI RETE COMPLETO')
    expect(narration.walkthrough).toContain('Benvenuto nella mappa delle connessioni del sistema!')
    expect(narration.interactiveQuestions.length).toBeGreaterThanOrEqual(1)
  })

  it('generates node-specific narrative with inflow, outflow and modern advice when a node is selected', () => {
    const svcNode = mockNodes[1]
    const narration = narrateArchitectureConnections(mockNodes, mockEdges, svcNode, null, null)

    expect(narration.headline).toContain('BillingService')
    expect(narration.badge).toContain('SERVICE')
    expect(narration.walkthrough).toContain('BillingService')
    expect(narration.inflow.length).toBe(1)
    expect(narration.inflow[0].connectedNodeTitle).toBe('Contoso.Web')
    expect(narration.outflow.length).toBe(1)
    expect(narration.outflow[0].connectedNodeTitle).toBe('ContosoDbContext')
    expect(narration.recommendation).toContain('WCF')
  })

  it('generates edge-specific narrative when a data edge is selected', () => {
    const dataEdge = mockEdges[1]
    const narration = narrateArchitectureConnections(mockNodes, mockEdges, null, dataEdge, null)

    expect(narration.headline).toContain('BillingService ➔ ContosoDbContext')
    expect(narration.badge).toBe('COLLEGAMENTO [DATA]')
    expect(narration.walkthrough).toContain('flusso diretto verso la banca dati')
  })

  it('generates edge-specific narrative when an interface edge is selected', () => {
    const ifaceEdge: DiagramEdgeLike = {
      fromId: 'svc-Contoso.Service',
      toId: 'iface-IBilling',
      label: 'implements',
      style: 'implements'
    }
    const narration = narrateArchitectureConnections(mockNodes, [ifaceEdge], null, ifaceEdge, null)

    expect(narration.badge).toBe('COLLEGAMENTO [IMPLEMENTS]')
    expect(narration.walkthrough).toContain('contratto astratto')
  })
})
