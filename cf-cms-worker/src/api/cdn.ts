/**
 * CDN API路由 - CDN管理和优化接口
 *
 * 提供CDN缓存管理、性能分析和优化功能
 */

import { Hono } from 'hono'
import { z } from 'zod'
import { Env } from '../index'
import { CDNService } from '../services/cdnService'
import { CachePurgeSchema, CacheWarmupSchema } from '../config/cdn'
import { successResponse, errorResponse } from '../utils/response'

// 简单的验证中间件
const validateJson = (schema: z.ZodSchema) => {
  return async (c: any, next: any) => {
    try {
      const body = await c.req.json()
      const result = schema.safeParse(body)
      if (!result.success) {
        return errorResponse(c, 'Validation failed', 400, {
          errors: result.error.errors
        })
      }
      c.req.validatedData = result.data
      await next()
    } catch (error) {
      return errorResponse(c, 'Invalid JSON', 400)
    }
  }
}

export const cdnRoutes = new Hono<{ Bindings: Env }>()

// 缓存清除请求验证
const PurgeRequestSchema = CachePurgeSchema.extend({
  reason: z.string().optional() // 清除原因
})

// 缓存预热请求验证
const WarmupRequestSchema = CacheWarmupSchema.extend({
  reason: z.string().optional() // 预热原因
})

// 响应式图片请求验证
const ResponsiveImageRequestSchema = z.object({
  url: z.string().url(),
  width: z.number().min(1).optional(),
  height: z.number().min(1).optional(),
  quality: z.number().min(1).max(100).optional(),
  format: z.enum(['webp', 'avif', 'jpeg', 'png']).optional()
})

/**
 * 获取CDN配置
 */
cdnRoutes.get('/config', async (c) => {
  try {
    const cdnService = new CDNService(c.env)
    const config = cdnService.getConfig()

    return successResponse(c, {
      config: {
        enabled: config.enabled,
        cacheStrategies: config.cacheStrategies,
        responsiveImages: config.responsiveImages,
        security: config.security,
        analytics: config.analytics
      }
    })
  } catch (error) {
    return errorResponse(c, 'Failed to get CDN config', 500)
  }
})

/**
 * 清除缓存
 */
cdnRoutes.post('/purge', validateJson(PurgeRequestSchema), async (c) => {
  try {
    const data = c.req.validatedData
    const cdnService = new CDNService(c.env)

    const result = await cdnService.purgeCache(data)

    if (result.success) {
      return successResponse(c, {
        message: 'Cache purged successfully',
        purgedUrls: result.purgedUrls,
        purgeId: result.purgeId
      })
    } else {
      return errorResponse(c, 'Cache purge failed', 400, {
        errors: result.errors
      })
    }
  } catch (error) {
    return errorResponse(c, 'Cache purge request failed', 500)
  }
})

/**
 * 预热缓存
 */
cdnRoutes.post('/warmup', validateJson(WarmupRequestSchema), async (c) => {
  try {
    const data = c.req.validatedData
    const cdnService = new CDNService(c.env)

    const result = await cdnService.warmupCache(data)

    return successResponse(c, {
      message: 'Cache warmup completed',
      success: result.success,
      warmedUrls: result.warmedUrls,
      failed: result.failed,
      duration: result.duration,
      stats: {
        total: data.urls.length,
        successful: result.warmedUrls.length,
        failed: result.failed.length
      }
    })
  } catch (error) {
    return errorResponse(c, 'Cache warmup request failed', 500)
  }
})

/**
 * 获取缓存指标
 */
