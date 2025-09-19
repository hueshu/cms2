/**
 * CDN服务单元测试
 *
 * 测试功能：
 * - 缓存策略匹配和应用
 * - 响应式图片生成
 * - 缓存清除和预热
 * - 懒加载HTML生成
 * - 地理限制验证
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CDNService } from '../cdnService'
import { defaultCDNConfig, CDNConfig } from '../../config/cdn'
import { Env } from '../../index'

// Mock环境
const mockEnv: Env = {
  DB: {} as D1Database,
  CACHE_KV: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    list: vi.fn()
  } as any,
  ENVIRONMENT: 'test',
  JWT_SECRET: 'test-secret',
  CLOUDFLARE_API_TOKEN: 'test-token'
}

// 带有完整CDN配置的测试环境
const mockEnvWithCDN: Env = {
  ...mockEnv,
  CLOUDFLARE_API_TOKEN: 'test-token'
}

// Mock fetch
global.fetch = vi.fn()

describe('CDNService', () => {
  let cdnService: CDNService

  beforeEach(() => {
    vi.clearAllMocks()
    cdnService = new CDNService(mockEnv, { debug: true })
  })

  describe('配置管理', () => {
    it('应该使用默认配置初始化', () => {
      const config = cdnService.getConfig()
      expect(config).toEqual(defaultCDNConfig)
    })

    it('应该能够更新配置', () => {
      const newConfig: Partial<CDNConfig> = {
        enabled: false,
        cacheStrategies: {
          ...defaultCDNConfig.cacheStrategies,
          static: {
            ...defaultCDNConfig.cacheStrategies.static,
            maxAge: 86400
          }
        }
      }

      cdnService.updateConfig(newConfig)
      const config = cdnService.getConfig()

      expect(config.enabled).toBe(false)
      expect(config.cacheStrategies.static.maxAge).toBe(86400)
    })

    it('应该能够使用自定义配置初始化', () => {
      const customConfig: Partial<CDNConfig> = {
        enabled: false,
        responsiveImages: {
          ...defaultCDNConfig.responsiveImages,
          sizes: [480, 768, 1024]
        }
      }

      const customCDNService = new CDNService(mockEnv, { config: customConfig })
      const config = customCDNService.getConfig()

      expect(config.enabled).toBe(false)
      expect(config.responsiveImages.sizes).toEqual([480, 768, 1024])
    })
  })

  describe('缓存头应用', () => {
    it('应该为静态资源应用正确的缓存头', () => {
      const mockResponse = new Response('test content', { status: 200 })
      const url = '/static/app.js'

      const response = cdnService.applyCacheHeaders(mockResponse, url)

      expect(response.headers.get('Cache-Control')).toBe(
        'public, max-age=31536000, s-maxage=31536000, immutable'
      )
      expect(response.headers.get('X-Cache-Strategy')).toBe('static')
    })

    it('应该为图片资源应用正确的缓存头', () => {
      const mockResponse = new Response('image data', { status: 200 })
      const url = '/images/photo.jpg'

      const response = cdnService.applyCacheHeaders(mockResponse, url)

      expect(response.headers.get('Cache-Control')).toBe(
        'public, max-age=2592000, s-maxage=7776000, stale-while-revalidate=86400'
      )
      expect(response.headers.get('X-Cache-Strategy')).toBe('images')
    })

    it('应该为API响应应用正确的缓存头', () => {
      const mockResponse = new Response('{"data": "test"}', { status: 200 })
      const url = '/api/v1/articles'

      const response = cdnService.applyCacheHeaders(mockResponse, url)

      expect(response.headers.get('Cache-Control')).toBe(
        'private, max-age=300, s-maxage=600, stale-while-revalidate=300, must-revalidate'
      )
      expect(response.headers.get('X-Cache-Strategy')).toBe('api')
    })

    it('CDN禁用时不应该修改响应', () => {
      cdnService.updateConfig({ enabled: false })
      const mockResponse = new Response('test content', { status: 200 })
      const url = '/static/app.js'

      const response = cdnService.applyCacheHeaders(mockResponse, url)

      expect(response.headers.get('Cache-Control')).toBeNull()
      expect(response.headers.get('X-Cache-Strategy')).toBeNull()
    })
  })

  describe('响应式图片生成', () => {
    it('应该生成完整的响应式图片集合', () => {
      const baseUrl = 'https://example.com/image.jpg'
      const imageSet = cdnService.generateResponsiveImageSet(baseUrl)

      expect(imageSet.src).toBe('https://example.com/image.jpg?w=320&q=85&f=avif')
      expect(imageSet.srcset).toContain('320w')
      expect(imageSet.srcset).toContain('640w')
      expect(imageSet.srcset).toContain('1920w')
      expect(imageSet.sizes).toContain('(max-width: 320px) 320px')
      expect(imageSet.formats).toHaveLength(3) // avif, webp, jpeg
      expect(imageSet.placeholder).toBeTruthy()
    })

    it('应该支持自定义图片转换选项', () => {
      const baseUrl = 'https://example.com/image.jpg'
      const options = {
        quality: 70,
        format: 'webp' as const,
        fit: 'crop' as const
      }

      const imageSet = cdnService.generateResponsiveImageSet(baseUrl, options)

      expect(imageSet.src).toBe('https://example.com/image.jpg?w=320&q=70&f=webp&fit=crop')
    })

    it('应该正确处理带查询参数的URL', () => {
      const baseUrl = 'https://example.com/image.jpg?v=1'
      const imageSet = cdnService.generateResponsiveImageSet(baseUrl)

      expect(imageSet.src).toBe('https://example.com/image.jpg?v=1&w=320&q=85&f=avif')
    })

    it('应该生成正确的sizes属性', () => {
      const baseUrl = 'https://example.com/image.jpg'
      const imageSet = cdnService.generateResponsiveImageSet(baseUrl)

      const expectedSizes = [
        '(max-width: 320px) 320px',
        '(max-width: 640px) 640px',
        '(max-width: 768px) 768px',
        '(max-width: 1024px) 1024px',
        '(max-width: 1280px) 1280px',
        '1920px'
      ].join(', ')

      expect(imageSet.sizes).toBe(expectedSizes)
    })
  })

  describe('懒加载功能', () => {
    it('应该生成正确的懒加载HTML', () => {
      const imageSet = {
        src: 'https://example.com/image.jpg',
        srcset: 'https://example.com/image.jpg?w=320 320w, https://example.com/image.jpg?w=640 640w',
        sizes: '(max-width: 640px) 320px, 640px',
        placeholder: 'https://example.com/image.jpg?w=40&h=40&q=20',
        formats: [
          { format: 'avif', srcset: 'https://example.com/image.avif?w=320 320w' },
          { format: 'webp', srcset: 'https://example.com/image.webp?w=320 320w' },
          { format: 'jpeg', srcset: 'https://example.com/image.jpg?w=320 320w' }
        ]
      }

      const html = cdnService.generateLazyLoadHTML(imageSet, 'Test image', 'responsive-image')

      expect(html).toContain('<picture>')
      expect(html).toContain('<source srcset="https://example.com/image.avif?w=320 320w"')
      expect(html).toContain('<source srcset="https://example.com/image.webp?w=320 320w"')
      expect(html).toContain('class="responsive-image"')
      expect(html).toContain('alt="Test image"')
      expect(html).toContain('loading="lazy"')
      expect(html).toContain('decoding="async"')
      expect(html).toContain('data-src="https://example.com/image.jpg"')
    })

    it('应该生成懒加载JavaScript', () => {
      const script = cdnService.generateLazyLoadScript()

      expect(script).toContain('IntersectionObserver')
      expect(script).toContain('data-src')
      expect(script).toContain('lazy-loaded')
      expect(script).toContain('rootMargin: \'50px 0px\'')
    })
  })

  describe('缓存清除', () => {
    it('应该成功清除指定URL的缓存', async () => {
      // 创建带有zoneId配置的CDN服务
      const cdnServiceWithZone = new CDNService(mockEnvWithCDN, {
        debug: true,
        config: {
          zoneId: 'test-zone-id'
        }
      })

      const mockResponse = {
        json: () => Promise.resolve({
          success: true,
          result: { id: 'purge-123' }
        })
      }
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

      const result = await cdnServiceWithZone.purgeCache({
        urls: ['https://example.com/image.jpg', 'https://example.com/style.css']
      })

      expect(result.success).toBe(true)
      expect(result.purgedUrls).toEqual(['https://example.com/image.jpg', 'https://example.com/style.css'])
      expect(result.purgeId).toBe('purge-123')
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/purge_cache'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          }),
          body: expect.stringContaining('"files":')
        })
      )
    })

    it('应该支持按标签清除缓存', async () => {
      const cdnServiceWithZone = new CDNService(mockEnvWithCDN, {
        debug: true,
        config: {
          zoneId: 'test-zone-id'
        }
      })

      const mockResponse = {
        json: () => Promise.resolve({
          success: true,
          result: { id: 'purge-456' }
        })
      }
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

      const result = await cdnServiceWithZone.purgeCache({
        tags: ['images', 'static']
      })

      expect(result.success).toBe(true)
      expect(fetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          body: expect.stringContaining('"tags":["images","static"]')
        })
      )
    })

    it('应该支持清除所有缓存', async () => {
      const cdnServiceWithZone = new CDNService(mockEnvWithCDN, {
        debug: true,
        config: {
          zoneId: 'test-zone-id'
        }
      })

      const mockResponse = {
        json: () => Promise.resolve({
          success: true,
          result: { id: 'purge-all' }
        })
      }
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

      const result = await cdnServiceWithZone.purgeCache({
        purgeEverything: true
      })

      expect(result.success).toBe(true)
      expect(fetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          body: expect.stringContaining('"purge_everything":true')
        })
      )
    })

    it('缓存清除失败时应该返回错误', async () => {
      const cdnServiceWithZone = new CDNService(mockEnvWithCDN, {
        debug: true,
        config: {
          zoneId: 'test-zone-id'
        }
      })

      const mockResponse = {
        json: () => Promise.resolve({
          success: false,
          errors: [{ message: 'Zone not found' }]
        })
      }
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

      const result = await cdnServiceWithZone.purgeCache({
        urls: ['https://example.com/image.jpg']
      })

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Zone not found')
    })
  })

  describe('缓存预热', () => {
    it('应该成功预热指定的URL列表', async () => {
      // Mock成功的HTTP响应
      vi.mocked(fetch)
        .mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK' } as Response)
        .mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK' } as Response)
        .mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK' } as Response)

      const result = await cdnService.warmupCache({
        urls: [
          'https://example.com/page1.html',
          'https://example.com/page2.html',
          'https://example.com/image.jpg'
        ],
        batchSize: 2,
        delay: 0
      })

      expect(result.success).toBe(true)
      expect(result.warmedUrls).toEqual([
        'https://example.com/page1.html',
        'https://example.com/page2.html',
        'https://example.com/image.jpg'
      ])
      expect(result.failed).toHaveLength(0)
      expect(result.duration).toBeGreaterThanOrEqual(0) // 允许为0，在测试环境中可能很快
      expect(fetch).toHaveBeenCalledTimes(3)
    })

    it('应该处理预热失败的URL', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK' } as Response)
        .mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' } as Response)
        .mockRejectedValueOnce(new Error('Network error'))

      const result = await cdnService.warmupCache({
        urls: [
          'https://example.com/success.html',
          'https://example.com/notfound.html',
          'https://example.com/error.html'
        ],
        batchSize: 3,
        delay: 0
      })

      expect(result.success).toBe(false)
      expect(result.warmedUrls).toEqual(['https://example.com/success.html'])
      expect(result.failed).toHaveLength(2)
      expect(result.failed[0]).toEqual({
        url: 'https://example.com/notfound.html',
        error: 'HTTP 404: Not Found'
      })
      expect(result.failed[1]).toEqual({
        url: 'https://example.com/error.html',
        error: 'Network error'
      })
    })

    it('应该按批次处理URL并支持延迟', async () => {
      const startTime = Date.now()

      vi.mocked(fetch).mockResolvedValue({ ok: true, status: 200, statusText: 'OK' } as Response)

      const result = await cdnService.warmupCache({
        urls: ['https://example.com/url1', 'https://example.com/url2', 'https://example.com/url3', 'https://example.com/url4'],
        batchSize: 2,
        delay: 50 // 50ms延迟
      })

      const duration = Date.now() - startTime

      expect(result.success).toBe(true)
      expect(result.warmedUrls).toHaveLength(4)
      expect(duration).toBeGreaterThanOrEqual(50) // 至少有一个批次延迟
    })
  })

  describe('地理限制', () => {
    it('应该允许无地理限制的请求', () => {
      const route = {
        pattern: '/api/*',
        cacheStrategy: 'api' as const,
        geoRestriction: { enabled: false }
      }

      const isAllowed = cdnService.validateGeoRestriction('CN', route)
      expect(isAllowed).toBe(true)
    })

    it('应该阻止黑名单国家的请求', () => {
      const route = {
        pattern: '/api/*',
        cacheStrategy: 'api' as const,
        geoRestriction: {
          enabled: true,
          blockedCountries: ['CN', 'RU']
        }
      }

      const isAllowed = cdnService.validateGeoRestriction('CN', route)
      expect(isAllowed).toBe(false)
    })

    it('应该只允许白名单国家的请求', () => {
      const route = {
        pattern: '/api/*',
        cacheStrategy: 'api' as const,
        geoRestriction: {
          enabled: true,
          allowedCountries: ['US', 'UK']
        }
      }

      expect(cdnService.validateGeoRestriction('US', route)).toBe(true)
      expect(cdnService.validateGeoRestriction('CN', route)).toBe(false)
    })

    it('应该正确获取国家代码', () => {
      const request = new Request('https://example.com/', {
        headers: { 'CF-IPCountry': 'US' }
      })

      const countryCode = cdnService.getCountryCode(request)
      expect(countryCode).toBe('US')
    })

    it('缺少国家代码头时应该返回默认值', () => {
      const request = new Request('https://example.com/')

      const countryCode = cdnService.getCountryCode(request)
      expect(countryCode).toBe('XX')
    })
  })

  describe('缓存指标', () => {
    it('分析禁用时应该返回空指标', async () => {
      cdnService.updateConfig({
        analytics: { enabled: false, sampleRate: 0.1 }
      })

      const metrics = await cdnService.getCacheMetrics()

      expect(metrics).toEqual({
        hitRate: 0,
        bandwidth: 0,
        requests: 0,
        responseTime: 0,
        geoDistribution: {},
        topUrls: []
      })
    })

    it('应该获取并解析Cloudflare分析数据', async () => {
      cdnService.updateConfig({
        zoneId: 'test-zone-id',
        analytics: { enabled: true, sampleRate: 0.1 }
      })

      const mockAnalyticsResponse = {
        json: () => Promise.resolve({
          success: true,
          result: {
            totals: {
              requests: { cached_percentage: 85, all: 10000 },
              bandwidth: { all: 5000000 },
              avg_response_time: 150
            },
            geo: { US: 60, UK: 25, CN: 15 },
            top_urls: [
              { url: '/page1', requests: 500 },
              { url: '/page2', requests: 300 }
            ]
          }
        })
      }
      vi.mocked(fetch).mockResolvedValueOnce(mockAnalyticsResponse as any)

      const metrics = await cdnService.getCacheMetrics('24h')

      expect(metrics.hitRate).toBe(85)
      expect(metrics.requests).toBe(10000)
      expect(metrics.bandwidth).toBe(5000000)
      expect(metrics.responseTime).toBe(150)
      expect(metrics.geoDistribution).toEqual({ US: 60, UK: 25, CN: 15 })
      expect(metrics.topUrls).toHaveLength(2)
    })
  })

  describe('错误处理', () => {
    it('CDN未配置时应该返回错误', async () => {
      const cdnServiceWithoutConfig = new CDNService({
        ...mockEnv,
        CLOUDFLARE_API_TOKEN: undefined
      })

      const result = await cdnServiceWithoutConfig.purgeCache({
        urls: ['https://example.com/test.jpg']
      })

      expect(result.success).toBe(false)
      expect(result.errors).toContain('CDN not configured or disabled')
    })

    it('网络错误时应该正确处理', async () => {
      const cdnServiceWithZone = new CDNService(mockEnvWithCDN, {
        debug: true,
        config: {
          zoneId: 'test-zone-id'
        }
      })

      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const result = await cdnServiceWithZone.purgeCache({
        urls: ['https://example.com/test.jpg']
      })

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Network error')
    })

    it('KV存储错误时应该继续执行', async () => {
      const mockKV = {
        ...mockEnv.CACHE_KV,
        put: vi.fn().mockRejectedValueOnce(new Error('KV error'))
      }

      const cdnServiceWithBadKV = new CDNService(
        { ...mockEnv, CACHE_KV: mockKV },
        { debug: true }
      )

      // 这应该不会抛出错误，即使KV操作失败
      await expect(async () => {
        const mockResponse = {
          json: () => Promise.resolve({
            success: true,
            result: { id: 'purge-123' }
          })
        }
        vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

        await cdnServiceWithBadKV.purgeCache({
          urls: ['https://example.com/test.jpg']
        })
      }).not.toThrow()
    })
  })
})