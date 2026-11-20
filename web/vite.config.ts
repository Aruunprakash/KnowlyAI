import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The Python API runs separately (see ../api). In dev we proxy /api to it so the
// browser stays on a single origin and we never need CORS or absolute URLs.
const API_TARGET = process.env.VITE_API_PROXY_TARGET ?? 'http://127.0.0.1:8000'

// `vite build --mode set` (npm run build:set) ships the app into the same folder
// as the landing page and console, at /app/, with relative asset paths so it
// works from whatever static server hosts that folder. `.env.set` points it at
// the API and turns on the links back to the other two pages.
const SET_OUT_DIR = fileURLToPath(
  new URL('../scrollcraft/builds/knowlyai-redacted/app', import.meta.url),
)

export default defineConfig(({ mode }) => ({
  base: mode === 'set' ? './' : '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
        // Answer streaming is server-sent events; buffering would defeat it.
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            if (proxyRes.headers['content-type']?.includes('text/event-stream')) {
              proxyRes.headers['cache-control'] = 'no-cache, no-transform'
            }
          })
        },
      },
    },
  },
  build: {
    outDir: mode === 'set' ? SET_OUT_DIR : 'dist',
    // The set folder lives outside this project, so Vite will not clear it
    // unless told to; stale hashed bundles would otherwise pile up there.
    emptyOutDir: true,
    sourcemap: mode !== 'set',
    rollupOptions: {
      output: {
        manualChunks: {
          markdown: ['react-markdown', 'remark-gfm'],
        },
      },
    },
  },
}))
