import { Component, type ErrorInfo, type ReactNode, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: 24,
            fontFamily: 'system-ui, sans-serif',
            maxWidth: 560,
            margin: '48px auto',
            color: '#2a2213',
            background: '#f7f2e8',
            minHeight: '100vh',
          }}
        >
          <h1 style={{ fontSize: '1.25rem' }}>Error al cargar la aplicación</h1>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              padding: 12,
              background: '#fff',
              borderRadius: 8,
              border: '1px solid #e3d3b3',
            }}
          >
            {this.state.error.message}
          </pre>
          <p style={{ color: '#5f4112' }}>
            Abre las herramientas de desarrollo (F12 → Consola) para ver el detalle. Si usas traducción automática del
            navegador en esta pestaña, desactívala o recarga sin traducir.
          </p>
        </div>
      )
    }
    return this.props.children
  }
}

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('No se encontró #root en index.html')
}

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
