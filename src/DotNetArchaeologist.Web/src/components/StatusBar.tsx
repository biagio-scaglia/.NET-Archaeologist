import React from 'react'

interface StatusBarProps {
  statusText: string
  assemblyInfo?: string
  typesCount?: number
  selectedItem?: string
  aiStatusText?: string
  onAiClick?: () => void
}

export const StatusBar: React.FC<StatusBarProps> = ({
  statusText,
  assemblyInfo,
  typesCount,
  selectedItem,
  aiStatusText,
  onAiClick
}) => {
  return (
    <div className="status-bar status-bar-container">
      <p className="status-bar-field" style={{ flex: 2 }}>{statusText}</p>
      <p className="status-bar-field" style={{ flex: 2 }}>{assemblyInfo || 'Nessun assembly aperto'}</p>
      <p className="status-bar-field" style={{ flex: 1 }}>
        {typesCount !== undefined ? `Tipi: ${typesCount}` : 'Tipi: 0'}
      </p>
      <p className="status-bar-field" style={{ flex: 2 }}>
        {selectedItem ? `Selezionato: ${selectedItem}` : 'Nessuna selezione'}
      </p>
      {aiStatusText && (
        <p
          className="status-bar-field"
          onClick={onAiClick}
          title={onAiClick ? "Clicca per aprire la console di consulenza dell'Archeologo AI" : undefined}
          style={{
            flex: 1.5,
            cursor: onAiClick ? 'pointer' : 'default',
            color: aiStatusText.includes('Online') || aiStatusText.includes('Ollama') ? '#006600' : '#885500',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <span>🏛️</span>
          <span>{aiStatusText}</span>
        </p>
      )}
    </div>
  )
}
