// 路由管理服务 - 负责URL路由匹配、参数解析和页面分发
import {
  RouteConfig,
  RoutePattern as RoutePatternConfig,
  RoutePattern,
  validateRouteParam,
  buildUrl,
  SitemapEntry,
  RSSFeedConfig,
  RobotsConfig,
  defaultRoutes
} from '../config/routes'
import { Site, Article, Tag } from '../../../cf-cms-worker/src/models/types'

// 路由匹配结果
export interface RouteMatch {
  pattern: RoutePatternConfig
  params: Record<string, string>
  query: Record<string, string>
  template: string
  metadata: any
  cache?: {
    ttl: number
    varyBy?: string[]
  }
}

// 重定向结果
export interface RedirectResult {
  url: string
  code: 301 | 302
}

// 请求上下文
export interface RequestContext {
  url: URL
  method: string
  headers: Record<string, string>
  userAgent?: string
  ip?: string
  referer?: string
}

// 路由匹配选项
export interface RouteMatchOptions {
  strict?: boolean
  caseSensitive?: boolean
}

export class RouterService {
  private config: RouteConfig
  private compiledRoutes: Array<{
    pattern: RoutePattern
    config: RoutePatternConfig
  }> = []

  constructor(config: RouteConfig = defaultRoutes) {
    this.config = config
    this.compileRoutes()
  }

  /**
   * 编译路由模式
   */
  private compileRoutes(): void {
    this.compiledRoutes = this.config.routes.map(route => ({
      pattern: RoutePattern.create(route.path),
      config: route
    }))
  }

  /**
   * 匹配路由
   */
  match(
    url: string,
    context?: RequestContext,
    options: RouteMatchOptions = {}
  ): RouteMatch | RedirectResult | null {
    const urlObj = new URL(url, 'http://localhost')
    const pathname = urlObj.pathname

    // 检查重定向规则
    const redirect = this.checkRedirects(pathname)
    if (redirect) {
      return redirect
    }

    // 匹配路由模式
    for (const { pattern, config } of this.compiledRoutes) {
      const match = pattern.match(pathname)

      if (match.matches) {
        // 验证参数
        if (config.params) {
          const validationErrors = this.validateParams(match.params, config.params)
          if (validationErrors.length > 0) {
            continue // 继续匹配其他路由
          }
        }

        // 解析查询参数
        const query: Record<string, string> = {}
        urlObj.searchParams.forEach((value, key) => {
          query[key] = value
        })

        // 构建路由匹配结果
        return {
          pattern: config,
          params: match.params,
          query,
          template: config.template,
          metadata: config.metadata || {},
          cache: config.cache
        }
      }
    }

    return null
  }

  /**
   * 检查重定向
   */
  private checkRedirects(pathname: string): RedirectResult | null {
    for (const redirect of this.config.redirects) {
      const pattern = RoutePattern.create(redirect.from)
      const match = pattern.match(pathname)

      if (match.matches) {
        const targetUrl = buildUrl(redirect.to, match.params)
        return {
          url: targetUrl,
          code: redirect.code
        }
      }
    }

    return null
  }

  /**
   * 验证路由参数
   */
  private validateParams(
    params: Record<string, string>,
    config: RoutePatternConfig['params'] = {}
  ): string[] {
    const errors: string[] = []

    for (const [name, value] of Object.entries(params)) {
      const paramConfig = config[name]
      if (paramConfig && !validateRouteParam(value, paramConfig)) {
        errors.push(`Invalid parameter: ${name}=${value}`)
      }
    }

    // 检查必需参数
    for (const [name, paramConfig] of Object.entries(config)) {
      if (paramConfig.required && !params[name]) {
        errors.push(`Missing required parameter: ${name}`)
      }
    }

    return errors
  }

  /**
   * 构建URL
   */
  buildUrl(templatePath: string, params: Record<string, string> = {}): string {
    return buildUrl(templatePath, params)
  }

  /**
   * 获取站点地图条目
   */
  async generateSitemapEntries(
    site: Site,
    articles: Article[] = [],
    tags: Tag[] = []
  ): Promise<SitemapEntry[]> {
    if (!this.config.sitemap.enabled) {
      return []
    }

    const entries: SitemapEntry[] = []
    const baseUrl = `https://${site.domain}`

    // 添加静态条目
    if (this.config.sitemap.staticEntries) {
      entries.push(...this.config.sitemap.staticEntries.map(entry => ({
        ...entry,
        url: baseUrl + entry.url
      })))
    }

    // 添加文章页面
    for (const article of articles) {
      if (article.status === 'published') {
        entries.push({
          url: `${baseUrl}/articles/${article.slug}`,
          lastModified: article.updated_at,
          changeFrequency: 'monthly',
          priority: 0.8
        })
      }
    }

    // 添加标签页面
    for (const tag of tags) {
      entries.push({
        url: `${baseUrl}/tags/${tag.slug}`,
        changeFrequency: 'weekly',
        priority: 0.6
      })
    }

    // 过滤排除的模式
    const filteredEntries = entries.filter(entry => {
      const url = new URL(entry.url)
      return !this.isExcludedFromSitemap(url.pathname)
    })

    return filteredEntries
  }

  /**
   * 检查是否被sitemap排除
   */
  private isExcludedFromSitemap(pathname: string): boolean {
    const excludePatterns = this.config.sitemap.excludePatterns || []

    return excludePatterns.some(pattern => {
      // 简单的通配符匹配
      const regex = new RegExp(
        pattern.replace(/\*/g, '.*').replace(/\?/g, '.')
      )
      return regex.test(pathname)
    })
  }

