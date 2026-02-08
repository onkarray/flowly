import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './components/Toast'
import { installGlobalErrorHandlers } from './utils/errorLogger'
import App from './App.jsx'

// Install global error handlers before rendering
installGlobalErrorHandlers()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AuthProvider>
  </StrictMode>,
)
