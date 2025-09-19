// 模板管理服务 - 负责模板加载、缓存、编译和渲染管理
import { TemplateEngine, TemplateContext, TemplateRenderResult, TemplateHelper } from './templateEngine'
import { Site, Article } from '../../../cf-cms-worker/src/models/types'

// 模板类型
export type TemplateType = 'layout' | 'page' | 'partial' | 'component'

// 模板配置
export interface TemplateConfig {
  name: string
  type: TemplateType
  extends?: string
  layout?: string
  description?: string
  author?: string
  version?: string
  dependencies?: string[]
  variables?: Record<string, {
    type: string
    required?: boolean
    default?: any
    description?: string
  }>
}

// 模板信息
export interface TemplateInfo extends TemplateConfig {
  path: string
  content: string
  lastModified: string
  compiled?: boolean
}

// 模板主题
export interface TemplateTheme {
  name: string
  version: string
  description: string
  author: string
  templates: Record<string, TemplateInfo>
  assets: {
    css: string[]
    js: string[]
    images: string[]
  }
  config: {
    colorScheme?: string
    layout?: string
    features?: string[]
  }
}

// 模板渲染选项
export interface TemplateRenderOptions {
  theme?: string
  layout?: string
  enableCache?: boolean
  enableMinification?: boolean
  enableSEO?: boolean
  customData?: Record<string, any>
}

// 页面上下文
export interface PageContext extends TemplateContext {
  site: Site
  page: {
    title: string
    description?: string
    keywords?: string
    canonical?: string
    robots?: string
    type: 'index' | 'article' | 'list' | 'tag' | 'search' | '404'
  }
  article?: Article
  articles?: Article[]
  tags?: any[]
  navigation?: any[]
  meta?: Record<string, any>
  url: {
    base: string
    current: string
    path: string
    query: Record<string, string>
  }
  request: {
    userAgent?: string
    ip?: string
    referer?: string
  }
}

export class TemplateService {
  private engine: TemplateEngine
  private templates = new Map<string, TemplateInfo>()
  private themes = new Map<string, TemplateTheme>()
  private defaultTheme = 'default'
  private templateCache = new Map<string, string>()

  // 内置页面级辅助函数
  private pageHelpers: Record<string, TemplateHelper> = {
    // 生成页面标题
    pageTitle: (context: PageContext, separator = ' - ') => {
      const { page, site } = context
      if (page.title && site.name) {
        return page.title + separator + site.name
      }
      return page.title || site.name || ''
    },

    // 生成页面描述
    pageDescription: (context: PageContext) => {
      return context.page.description || context.site.description || ''
    },

    // 生成页面关键词
    pageKeywords: (context: PageContext, separator = ', ') => {
      const keywords = context.page.keywords
      if (typeof keywords === 'string') return keywords
      if (Array.isArray(keywords)) return keywords.join(separator)
      return ''
    },

    // 生成规范URL
    canonicalUrl: (context: PageContext) => {
      return context.page.canonical || context.url.current
    },

    // 生成面包屑导航
    breadcrumb: (context: PageContext, separator = ' / ') => {
      // 简单面包屑实现，可以根据需要扩展
      const parts = context.url.path.split('/').filter(Boolean)
      const breadcrumbs = ['首页']

      let currentPath = ''
      for (const part of parts) {
        currentPath += '/' + part
        breadcrumbs.push(part)
      }

      return breadcrumbs.join(separator)
    },

    // 生成导航菜单
    navigation: (context: PageContext, activeClass = 'active') => {
      const nav = context.navigation || []
      return nav.map((item: any) => {
        const isActive = context.url.path === item.path
        const className = isActive ? activeClass : ''
        return `<a href="${item.path}" class="${className}">${item.title}</a>`
      }).join('')
    },

    // 分页组件
    pagination: (context: PageContext, currentPage: number, totalPages: number, baseUrl = '') => {
      if (totalPages <= 1) return ''

      let html = '<div class="pagination">'

      // 上一页
      if (currentPage > 1) {
        html += `<a href="${baseUrl}?page=${currentPage - 1}" class="pagination-prev">上一页</a>`
      }

      // 页码
      for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
          html += `<span class="pagination-current">${i}</span>`
        } else {
          html += `<a href="${baseUrl}?page=${i}" class="pagination-link">${i}</a>`
        }
      }

      // 下一页
      if (currentPage < totalPages) {
        html += `<a href="${baseUrl}?page=${currentPage + 1}" class="pagination-next">下一页</a>`
      }

