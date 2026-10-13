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
        <button aria-label="Minimize" tabIndex={-1} />
        <button aria-label="Maximize" tabIndex={-1} />
        <button aria-label="Close" onClick={onClose} tabIndex={-1} />
      </div>
    </div>
  )
}
