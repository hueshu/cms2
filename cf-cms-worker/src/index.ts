import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { compress } from 'hono/compress'
import { secureHeaders } from 'hono/secure-headers'

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/error'
import { ipRateLimiter, rateLimitMiddleware } from './middleware/rateLimit'
import { authMiddleware, apiKeyMiddleware, optionalAuthMiddleware } from './middleware/auth'
import { tenantMiddleware, optionalTenantMiddleware } from './middleware/tenant'
import {
  cacheMiddleware,
  apiCacheMiddleware,
  pageCacheMiddleware,
  cacheInvalidationMiddleware
} from './middleware/cache'

// Import route handlers
import { authRoutes } from './api/auth'
import { sitesRoutes } from './api/sites'
import { articlesRoutes } from './api/articles'
import { tagsRoutes } from './api/tags'
import { imagesRoutes } from './api/images'
import { domainsRoutes } from './api/domains'
import { cdnRoutes } from './api/cdn'
import { seoRoutes } from './api/seo'

// Import utilities
import { successResponse } from './utils/response'
import { PerformanceService } from './services/performanceService'
import { CacheService } from './services/cacheService'
import { KVService } from './utils/database'

export interface Env {
  DB: D1Database
  CACHE_KV: KVNamespace
  ENVIRONMENT: string
  JWT_SECRET: string
  CLOUDFLARE_API_TOKEN?: string
  CLOUDFLARE_API_EMAIL?: string
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

// Performance monitoring endpoint
app.get('/api/performance', async (c) => {
  try {
    const kvService = new KVService(c.env.CACHE_KV)
    const cacheService = new CacheService(kvService)
    const performanceService = new PerformanceService(c.env.CACHE_KV)

    const cacheStats = cacheService.getStats()
    const performanceReport = performanceService.generatePerformanceReport(cacheStats)

    return successResponse(c, {
      performance: performanceReport,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return successResponse(c, {
      error: 'Performance monitoring unavailable',
      timestamp: new Date().toISOString()
    })
  }
})

// API v1 routes
const api = app.basePath('/api/v1')

// Public routes
api.route('/auth', authRoutes)

// Protected routes with JWT auth
api.use('/sites/*', authMiddleware)
api.route('/sites', sitesRoutes)

// Protected routes with API key auth - with caching
api.use('/articles/:siteId/*', apiKeyMiddleware)
api.use('/articles/:siteId/*', apiCacheMiddleware({ ttl: 300, tags: ['articles'] }))
api.use('/articles/*', cacheInvalidationMiddleware(['articles']))
api.route('/articles', articlesRoutes)

api.use('/tags/:siteId/*', apiKeyMiddleware)
api.use('/tags/:siteId/*', tenantMiddleware)
api.use('/tags/:siteId/*', apiCacheMiddleware({ ttl: 600, tags: ['tags'] }))
api.use('/tags/*', cacheInvalidationMiddleware(['tags', 'articles']))
api.route('/tags', tagsRoutes)

// Public image routes (no auth required for basic image generation)
api.use('/images/*', apiCacheMiddleware({ ttl: 86400, tags: ['images'] })) // 24 hours cache for images
api.route('/images', imagesRoutes)

// Domain management routes with API key auth
api.use('/domains/*', apiKeyMiddleware)
api.route('/domains', domainsRoutes)

// CDN management routes with API key auth
api.use('/cdn/*', apiKeyMiddleware)
api.route('/cdn', cdnRoutes)

// SEO management routes with API key auth
api.use('/seo/*', apiKeyMiddleware)
api.route('/seo', seoRoutes)

export default {
  fetch: app.fetch,
  queue: async (batch: any, env: any) => {
    // Empty queue handler - not used in this app
  }
}