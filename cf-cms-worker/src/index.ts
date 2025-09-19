import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

export interface Env {
  DB: D1Database
  CACHE_KV: KVNamespace
  ENVIRONMENT: string
}

const app = new Hono<{ Bindings: Env }>()

// Middleware
app.use('*', cors())
app.use('*', logger())

// Health check
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    service: 'cf-cms-worker',
    environment: c.env.ENVIRONMENT,
    timestamp: new Date().toISOString()
  })
})

// API routes will be added here
app.get('/api/health', (c) => {
  return c.json({ status: 'healthy' })
})

export default app