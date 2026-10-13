import React from 'react'

interface MenuBarProps {
  onOpenClick: () => void
  onResetClick: () => void
  onAboutClick: () => void
}

export const MenuBar: React.FC<MenuBarProps> = ({
  onOpenClick,
  onResetClick,
  onAboutClick
}) => {
  return (
    <div className="menu-bar">
      <div className="menu-item" onClick={onOpenClick}>
        <u>F</u>ile - Apri Assembly...
      </div>
      <div className="menu-item" onClick={onResetClick}>
        <u>R</u>eimposta
      </div>
      <div className="menu-item" onClick={onAboutClick}>
        <u>G</u>uida - Info
      </div>
    </div>
  )
}
