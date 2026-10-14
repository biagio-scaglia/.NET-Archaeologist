import React, { useState, useMemo, useDeferredValue } from 'react'
import type { TreeNamespaceGroup, TreeTypeItem } from '../types/api'

interface ExplorerTreeProps {
  namespaces: TreeNamespaceGroup[]
  selectedTypeFullName: string | null
  onSelectType: (fullName: string) => void
}

type KindFilter = 'all' | 'class' | 'interface' | 'other'

const INITIAL_VISIBLE_PER_NS = 80

export const ExplorerTree: React.FC<ExplorerTreeProps> = ({
  namespaces,
  selectedTypeFullName,
  onSelectType
}) => {
  const [expandedNamespaces, setExpandedNamespaces] = useState<Record<string, boolean>>({})
  const [visibleLimits, setVisibleLimits] = useState<Record<string, number>>({})
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [kindFilter, setKindFilter] = useState<KindFilter>('all')

  // Deferred value per garantire rendering fluido a 60 FPS durante la digitazione in cataloghi di migliaia di tipi
  const deferredSearch = useDeferredValue(searchTerm)

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

  const handleShowMore = (ns: string, currentLimit: number, total: number) => {
    setVisibleLimits(prev => ({
      ...prev,
      [ns]: Math.min(currentLimit + 100, total)
    }))
  }

  const handleShowAll = (ns: string, total: number) => {
    setVisibleLimits(prev => ({
      ...prev,
      [ns]: total
    }))
  }

  const filteredNamespaces = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()

    return namespaces
      .map(nsGroup => {
        let matchingTypes = nsGroup.types

        // Filtro per tipologia costrutto
        if (kindFilter === 'class') {
          matchingTypes = matchingTypes.filter(t => t.kind.toLowerCase() === 'class' || t.kind.toLowerCase() === 'record')
        } else if (kindFilter === 'interface') {
          matchingTypes = matchingTypes.filter(t => t.kind.toLowerCase() === 'interface')
        } else if (kindFilter === 'other') {
          matchingTypes = matchingTypes.filter(t => t.kind.toLowerCase() === 'struct' || t.kind.toLowerCase() === 'enum' || t.kind.toLowerCase() === 'delegate')
        }

        // Filtro per ricerca testuale
        if (query) {
          matchingTypes = matchingTypes.filter(t =>
            t.name.toLowerCase().includes(query) || t.fullName.toLowerCase().includes(query)
          )
        }

        return {
          namespace: nsGroup.namespace,
          types: matchingTypes
        }
      })
      .filter(nsGroup => nsGroup.types.length > 0 || (query && nsGroup.namespace.toLowerCase().includes(query)))
  }, [namespaces, deferredSearch, kindFilter])

  const totalTypesCount = useMemo(() => {
    return filteredNamespaces.reduce((acc, ns) => acc + ns.types.length, 0)
  }, [filteredNamespaces])

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
      {/* Barra di filtro rapido e pulsanti di espansione */}
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

      {/* Filtri rapidi per categoria di tipo */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 4, fontSize: '10px' }}>
        <button
          type="button"
          onClick={() => setKindFilter('all')}
          style={{
            flex: 1,
            padding: '1px 2px',
            fontSize: '10px',
            fontWeight: kindFilter === 'all' ? 'bold' : 'normal',
            backgroundColor: kindFilter === 'all' ? '#c0c0c0' : undefined
          }}
        >
          Tutti ({totalTypesCount})
        </button>
        <button
          type="button"
          onClick={() => setKindFilter('class')}
          style={{
            flex: 1,
            padding: '1px 2px',
            fontSize: '10px',
            fontWeight: kindFilter === 'class' ? 'bold' : 'normal',
            backgroundColor: kindFilter === 'class' ? '#c0c0c0' : undefined
          }}
        >
          [C] Classi
        </button>
        <button
          type="button"
          onClick={() => setKindFilter('interface')}
          style={{
            flex: 1,
            padding: '1px 2px',
            fontSize: '10px',
            fontWeight: kindFilter === 'interface' ? 'bold' : 'normal',
            backgroundColor: kindFilter === 'interface' ? '#c0c0c0' : undefined
          }}
        >
          [I] Interfacce
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
              const limit = visibleLimits[nsGroup.namespace] ?? INITIAL_VISIBLE_PER_NS
              const visibleTypes = nsGroup.types.slice(0, limit)
              const hasMore = nsGroup.types.length > limit

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
                      {visibleTypes.map((typeItem: TreeTypeItem) => {
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

                      {hasMore && (
                        <li style={{ listStyleType: 'none', padding: '4px 0 2px 4px' }}>
                          <span style={{ fontSize: '10px', color: '#555', marginRight: 4 }}>
                            Mostrati {limit} di {nsGroup.types.length} tipi:
                          </span>
                          <button
                            type="button"
                            onClick={() => handleShowMore(nsGroup.namespace, limit, nsGroup.types.length)}
                            style={{ fontSize: '10px', padding: '0 4px', marginRight: 4 }}
                          >
                            [+100]
                          </button>
                          <button
                            type="button"
                            onClick={() => handleShowAll(nsGroup.namespace, nsGroup.types.length)}
                            style={{ fontSize: '10px', padding: '0 4px' }}
                          >
                            [Tutti ({nsGroup.types.length})]
                          </button>
                        </li>
                      )}
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
