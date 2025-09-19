/**
 * 图片处理API路由
 * 提供动态图片生成、转换和缓存功能
 */

import { Hono } from 'hono'
import { validator } from 'hono/validator'
import { z } from 'zod'
import {
  ImageService,
  ImageGenerationOptions,
  ImageTransformOptions,
  AdvancedTextOverlayOptions,
  TextElement,
  TextStyle,
  TextPosition
} from '../services/imageService'
import { Env } from '../index'
import { errorResponse, successResponse } from '../utils/response'

// 图片生成请求验证
const generateImageSchema = z.object({
  text: z.string().min(1).max(500),
  width: z.number().min(1).max(4096).optional().default(800),
  height: z.number().min(1).max(4096).optional().default(400),
  backgroundColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional().default('#ffffff'),
  textColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional().default('#000000'),
  fontSize: z.number().min(8).max(200).optional().default(32),
  fontFamily: z.string().optional().default('Arial, sans-serif'),
  format: z.enum(['jpeg', 'png', 'webp', 'avif', 'svg']).optional().default('png'),
  quality: z.number().min(1).max(100).optional().default(85)
})

// 图片转换请求验证
const transformImageSchema = z.object({
  width: z.number().min(1).max(4096).optional(),
  height: z.number().min(1).max(4096).optional(),
  format: z.enum(['jpeg', 'png', 'webp', 'avif']).optional(),
  quality: z.number().min(1).max(100).optional(),
  fit: z.enum(['scale-down', 'contain', 'cover', 'crop', 'pad']).optional().default('scale-down'),
  sharpen: z.number().min(0).max(10).optional(),
  blur: z.number().min(0).max(250).optional(),
  brightness: z.number().min(-1).max(1).optional(),
  contrast: z.number().min(-1).max(1).optional(),
  saturation: z.number().min(-1).max(1).optional(),
  gamma: z.number().min(0.3).max(3).optional(),
  rotate: z.enum([90, 180, 270]).optional()
})

// 高级文字叠加验证Schema
const textStyleSchema = z.object({
  fontSize: z.number().min(6).max(500),
  fontFamily: z.string().optional(),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
  fontWeight: z.enum(['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900']).optional(),
  fontStyle: z.enum(['normal', 'italic', 'oblique']).optional(),
  textDecoration: z.enum(['none', 'underline', 'line-through']).optional(),
  textTransform: z.enum(['none', 'uppercase', 'lowercase', 'capitalize']).optional(),
  letterSpacing: z.number().optional(),
  lineHeight: z.number().min(0.5).max(5).optional(),
  shadow: z.object({
    offsetX: z.number(),
    offsetY: z.number(),
    blur: z.number().min(0),
    color: z.string()
  }).optional(),
  stroke: z.object({
    width: z.number().min(0),
    color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
  }).optional(),
  gradient: z.object({
    type: z.enum(['linear', 'radial']),
    colors: z.array(z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)).min(2),
    direction: z.number().optional()
  }).optional()
})

const textPositionSchema = z.object({
  x: z.union([z.number(), z.string()]),
  y: z.union([z.number(), z.string()]),
  anchor: z.enum(['start', 'middle', 'end']).optional(),
  baseline: z.enum(['top', 'middle', 'bottom', 'hanging', 'central', 'ideographic']).optional(),
  rotation: z.number().optional(),
  maxWidth: z.number().min(1).optional(),
  maxHeight: z.number().min(1).optional()
})

const textElementSchema = z.object({
  text: z.string().min(1).max(2000),
  style: textStyleSchema,
  position: textPositionSchema,
  type: z.enum(['title', 'subtitle', 'watermark', 'caption', 'custom']).optional(),
  zIndex: z.number().optional(),
  opacity: z.number().min(0).max(1).optional(),
  visible: z.boolean().optional()
})

