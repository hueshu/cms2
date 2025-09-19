/**
 * 图片处理服务 - 专为Cloudflare Workers优化
 *
 * 功能特性：
 * - 动态图片生成（文字+背景）
 * - 图片格式转换（WebP/AVIF）
 * - 尺寸调整和压缩优化
 * - 高效缓存策略
 * - 符合Workers CPU和内存限制
 */

import { Env } from '../index'

export interface ImageGenerationOptions {
  text: string
  width?: number
  height?: number
  backgroundColor?: string
  textColor?: string
  fontSize?: number
  fontFamily?: string
  format?: 'jpeg' | 'png' | 'webp' | 'avif'
  quality?: number
}

// 文字样式配置
export interface TextStyle {
  fontSize: number
  fontFamily?: string
  color: string
  fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900'
  fontStyle?: 'normal' | 'italic' | 'oblique'
  textDecoration?: 'none' | 'underline' | 'line-through'
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
  letterSpacing?: number
  lineHeight?: number
  // 阴影效果
  shadow?: {
    offsetX: number
    offsetY: number
    blur: number
    color: string
  }
  // 描边效果
  stroke?: {
    width: number
    color: string
  }
  // 渐变效果
  gradient?: {
    type: 'linear' | 'radial'
    colors: string[]
    direction?: number // 线性渐变角度
  }
}

// 文字定位和对齐
export interface TextPosition {
  x: number | string // 支持像素值或百分比 '50%'
  y: number | string
  anchor?: 'start' | 'middle' | 'end' // 水平对齐
  baseline?: 'top' | 'middle' | 'bottom' | 'hanging' | 'central' | 'ideographic' // 垂直对齐
  rotation?: number // 旋转角度
  maxWidth?: number // 最大宽度（自动换行）
  maxHeight?: number // 最大高度（超出截断）
}

// 文字元素
export interface TextElement {
  text: string
  style: TextStyle
  position: TextPosition
  type?: 'title' | 'subtitle' | 'watermark' | 'caption' | 'custom'
  zIndex?: number // 层级
  opacity?: number // 透明度 0-1
  visible?: boolean // 是否可见
}

// 高级文字叠加选项
export interface AdvancedTextOverlayOptions {
  backgroundImage?: string | ArrayBuffer // 背景图片
  backgroundColor?: string
  width: number
  height: number
  textElements: TextElement[]
  format?: 'jpeg' | 'png' | 'webp' | 'avif' | 'svg'
  quality?: number
  // 全局文字设置
  globalTextSettings?: {
    antialiasing?: boolean
    hinting?: 'none' | 'slight' | 'medium' | 'full'
    subpixelPositioning?: boolean
  }
  // 自动布局选项
  autoLayout?: {
    enabled: boolean
    spacing?: number
    margin?: { top: number; right: number; bottom: number; left: number }
    distribution?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly'
  }
}

// 文字换行和溢出处理选项
export interface TextFlowOptions {
  wordWrap?: boolean
  wordBreak?: 'normal' | 'break-all' | 'keep-all'
  overflow?: 'visible' | 'hidden' | 'ellipsis' | 'fade'
  whiteSpace?: 'normal' | 'nowrap' | 'pre' | 'pre-wrap' | 'pre-line'
  textAlign?: 'left' | 'center' | 'right' | 'justify'
  verticalAlign?: 'top' | 'middle' | 'bottom'
}

export interface ImageTransformOptions {
  width?: number
  height?: number
  format?: 'jpeg' | 'png' | 'webp' | 'avif'
  quality?: number
  fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad'
  sharpen?: number
  blur?: number
  brightness?: number
  contrast?: number
  saturation?: number
  gamma?: number
  rotate?: 90 | 180 | 270
}

export interface CacheOptions {
  ttl?: number
  key?: string
  bypassCache?: boolean
}

export class ImageService {
  private env: Env

  constructor(env: Env) {
    this.env = env
  }

