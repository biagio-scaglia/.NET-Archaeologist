import React from 'react'
import { TitleBar } from './TitleBar'

interface AboutDialogProps {
  isOpen: boolean
  onClose: () => void
}

export const AboutDialog: React.FC<AboutDialogProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  return (
    <div className="dialog-overlay">
      <div className="window dialog-window" style={{ width: 440 }}>
        <TitleBar title="Informazioni su .NET Archaeologist" onClose={onClose} />
        <div className="window-body" style={{ padding: 16 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{
              width: 48,
              height: 48,
              backgroundColor: '#000080',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: 20,
              border: '2px solid #000'
            }}>
              .NET
            </div>
            <div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: 14 }}>.NET Archaeologist v1.0.0</h3>
              <p style={{ margin: '0 0 6px 0', fontSize: 11 }}>
                Esploratore archeologico di assembly .NET, metadati ECMA-335 e codice sorgente C#.
              </p>
              <p style={{ margin: '0 0 8px 0', fontSize: 10, color: '#444' }}>
                Motore decompilatore: ICSharpCode.Decompiler (ILSpy)<br />
                Lettore metadati: System.Reflection.Metadata<br />
                Principio: Zero-Execution (Nessun codice target eseguito a runtime)
              </p>
              <p style={{ margin: 0, fontSize: 10, color: '#666' }}>
                Progetto Open Source - Licenza MIT<br />
                Autore: Biagio Scaglia (2026)
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" onClick={onClose} style={{ minWidth: 70 }}>
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
