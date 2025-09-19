// 页面生成器 - 整合路由和模板引擎，生成完整页面
import { RouterService, RouteMatch, RedirectResult, RequestContext } from './routerService'
import { TemplateService, PageContext, TemplateRenderOptions, TemplateRenderResult } from './templateService'
import { RouteConfig } from '../config/routes'
import { Site, Article, Tag, PaginatedResponse } from '../../../cf-cms-worker/src/models/types'

// 页面生成选项
export interface PageGenerationOptions extends TemplateRenderOptions {
  requestContext?: RequestContext
  enableRouting?: boolean
  enableCaching?: boolean
  generateSitemap?: boolean
  generateRSS?: boolean
  generateRobots?: boolean
}

// 页面生成结果
export interface PageGenerationResult {
  type: 'page' | 'redirect' | 'notfound' | 'error' | 'sitemap' | 'rss' | 'robots'
  statusCode: number
  headers: Record<string, string>
  content: string
  metadata?: {
    route?: RouteMatch
    renderTime: number
    cacheConfig?: {
      shouldCache: boolean
      ttl: number
      varyBy: string[]
    }
    errors?: string[]
    warnings?: string[]
  }
}

// 数据获取接口
export interface DataProvider {
  getSite(domain: string): Promise<Site | null>
  getArticle(siteId: string, slug: string): Promise<Article | null>
  getArticles(siteId: string, options?: {
    page?: number
    limit?: number
    tag?: string
    status?: string
  }): Promise<PaginatedResponse<Article>>
  getTag(siteId: string, slug: string): Promise<Tag | null>
  getTags(siteId: string): Promise<Tag[]>
  searchArticles(siteId: string, query: string): Promise<Article[]>
}

// 页面类型定义
export type PageType = 'index' | 'article' | 'list' | 'tag' | 'tags' | 'search' | '404' | 'error'

export class PageGenerator {
  private router: RouterService
  private templateService: TemplateService

  constructor(
    routeConfig?: RouteConfig,
    templateService?: TemplateService
  ) {
    this.router = new RouterService(routeConfig)
    this.templateService = templateService || new TemplateService()
  }

  /**
   * 生成页面
   */
  async generatePage(
    url: string,
    dataProvider: DataProvider,
    options: PageGenerationOptions = {}
  ): Promise<PageGenerationResult> {
    const startTime = Date.now()

    try {
      // 检查特殊路径
      const specialPage = await this.handleSpecialPaths(url, dataProvider, options)
      if (specialPage) {
        return specialPage
      }

      // 路由匹配
      const routeResult = this.router.match(url, options.requestContext)

      if (!routeResult) {
        return await this.generate404Page(dataProvider, url, options)
      }

      // 处理重定向
      if ('url' in routeResult) {
        return this.generateRedirect(routeResult)
      }

      // 生成页面内容
      return await this.generatePageContent(
        routeResult as RouteMatch,
        dataProvider,
        url,
        options,
        startTime
      )
    } catch (error) {
      console.error('Page generation error:', error)
      return await this.generate500Page(dataProvider, url, options, error)
    }
  }

  /**
   * 处理特殊路径（sitemap, rss, robots）
   */
  private async handleSpecialPaths(
    url: string,
    dataProvider: DataProvider,
    options: PageGenerationOptions
  ): Promise<PageGenerationResult | null> {
    const urlObj = new URL(url, 'http://localhost')
    const pathname = urlObj.pathname

    // 站点地图
    if (pathname === '/sitemap.xml' && options.generateSitemap !== false) {
      return await this.generateSitemap(dataProvider, urlObj.hostname)
    }

    // RSS Feed
    if (pathname === '/feed.xml' && options.generateRSS !== false) {
      return await this.generateRSSFeed(dataProvider, urlObj.hostname)
    }

    // robots.txt
    if (pathname === '/robots.txt' && options.generateRobots !== false) {
      return this.generateRobots()
    }

    return null
  }

