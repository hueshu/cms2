import { Context, Next } from 'hono'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import type { Env } from '../index'

interface RateLimitConfig {
  windowMs: number  // Time window in milliseconds
  max: number       // Max requests per window
  keyPrefix?: string // Prefix for rate limit keys
}

// Default rate limit configurations
export const RateLimits = {
  api: { windowMs: 60000, max: 60 },        // 60 requests per minute
  auth: { windowMs: 900000, max: 5 },       // 5 attempts per 15 minutes
  write: { windowMs: 60000, max: 20 },      // 20 write operations per minute
  read: { windowMs: 60000, max: 100 }       // 100 read operations per minute
}

// Create rate limiter middleware
export function createRateLimiter(config: RateLimitConfig) {
  return createMiddleware<{ Bindings: Env }>(
    async (c: Context<{ Bindings: Env }>, next: Next) => {
      const kv = c.env.CACHE_KV
      if (!kv) {
        // Skip rate limiting if KV is not configured
        await next()
        return
      }

      // Generate rate limit key based on IP and optional site ID
      const clientIP = c.req.header('CF-Connecting-IP') ||
                      c.req.header('X-Forwarded-For') ||
                      'unknown'
      const siteId = c.get('siteId') || 'global'
      const keyPrefix = config.keyPrefix || 'rate'
      const key = `${keyPrefix}:${siteId}:${clientIP}`

      try {
        // Get current count from KV
        const current = await kv.get(key)
        const count = current ? parseInt(current, 10) : 0

        if (count >= config.max) {
          // Rate limit exceeded
          const retryAfter = Math.ceil(config.windowMs / 1000)

          c.header('X-RateLimit-Limit', config.max.toString())
          c.header('X-RateLimit-Remaining', '0')
          c.header('Retry-After', retryAfter.toString())

          throw new HTTPException(429, {
            message: 'Too many requests. Please try again later.'
          })
        }

        // Increment counter
        const newCount = count + 1
        const ttl = Math.ceil(config.windowMs / 1000)
        await kv.put(key, newCount.toString(), { expirationTtl: ttl })

        // Set rate limit headers
        c.header('X-RateLimit-Limit', config.max.toString())
        c.header('X-RateLimit-Remaining', (config.max - newCount).toString())

        await next()
      } catch (error) {
        if (error instanceof HTTPException) {
          throw error
        }
        // Log error but don't block request if rate limiting fails
        console.error('Rate limit error:', error)
        await next()
      }
    }
  )
}

// Pre-configured rate limiters
export const rateLimitMiddleware = createRateLimiter(RateLimits.api)
export const authRateLimitMiddleware = createRateLimiter(RateLimits.auth)
export const writeRateLimitMiddleware = createRateLimiter(RateLimits.write)
export const readRateLimitMiddleware = createRateLimiter(RateLimits.read)

// IP-based rate limiter for DDoS protection
export const ipRateLimiter = createMiddleware<{ Bindings: Env }>(
  async (c: Context<{ Bindings: Env }>, next: Next) => {
    const kv = c.env.CACHE_KV
    if (!kv) {
      await next()
      return
    }

    const clientIP = c.req.header('CF-Connecting-IP') ||
                    c.req.header('X-Forwarded-For') ||
                    'unknown'
    const key = `ip-limit:${clientIP}`
    const windowMs = 60000 // 1 minute
    const maxRequests = 300 // 300 requests per minute per IP

    try {
      const current = await kv.get(key)
      const count = current ? parseInt(current, 10) : 0

      if (count >= maxRequests) {
        throw new HTTPException(429, {
          message: 'IP rate limit exceeded'
        })
      }

      await kv.put(
        key,
        (count + 1).toString(),
        { expirationTtl: Math.ceil(windowMs / 1000) }
      )

      await next()
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error
      }
      console.error('IP rate limit error:', error)
      await next()
    }
  }
)