const advancedTextOverlaySchema = z.object({
  width: z.number().min(1).max(4096),
  height: z.number().min(1).max(4096),
  backgroundImage: z.string().url().optional(),
  backgroundColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  textElements: z.array(textElementSchema).min(1).max(20),
  format: z.enum(['jpeg', 'png', 'webp', 'avif', 'svg']).optional().default('png'),
  quality: z.number().min(1).max(100).optional().default(85),
  globalTextSettings: z.object({
    antialiasing: z.boolean().optional(),
    hinting: z.enum(['none', 'slight', 'medium', 'full']).optional(),
    subpixelPositioning: z.boolean().optional()
  }).optional(),
  autoLayout: z.object({
    enabled: z.boolean(),
    spacing: z.number().min(0).optional(),
    margin: z.object({
      top: z.number().min(0),
      right: z.number().min(0),
      bottom: z.number().min(0),
      left: z.number().min(0)
    }).optional(),
    distribution: z.enum(['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly']).optional()
  }).optional()
})

// 预设样式请求验证
const styledTextOverlaySchema = z.object({
  preset: z.enum(['social-post', 'article-header', 'watermark', 'announcement', 'quote']),
  title: z.string().max(200).optional(),
  subtitle: z.string().max(300).optional(),
  content: z.string().max(1000).optional(),
  author: z.string().max(100).optional(),
  backgroundImage: z.string().url().optional(),
  backgroundColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  width: z.number().min(100).max(4096).optional().default(1200),
  height: z.number().min(100).max(4096).optional().default(630),
  customColors: z.object({
    primary: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
    secondary: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
    accent: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional()
  }).optional()
})

export const imagesRoutes = new Hono<{ Bindings: Env }>()

/**
 * 生成文字图片
 * POST /api/v1/images/generate
 */
imagesRoutes.post(
  '/generate',
  validator('json', (value, c) => {
    const result = generateImageSchema.safeParse(value)
    if (!result.success) {
      return errorResponse(c, 'VALIDATION_ERROR', '请求参数无效', result.error.errors, 400)
    }
    return result.data
  }),
  async (c) => {
    try {
      const options = c.req.valid('json') as ImageGenerationOptions
      const imageService = new ImageService(c.env)

      // 生成缓存键
      const cacheKey = imageService.generateCacheKey('generate', options)

      // 检查缓存
      const cached = await imageService.getFromCache(cacheKey)
      if (cached) {
        return cached
      }

      // 生成图片
      const imageResponse = await imageService.generateTextImage(options)

      // 保存到缓存
      const imageData = await imageResponse.arrayBuffer()
      const contentType = imageResponse.headers.get('Content-Type') || 'image/png'

      await imageService.saveToCache(cacheKey, imageData, contentType, { ttl: 86400 })

      return new Response(imageData, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000',
          'X-Cache': 'MISS',
          'X-Generated': 'true'
        }
      })
    } catch (error) {
      console.error('图片生成失败:', error)
      return errorResponse(c, 'IMAGE_GENERATION_ERROR', '图片生成失败', null, 500)
    }
  }
)

/**
 * 通过URL参数生成文字图片
 * GET /api/v1/images/generate?text=hello&width=800&height=400
 */
