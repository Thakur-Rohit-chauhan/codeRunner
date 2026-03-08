import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#282828',
            color: '#eff2f6',
            border: '1px solid #3e3e3e',
            fontFamily: 'Inter, sans-serif',
          },
        }}
      />
    </BrowserRouter>
  </StrictMode>,
)
