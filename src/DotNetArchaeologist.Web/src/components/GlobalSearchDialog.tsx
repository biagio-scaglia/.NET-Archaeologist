import React, { useState, useMemo, useEffect, useRef } from 'react'
import type {
  SolutionDescriptor,
  AssemblyDescriptor,
  TreeNamespaceGroup
} from '../types/api'

export interface SearchResultItem {
  id: string
  title: string
  subtitle: string
  category: 'Class' | 'Interface' | 'Type' | 'Service' | 'Endpoint' | 'Database' | 'Table' | 'Batch' | 'Project'
  badgeText: string
  badgeClass: string
  action: () => void
}

interface GlobalSearchDialogProps {
  isOpen: boolean
  onClose: () => void
  solution: SolutionDescriptor | null
  assembly: AssemblyDescriptor | null
  namespaces: TreeNamespaceGroup[]
  onSelectType: (fullName: string) => void
  onOpenAssemblyPath: (assemblyPath: string) => void
  onOpenSitemap: () => void
  onOpenSolution: () => void
  onOpenInsights?: () => void
}

export const GlobalSearchDialog: React.FC<GlobalSearchDialogProps> = ({
  isOpen,
  onClose,
  solution,
  assembly,
  namespaces,
  onSelectType,
  onOpenAssemblyPath,
  onOpenSitemap,
  onOpenSolution,
  onOpenInsights
}) => {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setQuery('')
        setSelectedIndex(0)
        inputRef.current?.focus()
      }, 10)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Indicizzazione unificata di tutti i costrutti del sistema
  const allItems: SearchResultItem[] = useMemo(() => {
    const items: SearchResultItem[] = []

    // 1. Tipi compilati (Classi, Interfacce, Enum, Struct)
    namespaces.forEach(ns => {
      ns.types.forEach(t => {
        const k = t.kind.toLowerCase()
        const isIface = k === 'interface'
        const isClass = k === 'class' || k === 'record'
        const category: SearchResultItem['category'] = isIface ? 'Interface' : isClass ? 'Class' : 'Type'
        const badgeClass = isIface ? 'badge-interface' : isClass ? 'badge-class' : 'badge-struct'

        items.push({
          id: `type-${t.fullName}`,
          title: t.name,
          subtitle: `${t.kind} in ${ns.namespace} (${t.membersCount} membri)`,
          category,
          badgeText: isIface ? 'IFACE' : isClass ? 'CLASS' : t.kind.toUpperCase(),
          badgeClass,
          action: () => {
            onSelectType(t.fullName)
            onClose()
          }
        })
      })
    })

    // 2. Servizi e Controller della Solution
    if (solution) {
      solution.services.forEach(svc => {
        items.push({
          id: `svc-${svc.projectName}_${svc.serviceName}`,
          title: svc.serviceName,
          subtitle: `Servizio ${svc.technology} - Progetto: ${svc.projectName}`,
          category: 'Service',
          badgeText: 'SVC/API',
          badgeClass: 'badge-interface',
          action: () => {
            if (svc.assemblyPath) {
              onOpenAssemblyPath(svc.assemblyPath)
            } else {
              onOpenSitemap()
            }
            onClose()
          }
        })

        // Endpoints esposti
        svc.endpoints.forEach(ep => {
          items.push({
            id: `ep-${svc.serviceName}_${ep.name}`,
            title: `${svc.serviceName}.${ep.name}()`,
            subtitle: `Operazione [${ep.httpMethodOrContract || 'ACTION'}] -> Ritorna: ${ep.returnType || 'void'}`,
            category: 'Endpoint',
            badgeText: 'OPERAZ.',
            badgeClass: 'badge-class',
            action: () => {
              if (svc.assemblyPath) {
                onOpenAssemblyPath(svc.assemblyPath)
              } else {
                onOpenSitemap()
              }
              onClose()
            }
          })
        })
      })

      // 3. Database, Tabelle ed Entità
      solution.databases.forEach(db => {
        items.push({
          id: `db-${db.name}`,
          title: db.name,
          subtitle: `Modulo Dati (${db.technology}) - ${db.entitiesOrTables.length} entità mappate`,
          category: 'Database',
          badgeText: 'DB CONTEXT',
          badgeClass: 'badge-struct',
          action: () => {
            onOpenSitemap()
            onClose()
          }
        })

        db.entitiesOrTables.forEach(table => {
          items.push({
            id: `tbl-${db.name}_${table}`,
            title: table,
            subtitle: `Entità / Tabella in ${db.name} (${db.technology})`,
            category: 'Table',
            badgeText: 'TABELLA',
            badgeClass: 'badge-enum',
            action: () => {
              onOpenSitemap()
              onClose()
            }
          })
        })
      })

      // 4. Processi Batch
      solution.batchWorkers.forEach(batch => {
        items.push({
          id: `batch-${batch.workerName}`,
          title: batch.workerName,
          subtitle: `Worker Asincrono (${batch.technology}) - EntryPoint: ${batch.entryPointOrJobClass || 'Main'}`,
          category: 'Batch',
          badgeText: 'BATCH JOB',
          badgeClass: 'badge-class',
          action: () => {
            onOpenSitemap()
            onClose()
          }
        })
      })

      // 5. Progetti Solution
      solution.projects.forEach(proj => {
        items.push({
          id: `proj-${proj.name}`,
          title: proj.name,
          subtitle: `Progetto [${proj.category.toUpperCase()}] - ${proj.relativePath}`,
          category: 'Project',
          badgeText: 'PROGETTO',
          badgeClass: 'badge-class',
          action: () => {
            if (proj.outputAssemblyPath && proj.assemblyExists) {
              onOpenAssemblyPath(proj.outputAssemblyPath)
            } else {
              onOpenSolution()
            }
            onClose()
          }
        })
      })
    }

    // 6. Assembly corrente e relative dipendenze/referenze
    if (assembly) {
      items.push({
        id: `asm-${assembly.name}`,
        title: assembly.name,
        subtitle: `Assembly Attivo (${assembly.targetFramework || '.NET'}) - ${assembly.totalTypesCount} tipi analizzati`,
        category: 'Project',
        badgeText: 'ASSEMBLY',
        badgeClass: 'badge-class',
        action: () => {
          onClose()
        }
      })

      assembly.references.forEach(ref => {
        items.push({
          id: `ref-${ref.name}`,
          title: ref.name,
          subtitle: `Referenza dipendente di ${assembly.name}${ref.version ? ` (v${ref.version})` : ''}`,
          category: 'Type',
          badgeText: 'REF DLL',
          badgeClass: 'badge-interface',
          action: () => {
            onClose()
          }
        })
      })

      // Risorse incorporate
      assembly.manifestResources?.forEach(res => {
        items.push({
          id: `res-${res.name}`,
          title: res.name,
          subtitle: `Risorsa incorporata (${res.resourceType || 'Embedded'}, ${res.visibility}) - Offset: ${res.offset}`,
          category: 'Type',
          badgeText: 'RISORSA',
          badgeClass: 'badge-struct',
          action: () => {
            onOpenInsights?.()
            onClose()
          }
        })
      })

      // Costanti letterali estratte (SQL, URL, Connection strings, Percorsi)
      assembly.userStrings?.forEach((str, i) => {
        if (str.category !== 'General') {
          items.push({
            id: `str-${i}-${str.category}`,
            title: str.value,
            subtitle: `Stringa costante [${str.category.toUpperCase()}] estratta dai corpi IL`,
            category: str.category === 'Sql' ? 'Database' : 'Endpoint',
            badgeText: str.category.toUpperCase(),
            badgeClass: str.category === 'Sql' ? 'badge-enum' : 'badge-class',
            action: () => {
              if (typeof navigator !== 'undefined' && navigator.clipboard) {
                navigator.clipboard.writeText(str.value)
              }
              onOpenInsights?.()
              onClose()
            }
          })
        }
      })

      // Rilievi di modernizzazione
      assembly.modernizationFindings?.forEach((f, i) => {
        items.push({
          id: `mod-${i}-${f.target}`,
          title: `Audit: ${f.target} (${f.severity})`,
          subtitle: `${f.description} -> Raccomandazione: ${f.recommendation}`,
          category: 'Project',
          badgeText: `AUDIT ${f.severity.toUpperCase()}`,
          badgeClass: 'badge-interface',
          action: () => {
            onOpenInsights?.()
            onClose()
          }
        })
      })
    }

    return items
  }, [namespaces, solution, assembly, onSelectType, onOpenAssemblyPath, onOpenSitemap, onOpenSolution, onOpenInsights, onClose])

  // Filtraggio rapido
  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      // Se vuoto mostra i primi 30 elementi rilevanti
      return allItems.slice(0, 30)
    }

    return allItems
      .filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      )
      .slice(0, 50)
  }, [allItems, query])

  // Gestione tastiera (frecce Su/Giù, Invio, Esc)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1 < filteredResults.length ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 >= 0 ? prev - 1 : filteredResults.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selected = filteredResults[selectedIndex]
      if (selected) selected.action()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  // Scroll automatico sul nodo selezionato con freccia
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[selectedIndex] as HTMLElement | undefined
      if (activeEl && typeof activeEl.scrollIntoView === 'function') {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  if (!isOpen) return null

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="window active dialog-window"
        style={{ width: '640px', maxWidth: '95vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="title-bar">
          <div className="title-bar-text">Trova nel Sistema &amp; nell'Assembly (Ctrl+K)</div>
          <div className="title-bar-controls">
            <button aria-label="Close" onClick={onClose} />
          </div>
        </div>

        <div className="window-body" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, padding: '8px' }}>
          {/* Input di ricerca rapida */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => {
                setQuery(e.target.value)
                setSelectedIndex(0)
              }}
              onKeyDown={handleKeyDown}
              placeholder="Cerca classi, interfacce, API, tabelle DB, processi batch..."
              style={{ flex: 1, height: 26, fontSize: '12px', padding: '2px 6px' }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                style={{ height: 26, padding: '0 8px', cursor: 'pointer' }}
              >
                Cancella
              </button>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#555', marginBottom: 4 }}>
            <span>
              {query.trim()
                ? `Trovati ${filteredResults.length} risultati per "${query}"`
                : `Elementi indicizzati: ${allItems.length} (usa le frecce per scorrere, Invio per aprire)`}
            </span>
            <span>Esc per chiudere</span>
          </div>

          {/* Lista dei risultati interattivi */}
          <div
            ref={listRef}
            className="tree-container"
            style={{
              flex: 1,
              overflowY: 'auto',
              maxHeight: '380px',
              backgroundColor: '#fff',
              border: '2px inset var(--retro-border-light)'
            }}
          >
            {filteredResults.length === 0 ? (
              <div style={{ padding: 16, color: '#666', fontStyle: 'italic', textAlign: 'center' }}>
                Nessun componente trovato corrispondente a "{query}".
              </div>
            ) : (
              filteredResults.map((item, idx) => {
                const isSelected = idx === selectedIndex
                return (
                  <div
                    key={item.id}
                    className={`retro-list-item ${isSelected ? 'selected' : ''}`}
                    onClick={item.action}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '5px 8px',
                      borderBottom: '1px solid #f0f0f0',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                      <span className={`badge-kind ${item.badgeClass}`} style={{ fontSize: '9px', minWidth: '45px', textAlign: 'center' }}>
                        {item.badgeText}
                      </span>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '11px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: '10px', opacity: 0.85, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          {item.subtitle}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: '10px', color: isSelected ? 'inherit' : '#888', marginLeft: 8, whiteSpace: 'nowrap' }}>
                      {isSelected ? '[Invio per Aprire]' : 'Apri'}
                    </span>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer del dialogo */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, gap: 6 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '2px 14px', cursor: 'pointer' }}
            >
              Annulla
            </button>
            <button
              type="button"
              disabled={filteredResults.length === 0}
              onClick={() => {
                const selected = filteredResults[selectedIndex]
                if (selected) selected.action()
              }}
              style={{ fontWeight: 'bold', padding: '2px 14px', cursor: 'pointer' }}
            >
              Apri Selezionato
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