imagesRoutes.get('/generate', async (c) => {
  try {
    const query = c.req.query()

    // 手动解析查询参数并转换类型
    const parseNumberOrDefault = (value: string | undefined, defaultValue: number): number => {
      if (!value) return defaultValue
      const parsed = parseInt(value, 10)
      return isNaN(parsed) ? defaultValue : parsed
    }

    const options: ImageGenerationOptions = {
      text: query.text || '',
      width: parseNumberOrDefault(query.width, 800),
      height: parseNumberOrDefault(query.height, 400),
      backgroundColor: query.backgroundColor || '#ffffff',
      textColor: query.textColor || '#000000',
      fontSize: parseNumberOrDefault(query.fontSize, 32),
      fontFamily: query.fontFamily || 'Arial, sans-serif',
      format: (query.format as any) || 'png',
      quality: parseNumberOrDefault(query.quality, 85)
    }

    // 验证必需参数
    if (!options.text) {
      return errorResponse(c, 'MISSING_PARAMETER', '缺少text参数', null, 400)
    }

    // 验证参数范围
    if (!ImageService.isValidDimension(options.width!) || !ImageService.isValidDimension(options.height!)) {
      return errorResponse(c, 'INVALID_DIMENSION', '图片尺寸无效，必须在1-4096之间', null, 400)
    }

    if (!ImageService.isValidFormat(options.format!)) {
      return errorResponse(c, 'INVALID_FORMAT', '图片格式无效', null, 400)
    }

    if (!ImageService.isValidColor(options.backgroundColor!) || !ImageService.isValidColor(options.textColor!)) {
      return errorResponse(c, 'INVALID_COLOR', '颜色格式无效，请使用#RRGGBB格式', null, 400)
    }

    const imageService = new ImageService(c.env)

    // 生成缓存键
    const cacheKey = imageService.generateCacheKey('generate', options)

    // 检查缓存
    const cached = await imageService.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    // 生成图片
    const imageResponse = await imageService.generateTextImage(options)

    // 保存到缓存
    const imageData = await imageResponse.arrayBuffer()
    const contentType = imageResponse.headers.get('Content-Type') || 'image/png'

    await imageService.saveToCache(cacheKey, imageData, contentType, { ttl: 86400 })

    return new Response(imageData, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
        'X-Cache': 'MISS',
        'X-Generated': 'true'
      }
    })
  } catch (error) {
    console.error('图片生成失败:', error)
    return errorResponse(c, 'IMAGE_GENERATION_ERROR', '图片生成失败', null, 500)
  }
})

/**
 * 转换图片
 * POST /api/v1/images/transform
 * 请求体可以是：
 * 1. { "url": "图片URL", ...转换选项 }
 * 2. 直接上传图片文件
 */
imagesRoutes.post('/transform', async (c) => {
  try {
    const contentType = c.req.header('content-type') || ''
    let imageSource: string | ReadableStream | ArrayBuffer
    let transformOptions: ImageTransformOptions

    if (contentType.includes('application/json')) {
      // JSON请求，包含URL和转换选项
      const body = await c.req.json()
      const validationResult = transformImageSchema.safeParse(body)

      if (!validationResult.success) {
        return errorResponse(c, 'VALIDATION_ERROR', '转换参数无效', validationResult.error.errors, 400)
      }

      if (!body.url) {
        return errorResponse(c, 'MISSING_URL', '缺少图片URL', null, 400)
      }

      imageSource = body.url
      transformOptions = validationResult.data
    } else if (contentType.includes('multipart/form-data')) {
      // 文件上传
      const formData = await c.req.formData()
      const file = formData.get('file') as File

      if (!file) {
        return errorResponse(c, 'MISSING_FILE', '缺少上传文件', null, 400)
      }

      imageSource = await file.arrayBuffer()

      // 从formData获取转换选项
      const parseFormValue = (key: string, defaultValue?: any) => {
        const value = formData.get(key) as string
        if (!value) return defaultValue

        // 尝试解析为数字
        const num = parseFloat(value)
        if (!isNaN(num)) return num

        // 返回字符串值
        return value
      }

      transformOptions = {
        width: parseFormValue('width'),
        height: parseFormValue('height'),
        format: parseFormValue('format') as any,
        quality: parseFormValue('quality'),
        fit: parseFormValue('fit', 'scale-down') as any,
        sharpen: parseFormValue('sharpen'),
        blur: parseFormValue('blur'),
        brightness: parseFormValue('brightness'),
        contrast: parseFormValue('contrast'),
        saturation: parseFormValue('saturation'),
        gamma: parseFormValue('gamma'),
        rotate: parseFormValue('rotate') as any
      }

      // 清理undefined值
      Object.keys(transformOptions).forEach(key => {
        if (transformOptions[key as keyof ImageTransformOptions] === undefined) {
          delete transformOptions[key as keyof ImageTransformOptions]
        }
      })
    } else {
      return errorResponse(c, 'INVALID_CONTENT_TYPE', '不支持的内容类型', null, 400)
    }

    const imageService = new ImageService(c.env)

    // 生成缓存键
    const sourceKey = typeof imageSource === 'string'
      ? imageSource
      : imageService.hashString(JSON.stringify(transformOptions))
    const cacheKey = imageService.generateCacheKey('transform', { source: sourceKey, ...transformOptions })

    // 检查缓存
    const cached = await imageService.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    // 转换图片
    const transformedResponse = await imageService.transformImage(imageSource, transformOptions)

    // 保存到缓存
    const imageData = await transformedResponse.arrayBuffer()
    const resultContentType = transformedResponse.headers.get('Content-Type') || 'image/png'

    await imageService.saveToCache(cacheKey, imageData, resultContentType, { ttl: 86400 })

    return new Response(imageData, {
      headers: {
        'Content-Type': resultContentType,
        'Cache-Control': 'public, max-age=31536000',
        'X-Cache': 'MISS',
        'X-Transformed': 'true'
      }
    })
  } catch (error) {
    console.error('图片转换失败:', error)
    return errorResponse(c, 'IMAGE_TRANSFORM_ERROR', '图片转换失败', null, 500)
  }
})