  /**
   * 生成页面内容
   */
  private async generatePageContent(
    routeMatch: RouteMatch,
    dataProvider: DataProvider,
    url: string,
    options: PageGenerationOptions,
    startTime: number
  ): Promise<PageGenerationResult> {
    const urlObj = new URL(url, 'http://localhost')

    // 获取站点信息
    const site = await dataProvider.getSite(urlObj.hostname)
    if (!site) {
      throw new Error(`Site not found: ${urlObj.hostname}`)
    }

    // 构建页面上下文
    const pageContext = await this.buildPageContext(
      routeMatch,
      site,
      dataProvider,
      urlObj,
      options
    )

    // 渲染页面
    const renderResult = await this.templateService.renderPage(
      routeMatch.template,
      pageContext,
      options
    )

    // 获取缓存配置
    const cacheConfig = this.router.getCacheConfig(routeMatch)

    return {
      type: 'page',
      statusCode: 200,
      headers: this.buildHeaders(renderResult, cacheConfig),
      content: renderResult.html,
      metadata: {
        route: routeMatch,
        renderTime: Date.now() - startTime,
        cacheConfig,
        errors: renderResult.metadata.errors,
        warnings: renderResult.metadata.warnings
      }
    }
  }

  /**
   * 构建页面上下文
   */
  private async buildPageContext(
    routeMatch: RouteMatch,
    site: Site,
    dataProvider: DataProvider,
    urlObj: URL,
    options: PageGenerationOptions
  ): Promise<PageContext> {
    const { params, query } = routeMatch

    let article: Article | undefined
    let articles: Article[] = []
    let tags: Tag[] = []
    let tag: Tag | undefined
    let pageType: PageType = 'index'

    // 根据路由类型获取数据
    switch (routeMatch.template) {
      case 'article':
        article = await dataProvider.getArticle(site.id, params.slug)
        if (!article) {
          throw new Error(`Article not found: ${params.slug}`)
        }
        pageType = 'article'
        break

      case 'list':
        const page = parseInt(params.page || query.page || '1')
        const limit = parseInt(query.limit || '10')
        const paginatedArticles = await dataProvider.getArticles(site.id, {
          page,
          limit,
          status: 'published'
        })
        articles = paginatedArticles.data
        pageType = 'list'
        break

      case 'tag':
        tag = await dataProvider.getTag(site.id, params.tag)
        if (!tag) {
          throw new Error(`Tag not found: ${params.tag}`)
        }
        const tagPage = parseInt(query.page || '1')
        const tagLimit = parseInt(query.limit || '10')
        const tagArticles = await dataProvider.getArticles(site.id, {
          page: tagPage,
          limit: tagLimit,
          tag: params.tag,
          status: 'published'
        })
        articles = tagArticles.data
        pageType = 'tag'
        break

      case 'tags':
        tags = await dataProvider.getTags(site.id)
        pageType = 'tags'
        break

      case 'search':
        const searchQuery = query.q || ''
        if (searchQuery) {
          articles = await dataProvider.searchArticles(site.id, searchQuery)
        }
        pageType = 'search'
        break

      case 'index':
      default:
        // 首页显示最新文章
        const recentArticles = await dataProvider.getArticles(site.id, {
          page: 1,
          limit: 5,
          status: 'published'
        })
        articles = recentArticles.data
        pageType = 'index'
        break
    }

    // 获取导航数据
    const navigation = await this.buildNavigation(site, dataProvider)

    // 构建页面元数据
    const metadata = this.router.getRouteMetadata(routeMatch, {
      site,
      article,
      tag,
      articles,
      page: params.page || query.page || '1'
    })

    return {
      site,
      page: {
        title: metadata.title || article?.title || site.name,
        description: metadata.description || article?.summary || site.description,
        keywords: metadata.keywords || article?.meta_keywords,
        canonical: `https://${site.domain}${urlObj.pathname}`,
        robots: 'index,follow',
        type: pageType
      },
      article,
      articles,
      tags,
      tag,
      navigation,
      meta: {
        currentPage: parseInt(params.page || query.page || '1'),
        searchQuery: query.q,
        ...metadata
      },
      url: {
        base: `https://${site.domain}`,
        current: urlObj.href,
        path: urlObj.pathname,
        query: Object.fromEntries(urlObj.searchParams.entries())
      },
      request: {
        userAgent: options.requestContext?.headers['user-agent'],
        ip: options.requestContext?.ip,
        referer: options.requestContext?.headers.referer
      }
    }
  }

  /**
   * 构建导航数据
   */
  private async buildNavigation(
    site: Site,
    dataProvider: DataProvider
  ): Promise<any[]> {
    // 基础导航
    const navigation = [
      { title: '首页', path: '/', active: false },
      { title: '文章', path: '/articles', active: false },
      { title: '标签', path: '/tags', active: false }
    ]

    // 可以根据站点配置添加更多导航项
    if (site.config?.features?.enableSearch) {
      navigation.push({ title: '搜索', path: '/search', active: false })
    }

    return navigation
  }

