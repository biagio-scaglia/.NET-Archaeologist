import { Component, type ReactNode, type ErrorInfo } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallbackTitle?: string
  onReset?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled UI exception in .NET Archaeologist:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            backgroundColor: '#c0c0c0',
            boxSizing: 'border-box',
          }}
        >
          <div
            className="window"
            style={{
              maxWidth: '520px',
              width: '100%',
              boxShadow: '4px 4px 10px rgba(0,0,0,0.5)',
            }}
          >
            <div className="title-bar" style={{ backgroundColor: '#800000' }}>
              <div className="title-bar-text">
                {this.props.fallbackTitle ?? '.NET Archaeologist - Errore di Sistema'}
              </div>
            </div>
            <div className="window-body" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    backgroundColor: '#cc0000',
                    color: '#ffffff',
                    fontWeight: 'bold',
                    fontSize: '22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #000',
                    flexShrink: 0,
                  }}
                >
                  X
                </div>
                <div>
                  <p style={{ margin: '0 0 6px 0', fontWeight: 'bold', fontSize: '12px' }}>
                    Si e verificata una condizione imprevista durante il rendering dell'interfaccia.
                  </p>
                  <p style={{ margin: 0, fontSize: '11px', color: '#333' }}>
                    {this.state.error?.message || 'Errore non specificato.'}
                  </p>
                </div>
              </div>

              {this.state.error?.stack && (
                <pre
                  style={{
                    backgroundColor: '#fff',
                    border: '2px inset #dfdfdf',
                    padding: '8px',
                    fontSize: '10px',
                    maxHeight: '120px',
                    overflow: 'auto',
                    margin: '0 0 14px 0',
                    fontFamily: 'monospace',
                  }}
                >
                  {this.state.error.stack}
                </pre>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={this.handleReset}
                  style={{ padding: '4px 14px', fontWeight: 'bold' }}
                >
                  Ripristina Vista
                </button>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  style={{ padding: '4px 14px' }}
                >
                  Ricarica Applicazione
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
