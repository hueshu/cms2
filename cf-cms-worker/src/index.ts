import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { compress } from 'hono/compress'
import { secureHeaders } from 'hono/secure-headers'

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/error'
import { ipRateLimiter, rateLimitMiddleware } from './middleware/rateLimit'
import { authMiddleware, apiKeyMiddleware, optionalAuthMiddleware } from './middleware/auth'

// Import route handlers
import { authRoutes } from './api/auth'
import { sitesRoutes } from './api/sites'
import { articlesRoutes } from './api/articles'
import { tagsRoutes } from './api/tags'

// Import utilities
import { successResponse } from './utils/response'

export interface Env {
  DB: D1Database
  CACHE_KV: KVNamespace
  ENVIRONMENT: string
  JWT_SECRET: string
}

const app = new Hono<{ Bindings: Env }>()

// Global middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  maxAge: 86400,
  credentials: true
}))

app.use('*', compress())
app.use('*', secureHeaders())
app.use('*', logger())
app.use('*', ipRateLimiter)

// Error handling
app.onError(errorHandler)
app.notFound(notFoundHandler)

// Health check endpoints
app.get('/', (c) => {
  return successResponse(c, {
    status: 'ok',
    service: 'cf-cms-worker',
    environment: c.env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
})

app.get('/api/health', (c) => {
  return successResponse(c, {
    status: 'healthy',
    timestamp: new Date().toISOString()
  })
})

// API v1 routes
const api = app.basePath('/api/v1')

// Public routes
api.route('/auth', authRoutes)

// Protected routes with JWT auth
api.use('/sites/*', authMiddleware)
api.route('/sites', sitesRoutes)

// Protected routes with API key auth
api.use('/articles/*', apiKeyMiddleware)
api.route('/articles', articlesRoutes)

api.use('/tags/*', apiKeyMiddleware)
api.route('/tags', tagsRoutes)

export default app