/**
 * 通过URL转换图片
 * GET /api/v1/images/transform?url=图片URL&width=800&height=600&format=webp
 */
imagesRoutes.get('/transform', async (c) => {
  try {
    const query = c.req.query()

    if (!query.url) {
      return errorResponse(c, 'MISSING_URL', '缺少图片URL参数', null, 400)
    }

    // 解析转换选项
    const parseNumberOrUndefined = (value: string | undefined): number | undefined => {
      if (!value) return undefined
      const parsed = parseFloat(value)
      return isNaN(parsed) ? undefined : parsed
    }

    const transformOptions: ImageTransformOptions = {
      width: parseNumberOrUndefined(query.width),
      height: parseNumberOrUndefined(query.height),
      format: query.format as any,
      quality: parseNumberOrUndefined(query.quality),
      fit: (query.fit as any) || 'scale-down',
      sharpen: parseNumberOrUndefined(query.sharpen),
      blur: parseNumberOrUndefined(query.blur),
      brightness: parseNumberOrUndefined(query.brightness),
      contrast: parseNumberOrUndefined(query.contrast),
      saturation: parseNumberOrUndefined(query.saturation),
      gamma: parseNumberOrUndefined(query.gamma),
      rotate: query.rotate ? parseInt(query.rotate) as any : undefined
    }

    // 清理undefined值
    Object.keys(transformOptions).forEach(key => {
      if (transformOptions[key as keyof ImageTransformOptions] === undefined) {
        delete transformOptions[key as keyof ImageTransformOptions]
      }
    })

    const imageService = new ImageService(c.env)

    // 生成缓存键
    const cacheKey = imageService.generateCacheKey('transform', { source: query.url, ...transformOptions })

    // 检查缓存
    const cached = await imageService.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    // 转换图片
    const transformedResponse = await imageService.transformImage(query.url, transformOptions)

    // 保存到缓存
    const imageData = await transformedResponse.arrayBuffer()
    const contentType = transformedResponse.headers.get('Content-Type') || 'image/png'

    await imageService.saveToCache(cacheKey, imageData, contentType, { ttl: 86400 })

    return new Response(imageData, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
        'X-Cache': 'MISS',
        'X-Transformed': 'true'
      }
    })
  } catch (error) {
    console.error('图片转换失败:', error)
    return errorResponse(c, 'IMAGE_TRANSFORM_ERROR', '图片转换失败', null, 500)
  }
})

/**
 * 获取支持的格式和限制信息
 * GET /api/v1/images/info
 */