      html += '</div>'
      return html
    },

    // 相对时间
    timeAgo: (context: PageContext, date: string) => {
      if (!date) return ''

      const now = new Date()
      const past = new Date(date)
      const diffMs = now.getTime() - past.getTime()
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffMinutes < 1) return '刚刚'
      if (diffMinutes < 60) return `${diffMinutes}分钟前`
      if (diffHours < 24) return `${diffHours}小时前`
      if (diffDays < 30) return `${diffDays}天前`

      return past.toLocaleDateString('zh-CN')
    },

    // 文章摘要
    excerpt: (context: PageContext, length = 150) => {
      const article = context.article
      if (!article) return ''

      return article.summary ||
             (article.content ? article.content.substring(0, length) + '...' : '')
    },

    // 阅读时间估算
    readingTime: (context: PageContext) => {
      const article = context.article
      if (!article?.content) return ''

      const wordsPerMinute = 400 // 中文平均阅读速度
      const wordCount = article.content.length
      const minutes = Math.ceil(wordCount / wordsPerMinute)

      return `约${minutes}分钟阅读`
    },

    // 标签列表
    tagList: (context: PageContext, className = 'tag', separator = '') => {
      const article = context.article
      if (!article?.tags) return ''

      return article.tags.map(tag =>
        `<a href="/tags/${tag.slug}" class="${className}">${tag.name}</a>`
      ).join(separator)
    },

    // 社交分享
    socialShare: (context: PageContext, platforms = 'weibo,wechat,qq') => {
      const { page, url } = context
      const title = encodeURIComponent(page.title || '')
      const urlEncoded = encodeURIComponent(url.current)

      const platformList = platforms.split(',')
      let html = '<div class="social-share">'

      for (const platform of platformList) {
        switch (platform.trim()) {
          case 'weibo':
            html += `<a href="https://service.weibo.com/share/share.php?url=${urlEncoded}&title=${title}" target="_blank" class="share-weibo">微博</a>`
            break
          case 'wechat':
            html += `<a href="javascript:void(0)" class="share-wechat" data-url="${url.current}" data-title="${page.title}">微信</a>`
            break
          case 'qq':
            html += `<a href="https://connect.qq.com/widget/shareqq/index.html?url=${urlEncoded}&title=${title}" target="_blank" class="share-qq">QQ</a>`
            break
        }
      }

      html += '</div>'
      return html
    }
  }

  constructor() {
    this.engine = new TemplateEngine({
      enableCache: true,
      enableSandbox: true,
      maxRenderDepth: 10,
      customHelpers: this.pageHelpers,
      partialResolver: this.resolvePartial.bind(this)
    })

    // 加载默认主题
    this.loadDefaultTheme()
  }

  /**
   * 渲染页面
   */
  async renderPage(
    templateName: string,
    context: PageContext,
    options: TemplateRenderOptions = {}
  ): Promise<TemplateRenderResult> {
    const {
      theme = this.defaultTheme,
      layout,
      enableCache = true,
      enableMinification = false,
      enableSEO = true,
      customData = {}
    } = options

    try {
      // 获取模板内容
      const template = await this.getTemplate(templateName, theme)

      // 构建完整上下文
      const fullContext: PageContext = {
        ...context,
        ...customData,
        // 注入主题相关数据
        theme: {
          name: theme,
          assets: this.getThemeAssets(theme)
        }
      }

      // 渲染模板
      const result = await this.engine.render(template, fullContext)

      // 应用布局
      if (layout || template.includes('{{extends')) {
        // 处理模板继承
        return await this.applyLayout(result, layout, fullContext, theme)
      }

      // 后处理
      if (enableMinification) {
        result.html = this.minifyHtml(result.html)
      }

      if (enableSEO) {
        result.html = this.enhanceSEO(result.html, fullContext)
      }

      return result
    } catch (error) {
      throw new Error(`Template rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 获取模板内容
   */
  private async getTemplate(templateName: string, theme: string = this.defaultTheme): Promise<string> {
    const cacheKey = `${theme}:${templateName}`

    // 从缓存获取
    if (this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey)!
    }

    // 获取主题
    const themeInfo = this.themes.get(theme)
    if (!themeInfo) {
      throw new Error(`Theme not found: ${theme}`)
    }

    // 获取模板
    const template = themeInfo.templates[templateName]
    if (!template) {
      throw new Error(`Template not found: ${templateName} in theme ${theme}`)
    }

    // 缓存模板内容
    this.templateCache.set(cacheKey, template.content)

    return template.content
  }

  /**
   * 应用布局
   */
  private async applyLayout(
    result: TemplateRenderResult,
    layoutName: string | undefined,
    context: PageContext,
    theme: string
  ): Promise<TemplateRenderResult> {
    if (!layoutName) return result

    try {
      const layoutTemplate = await this.getTemplate(layoutName, theme)
      const layoutContext = {
        ...context,
        content: result.html,
        yield: result.html // 兼容不同的内容占位符
      }

      return await this.engine.render(layoutTemplate, layoutContext)
    } catch (error) {
      // 如果布局渲染失败，返回原始内容
      console.warn(`Layout rendering failed: ${error}`)
      return result
    }
  }

  /**
   * 解析部分模板
   */
  private async resolvePartial(partialName: string): Promise<string> {
    try {
      // 尝试从当前主题获取部分模板
      return await this.getTemplate(`partials/${partialName}`, this.defaultTheme)
    } catch {
      // 如果找不到，尝试从默认主题获取
      try {
        return await this.getTemplate(`partials/${partialName}`, 'default')
      } catch {
        throw new Error(`Partial not found: ${partialName}`)
      }
    }
  }

  /**
   * 获取主题资源
   */
  private getThemeAssets(themeName: string): any {
    const theme = this.themes.get(themeName)
    return theme?.assets || { css: [], js: [], images: [] }
  }

  /**
   * HTML压缩
   */
  private minifyHtml(html: string): string {
    return html
      .replace(/\s+/g, ' ') // 压缩空白字符
      .replace(/>\s+</g, '><') // 移除标签间空白
      .replace(/<!--[\s\S]*?-->/g, '') // 移除注释
      .trim()
  }

  /**
   * SEO增强
   */
  private enhanceSEO(html: string, context: PageContext): string {
    let enhanced = html

    // 确保有基础SEO标签
    if (!enhanced.includes('<title>')) {
      const title = context.page.title || context.site.name || ''
      enhanced = enhanced.replace('<head>', `<head>\n<title>${title}</title>`)
    }

    if (!enhanced.includes('name="description"')) {
      const description = context.page.description || context.site.description || ''
      if (description) {
        enhanced = enhanced.replace('</head>', `<meta name="description" content="${description}">\n</head>`)
      }
    }

    // 添加结构化数据
    const structuredData = this.generateStructuredData(context)
    if (structuredData) {
      enhanced = enhanced.replace('</head>', `${structuredData}\n</head>`)
    }

    return enhanced
  }

  /**
   * 生成结构化数据
   */
  private generateStructuredData(context: PageContext): string {
    const { site, page, article } = context

    const baseData = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": site.name,
      "url": context.url.base
    }

    let structuredData = baseData

    // 文章页面
    if (article && page.type === 'article') {
      structuredData = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": article.title,
        "description": article.summary || article.meta_description,
        "author": {
          "@type": "Person",
          "name": article.author || "匿名"
        },
        "datePublished": article.published_at || article.created_at,
        "dateModified": article.updated_at,
        "publisher": {
          "@type": "Organization",
          "name": site.name
        }
      }
    }

    return `<script type="application/ld+json">${JSON.stringify(structuredData, null, 2)}</script>`
  }

  /**
   * 加载默认主题
   */
  private loadDefaultTheme(): void {
    // 这里可以从文件系统或数据库加载主题
    // 现在先创建一个基础的默认主题结构
    const defaultTheme: TemplateTheme = {
      name: 'default',
      version: '1.0.0',
      description: '默认主题',
      author: 'CF-CMS',
      templates: {},
      assets: {
        css: ['/themes/default/style.css'],
        js: ['/themes/default/script.js'],
        images: []
      },
      config: {
        colorScheme: 'light',
        layout: 'standard',
        features: ['responsive', 'seo', 'social']
      }
    }

    this.themes.set('default', defaultTheme)
  }

  /**
   * 注册模板
   */
  registerTemplate(templateInfo: TemplateInfo, theme: string = this.defaultTheme): void {
    const themeInfo = this.themes.get(theme)
    if (!themeInfo) {
      throw new Error(`Theme not found: ${theme}`)
    }

    themeInfo.templates[templateInfo.name] = templateInfo

    // 清除相关缓存
    const cacheKey = `${theme}:${templateInfo.name}`
    this.templateCache.delete(cacheKey)
  }

  /**
   * 注册主题
   */
  registerTheme(theme: TemplateTheme): void {
    this.themes.set(theme.name, theme)
  }

  /**
   * 添加辅助函数
   */
  addHelper(name: string, helper: TemplateHelper): void {
    this.engine.addHelper(name, helper)
  }

  /**
   * 设置默认主题
   */
  setDefaultTheme(themeName: string): void {
    if (!this.themes.has(themeName)) {
      throw new Error(`Theme not found: ${themeName}`)
    }
    this.defaultTheme = themeName
  }

  /**
   * 获取主题列表
   */
  getThemes(): TemplateTheme[] {
    return Array.from(this.themes.values())
  }

  /**
   * 获取模板列表
   */
  getTemplates(theme: string = this.defaultTheme): TemplateInfo[] {
    const themeInfo = this.themes.get(theme)
    return themeInfo ? Object.values(themeInfo.templates) : []
  }

  /**
   * 预编译模板
   */
  precompileTemplate(templateName: string, theme: string = this.defaultTheme): void {
    const themeInfo = this.themes.get(theme)
    if (!themeInfo) return

    const template = themeInfo.templates[templateName]
    if (!template) return

    try {
      this.engine.compile(template.content)
      template.compiled = true
    } catch (error) {
      console.error(`Template compilation failed: ${templateName}`, error)
    }
  }

  /**
   * 清除缓存
   */
  clearCache(theme?: string, template?: string): void {
    if (theme && template) {
      const cacheKey = `${theme}:${template}`
      this.templateCache.delete(cacheKey)
    } else if (theme) {
      for (const key of this.templateCache.keys()) {
        if (key.startsWith(`${theme}:`)) {
          this.templateCache.delete(key)
        }
      }
    } else {
      this.templateCache.clear()
    }

    this.engine.clearCache()
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): {
    templateCacheSize: number
    engineCacheSize: any
  } {
    return {
      templateCacheSize: this.templateCache.size,
      engineCacheSize: this.engine.getCacheStats()
    }
  }
}

// 导出服务实例
export const templateService = new TemplateService()