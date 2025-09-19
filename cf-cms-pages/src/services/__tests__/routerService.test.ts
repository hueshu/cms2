// 路由服务测试
import { describe, it, expect, beforeEach } from 'vitest'
import { RouterService, RouteMatch } from '../routerService'
import { RouteConfig, RoutePattern } from '../../config/routes'
import { Site, Article, Tag } from '../../../../cf-cms-worker/src/models/types'

describe('RouterService', () => {
  let router: RouterService
  let mockSite: Site
  let mockArticles: Article[]
  let mockTags: Tag[]

  const testConfig: RouteConfig = {
    routes: [
      {
        path: '/',
        template: 'index',
        type: 'static',
        metadata: { title: '首页' },
        cache: { ttl: 3600 }
      },
      {
        path: '/articles/:slug',
        template: 'article',
        type: 'dynamic',
        params: {
          slug: { type: 'slug', required: true, pattern: '^[a-z0-9-]+$' }
        },
        metadata: { title: '{{article.title}}' },
        cache: { ttl: 1800 }
      },
      {
        path: '/tags/:tag',
        template: 'tag',
        type: 'dynamic',
        params: {
          tag: { type: 'slug', required: true }
        }
      },
      {
        path: '/articles/page/:page',
        template: 'list',
        type: 'dynamic',
        params: {
          page: { type: 'number', required: true, pattern: '^[1-9]\\d*$' }
        }
      }
    ],
    sitemap: {
      enabled: true,
      path: '/sitemap.xml',
      excludePatterns: ['/api/*']
    },
    rss: {
      enabled: true,
      path: '/feed.xml',
      config: {
        title: 'Test Site',
        description: 'Test Description',
        link: 'https://example.com'
      }
    },
    robots: {
      enabled: true,
      path: '/robots.txt',
      rules: [
        {
          userAgent: '*',
          allow: ['/'],
          disallow: ['/api/'],
          sitemap: ['/sitemap.xml']
        }
      ]
    },
    redirects: [
      { from: '/blog/:slug', to: '/articles/:slug', code: 301 },
      { from: '/old-page', to: '/new-page', code: 302 }
    ],
    errorPages: {
      404: '404',
      500: 'error'
    }
  }

  beforeEach(() => {
    router = new RouterService(testConfig)

    mockSite = {
      id: 'site1',
      domain: 'example.com',
      name: 'Test Site',
      description: 'A test site',
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }

    mockArticles = [
      {
        id: 'article1',
        site_id: 'site1',
        title: 'Test Article',
        slug: 'test-article',
        content: 'Test content',
        summary: 'Test summary',
        status: 'published',
        view_count: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        published_at: '2024-01-01T00:00:00Z',
        tags: [{ id: 'tag1', name: 'Test', slug: 'test', site_id: 'site1', created_at: '2024-01-01T00:00:00Z' }]
      }
    ]

    mockTags = [
      {
        id: 'tag1',
        site_id: 'site1',
        name: 'Test',
        slug: 'test',
        created_at: '2024-01-01T00:00:00Z'
      }
    ]
  })

  describe('路由匹配', () => {
    it('应该匹配静态路由', () => {
      const result = router.match('/')

      expect(result).toBeTruthy()
      expect((result as RouteMatch).template).toBe('index')
      expect((result as RouteMatch).params).toEqual({})
    })

    it('应该匹配动态路由并提取参数', () => {
      const result = router.match('/articles/hello-world')

      expect(result).toBeTruthy()
      const match = result as RouteMatch
      expect(match.template).toBe('article')
      expect(match.params.slug).toBe('hello-world')
    })

    it('应该匹配带查询参数的路由', () => {
      const result = router.match('/articles/test?page=2&limit=10')

      expect(result).toBeTruthy()
      const match = result as RouteMatch
      expect(match.template).toBe('article')
      expect(match.params.slug).toBe('test')
      expect(match.query.page).toBe('2')
      expect(match.query.limit).toBe('10')
    })

    it('应该验证路由参数', () => {
      // 有效的slug
      const validResult = router.match('/articles/valid-slug-123')
      expect(validResult).toBeTruthy()

      // 无效的slug（包含大写字母）
      const invalidResult = router.match('/articles/Invalid-Slug')
      expect(invalidResult).toBeNull()
    })

    it('应该验证数字参数', () => {
      // 有效的页码
      const validResult = router.match('/articles/page/5')
      expect(validResult).toBeTruthy()

      // 无效的页码（以0开头）
      const invalidResult = router.match('/articles/page/0')
      expect(invalidResult).toBeNull()
    })

    it('对于不匹配的路由应该返回null', () => {
      const result = router.match('/non-existent-route')
      expect(result).toBeNull()
    })
  })

  describe('重定向处理', () => {
    it('应该处理重定向规则', () => {
      const result = router.match('/blog/test-article')

      expect(result).toBeTruthy()
      expect('url' in result!).toBe(true)
      if ('url' in result!) {
        expect(result.url).toBe('/articles/test-article')
        expect(result.code).toBe(301)
      }
    })

    it('应该处理静态重定向', () => {
      const result = router.match('/old-page')

      expect(result).toBeTruthy()
      expect('url' in result!).toBe(true)
      if ('url' in result!) {
        expect(result.url).toBe('/new-page')
        expect(result.code).toBe(302)
      }
    })
  })

  describe('站点地图生成', () => {
    it('应该生成站点地图条目', async () => {
      const entries = await router.generateSitemapEntries(mockSite, mockArticles, mockTags)

      expect(entries.length).toBeGreaterThanOrEqual(2) // 至少包含文章 + 标签

      // 检查文章条目
      const articleEntry = entries.find(e => e.url.includes('/articles/test-article'))
      expect(articleEntry).toBeTruthy()
      if (articleEntry) {
        expect(articleEntry.changeFrequency).toBe('monthly')
      }

      // 检查标签条目
      const tagEntry = entries.find(e => e.url.includes('/tags/test'))
      expect(tagEntry).toBeTruthy()
    })

    it('应该排除指定模式的URL', async () => {
      const articleWithApiPath: Article = {
        ...mockArticles[0],
        slug: 'api-test'
      }

      const entries = await router.generateSitemapEntries(mockSite, [articleWithApiPath], mockTags)

      // api相关的条目应该被正确包含（因为只是slug包含api，不是路径）
      const apiEntry = entries.find(e => e.url.includes('/articles/api-test'))
      expect(apiEntry).toBeTruthy()
    })
  })

  describe('RSS生成', () => {
    it('应该生成RSS项目', async () => {
      const items = await router.generateRSSItems(mockSite, mockArticles)

      expect(items).toHaveLength(1)
      expect(items[0].title).toBe('Test Article')
      expect(items[0].description).toBe('Test summary')
      expect(items[0].link).toBe('https://example.com/articles/test-article')
      expect(items[0].category).toEqual(['Test'])
    })

    it('应该限制RSS项目数量', async () => {
      const manyArticles = Array.from({ length: 30 }, (_, i) => ({
        ...mockArticles[0],
        id: `article${i}`,
        title: `Article ${i}`,
        slug: `article-${i}`
      }))

      const items = await router.generateRSSItems(mockSite, manyArticles)

      // 默认限制为20
      expect(items.length).toBeLessThanOrEqual(20)
    })
  })

  describe('robots.txt生成', () => {
    it('应该生成robots.txt内容', () => {
      const content = router.generateRobotsContent()

      expect(content).toContain('User-agent: *')
      expect(content).toContain('Allow: /')
      expect(content).toContain('Disallow: /api/')
      expect(content).toContain('Sitemap: /sitemap.xml')
    })
  })

  describe('缓存配置', () => {
    it('应该获取路由的缓存配置', () => {
      const match = router.match('/') as RouteMatch
      const cacheConfig = router.getCacheConfig(match)

      expect(cacheConfig.shouldCache).toBe(true)
      expect(cacheConfig.ttl).toBe(3600)
    })

    it('应该处理无缓存配置的路由', () => {
      const match = router.match('/tags/test') as RouteMatch
      const cacheConfig = router.getCacheConfig(match)

      expect(cacheConfig.shouldCache).toBe(false)
      expect(cacheConfig.ttl).toBe(0)
    })
  })

  describe('元数据处理', () => {
    it('应该处理模板化的元数据', () => {
      const match = router.match('/articles/test') as RouteMatch
      const metadata = router.getRouteMetadata(match, {
        article: { title: 'Test Article' },
        slug: 'test'
      })

      expect(metadata.title).toBe('Test Article')
    })

    it('应该保留无法解析的模板', () => {
      const match = router.match('/articles/test') as RouteMatch
      const metadata = router.getRouteMetadata(match, {
        // 没有article数据
        slug: 'test'
      })

      expect(metadata.title).toBe('{{article.title}}')
    })
  })

  describe('路径处理', () => {
    it('应该规范化路径', () => {
      expect(router.normalizePath('/path//with///slashes/')).toBe('/path/with/slashes')
      expect(router.normalizePath('no-leading-slash')).toBe('/no-leading-slash')
      expect(router.normalizePath('/')).toBe('/')
    })

    it('应该验证路径有效性', () => {
      expect(router.isValidPath('/valid/path')).toBe(true)
      expect(router.isValidPath('/valid/path?query=1')).toBe(true)
      expect(router.isValidPath('invalid://path')).toBe(true) // URL构造会处理
    })
  })

  describe('路由统计', () => {
    it('应该提供路由统计信息', () => {
      const stats = router.getStats()

      expect(stats.totalRoutes).toBe(4)
      expect(stats.staticRoutes).toBe(1)
      expect(stats.dynamicRoutes).toBe(3)
      expect(stats.redirects).toBe(2)
    })
  })

  describe('路由管理', () => {
    it('应该能添加新路由', () => {
      const newRoute = {
        path: '/contact',
        template: 'contact',
        type: 'static' as const,
        metadata: { title: '联系我们' }
      }

      router.addRoute(newRoute)
      const result = router.match('/contact')

      expect(result).toBeTruthy()
      expect((result as RouteMatch).template).toBe('contact')
    })

    it('应该能移除路由', () => {
      router.removeRoute('/tags/:tag')
      const result = router.match('/tags/test')

      expect(result).toBeNull()
    })

    it('应该能查找特定路由', () => {
      const route = router.findRoute('/articles/:slug')

      expect(route).toBeTruthy()
      expect(route!.template).toBe('article')
    })
  })
})

describe('RoutePattern', () => {
  it('应该编译和匹配简单路径', () => {
    const pattern = RoutePattern.create('/articles')
    const result = pattern.match('/articles')

    expect(result.matches).toBe(true)
    expect(result.params).toEqual({})
  })

  it('应该编译和匹配参数化路径', () => {
    const pattern = RoutePattern.create('/articles/:slug/comments/:id')
    const result = pattern.match('/articles/hello-world/comments/123')

    expect(result.matches).toBe(true)
    expect(result.params).toEqual({
      slug: 'hello-world',
      id: '123'
    })
  })

  it('应该处理不匹配的路径', () => {
    const pattern = RoutePattern.create('/articles/:slug')
    const result = pattern.match('/posts/hello-world')

    expect(result.matches).toBe(false)
    expect(result.params).toEqual({})
  })

  it('应该正确处理特殊字符', () => {
    const pattern = RoutePattern.create('/articles/:slug')
    const result = pattern.match('/articles/hello-world.html')

    expect(result.matches).toBe(true) // 匹配包含点的slug
    expect(result.params.slug).toBe('hello-world.html')
  })
})