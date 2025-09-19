/**
 * CDN服务 - Cloudflare CDN集成服务
 *
 * 功能特性：
 * - 缓存策略管理（浏览器缓存、边缘缓存）
 * - CDN路由配置
 * - 懒加载支持
 * - 响应式图片（srcset生成）
 * - 缓存清除API
 * - 预热缓存功能
 * - 性能监控和分析
 */

import { Env } from '../index'
import {
  CDNConfig,
  CDNRoute,
  CachePurge,
  CacheWarmup,
  ResponsiveImage,
  CacheStrategy,
  defaultCDNConfig,
  generateCacheControlHeader,
  matchCacheStrategy,
  validateCDNConfig,
  mergeCDNConfig
} from '../config/cdn'

export interface CDNServiceOptions {
  config?: Partial<CDNConfig>
  debug?: boolean
}

export interface ImageTransformOptions {
  width?: number
  height?: number
  quality?: number
  format?: 'webp' | 'avif' | 'jpeg' | 'png'
  fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad'
  gravity?: 'auto' | 'center' | 'top' | 'bottom' | 'left' | 'right'
  dpr?: number // 设备像素比
}

export interface ResponsiveImageSet {
  src: string
  srcset: string
  sizes: string
  placeholder?: string
  formats: Array<{
    format: string
    srcset: string
  }>
}

export interface CacheMetrics {
  hitRate: number
  bandwidth: number
  requests: number
  responseTime: number
  geoDistribution: Record<string, number>
  topUrls: Array<{ url: string; requests: number }>
}

export interface PurgeResult {
  success: boolean
  purgedUrls: string[]
  errors: string[]
  purgeId?: string
}

export interface WarmupResult {
  success: boolean
  warmedUrls: string[]
  failed: Array<{ url: string; error: string }>
  duration: number
}

export class CDNService {
  private config: CDNConfig
  private env: Env
  private debug: boolean

  constructor(env: Env, options: CDNServiceOptions = {}) {
    this.env = env
    this.debug = options.debug || false
    this.config = options.config ?
      mergeCDNConfig(defaultCDNConfig, options.config) :
      defaultCDNConfig

    if (this.debug) {
      console.log('CDN Service initialized with config:', this.config)
    }
  }

  /**
   * 获取CDN配置
   */
  getConfig(): CDNConfig {
    return this.config
  }

  /**
   * 更新CDN配置
   */
  updateConfig(newConfig: Partial<CDNConfig>): void {
    this.config = mergeCDNConfig(this.config, newConfig)
  }

