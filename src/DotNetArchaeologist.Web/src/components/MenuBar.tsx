import React from 'react'
import { useRetroTheme } from '../theme/ThemeContext'

interface MenuBarProps {
  onOpenClick: () => void
  onResetClick: () => void
  onAboutClick: () => void
  onSearchClick?: () => void
}

export const MenuBar: React.FC<MenuBarProps> = ({
  onOpenClick,
  onResetClick,
  onAboutClick,
  onSearchClick
}) => {
  const { theme, setTheme } = useRetroTheme()

  return (
    <div className="menu-bar" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
      <div className="menu-item" onClick={onOpenClick}>
        <u>F</u>ile - Apri Assembly...
      </div>
      {onSearchClick && (
        <div className="menu-item" onClick={onSearchClick} title="Trova in classi, API, tabelle e processi (Ctrl+K)">
          <u>C</u>erca Globale... (Ctrl+K)
        </div>
      )}
      <div className="menu-item" onClick={onResetClick}>
        <u>R</u>eimposta
      </div>
      <div className="menu-item" onClick={onAboutClick}>
        <u>G</u>uida - Info
      </div>

      {/* Selettore Tema Retro OS */}
      <div
        className="no-print"
        style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          paddingRight: '4px'
        }}
      >
        <span style={{ fontSize: '10px', opacity: 0.85, marginRight: '2px' }}>Tema OS:</span>
        <button
          type="button"
          onClick={() => setTheme('win98')}
          title="Attiva stile classico Windows 98 (98.css)"
          className={theme === 'win98' ? 'active-view-tab' : ''}
          style={{
            fontSize: '10px',
            padding: '1px 5px',
            height: '19px',
            cursor: 'pointer'
          }}
        >
          Win98
        </button>
        <button
          type="button"
          onClick={() => setTheme('winxp')}
          title="Attiva stile moderno Windows XP Luna (xp.css)"
          className={theme === 'winxp' ? 'active-view-tab' : ''}
          style={{
            fontSize: '10px',
            padding: '1px 5px',
            height: '19px',
            cursor: 'pointer'
          }}
        >
          WinXP
        </button>
        <button
          type="button"
          onClick={() => setTheme('win7')}
          title="Attiva stile Aero Glass Windows 7 (7.css)"
          className={theme === 'win7' ? 'active-view-tab' : ''}
          style={{
            fontSize: '10px',
            padding: '1px 5px',
            height: '19px',
            cursor: 'pointer'
          }}
        >
          Win7
        </button>
      </div>
    </div>
  )
}
