import fs from 'node:fs'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import React from 'react'
import { renderToPipeableStream } from 'react-dom/server'
import { HelmetProvider } from 'react-helmet-async'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { createServer } from 'vite'

const ROOT_DIR = path.resolve(import.meta.dirname, '..')
const DIST_DIR = path.join(ROOT_DIR, 'dist')
const SITEMAP_PATH = path.join(DIST_DIR, 'sitemap.xml')
const BASE_URL = 'https://www.pdftools4u.in'
const STATIC_LEGAL_ROUTES = new Set([
  '/privacy-policy',
  '/terms-of-service',
  '/cookie-policy',
])

function getRoutes() {
  const sitemap = fs.readFileSync(SITEMAP_PATH, 'utf8')
  const routes = new Set(['/'])

  for (const [, url] of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const parsedUrl = new URL(url)
    if (parsedUrl.origin !== BASE_URL) {
      throw new Error(`Unexpected sitemap origin for ${url}`)
    }
    routes.add(parsedUrl.pathname)
  }

  return [...routes].filter(route => !STATIC_LEGAL_ROUTES.has(route))
}

function renderApp(App, ErrorBoundary, route) {
  const errors = []
  const stream = new PassThrough()
  let markup = ''

  stream.setEncoding('utf8')
  stream.on('data', chunk => {
    markup += chunk
  })

  const element = React.createElement(
    React.StrictMode,
    null,
    React.createElement(
      HelmetProvider,
      null,
      React.createElement(
        ErrorBoundary,
        null,
        React.createElement(
          React.Fragment,
          null,
          React.createElement(App),
          React.createElement(Analytics),
          React.createElement(SpeedInsights),
        ),
      ),
    ),
  )

  return new Promise((resolve, reject) => {
    let render
    stream.on('error', reject)
    stream.on('end', () => {
      if (errors.length) {
        reject(new AggregateError(errors, `Failed to render ${route}`))
        return
      }
      resolve(markup)
    })

    render = renderToPipeableStream(element, {
      onAllReady() {
        render.pipe(stream)
      },
      onShellError: reject,
      onError(error) {
        errors.push(error)
      },
    })
  })
}

async function prerenderRoutes() {
  if (!fs.existsSync(SITEMAP_PATH)) {
    throw new Error('dist/sitemap.xml is missing; run the sitemap generator first.')
  }

  const previousWindow = globalThis.window
  const location = { pathname: '/', search: '' }
  globalThis.window = {
    get location() {
      return location
    },
    history: {
      replaceState() {},
      pushState() {},
    },
    sessionStorage: {
      getItem() {
        return null
      },
      setItem() {},
    },
    scrollTo() {},
  }

  const server = await createServer({
    appType: 'custom',
    logLevel: 'error',
    server: { middlewareMode: true },
  })

  try {
    const [{ default: App }, { ErrorBoundary }, { BLOG_POSTS }] = await Promise.all([
      server.ssrLoadModule('/src/App.jsx'),
      server.ssrLoadModule('/src/ErrorBoundary.jsx'),
      server.ssrLoadModule('/src/lib/blogData.js'),
    ])
    const routes = getRoutes()

    for (const route of routes) {
      const filePath = route === '/'
        ? path.join(DIST_DIR, 'index.html')
        : path.join(DIST_DIR, `${route.slice(1)}.html`)

      if (!fs.existsSync(filePath)) {
        throw new Error(`Missing generated HTML for sitemap route ${route}`)
      }

      location.pathname = route
      const markup = await renderApp(App, ErrorBoundary, route)
      const html = fs.readFileSync(filePath, 'utf8')
      let prerenderedHtml = html.replace(
        '<div id="root"></div>',
        `<div id="root">${markup}</div>`,
      )

      const post = BLOG_POSTS.find(
        candidate => candidate.published && route === `/blog/${candidate.id}` && candidate.customSchema,
      )
      if (post) {
        const schema = JSON.stringify(post.customSchema).replace(/</g, '\\u003c')
        const schemaTag = `<script type="application/ld+json" data-blog-schema="${post.id}">${schema}</script>`
        prerenderedHtml = prerenderedHtml.replace('</head>', `  ${schemaTag}\n  </head>`)
      }

      if (prerenderedHtml === html) {
        throw new Error(`Could not find the application root in ${filePath}`)
      }

      fs.writeFileSync(filePath, prerenderedHtml)
      console.log(`Prerendered ${route}`)
    }
  } finally {
    await server.close()
    if (previousWindow === undefined) {
      delete globalThis.window
    } else {
      globalThis.window = previousWindow
    }
  }
}

prerenderRoutes().catch(error => {
  console.error(error)
  process.exitCode = 1
})