  /**
   * 生成RSS条目
   */
  async generateRSSItems(
    site: Site,
    articles: Article[]
  ): Promise<Array<{
    title: string
    description: string
    link: string
    pubDate: string
    guid: string
    author?: string
    category?: string[]
  }>> {
    if (!this.config.rss.enabled) {
      return []
    }

    const baseUrl = `https://${site.domain}`
    const limit = this.config.rss.articlesLimit || 20

    return articles
      .filter(article => article.status === 'published')
      .sort((a, b) => new Date(b.published_at || b.created_at).getTime() -
                     new Date(a.published_at || a.created_at).getTime())
      .slice(0, limit)
      .map(article => ({
        title: article.title,
        description: article.summary || article.meta_description || '',
        link: `${baseUrl}/articles/${article.slug}`,
        pubDate: new Date(article.published_at || article.created_at).toUTCString(),
        guid: `${baseUrl}/articles/${article.slug}`,
        author: article.author,
        category: article.tags?.map(tag => tag.name)
      }))
  }

  /**
   * 生成robots.txt内容
   */
  generateRobotsContent(): string {
    if (!this.config.robots.enabled) {
      return ''
    }

    let content = ''

    for (const rule of this.config.robots.rules) {
      content += `User-agent: ${rule.userAgent}\n`

      if (rule.allow) {
        for (const path of rule.allow) {
          content += `Allow: ${path}\n`
        }
      }

      if (rule.disallow) {
        for (const path of rule.disallow) {
          content += `Disallow: ${path}\n`
        }
      }

      if (rule.crawlDelay) {
        content += `Crawl-delay: ${rule.crawlDelay}\n`
      }

      if (rule.sitemap) {
        for (const sitemap of rule.sitemap) {
          content += `Sitemap: ${sitemap}\n`
        }
      }

      content += '\n'
    }

    return content.trim()
  }

  /**
   * 获取错误页面模板
   */
  getErrorPageTemplate(statusCode: number): string {
    switch (statusCode) {
      case 404:
        return this.config.errorPages['404']
      case 500:
        return this.config.errorPages['500']
      default:
        return this.config.errorPages['500'] // 默认使用500错误页
    }
  }

  /**
   * 检查路由是否需要缓存
   */
  getCacheConfig(routeMatch: RouteMatch): {
    shouldCache: boolean
    ttl: number
    varyBy: string[]
  } {
    const cache = routeMatch.cache || { ttl: 0 }

    return {
      shouldCache: cache.ttl > 0,
      ttl: cache.ttl,
      varyBy: cache.varyBy || []
    }
  }

  /**
   * 获取路由的元数据
   */
  getRouteMetadata(
    routeMatch: RouteMatch,
    context: any = {}
  ): Record<string, any> {
    const metadata = { ...routeMatch.metadata }

    // 处理模板化的元数据
    for (const [key, value] of Object.entries(metadata)) {
      if (typeof value === 'string' && value.includes('{{')) {
        // 简单的模板替换
        metadata[key] = this.interpolateTemplate(value, {
          ...context,
          ...routeMatch.params
        })
      }
    }

    return metadata
  }

  /**
   * 简单的模板插值
   */
  private interpolateTemplate(template: string, context: any): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const keys = path.trim().split('.')
      let value = context

      for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
          value = value[key]
        } else {
          return match // 保持原样如果无法解析
        }
      }

      return value?.toString() || ''
    })
  }

  /**
   * 添加路由
   */
  addRoute(route: RoutePatternConfig): void {
    this.config.routes.push(route)
    this.compileRoutes()
  }

  /**
   * 移除路由
   */
  removeRoute(path: string): void {
    this.config.routes = this.config.routes.filter(route => route.path !== path)
    this.compileRoutes()
  }

  /**
   * 更新配置
   */
  updateConfig(config: RouteConfig): void {
    this.config = config
    this.compileRoutes()
  }

  /**
   * 获取当前配置
   */
  getConfig(): RouteConfig {
    return { ...this.config }
  }

  /**
   * 获取所有路由
   */
  getRoutes(): RoutePatternConfig[] {
    return [...this.config.routes]
  }

  /**
   * 查找路由
   */
  findRoute(path: string): RoutePatternConfig | undefined {
    return this.config.routes.find(route => route.path === path)
  }

  /**
   * 检查路径是否有效
   */
  isValidPath(path: string): boolean {
    try {
      new URL(path, 'http://localhost')
      return true
    } catch {
      return false
    }
  }

  /**
   * 规范化路径
   */
  normalizePath(path: string): string {
    // 移除重复的斜杠
    let normalized = path.replace(/\/+/g, '/')

    // 确保以/开头
    if (!normalized.startsWith('/')) {
      normalized = '/' + normalized
    }

    // 移除末尾的斜杠（除了根路径）
    if (normalized.length > 1 && normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1)
    }

    return normalized
  }

  /**
   * 获取路由统计信息
   */
  getStats(): {
    totalRoutes: number
    staticRoutes: number
    dynamicRoutes: number
    collectionRoutes: number
    redirects: number
  } {
    const routes = this.config.routes

    return {
      totalRoutes: routes.length,
      staticRoutes: routes.filter(r => r.type === 'static').length,
      dynamicRoutes: routes.filter(r => r.type === 'dynamic').length,
      collectionRoutes: routes.filter(r => r.type === 'collection').length,
      redirects: this.config.redirects.length
    }
  }
}

// 导出服务实例
export const routerService = new RouterService()