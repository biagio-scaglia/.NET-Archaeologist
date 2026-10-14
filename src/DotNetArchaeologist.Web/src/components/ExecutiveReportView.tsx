import React, { useState } from 'react'
import type { ExecutiveReport } from '../types/api'

export interface ExecutiveReportViewProps {
  report: ExecutiveReport | null
  loading?: boolean
  onClose?: () => void
  onRefresh?: () => void
}

export const ExecutiveReportView: React.FC<ExecutiveReportViewProps> = ({
  report,
  loading = false,
  onClose,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'markdown'>('visual')
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadMarkdown = () => {
    if (!report) return
    const blob = new Blob([report.markdownContent], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Report_Architetturale_${report.targetName.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDownloadEvidenceBundle = () => {
    if (!report) return
    const bundle = {
      format: 'DotNetArchaeologist.EvidenceBundle',
      version: '1.0.0',
      exportedAtUtc: new Date().toISOString(),
      report
    }
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `EvidenceBundle_${report.targetName.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleCopyClipboard = async () => {
    if (!report) return
    try {
      await navigator.clipboard.writeText(report.markdownContent)
      setCopyFeedback('Report copiato negli appunti!')
      setTimeout(() => setCopyFeedback(null), 3000)
    } catch {
      setCopyFeedback('Impossibile copiare negli appunti.')
      setTimeout(() => setCopyFeedback(null), 3000)
    }
  }

  if (loading) {
    return (
      <div style={{ flex: 1, padding: '24px', textAlign: 'center', backgroundColor: '#ffffff' }}>
        <p style={{ fontWeight: 'bold', fontSize: '13px' }}>
          Generazione del Report Esecutivo in linguaggio naturale in corso...
        </p>
        <p style={{ fontSize: '11px', color: '#666' }}>
          Analisi delle dipendenze, stima del debito tecnico e formulazione raccomandazioni di modernizzazione.
        </p>
      </div>
    )
  }

  if (!report) {
    return (
      <div style={{ flex: 1, padding: '24px', textAlign: 'center', backgroundColor: '#ffffff' }}>
        <p style={{ fontWeight: 'bold', color: '#cc0000' }}>Nessun report architetturale disponibile.</p>
        <p style={{ fontSize: '11px' }}>Carica una Solution o un Assembly e genera il report.</p>
        {onRefresh && (
          <button type="button" onClick={onRefresh} style={{ marginTop: '12px' }}>
            [Genera Report Ora]
          </button>
        )}
      </div>
    )
  }

  const getScoreColor = (score: number) => {
    if (score <= 25) return '#008000' // Verde
    if (score <= 45) return '#006699' // Blu
    if (score <= 70) return '#cc7a00' // Arancione
    return '#cc0000' // Rosso
  }

  return (
    <div
      className="executive-report-printable"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        backgroundColor: '#ffffff',
        overflow: 'hidden'
      }}
    >
      {/* Barra Azioni e Controlli (nascosta in stampa PDF) */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '6px 10px',
          backgroundColor: '#d4d0c8',
          borderBottom: '2px solid #808080',
          gap: '8px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 'bold', fontSize: '12px' }}>
            [REPORT ESECUTIVO]: {report.targetName}
          </span>
          <span style={{ fontSize: '11px', color: '#555' }}>
            ({report.targetType} - {new Date(report.generatedAt).toLocaleDateString()})
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('visual')}
            style={{ fontWeight: activeTab === 'visual' ? 'bold' : 'normal' }}
          >
            [Documento Impaginato]
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('markdown')}
            style={{ fontWeight: activeTab === 'markdown' ? 'bold' : 'normal' }}
          >
            [Sorgente Markdown]
          </button>
          <button
            type="button"
            onClick={handlePrint}
            title="Apre la finestra di stampa per generare o salvare il PDF A4"
            style={{ fontWeight: 'bold', color: '#000080' }}
          >
            [Stampa / Esporta PDF]
          </button>
          <button
            type="button"
            onClick={handleDownloadMarkdown}
            title="Scarica il report come file Markdown standard (.md)"
          >
            [Scarica .md]
          </button>
          <button
            type="button"
            onClick={handleDownloadEvidenceBundle}
            title="Esporta il fascicolo evidenze strutturato (.json) per strumenti di reverse engineering"
          >
            [Evidence Bundle .json]
          </button>
          <button
            type="button"
            onClick={handleCopyClipboard}
            title="Copia il report completo negli appunti"
          >
            [Copia]
          </button>
          {onClose && (
            <button type="button" onClick={onClose} style={{ marginLeft: '4px' }}>
              [Chiudi Report]
            </button>
          )}
        </div>
      </div>

      {/* Messaggio feedback copia */}
      {copyFeedback && (
        <div
          className="no-print"
          style={{
            backgroundColor: '#ffffcc',
            color: '#333300',
            padding: '4px 8px',
            fontSize: '11px',
            borderBottom: '1px solid #cccc00',
            textAlign: 'center'
          }}
        >
          {copyFeedback}
        </div>
      )}

      {/* Contenuto del Report */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {activeTab === 'markdown' ? (
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'Consolas, monospace',
              fontSize: '11px',
              backgroundColor: '#f8f8f8',
              padding: '12px',
              border: '1px solid #ccc'
            }}
          >
            {report.markdownContent}
          </pre>
        ) : (
          <div style={{ maxWidth: '960px', margin: '0 auto' }}>
            {/* Header Formale del Documento */}
            <div
              className="executive-report-card"
              style={{
                borderBottom: '3px double #000080',
                paddingBottom: '12px',
                marginBottom: '16px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h1 style={{ margin: '0 0 4px 0', fontSize: '20px', color: '#000080' }}>
                    {report.title}
                  </h1>
                  <div style={{ fontSize: '11px', color: '#555' }}>
                    Audit Tecnico &amp; Valutazione Architetturale a Zero-Execution | .NET Archaeologist
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '10px', color: '#666' }}>
                  <div>Data: {new Date(report.generatedAt).toLocaleString()} UTC</div>
                  <div style={{ fontWeight: 'bold', color: '#008000' }}>[100% PASSIVE ZERO-EXECUTION]</div>
                </div>
              </div>
            </div>

            {/* Scorecard di Debito Tecnico */}
            <div
              className="executive-report-card"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                padding: '12px',
                backgroundColor: '#f5f5f5',
                border: '1px solid #d0d0d0',
                marginBottom: '16px'
              }}
            >
              <div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#666' }}>
                  Indice di Debito Tecnico
                </div>
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: getScoreColor(report.techDebtScore)
                  }}
                >
                  {report.techDebtScore} / 100
                </div>
                <div style={{ fontSize: '11px', fontWeight: 'bold' }}>{report.techDebtRating}</div>
              </div>

              <div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#666' }}>
                  Stile Architetturale
                </div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '4px' }}>
                  {report.architecturalStyle}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#666' }}>
                  Perimetro Ispezionato
                </div>
                <div style={{ fontSize: '11px', marginTop: '4px' }}>
                  <strong>{report.serviceCatalog.length}</strong> Servizi |{' '}
                  <strong>{report.dataPersistence.length}</strong> Contesti Dati |{' '}
                  <strong>{report.batchWorkers.length}</strong> Worker
                </div>
              </div>
            </div>

            {/* 1. Sintesi Esecutiva Narrativa */}
            <div className="executive-report-card" style={{ marginBottom: '20px' }}>
              <h2
                style={{
                  fontSize: '14px',
                  color: '#000080',
                  borderBottom: '1px solid #000080',
                  paddingBottom: '4px',
                  marginBottom: '8px'
                }}
              >
                1. Sintesi Esecutiva Narrativa
              </h2>
              <p
                style={{
                  fontSize: '12px',
                  lineHeight: '1.6',
                  textAlign: 'justify',
                  backgroundColor: '#fafafa',
                  padding: '10px',
                  borderLeft: '4px solid #000080'
                }}
              >
                {report.executiveSummary}
              </p>

              <div style={{ marginTop: '10px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '6px' }}>
                  Punti Salienti &amp; Rilievi Strutturali:
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '11px', lineHeight: '1.5' }}>
                  {report.keyFindings.map((finding, idx) => (
                    <li key={idx} style={{ marginBottom: '3px' }}>
                      {finding}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 2. Superficie Servizi & API */}
            {report.serviceCatalog.length > 0 && (
              <div className="executive-report-card" style={{ marginBottom: '20px' }}>
                <h2
                  style={{
                    fontSize: '14px',
                    color: '#000080',
                    borderBottom: '1px solid #000080',
                    paddingBottom: '4px',
                    marginBottom: '8px'
                  }}
                >
                  2. Superficie di Esposizione e Servizi API
                </h2>
                <table
                  className="executive-report-table"
                  style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}
                >
                  <thead>
                    <tr style={{ backgroundColor: '#e8e8e8', textAlign: 'left' }}>
                      <th style={{ padding: '6px', border: '1px solid #ccc' }}>Servizio</th>
                      <th style={{ padding: '6px', border: '1px solid #ccc' }}>Tecnologia</th>
                      <th style={{ padding: '6px', border: '1px solid #ccc' }}>Contratto</th>
                      <th style={{ padding: '6px', border: '1px solid #ccc' }}>Operazioni</th>
                      <th style={{ padding: '6px', border: '1px solid #ccc' }}>Raccomandazione</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.serviceCatalog.map((svc, i) => (
                      <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                        <td style={{ padding: '6px', border: '1px solid #ccc', fontWeight: 'bold' }}>
                          {svc.serviceName}
                        </td>
                        <td style={{ padding: '6px', border: '1px solid #ccc' }}>{svc.technology}</td>
                        <td style={{ padding: '6px', border: '1px solid #ccc', fontFamily: 'monospace' }}>
                          {svc.contractInterface || '-'}
                        </td>
                        <td style={{ padding: '6px', border: '1px solid #ccc' }}>{svc.endpointsCount}</td>
                        <td style={{ padding: '6px', border: '1px solid #ccc' }}>
                          {svc.migrationRecommendation}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 3. Persistenza Dati & Stored Procedure */}
            {report.dataPersistence.length > 0 && (
              <div className="executive-report-card" style={{ marginBottom: '20px' }}>
                <h2
                  style={{
                    fontSize: '14px',
                    color: '#006633',
                    borderBottom: '1px solid #006633',
                    paddingBottom: '4px',
                    marginBottom: '8px'
                  }}
                >
                  3. Persistenza dei Dati e Database
                </h2>
                <table
                  className="executive-report-table"
                  style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}
                >
                  <thead>
                    <tr style={{ backgroundColor: '#e8f4e8', textAlign: 'left' }}>
                      <th style={{ padding: '6px', border: '1px solid #ccc' }}>Contesto</th>
                      <th style={{ padding: '6px', border: '1px solid #ccc' }}>Tecnologia</th>
                      <th style={{ padding: '6px', border: '1px solid #ccc' }}>Tabelle Mappate</th>
                      <th style={{ padding: '6px', border: '1px solid #ccc' }}>Stored Procedure</th>
                      <th style={{ padding: '6px', border: '1px solid #ccc' }}>Impatto Architetturale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.dataPersistence.map((dp, i) => (
                      <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#f9fcf9' }}>
                        <td style={{ padding: '6px', border: '1px solid #ccc', fontWeight: 'bold' }}>
                          {dp.contextName}
                        </td>
                        <td style={{ padding: '6px', border: '1px solid #ccc' }}>{dp.technology}</td>
                        <td style={{ padding: '6px', border: '1px solid #ccc' }}>
                          {dp.tables.length > 0 ? dp.tables.slice(0, 5).join(', ') : 'Nessuna'}
                        </td>
                        <td style={{ padding: '6px', border: '1px solid #ccc' }}>
                          {dp.storedProcedures.length > 0
                            ? dp.storedProcedures.slice(0, 5).join(', ')
                            : 'Nessuna'}
                        </td>
                        <td style={{ padding: '6px', border: '1px solid #ccc' }}>
                          {dp.architecturalImpact}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. Processi Batch & Asincroni */}
            {report.batchWorkers.length > 0 && (
              <div className="executive-report-card" style={{ marginBottom: '20px' }}>
                <h2
                  style={{
                    fontSize: '14px',
                    color: '#994400',
                    borderBottom: '1px solid #994400',
                    paddingBottom: '4px',
                    marginBottom: '8px'
                  }}
                >
                  4. Processi Batch &amp; Lavorazioni Asincrone
                </h2>
                <table
                  className="executive-report-table"
                  style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}
                >
                  <thead>
                    <tr style={{ backgroundColor: '#fff2e6', textAlign: 'left' }}>
                      <th style={{ padding: '6px', border: '1px solid #ccc' }}>Worker / Job</th>
                      <th style={{ padding: '6px', border: '1px solid #ccc' }}>Entry Point</th>
                      <th style={{ padding: '6px', border: '1px solid #ccc' }}>Trigger Rilevati</th>
                      <th style={{ padding: '6px', border: '1px solid #ccc' }}>Strategia Cloud/Container</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.batchWorkers.map((bw, i) => (
                      <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#fff9f4' }}>
                        <td style={{ padding: '6px', border: '1px solid #ccc', fontWeight: 'bold' }}>
                          {bw.workerName}
                        </td>
                        <td style={{ padding: '6px', border: '1px solid #ccc', fontFamily: 'monospace' }}>
                          {bw.entryPoint}
                        </td>
                        <td style={{ padding: '6px', border: '1px solid #ccc' }}>
                          {(bw.triggers || []).join(', ')}
                        </td>
                        <td style={{ padding: '6px', border: '1px solid #ccc' }}>
                          {bw.containerizationRecommendation}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 5. Matrice dei Rischi */}
            {report.identifiedRisks.length > 0 && (
              <div className="executive-report-card" style={{ marginBottom: '20px' }}>
                <h2
                  style={{
                    fontSize: '14px',
                    color: '#cc0000',
                    borderBottom: '1px solid #cc0000',
                    paddingBottom: '4px',
                    marginBottom: '8px'
                  }}
                >
                  5. Matrice dei Rischi Architetturali
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {report.identifiedRisks.map((risk, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #e0c0c0',
                        backgroundColor: '#fffdfd',
                        borderLeft: `4px solid ${risk.severity === 'Alta' ? '#cc0000' : '#ff9900'}`
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontWeight: 'bold',
                          fontSize: '12px'
                        }}
                      >
                        <span>
                          [{risk.severity.toUpperCase()}] {risk.title}
                        </span>
                        <span style={{ fontSize: '10px', color: '#666' }}>{risk.category}</span>
                      </div>
                      <p style={{ margin: '4px 0', fontSize: '11px', color: '#333' }}>
                        {risk.description}
                      </p>
                      <div style={{ fontSize: '10px', color: '#006600', fontWeight: 'bold' }}>
                        Mitigazione: {risk.mitigation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. Piano di Modernizzazione Strategica */}
            {report.modernizationRoadmap.length > 0 && (
              <div className="executive-report-card" style={{ marginBottom: '20px' }}>
                <h2
                  style={{
                    fontSize: '14px',
                    color: '#000080',
                    borderBottom: '1px solid #000080',
                    paddingBottom: '4px',
                    marginBottom: '8px'
                  }}
                >
                  6. Piano di Modernizzazione Strategica (Roadmap Consigliata)
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {report.modernizationRoadmap.map((step) => (
                    <div
                      key={step.phase}
                      style={{
                        padding: '10px',
                        border: '1px solid #b0c4de',
                        backgroundColor: '#f8faff',
                        borderLeft: '4px solid #000080'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontWeight: 'bold',
                          fontSize: '12px',
                          color: '#000080'
                        }}
                      >
                        <span>
                          Fase {step.phase}: {step.title}
                        </span>
                        <span style={{ fontSize: '10px', color: '#555' }}>
                          Complessità: {step.complexity} | Rischio: {step.riskLevel}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: 'bold', margin: '4px 0' }}>
                        Obiettivo: {step.objective}
                      </div>
                      <div style={{ fontSize: '11px', color: '#333' }}>{step.details}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Firma e footer */}
            <div
              style={{
                marginTop: '30px',
                paddingTop: '12px',
                borderTop: '1px solid #ccc',
                textAlign: 'center',
                fontSize: '10px',
                color: '#666'
              }}
            >
              Documento generato automaticamente da <strong>.NET Archaeologist</strong> - Analisi statica
              passiva a Zero-Execution.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
