/**
 * CDN配置 - Cloudflare CDN集成
 *
 * 功能特性：
 * - 缓存策略配置（浏览器缓存、边缘缓存）
 * - CDN路由配置
 * - 响应式图片配置
 * - 缓存清除配置
 * - 预热缓存配置
 */

import { z } from 'zod'

// 缓存控制头配置
export const CacheControlSchema = z.object({
  maxAge: z.number().min(0), // 浏览器缓存时间（秒）
  sMaxAge: z.number().min(0).optional(), // CDN缓存时间（秒）
  staleWhileRevalidate: z.number().min(0).optional(), // 过期后后台更新时间
  staleIfError: z.number().min(0).optional(), // 出错时使用过期缓存时间
  public: z.boolean().default(true), // 是否允许公共缓存
  immutable: z.boolean().default(false), // 是否为不可变资源
  mustRevalidate: z.boolean().default(false) // 是否必须重新验证
})

// 缓存策略配置
export const CacheStrategySchema = z.object({
  static: CacheControlSchema, // 静态资源缓存
  images: CacheControlSchema, // 图片资源缓存
  api: CacheControlSchema, // API响应缓存
  html: CacheControlSchema, // HTML页面缓存
  dynamic: CacheControlSchema // 动态内容缓存
})

// 响应式图片配置
export const ResponsiveImageSchema = z.object({
  sizes: z.array(z.number().min(1)), // 支持的图片尺寸
  formats: z.array(z.enum(['webp', 'avif', 'jpeg', 'png'])), // 支持的图片格式
  quality: z.number().min(1).max(100).default(85), // 默认图片质量
  devicePixelRatios: z.array(z.number().min(1)).default([1, 2]), // 设备像素比
  lazyLoading: z.boolean().default(true), // 是否启用懒加载
  placeholder: z.object({
    enabled: z.boolean().default(true),
    blur: z.number().min(0).default(10), // 模糊程度
    quality: z.number().min(1).max(100).default(20) // 占位图质量
  }).default({})
})

// CDN路由配置
export const CDNRouteSchema = z.object({
  pattern: z.string(), // 路由匹配模式
  cacheStrategy: z.enum(['static', 'images', 'api', 'html', 'dynamic']), // 缓存策略
  headers: z.record(z.string()).optional(), // 自定义响应头
  transform: z.enum(['none', 'minify', 'compress']).default('none'), // 内容转换
  geoRestriction: z.object({
    enabled: z.boolean().default(false),
    allowedCountries: z.array(z.string()).optional(), // 允许的国家代码
    blockedCountries: z.array(z.string()).optional() // 禁止的国家代码
  }).default({})
})

// 缓存清除配置
export const CachePurgeSchema = z.object({
  tags: z.array(z.string()).optional(), // 缓存标签
  urls: z.array(z.string().url()).optional(), // 具体URL
  hostnames: z.array(z.string()).optional(), // 主机名
  prefixes: z.array(z.string()).optional(), // URL前缀
  purgeEverything: z.boolean().default(false) // 是否清除所有缓存
})

// 预热缓存配置
export const CacheWarmupSchema = z.object({
  urls: z.array(z.string().url()), // 需要预热的URL列表
  priority: z.enum(['low', 'medium', 'high']).default('medium'), // 预热优先级
  batchSize: z.number().min(1).max(50).default(10), // 批处理大小
  delay: z.number().min(0).default(100) // 请求间隔（毫秒）
})

// CDN主配置
export const CDNConfigSchema = z.object({
  enabled: z.boolean().default(true), // 是否启用CDN
  zoneName: z.string().optional(), // Cloudflare区域名称
  zoneId: z.string().optional(), // Cloudflare区域ID
  cacheStrategies: CacheStrategySchema,
  responsiveImages: ResponsiveImageSchema,
  routes: z.array(CDNRouteSchema),
  security: z.object({
    hotlinkProtection: z.boolean().default(true), // 防盗链
    refererWhitelist: z.array(z.string()).default([]), // 白名单域名
    ipWhitelist: z.array(z.string()).default([]), // IP白名单
    ipBlacklist: z.array(z.string()).default([]), // IP黑名单
    rateLimiting: z.object({
      enabled: z.boolean().default(true),
      requestsPerMinute: z.number().min(1).default(100),
      burstSize: z.number().min(1).default(200)
    }).default({})
  }).default({}),
  analytics: z.object({
    enabled: z.boolean().default(true),
    sampleRate: z.number().min(0).max(1).default(0.1) // 采样率
  }).default({})
})

