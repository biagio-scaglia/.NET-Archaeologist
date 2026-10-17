import React from 'react'

interface TitleBarProps {
  title: string
  onClose?: () => void
}

export const TitleBar: React.FC<TitleBarProps> = ({ title, onClose }) => {
  return (
    <div className="title-bar">
      <div className="title-bar-text">{title}</div>
      <div className="title-bar-controls">
        <button aria-label="Minimize" tabIndex={-1} disabled />
        <button aria-label="Maximize" tabIndex={-1} disabled />
        <button
          aria-label="Close"
          onClick={onClose}
          tabIndex={onClose ? 0 : -1}
          disabled={!onClose}
          title={onClose ? 'Chiudi finestra' : undefined}
          style={onClose ? { cursor: 'pointer' } : undefined}
        />
      </div>
    </div>
  )
}