imagesRoutes.get('/info', (c) => {
  return successResponse(c, {
    supportedFormats: ['jpeg', 'png', 'webp', 'avif', 'svg'],
    maxDimensions: {
      width: 4096,
      height: 4096
    },
    qualityRange: {
      min: 1,
      max: 100
    },
    fontSizeRange: {
      basic: { min: 8, max: 200 },
      advanced: { min: 6, max: 500 }
    },
    maxTextLength: {
      basic: 500,
      advanced: 2000,
      perElement: 2000
    },
    maxTextElements: 20,
    supportedFits: ['scale-down', 'contain', 'cover', 'crop', 'pad'],
    supportedPresets: ['social-post', 'article-header', 'watermark', 'announcement', 'quote'],
    supportedTextStyles: {
      fontWeights: ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'],
      fontStyles: ['normal', 'italic', 'oblique'],
      textDecorations: ['none', 'underline', 'line-through'],
      textTransforms: ['none', 'uppercase', 'lowercase', 'capitalize'],
      anchors: ['start', 'middle', 'end'],
      baselines: ['top', 'middle', 'bottom', 'hanging', 'central', 'ideographic']
    },
    supportedEffects: {
      shadow: true,
      stroke: true,
      gradient: {
        types: ['linear', 'radial'],
        maxColors: 10
      }
    },
    cachePolicy: {
      defaultTTL: 86400, // 24小时
      maxAge: 31536000, // 1年
      advancedCacheTTL: {
        textOverlay: 600, // 10分钟粒度
        styledPreset: 1800 // 30分钟粒度
      }
    },
    features: {
      // 基础功能
      textGeneration: true,
      formatConversion: true,
      resize: true,
      colorAdjustment: true,
      sharpening: true,
      blur: true,
      rotation: true,
      caching: true,

      // 高级功能
      advancedTextOverlay: true,
      multiTextElements: true,
      textEffects: true,
      gradients: true,
      shadows: true,
      stroke: true,
      autoLayout: true,
      backgroundImages: true,
      presetStyles: true,
      batchGeneration: true,
      templateStyles: true
    },
    endpoints: {
      basic: {
        generate: '/api/v1/images/generate',
        transform: '/api/v1/images/transform'
      },
      advanced: {
        textOverlay: '/api/v1/images/advanced-text-overlay',
        styledOverlay: '/api/v1/images/styled-text-overlay',
        batchOverlay: '/api/v1/images/batch-text-overlay'
      },
      info: {
        templates: '/api/v1/images/text-style-templates',
        presets: '/api/v1/images/presets',
        info: '/api/v1/images/info'
      }
    }
  })
})

/**
 * 清除缓存
 * DELETE /api/v1/images/cache/:key?
 */
imagesRoutes.delete('/cache/:key?', async (c) => {
  try {
    const key = c.req.param('key')

    if (key) {
      // 删除特定缓存
      await c.env.CACHE_KV.delete(`image:${key}`)
      return successResponse(c, { message: '缓存已清除', key })
    } else {
      // 这里应该有清除所有图片缓存的逻辑
      // 由于KV不支持批量删除，实际生产中需要维护缓存键列表
      return successResponse(c, { message: '批量清除缓存功能待实现' })
    }
  } catch (error) {
    console.error('清除缓存失败:', error)
    return errorResponse(c, 'CACHE_CLEAR_ERROR', '清除缓存失败', null, 500)
  }
})

/**
 * 健康检查
 * GET /api/v1/images/health
 */