// 类型定义
export type CacheControl = z.infer<typeof CacheControlSchema>
export type CacheStrategy = z.infer<typeof CacheStrategySchema>
export type ResponsiveImage = z.infer<typeof ResponsiveImageSchema>
export type CDNRoute = z.infer<typeof CDNRouteSchema>
export type CachePurge = z.infer<typeof CachePurgeSchema>
export type CacheWarmup = z.infer<typeof CacheWarmupSchema>
export type CDNConfig = z.infer<typeof CDNConfigSchema>

// 默认CDN配置
export const defaultCDNConfig: CDNConfig = {
  enabled: true,
  cacheStrategies: {
    static: {
      maxAge: 31536000, // 1年
      sMaxAge: 31536000, // 1年
      public: true,
      immutable: true,
      mustRevalidate: false
    },
    images: {
      maxAge: 2592000, // 30天
      sMaxAge: 7776000, // 90天
      staleWhileRevalidate: 86400, // 1天
      public: true,
      immutable: false,
      mustRevalidate: false
    },
    api: {
      maxAge: 300, // 5分钟
      sMaxAge: 600, // 10分钟
      staleWhileRevalidate: 300, // 5分钟
      public: false,
      immutable: false,
      mustRevalidate: true
    },
    html: {
      maxAge: 3600, // 1小时
      sMaxAge: 7200, // 2小时
      staleWhileRevalidate: 1800, // 30分钟
      public: true,
      immutable: false,
      mustRevalidate: false
    },
    dynamic: {
      maxAge: 0, // 不缓存
      sMaxAge: 60, // 1分钟边缘缓存
      staleWhileRevalidate: 30, // 30秒
      public: false,
      immutable: false,
      mustRevalidate: true
    }
  },
  responsiveImages: {
    sizes: [320, 640, 768, 1024, 1280, 1920],
    formats: ['avif', 'webp', 'jpeg'],
    quality: 85,
    devicePixelRatios: [1, 2],
    lazyLoading: true,
    placeholder: {
      enabled: true,
      blur: 10,
      quality: 20
    }
  },
  routes: [
    {
      pattern: '/static/*',
      cacheStrategy: 'static',
      transform: 'compress'
    },
    {
      pattern: '/images/*',
      cacheStrategy: 'images',
      transform: 'none'
    },
    {
      pattern: '/api/*',
      cacheStrategy: 'api',
      transform: 'minify'
    },
    {
      pattern: '/*.html',
      cacheStrategy: 'html',
      transform: 'minify'
    },
    {
      pattern: '/*',
      cacheStrategy: 'dynamic',
      transform: 'none'
    }
  ],
  security: {
    hotlinkProtection: true,
    refererWhitelist: [],
    ipWhitelist: [],
    ipBlacklist: [],
    rateLimiting: {
      enabled: true,
      requestsPerMinute: 100,
      burstSize: 200
    }
  },
  analytics: {
    enabled: true,
    sampleRate: 0.1
  }
}

/**
 * 生成Cache-Control响应头
 */
export function generateCacheControlHeader(cacheControl: CacheControl): string {
  const directives: string[] = []

  if (cacheControl.public) {
    directives.push('public')
  } else {
    directives.push('private')
  }

  directives.push(`max-age=${cacheControl.maxAge}`)

  if (cacheControl.sMaxAge !== undefined) {
    directives.push(`s-maxage=${cacheControl.sMaxAge}`)
  }

  if (cacheControl.staleWhileRevalidate !== undefined) {
    directives.push(`stale-while-revalidate=${cacheControl.staleWhileRevalidate}`)
  }

  if (cacheControl.staleIfError !== undefined) {
    directives.push(`stale-if-error=${cacheControl.staleIfError}`)
  }

  if (cacheControl.immutable) {
    directives.push('immutable')
  }

  if (cacheControl.mustRevalidate) {
    directives.push('must-revalidate')
  }

  return directives.join(', ')
}

/**
 * 根据路由匹配缓存策略
 */
export function matchCacheStrategy(url: string, routes: CDNRoute[]): CDNRoute | null {
  for (const route of routes) {
    const pattern = route.pattern.replace(/\*/g, '.*')
    const regex = new RegExp(`^${pattern}$`)
    if (regex.test(url)) {
      return route
    }
  }
  return null
}

/**
 * 验证CDN配置
 */
export function validateCDNConfig(config: unknown): CDNConfig {
  return CDNConfigSchema.parse(config)
}

/**
 * 合并CDN配置
 */
export function mergeCDNConfig(base: CDNConfig, override: Partial<CDNConfig>): CDNConfig {
  return {
    ...base,
    ...override,
    cacheStrategies: {
      ...base.cacheStrategies,
      ...override.cacheStrategies
    },
    responsiveImages: {
      ...base.responsiveImages,
      ...override.responsiveImages
    },
    routes: override.routes || base.routes,
    security: {
      ...base.security,
      ...override.security
    },
    analytics: {
      ...base.analytics,
      ...override.analytics
    }
  }
}