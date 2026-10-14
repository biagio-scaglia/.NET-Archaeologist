import React from 'react'

interface IconProps {
  size?: number
  className?: string
  style?: React.CSSProperties
}

// 1. Icona Assembly / DLL (ruota dentata / binario blu e oro)
export const AssemblyIcon: React.FC<IconProps> = ({ size = 16, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ verticalAlign: 'middle', flexShrink: 0, ...style }}
  >
    <rect x="2" y="2" width="12" height="12" rx="1.5" fill="#2B579A" stroke="#1E395B" strokeWidth="1" />
    <rect x="4" y="4" width="8" height="8" rx="1" fill="#E8F1FF" />
    <path d="M5 6H11M5 8H11M5 10H8" stroke="#2B579A" strokeWidth="1.2" strokeLinecap="round" />
    <circle cx="10" cy="10" r="1.5" fill="#FFA500" stroke="#CC8400" strokeWidth="0.8" />
  </svg>
)

// 2. Icona Namespace (cartella gerarchica gialla dorata con contorno retrò)
export const NamespaceIcon: React.FC<IconProps> = ({ size = 16, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ verticalAlign: 'middle', flexShrink: 0, ...style }}
  >
    <path d="M1.5 3.5C1.5 2.95 1.95 2.5 2.5 2.5H6L7.5 4.5H13.5C14.05 4.5 14.5 4.95 14.5 5.5V12.5C14.5 13.05 14.05 13.5 13.5 13.5H2.5C1.95 13.5 1.5 13.05 1.5 12.5V3.5Z" fill="#F7CA44" stroke="#B8860B" strokeWidth="1" />
    <path d="M1.5 6H14.5V12.5C14.5 13.05 14.05 13.5 13.5 13.5H2.5C1.95 13.5 1.5 13.05 1.5 12.5V6Z" fill="#FFDC66" stroke="#B8860B" strokeWidth="0.8" />
    <path d="M3.5 8H8.5" stroke="#996515" strokeWidth="1" strokeLinecap="round" />
  </svg>
)

// 3. Icona Classe C# (cubo blu brillante)
export const ClassIcon: React.FC<IconProps> = ({ size = 16, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ verticalAlign: 'middle', flexShrink: 0, ...style }}
  >
    <path d="M8 1.5L14 4.5V11.5L8 14.5L2 11.5V4.5L8 1.5Z" fill="#1E88E5" stroke="#0D47A1" strokeWidth="1" />
    <path d="M8 1.5V14.5M2 4.5L8 8L14 4.5" stroke="#64B5F6" strokeWidth="0.8" />
    <circle cx="8" cy="8" r="2" fill="#E3F2FD" stroke="#0D47A1" strokeWidth="0.6" />
  </svg>
)

// 4. Icona Interfaccia C# (nodo circolare viola con connessione)
export const InterfaceIcon: React.FC<IconProps> = ({ size = 16, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ verticalAlign: 'middle', flexShrink: 0, ...style }}
  >
    <circle cx="8" cy="8" r="5.5" fill="#AB47BC" stroke="#6A1B9A" strokeWidth="1.2" />
    <circle cx="8" cy="8" r="3" fill="#F3E5F5" />
    <path d="M8 2V4M8 12V14M2 8H4M12 8H14" stroke="#6A1B9A" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
)

// 5. Icona Struct / Altro tipo (prisma verde menta)
export const StructIcon: React.FC<IconProps> = ({ size = 16, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ verticalAlign: 'middle', flexShrink: 0, ...style }}
  >
    <rect x="3" y="3" width="10" height="10" rx="2" fill="#26A69A" stroke="#004D40" strokeWidth="1" />
    <path d="M5 8H11M8 5V11" stroke="#E0F2F1" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
)

// 6. Icona Metodo (cubo fucsia / freccia di invocazione)
export const MethodIcon: React.FC<IconProps> = ({ size = 16, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ verticalAlign: 'middle', flexShrink: 0, ...style }}
  >
    <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" fill="#E91E63" stroke="#880E4F" strokeWidth="1" />
    <path d="M6 5L10 8L6 11V5Z" fill="#FCE4EC" stroke="#880E4F" strokeWidth="0.8" />
  </svg>
)

// 7. Icona Proprietà (chiave inglese dorata)
export const PropertyIcon: React.FC<IconProps> = ({ size = 16, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ verticalAlign: 'middle', flexShrink: 0, ...style }}
  >
    <path d="M13.5 2.5C12.5 1.5 11 1.5 10 2.5L7 5.5L8.5 7L10 5.5L11 6.5L9.5 8L11 9.5L13.5 7C14.5 6 14.5 4.5 13.5 3.5L12.5 2.5M6 6.5L2 10.5C1.5 11 1.5 12 2 12.5L3.5 14C4 14.5 5 14.5 5.5 14L9.5 10L6 6.5Z" fill="#FB8C00" stroke="#E65100" strokeWidth="0.8" />
  </svg>
)