cdnRoutes.get('/metrics', async (c) => {
  try {
    const timeframe = c.req.query('timeframe') || '24h'
    const cdnService = new CDNService(c.env)

    const metrics = await cdnService.getCacheMetrics(timeframe)

    return successResponse(c, {
      metrics,
      timeframe,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return errorResponse(c, 'Failed to get cache metrics', 500)
  }
})

/**
 * 生成响应式图片集合
 */
cdnRoutes.post('/responsive-image', validateJson(ResponsiveImageRequestSchema), async (c) => {
  try {
    const data = c.req.validatedData
    const cdnService = new CDNService(c.env)

    const imageSet = cdnService.generateResponsiveImageSet(data.url, {
      width: data.width,
      height: data.height,
      quality: data.quality,
      format: data.format
    })

    return successResponse(c, {
      imageSet,
      baseUrl: data.url
    })
  } catch (error) {
    return errorResponse(c, 'Failed to generate responsive image set', 500)
  }
})

// 懒加载HTML请求验证
const LazyHtmlRequestSchema = z.object({
  imageSet: z.object({
    src: z.string(),
    srcset: z.string(),
    sizes: z.string(),
    placeholder: z.string().optional(),
    formats: z.array(z.object({
      format: z.string(),
      srcset: z.string()
    }))
  }),
  alt: z.string().default(''),
  className: z.string().default('')
})

/**
 * 生成懒加载HTML
 */
cdnRoutes.post('/lazy-html', validateJson(LazyHtmlRequestSchema), async (c) => {
  try {
    const { imageSet, alt, className } = c.req.validatedData
    const cdnService = new CDNService(c.env)

    const html = cdnService.generateLazyLoadHTML(imageSet, alt, className)
    const script = cdnService.generateLazyLoadScript()

    return successResponse(c, {
      html,
      script,
      usage: {
        html: 'Insert this HTML where you want the image',
        script: 'Include this script once in your page <head> or before </body>'
      }
    })
  } catch (error) {
    return errorResponse(c, 'Failed to generate lazy load HTML', 500)
  }
})

/**
 * 分析URL缓存策略
 */
cdnRoutes.get('/analyze', async (c) => {
  try {
    const url = c.req.query('url')
    if (!url) {
      return errorResponse(c, 'URL parameter is required', 400)
    }

    const cdnService = new CDNService(c.env)
    const config = cdnService.getConfig()

    // 匹配缓存策略
    let matchedRoute = null
    for (const route of config.routes) {
      const pattern = route.pattern.replace(/\*/g, '.*')
      const regex = new RegExp(`^${pattern}$`)
      if (regex.test(url)) {
        matchedRoute = route
        break
      }
    }

    if (!matchedRoute) {
      return errorResponse(c, 'No cache strategy found for this URL', 404)
    }

    const cacheStrategy = config.cacheStrategies[matchedRoute.cacheStrategy]

    return successResponse(c, {
      url,
      matchedRoute,
      cacheStrategy,
      headers: {
        'Cache-Control': cdnService.generateCacheControlHeader ?
          cdnService.generateCacheControlHeader(cacheStrategy) :
          'Not available'
      },
      recommendations: {
        static: matchedRoute.cacheStrategy === 'static' ?
          'Optimal for static assets like CSS, JS, images' :
          'Consider using static strategy for unchanging files',
        security: config.security.hotlinkProtection ?
          'Hotlink protection enabled' :
          'Consider enabling hotlink protection',
        performance: cacheStrategy.maxAge > 86400 ?
          'Good cache duration for performance' :
          'Consider longer cache duration for better performance'
      }
    })
  } catch (error) {
    return errorResponse(c, 'Failed to analyze URL', 500)
  }
})

/**
 * 获取CDN健康状态
 */
cdnRoutes.get('/health', async (c) => {
  try {
    const cdnService = new CDNService(c.env)
    const config = cdnService.getConfig()

    // 基本健康检查
    const health = {
      status: 'healthy',
      cdn: {
        enabled: config.enabled,
        configured: !!(config.zoneId && c.env.CLOUDFLARE_API_TOKEN)
      },
      features: {
        cacheManagement: !!(config.zoneId && c.env.CLOUDFLARE_API_TOKEN),
        responsiveImages: config.responsiveImages.sizes.length > 0,
        lazyLoading: config.responsiveImages.lazyLoading,
        analytics: config.analytics.enabled,
        security: config.security.hotlinkProtection
      },
      routes: config.routes.length,
      timestamp: new Date().toISOString()
    }

    // 检查是否有配置问题
    const warnings = []
    if (!config.enabled) {
      warnings.push('CDN is disabled')
    }
    if (!config.zoneId) {
      warnings.push('Zone ID not configured - cache management unavailable')
    }
    if (!c.env.CLOUDFLARE_API_TOKEN) {
      warnings.push('API token not configured - cache management unavailable')
    }
    if (config.routes.length === 0) {
      warnings.push('No cache routes configured')
    }

    if (warnings.length > 0) {
      health.status = 'degraded'
      ;(health as any).warnings = warnings
    }

    return successResponse(c, health)
  } catch (error) {
    return errorResponse(c, 'Health check failed', 500)
  }
})

/**
 * 获取缓存统计信息
 */
cdnRoutes.get('/stats', async (c) => {
  try {
    const cdnService = new CDNService(c.env)

    // 从KV存储获取操作日志统计
    const stats = {
      operations: {
        purge: 0,
        warmup: 0
      },
      lastPurge: null,
      lastWarmup: null,
      timestamp: new Date().toISOString()
    }

    if (c.env.CACHE_KV) {
      try {
        // 获取最近的操作日志
        const { keys } = await c.env.CACHE_KV.list({ prefix: 'cache_log:', limit: 100 })

        for (const key of keys) {
          if (key.name.includes(':purge:')) {
            stats.operations.purge++
            if (!stats.lastPurge || key.name > stats.lastPurge) {
              stats.lastPurge = key.name
            }
          } else if (key.name.includes(':warmup:')) {
            stats.operations.warmup++
            if (!stats.lastWarmup || key.name > stats.lastWarmup) {
              stats.lastWarmup = key.name
            }
          }
        }
      } catch (kvError) {
        // KV操作失败不影响响应
      }
    }

    return successResponse(c, stats)
  } catch (error) {
    return errorResponse(c, 'Failed to get cache stats', 500)
  }
})