  /**
   * 应用缓存头到响应
   */
  applyCacheHeaders(response: Response, url: string): Response {
    if (!this.config.enabled) {
      return response
    }

    const route = matchCacheStrategy(url, this.config.routes)
    if (!route) {
      return response
    }

    const cacheStrategy = this.config.cacheStrategies[route.cacheStrategy]
    const cacheControl = generateCacheControlHeader(cacheStrategy)

    const headers = new Headers(response.headers)
    headers.set('Cache-Control', cacheControl)
    headers.set('X-CDN-Cache', 'MISS') // 初始为MISS，实际由CDN设置
    headers.set('X-Cache-Strategy', route.cacheStrategy)

    // 添加自定义头
    if (route.headers) {
      Object.entries(route.headers).forEach(([key, value]) => {
        headers.set(key, value)
      })
    }

    // 添加性能头
    headers.set('X-Response-Time', Date.now().toString())

    // 添加安全头
    if (this.config.security.hotlinkProtection) {
      headers.set('X-Content-Type-Options', 'nosniff')
      headers.set('X-Frame-Options', 'DENY')
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    })
  }

  /**
   * 生成响应式图片集合
   */
  generateResponsiveImageSet(
    baseUrl: string,
    options: Partial<ImageTransformOptions> = {}
  ): ResponsiveImageSet {
    const config = this.config.responsiveImages
    const sizes = config.sizes.sort((a, b) => a - b)
    const formats = config.formats

    // 如果用户指定了格式，优先使用用户格式，否则使用配置的第一个格式
    const primaryFormat = options.format || formats[0]

    // 生成srcset
    const srcsetEntries: string[] = []
    const formatSrcsets: Array<{ format: string; srcset: string }> = []

    // 为每种格式生成srcset
    for (const format of formats) {
      const formatSrcset: string[] = []

      for (const size of sizes) {
        for (const dpr of config.devicePixelRatios) {
          const actualWidth = size * dpr
          const transformUrl = this.buildTransformUrl(baseUrl, {
            ...options,
            width: actualWidth,
            format: format as any,
            quality: options.quality || config.quality
          })

          const descriptor = dpr > 1 ? `${size}w ${dpr}x` : `${size}w`
          formatSrcset.push(`${transformUrl} ${descriptor}`)

          if (format === primaryFormat) { // 主格式用于通用srcset
            srcsetEntries.push(`${transformUrl} ${descriptor}`)
          }
        }
      }

      formatSrcsets.push({
        format,
        srcset: formatSrcset.join(', ')
      })
    }

    // 生成sizes属性
    const sizesAttr = this.generateSizesAttribute(sizes)

    // 默认src（最小尺寸的主格式）
    const defaultSrc = this.buildTransformUrl(baseUrl, {
      ...options,
      width: sizes[0],
      format: primaryFormat as any,
      quality: options.quality || config.quality
    })

    // 生成占位图
    let placeholder: string | undefined
    if (config.placeholder.enabled) {
      placeholder = this.buildTransformUrl(baseUrl, {
        ...options,
        width: 40,
        height: 40,
        quality: config.placeholder.quality,
        format: 'jpeg'
      })
    }

    return {
      src: defaultSrc,
      srcset: srcsetEntries.join(', '),
      sizes: sizesAttr,
      placeholder,
      formats: formatSrcsets
    }
  }

  /**
   * 构建图片转换URL
   */
  private buildTransformUrl(baseUrl: string, options: ImageTransformOptions): string {
    const params = new URLSearchParams()

    if (options.width) params.set('w', options.width.toString())
    if (options.height) params.set('h', options.height.toString())
    if (options.quality) params.set('q', options.quality.toString())
    if (options.format) params.set('f', options.format)
    if (options.fit) params.set('fit', options.fit)
    if (options.gravity) params.set('gravity', options.gravity)
    if (options.dpr) params.set('dpr', options.dpr.toString())

    const separator = baseUrl.includes('?') ? '&' : '?'
    return params.toString() ? `${baseUrl}${separator}${params.toString()}` : baseUrl
  }

  /**
   * 生成sizes属性
   */
  private generateSizesAttribute(sizes: number[]): string {
    const breakpoints = sizes.slice(0, -1) // 除了最大尺寸
    const sizesRules: string[] = []

    for (let i = 0; i < breakpoints.length; i++) {
      const size = breakpoints[i]
      sizesRules.push(`(max-width: ${size}px) ${size}px`)
    }

    // 最大尺寸作为默认
    const maxSize = sizes[sizes.length - 1]
    sizesRules.push(`${maxSize}px`)

    return sizesRules.join(', ')
  }

  /**
   * 清除缓存
   */
  async purgeCache(options: CachePurge): Promise<PurgeResult> {
    if (!this.config.enabled || !this.config.zoneId) {
      return {
        success: false,
        purgedUrls: [],
        errors: ['CDN not configured or disabled']
      }
    }

    try {
      const headers = {
        'Authorization': `Bearer ${this.env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      }

      let purgeData: any = {}

      if (options.purgeEverything) {
        purgeData.purge_everything = true
      } else {
        if (options.urls) purgeData.files = options.urls
        if (options.tags) purgeData.tags = options.tags
        if (options.hostnames) purgeData.hosts = options.hostnames
        if (options.prefixes) purgeData.prefixes = options.prefixes
      }

      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${this.config.zoneId}/purge_cache`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(purgeData)
        }
      )

      const result = await response.json() as any

      if (result.success) {
        const purgedUrls = options.urls || []

        // 记录清除操作
        await this.logCacheOperation('purge', {
          urls: purgedUrls,
          timestamp: new Date().toISOString(),
          purgeId: result.result?.id
        })

        return {
          success: true,
          purgedUrls,
          errors: [],
          purgeId: result.result?.id
        }
      } else {
        return {
          success: false,
          purgedUrls: [],
          errors: result.errors?.map((e: any) => e.message) || ['Unknown error']
        }
      }
    } catch (error) {
      return {
        success: false,
        purgedUrls: [],
        errors: [error instanceof Error ? error.message : 'Cache purge failed']
      }
    }
  }

  /**
   * 预热缓存
   */
  async warmupCache(options: CacheWarmup): Promise<WarmupResult> {
    const startTime = Date.now()
    const warmedUrls: string[] = []
    const failed: Array<{ url: string; error: string }> = []

    try {
      // 分批处理URL
      const batches = this.chunkArray(options.urls, options.batchSize)

      for (const batch of batches) {
        const promises = batch.map(async (url) => {
          try {
            // 验证URL格式
            new URL(url) // 这会抛出错误如果URL无效

            const response = await fetch(url, {
              method: 'GET',
              headers: {
                'User-Agent': 'CDN-Warmup-Bot/1.0',
                'Cache-Control': 'no-cache'
              }
            })

            if (response.ok) {
              warmedUrls.push(url)
            } else {
              failed.push({
                url,
                error: `HTTP ${response.status}: ${response.statusText}`
              })
            }
          } catch (error) {
            failed.push({
              url,
              error: error instanceof Error ? error.message : 'Request failed'
            })
          }
        })

        await Promise.all(promises)

        // 批次间延迟
        if (options.delay > 0) {
          await new Promise(resolve => setTimeout(resolve, options.delay))
        }
      }

      const duration = Date.now() - startTime

      // 记录预热操作
      await this.logCacheOperation('warmup', {
        urls: warmedUrls,
        failed: failed.length,
        duration,
        timestamp: new Date().toISOString()
      })

      return {
        success: failed.length === 0,
        warmedUrls,
        failed,
        duration
      }
    } catch (error) {
      return {
        success: false,
        warmedUrls,
        failed: [
          ...failed,
          {
            url: 'batch_operation',
            error: error instanceof Error ? error.message : 'Warmup failed'
          }
        ],
        duration: Date.now() - startTime
      }
    }
  }

  /**
   * 获取缓存指标
   */
  async getCacheMetrics(timeframe: string = '24h'): Promise<CacheMetrics> {
    if (!this.config.analytics.enabled || !this.config.zoneId) {
      return {
        hitRate: 0,
        bandwidth: 0,
        requests: 0,
        responseTime: 0,
        geoDistribution: {},
        topUrls: []
      }
    }

    try {
      const headers = {
        'Authorization': `Bearer ${this.env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      }

      // 获取分析数据
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${this.config.zoneId}/analytics/dashboard?since=-${timeframe}`,
        { headers }
      )

      const result = await response.json() as any

      if (result.success) {
        const data = result.result
        return {
          hitRate: data.totals?.requests?.cached_percentage || 0,
          bandwidth: data.totals?.bandwidth?.all || 0,
          requests: data.totals?.requests?.all || 0,
          responseTime: data.totals?.avg_response_time || 0,
          geoDistribution: data.geo || {},
          topUrls: data.top_urls || []
        }
      }

      return {
        hitRate: 0,
        bandwidth: 0,
        requests: 0,
        responseTime: 0,
        geoDistribution: {},
        topUrls: []
      }
    } catch (error) {
      if (this.debug) {
        console.error('Failed to fetch cache metrics:', error)
      }
      return {
        hitRate: 0,
        bandwidth: 0,
        requests: 0,
        responseTime: 0,
        geoDistribution: {},
        topUrls: []
      }
    }
  }

  /**
   * 生成懒加载HTML
   */
  generateLazyLoadHTML(
    imageSet: ResponsiveImageSet,
    alt: string = '',
    className: string = ''
  ): string {
    const { src, srcset, sizes, placeholder, formats } = imageSet

    let html = ''

    // 如果支持picture元素
    if (formats.length > 1) {
      html += '<picture>'

      // 为现代格式添加source元素
      for (const format of formats.slice(0, -1)) { // 除了最后一个（兼容格式）
        html += `<source srcset="${format.srcset}" sizes="${sizes}" type="image/${format.format}">`
      }
    }

    // 主img元素
    const imgClasses = className ? ` class="${className}"` : ''
    const lazyAttrs = this.config.responsiveImages.lazyLoading
      ? ' loading="lazy" decoding="async"'
      : ''

    html += `<img${imgClasses} src="${placeholder || src}" data-src="${src}" data-srcset="${srcset}" data-sizes="${sizes}" alt="${alt}"${lazyAttrs}>`

    if (formats.length > 1) {
      html += '</picture>'
    }

    return html
  }

  /**
   * 生成懒加载JavaScript
   */
  generateLazyLoadScript(): string {
    return `
<script>
(function() {
  'use strict';

  // 检查浏览器支持
  if (!('IntersectionObserver' in window)) {
    // 降级处理：立即加载所有图片
    document.querySelectorAll('img[data-src]').forEach(function(img) {
      img.src = img.dataset.src;
      if (img.dataset.srcset) img.srcset = img.dataset.srcset;
      if (img.dataset.sizes) img.sizes = img.dataset.sizes;
    });
    return;
  }

  // 创建观察器
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var img = entry.target;

        // 加载图片
        if (img.dataset.src) {
          img.src = img.dataset.src;
          delete img.dataset.src;
        }

        if (img.dataset.srcset) {
          img.srcset = img.dataset.srcset;
          delete img.dataset.srcset;
        }

        if (img.dataset.sizes) {
          img.sizes = img.dataset.sizes;
          delete img.dataset.sizes;
        }

        // 停止观察
        observer.unobserve(img);

        // 添加加载完成类
        img.addEventListener('load', function() {
          img.classList.add('lazy-loaded');
        });
      }
    });
  }, {
    rootMargin: '50px 0px',
    threshold: 0.01
  });

  // 观察所有懒加载图片
  document.querySelectorAll('img[data-src]').forEach(function(img) {
    observer.observe(img);
  });
})();
</script>`;
  }

  /**
   * 记录缓存操作
   */
  private async logCacheOperation(operation: string, data: any): Promise<void> {
    if (!this.env.CACHE_KV) return

    try {
      const key = `cache_log:${operation}:${Date.now()}`
      await this.env.CACHE_KV.put(key, JSON.stringify(data), {
        expirationTtl: 7 * 24 * 60 * 60 // 7天过期
      })
    } catch (error) {
      if (this.debug) {
        console.error('Failed to log cache operation:', error)
      }
    }
  }

  /**
   * 数组分块工具
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  /**
   * 验证请求是否被地理限制
   */
  validateGeoRestriction(countryCode: string, route: CDNRoute): boolean {
    const geoRestriction = route.geoRestriction

    if (!geoRestriction.enabled) {
      return true
    }

    // 检查黑名单
    if (geoRestriction.blockedCountries &&
        geoRestriction.blockedCountries.includes(countryCode)) {
      return false
    }

    // 检查白名单
    if (geoRestriction.allowedCountries &&
        geoRestriction.allowedCountries.length > 0) {
      return geoRestriction.allowedCountries.includes(countryCode)
    }

    return true
  }

  /**
   * 获取请求的国家代码
   */
  getCountryCode(request: Request): string {
    return request.headers.get('CF-IPCountry') || 'XX'
  }

  /**
   * 生成缓存控制头（公开方法）
   */
  generateCacheControlHeader(cacheControl: any): string {
    return generateCacheControlHeader(cacheControl)
  }
}