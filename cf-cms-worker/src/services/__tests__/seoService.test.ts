import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { DatabaseService } from '../../utils/database'
import { SEOService } from '../seoService'
import { MetaTagService } from '../metaTagService'
import { SitemapService } from '../sitemapService'
import { InternalLinkService } from '../internalLinkService'
import {
  CreateSEOConfigInput,
  UpdateSEOConfigInput,
  CreateRedirectRuleInput,
  Article,
  Site
} from '../../models/types'

// Mock D1Database
const mockDB = {
  prepare: (query: string) => ({
    bind: (...params: any[]) => ({
      all: () => Promise.resolve({ results: [] }),
      first: () => Promise.resolve(null),
      run: () => Promise.resolve({ success: true, meta: { changes: 1 } })
    })
  }),
  batch: () => Promise.resolve([])
} as unknown as D1Database

describe('SEOService', () => {
  let db: DatabaseService
  let seoService: SEOService

  beforeEach(() => {
    db = new DatabaseService(mockDB)
    seoService = new SEOService(db)
  })

  describe('SEO Configuration', () => {
    it('should create SEO config with default settings', async () => {
      const input: CreateSEOConfigInput = {
        site_id: 'test-site-id'
      }

      // Mock successful creation
      db.executeOne = async () => ({
        id: 'test-config-id',
        site_id: 'test-site-id',
        meta_settings: {
          default_title_template: '{title} | {site_name}',
          enable_auto_meta: true,
          enable_open_graph: true,
          enable_twitter_cards: true,
          enable_schema_org: true
        },
        sitemap_settings: {
          enabled: true,
          include_images: true,
          include_articles: true,
          include_tags: true
        },
        internal_link_settings: {
          enabled: true,
          max_links_per_article: 5
        },
        robots_txt: 'User-agent: *\nDisallow: /admin/',
        schema_org_settings: {
          enabled: true,
          breadcrumb_enabled: true
        },
        redirect_rules: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

      db.execute = async () => []
      db.executeRun = async () => ({ success: true, meta: { changes: 1 } })

      const config = await seoService.createSEOConfig(input)

      expect(config).toBeDefined()
      expect(config.site_id).toBe('test-site-id')
      expect(config.meta_settings.enable_auto_meta).toBe(true)
    })

    it('should update SEO config', async () => {
      const input: UpdateSEOConfigInput = {
        meta_settings: {
          enable_auto_meta: false
        }
      }

      // Mock existing config
      db.executeOne = async () => ({
        id: 'test-config-id',
        site_id: 'test-site-id',
        meta_settings: {
          enable_auto_meta: true,
          enable_open_graph: true
        },
        sitemap_settings: { enabled: true },
        internal_link_settings: { enabled: true },
        schema_org_settings: { enabled: true },
        robots_txt: 'User-agent: *',
        redirect_rules: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

      db.execute = async () => []
      db.executeRun = async () => ({ success: true, meta: { changes: 1 } })

      const config = await seoService.updateSEOConfig('test-site-id', input)

      expect(config).toBeDefined()
      expect(config.meta_settings.enable_auto_meta).toBe(false)
    })
  })

  describe('Redirect Rules', () => {
    it('should create redirect rule', async () => {
      const input: CreateRedirectRuleInput = {
        site_id: 'test-site-id',
        from_path: '/old-path',
        to_path: '/new-path',
        redirect_type: 301
      }

      db.executeOne = async () => ({
        id: 'test-rule-id',
        site_id: 'test-site-id',
        from_path: '/old-path',
        to_path: '/new-path',
        redirect_type: 301,
        is_regex: false,
        enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

      db.executeRun = async () => ({ success: true, meta: { changes: 1 } })

      const rule = await seoService.createRedirectRule(input)

      expect(rule).toBeDefined()
      expect(rule.from_path).toBe('/old-path')
      expect(rule.to_path).toBe('/new-path')
      expect(rule.redirect_type).toBe(301)
    })

    it('should find matching redirect rule', async () => {
      const testRule = {
        id: 'test-rule-id',
        site_id: 'test-site-id',
        from_path: '/old-path',
        to_path: '/new-path',
        redirect_type: 301,
        is_regex: false,
        enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      db.execute = async () => [testRule]

      const rule = await seoService.findRedirectRule('test-site-id', '/old-path')

      expect(rule).toBeDefined()
      expect(rule?.from_path).toBe('/old-path')
    })

    it('should process redirect with regex', async () => {
      const testRule = {
        id: 'test-rule-id',
        site_id: 'test-site-id',
        from_path: '/blog/(.*)',
        to_path: '/articles/$1',
        redirect_type: 301,
        is_regex: true,
        enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      db.execute = async () => [testRule]

      const result = await seoService.processRedirect('test-site-id', '/blog/hello-world')

      expect(result).toBeDefined()
      expect(result?.processedPath).toBe('/articles/hello-world')
    })
  })

  describe('SEO Analysis', () => {
    it('should analyze article SEO', async () => {
      const testArticle: Article = {
        id: 'test-article-id',
        site_id: 'test-site-id',
        title: 'Test Article Title',
        slug: 'test-article',
        content: '<h1>Test Article</h1><p>This is a test article with some content.</p>',
        meta_description: 'This is a test meta description for the article.',
        meta_keywords: 'test, article, seo',
        status: 'published',
        view_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const analysis = await seoService.analyzeSEO(testArticle)

      expect(analysis).toBeDefined()
      expect(analysis.score).toBeGreaterThan(0)
      expect(analysis.metrics.title_length).toBe(testArticle.title.length)
      expect(analysis.metrics.description_length).toBe(testArticle.meta_description?.length)
      expect(analysis.metrics.word_count).toBeGreaterThan(0)
    })

    it('should identify SEO issues', async () => {
      const testArticle: Article = {
        id: 'test-article-id',
        site_id: 'test-site-id',
        title: '', // Empty title should trigger error
        slug: 'test-article',
        content: '<p>Short content</p>', // Very short content
        status: 'published',
        view_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const analysis = await seoService.analyzeSEO(testArticle)

      expect(analysis.issues.length).toBeGreaterThan(0)
      expect(analysis.issues.some(issue => issue.message.includes('Title is missing'))).toBe(true)
      expect(analysis.issues.some(issue => issue.message.includes('Meta description is missing'))).toBe(true)
    })
  })
})

describe('MetaTagService', () => {
  let metaTagService: MetaTagService

  beforeEach(() => {
    metaTagService = new MetaTagService()
  })

  describe('Article Meta Tags', () => {
    it('should generate article meta tags', () => {
      const testArticle: Article = {
        id: 'test-article-id',
        site_id: 'test-site-id',
        title: 'Test Article Title',
        slug: 'test-article',
        content: '<p>Test article content</p>',
        meta_description: 'Test meta description',
        meta_keywords: 'test, article',
        cover_image: 'https://example.com/image.jpg',
        author: 'Test Author',
        status: 'published',
        view_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const testSite: Site = {
        id: 'test-site-id',
        domain: 'example.com',
        name: 'Test Site',
        description: 'Test site description',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const metaTags = metaTagService.generateArticleMetaTags(
        testArticle,
        testSite,
        undefined,
        'https://example.com'
      )

      expect(metaTags.title).toBe('Test Article Title')
      expect(metaTags.description).toBe('Test meta description')
      expect(metaTags.canonical).toBe('https://example.com/articles/test-article')
      expect(metaTags.og_title).toBe('Test Article Title')
      expect(metaTags.og_image).toBe('https://example.com/image.jpg')
      expect(metaTags.author).toBe('Test Author')
    })

    it('should render meta tags as HTML', () => {
      const metaTags = {
        title: 'Test Title',
        description: 'Test description',
        keywords: ['test', 'seo'],
        canonical: 'https://example.com/test',
        og_title: 'Test OG Title',
        og_description: 'Test OG description'
      }

      const html = metaTagService.renderMetaTagsHtml(metaTags)

      expect(html).toContain('<title>Test Title</title>')
      expect(html).toContain('<meta name="description" content="Test description">')
      expect(html).toContain('<meta name="keywords" content="test, seo">')
      expect(html).toContain('<link rel="canonical" href="https://example.com/test">')
      expect(html).toContain('<meta property="og:title" content="Test OG Title">')
    })
  })

  describe('Structured Data', () => {
    it('should generate article structured data', () => {
      const testArticle: Article = {
        id: 'test-article-id',
        site_id: 'test-site-id',
        title: 'Test Article Title',
        slug: 'test-article',
        content: '<p>Test article content</p>',
        meta_description: 'Test meta description',
        cover_image: 'https://example.com/image.jpg',
        author: 'Test Author',
        status: 'published',
        view_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        published_at: new Date().toISOString()
      }

      const testSite: Site = {
        id: 'test-site-id',
        domain: 'example.com',
        name: 'Test Site',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const seoConfig = {
        schema_org_settings: {
          enabled: true,
          breadcrumb_enabled: true,
          organization: {
            name: 'Test Organization',
            logo: 'https://example.com/logo.jpg'
          }
        }
      }

      const structuredData = metaTagService.generateArticleStructuredData(
        testArticle,
        testSite,
        seoConfig as any,
        'https://example.com'
      )

      expect(structuredData).toHaveLength(2) // Article + Breadcrumb
      expect(structuredData[0]['@type']).toBe('Article')
      expect(structuredData[0].headline).toBe('Test Article Title')
      expect(structuredData[1]['@type']).toBe('BreadcrumbList')
    })

    it('should render structured data as JSON-LD', () => {
      const structuredData = [{
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: 'Test Article'
      }]

      const html = metaTagService.renderStructuredDataHtml(structuredData)

      expect(html).toContain('<script type="application/ld+json">')
      expect(html).toContain('"@type": "Article"')
      expect(html).toContain('"headline": "Test Article"')
    })
  })
})

describe('SitemapService', () => {
  let db: DatabaseService
  let sitemapService: SitemapService

  beforeEach(() => {
    db = new DatabaseService(mockDB)
    sitemapService = new SitemapService(db)
  })

  describe('Sitemap Generation', () => {
    it('should generate XML sitemap', async () => {
      // Mock data
      db.execute = async (query: string) => {
        if (query.includes('articles')) {
          return [{
            id: 'test-article-id',
            site_id: 'test-site-id',
            title: 'Test Article',
            slug: 'test-article',
            status: 'published',
            updated_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          }]
        }
        if (query.includes('tags')) {
          return [{
            id: 'test-tag-id',
            site_id: 'test-site-id',
            name: 'Test Tag',
            slug: 'test-tag',
            created_at: new Date().toISOString()
          }]
        }
        return []
      }

      const sitemap = await sitemapService.generateSitemap(
        'test-site-id',
        'https://example.com'
      )

      expect(sitemap).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
      expect(sitemap).toContain('<loc>https://example.com</loc>') // Homepage
      expect(sitemap).toContain('<loc>https://example.com/articles/test-article</loc>')
      expect(sitemap).toContain('<loc>https://example.com/tags/test-tag</loc>')
    })

    it('should validate sitemap', async () => {
      db.execute = async () => []

      const validation = await sitemapService.validateSitemap(
        'test-site-id',
        'https://example.com'
      )

      expect(validation.valid).toBe(true)
      expect(validation.stats.totalUrls).toBeGreaterThanOrEqual(0)
    })
  })
})

describe('InternalLinkService', () => {
  let db: DatabaseService
  let internalLinkService: InternalLinkService

  beforeEach(() => {
    db = new DatabaseService(mockDB)
    internalLinkService = new InternalLinkService(db)
  })

  describe('Link Processing', () => {
    it('should process article links', async () => {
      const testContent = '<p>This is about <strong>machine learning</strong> and artificial intelligence.</p>'

      // Mock current article
      db.executeOne = async (query: string) => {
        if (query.includes('SELECT * FROM articles WHERE id')) {
          return {
            id: 'current-article-id',
            site_id: 'test-site-id',
            title: 'Current Article',
            slug: 'current-article',
            content: testContent,
            status: 'published',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        }
        return null
      }

      // Mock target articles
      db.execute = async (query: string) => {
        if (query.includes('SELECT * FROM articles') && query.includes('status = \'published\'')) {
          return [{
            id: 'target-article-id',
            site_id: 'test-site-id',
            title: 'Machine Learning Guide',
            slug: 'machine-learning-guide',
            meta_keywords: 'machine learning, AI',
            status: 'published',
            view_count: 100,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]
        }
        if (query.includes('SELECT t.*, COUNT(at.article_id)')) {
          return [{
            id: 'target-tag-id',
            site_id: 'test-site-id',
            name: 'Artificial Intelligence',
            slug: 'artificial-intelligence',
            article_count: 5,
            created_at: new Date().toISOString()
          }]
        }
        return []
      }

      db.executeRun = async () => ({ success: true, meta: { changes: 1 } })

      const result = await internalLinkService.processArticleLinks(
        'current-article-id',
        testContent
      )

      expect(result.content).toContain('<a href=')
      expect(result.addedLinks.length).toBeGreaterThan(0)
    })

    it('should generate breadcrumbs', () => {
      const testArticle: Article = {
        id: 'test-article-id',
        site_id: 'test-site-id',
        title: 'Test Article',
        slug: 'test-article',
        status: 'published',
        view_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const breadcrumbs = internalLinkService.generateBreadcrumbs(
        '/articles/test-article',
        { name: 'Test Site', domain: 'example.com' },
        testArticle
      )

      expect(breadcrumbs).toHaveLength(3)
      expect(breadcrumbs[0].name).toBe('Test Site')
      expect(breadcrumbs[0].url).toBe('/')
      expect(breadcrumbs[1].name).toBe('Articles')
      expect(breadcrumbs[1].url).toBe('/articles')
      expect(breadcrumbs[2].name).toBe('Test Article')
      expect(breadcrumbs[2].url).toBe('/articles/test-article')
    })
  })
})