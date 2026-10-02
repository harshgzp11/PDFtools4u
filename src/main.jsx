import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ErrorBoundary } from './ErrorBoundary.jsx'
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"

import { HelmetProvider } from 'react-helmet-async'

const root = document.getElementById('root')
const app = (
  <StrictMode>
    <HelmetProvider>
      <ErrorBoundary>
        <App />
        <Analytics />
        <SpeedInsights />
      </ErrorBoundary>
    </HelmetProvider>
  </StrictMode>
)

if (root.hasChildNodes()) {
  hydrateRoot(root, app)
} else {
  createRoot(root).render(app)
}
