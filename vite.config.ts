import path from "path"
import fs from "fs"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import sourceIdentifierPlugin from 'vite-plugin-source-identifier'

export default defineConfig(({ command }) => {
  const enableSourceIdentifiers = command === 'serve' && process.env.BUILD_MODE !== 'prod'

  return {
    plugins: [
      react(),
      sourceIdentifierPlugin({
        enabled: enableSourceIdentifiers,
        attributePrefix: 'data-matrix',
        includeProps: true,
      }),
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
