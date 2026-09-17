import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { handleBookingApi, processSlackEvent } from './lib/bookingApi.js'

function bookingApiPlugin(env: Record<string, string>) {
  return {
    name: 'booking-api',
    configureServer(server: { middlewares: { use: (fn: unknown) => void } }) {
      process.env.SUPABASE_URL = process.env.SUPABASE_URL || env.SUPABASE_URL
      process.env.SUPABASE_SERVICE_ROLE_KEY =
        process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY
      process.env.SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN || env.SLACK_BOT_TOKEN
      process.env.SLACK_SIGNING_SECRET =
        process.env.SLACK_SIGNING_SECRET || env.SLACK_SIGNING_SECRET

      server.middlewares.use(async (req: NodeJS.ReadableStream & { url?: string; method?: string; headers: unknown }, res: { statusCode: number; setHeader: (k: string, v: string) => void; end: (data?: string) => void }, next: () => void) => {
        const url = req.url || ''
        const path = url.split('?')[0]
        const isBookingApi = path === '/api' || path === '/api/' || path === '/api/script'
        const isSlackEvents = path === '/api/slack/events' || path === '/api/slack/events/'
        if (!isBookingApi && !isSlackEvents) {
          next()
          return
        }

        let raw = ''
        for await (const chunk of req) {
          raw += typeof chunk === 'string' ? chunk : chunk.toString()
        }

        if (isSlackEvents) {
          const headers = req.headers && typeof req.headers === 'object' ? (req.headers as Record<string, string>) : {}
          const result = await processSlackEvent(headers, raw)
          res.statusCode = result.status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(result.body))
          return
        }

        let body: Record<string, unknown> = {}
        if (raw) {
          try {
            body = JSON.parse(raw) as Record<string, unknown>
          } catch {
            body = {}
          }
        }

        const fakeReq = {
          method: req.method,
          body,
          headers: req.headers,
        }

        const fakeRes = {
          statusCode: 200,
          status(code: number) {
            this.statusCode = code
            return this
          },
          json(data: unknown) {
            res.statusCode = this.statusCode
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(data))
          },
          end() {
            res.statusCode = this.statusCode
            res.end()
          },
        }

        await handleBookingApi(fakeReq, fakeRes)
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), bookingApiPlugin(env)],
  }
})
