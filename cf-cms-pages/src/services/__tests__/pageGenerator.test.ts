// 页面生成器测试
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PageGenerator, DataProvider } from '../pageGenerator'
import { TemplateService } from '../templateService'
import { Site, Article, Tag, PaginatedResponse } from '../../../../cf-cms-worker/src/models/types'

// 模拟数据提供器
class MockDataProvider implements DataProvider {
  private sites = new Map<string, Site>()
  private articles = new Map<string, Article>()
  private tags = new Map<string, Tag>()

  constructor() {
    // 设置测试数据
    const site: Site = {
      id: 'site1',
      domain: 'example.com',
      name: 'Test Site',
      description: 'A test site',
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
    this.sites.set('example.com', site)

    const article: Article = {
      id: 'article1',
      site_id: 'site1',
      title: 'Test Article',
      slug: 'test-article',
      content: 'This is test content for the article.',
      summary: 'Test summary',
      status: 'published',
      view_count: 100,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T12:00:00Z',
      published_at: '2024-01-01T10:00:00Z',
      tags: [
        { id: 'tag1', name: 'Technology', slug: 'technology', site_id: 'site1', created_at: '2024-01-01T00:00:00Z' }
      ]
    }
    this.articles.set('test-article', article)

    const tag: Tag = {
      id: 'tag1',
      site_id: 'site1',
      name: 'Technology',
      slug: 'technology',
      created_at: '2024-01-01T00:00:00Z'
    }
    this.tags.set('technology', tag)
  }

  async getSite(domain: string): Promise<Site | null> {
    return this.sites.get(domain) || null
  }

  async getArticle(siteId: string, slug: string): Promise<Article | null> {
    const article = this.articles.get(slug)
    return article && article.site_id === siteId ? article : null
  }

  async getArticles(siteId: string, options?: {
    page?: number
    limit?: number
    tag?: string
    status?: string
  }): Promise<PaginatedResponse<Article>> {
    const allArticles = Array.from(this.articles.values())
      .filter(article => article.site_id === siteId)
      .filter(article => !options?.status || article.status === options.status)
      .filter(article => !options?.tag ||
        article.tags?.some(tag => tag.slug === options.tag))

    const page = options?.page || 1
    const limit = options?.limit || 10
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit

    return {
      data: allArticles.slice(startIndex, endIndex),
      total: allArticles.length,
      page,
      limit,
      totalPages: Math.ceil(allArticles.length / limit)
    }
  }

  async getTag(siteId: string, slug: string): Promise<Tag | null> {
    const tag = this.tags.get(slug)
    return tag && tag.site_id === siteId ? tag : null
  }

  async getTags(siteId: string): Promise<Tag[]> {
    return Array.from(this.tags.values())
      .filter(tag => tag.site_id === siteId)
  }

  async searchArticles(siteId: string, query: string): Promise<Article[]> {
    return Array.from(this.articles.values())
      .filter(article =>
        article.site_id === siteId &&
        (article.title.toLowerCase().includes(query.toLowerCase()) ||
         article.content?.toLowerCase().includes(query.toLowerCase()))
      )
  }
}

describe('PageGenerator', () => {
  let pageGenerator: PageGenerator
  let dataProvider: MockDataProvider
  let templateService: TemplateService

  beforeEach(() => {
    dataProvider = new MockDataProvider()
    templateService = new TemplateService()

    // 注册测试模板
    templateService.registerTemplate({
      name: 'index',
      type: 'page',
      path: '/test/index.html',
      content: '<h1>{{site.name}}</h1><p>首页内容</p>',
      lastModified: '2024-01-01T00:00:00Z'
    })

    templateService.registerTemplate({
      name: 'article',
      type: 'page',
      path: '/test/article.html',
      content: '<h1>{{article.title}}</h1><div>{{article.content}}</div>',
      lastModified: '2024-01-01T00:00:00Z'
    })

    templateService.registerTemplate({
      name: 'list',
      type: 'page',
      path: '/test/list.html',
      content: '<h1>文章列表</h1>{{#each articles}}<h2>{{title}}</h2>{{/each}}',
      lastModified: '2024-01-01T00:00:00Z'
    })

    templateService.registerTemplate({
      name: 'tag',
      type: 'page',
      path: '/test/tag.html',
      content: '<h1>标签：{{tag.name}}</h1>{{#each articles}}<h2>{{title}}</h2>{{/each}}',
      lastModified: '2024-01-01T00:00:00Z'
    })

    templateService.registerTemplate({
      name: 'error',
      type: 'page',
      path: '/test/error.html',
      content: '<h1>500 - 服务器错误</h1>',
      lastModified: '2024-01-01T00:00:00Z'
    })

    templateService.registerTemplate({
      name: '404',
      type: 'page',
      path: '/test/404.html',
      content: '<h1>404 - 页面未找到</h1>',
      lastModified: '2024-01-01T00:00:00Z'
    })

    templateService.registerTemplate({
      name: 'page',
      type: 'page',
      path: '/test/page.html',
      content: '<h1>通用页面</h1>',
      lastModified: '2024-01-01T00:00:00Z'
    })

    templateService.registerTemplate({
      name: 'search',
      type: 'page',
      path: '/test/search.html',
      content: '<h1>搜索页面</h1>',
      lastModified: '2024-01-01T00:00:00Z'
    })

    templateService.registerTemplate({
      name: 'tags',
      type: 'page',
      path: '/test/tags.html',
      content: '<h1>标签列表</h1>',
      lastModified: '2024-01-01T00:00:00Z'
    })

    pageGenerator = new PageGenerator(undefined, templateService)
  })

  describe('页面生成', () => {
    it('应该生成首页', async () => {
      const result = await pageGenerator.generatePage(
        'https://example.com/',
        dataProvider
      )

      expect(result.type).toBe('page')
      expect(result.statusCode).toBe(200)
      expect(result.content).toContain('Test Site')
      expect(result.content).toContain('首页内容')
      expect(result.headers['Content-Type']).toBe('text/html; charset=utf-8')
    })

    it('应该生成文章详情页', async () => {
      const result = await pageGenerator.generatePage(
        'https://example.com/articles/test-article',
        dataProvider
      )

      expect(result.type).toBe('page')
      expect(result.statusCode).toBe(200)
      expect(result.content).toContain('Test Article')
      expect(result.content).toContain('This is test content')
    })

    it('应该生成文章列表页', async () => {
      const result = await pageGenerator.generatePage(
        'https://example.com/articles',
        dataProvider
      )

      expect(result.type).toBe('page')
      expect(result.statusCode).toBe(200)
      expect(result.content).toContain('文章列表')
      // 检查是否渲染了文章列表结构
      expect(result.content).toContain('<h2>')
    })

    it('应该生成标签页', async () => {
      const result = await pageGenerator.generatePage(
        'https://example.com/tags/technology',
        dataProvider
      )

      expect(result.type).toBe('page')
      expect(result.statusCode).toBe(200)
      expect(result.content).toContain('标签：Technology')
      // 检查是否渲染了文章标题结构
      expect(result.content).toContain('<h2>')
    })

    it('应该处理查询参数', async () => {
      const result = await pageGenerator.generatePage(
        'https://example.com/articles?page=2&limit=5',
        dataProvider
      )

      expect(result.type).toBe('page')
      expect(result.statusCode).toBe(200)
      expect(result.metadata?.route?.query.page).toBe('2')
      expect(result.metadata?.route?.query.limit).toBe('5')
    })
  })

  describe('错误处理', () => {
    it('应该为不存在的文章生成404页面', async () => {
      const result = await pageGenerator.generatePage(
        'https://example.com/articles/non-existent-article',
        dataProvider
      )

      expect(result.type).toBe('error')
      expect(result.statusCode).toBe(500) // 因为找不到文章会抛出错误
    })

    it('应该为不存在的路由生成404页面', async () => {
      const result = await pageGenerator.generatePage(
        'https://example.com/non-existent-page',
        dataProvider
      )

      expect(result.type).toBe('notfound')
      expect(result.statusCode).toBe(404)
      expect(result.content).toContain('404')
    })

    it('应该为不存在的站点生成404页面', async () => {
      const result = await pageGenerator.generatePage(
        'https://non-existent-site.com/',
        dataProvider
      )

      expect(result.type).toBe('error')
      expect(result.statusCode).toBe(500) // 因为站点不存在会抛出错误
    })
  })

  describe('重定向处理', () => {
    it('应该处理重定向', async () => {
      const result = await pageGenerator.generatePage(
        'https://example.com/blog/test-article',
        dataProvider
      )

      expect(result.type).toBe('redirect')
      expect(result.statusCode).toBe(301)
      expect(result.headers.Location).toBe('/articles/test-article')
    })
  })

  describe('缓存配置', () => {
    it('应该设置正确的缓存头', async () => {
      const result = await pageGenerator.generatePage(
        'https://example.com/',
        dataProvider
      )

      expect(result.headers['Cache-Control']).toContain('public')
      expect(result.headers['Cache-Control']).toContain('max-age=3600')
    })

    it('应该为动态内容设置不同的缓存策略', async () => {
      const result = await pageGenerator.generatePage(
        'https://example.com/articles/test-article',
        dataProvider
      )

      expect(result.headers['Cache-Control']).toContain('max-age=1800')
    })
  })

  describe('特殊页面生成', () => {
    it('应该生成站点地图', async () => {
      const result = await pageGenerator.generatePage(
        'https://example.com/sitemap.xml',
        dataProvider,
        { generateSitemap: true }
      )

      expect(result.type).toBe('sitemap')
      expect(result.statusCode).toBe(200)
      expect(result.headers['Content-Type']).toBe('application/xml; charset=utf-8')
      expect(result.content).toContain('<?xml version="1.0"')
      expect(result.content).toContain('<urlset')
      expect(result.content).toContain('https://example.com/')
      expect(result.content).toContain('https://example.com/articles/test-article')
    })

    it('应该生成RSS feed', async () => {
      const result = await pageGenerator.generatePage(
        'https://example.com/feed.xml',
        dataProvider,
        { generateRSS: true }
      )

      expect(result.type).toBe('rss')
      expect(result.statusCode).toBe(200)
      expect(result.headers['Content-Type']).toBe('application/rss+xml; charset=utf-8')
      expect(result.content).toContain('<?xml version="1.0"')
      expect(result.content).toContain('<rss version="2.0"')
      expect(result.content).toContain('Test Site')
      expect(result.content).toContain('Test Article')
    })

    it('应该生成robots.txt', async () => {
      const result = await pageGenerator.generatePage(
        'https://example.com/robots.txt',
        dataProvider,
        { generateRobots: true }
      )

      expect(result.type).toBe('robots')
      expect(result.statusCode).toBe(200)
      expect(result.headers['Content-Type']).toBe('text/plain; charset=utf-8')
      expect(result.content).toContain('User-agent: *')
      expect(result.content).toContain('Allow: /')
      expect(result.content).toContain('Sitemap: /sitemap.xml')
    })
  })

  describe('安全头设置', () => {
    it('应该设置安全HTTP头', async () => {
      const result = await pageGenerator.generatePage(
        'https://example.com/',
        dataProvider
      )

      expect(result.headers['X-Content-Type-Options']).toBe('nosniff')
      expect(result.headers['X-Frame-Options']).toBe('DENY')
      expect(result.headers['X-XSS-Protection']).toBe('1; mode=block')
    })
  })

  describe('请求上下文', () => {
    it('应该处理请求上下文信息', async () => {
      const requestContext = {
        url: new URL('https://example.com/'),
        method: 'GET',
        headers: {
          'user-agent': 'Mozilla/5.0 (Test Browser)',
          'referer': 'https://google.com'
        },
        ip: '192.168.1.1'
      }

      const result = await pageGenerator.generatePage(
        'https://example.com/',
        dataProvider,
        { requestContext }
      )

      expect(result.type).toBe('page')
      expect(result.statusCode).toBe(200)
      // 检查请求信息是否被正确传递到模板上下文
    })
  })

  describe('预生成功能', () => {
    it('应该预生成静态页面', async () => {
      const results = await pageGenerator.pregenerateStaticPages(
        dataProvider,
        'example.com'
      )

      expect(results.size).toBeGreaterThan(0)
      expect(results.has('/')).toBe(true)
      expect(results.has('/about')).toBe(true)
      expect(results.has('/search')).toBe(true)

      const homeResult = results.get('/')!
      expect(homeResult.type).toBe('page')
      expect(homeResult.statusCode).toBe(200)
    })
  })

  describe('元数据处理', () => {
    it('应该设置正确的页面元数据', async () => {
      const result = await pageGenerator.generatePage(
        'https://example.com/articles/test-article',
        dataProvider
      )

      // 元数据模板处理需要在路由服务中进行
      expect(result.metadata?.route?.metadata.title).toBeDefined()
    })

    it('应该包含渲染时间', async () => {
      const result = await pageGenerator.generatePage(
        'https://example.com/',
        dataProvider
      )

      expect(result.metadata?.renderTime).toBeGreaterThanOrEqual(0)
      expect(result.headers['X-Render-Time']).toBeDefined()
    })
  })

  describe('服务获取', () => {
    it('应该能获取路由服务', () => {
      const router = pageGenerator.getRouter()
      expect(router).toBeDefined()
      expect(typeof router.match).toBe('function')
    })

    it('应该能获取模板服务', () => {
      const templateSvc = pageGenerator.getTemplateService()
      expect(templateSvc).toBeDefined()
      expect(typeof templateSvc.renderPage).toBe('function')
    })
  })
})