  /**
   * 生成高级文字叠加图片
   * 支持多层文字、背景图片、丰富样式等高级功能
   */
  async generateAdvancedTextOverlay(options: AdvancedTextOverlayOptions): Promise<Response> {
    const {
      backgroundImage,
      backgroundColor = '#ffffff',
      width,
      height,
      textElements,
      format = 'png',
      quality = 85,
      globalTextSettings = {},
      autoLayout
    } = options

    try {
      // 生成缓存键
      const cacheKey = this.generateCacheKey('advanced-text-overlay', {
        ...options,
        timestamp: Math.floor(Date.now() / (1000 * 60 * 10)) // 10分钟缓存
      })

      // 检查缓存
      const cached = await this.getFromCache(cacheKey)
      if (cached) {
        return cached
      }

      // 处理文字元素（排序、自动布局等）
      const processedElements = this.processTextElements(textElements, { width, height }, autoLayout)

      // 生成SVG
      const svg = await this.createAdvancedSVG({
        backgroundImage,
        backgroundColor,
        width,
        height,
        textElements: processedElements,
        globalTextSettings
      })

      // 转换为指定格式
      const imageResponse = await this.convertSVGToImage(svg, {
        width,
        height,
        format,
        quality
      })

      // 缓存结果
      if (imageResponse.ok) {
        const imageData = await imageResponse.arrayBuffer()
        await this.saveToCache(cacheKey, imageData, this.getContentType(format))

        // 返回新的Response以避免body被消费
        return new Response(imageData, {
          headers: imageResponse.headers
        })
      }

      return imageResponse
    } catch (error) {
      throw new Error(`高级文字叠加图片生成失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 生成文字图片
   * 使用SVG + 转换的方式在Workers中生成文字图片
   */
  async generateTextImage(options: ImageGenerationOptions): Promise<Response> {
    const {
      text,
      width = 800,
      height = 400,
      backgroundColor = '#ffffff',
      textColor = '#000000',
      fontSize = 32,
      fontFamily = 'Arial, sans-serif',
      format = 'png',
      quality = 85
    } = options

    try {
      // 生成SVG
      const svg = this.createSVG({
        text,
        width,
        height,
        backgroundColor,
        textColor,
        fontSize,
        fontFamily
      })

      // 将SVG转换为指定格式
      const imageResponse = await this.convertSVGToImage(svg, {
        width,
        height,
        format,
        quality
      })

      return imageResponse
    } catch (error) {
      throw new Error(`图片生成失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 转换图片格式和尺寸
   * 使用Cloudflare的图片转换功能
   */
  async transformImage(
    imageSource: string | ReadableStream | ArrayBuffer,
    options: ImageTransformOptions
  ): Promise<Response> {
    try {
      let imageStream: ReadableStream

      if (typeof imageSource === 'string') {
        // 从URL获取图片
        const response = await fetch(imageSource)
        if (!response.ok) {
          throw new Error(`获取图片失败: ${response.status}`)
        }
        imageStream = response.body!
      } else if (imageSource instanceof ArrayBuffer) {
        imageStream = new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(imageSource))
            controller.close()
          }
        })
      } else {
        imageStream = imageSource
      }

      // 使用Cloudflare Images API进行转换
      const transformedResponse = await this.applyImageTransformations(imageStream, options)

      return transformedResponse
    } catch (error) {
      throw new Error(`图片转换失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 从缓存获取图片
   */
  async getFromCache(cacheKey: string): Promise<Response | null> {
    try {
      const cached = await this.env.CACHE_KV.get(cacheKey, 'arrayBuffer')
      if (!cached) {
        return null
      }

      const metadata = await this.env.CACHE_KV.getWithMetadata(cacheKey)
      const contentType = metadata.metadata?.contentType || 'image/png'

      return new Response(cached, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000', // 1年缓存
          'X-Cache': 'HIT'
        }
      })
    } catch (error) {
      console.error('缓存读取失败:', error)
      return null
    }
  }

  /**
   * 保存图片到缓存
   */
  async saveToCache(
    cacheKey: string,
    imageData: ArrayBuffer,
    contentType: string,
    options: CacheOptions = {}
  ): Promise<void> {
    try {
      const { ttl = 86400 } = options // 默认24小时

      await this.env.CACHE_KV.put(cacheKey, imageData, {
        expirationTtl: ttl,
        metadata: {
          contentType,
          timestamp: Date.now()
        }
      })
    } catch (error) {
      console.error('缓存保存失败:', error)
      // 缓存失败不应该影响主要功能，只记录错误
    }
  }

  /**
   * 生成缓存键
   */
  generateCacheKey(type: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&')

    return `image:${type}:${this.hashString(sortedParams)}`
  }

  /**
   * 处理文字元素
   * 排序、自动布局、位置计算等
   */
  private processTextElements(
    elements: TextElement[],
    canvas: { width: number; height: number },
    autoLayout?: AdvancedTextOverlayOptions['autoLayout']
  ): TextElement[] {
    // 按zIndex排序
    let processedElements = [...elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))

    // 过滤可见元素
    processedElements = processedElements.filter(el => el.visible !== false)

    // 如果启用自动布局
    if (autoLayout?.enabled) {
      processedElements = this.applyAutoLayout(processedElements, canvas, autoLayout)
    }

    // 处理位置计算（百分比转像素）
    processedElements = processedElements.map(element => ({
      ...element,
      position: this.normalizePosition(element.position, canvas)
    }))

    return processedElements
  }

  /**
   * 应用自动布局
   */
  private applyAutoLayout(
    elements: TextElement[],
    canvas: { width: number; height: number },
    layout: NonNullable<AdvancedTextOverlayOptions['autoLayout']>
  ): TextElement[] {
    const {
      spacing = 20,
      margin = { top: 20, right: 20, bottom: 20, left: 20 },
      distribution = 'flex-start'
    } = layout

    const availableHeight = canvas.height - margin.top - margin.bottom
    const availableWidth = canvas.width - margin.left - margin.right

    // 计算总高度需求
    const totalSpacing = (elements.length - 1) * spacing
    const contentHeight = availableHeight - totalSpacing

    let currentY = margin.top

    elements.forEach((element, index) => {
      const elementHeight = element.style.fontSize * (element.style.lineHeight || 1.2)

      // 根据分布方式计算Y位置
      switch (distribution) {
        case 'center':
          currentY = margin.top + (availableHeight - contentHeight) / 2 + index * (elementHeight + spacing)
          break
        case 'flex-end':
          currentY = canvas.height - margin.bottom - (elements.length - index) * (elementHeight + spacing)
          break
        case 'space-between':
          if (elements.length > 1) {
            currentY = margin.top + index * (availableHeight / (elements.length - 1))
          }
          break
        case 'space-around':
          const spaceUnit = availableHeight / elements.length
          currentY = margin.top + spaceUnit * index + spaceUnit / 2
          break
        case 'space-evenly':
          const evenSpace = availableHeight / (elements.length + 1)
          currentY = margin.top + evenSpace * (index + 1)
          break
        default: // flex-start
          currentY = margin.top + index * (elementHeight + spacing)
      }

      // 更新元素位置
      element.position = {
        ...element.position,
        x: element.position.x || '50%',
        y: currentY
      }
    })

    return elements
  }

  /**
   * 标准化位置（百分比转像素）
   */
  private normalizePosition(
    position: TextPosition,
    canvas: { width: number; height: number }
  ): TextPosition {
    const normalizedPosition = { ...position }

    // 处理X坐标
    if (typeof position.x === 'string' && position.x.endsWith('%')) {
      const percentage = parseFloat(position.x) / 100
      normalizedPosition.x = canvas.width * percentage
    }

    // 处理Y坐标
    if (typeof position.y === 'string' && position.y.endsWith('%')) {
      const percentage = parseFloat(position.y) / 100
      normalizedPosition.y = canvas.height * percentage
    }

    return normalizedPosition
  }

  /**
   * 创建高级SVG
   */
  private async createAdvancedSVG(options: {
    backgroundImage?: string | ArrayBuffer
    backgroundColor: string
    width: number
    height: number
    textElements: TextElement[]
    globalTextSettings: any
  }): Promise<string> {
    const { backgroundImage, backgroundColor, width, height, textElements, globalTextSettings } = options

    // 创建SVG定义部分（渐变、滤镜等）
    const defs = this.createSVGDefs(textElements)

    // 创建背景
    const background = await this.createSVGBackground(backgroundImage, backgroundColor, width, height)

    // 创建文字元素
    const textSVG = textElements.map((element, index) =>
      this.createTextElementSVG(element, index)
    ).join('')

    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <defs>
          ${defs}
        </defs>
        ${background}
        ${textSVG}
      </svg>
    `.trim()
  }

  /**
   * 创建SVG定义部分
   */
  private createSVGDefs(textElements: TextElement[]): string {
    const gradients: string[] = []
    const filters: string[] = []

    textElements.forEach((element, index) => {
      // 渐变定义
      if (element.style.gradient) {
        const gradientId = `gradient-${index}`
        const gradient = this.createGradientDef(element.style.gradient, gradientId)
        gradients.push(gradient)
      }

      // 阴影滤镜定义
      if (element.style.shadow) {
        const filterId = `shadow-${index}`
        const filter = this.createShadowFilter(element.style.shadow, filterId)
        filters.push(filter)
      }
    })

    return [...gradients, ...filters].join('')
  }

  /**
   * 创建渐变定义
   */
  private createGradientDef(gradient: NonNullable<TextStyle['gradient']>, id: string): string {
    if (gradient.type === 'linear') {
      const direction = gradient.direction || 0
      const x1 = Math.cos((direction - 90) * Math.PI / 180) * 50 + 50
      const y1 = Math.sin((direction - 90) * Math.PI / 180) * 50 + 50
      const x2 = Math.cos((direction + 90) * Math.PI / 180) * 50 + 50
      const y2 = Math.sin((direction + 90) * Math.PI / 180) * 50 + 50

      const stops = gradient.colors.map((color, index) => {
        const offset = (index / (gradient.colors.length - 1)) * 100
        return `<stop offset="${offset}%" stop-color="${color}"/>`
      }).join('')

      return `
        <linearGradient id="${id}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
          ${stops}
        </linearGradient>
      `
    } else {
      const stops = gradient.colors.map((color, index) => {
        const offset = (index / (gradient.colors.length - 1)) * 100
        return `<stop offset="${offset}%" stop-color="${color}"/>`
      }).join('')

      return `
        <radialGradient id="${id}" cx="50%" cy="50%" r="50%">
          ${stops}
        </radialGradient>
      `
    }
  }

  /**
   * 创建阴影滤镜
   */
  private createShadowFilter(shadow: NonNullable<TextStyle['shadow']>, id: string): string {
    return `
      <filter id="${id}" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="${shadow.offsetX}" dy="${shadow.offsetY}"
                     stdDeviation="${shadow.blur}" flood-color="${shadow.color}"/>
      </filter>
    `
  }

  /**
   * 创建SVG背景
   */
  private async createSVGBackground(
    backgroundImage: string | ArrayBuffer | undefined,
    backgroundColor: string,
    width: number,
    height: number
  ): Promise<string> {
    if (backgroundImage) {
      // 如果是背景图片
      if (typeof backgroundImage === 'string') {
        return `<image href="${backgroundImage}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>`
      } else {
        // ArrayBuffer需要转换为base64
        const base64 = this.arrayBufferToBase64(backgroundImage)
        return `<image href="data:image/png;base64,${base64}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>`
      }
    } else {
      return `<rect width="100%" height="100%" fill="${backgroundColor}"/>`
    }
  }

  /**
   * 创建文字元素SVG
   */
  private createTextElementSVG(element: TextElement, index: number): string {
    const { text, style, position, opacity = 1 } = element
    const {
      fontSize,
      fontFamily = 'Arial, sans-serif',
      color,
      fontWeight = 'normal',
      fontStyle = 'normal',
      textDecoration = 'none',
      textTransform = 'none',
      letterSpacing = 0,
      stroke,
      gradient,
      shadow
    } = style

    // 处理文字内容
    let processedText = text
    switch (textTransform) {
      case 'uppercase':
        processedText = text.toUpperCase()
        break
      case 'lowercase':
        processedText = text.toLowerCase()
        break
      case 'capitalize':
        processedText = text.replace(/\b\w/g, l => l.toUpperCase())
        break
    }

    // 处理换行
    const lines = this.processTextFlow(processedText, style, position)

    // 创建文字样式
    let fill = color
    if (gradient) {
      fill = `url(#gradient-${index})`
    }

    let filterAttr = ''
    if (shadow) {
      filterAttr = `filter="url(#shadow-${index})"`
    }

    let strokeAttr = ''
    if (stroke) {
      strokeAttr = `stroke="${stroke.color}" stroke-width="${stroke.width}"`
    }

    // 计算位置
    const x = typeof position.x === 'number' ? position.x : 0
    const y = typeof position.y === 'number' ? position.y : 0
    const rotation = position.rotation || 0

    const transformAttr = rotation ? `transform="rotate(${rotation} ${x} ${y})"` : ''

    // 生成多行文字
    const textSVG = lines.map((line, lineIndex) => {
      const lineY = y + (lineIndex * fontSize * (style.lineHeight || 1.2))
      return `
        <text x="${x}" y="${lineY}"
              text-anchor="${position.anchor || 'middle'}"
              dominant-baseline="${position.baseline || 'central'}"
              font-family="${fontFamily}"
              font-size="${fontSize}"
              font-weight="${fontWeight}"
              font-style="${fontStyle}"
              text-decoration="${textDecoration}"
              letter-spacing="${letterSpacing}"
              fill="${fill}"
              opacity="${opacity}"
              ${strokeAttr}
              ${filterAttr}
              ${transformAttr}>
          ${this.escapeXml(line)}
        </text>
      `
    }).join('')

    return textSVG
  }

  /**
   * 处理文字流（换行、溢出等）
   */
  private processTextFlow(text: string, style: TextStyle, position: TextPosition): string[] {
    const maxWidth = position.maxWidth
    if (!maxWidth) {
      return [text]
    }

    // 估算字符宽度（简化计算）
    const avgCharWidth = style.fontSize * 0.6
    const maxCharsPerLine = Math.floor(maxWidth / avgCharWidth)

    return this.wrapText(text, maxCharsPerLine)
  }

  /**
   * ArrayBuffer转Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  /**
   * 创建SVG字符串
   */
  private createSVG(options: {
    text: string
    width: number
    height: number
    backgroundColor: string
    textColor: string
    fontSize: number
    fontFamily: string
  }): string {
    const { text, width, height, backgroundColor, textColor, fontSize, fontFamily } = options

    // 文字换行处理
    const maxCharsPerLine = Math.floor(width / (fontSize * 0.6))
    const lines = this.wrapText(text, maxCharsPerLine)
    const lineHeight = fontSize * 1.2
    const totalTextHeight = lines.length * lineHeight
    const startY = (height - totalTextHeight) / 2 + fontSize

    const svgLines = lines.map((line, index) => {
      const y = startY + (index * lineHeight)
      return `<text x="50%" y="${y}" text-anchor="middle" font-family="${fontFamily}" font-size="${fontSize}" fill="${textColor}">${this.escapeXml(line)}</text>`
    }).join('')

    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${backgroundColor}"/>
        ${svgLines}
      </svg>
    `.trim()
  }

  /**
   * 将SVG转换为图片
   * 由于Workers不支持Canvas，我们使用AI服务来转换SVG
   */
  private async convertSVGToImage(
    svg: string,
    options: { width: number; height: number; format: string; quality: number }
  ): Promise<Response> {
    // 在实际的Workers环境中，我们需要使用外部服务或AI来转换SVG
    // 这里我们直接返回SVG作为fallback，并设置适当的头部
    const svgBuffer = new TextEncoder().encode(svg)

    let contentType = 'image/svg+xml'
    let responseData: ArrayBuffer = svgBuffer.buffer

    // 如果请求的是其他格式，我们可以尝试使用AI服务转换
    if (options.format !== 'svg') {
      try {
        // 使用Cloudflare AI进行图片转换
        const convertedImage = await this.convertWithAI(svg, options)
        if (convertedImage) {
          responseData = convertedImage.buffer
          contentType = this.getContentType(options.format)
        }
      } catch (error) {
        console.warn('AI转换失败，返回SVG格式:', error)
      }
    }

    return new Response(responseData, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
        'X-Generated': 'true'
      }
    })
  }

  /**
   * 使用AI服务转换图片（如果可用）
   */
  private async convertWithAI(svg: string, options: any): Promise<Uint8Array | null> {
    // 注意：这是一个简化的实现
    // 在实际生产环境中，你可能需要：
    // 1. 使用专门的图片转换服务
    // 2. 或者返回SVG并让客户端处理
    // 3. 或者使用其他图片生成方案
    return null
  }

  /**
   * 应用图片转换
   */
  private async applyImageTransformations(
    imageStream: ReadableStream,
    options: ImageTransformOptions
  ): Promise<Response> {
    const {
      width,
      height,
      format,
      quality,
      fit = 'scale-down',
      sharpen,
      blur,
      brightness,
      contrast,
      saturation,
      gamma,
      rotate
    } = options

    // 构建Cloudflare图片转换选项
    const transformOptions: any = {}

    if (width) transformOptions.width = width
    if (height) transformOptions.height = height
    if (format) transformOptions.format = format
    if (quality !== undefined) transformOptions.quality = quality
    if (fit) transformOptions.fit = fit
    if (sharpen !== undefined) transformOptions.sharpen = sharpen
    if (blur !== undefined) transformOptions.blur = blur
    if (brightness !== undefined) transformOptions.brightness = brightness
    if (contrast !== undefined) transformOptions.contrast = contrast
    if (saturation !== undefined) transformOptions.saturation = saturation
    if (gamma !== undefined) transformOptions.gamma = gamma
    if (rotate) transformOptions.rotate = rotate

    // 创建一个临时URL用于转换
    const tempResponse = new Response(imageStream)
    const tempUrl = 'https://temp.example.com/image'

    try {
      // 使用Cloudflare的图片转换功能
      const transformedResponse = await fetch(tempUrl, {
        cf: {
          image: transformOptions
        },
        // 实际实现中需要处理流数据
        method: 'POST',
        body: imageStream
      })

      return transformedResponse
    } catch (error) {
      // 如果转换失败，返回原始图片
      return new Response(imageStream, {
        headers: {
          'Content-Type': this.getContentType(format || 'png'),
          'X-Transformed': 'false'
        }
      })
    }
  }

  /**
   * 文字换行处理
   */
  private wrapText(text: string, maxCharsPerLine: number): string[] {
    if (text.length <= maxCharsPerLine) {
      return [text]
    }

    const words = text.split(' ')
    const lines: string[] = []
    let currentLine = ''

    for (const word of words) {
      if ((currentLine + word).length <= maxCharsPerLine) {
        currentLine += (currentLine ? ' ' : '') + word
      } else {
        if (currentLine) {
          lines.push(currentLine)
        }
        currentLine = word
      }
    }

    if (currentLine) {
      lines.push(currentLine)
    }

    return lines
  }

  /**
   * XML转义
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  /**
   * 获取内容类型
   */
  private getContentType(format: string): string {
    const mimeTypes: Record<string, string> = {
      'jpeg': 'image/jpeg',
      'jpg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
      'avif': 'image/avif',
      'svg': 'image/svg+xml'
    }
    return mimeTypes[format.toLowerCase()] || 'image/png'
  }

  /**
   * 简单哈希函数
   */
  private hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * 验证图片格式
   */
  static isValidFormat(format: string): boolean {
    return ['jpeg', 'jpg', 'png', 'webp', 'avif', 'svg'].includes(format.toLowerCase())
  }

  /**
   * 验证图片尺寸
   */
  static isValidDimension(dimension: number): boolean {
    return dimension > 0 && dimension <= 4096 // Workers限制
  }

  /**
   * 验证颜色格式
   */
  static isValidColor(color: string): boolean {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)
  }

  /**
   * 创建预定义样式的文字叠加图片
   */
  async generateStyledTextOverlay(
    preset: 'social-post' | 'article-header' | 'watermark' | 'announcement' | 'quote',
    options: {
      title?: string
      subtitle?: string
      content?: string
      author?: string
      backgroundImage?: string | ArrayBuffer
      backgroundColor?: string
      width?: number
      height?: number
      customColors?: {
        primary?: string
        secondary?: string
        accent?: string
      }
    }
  ): Promise<Response> {
    const {
      title,
      subtitle,
      content,
      author,
      backgroundImage,
      backgroundColor,
      width = 1200,
      height = 630,
      customColors = {}
    } = options

    const colors = {
      primary: customColors.primary || '#2563eb',
      secondary: customColors.secondary || '#64748b',
      accent: customColors.accent || '#f59e0b',
      white: '#ffffff',
      black: '#000000'
    }

    let textElements: TextElement[] = []

    switch (preset) {
      case 'social-post':
        textElements = this.createSocialPostLayout(title, subtitle, content, colors, width, height)
        break
      case 'article-header':
        textElements = this.createArticleHeaderLayout(title, subtitle, author, colors, width, height)
        break
      case 'watermark':
        textElements = this.createWatermarkLayout(content || title || '版权所有', colors)
        break
      case 'announcement':
        textElements = this.createAnnouncementLayout(title, content, colors, width, height)
        break
      case 'quote':
        textElements = this.createQuoteLayout(content, author, colors, width, height)
        break
    }

    return this.generateAdvancedTextOverlay({
      backgroundImage,
      backgroundColor: backgroundColor || '#f8fafc',
      width,
      height,
      textElements,
      autoLayout: {
        enabled: false // 预设布局已经处理了位置
      }
    })
  }

  /**
   * 创建社交媒体帖子布局
   */
  private createSocialPostLayout(
    title?: string,
    subtitle?: string,
    content?: string,
    colors: any,
    width: number,
    height: number
  ): TextElement[] {
    const elements: TextElement[] = []

    if (title) {
      elements.push({
        text: title,
        style: {
          fontSize: Math.min(width / 15, 72),
          fontFamily: 'Inter, system-ui, sans-serif',
          color: colors.primary,
          fontWeight: 'bold',
          lineHeight: 1.1,
          shadow: {
            offsetX: 2,
            offsetY: 2,
            blur: 4,
            color: 'rgba(0,0,0,0.1)'
          }
        },
        position: {
          x: '50%',
          y: height * 0.3,
          anchor: 'middle',
          baseline: 'middle',
          maxWidth: width * 0.85
        },
        type: 'title',
        zIndex: 10
      })
    }

    if (subtitle) {
      elements.push({
        text: subtitle,
        style: {
          fontSize: Math.min(width / 25, 48),
          fontFamily: 'Inter, system-ui, sans-serif',
          color: colors.secondary,
          fontWeight: '500',
          lineHeight: 1.3
        },
        position: {
          x: '50%',
          y: height * 0.5,
          anchor: 'middle',
          baseline: 'middle',
          maxWidth: width * 0.8
        },
        type: 'subtitle',
        zIndex: 9
      })
    }

    if (content) {
      elements.push({
        text: content,
        style: {
          fontSize: Math.min(width / 35, 32),
          fontFamily: 'Inter, system-ui, sans-serif',
          color: colors.black,
          fontWeight: 'normal',
          lineHeight: 1.5
        },
        position: {
          x: '50%',
          y: height * 0.7,
          anchor: 'middle',
          baseline: 'middle',
          maxWidth: width * 0.75
        },
        type: 'caption',
        zIndex: 8
      })
    }

    return elements
  }

  /**
   * 创建文章标题布局
   */
  private createArticleHeaderLayout(
    title?: string,
    subtitle?: string,
    author?: string,
    colors: any,
    width: number,
    height: number
  ): TextElement[] {
    const elements: TextElement[] = []

    if (title) {
      elements.push({
        text: title,
        style: {
          fontSize: Math.min(width / 12, 84),
          fontFamily: 'Georgia, Times, serif',
          color: colors.primary,
          fontWeight: 'bold',
          lineHeight: 1.2,
          gradient: {
            type: 'linear',
            colors: [colors.primary, colors.accent],
            direction: 45
          }
        },
        position: {
          x: '50%',
          y: height * 0.4,
          anchor: 'middle',
          baseline: 'middle',
          maxWidth: width * 0.9
        },
        type: 'title',
        zIndex: 10
      })
    }

    if (subtitle) {
      elements.push({
        text: subtitle,
        style: {
          fontSize: Math.min(width / 30, 36),
          fontFamily: 'Georgia, Times, serif',
          color: colors.secondary,
          fontWeight: 'normal',
          fontStyle: 'italic',
          lineHeight: 1.4
        },
        position: {
          x: '50%',
          y: height * 0.65,
          anchor: 'middle',
          baseline: 'middle',
          maxWidth: width * 0.8
        },
        type: 'subtitle',
        zIndex: 9
      })
    }

    if (author) {
      elements.push({
        text: `作者: ${author}`,
        style: {
          fontSize: Math.min(width / 50, 24),
          fontFamily: 'Inter, system-ui, sans-serif',
          color: colors.secondary,
          fontWeight: '500',
          lineHeight: 1.3
        },
        position: {
          x: '95%',
          y: '95%',
          anchor: 'end',
          baseline: 'bottom'
        },
        type: 'caption',
        zIndex: 8
      })
    }

    return elements
  }

  /**
   * 创建水印布局
   */
  private createWatermarkLayout(text: string, colors: any): TextElement[] {
    return [{
      text,
      style: {
        fontSize: 32,
        fontFamily: 'Arial, sans-serif',
        color: colors.secondary,
        fontWeight: 'bold',
        stroke: {
          width: 1,
          color: colors.white
        }
      },
      position: {
        x: '95%',
        y: '95%',
        anchor: 'end',
        baseline: 'bottom',
        rotation: -15
      },
      type: 'watermark',
      opacity: 0.6,
      zIndex: 100
    }]
  }

  /**
   * 创建公告布局
   */
  private createAnnouncementLayout(
    title?: string,
    content?: string,
    colors: any,
    width: number,
    height: number
  ): TextElement[] {
    const elements: TextElement[] = []

    // 公告标签
    elements.push({
      text: '公告',
      style: {
        fontSize: Math.min(width / 40, 28),
        fontFamily: 'Inter, system-ui, sans-serif',
        color: colors.white,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 2
      },
      position: {
        x: '50%',
        y: height * 0.15,
        anchor: 'middle',
        baseline: 'middle'
      },
      type: 'custom',
      zIndex: 15
    })

    if (title) {
      elements.push({
        text: title,
        style: {
          fontSize: Math.min(width / 18, 64),
          fontFamily: 'Inter, system-ui, sans-serif',
          color: colors.primary,
          fontWeight: 'bold',
          lineHeight: 1.1,
          shadow: {
            offsetX: 0,
            offsetY: 4,
            blur: 8,
            color: 'rgba(0,0,0,0.25)'
          }
        },
        position: {
          x: '50%',
          y: height * 0.35,
          anchor: 'middle',
          baseline: 'middle',
          maxWidth: width * 0.85
        },
        type: 'title',
        zIndex: 10
      })
    }

    if (content) {
      elements.push({
        text: content,
        style: {
          fontSize: Math.min(width / 30, 36),
          fontFamily: 'Inter, system-ui, sans-serif',
          color: colors.black,
          fontWeight: 'normal',
          lineHeight: 1.6
        },
        position: {
          x: '50%',
          y: height * 0.65,
          anchor: 'middle',
          baseline: 'middle',
          maxWidth: width * 0.8
        },
        type: 'caption',
        zIndex: 9
      })
    }

    return elements
  }

  /**
   * 创建引用布局
   */
  private createQuoteLayout(
    quote?: string,
    author?: string,
    colors: any,
    width: number,
    height: number
  ): TextElement[] {
    const elements: TextElement[] = []

    if (quote) {
      elements.push({
        text: `"${quote}"`,
        style: {
          fontSize: Math.min(width / 20, 56),
          fontFamily: 'Georgia, Times, serif',
          color: colors.primary,
          fontWeight: 'normal',
          fontStyle: 'italic',
          lineHeight: 1.4
        },
        position: {
          x: '50%',
          y: height * 0.45,
          anchor: 'middle',
          baseline: 'middle',
          maxWidth: width * 0.8
        },
        type: 'title',
        zIndex: 10
      })
    }

    if (author) {
      elements.push({
        text: `— ${author}`,
        style: {
          fontSize: Math.min(width / 35, 32),
          fontFamily: 'Georgia, Times, serif',
          color: colors.secondary,
          fontWeight: '500',
          lineHeight: 1.3
        },
        position: {
          x: '80%',
          y: height * 0.7,
          anchor: 'end',
          baseline: 'middle'
        },
        type: 'caption',
        zIndex: 9
      })
    }

    return elements
  }

  /**
   * 创建文字样式模板
   */
  static createTextStyleTemplate(template: 'heading' | 'body' | 'caption' | 'emphasis' | 'code'): Partial<TextStyle> {
    const templates = {
      heading: {
        fontSize: 48,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontWeight: 'bold' as const,
        lineHeight: 1.2,
        color: '#1f2937'
      },
      body: {
        fontSize: 24,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontWeight: 'normal' as const,
        lineHeight: 1.5,
        color: '#374151'
      },
      caption: {
        fontSize: 18,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontWeight: '500' as const,
        lineHeight: 1.4,
        color: '#6b7280'
      },
      emphasis: {
        fontSize: 32,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontWeight: 'bold' as const,
        fontStyle: 'italic' as const,
        lineHeight: 1.3,
        color: '#dc2626'
      },
      code: {
        fontSize: 20,
        fontFamily: 'Monaco, Menlo, monospace',
        fontWeight: 'normal' as const,
        lineHeight: 1.4,
        color: '#1e293b'
      }
    }

    return templates[template]
  }

  /**
   * 批量生成文字叠加图片
   */
  async generateBatchTextOverlay(
    batches: Array<{
      id: string
      options: AdvancedTextOverlayOptions
    }>
  ): Promise<Array<{
    id: string
    success: boolean
    response?: Response
    error?: string
  }>> {
    const results = await Promise.allSettled(
      batches.map(async (batch) => {
        try {
          const response = await this.generateAdvancedTextOverlay(batch.options)
          return {
            id: batch.id,
            success: true,
            response
          }
        } catch (error) {
          return {
            id: batch.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      })
    )

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        return {
          id: batches[index].id,
          success: false,
          error: result.reason
        }
      }
    })
  }
}
}