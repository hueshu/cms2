import { Context, Next } from 'hono'
import { CacheService, CacheOptions } from '../services/cacheService'
import { PerformanceService } from '../services/performanceService'
import { KVService } from '../utils/database'

export interface CacheMiddlewareOptions extends CacheOptions {
  keyGenerator?: (c: Context) => string
  shouldCache?: (c: Context) => boolean
  onHit?: (c: Context, key: string) => void
  onMiss?: (c: Context, key: string) => void
  vary?: string[]
  staleWhileRevalidate?: boolean
}

/**
 * 缓存中间件 - 自动处理HTTP响应缓存
 */
export function cacheMiddleware(options: CacheMiddlewareOptions = {}) {
  return async (c: Context, next: Next) => {
    const {
      ttl = 3600,
      keyGenerator = defaultKeyGenerator,
      shouldCache = defaultShouldCache,
      onHit,
      onMiss,
      vary = [],
      staleWhileRevalidate = false,
      ...cacheOptions
    } = options

    // 跳过非GET请求
    if (c.req.method !== 'GET') {
      await next()
      return
    }

    // 检查是否应该缓存
    if (!shouldCache(c)) {
      await next()
      return
    }

    const cacheService = getCacheService(c)
    const performanceService = getPerformanceService(c)

    if (!cacheService) {
      await next()
      return
    }

    const startTime = Date.now()
    const cacheKey = keyGenerator(c)

    try {
      // 尝试从缓存获取
      const cached = await cacheService.get<CachedResponse>(cacheKey)

      if (cached) {
        const duration = Date.now() - startTime
        onHit?.(c, cacheKey)

        if (performanceService) {
          performanceService.recordMetric('cache.hit', duration, 'ms', {
            endpoint: c.req.path,
            method: c.req.method
          })
        }

        // 设置缓存相关头部
        setCacheHeaders(c, cached, true)

        // 如果启用了 stale-while-revalidate，在后台更新缓存
        if (staleWhileRevalidate && isStale(cached)) {
          refreshCacheInBackground(c, next, cacheService, cacheKey, cacheOptions, ttl)
        }

        return c.json(cached.data, cached.status, cached.headers)
      }

      // 缓存未命中，执行请求
      onMiss?.(c, cacheKey)

      const response = await executeAndCache(
        c,
        next,
        cacheService,
        cacheKey,
        cacheOptions,
        ttl,
        vary
      )

      const duration = Date.now() - startTime

      if (performanceService) {
        performanceService.recordMetric('cache.miss', duration, 'ms', {
          endpoint: c.req.path,
          method: c.req.method
        })
      }

      return response

    } catch (error) {
      console.error('Cache middleware error:', error)
      // 缓存出错时直接执行请求
      await next()
    }
  }
}

/**
 * 条件缓存中间件 - 基于响应状态和内容决定是否缓存
 */
export function conditionalCacheMiddleware(options: CacheMiddlewareOptions = {}) {
  return cacheMiddleware({
    ...options,
    shouldCache: (c: Context) => {
      // 检查请求头中的缓存控制
      const cacheControl = c.req.header('Cache-Control')
      if (cacheControl?.includes('no-cache') || cacheControl?.includes('no-store')) {
        return false
      }

      // 检查认证状态
      const authorization = c.req.header('Authorization')
      if (authorization && !options.tags?.includes('user-specific')) {
        return false
      }

      return options.shouldCache?.(c) ?? true
    }
  })
}

/**
 * API响应缓存中间件
 */
export function apiCacheMiddleware(options: Partial<CacheMiddlewareOptions> = {}) {
  return cacheMiddleware({
    ttl: 300, // 5分钟默认TTL
    keyGenerator: (c: Context) => {
      const url = new URL(c.req.url)
      const tenant = c.get('tenant')
      const user = c.get('user')

      const keyParts = [
        'api',
        url.pathname,
        url.search,
      ]

      if (tenant?.id) {
        keyParts.push(`tenant:${tenant.id}`)
      }

      if (user?.id && options.tags?.includes('user-specific')) {
        keyParts.push(`user:${user.id}`)
      }

      return keyParts.join(':')
    },
    shouldCache: (c: Context) => {
      // 只缓存成功的GET请求
      return c.req.method === 'GET'
    },
    vary: ['Authorization', 'X-Tenant-ID'],
    ...options
  })
}

/**
 * 页面缓存中间件
 */
export function pageCacheMiddleware(options: Partial<CacheMiddlewareOptions> = {}) {
  return cacheMiddleware({
    ttl: 3600, // 1小时默认TTL
    keyGenerator: (c: Context) => {
      const url = new URL(c.req.url)
      const userAgent = c.req.header('User-Agent') || ''
      const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent)

      return [
        'page',
        url.pathname,
        url.search,
        isMobile ? 'mobile' : 'desktop'
      ].join(':')
    },
    vary: ['User-Agent', 'Accept-Encoding'],
    staleWhileRevalidate: true,
    ...options
  })
}

/**
 * 缓存失效中间件
 */
