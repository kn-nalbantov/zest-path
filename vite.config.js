import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
        timeout: 120_000,
        proxyTimeout: 120_000,
        configure(proxy) {
          proxy.on('error', (_err, _req, res) => {
            if (res.writableEnded) return
            res.writeHead(502, { 'Content-Type': 'application/json' })
            res.end(
              JSON.stringify({
                error: 'The API dropped the connection. Try again in a moment.',
              }),
            )
          })
        },
      },
      '/uploads': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
    },
  },
})