imagesRoutes.get('/health', async (c) => {
  try {
    // 测试KV存储
    const testKey = 'health-check'
    await c.env.CACHE_KV.put(testKey, 'ok', { expirationTtl: 60 })
    const testValue = await c.env.CACHE_KV.get(testKey)
    await c.env.CACHE_KV.delete(testKey)

    return successResponse(c, {
      status: 'healthy',
      services: {
        cache: testValue === 'ok' ? 'ok' : 'error',
        imageService: 'ok'
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('健康检查失败:', error)
    return errorResponse(c, 'HEALTH_CHECK_ERROR', '健康检查失败', null, 500)
  }
})

/**
 * 生成高级文字叠加图片
 * POST /api/v1/images/advanced-text-overlay
 */
imagesRoutes.post(
  '/advanced-text-overlay',
  validator('json', (value, c) => {
    const result = advancedTextOverlaySchema.safeParse(value)
    if (!result.success) {
      return errorResponse(c, 'VALIDATION_ERROR', '请求参数无效', result.error.errors, 400)
    }
    return result.data
  }),
  async (c) => {
    try {
      const options = c.req.valid('json') as AdvancedTextOverlayOptions
      const imageService = new ImageService(c.env)

      // 生成缓存键
      const cacheKey = imageService.generateCacheKey('advanced-text-overlay', {
        ...options,
        timestamp: Math.floor(Date.now() / (1000 * 60 * 10)) // 10分钟粒度缓存
      })

      // 检查缓存
      const cached = await imageService.getFromCache(cacheKey)
      if (cached) {
        return cached
      }

      // 生成图片
      const imageResponse = await imageService.generateAdvancedTextOverlay(options)

      // 保存到缓存
      const imageData = await imageResponse.arrayBuffer()
      const contentType = imageResponse.headers.get('Content-Type') || 'image/png'

      await imageService.saveToCache(cacheKey, imageData, contentType, { ttl: 86400 })

      return new Response(imageData, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000',
          'X-Cache': 'MISS',
          'X-Generated': 'advanced-text-overlay'
        }
      })
    } catch (error) {
      console.error('高级文字叠加图片生成失败:', error)
      return errorResponse(c, 'ADVANCED_TEXT_OVERLAY_ERROR', '高级文字叠加图片生成失败', null, 500)
    }
  }
)

/**
 * 生成预设样式的文字叠加图片
 * POST /api/v1/images/styled-text-overlay
 */
imagesRoutes.post(
  '/styled-text-overlay',
  validator('json', (value, c) => {
    const result = styledTextOverlaySchema.safeParse(value)
    if (!result.success) {
      return errorResponse(c, 'VALIDATION_ERROR', '请求参数无效', result.error.errors, 400)
    }
    return result.data
  }),
  async (c) => {
    try {
      const {
        preset,
        title,
        subtitle,
        content,
        author,
        backgroundImage,
        backgroundColor,
        width,
        height,
        customColors
      } = c.req.valid('json')

      const imageService = new ImageService(c.env)

      // 生成缓存键
      const cacheKey = imageService.generateCacheKey('styled-text-overlay', {
        preset,
        title,
        subtitle,
        content,
        author,
        backgroundImage,
        backgroundColor,
        width,
        height,
        customColors,
        timestamp: Math.floor(Date.now() / (1000 * 60 * 30)) // 30分钟粒度缓存
      })

      // 检查缓存
      const cached = await imageService.getFromCache(cacheKey)
      if (cached) {
        return cached
      }

      // 生成图片
      const imageResponse = await imageService.generateStyledTextOverlay(preset, {
        title,
        subtitle,
        content,
        author,
        backgroundImage,
        backgroundColor,
        width,
        height,
        customColors
      })

      // 保存到缓存
      const imageData = await imageResponse.arrayBuffer()
      const contentType = imageResponse.headers.get('Content-Type') || 'image/png'

      await imageService.saveToCache(cacheKey, imageData, contentType, { ttl: 86400 })

      return new Response(imageData, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000',
          'X-Cache': 'MISS',
          'X-Generated': `styled-${preset}`
        }
      })
    } catch (error) {
      console.error('预设样式文字叠加图片生成失败:', error)
      return errorResponse(c, 'STYLED_TEXT_OVERLAY_ERROR', '预设样式文字叠加图片生成失败', null, 500)
    }
  }
)