export function cacheInvalidationMiddleware(
  patterns: string[] | ((c: Context) => string[])
) {
  return async (c: Context, next: Next) => {
    await next()

    // 只在成功的修改操作后失效缓存
    if (c.res.status >= 200 && c.res.status < 300 &&
        ['POST', 'PUT', 'DELETE', 'PATCH'].includes(c.req.method)) {

      const cacheService = getCacheService(c)
      if (cacheService) {
        const invalidationPatterns = typeof patterns === 'function'
          ? patterns(c)
          : patterns

        for (const pattern of invalidationPatterns) {
          await cacheService.deleteByTags([pattern]).catch(console.error)
        }
      }
    }
  }
}

/**
 * 缓存预热中间件
 */
export function cacheWarmupMiddleware(
  warmupConfig: Array<{
    pattern: string
    fetcher: (c: Context) => Promise<any>
    options?: CacheOptions
  }>
) {
  return async (c: Context, next: Next) => {
    await next()

    // 在后台执行缓存预热
    Promise.all(
      warmupConfig.map(async ({ pattern, fetcher, options }) => {
        const cacheService = getCacheService(c)
        if (cacheService) {
          const key = pattern.replace(/\{([^}]+)\}/g, (_, param) => {
            return c.req.param(param) || ''
          })

          const existing = await cacheService.get(key)
          if (!existing) {
            try {
              const data = await fetcher(c)
              await cacheService.set(key, data, options)
            } catch (error) {
              console.error('Cache warmup error:', error)
            }
          }
        }
      })
    ).catch(console.error)
  }
}

// 接口定义
interface CachedResponse {
  data: any
  status: number
  headers: Record<string, string>
  timestamp: number
  ttl: number
  etag?: string
}

// 辅助函数

function getCacheService(c: Context): CacheService | null {
  try {
    const kvService = new KVService(c.env.CACHE_KV)
    return new CacheService(kvService)
  } catch {
    return null
  }
}

function getPerformanceService(c: Context): PerformanceService | null {
  try {
    return new PerformanceService(c.env.CACHE_KV)
  } catch {
    return null
  }
}

function defaultKeyGenerator(c: Context): string {
  const url = new URL(c.req.url)
  return `http:${url.pathname}${url.search}`
}

function defaultShouldCache(c: Context): boolean {
  return c.req.method === 'GET'
}

function setCacheHeaders(c: Context, cached: CachedResponse, isHit: boolean): void {
  const age = Math.floor((Date.now() - cached.timestamp) / 1000)
  const maxAge = Math.floor(cached.ttl / 1000)

  c.header('Cache-Control', `public, max-age=${maxAge}`)
  c.header('Age', age.toString())
  c.header('X-Cache', isHit ? 'HIT' : 'MISS')

  if (cached.etag) {
    c.header('ETag', cached.etag)
  }

  // 设置原始响应头
  Object.entries(cached.headers || {}).forEach(([key, value]) => {
    if (!['Cache-Control', 'Age', 'X-Cache', 'ETag'].includes(key)) {
      c.header(key, value)
    }
  })
}

function isStale(cached: CachedResponse): boolean {
  const age = Date.now() - cached.timestamp
  return age > cached.ttl * 0.8 // 80% TTL 后视为陈旧
}

async function executeAndCache(
  c: Context,
  next: Next,
  cacheService: CacheService,
  cacheKey: string,
  cacheOptions: CacheOptions,
  ttl: number,
  vary: string[]
): Promise<Response> {
  await next()

  const response = c.res

  // 只缓存成功响应
  if (response.status >= 200 && response.status < 300) {
    const responseBody = await response.clone().json().catch(() => null)

    if (responseBody) {
      const cachedResponse: CachedResponse = {
        data: responseBody,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        timestamp: Date.now(),
        ttl: ttl * 1000,
        etag: generateETag(responseBody)
      }

      // 异步缓存，不阻塞响应
      cacheService.set(cacheKey, cachedResponse, {
        ...cacheOptions,
        ttl
      }).catch(console.error)

      setCacheHeaders(c, cachedResponse, false)
    }
  }

  return response
}

async function refreshCacheInBackground(
  c: Context,
  next: Next,
  cacheService: CacheService,
  cacheKey: string,
  cacheOptions: CacheOptions,
  ttl: number
): Promise<void> {
  // 在后台刷新缓存，不影响当前响应
  setTimeout(async () => {
    try {
      // 创建新的上下文执行刷新
      await next()
      const response = c.res

      if (response.status >= 200 && response.status < 300) {
        const responseBody = await response.clone().json().catch(() => null)

        if (responseBody) {
          const cachedResponse: CachedResponse = {
            data: responseBody,
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            timestamp: Date.now(),
            ttl: ttl * 1000,
            etag: generateETag(responseBody)
          }

          await cacheService.set(cacheKey, cachedResponse, {
            ...cacheOptions,
            ttl
          })
        }
      }
    } catch (error) {
      console.error('Background cache refresh error:', error)
    }
  }, 0)
}

function generateETag(data: any): string {
  // 简单的ETag生成，实际项目中可以使用更复杂的哈希算法
  const content = JSON.stringify(data)
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 转换为32位整数
  }
  return `"${hash.toString(36)}"`
}