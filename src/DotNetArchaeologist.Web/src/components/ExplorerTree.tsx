import React, { useState, useMemo } from 'react'
import type { TreeNamespaceGroup, TreeTypeItem } from '../types/api'

interface ExplorerTreeProps {
  namespaces: TreeNamespaceGroup[]
  selectedTypeFullName: string | null
  onSelectType: (fullName: string) => void
}

export const ExplorerTree: React.FC<ExplorerTreeProps> = ({
  namespaces,
  selectedTypeFullName,
  onSelectType
}) => {
  const [expandedNamespaces, setExpandedNamespaces] = useState<Record<string, boolean>>({})
  const [searchTerm, setSearchTerm] = useState<string>('')

  const toggleNamespace = (ns: string) => {
    setExpandedNamespaces(prev => ({
      ...prev,
      [ns]: !prev[ns]
    }))
  }

  const expandAll = () => {
    const next: Record<string, boolean> = {}
    namespaces.forEach(n => { next[n.namespace] = true })
    setExpandedNamespaces(next)
  }

  const collapseAll = () => {
    setExpandedNamespaces({})
  }

  const filteredNamespaces = useMemo(() => {
    if (!searchTerm.trim()) return namespaces

    const query = searchTerm.toLowerCase()
    return namespaces
      .map(nsGroup => {
        const matchingTypes = nsGroup.types.filter(t =>
          t.name.toLowerCase().includes(query) || t.fullName.toLowerCase().includes(query)
        )
        return {
          namespace: nsGroup.namespace,
          types: matchingTypes
        }
      })
      .filter(nsGroup => nsGroup.types.length > 0 || nsGroup.namespace.toLowerCase().includes(query))
  }, [namespaces, searchTerm])

  const getKindBadgeClass = (kind: string) => {
    switch (kind.toLowerCase()) {
      case 'interface': return 'badge-interface'
      case 'struct': return 'badge-struct'
      case 'enum': return 'badge-enum'
      default: return 'badge-class'
    }
  }

  const getKindAbbreviation = (kind: string) => {
    switch (kind.toLowerCase()) {
      case 'class': return 'C'
      case 'interface': return 'I'
      case 'struct': return 'S'
      case 'enum': return 'E'
      case 'record': return 'R'
      case 'delegate': return 'D'
      default: return 'T'
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Barra di filtro e controlli di espansione */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 4, alignItems: 'center' }}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filtra tipi..."
          style={{ flex: 1, height: 21, boxSizing: 'border-box' }}
        />
        <button type="button" onClick={expandAll} title="Espandi tutti i namespace" style={{ padding: '0 4px', height: 21 }}>
          [+]
        </button>
        <button type="button" onClick={collapseAll} title="Comprimi tutti i namespace" style={{ padding: '0 4px', height: 21 }}>
          [-]
        </button>
      </div>

      <div className="tree-container">
        {filteredNamespaces.length === 0 ? (
          <div style={{ padding: 8, color: '#666', fontStyle: 'italic' }}>
            {namespaces.length === 0 ? 'Nessun assembly caricato.' : 'Nessun tipo corrispondente al filtro.'}
          </div>
        ) : (
          <ul className="tree-view" style={{ margin: 0, padding: 0 }}>
            {filteredNamespaces.map(nsGroup => {
              const isExpanded = expandedNamespaces[nsGroup.namespace] ?? true
              return (
                <li key={nsGroup.namespace} style={{ listStyleType: 'none', marginBottom: 2 }}>
                  <div
                    className="tree-node"
                    onClick={() => toggleNamespace(nsGroup.namespace)}
                    style={{ fontWeight: 'bold' }}
                  >
                    <span style={{ fontFamily: 'monospace', marginRight: 4 }}>
                      {isExpanded ? '[-]' : '[+]'}
                    </span>
                    <span>{nsGroup.namespace} ({nsGroup.types.length})</span>
                  </div>

                  {isExpanded && (
                    <ul style={{ margin: '2px 0 2px 14px', padding: 0 }}>
                      {nsGroup.types.map((typeItem: TreeTypeItem) => {
                        const isSelected = selectedTypeFullName === typeItem.fullName
                        return (
                          <li
                            key={typeItem.fullName}
                            style={{ listStyleType: 'none' }}
                          >
                            <div
                              className={`tree-node ${isSelected ? 'selected' : ''}`}
                              onClick={() => onSelectType(typeItem.fullName)}
                            >
                              <span className={`badge-kind ${getKindBadgeClass(typeItem.kind)}`}>
                                {getKindAbbreviation(typeItem.kind)}
                              </span>
                              <span>{typeItem.name}</span>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