  /**
   * 构建HTTP头
   */
  private buildHeaders(
    renderResult: TemplateRenderResult,
    cacheConfig: { shouldCache: boolean; ttl: number; varyBy: string[] }
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Render-Time': renderResult.metadata.renderTime.toString()
    }

    // 缓存头
    if (cacheConfig.shouldCache) {
      headers['Cache-Control'] = `public, max-age=${cacheConfig.ttl}`

      if (cacheConfig.varyBy.length > 0) {
        headers['Vary'] = cacheConfig.varyBy.join(', ')
      }
    } else {
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    }

    // 安全头
    headers['X-Content-Type-Options'] = 'nosniff'
    headers['X-Frame-Options'] = 'DENY'
    headers['X-XSS-Protection'] = '1; mode=block'

    return headers
  }

  /**
   * 生成重定向响应
   */
  private generateRedirect(redirect: RedirectResult): PageGenerationResult {
    return {
      type: 'redirect',
      statusCode: redirect.code,
      headers: {
        'Location': redirect.url,
        'Cache-Control': 'no-cache'
      },
      content: `Redirecting to ${redirect.url}`
    }
  }

  /**
   * 生成404页面
   */
  private async generate404Page(
    dataProvider: DataProvider,
    url: string,
    options: PageGenerationOptions
  ): Promise<PageGenerationResult> {
    const urlObj = new URL(url, 'http://localhost')
    const site = await dataProvider.getSite(urlObj.hostname)

    if (!site) {
      return {
        type: 'notfound',
        statusCode: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        content: '<h1>404 - Site Not Found</h1>'
      }
    }

    const errorTemplate = this.router.getErrorPageTemplate(404)
    const pageContext: PageContext = {
      site,
      page: {
        title: '页面未找到 - 404',
        description: '您访问的页面不存在',
        robots: 'noindex,nofollow',
        type: '404'
      },
      url: {
        base: `https://${site.domain}`,
        current: urlObj.href,
        path: urlObj.pathname,
        query: Object.fromEntries(urlObj.searchParams.entries())
      },
      request: {
        userAgent: options.requestContext?.headers['user-agent'],
        ip: options.requestContext?.ip,
        referer: options.requestContext?.headers.referer
      }
    }

    const renderResult = await this.templateService.renderPage(
      errorTemplate,
      pageContext,
      options
    )

    return {
      type: 'notfound',
      statusCode: 404,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache'
      },
      content: renderResult.html
    }
  }

  /**
   * 生成500页面
   */
  private async generate500Page(
    dataProvider: DataProvider,
    url: string,
    options: PageGenerationOptions,
    error: any
  ): Promise<PageGenerationResult> {
    const urlObj = new URL(url, 'http://localhost')

    try {
      const site = await dataProvider.getSite(urlObj.hostname)

      if (site) {
        const errorTemplate = this.router.getErrorPageTemplate(500)
        const pageContext: PageContext = {
          site,
          page: {
            title: '服务器错误 - 500',
            description: '服务器遇到错误',
            robots: 'noindex,nofollow',
            type: 'error'
          },
          url: {
            base: `https://${site.domain}`,
            current: urlObj.href,
            path: urlObj.pathname,
            query: Object.fromEntries(urlObj.searchParams.entries())
          },
          request: {
            userAgent: options.requestContext?.headers['user-agent'],
            ip: options.requestContext?.ip,
            referer: options.requestContext?.headers.referer
          }
        }

        const renderResult = await this.templateService.renderPage(
          errorTemplate,
          pageContext,
          options
        )

        return {
          type: 'error',
          statusCode: 500,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache'
          },
          content: renderResult.html
        }
      }
    } catch (renderError) {
      console.error('Error rendering 500 page:', renderError)
    }

    // 回退到简单的错误页面
    return {
      type: 'error',
      statusCode: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      content: `<h1>500 - Internal Server Error</h1><p>${error.message}</p>`
    }
  }

  /**
   * 生成站点地图
   */
  private async generateSitemap(
    dataProvider: DataProvider,
    hostname: string
  ): Promise<PageGenerationResult> {
    const site = await dataProvider.getSite(hostname)
    if (!site) {
      throw new Error(`Site not found: ${hostname}`)
    }

    // 获取文章和标签
    const articlesResult = await dataProvider.getArticles(site.id, {
      page: 1,
      limit: 1000, // 获取所有文章
      status: 'published'
    })
    const tags = await dataProvider.getTags(site.id)

    // 生成sitemap条目
    const entries = await this.router.generateSitemapEntries(
      site,
      articlesResult.data,
      tags
    )

    // 生成XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

    for (const entry of entries) {
      xml += '  <url>\n'
      xml += `    <loc>${entry.url}</loc>\n`
      if (entry.lastModified) {
        xml += `    <lastmod>${entry.lastModified}</lastmod>\n`
      }
      if (entry.changeFrequency) {
        xml += `    <changefreq>${entry.changeFrequency}</changefreq>\n`
      }
      if (entry.priority) {
        xml += `    <priority>${entry.priority}</priority>\n`
      }
      xml += '  </url>\n'
    }

    xml += '</urlset>'

    return {
      type: 'sitemap',
      statusCode: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      },
      content: xml
    }
  }

  /**
   * 生成RSS Feed
   */
  private async generateRSSFeed(
    dataProvider: DataProvider,
    hostname: string
  ): Promise<PageGenerationResult> {
    const site = await dataProvider.getSite(hostname)
    if (!site) {
      throw new Error(`Site not found: ${hostname}`)
    }

    // 获取最新文章
    const articlesResult = await dataProvider.getArticles(site.id, {
      page: 1,
      limit: 20,
      status: 'published'
    })

    // 生成RSS项目
    const items = await this.router.generateRSSItems(site, articlesResult.data)

    // 生成RSS XML
    const config = this.router.getConfig().rss.config
    const currentYear = new Date().getFullYear()

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<rss version="2.0">\n'
    xml += '  <channel>\n'
    xml += `    <title>${config.title.replace('{{site.name}}', site.name)}</title>\n`
    xml += `    <description>${config.description.replace('{{site.description}}', site.description || '')}</description>\n`
    xml += `    <link>${config.link.replace('{{site.url}}', `https://${site.domain}`)}</link>\n`
    xml += `    <language>${config.language}</language>\n`
    xml += `    <copyright>${config.copyright?.replace('{{currentYear}}', currentYear.toString()).replace('{{site.name}}', site.name)}</copyright>\n`
    xml += `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n`

    for (const item of items) {
      xml += '    <item>\n'
      xml += `      <title><![CDATA[${item.title}]]></title>\n`
      xml += `      <description><![CDATA[${item.description}]]></description>\n`
      xml += `      <link>${item.link}</link>\n`
      xml += `      <guid>${item.guid}</guid>\n`
      xml += `      <pubDate>${item.pubDate}</pubDate>\n`
      if (item.author) {
        xml += `      <author><![CDATA[${item.author}]]></author>\n`
      }
      if (item.category) {
        for (const cat of item.category) {
          xml += `      <category><![CDATA[${cat}]]></category>\n`
        }
      }
      xml += '    </item>\n'
    }

    xml += '  </channel>\n'
    xml += '</rss>'

    return {
      type: 'rss',
      statusCode: 200,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      },
      content: xml
    }
  }

  /**
   * 生成robots.txt
   */
  private generateRobots(): PageGenerationResult {
    const content = this.router.generateRobotsContent()

    return {
      type: 'robots',
      statusCode: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=86400'
      },
      content
    }
  }

  /**
   * 预生成静态页面
   */
  async pregenerateStaticPages(
    dataProvider: DataProvider,
    hostname: string,
    options: PageGenerationOptions = {}
  ): Promise<Map<string, PageGenerationResult>> {
    const results = new Map<string, PageGenerationResult>()
    const site = await dataProvider.getSite(hostname)

    if (!site) {
      throw new Error(`Site not found: ${hostname}`)
    }

    const baseUrl = `https://${hostname}`

    // 预生成静态路由
    const staticRoutes = this.router.getRoutes().filter(route => route.type === 'static')

    for (const route of staticRoutes) {
      const url = baseUrl + route.path
      const result = await this.generatePage(url, dataProvider, options)
      results.set(route.path, result)
    }

    return results
  }

  /**
   * 获取路由服务
   */
  getRouter(): RouterService {
    return this.router
  }

  /**
   * 获取模板服务
   */
  getTemplateService(): TemplateService {
    return this.templateService
  }

  /**
   * 更新路由配置
   */
  updateRouteConfig(config: RouteConfig): void {
    this.router.updateConfig(config)
  }
}

// 导出服务实例
export const pageGenerator = new PageGenerator()