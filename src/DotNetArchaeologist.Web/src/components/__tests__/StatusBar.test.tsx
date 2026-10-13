import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StatusBar } from '../StatusBar'

describe('StatusBar Component', () => {
  it('renders status fields accurately', () => {
    render(
      <StatusBar
        statusText="Operazione completata"
        assemblyInfo="MyAssembly [.NET 8.0]"
        typesCount={42}
        selectedItem="MyClass"
      />
    )

    expect(screen.getByText('Operazione completata')).toBeInTheDocument()
    expect(screen.getByText('MyAssembly [.NET 8.0]')).toBeInTheDocument()
    expect(screen.getByText('Tipi: 42')).toBeInTheDocument()
    expect(screen.getByText('Selezionato: MyClass')).toBeInTheDocument()
  })

  it('renders default values when props are absent', () => {
    render(
      <StatusBar statusText="Pronto" />
    )

    expect(screen.getByText('Pronto')).toBeInTheDocument()
    expect(screen.getByText('Nessun assembly aperto')).toBeInTheDocument()
    expect(screen.getByText('Tipi: 0')).toBeInTheDocument()
    expect(screen.getByText('Nessuna selezione')).toBeInTheDocument()
  })
})
