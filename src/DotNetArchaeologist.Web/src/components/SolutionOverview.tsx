import React, { useState } from 'react'
import type {
  SolutionDescriptor,
  DiscoveredServiceDescriptor,
  DiscoveredDatabaseDescriptor,
  DiscoveredBatchWorkerDescriptor,
  SolutionProjectDescriptor,
} from '../types/api'

interface SolutionOverviewProps {
  solution: SolutionDescriptor
  onOpenAssemblyPath: (assemblyPath: string) => void
  onClose: () => void
}

type TabType = 'services' | 'databases' | 'batch' | 'projects'

export const SolutionOverview: React.FC<SolutionOverviewProps> = ({
  solution,
  onOpenAssemblyPath,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('services')
  const [selectedService, setSelectedService] = useState<DiscoveredServiceDescriptor | null>(
    solution.services[0] ?? null
  )
  const [selectedDb, setSelectedDb] = useState<DiscoveredDatabaseDescriptor | null>(
    solution.databases[0] ?? null
  )
  const [selectedBatch, setSelectedBatch] = useState<DiscoveredBatchWorkerDescriptor | null>(
    solution.batchWorkers[0] ?? null
  )
  const [selectedProject, setSelectedProject] = useState<SolutionProjectDescriptor | null>(
    solution.projects[0] ?? null
  )

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--retro-surface)',
        padding: '6px',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* Banner di riepilogo Solution */}
      <fieldset style={{ marginBottom: '8px', padding: '6px 10px' }}>
        <legend style={{ fontWeight: 'bold' }}>
          Mappa Architetturale Sistema: {solution.name}.sln
        </legend>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11px',
          }}
        >
          <div>
            <div>
              <strong>Percorso Solution:</strong> {solution.solutionPath}
            </div>
            <div style={{ marginTop: '2px', color: '#222' }}>
              <strong>Componenti Rilevati:</strong> {solution.totalProjects} Progetti
              {' | '}
              {solution.totalServices} Servizi / Microservizi
              {' | '}
              {solution.totalDatabases} Moduli Database
              {' | '}
              {solution.totalBatchWorkers} Processi Batch
            </div>
          </div>
          <div>
            <button
              onClick={onClose}
              className="btn-retro-close"
              title="Chiudi Mappa Solution"
            >
              Chiudi Mappa
            </button>
          </div>
        </div>
      </fieldset>

      {/* Schede di navigazione Retro OS */}
      <menu role="tablist" style={{ marginBottom: '0px' }}>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'services'}
          onClick={() => setActiveTab('services')}
        >
          [SVC] Servizi &amp; Microservizi ({solution.totalServices})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'databases'}
          onClick={() => setActiveTab('databases')}
        >
          [DB] Database &amp; Persistenza ({solution.totalDatabases})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'batch'}
          onClick={() => setActiveTab('batch')}
        >
          [BAT] Processi Batch ({solution.totalBatchWorkers})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'projects'}
          onClick={() => setActiveTab('projects')}
        >
          [PRJ] Progetti Solution ({solution.totalProjects})
        </button>
      </menu>

      {/* Contenitore principale Tab */}
      <div
        className="window active"
        role="tabpanel"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#fff',
          overflow: 'hidden',
          boxShadow: 'none',
          borderTop: 'none',
        }}
      >
        {/* TAB 1: SERVIZI & MICROSERVIZI */}
        {activeTab === 'services' && (
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* Lista sinistra */}
            <div
              style={{
                width: '320px',
                borderRight: '2px groove #dfdfdf',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#f5f5f5',
              }}
            >
              <div
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#000080',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 'bold',
                }}
              >
                Servizi Rilevati ({solution.services.length})
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
                {solution.services.length === 0 ? (
                  <div style={{ padding: '8px', fontSize: '11px', color: '#666' }}>
                    Nessun servizio WCF o Web API identificato.
                  </div>
                ) : (
                  solution.services.map((svc, idx) => {
                    const isSelected = selectedService?.serviceName === svc.serviceName
                    return (
                      <div
                        key={`${svc.serviceName}-${idx}`}
                        className={`retro-list-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedService(svc)}
                      >
                        <div style={{ fontWeight: 'bold' }}>{svc.serviceName}</div>
                        <div style={{ fontSize: '10px', opacity: 0.9 }}>
                          [{svc.technology}] - {svc.projectName}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Dettagli destro */}
            <div
              style={{
                flex: 1,
                padding: '10px',
                overflowY: 'auto',
                backgroundColor: '#ffffff',
                fontSize: '12px',
              }}
            >
              {selectedService ? (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      borderBottom: '1px solid #ccc',
                      paddingBottom: '8px',
                      marginBottom: '10px',
                    }}
                  >
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#000080' }}>
                        {selectedService.serviceName}
                      </h3>
                      <div style={{ fontSize: '11px', color: '#444' }}>
                        <strong>Tecnologia:</strong> {selectedService.technology}
                        {' | '}
                        <strong>Progetto:</strong> {selectedService.projectName}
                      </div>
                      {selectedService.contractInterface && (
                        <div style={{ fontSize: '11px', color: '#444' }}>
                          <strong>Contratto Interfaccia:</strong> {selectedService.contractInterface}
                        </div>
                      )}
                    </div>
                    {selectedService.assemblyPath && (
                      <button
                        onClick={() => onOpenAssemblyPath(selectedService.assemblyPath!)}
                        style={{ padding: '3px 10px', fontSize: '11px', cursor: 'pointer' }}
                      >
                        Decompila Assembly &gt;&gt;
                      </button>
                    )}
                  </div>

                  <h4 style={{ margin: '8px 0 4px 0', fontSize: '12px' }}>
                    Endpoints / Operazioni Esposte ({selectedService.endpoints.length}):
                  </h4>
                  {selectedService.endpoints.length === 0 ? (
                    <div style={{ fontSize: '11px', color: '#666' }}>
                      Nessun endpoint esplicito rilevato.
                    </div>
                  ) : (
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '11px',
                        marginTop: '4px',
                      }}
                    >
                      <thead>
                        <tr style={{ backgroundColor: '#e0e0e0', textAlign: 'left' }}>
                          <th style={{ padding: '4px', border: '1px solid #ccc' }}>Contratto/Verbo</th>
                          <th style={{ padding: '4px', border: '1px solid #ccc' }}>Operazione</th>
                          <th style={{ padding: '4px', border: '1px solid #ccc' }}>Parametri</th>
                          <th style={{ padding: '4px', border: '1px solid #ccc' }}>Ritorno</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedService.endpoints.map((ep, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                            <td
                              style={{
                                padding: '4px',
                                border: '1px solid #ccc',
                                fontWeight: 'bold',
                                color: '#000080',
                              }}
                            >
                              [{ep.httpMethodOrContract ?? 'ACTION'}]
                            </td>
                            <td style={{ padding: '4px', border: '1px solid #ccc' }}>{ep.name}</td>
                            <td style={{ padding: '4px', border: '1px solid #ccc' }}>
                              {ep.parameters.length > 0 ? ep.parameters.join(', ') : '(nessuno)'}
                            </td>
                            <td style={{ padding: '4px', border: '1px solid #ccc', color: '#444' }}>
                              {ep.returnType ?? 'void'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ) : (
                <div style={{ color: '#666', fontSize: '12px' }}>Seleziona un servizio dall'elenco a sinistra.</div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: DATABASE & PERSISTENZA */}
        {activeTab === 'databases' && (
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <div
              style={{
                width: '320px',
                borderRight: '2px groove #dfdfdf',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#f5f5f5',
              }}
            >
              <div
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#000080',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 'bold',
                }}
              >
                Componenti Dati ({solution.databases.length})
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
                {solution.databases.length === 0 ? (
                  <div style={{ padding: '8px', fontSize: '11px', color: '#666' }}>
                    Nessun modulo DbContext o Repository identificato.
                  </div>
                ) : (
                  solution.databases.map((db, idx) => {
                    const isSelected = selectedDb?.name === db.name
                    return (
                      <div
                        key={`${db.name}-${idx}`}
                        className={`retro-list-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedDb(db)}
                      >
                        <div style={{ fontWeight: 'bold' }}>{db.name}</div>
                        <div style={{ fontSize: '10px', opacity: 0.9 }}>
                          [{db.technology}] - {db.projectName}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div
              style={{
                flex: 1,
                padding: '10px',
                overflowY: 'auto',
                backgroundColor: '#ffffff',
                fontSize: '12px',
              }}
            >
              {selectedDb ? (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      borderBottom: '1px solid #ccc',
                      paddingBottom: '8px',
                      marginBottom: '10px',
                    }}
                  >
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#000080' }}>
                        {selectedDb.name}
                      </h3>
                      <div style={{ fontSize: '11px', color: '#444' }}>
                        <strong>Tecnologia:</strong> {selectedDb.technology}
                        {' | '}
                        <strong>Progetto:</strong> {selectedDb.projectName}
                      </div>
                      {selectedDb.baseTypeOrPattern && (
                        <div style={{ fontSize: '11px', color: '#444' }}>
                          <strong>Pattern / Tipo Base:</strong> {selectedDb.baseTypeOrPattern}
                        </div>
                      )}
                    </div>
                    {selectedDb.assemblyPath && (
                      <button
                        onClick={() => onOpenAssemblyPath(selectedDb.assemblyPath!)}
                        style={{ padding: '3px 10px', fontSize: '11px', cursor: 'pointer' }}
                      >
                        Decompila Assembly &gt;&gt;
                      </button>
                    )}
                  </div>

                  {selectedDb.entitiesOrTables.length > 0 && (
                    <div style={{ marginBottom: '14px' }}>
                      <h4 style={{ margin: '8px 0 4px 0', fontSize: '12px' }}>
                        Entità / DbSet / Tabelle Mappate ({selectedDb.entitiesOrTables.length}):
                      </h4>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '4px',
                          marginTop: '4px',
                        }}
                      >
                        {selectedDb.entitiesOrTables.map((ent, idx) => (
                          <span
                            key={idx}
                            style={{
                              padding: '2px 6px',
                              backgroundColor: '#eef2f7',
                              border: '1px solid #b0c4de',
                              fontSize: '11px',
                              fontFamily: 'monospace',
                            }}
                          >
                            [TBL] {ent}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedDb.detectedStoredProceduresOrQueries.length > 0 && (
                    <div>
                      <h4 style={{ margin: '8px 0 4px 0', fontSize: '12px' }}>
                        Stored Procedures / Query Rilevate ({selectedDb.detectedStoredProceduresOrQueries.length}):
                      </h4>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '4px',
                          marginTop: '4px',
                        }}
                      >
                        {selectedDb.detectedStoredProceduresOrQueries.map((sp, idx) => (
                          <span
                            key={idx}
                            style={{
                              padding: '2px 6px',
                              backgroundColor: '#fff4e5',
                              border: '1px solid #ffd199',
                              fontSize: '11px',
                              fontFamily: 'monospace',
                            }}
                          >
                            [PROC] {sp}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: '#666', fontSize: '12px' }}>Seleziona un componente dati dall'elenco a sinistra.</div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: BATCH & BACKGROUND WORKERS */}
        {activeTab === 'batch' && (
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <div
              style={{
                width: '320px',
                borderRight: '2px groove #dfdfdf',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#f5f5f5',
              }}
            >
              <div
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#000080',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 'bold',
                }}
              >
                Processi Batch ({solution.batchWorkers.length})
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
                {solution.batchWorkers.length === 0 ? (
                  <div style={{ padding: '8px', fontSize: '11px', color: '#666' }}>
                    Nessun componente batch identificato.
                  </div>
                ) : (
                  solution.batchWorkers.map((batch, idx) => {
                    const isSelected = selectedBatch?.workerName === batch.workerName
                    return (
                      <div
                        key={`${batch.workerName}-${idx}`}
                        className={`retro-list-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedBatch(batch)}
                      >
                        <div style={{ fontWeight: 'bold' }}>{batch.workerName}</div>
                        <div style={{ fontSize: '10px', opacity: 0.9 }}>
                          [{batch.technology}] - {batch.projectName}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div
              style={{
                flex: 1,
                padding: '10px',
                overflowY: 'auto',
                backgroundColor: '#ffffff',
                fontSize: '12px',
              }}
            >
              {selectedBatch ? (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      borderBottom: '1px solid #ccc',
                      paddingBottom: '8px',
                      marginBottom: '10px',
                    }}
                  >
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#000080' }}>
                        {selectedBatch.workerName}
                      </h3>
                      <div style={{ fontSize: '11px', color: '#444' }}>
                        <strong>Tecnologia:</strong> {selectedBatch.technology}
                        {' | '}
                        <strong>Progetto:</strong> {selectedBatch.projectName}
                      </div>
                      {selectedBatch.entryPointOrJobClass && (
                        <div style={{ fontSize: '11px', color: '#444' }}>
                          <strong>Classe Job / EntryPoint:</strong> {selectedBatch.entryPointOrJobClass}
                        </div>
                      )}
                    </div>
                    {selectedBatch.assemblyPath && (
                      <button
                        onClick={() => onOpenAssemblyPath(selectedBatch.assemblyPath!)}
                        style={{ padding: '3px 10px', fontSize: '11px', cursor: 'pointer' }}
                      >
                        Decompila Assembly &gt;&gt;
                      </button>
                    )}
                  </div>

                  <h4 style={{ margin: '8px 0 4px 0', fontSize: '12px' }}>Triggers & Pipelines:</h4>
                  <ul>
                    {selectedBatch.triggersOrSchedules.map((trig, idx) => (
                      <li key={idx} style={{ fontSize: '11px', marginBottom: '2px' }}>
                        {trig}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div style={{ color: '#666', fontSize: '12px' }}>Seleziona un processo batch dall'elenco a sinistra.</div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: TUTTI I PROGETTI & DIPENDENZE */}
        {activeTab === 'projects' && (
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <div
              style={{
                width: '320px',
                borderRight: '2px groove #dfdfdf',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#f5f5f5',
              }}
            >
              <div
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#000080',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 'bold',
                }}
              >
                Progetti Solution ({solution.projects.length})
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
                {solution.projects.map((proj, idx) => {
                  const isSelected = selectedProject?.name === proj.name
                  return (
                    <div
                      key={`${proj.name}-${idx}`}
                      className={`retro-list-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedProject(proj)}
                    >
                      <div style={{ fontWeight: 'bold' }}>
                        [{proj.category.toUpperCase()}] {proj.name}
                      </div>
                      <div style={{ fontSize: '10px', opacity: 0.9 }}>
                        {proj.assemblyExists ? 'Assembly compilato presente' : 'Sorgente non compilato'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div
              style={{
                flex: 1,
                padding: '10px',
                overflowY: 'auto',
                backgroundColor: '#ffffff',
                fontSize: '12px',
              }}
            >
              {selectedProject ? (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      borderBottom: '1px solid #ccc',
                      paddingBottom: '8px',
                      marginBottom: '10px',
                    }}
                  >
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#000080' }}>
                        {selectedProject.name}
                      </h3>
                      <div style={{ fontSize: '11px', color: '#444' }}>
                        <strong>Categoria:</strong> {selectedProject.category}
                        {' | '}
                        <strong>Percorso File:</strong> {selectedProject.relativePath}
                      </div>
                    </div>
                    {selectedProject.outputAssemblyPath && selectedProject.assemblyExists && (
                      <button
                        onClick={() => onOpenAssemblyPath(selectedProject.outputAssemblyPath!)}
                        style={{ padding: '3px 10px', fontSize: '11px', cursor: 'pointer' }}
                      >
                        Decompila Progetto &gt;&gt;
                      </button>
                    )}
                  </div>

                  <h4 style={{ margin: '8px 0 4px 0', fontSize: '12px' }}>Tecnologie Rilevate:</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                    {selectedProject.detectedTechnologies.length > 0 ? (
                      selectedProject.detectedTechnologies.map((t, idx) => (
                        <span
                          key={idx}
                          style={{
                            padding: '2px 6px',
                            backgroundColor: '#e8f4fd',
                            border: '1px solid #b6d4fe',
                            fontSize: '11px',
                          }}
                        >
                          {t}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '11px', color: '#666' }}>Libreria .NET standard</span>
                    )}
                  </div>

                  <h4 style={{ margin: '8px 0 4px 0', fontSize: '12px' }}>
                    Dipendenze da altri Progetti ({selectedProject.projectReferences.length}):
                  </h4>
                  {selectedProject.projectReferences.length > 0 ? (
                    <ul style={{ margin: '4px 0', paddingLeft: '20px', fontSize: '11px' }}>
                      {selectedProject.projectReferences.map((pref, idx) => (
                        <li key={idx}>-&gt; {pref}</li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{ fontSize: '11px', color: '#666' }}>Nessuna dipendenza interna rilevata.</div>
                  )}

                  {selectedProject.packageReferences.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <h4 style={{ margin: '8px 0 4px 0', fontSize: '12px' }}>
                        Pacchetti & Riferimenti Esterni ({selectedProject.packageReferences.length}):
                      </h4>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '4px',
                          marginTop: '4px',
                        }}
                      >
                        {selectedProject.packageReferences.map((pkg, idx) => (
                          <span
                            key={idx}
                            style={{
                              padding: '1px 5px',
                              backgroundColor: '#f8f9fa',
                              border: '1px solid #dee2e6',
                              fontSize: '10px',
                            }}
                          >
                            {pkg}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: '#666', fontSize: '12px' }}>Seleziona un progetto dall'elenco a sinistra.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
