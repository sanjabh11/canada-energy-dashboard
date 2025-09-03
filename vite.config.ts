import path from "path"
import fs from "fs"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import sourceIdentifierPlugin from 'vite-plugin-source-identifier'

const isProd = process.env.BUILD_MODE === 'prod'
export default defineConfig({
  plugins: [
    react(), 
    sourceIdentifierPlugin({
      enabled: !isProd,
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
})