// 8. Icona Evento (fulmine giallo ambra)
export const EventIcon: React.FC<IconProps> = ({ size = 16, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ verticalAlign: 'middle', flexShrink: 0, ...style }}
  >
    <path d="M9 1.5L3 8.5H8L7 14.5L13 7.5H8L9 1.5Z" fill="#FFD600" stroke="#FF6F00" strokeWidth="1" strokeLinejoin="round" />
  </svg>
)

// 9. Icona Database (cilindro multistrato con led verde)
export const DatabaseIcon: React.FC<IconProps> = ({ size = 16, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ verticalAlign: 'middle', flexShrink: 0, ...style }}
  >
    <ellipse cx="8" cy="3.5" rx="6" ry="2" fill="#00ACC1" stroke="#006064" strokeWidth="1" />
    <path d="M2 3.5V7.5C2 8.6 4.7 9.5 8 9.5C11.3 9.5 14 8.6 14 7.5V3.5" stroke="#006064" strokeWidth="1" fill="#4DD0E1" />
    <path d="M2 7.5V11.5C2 12.6 4.7 13.5 8 13.5C11.3 13.5 14 12.6 14 11.5V7.5" stroke="#006064" strokeWidth="1" fill="#00BCD4" />
    <circle cx="11.5" cy="11.5" r="1.2" fill="#76FF03" stroke="#33691E" strokeWidth="0.6" />
  </svg>
)

// 10. Icona Tabella / Griglia Dati (foglio calcolo / tabella)
export const TableIcon: React.FC<IconProps> = ({ size = 16, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ verticalAlign: 'middle', flexShrink: 0, ...style }}
  >
    <rect x="2" y="2.5" width="12" height="11" rx="1.5" fill="#FFFFFF" stroke="#37474F" strokeWidth="1" />
    <path d="M2 5.5H14" stroke="#37474F" strokeWidth="1" fill="none" />
    <path d="M2 2.5H14V5.5H2V2.5Z" fill="#90A4AE" />
    <path d="M6.5 5.5V13.5M10.5 5.5V13.5" stroke="#B0BEC5" strokeWidth="1" />
    <path d="M2 9.5H14" stroke="#ECEFF1" strokeWidth="1" />
  </svg>
)

// 11. Icona Servizio Web / API (globo con onde radio)
export const ServiceIcon: React.FC<IconProps> = ({ size = 16, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ verticalAlign: 'middle', flexShrink: 0, ...style }}
  >
    <circle cx="8" cy="8" r="6" fill="#3F51B5" stroke="#1A237E" strokeWidth="1" />
    <ellipse cx="8" cy="8" rx="2.5" ry="5.8" stroke="#9FA8DA" strokeWidth="0.8" fill="none" />
    <path d="M2.5 8H13.5M3.5 5H12.5M3.5 11H12.5" stroke="#C5CAE9" strokeWidth="0.8" />
  </svg>
)

// 12. Icona Batch Job / Worker (ingranaggio arancione con lancette)
export const BatchIcon: React.FC<IconProps> = ({ size = 16, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ verticalAlign: 'middle', flexShrink: 0, ...style }}
  >
    <circle cx="8" cy="8" r="5.5" fill="#FF7043" stroke="#D84315" strokeWidth="1" />
    <path d="M8 4.5V8L10.5 9.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
    <circle cx="8" cy="8" r="1.5" fill="#BF360C" />
  </svg>
)

// 13. Icona Ricerca / Spotlight (lente di ingrandimento nitida)
export const SearchIcon: React.FC<IconProps> = ({ size = 16, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ verticalAlign: 'middle', flexShrink: 0, ...style }}
  >
    <circle cx="7" cy="7" r="4.5" fill="#E1F5FE" stroke="#0288D1" strokeWidth="1.5" />
    <path d="M10.5 10.5L14.5 14.5" stroke="#01579B" strokeWidth="2" strokeLinecap="round" />
    <path d="M5.5 5C6 4.5 6.8 4.5 7.5 4.8" stroke="#81D4FA" strokeWidth="1" strokeLinecap="round" />
  </svg>
)

// 14. Icona Asset Immagine (tavolozza / foto con sole e monti)
export const ImageIcon: React.FC<IconProps> = ({ size = 16, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ verticalAlign: 'middle', flexShrink: 0, ...style }}
  >
    <rect x="2" y="2.5" width="12" height="11" rx="1.5" fill="#43A047" stroke="#1B5E20" strokeWidth="1" />
    <circle cx="5" cy="5.5" r="1.5" fill="#FFF176" />
    <path d="M2.5 12L6 8L9 11L11 9L13.5 12H2.5Z" fill="#C8E6C9" stroke="#1B5E20" strokeWidth="0.6" />
  </svg>
)

