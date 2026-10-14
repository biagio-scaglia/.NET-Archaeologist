import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ExplorerTree } from '../ExplorerTree'
import { TreeNamespaceGroup } from '../../types/api'

describe('ExplorerTree Component', () => {
  const sampleNamespaces: TreeNamespaceGroup[] = [
    {
      namespace: 'System.Collections',
      types: [
        {
          fullName: 'System.Collections.ArrayList',
          name: 'ArrayList',
          kind: 'Class',
          accessibility: 'Public',
          isAbstract: false,
          isSealed: false,
          isStatic: false,
          membersCount: 10
        },
        {
          fullName: 'System.Collections.IList',
          name: 'IList',
          kind: 'Interface',
          accessibility: 'Public',
          isAbstract: true,
          isSealed: false,
          isStatic: false,
          membersCount: 5
        }
      ]
    }
  ]

  it('renders namespace and type items properly', () => {
    render(
      <ExplorerTree
        namespaces={sampleNamespaces}
        selectedTypeFullName={null}
        onSelectType={vi.fn()}
      />
    )

    expect(screen.getByText(/System.Collections \(2\)/)).toBeInTheDocument()
    expect(screen.getByText('ArrayList')).toBeInTheDocument()
    expect(screen.getByText('IList')).toBeInTheDocument()
  })

  it('triggers onSelectType when a type item is clicked', () => {
    const handleSelect = vi.fn()
    render(
      <ExplorerTree
        namespaces={sampleNamespaces}
        selectedTypeFullName={null}
        onSelectType={handleSelect}
      />
    )

    fireEvent.click(screen.getByText('ArrayList'))
    expect(handleSelect).toHaveBeenCalledWith('System.Collections.ArrayList')
  })

  it('filters types based on search input', () => {
    render(
      <ExplorerTree
        namespaces={sampleNamespaces}
        selectedTypeFullName={null}
        onSelectType={vi.fn()}
      />
    )

    const searchInput = screen.getByPlaceholderText('Filtra tipi...')
    fireEvent.change(searchInput, { target: { value: 'IList' } })

    expect(screen.getByText('IList')).toBeInTheDocument()
    expect(screen.queryByText('ArrayList')).not.toBeInTheDocument()

    // Clic sul pulsante X per azzerare
    const clearButton = screen.getByTitle('Azzera filtro di ricerca')
    fireEvent.click(clearButton)
    expect(screen.getByText('ArrayList')).toBeInTheDocument()
    expect(screen.getByText('IList')).toBeInTheDocument()
  })

  it('filters types by category buttons (Classi, Interfacce, Altro)', () => {
    render(
      <ExplorerTree
        namespaces={sampleNamespaces}
        selectedTypeFullName={null}
        onSelectType={vi.fn()}
      />
    )

    // Filtra solo Classi
    fireEvent.click(screen.getByTitle('Filtra solo classi e record'))
    expect(screen.getByText('ArrayList')).toBeInTheDocument()
    expect(screen.queryByText('IList')).not.toBeInTheDocument()

    // Filtra solo Interfacce
    fireEvent.click(screen.getByTitle('Filtra solo interfacce'))
    expect(screen.getByText('IList')).toBeInTheDocument()
    expect(screen.queryByText('ArrayList')).not.toBeInTheDocument()

    // Torna a Tutti
    fireEvent.click(screen.getByTitle('Mostra tutti i tipi compilati'))
    expect(screen.getByText('ArrayList')).toBeInTheDocument()
    expect(screen.getByText('IList')).toBeInTheDocument()
  })
})
