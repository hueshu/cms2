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
import { domainMiddleware, getCurrentDomain, getCurrentSite, isSiteNotFound, isDefaultDomain } from './middleware/domain'
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
import { publicRoutes } from './api/public'
import { staticRoutes } from './api/static'
import { unifiedFrontendRoutes } from './api/unified-frontend'

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

// Temporarily disable compression to fix encoding issues with reverse proxy
// app.use('*', compress())
app.use('*', secureHeaders())
app.use('*', logger())
app.use('*', ipRateLimiter)

// Domain identification middleware - run before other middleware
app.use('*', domainMiddleware)

// Static assets
app.route('/', staticRoutes)

// Frontend routes for specific sites (must be before API routes)
app.route('/', unifiedFrontendRoutes)

// Error handling
app.onError(errorHandler)
app.notFound(notFoundHandler)

// Debug endpoint to check domain detection
app.get('/debug/domain', (c) => {
  const requestHost = c.req.header('host') || new URL(c.req.url).hostname
  const domain = requestHost.split(':')[0]
  const site = getCurrentSite(c)

  return successResponse(c, {
    headers: {
      host: c.req.header('host'),
      xForwardedHost: c.req.header('x-forwarded-host'),
      xForwardedFor: c.req.header('x-forwarded-for'),
      cfConnectingIp: c.req.header('cf-connecting-ip')
    },
    url: c.req.url,
    hostname: new URL(c.req.url).hostname,
    extractedDomain: domain,
    currentDomain: getCurrentDomain(c),
    siteFound: !!site,
    site: site ? { id: site.id, name: site.name, domain: site.domain } : null,
    isDefaultDomain: isDefaultDomain(c),
    isSiteNotFound: isSiteNotFound(c)
  })
})

// Root endpoint - show JSON for API-only domains
app.get('/api', (c) => {
  const domain = getCurrentDomain(c)
  const site = getCurrentSite(c)

  if (site) {
    // If we found a site for this domain, show site info
    return successResponse(c, {
      status: 'ok',
      message: `Welcome to ${site.name}`,
      site: {
        id: site.id,
        name: site.name,
        domain: site.domain,
        description: site.description
      },
      api: {
        docs: '/api/v1/docs',
        health: '/api/v1/health'
      }
    })
  } else if (isSiteNotFound(c)) {
    // If domain doesn't match any site
    return c.json({
      success: false,
      error: {
        code: 'SITE_NOT_CONFIGURED',
        message: `No site configured for domain: ${domain}`,
        help: 'Please configure this domain in the CMS admin panel'
      }
    }, 404)
  } else {
    // Default Workers domain or localhost
    return successResponse(c, {
      status: 'ok',
      service: 'cf-cms-worker',
      environment: c.env.ENVIRONMENT,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      domain: domain,
      note: 'This is the default Workers endpoint. Configure custom domains for multi-site support.'
    })
  }
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

// Public API routes - domain-based content (no auth required)
// These routes work based on the domain being accessed
const publicApi = app.basePath('/api/public')
publicApi.use('*', pageCacheMiddleware({ ttl: 600 })) // 10 minutes cache for public content
publicApi.route('/', publicRoutes)

export default {
  fetch: app.fetch,
  queue: async (batch: any, env: any) => {
    // Empty queue handler - not used in this app
  }
}