// 15. Icona Audit Modernizzazione / Sicurezza (scudo protettivo blu e verde)
export const AuditIcon: React.FC<IconProps> = ({ size = 16, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ verticalAlign: 'middle', flexShrink: 0, ...style }}
  >
    <path d="M8 1.5L14 3.5V8C14 11.5 11 13.8 8 15C5 13.8 2 11.5 2 8V3.5L8 1.5Z" fill="#4CAF50" stroke="#1B5E20" strokeWidth="1" />
    <path d="M5.5 8L7.5 10L11 6" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

// 16. Icona Report Esecutivo PDF (documento rosso con grafico a barre)
export const ReportIcon: React.FC<IconProps> = ({ size = 16, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ verticalAlign: 'middle', flexShrink: 0, ...style }}
  >
    <path d="M3 2C3 1.45 3.45 1 4 1H10L14 5V14C14 14.55 13.55 15 13 15H4C3.45 15 3 14.55 3 14V2Z" fill="#E53935" stroke="#B71C1C" strokeWidth="1" />
    <path d="M10 1V5H14" fill="#FFCDD2" stroke="#B71C1C" strokeWidth="0.8" />
    <rect x="5" y="10" width="1.5" height="3" fill="#FFFFFF" />
    <rect x="7.5" y="8" width="1.5" height="5" fill="#FFFFFF" />
    <rect x="10" y="6" width="1.5" height="7" fill="#FFFFFF" />
  </svg>
)

// 17. Icona Blueprint CAD / Disegno Tecnico (griglia bluette con compasso)
export const BlueprintIcon: React.FC<IconProps> = ({ size = 16, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ verticalAlign: 'middle', flexShrink: 0, ...style }}
  >
    <rect x="1.5" y="1.5" width="13" height="13" rx="1" fill="#0D47A1" stroke="#82B1FF" strokeWidth="1" />
    <path d="M4.5 1.5V14.5M8 1.5V14.5M11.5 1.5V14.5" stroke="#1E88E5" strokeWidth="0.6" strokeDasharray="1 1" />
    <path d="M1.5 4.5H14.5M1.5 8H14.5M1.5 11.5H14.5" stroke="#1E88E5" strokeWidth="0.6" strokeDasharray="1 1" />
    <circle cx="8" cy="8" r="3" stroke="#FFFFFF" strokeWidth="1" fill="none" />
    <path d="M5 11L11 5" stroke="#FFEB3B" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
)

// 18. Icona Sitemap 360 / Mappa di Flusso (nodi interconnessi turchese)
export const SitemapIcon: React.FC<IconProps> = ({ size = 16, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ verticalAlign: 'middle', flexShrink: 0, ...style }}
  >
    <rect x="6" y="1.5" width="4" height="3" rx="0.5" fill="#00897B" stroke="#004D40" strokeWidth="0.8" />
    <rect x="2" y="10.5" width="3.5" height="3" rx="0.5" fill="#00ACC1" stroke="#006064" strokeWidth="0.8" />
    <rect x="6.5" y="10.5" width="3.5" height="3" rx="0.5" fill="#00ACC1" stroke="#006064" strokeWidth="0.8" />
    <rect x="11" y="10.5" width="3.5" height="3" rx="0.5" fill="#00ACC1" stroke="#006064" strokeWidth="0.8" />
    <path d="M8 4.5V7.5M3.5 10.5V7.5H12.5V10.5M8 7.5V10.5" stroke="#004D40" strokeWidth="1" fill="none" />
  </svg>
)

// 19. Icona Stringhe Letterali / Codice Costante (virgolette / tag)
export const StringConstantIcon: React.FC<IconProps> = ({ size = 16, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ verticalAlign: 'middle', flexShrink: 0, ...style }}
  >
    <rect x="2" y="3" width="12" height="10" rx="1.5" fill="#FFF8E1" stroke="#FF8F00" strokeWidth="1" />
    <path d="M5 8C5 6.5 6 6 6 6M5 10H6M9.5 8C9.5 6.5 10.5 6 10.5 6M9.5 10H10.5" stroke="#E65100" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
)

// 20. Icona Copia (due foglietti sfalsati)
export const CopyIcon: React.FC<IconProps> = ({ size = 14, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ verticalAlign: 'middle', flexShrink: 0, ...style }}
  >
    <rect x="5.5" y="4.5" width="8" height="9.5" rx="1" fill="#FFFFFF" stroke="#333333" strokeWidth="1" />
    <path d="M3.5 11.5H2.5V2.5H9.5V3.5" stroke="#666666" strokeWidth="1" />
  </svg>
)
