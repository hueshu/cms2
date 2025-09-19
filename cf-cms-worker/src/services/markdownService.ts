import { marked } from 'marked'
import hljs from 'highlight.js'

// Markdown处理选项接口
export interface MarkdownOptions {
  enableHighlight?: boolean
  enableToc?: boolean
  enableSummary?: boolean
  enableImageOptimization?: boolean
  sanitizeHtml?: boolean
  summaryLength?: number
  tocMaxDepth?: number
  imageQuality?: number
  imageCdnUrl?: string
}

// TOC条目接口
export interface TocItem {
  id: string
  text: string
  level: number
  children?: TocItem[]
}

// 渲染结果接口
export interface MarkdownRenderResult {
  html: string
  toc?: TocItem[]
  summary?: string
  wordCount: number
  readingTime: number
}

export class MarkdownService {
  private renderer: marked.Renderer

  constructor() {
    this.renderer = new marked.Renderer()
    this.setupMarked()
  }

  /**
   * 配置marked渲染器
   */
  private setupMarked(): void {
    // 配置marked选项
    marked.setOptions({
      highlight: (code: string, lang: string) => {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang }).value
          } catch (err) {
            console.warn('Highlight.js error:', err)
          }
        }
        return hljs.highlightAuto(code).value
      },
      langPrefix: 'hljs language-',
      breaks: true,
      gfm: true
    })

    // 自定义代码块渲染
    this.renderer.code = (code: string, lang?: string) => {
      const language = lang || 'text'
      const highlighted = lang && hljs.getLanguage(lang)
        ? hljs.highlight(code, { language: lang }).value
        : hljs.highlightAuto(code).value

      return `<div class="code-block">
        <div class="code-header">
          <span class="language">${language}</span>
          <button class="copy-btn" onclick="copyToClipboard(this)">复制</button>
        </div>
        <pre><code class="hljs language-${language}">${highlighted}</code></pre>
      </div>`
    }

    // 自定义标题渲染（用于生成TOC）
    this.renderer.heading = (text: string, level: number) => {
      const id = this.generateHeadingId(text)
      return `<h${level} id="${id}" class="heading-${level}">
        <a class="heading-link" href="#${id}">${text}</a>
      </h${level}>`
    }

    // 自定义图片渲染（用于优化处理）
    this.renderer.image = (href: string | null, title: string | null, text: string) => {
      if (!href) return ''

      const titleAttr = title ? ` title="${title}"` : ''
      const altAttr = text ? ` alt="${text}"` : ''

      return `<figure class="image-figure">
        <img src="${href}" loading="lazy"${titleAttr}${altAttr} />
        ${text ? `<figcaption>${text}</figcaption>` : ''}
      </figure>`
    }

    // 自定义链接渲染
    this.renderer.link = (href: string | null, title: string | null, text: string) => {
      if (!href) return text

      const titleAttr = title ? ` title="${title}"` : ''
      const isExternal = href.startsWith('http')
      const externalAttrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : ''

      return `<a href="${href}"${titleAttr}${externalAttrs}>${text}</a>`
    }

    // 自定义表格渲染
    this.renderer.table = (header: string, body: string) => {
      return `<div class="table-wrapper">
        <table class="markdown-table">
          <thead>${header}</thead>
          <tbody>${body}</tbody>
        </table>
      </div>`
    }

    // 自定义引用块渲染
    this.renderer.blockquote = (quote: string) => {
      return `<blockquote class="markdown-blockquote">${quote}</blockquote>`
    }
  }

  /**
   * 渲染Markdown内容
   */
  async render(markdown: string, options: MarkdownOptions = {}): Promise<MarkdownRenderResult> {
    const {
      enableHighlight = true,
      enableToc = true,
      enableSummary = true,
      enableImageOptimization = true,
      sanitizeHtml = true,
      summaryLength = 200,
      tocMaxDepth = 3,
      imageQuality = 80,
      imageCdnUrl
    } = options

    try {
      // 预处理Markdown
      let processedMarkdown = this.preprocessMarkdown(markdown, {
        enableImageOptimization,
        imageCdnUrl,
        imageQuality
      })

      // 渲染HTML
      let html = await marked(processedMarkdown, { renderer: this.renderer })

      // 生成TOC
      let toc: TocItem[] | undefined
      if (enableToc) {
        toc = this.generateToc(processedMarkdown, tocMaxDepth)
      }

      // 生成摘要
      let summary: string | undefined
      if (enableSummary) {
        summary = this.generateSummary(this.stripMarkdown(processedMarkdown), summaryLength)
      }

      // 计算字数和阅读时间
      const wordCount = this.countWords(this.stripMarkdown(processedMarkdown))
      const readingTime = this.calculateReadingTime(wordCount)

      // 清理HTML（安全性）
      if (sanitizeHtml) {
        html = this.sanitizeHtml(html)
      }

      return {
        html,
        toc,
        summary,
        wordCount,
        readingTime
      }
    } catch (error) {
      console.error('Markdown rendering error:', error)
      throw new Error(`Markdown渲染失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 预处理Markdown内容
   */
  private preprocessMarkdown(markdown: string, options: {
    enableImageOptimization?: boolean
    imageCdnUrl?: string
    imageQuality?: number
  }): string {
    let processed = markdown

    // 图片优化处理
    if (options.enableImageOptimization && options.imageCdnUrl) {
      processed = this.optimizeImages(processed, options.imageCdnUrl, options.imageQuality)
    }

    // 添加自定义语法支持
    processed = this.processCustomSyntax(processed)

    return processed
  }

  /**
   * 图片优化处理
   */
  private optimizeImages(markdown: string, cdnUrl: string, quality: number = 80): string {
    // 匹配图片语法：![alt](url)
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g

    return markdown.replace(imageRegex, (match, alt, url) => {
      // 如果是相对路径或已经是CDN URL，则优化
      if (!url.startsWith('http') || url.includes(cdnUrl)) {
        const optimizedUrl = this.buildOptimizedImageUrl(url, cdnUrl, quality)
        return `![${alt}](${optimizedUrl})`
      }
      return match
    })
  }

  /**
   * 构建优化的图片URL
   */
  private buildOptimizedImageUrl(originalUrl: string, cdnUrl: string, quality: number): string {
    // 移除CDN URL前缀（如果存在）
    const cleanUrl = originalUrl.replace(cdnUrl, '')

    // 构建优化参数
    const params = new URLSearchParams({
      q: quality.toString(),
      f: 'webp', // 优先使用WebP格式
      fit: 'scale-down',
      w: '1200' // 最大宽度
    })

    return `${cdnUrl}${cleanUrl}?${params.toString()}`
  }

  /**
   * 处理自定义语法
   */
  private processCustomSyntax(markdown: string): string {
    let processed = markdown

    // 处理提示框语法：:::tip 内容 :::
    processed = processed.replace(
      /:::(\w+)\s*(.*?)\s*:::/gs,
      (match, type, content) => {
        return `<div class="callout callout-${type}">
          <div class="callout-title">${this.getCalloutTitle(type)}</div>
          <div class="callout-content">${content.trim()}</div>
        </div>`
      }
    )

    // 处理数学公式语法（基础支持）
    processed = processed.replace(
      /\$\$([^$]+)\$\$/g,
      '<div class="math-block">$1</div>'
    )
    processed = processed.replace(
      /\$([^$]+)\$/g,
      '<span class="math-inline">$1</span>'
    )

    return processed
  }

  /**
   * 获取提示框标题
   */
  private getCalloutTitle(type: string): string {
    const titles: Record<string, string> = {
      tip: '💡 提示',
      warning: '⚠️ 警告',
      error: '❌ 错误',
      info: 'ℹ️ 信息',
      success: '✅ 成功',
      note: '📝 注意'
    }
    return titles[type] || '📄 说明'
  }

  /**
   * 生成标题ID
   */
  private generateHeadingId(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fff]+/g, '-') // 保留中文字符
      .replace(/^-+|-+$/g, '')
      .substring(0, 50) // 限制长度
  }

  /**
   * 生成目录
   */
  private generateToc(markdown: string, maxDepth: number = 3): TocItem[] {
    const headingRegex = /^#{1,6}\s+(.+)$/gm
    const toc: TocItem[] = []
    const stack: TocItem[] = []

    let match
    while ((match = headingRegex.exec(markdown)) !== null) {
      const level = match[0].indexOf(' ')
      const text = match[1].trim()
      const id = this.generateHeadingId(text)

      if (level > maxDepth) continue

      const item: TocItem = { id, text, level }

      // 构建嵌套结构
      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop()
      }

      if (stack.length === 0) {
        toc.push(item)
      } else {
        const parent = stack[stack.length - 1]
        if (!parent.children) parent.children = []
        parent.children.push(item)
      }

      stack.push(item)
    }

    return toc
  }

  /**
   * 生成内容摘要
   */
  private generateSummary(text: string, maxLength: number = 200): string {
    // 移除多余的空白字符
    const cleaned = text.replace(/\s+/g, ' ').trim()

    if (cleaned.length <= maxLength) {
      return cleaned
    }

    // 在句号、感叹号、问号处截断
    const sentenceEnd = /[。！？.!?]/g
    let lastSentenceIndex = -1
    let match

    while ((match = sentenceEnd.exec(cleaned)) !== null && match.index < maxLength) {
      lastSentenceIndex = match.index
    }

    if (lastSentenceIndex > maxLength / 2) {
      return cleaned.substring(0, lastSentenceIndex + 1)
    }

    // 如果没有合适的句子结束点，在空格处截断
    const spaceIndex = cleaned.lastIndexOf(' ', maxLength)
    if (spaceIndex > maxLength / 2) {
      return cleaned.substring(0, spaceIndex) + '...'
    }

    // 强制截断
    return cleaned.substring(0, maxLength) + '...'
  }

  /**
   * 去除Markdown标记
   */
  private stripMarkdown(markdown: string): string {
    return markdown
      // 移除代码块
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`[^`]*`/g, '')
      // 移除标题标记
      .replace(/^#{1,6}\s+/gm, '')
      // 移除链接，保留文本
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // 移除图片，保留描述文本
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
      // 移除粗体和斜体标记
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      // 移除删除线
      .replace(/~~([^~]+)~~/g, '$1')
      // 移除引用标记
      .replace(/^>\s+/gm, '')
      // 移除列表标记
      .replace(/^[\s]*[-*+]\s+/gm, '')
      .replace(/^[\s]*\d+\.\s+/gm, '')
      // 移除水平线
      .replace(/^---+$/gm, '')
      // 移除多余空白
      .replace(/\n{2,}/g, '\n')
      .replace(/^\s+|\s+$/g, '')
  }

  /**
   * 计算字数
   */
  private countWords(text: string): number {
    // 中文字符按字计算，英文按单词计算
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length
    const englishWords = text
      .replace(/[\u4e00-\u9fff]/g, '') // 移除中文字符
      .match(/\b\w+\b/g) || []

    return chineseChars + englishWords.length
  }

  /**
   * 计算阅读时间（分钟）
   */
  private calculateReadingTime(wordCount: number): number {
    // 中文阅读速度约 300-500 字/分钟
    // 英文阅读速度约 200-300 词/分钟
    // 取平均值 400 字/分钟
    const wordsPerMinute = 400
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute))
  }

  /**
   * 清理HTML内容
   */
  private sanitizeHtml(html: string): string {
    // 在Cloudflare Workers环境中，直接使用简单的HTML清理
    // DOMPurify需要DOM环境，在Workers中不可用
    return this.simpleSanitize(html)
  }

  /**
   * 简单的HTML清理（用于无DOM环境）
   */
  private simpleSanitize(html: string): string {
    // 移除script标签
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

    // 移除iframe标签
    html = html.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')

    // 移除object和embed标签
    html = html.replace(/<(object|embed)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '')

    // 移除危险的事件处理器
    html = html.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    html = html.replace(/\s*on\w+\s*=\s*[^>\s]+/gi, '')

    // 移除javascript: URL
    html = html.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"')
    html = html.replace(/javascript:/gi, '')

    // 移除data: URL（除了图片）
    html = html.replace(/data:(?!image\/)/gi, '')

    return html
  }

  /**
   * 渲染纯文本摘要（不包含HTML）
   */
  async renderSummary(markdown: string, maxLength: number = 200): Promise<string> {
    const plainText = this.stripMarkdown(markdown)
    return this.generateSummary(plainText, maxLength)
  }

  /**
   * 仅渲染TOC
   */
  async renderToc(markdown: string, maxDepth: number = 3): Promise<TocItem[]> {
    return this.generateToc(markdown, maxDepth)
  }

  /**
   * 获取文章统计信息
   */
  async getStatistics(markdown: string): Promise<{
    wordCount: number
    characterCount: number
    readingTime: number
    headingCount: number
    imageCount: number
    linkCount: number
  }> {
    const plainText = this.stripMarkdown(markdown)
    const wordCount = this.countWords(plainText)
    const characterCount = plainText.length
    const readingTime = this.calculateReadingTime(wordCount)

    const headingCount = (markdown.match(/^#{1,6}\s+/gm) || []).length
    const imageCount = (markdown.match(/!\[[^\]]*\]\([^)]+\)/g) || []).length
    // 只计算非图片链接
    const linkCount = (markdown.match(/(?<!!)\[([^\]]+)\]\([^)]+\)/g) || []).length

    return {
      wordCount,
      characterCount,
      readingTime,
      headingCount,
      imageCount,
      linkCount
    }
  }
}

// 导出服务实例
export const markdownService = new MarkdownService()