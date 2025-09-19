/**
 * 图片处理API测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'
import { imagesRoutes } from '../images'
import { ImageService } from '../../services/imageService'

// Mock环境
const createMockEnv = () => ({
  DB: {} as D1Database,
  CACHE_KV: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    getWithMetadata: vi.fn()
  } as any,
  ENVIRONMENT: 'test',
  JWT_SECRET: 'test-secret'
})

// Mock fetch
global.fetch = vi.fn()

describe('图片处理API', () => {
  let app: Hono
  let env: any

  beforeEach(() => {
    env = createMockEnv()
    app = new Hono()
    app.route('/images', imagesRoutes)
    vi.clearAllMocks()
  })

  describe('GET /images/info', () => {
    it('应该返回支持的格式和限制信息', async () => {
      const res = await app.request('/images/info', {}, env)

      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('supportedFormats')
      expect(data.data).toHaveProperty('maxDimensions')
      expect(data.data).toHaveProperty('features')
      expect(data.data.supportedFormats).toContain('png')
      expect(data.data.supportedFormats).toContain('webp')
      expect(data.data.supportedFormats).toContain('avif')
    })
  })

  describe('GET /images/health', () => {
    it('应该返回健康状态', async () => {
      // Mock KV operations
      env.CACHE_KV.put.mockResolvedValue(undefined)
      env.CACHE_KV.get.mockResolvedValue('ok')
      env.CACHE_KV.delete.mockResolvedValue(undefined)

      const res = await app.request('/images/health', {}, env)

      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('status', 'healthy')
      expect(data.data).toHaveProperty('services')
      expect(data.data.services.cache).toBe('ok')
    })

    it('当KV存储失败时应该返回错误', async () => {
      env.CACHE_KV.put.mockRejectedValue(new Error('KV错误'))

      const res = await app.request('/images/health', {}, env)

      expect(res.status).toBe(500)

      const data = await res.json()
      expect(data.success).toBe(false)
    })
  })

  describe('GET /images/generate', () => {
    it('应该生成文字图片', async () => {
      // Mock缓存未命中
      env.CACHE_KV.get.mockResolvedValue(null)
      env.CACHE_KV.put.mockResolvedValue(undefined)

      const res = await app.request('/images/generate?text=Hello%20World&width=800&height=400', {}, env)

      expect(res.status).toBe(200)

      const contentType = res.headers.get('Content-Type')
      expect(contentType).toMatch(/^image\/(svg\+xml|png)/)

      // 验证缓存操作
      expect(env.CACHE_KV.get).toHaveBeenCalled()
      expect(env.CACHE_KV.put).toHaveBeenCalled()
    })

    it('应该从缓存返回图片', async () => {
      const mockImageData = new ArrayBuffer(100)
      const mockResponse = new Response(mockImageData, {
        headers: { 'Content-Type': 'image/png' }
      })

      // Mock缓存命中
      env.CACHE_KV.get.mockResolvedValue(mockImageData)
      env.CACHE_KV.getWithMetadata.mockResolvedValue({
        value: mockImageData,
        metadata: { contentType: 'image/png' }
      })

      const res = await app.request('/images/generate?text=Hello%20World', {}, env)

      expect(res.status).toBe(200)
      expect(res.headers.get('X-Cache')).toBe('HIT')
    })

    it('应该验证参数', async () => {
      // 缺少text参数
      const res1 = await app.request('/images/generate', {}, env)
      expect(res1.status).toBe(400)

      // 无效尺寸
      const res2 = await app.request('/images/generate?text=hello&width=5000', {}, env)
      expect(res2.status).toBe(400)

      // 无效颜色
      const res3 = await app.request('/images/generate?text=hello&backgroundColor=invalid', {}, env)
      expect(res3.status).toBe(400)
    })
  })

  describe('POST /images/generate', () => {
    it('应该处理JSON请求', async () => {
      env.CACHE_KV.get.mockResolvedValue(null)
      env.CACHE_KV.put.mockResolvedValue(undefined)

      const requestBody = {
        text: 'Hello World',
        width: 800,
        height: 400,
        backgroundColor: '#ffffff',
        textColor: '#000000',
        format: 'png'
      }

      const res = await app.request('/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      }, env)

      expect(res.status).toBe(200)
    })

    it('应该验证JSON参数', async () => {
      const invalidBody = {
        text: '', // 空文本
        width: -1 // 无效宽度
      }

      const res = await app.request('/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidBody)
      }, env)

      expect(res.status).toBe(400)
    })
  })

  describe('GET /images/transform', () => {
    it('应该转换图片', async () => {
      env.CACHE_KV.get.mockResolvedValue(null)
      env.CACHE_KV.put.mockResolvedValue(undefined)

      // Mock fetch成功
      ;(global.fetch as any).mockResolvedValue(new Response(new ArrayBuffer(100), {
        headers: { 'Content-Type': 'image/png' }
      }))

      const res = await app.request('/images/transform?url=https://example.com/image.png&width=400', {}, env)

      expect(res.status).toBe(200)
      expect(env.CACHE_KV.get).toHaveBeenCalled()
    })

    it('应该验证URL参数', async () => {
      const res = await app.request('/images/transform', {}, env)
      expect(res.status).toBe(400)
    })
  })

  describe('DELETE /images/cache', () => {
    it('应该清除特定缓存', async () => {
      env.CACHE_KV.delete.mockResolvedValue(undefined)

      const res = await app.request('/images/cache/test-key', {
        method: 'DELETE'
      }, env)

      expect(res.status).toBe(200)
      expect(env.CACHE_KV.delete).toHaveBeenCalledWith('image:test-key')
    })
  })
})

describe('ImageService', () => {
  let imageService: ImageService
  let env: any

  beforeEach(() => {
    env = createMockEnv()
    imageService = new ImageService(env)
  })

  describe('generateCacheKey', () => {
    it('应该生成一致的缓存键', () => {
      const params1 = { text: 'hello', width: 800, height: 400 }
      const params2 = { height: 400, text: 'hello', width: 800 } // 不同顺序

      const key1 = imageService.generateCacheKey('generate', params1)
      const key2 = imageService.generateCacheKey('generate', params2)

      expect(key1).toBe(key2)
      expect(key1).toMatch(/^image:generate:/)
    })
  })

  describe('静态验证方法', () => {
    it('应该验证图片格式', () => {
      expect(ImageService.isValidFormat('png')).toBe(true)
      expect(ImageService.isValidFormat('webp')).toBe(true)
      expect(ImageService.isValidFormat('invalid')).toBe(false)
    })

    it('应该验证图片尺寸', () => {
      expect(ImageService.isValidDimension(800)).toBe(true)
      expect(ImageService.isValidDimension(0)).toBe(false)
      expect(ImageService.isValidDimension(5000)).toBe(false)
    })

    it('应该验证颜色格式', () => {
      expect(ImageService.isValidColor('#ffffff')).toBe(true)
      expect(ImageService.isValidColor('#fff')).toBe(true)
      expect(ImageService.isValidColor('invalid')).toBe(false)
      expect(ImageService.isValidColor('#gggggg')).toBe(false)
    })
  })

  describe('generateTextImage', () => {
    it('应该生成SVG图片', async () => {
      const options = {
        text: 'Hello World',
        width: 800,
        height: 400
      }

      const response = await imageService.generateTextImage(options)

      expect(response).toBeInstanceOf(Response)
      expect(response.headers.get('Content-Type')).toMatch(/image/)
    })

    it('应该处理长文本换行', async () => {
      const options = {
        text: 'This is a very long text that should be wrapped into multiple lines',
        width: 400,
        height: 200,
        fontSize: 16
      }

      const response = await imageService.generateTextImage(options)
      const svgText = await response.text()

      // SVG应该包含多个text元素（多行）
      const textElements = (svgText.match(/<text/g) || []).length
      expect(textElements).toBeGreaterThan(1)
    })
  })
})