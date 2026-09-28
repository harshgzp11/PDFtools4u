import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const legalPageMap = {
  '/privacy-policy': '/privacy-policy.html',
  '/terms-of-service': '/terms-of-service.html',
  '/cookie-policy': '/cookie-policy.html',
}

function applyLegalCleanUrls(req) {
  const path = req.url?.split('?')[0]
  if (path && legalPageMap[path]) {
    req.url = req.url.replace(path, legalPageMap[path])
  }
}

const legalCleanUrls = {
  name: 'legal-clean-urls',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      applyLegalCleanUrls(req)
      next()
    })
  },
  configurePreviewServer(server) {
    server.middlewares.use((req, _res, next) => {
      applyLegalCleanUrls(req)
      next()
    })
  },
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    legalCleanUrls,
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
