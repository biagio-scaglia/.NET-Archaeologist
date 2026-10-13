import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { DecompilerView } from '../DecompilerView'

describe('DecompilerView Component', () => {
  it('renders placeholder message when no type is selected', () => {
    render(
      <DecompilerView
        selectedType={null}
        code=""
        loading={false}
      />
    )

    expect(screen.getByText(/Seleziona un tipo dall'albero a sinistra/)).toBeInTheDocument()
  })

  it('renders decompiled C# source code when provided', () => {
    const csharpCode = 'public class SampleClass { public void Run() {} }'
    render(
      <DecompilerView
        selectedType="SampleClass"
        code={csharpCode}
        loading={false}
      />
    )

    expect(screen.getByText('SampleClass')).toBeInTheDocument()
    expect(screen.getByText(/public class SampleClass/)).toBeInTheDocument()
  })

  it('renders loading indicator when decompiling', () => {
    render(
      <DecompilerView
        selectedType="SampleClass"
        code=""
        loading={true}
      />
    )

    expect(screen.getByText(/Decompilazione in corso con ICSharpCode.Decompiler/)).toBeInTheDocument()
  })
})
