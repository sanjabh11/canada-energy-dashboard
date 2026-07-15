import path from "path"
import fs from "fs"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import sourceIdentifierPlugin from 'vite-plugin-source-identifier'
import { sentryVitePlugin } from '@sentry/vite-plugin'

export default defineConfig(({ command }) => {
  const enableSourceIdentifiers = command === 'serve' && process.env.BUILD_MODE !== 'prod'
  const sentryRelease = process.env.VITE_SENTRY_RELEASE || process.env.COMMIT_REF
  const uploadSentrySourceMaps = command === 'build' && Boolean(
    process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT && sentryRelease,
  )

  return {
    plugins: [
      react(),
      sourceIdentifierPlugin({
        enabled: enableSourceIdentifiers,
        attributePrefix: 'data-matrix',
        includeProps: true,
      }),
      ...(uploadSentrySourceMaps
        ? [
            sentryVitePlugin({
              authToken: process.env.SENTRY_AUTH_TOKEN,
              org: process.env.SENTRY_ORG,
              project: process.env.SENTRY_PROJECT,
              release: { name: sentryRelease },
              sourcemaps: { filesToDeleteAfterUpload: ['dist/**/*.map'] },
            }),
          ]
        : []),
      {
        name: 'serve-favicon-ico-from-svg',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url === '/favicon.ico') {
              try {
                const svgPath = path.resolve(__dirname, 'public', 'favicon.svg')
                const svg = fs.readFileSync(svgPath)
                res.statusCode = 200
                res.setHeader('Content-Type', 'image/svg+xml')
                res.end(svg)
                return
              } catch {
                // fall through
              }
            }
            next()
          })
        }
      }
    ],
    server: {
      port: 5173,
      host: true
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      chunkSizeWarningLimit: 1200,
      sourcemap: uploadSentrySourceMaps ? 'hidden' : false,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-recharts': ['recharts'],
            'vendor-radix': [
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-tabs',
              '@radix-ui/react-accordion',
              '@radix-ui/react-select',
              '@radix-ui/react-popover',
              '@radix-ui/react-toast',
            ],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-export': ['jspdf', 'jspdf-autotable'],
            'vendor-redoc': ['redoc'],
          },
        },
      },
    },
  }
})
