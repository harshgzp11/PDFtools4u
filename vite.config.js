import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const vitePrerender = require('vite-plugin-prerender')

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    vitePrerender({
      staticDir: path.join(__dirname, 'dist'),
      routes: [
        '/', 
        '/blog', 
        '/privacy', 
        '/terms', 
        '/about', 
        '/contact',
        '/pdf-to-jpg',
        '/compress-pdf',
        '/pdf-merge',
        '/pdf-to-word',
        '/pdf-to-excel'
      ],
      puppeteerOptions: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    })
  ],
})
// Updated logo assets