/**
 * 通过URL参数生成预设样式的文字叠加图片
 * GET /api/v1/images/styled-text-overlay?preset=social-post&title=标题&subtitle=副标题
 */
imagesRoutes.get('/styled-text-overlay', async (c) => {
  try {
    const query = c.req.query()

    if (!query.preset) {
      return errorResponse(c, 'MISSING_PRESET', '缺少预设样式参数', null, 400)
    }

    const validPresets = ['social-post', 'article-header', 'watermark', 'announcement', 'quote']
    if (!validPresets.includes(query.preset)) {
      return errorResponse(c, 'INVALID_PRESET', '无效的预设样式', null, 400)
    }

    const parseNumberOrDefault = (value: string | undefined, defaultValue: number): number => {
      if (!value) return defaultValue
      const parsed = parseInt(value, 10)
      return isNaN(parsed) ? defaultValue : parsed
    }

    const customColors = {
      primary: query.primaryColor,
      secondary: query.secondaryColor,
      accent: query.accentColor
    }

    // 清除undefined值
    Object.keys(customColors).forEach(key => {
      if (!customColors[key as keyof typeof customColors]) {
        delete customColors[key as keyof typeof customColors]
      }
    })

    const imageService = new ImageService(c.env)

    // 生成缓存键
    const cacheKey = imageService.generateCacheKey('styled-text-overlay-get', {
      preset: query.preset,
      title: query.title,
      subtitle: query.subtitle,
      content: query.content,
      author: query.author,
      backgroundImage: query.backgroundImage,
      backgroundColor: query.backgroundColor,
      width: parseNumberOrDefault(query.width, 1200),
      height: parseNumberOrDefault(query.height, 630),
      customColors,
      timestamp: Math.floor(Date.now() / (1000 * 60 * 30)) // 30分钟粒度缓存
    })

    // 检查缓存
    const cached = await imageService.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    // 生成图片
    const imageResponse = await imageService.generateStyledTextOverlay(query.preset as any, {
      title: query.title,
      subtitle: query.subtitle,
      content: query.content,
      author: query.author,
      backgroundImage: query.backgroundImage,
      backgroundColor: query.backgroundColor,
      width: parseNumberOrDefault(query.width, 1200),
      height: parseNumberOrDefault(query.height, 630),
      customColors: Object.keys(customColors).length > 0 ? customColors : undefined
    })

    // 保存到缓存
    const imageData = await imageResponse.arrayBuffer()
    const contentType = imageResponse.headers.get('Content-Type') || 'image/png'

    await imageService.saveToCache(cacheKey, imageData, contentType, { ttl: 86400 })

    return new Response(imageData, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
        'X-Cache': 'MISS',
        'X-Generated': `styled-${query.preset}`
      }
    })
  } catch (error) {
    console.error('预设样式文字叠加图片生成失败:', error)
    return errorResponse(c, 'STYLED_TEXT_OVERLAY_ERROR', '预设样式文字叠加图片生成失败', null, 500)
  }
})

/**
 * 批量生成文字叠加图片
 * POST /api/v1/images/batch-text-overlay
 */
