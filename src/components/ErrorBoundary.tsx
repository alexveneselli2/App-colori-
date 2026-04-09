import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error('[Iride] Errore non gestito:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100dvh',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 32,
          background: '#F2EDE5',
          fontFamily: 'Inter, system-ui, sans-serif',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 36, marginBottom: 12 }}>:(</p>
          <p style={{ fontSize: 17, fontWeight: 700, color: '#1C1917', marginBottom: 8 }}>
            Qualcosa è andato storto
          </p>
          <p style={{ fontSize: 13, color: '#79716B', marginBottom: 24 }}>
            Ricarica la pagina per riprovare.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 28px',
              borderRadius: 14,
              border: 'none',
              background: '#1C1917',
              color: '#F2EDE5',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Ricarica
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
