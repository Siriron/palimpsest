import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ErrorBoundary } from './components/ui'
import { WalletProvider } from './state/Wallet'
import { TxProvider } from './state/Tx'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <WalletProvider>
          <TxProvider>
            <App />
          </TxProvider>
        </WalletProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