imagesRoutes.post('/batch-text-overlay', async (c) => {
  try {
    const body = await c.req.json()

    if (!Array.isArray(body.batches) || body.batches.length === 0) {
      return errorResponse(c, 'INVALID_BATCHES', '批次数据格式无效', null, 400)
    }

    if (body.batches.length > 10) {
      return errorResponse(c, 'TOO_MANY_BATCHES', '批次数量不能超过10个', null, 400)
    }

    // 验证每个批次的数据
    const validatedBatches = []
    for (const batch of body.batches) {
      if (!batch.id || !batch.options) {
        return errorResponse(c, 'INVALID_BATCH_FORMAT', '批次格式无效，需要id和options字段', null, 400)
      }

      const validation = advancedTextOverlaySchema.safeParse(batch.options)
      if (!validation.success) {
        return errorResponse(c, 'INVALID_BATCH_OPTIONS', `批次${batch.id}的options无效`, validation.error.errors, 400)
      }

      validatedBatches.push({
        id: batch.id,
        options: validation.data
      })
    }

    const imageService = new ImageService(c.env)

    // 执行批量生成
    const results = await imageService.generateBatchTextOverlay(validatedBatches)

    // 转换结果为API响应格式
    const responseResults = await Promise.all(results.map(async (result) => {
      if (result.success && result.response) {
        const imageData = await result.response.arrayBuffer()
        const contentType = result.response.headers.get('Content-Type') || 'image/png'

        // 将图片数据转换为base64或保存到临时存储
        const base64 = btoa(String.fromCharCode(...new Uint8Array(imageData)))

        return {
          id: result.id,
          success: true,
          imageData: `data:${contentType};base64,${base64}`,
          contentType
        }
      } else {
        return {
          id: result.id,
          success: false,
          error: result.error
        }
      }
    }))

    return successResponse(c, {
      message: '批量生成完成',
      totalCount: results.length,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length,
      results: responseResults
    })
  } catch (error) {
    console.error('批量生成文字叠加图片失败:', error)
    return errorResponse(c, 'BATCH_TEXT_OVERLAY_ERROR', '批量生成文字叠加图片失败', null, 500)
  }
})

/**
 * 获取文字样式模板
 * GET /api/v1/images/text-style-templates
 */
imagesRoutes.get('/text-style-templates', (c) => {
  const templates = {
    heading: ImageService.createTextStyleTemplate('heading'),
    body: ImageService.createTextStyleTemplate('body'),
    caption: ImageService.createTextStyleTemplate('caption'),
    emphasis: ImageService.createTextStyleTemplate('emphasis'),
    code: ImageService.createTextStyleTemplate('code')
  }

  return successResponse(c, {
    templates,
    usage: {
      example: {
        heading: "用于主标题，大号粗体字",
        body: "用于正文内容，中等大小",
        caption: "用于说明文字，小号字体",
        emphasis: "用于强调文字，粗体斜体",
        code: "用于代码文字，等宽字体"
      }
    }
  })
})

/**
 * 获取预设样式信息
 * GET /api/v1/images/presets
 */
imagesRoutes.get('/presets', (c) => {
  return successResponse(c, {
    presets: {
      'social-post': {
        name: '社交媒体帖子',
        description: '适合Facebook、Twitter等平台分享的图片',
        defaultSize: { width: 1200, height: 630 },
        supportedFields: ['title', 'subtitle', 'content'],
        example: {
          title: '产品发布公告',
          subtitle: '我们的新产品即将上线',
          content: '敬请期待更多精彩功能'
        }
      },
      'article-header': {
        name: '文章封面',
        description: '适合博客文章、新闻头图',
        defaultSize: { width: 1200, height: 630 },
        supportedFields: ['title', 'subtitle', 'author'],
        example: {
          title: '深度解析AI技术趋势',
          subtitle: '从理论到实践的完整指南',
          author: '技术专家'
        }
      },
      watermark: {
        name: '水印',
        description: '图片水印标记',
        defaultSize: { width: 'auto', height: 'auto' },
        supportedFields: ['content'],
        example: {
          content: '版权所有'
        }
      },
      announcement: {
        name: '公告通知',
        description: '系统通知、活动公告',
        defaultSize: { width: 1000, height: 600 },
        supportedFields: ['title', 'content'],
        example: {
          title: '系统维护通知',
          content: '系统将于今晚进行维护升级'
        }
      },
      quote: {
        name: '名言引用',
        description: '名人名言、经典语录',
        defaultSize: { width: 800, height: 600 },
        supportedFields: ['content', 'author'],
        example: {
          content: '设计不只是看起来如何，感觉如何。设计的工作原理才是关键。',
          author: '史蒂夫·乔布斯'
        }
      }
    }
  })
})