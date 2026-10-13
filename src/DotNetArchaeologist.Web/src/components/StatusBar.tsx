import React from 'react'

interface StatusBarProps {
  statusText: string
  assemblyInfo?: string
  typesCount?: number
  selectedItem?: string
}

export const StatusBar: React.FC<StatusBarProps> = ({
  statusText,
  assemblyInfo,
  typesCount,
  selectedItem
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
    </div>
  )
}
