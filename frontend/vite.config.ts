import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const scriptUrl = (env.VITE_APPS_SCRIPT_URL || '')
    .trim()
    .replace(/\/$/, '')
    .replace(
      /https:\/\/script\.google\.com\/a\/macros\/[^/]+\/s\//,
      'https://script.google.com/macros/s/'
    )

  const proxy: Record<string, object> = {}

  if (scriptUrl) {
    try {
      const parsed = new URL(scriptUrl)
      proxy['/api/script'] = {
        target: `${parsed.protocol}//${parsed.host}`,
        changeOrigin: true,
        followRedirects: true,
        rewrite: (path: string) => {
          const queryIndex = path.indexOf('?')
          const query = queryIndex >= 0 ? path.slice(queryIndex) : ''
          return `${parsed.pathname}${query}`
        },
      }
    } catch {
      // Local proxy is optional; production uses the Vercel function.
    }
  }

  return {
    plugins: [react()],
    server: {
      proxy,
    },
  }
})
