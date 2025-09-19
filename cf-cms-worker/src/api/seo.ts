import { Hono } from 'hono'
import { DatabaseService } from '../utils/database'
import { SEOService } from '../services/seoService'
import { MetaTagService } from '../services/metaTagService'
import { SitemapService } from '../services/sitemapService'
import { InternalLinkService } from '../services/internalLinkService'
import { ArticleService } from '../services/articleService'
import { TagService } from '../services/tagService'
import { successResponse, errorResponse } from '../utils/response'
import { rateLimitMiddleware } from '../middleware/rateLimit'
import { tenantMiddleware } from '../middleware/tenant'
import { validateBody } from '../middleware/validation'
import {
  CreateSEOConfigInput,
  UpdateSEOConfigInput,
  CreateRedirectRuleInput,
  UpdateRedirectRuleInput,
  Article,
  Site,
  Tag,
  SEOConfig
} from '../models/types'

type Env = {
  DB: D1Database
  CACHE_KV: KVNamespace
}

export const seoRoutes = new Hono<{ Bindings: Env }>()

// Middleware
seoRoutes.use('*', rateLimitMiddleware)

// SEO Configuration Endpoints

// Get SEO configuration for a site
seoRoutes.get('/:siteId/config', tenantMiddleware, async (c) => {
  try {
    const siteId = c.req.param('siteId')
    const db = new DatabaseService(c.env.DB)
    const seoService = new SEOService(db)

    const config = await seoService.getSEOConfig(siteId)

    return successResponse(c, config)
  } catch (error) {
    return errorResponse(c, 'FETCH_ERROR', `Failed to fetch SEO config: ${error}`, 500)
  }
})

// Create SEO configuration
seoRoutes.post('/:siteId/config', tenantMiddleware, async (c) => {
  try {
    const siteId = c.req.param('siteId')
    const input: CreateSEOConfigInput = await c.req.json()
    input.site_id = siteId

    const db = new DatabaseService(c.env.DB)
    const seoService = new SEOService(db)

    const config = await seoService.createSEOConfig(input)

    return successResponse(c, config, 201)
  } catch (error) {
    return errorResponse(c, 'CREATE_ERROR', `Failed to create SEO config: ${error}`, 500)
  }
})

// Update SEO configuration
seoRoutes.put('/:siteId/config', tenantMiddleware, async (c) => {
  try {
    const siteId = c.req.param('siteId')
    const input: UpdateSEOConfigInput = await c.req.json()

    const db = new DatabaseService(c.env.DB)
    const seoService = new SEOService(db)

    const config = await seoService.updateSEOConfig(siteId, input)

    return successResponse(c, config)
  } catch (error) {
    return errorResponse(c, 'UPDATE_ERROR', `Failed to update SEO config: ${error}`, 500)
  }
})

// Delete SEO configuration
seoRoutes.delete('/:siteId/config', tenantMiddleware, async (c) => {
  try {
    const siteId = c.req.param('siteId')

    const db = new DatabaseService(c.env.DB)
    const seoService = new SEOService(db)

    await seoService.deleteSEOConfig(siteId)

    return successResponse(c, { message: 'SEO config deleted successfully' })
  } catch (error) {
    return errorResponse(c, 'DELETE_ERROR', `Failed to delete SEO config: ${error}`, 500)
  }
})

// Redirect Rules Endpoints

// Get redirect rules
seoRoutes.get('/:siteId/redirects', tenantMiddleware, async (c) => {
  try {
    const siteId = c.req.param('siteId')
    const db = new DatabaseService(c.env.DB)
    const seoService = new SEOService(db)

    const rules = await seoService.getRedirectRules(siteId)

    return successResponse(c, rules)
  } catch (error) {
    return errorResponse(c, 'FETCH_ERROR', `Failed to fetch redirect rules: ${error}`, 500)
  }
})

// Create redirect rule
seoRoutes.post('/:siteId/redirects', tenantMiddleware, async (c) => {
  try {
    const siteId = c.req.param('siteId')
    const input: CreateRedirectRuleInput = await c.req.json()
    input.site_id = siteId

    const db = new DatabaseService(c.env.DB)
    const seoService = new SEOService(db)

    const rule = await seoService.createRedirectRule(input)

    return successResponse(c, rule, 201)
  } catch (error) {
    return errorResponse(c, 'CREATE_ERROR', `Failed to create redirect rule: ${error}`, 500)
  }
})

// Update redirect rule
seoRoutes.put('/:siteId/redirects/:ruleId', tenantMiddleware, async (c) => {
  try {
    const ruleId = c.req.param('ruleId')
    const input: UpdateRedirectRuleInput = await c.req.json()

    const db = new DatabaseService(c.env.DB)
    const seoService = new SEOService(db)

    const rule = await seoService.updateRedirectRule(ruleId, input)

    return successResponse(c, rule)
  } catch (error) {
    return errorResponse(c, 'UPDATE_ERROR', `Failed to update redirect rule: ${error}`, 500)
  }
})

// Delete redirect rule
seoRoutes.delete('/:siteId/redirects/:ruleId', tenantMiddleware, async (c) => {
  try {
    const ruleId = c.req.param('ruleId')

    const db = new DatabaseService(c.env.DB)
    const seoService = new SEOService(db)

    await seoService.deleteRedirectRule(ruleId)

    return successResponse(c, { message: 'Redirect rule deleted successfully' })
  } catch (error) {
    return errorResponse(c, 'DELETE_ERROR', `Failed to delete redirect rule: ${error}`, 500)
  }
})

// Check redirect for a path
seoRoutes.get('/:siteId/redirects/check', tenantMiddleware, async (c) => {
  try {
    const siteId = c.req.param('siteId')
    const path = c.req.query('path')

    if (!path) {
      return errorResponse(c, 'VALIDATION_ERROR', 'Path parameter is required', 400)
    }

    const db = new DatabaseService(c.env.DB)
    const seoService = new SEOService(db)

    const result = await seoService.processRedirect(siteId, path)

    return successResponse(c, result)
  } catch (error) {
    return errorResponse(c, 'CHECK_ERROR', `Failed to check redirect: ${error}`, 500)
  }
})

// Meta Tags Endpoints

// Generate meta tags for article
seoRoutes.get('/:siteId/meta-tags/articles/:articleId', tenantMiddleware, async (c) => {
  try {
    const siteId = c.req.param('siteId')
    const articleId = c.req.param('articleId')
    const baseUrl = c.req.query('baseUrl')

    const db = new DatabaseService(c.env.DB)
    const articleService = new ArticleService(db)
    const metaTagService = new MetaTagService()
    const seoService = new SEOService(db)

    const article = await articleService.getArticle(articleId)
    if (!article || article.site_id !== siteId) {
      return errorResponse(c, 'NOT_FOUND', 'Article not found', 404)
    }

    const site = await db.executeOne<Site>('SELECT * FROM sites WHERE id = ?', [siteId])
    if (!site) {
      return errorResponse(c, 'NOT_FOUND', 'Site not found', 404)
    }

    const seoConfig = await seoService.getSEOConfig(siteId)
    const metaTags = metaTagService.generateArticleMetaTags(article, site, seoConfig, baseUrl)

    return successResponse(c, {
      metaTags,
      html: metaTagService.renderMetaTagsHtml(metaTags)
    })
  } catch (error) {
    return errorResponse(c, 'GENERATE_ERROR', `Failed to generate meta tags: ${error}`, 500)
  }
})

// Generate meta tags for tag page
seoRoutes.get('/:siteId/meta-tags/tags/:tagId', tenantMiddleware, async (c) => {
  try {
    const siteId = c.req.param('siteId')
    const tagId = c.req.param('tagId')
    const baseUrl = c.req.query('baseUrl')

    const db = new DatabaseService(c.env.DB)
    const tagService = new TagService(db)
    const metaTagService = new MetaTagService()
    const seoService = new SEOService(db)

    const tag = await tagService.getTag(tagId)
    if (!tag || tag.site_id !== siteId) {
      return errorResponse(c, 'NOT_FOUND', 'Tag not found', 404)
    }

    const site = await db.executeOne<Site>('SELECT * FROM sites WHERE id = ?', [siteId])
    if (!site) {
      return errorResponse(c, 'NOT_FOUND', 'Site not found', 404)
    }

    const seoConfig = await seoService.getSEOConfig(siteId)
    const articleCount = await tagService.getTagArticleCount(tagId)
    const metaTags = metaTagService.generateTagMetaTags(tag, site, seoConfig, baseUrl, articleCount)

    return successResponse(c, {
      metaTags,
      html: metaTagService.renderMetaTagsHtml(metaTags)
    })
  } catch (error) {
    return errorResponse(c, 'GENERATE_ERROR', `Failed to generate meta tags: ${error}`, 500)
  }
})

// Generate homepage meta tags
seoRoutes.get('/:siteId/meta-tags/homepage', tenantMiddleware, async (c) => {
  try {
    const siteId = c.req.param('siteId')
    const baseUrl = c.req.query('baseUrl')

    const db = new DatabaseService(c.env.DB)
    const metaTagService = new MetaTagService()
    const seoService = new SEOService(db)

    const site = await db.executeOne<Site>('SELECT * FROM sites WHERE id = ?', [siteId])
    if (!site) {
      return errorResponse(c, 'NOT_FOUND', 'Site not found', 404)
    }

    const seoConfig = await seoService.getSEOConfig(siteId)
    const metaTags = metaTagService.generateHomepageMetaTags(site, seoConfig, baseUrl)

    return successResponse(c, {
      metaTags,
      html: metaTagService.renderMetaTagsHtml(metaTags)
    })
  } catch (error) {
    return errorResponse(c, 'GENERATE_ERROR', `Failed to generate meta tags: ${error}`, 500)
  }
})

// Structured Data Endpoints

// Generate structured data for article
seoRoutes.get('/:siteId/structured-data/articles/:articleId', tenantMiddleware, async (c) => {
  try {
    const siteId = c.req.param('siteId')
    const articleId = c.req.param('articleId')
    const baseUrl = c.req.query('baseUrl')

    const db = new DatabaseService(c.env.DB)
    const articleService = new ArticleService(db)
    const metaTagService = new MetaTagService()
    const seoService = new SEOService(db)

    const article = await articleService.getArticle(articleId)
    if (!article || article.site_id !== siteId) {
      return errorResponse(c, 'NOT_FOUND', 'Article not found', 404)
    }

    const site = await db.executeOne<Site>('SELECT * FROM sites WHERE id = ?', [siteId])
    if (!site) {
      return errorResponse(c, 'NOT_FOUND', 'Site not found', 404)
    }

    const seoConfig = await seoService.getSEOConfig(siteId)
    const structuredData = metaTagService.generateArticleStructuredData(article, site, seoConfig, baseUrl)

    return successResponse(c, {
      structuredData,
      html: metaTagService.renderStructuredDataHtml(structuredData)
    })
  } catch (error) {
    return errorResponse(c, 'GENERATE_ERROR', `Failed to generate structured data: ${error}`, 500)
  }
})

// Generate structured data for website
seoRoutes.get('/:siteId/structured-data/website', tenantMiddleware, async (c) => {
  try {
    const siteId = c.req.param('siteId')
    const baseUrl = c.req.query('baseUrl')

    const db = new DatabaseService(c.env.DB)
    const metaTagService = new MetaTagService()
    const seoService = new SEOService(db)

    const site = await db.executeOne<Site>('SELECT * FROM sites WHERE id = ?', [siteId])
    if (!site) {
      return errorResponse(c, 'NOT_FOUND', 'Site not found', 404)
    }

    const seoConfig = await seoService.getSEOConfig(siteId)
    const structuredData = metaTagService.generateWebsiteStructuredData(site, seoConfig, baseUrl)

    return successResponse(c, {
      structuredData,
      html: metaTagService.renderStructuredDataHtml(structuredData)
    })
  } catch (error) {
    return errorResponse(c, 'GENERATE_ERROR', `Failed to generate structured data: ${error}`, 500)
  }
})

// Sitemap Endpoints

// Generate main sitemap
seoRoutes.get('/:siteId/sitemap', async (c) => {
  try {
    const siteId = c.req.param('siteId')
    const baseUrl = c.req.query('baseUrl')

    if (!baseUrl) {
      return errorResponse(c, 'VALIDATION_ERROR', 'baseUrl parameter is required', 400)
    }

    const db = new DatabaseService(c.env.DB)
    const sitemapService = new SitemapService(db)
    const seoService = new SEOService(db)

    const seoConfig = await seoService.getSEOConfig(siteId)
    const sitemap = await sitemapService.generateSitemap(siteId, baseUrl, seoConfig)

    c.header('Content-Type', 'application/xml')
    return c.text(sitemap)
  } catch (error) {
    return errorResponse(c, 'GENERATE_ERROR', `Failed to generate sitemap: ${error}`, 500)
  }
})

// Generate sitemap index
seoRoutes.get('/:siteId/sitemap-index', async (c) => {
  try {
    const siteId = c.req.param('siteId')
    const baseUrl = c.req.query('baseUrl')

    if (!baseUrl) {
      return errorResponse(c, 'VALIDATION_ERROR', 'baseUrl parameter is required', 400)
    }

    const db = new DatabaseService(c.env.DB)
    const sitemapService = new SitemapService(db)
    const seoService = new SEOService(db)

    const seoConfig = await seoService.getSEOConfig(siteId)
    const sitemapIndex = await sitemapService.generateSitemapIndex(siteId, baseUrl, seoConfig)

    c.header('Content-Type', 'application/xml')
    return c.text(sitemapIndex)
  } catch (error) {
    return errorResponse(c, 'GENERATE_ERROR', `Failed to generate sitemap index: ${error}`, 500)
  }
})

// Generate articles sitemap
seoRoutes.get('/:siteId/sitemap-articles', async (c) => {
  try {
    const siteId = c.req.param('siteId')
    const baseUrl = c.req.query('baseUrl')

    if (!baseUrl) {
      return errorResponse(c, 'VALIDATION_ERROR', 'baseUrl parameter is required', 400)
    }

    const db = new DatabaseService(c.env.DB)
    const sitemapService = new SitemapService(db)
    const seoService = new SEOService(db)

    const seoConfig = await seoService.getSEOConfig(siteId)
    const sitemap = await sitemapService.generateArticlesSitemap(siteId, baseUrl, seoConfig)

    c.header('Content-Type', 'application/xml')
    return c.text(sitemap)
  } catch (error) {
    return errorResponse(c, 'GENERATE_ERROR', `Failed to generate articles sitemap: ${error}`, 500)
  }
})

// Generate tags sitemap
seoRoutes.get('/:siteId/sitemap-tags', async (c) => {
  try {
    const siteId = c.req.param('siteId')
    const baseUrl = c.req.query('baseUrl')

    if (!baseUrl) {
      return errorResponse(c, 'VALIDATION_ERROR', 'baseUrl parameter is required', 400)
    }

    const db = new DatabaseService(c.env.DB)
    const sitemapService = new SitemapService(db)
    const seoService = new SEOService(db)

    const seoConfig = await seoService.getSEOConfig(siteId)
    const sitemap = await sitemapService.generateTagsSitemap(siteId, baseUrl, seoConfig)

    c.header('Content-Type', 'application/xml')
    return c.text(sitemap)
  } catch (error) {
    return errorResponse(c, 'GENERATE_ERROR', `Failed to generate tags sitemap: ${error}`, 500)
  }
})

// Generate images sitemap
seoRoutes.get('/:siteId/sitemap-images', async (c) => {
  try {
    const siteId = c.req.param('siteId')
    const baseUrl = c.req.query('baseUrl')

    if (!baseUrl) {
      return errorResponse(c, 'VALIDATION_ERROR', 'baseUrl parameter is required', 400)
    }

    const db = new DatabaseService(c.env.DB)
    const sitemapService = new SitemapService(db)
    const seoService = new SEOService(db)

    const seoConfig = await seoService.getSEOConfig(siteId)
    const sitemap = await sitemapService.generateImagesSitemap(siteId, baseUrl, seoConfig)

    c.header('Content-Type', 'application/xml')
    return c.text(sitemap)
  } catch (error) {
    return errorResponse(c, 'GENERATE_ERROR', `Failed to generate images sitemap: ${error}`, 500)
  }
})

// Generate news sitemap
seoRoutes.get('/:siteId/sitemap-news', async (c) => {
  try {
    const siteId = c.req.param('siteId')
    const baseUrl = c.req.query('baseUrl')

    if (!baseUrl) {
      return errorResponse(c, 'VALIDATION_ERROR', 'baseUrl parameter is required', 400)
    }

    const db = new DatabaseService(c.env.DB)
    const sitemapService = new SitemapService(db)
    const seoService = new SEOService(db)

    const seoConfig = await seoService.getSEOConfig(siteId)
    const sitemap = await sitemapService.generateNewsSitemap(siteId, baseUrl, seoConfig)

    c.header('Content-Type', 'application/xml')
    return c.text(sitemap)
  } catch (error) {
    return errorResponse(c, 'GENERATE_ERROR', `Failed to generate news sitemap: ${error}`, 500)
  }
})

// Validate sitemap
seoRoutes.get('/:siteId/sitemap/validate', tenantMiddleware, async (c) => {
  try {
    const siteId = c.req.param('siteId')
    const baseUrl = c.req.query('baseUrl')

    if (!baseUrl) {
      return errorResponse(c, 'VALIDATION_ERROR', 'baseUrl parameter is required', 400)
    }

    const db = new DatabaseService(c.env.DB)
    const sitemapService = new SitemapService(db)

    const validation = await sitemapService.validateSitemap(siteId, baseUrl)

    return successResponse(c, validation)
  } catch (error) {
    return errorResponse(c, 'VALIDATION_ERROR', `Failed to validate sitemap: ${error}`, 500)
  }
})

// Submit sitemap to search engines
seoRoutes.post('/:siteId/sitemap/submit', tenantMiddleware, async (c) => {
  try {
    const siteId = c.req.param('siteId')
    const { sitemapUrl } = await c.req.json()

    if (!sitemapUrl) {
      return errorResponse(c, 'VALIDATION_ERROR', 'sitemapUrl is required', 400)
    }

    const db = new DatabaseService(c.env.DB)
    const sitemapService = new SitemapService(db)

    const result = await sitemapService.submitSitemap(siteId, sitemapUrl)

    return successResponse(c, result)
  } catch (error) {
    return errorResponse(c, 'SUBMIT_ERROR', `Failed to submit sitemap: ${error}`, 500)
  }
})

// Internal Links Endpoints

// Process article internal links
seoRoutes.post('/:siteId/internal-links/articles/:articleId/process', tenantMiddleware, async (c) => {
  try {
    const siteId = c.req.param('siteId')
    const articleId = c.req.param('articleId')

    const db = new DatabaseService(c.env.DB)
    const articleService = new ArticleService(db)
    const internalLinkService = new InternalLinkService(db)
    const seoService = new SEOService(db)

    const article = await articleService.getArticle(articleId)
    if (!article || article.site_id !== siteId) {
      return errorResponse(c, 'NOT_FOUND', 'Article not found', 404)
    }

    const seoConfig = await seoService.getSEOConfig(siteId)
    const result = await internalLinkService.processArticleLinks(
      articleId,
      article.content || '',
      seoConfig
    )

    // Update article content with processed links
    await articleService.updateArticle(articleId, { content: result.content })

    return successResponse(c, {
      processedContent: result.content,
      addedLinks: result.addedLinks,
      linkCount: result.addedLinks.length
    })
  } catch (error) {
    return errorResponse(c, 'PROCESS_ERROR', `Failed to process internal links: ${error}`, 500)
  }
})

// Get internal links analytics
seoRoutes.get('/:siteId/internal-links/analytics', tenantMiddleware, async (c) => {
  try {
    const siteId = c.req.param('siteId')

    const db = new DatabaseService(c.env.DB)
    const internalLinkService = new InternalLinkService(db)

    const analytics = await internalLinkService.getInternalLinksAnalytics(siteId)

    return successResponse(c, analytics)
  } catch (error) {
    return errorResponse(c, 'ANALYTICS_ERROR', `Failed to get analytics: ${error}`, 500)
  }
})

// Get article internal links
seoRoutes.get('/:siteId/internal-links/articles/:articleId', tenantMiddleware, async (c) => {
  try {
    const articleId = c.req.param('articleId')

    const db = new DatabaseService(c.env.DB)
    const internalLinkService = new InternalLinkService(db)

    const links = await internalLinkService.getArticleInternalLinks(articleId)

    return successResponse(c, links)
  } catch (error) {
    return errorResponse(c, 'FETCH_ERROR', `Failed to get internal links: ${error}`, 500)
  }
})

// Get article backlinks
seoRoutes.get('/:siteId/internal-links/articles/:articleId/backlinks', tenantMiddleware, async (c) => {
  try {
    const articleId = c.req.param('articleId')

    const db = new DatabaseService(c.env.DB)
    const internalLinkService = new InternalLinkService(db)

    const backlinks = await internalLinkService.getArticleBacklinks(articleId)

    return successResponse(c, backlinks)
  } catch (error) {
    return errorResponse(c, 'FETCH_ERROR', `Failed to get backlinks: ${error}`, 500)
  }
})

// Track internal link click
seoRoutes.post('/:siteId/internal-links/:linkId/click', async (c) => {
  try {
    const linkId = c.req.param('linkId')

    const db = new DatabaseService(c.env.DB)
    const internalLinkService = new InternalLinkService(db)

    await internalLinkService.trackLinkClick(linkId)

    return successResponse(c, { message: 'Link click tracked' })
  } catch (error) {
    return errorResponse(c, 'TRACK_ERROR', `Failed to track link click: ${error}`, 500)
  }
})

// Find related articles
seoRoutes.get('/:siteId/internal-links/articles/:articleId/related', tenantMiddleware, async (c) => {
  try {
    const articleId = c.req.param('articleId')
    const limit = parseInt(c.req.query('limit') || '5')

    const db = new DatabaseService(c.env.DB)
    const internalLinkService = new InternalLinkService(db)

    const related = await internalLinkService.findRelatedArticles(articleId, { limit })

    return successResponse(c, related)
  } catch (error) {
    return errorResponse(c, 'FETCH_ERROR', `Failed to find related articles: ${error}`, 500)
  }
})

// SEO Analysis Endpoints

// Analyze article SEO
seoRoutes.get('/:siteId/analysis/articles/:articleId', tenantMiddleware, async (c) => {
  try {
    const siteId = c.req.param('siteId')
    const articleId = c.req.param('articleId')

    const db = new DatabaseService(c.env.DB)
    const articleService = new ArticleService(db)
    const seoService = new SEOService(db)

    const article = await articleService.getArticle(articleId)
    if (!article || article.site_id !== siteId) {
      return errorResponse(c, 'NOT_FOUND', 'Article not found', 404)
    }

    const seoConfig = await seoService.getSEOConfig(siteId)
    const analysis = await seoService.analyzeSEO(article, seoConfig)

    return successResponse(c, analysis)
  } catch (error) {
    return errorResponse(c, 'ANALYSIS_ERROR', `Failed to analyze SEO: ${error}`, 500)
  }
})

// Get robots.txt
seoRoutes.get('/:siteId/robots.txt', async (c) => {
  try {
    const siteId = c.req.param('siteId')
    const siteUrl = c.req.query('siteUrl')

    if (!siteUrl) {
      return errorResponse(c, 'VALIDATION_ERROR', 'siteUrl parameter is required', 400)
    }

    const db = new DatabaseService(c.env.DB)
    const seoService = new SEOService(db)

    const robotsTxt = await seoService.getRobotsTxt(siteId, siteUrl)

    c.header('Content-Type', 'text/plain')
    return c.text(robotsTxt)
  } catch (error) {
    return errorResponse(c, 'GENERATE_ERROR', `Failed to generate robots.txt: ${error}`, 500)
  }
})

// Generate breadcrumbs
seoRoutes.get('/:siteId/breadcrumbs', tenantMiddleware, async (c) => {
  try {
    const siteId = c.req.param('siteId')
    const currentPath = c.req.query('path') || '/'
    const articleId = c.req.query('articleId')
    const tagId = c.req.query('tagId')

    const db = new DatabaseService(c.env.DB)
    const internalLinkService = new InternalLinkService(db)

    const site = await db.executeOne<Site>('SELECT * FROM sites WHERE id = ?', [siteId])
    if (!site) {
      return errorResponse(c, 'NOT_FOUND', 'Site not found', 404)
    }

    let article: Article | undefined
    let tag: Tag | undefined

    if (articleId) {
      const articleService = new ArticleService(db)
      article = await articleService.getArticle(articleId) || undefined
    }

    if (tagId) {
      const tagService = new TagService(db)
      tag = await tagService.getTag(tagId) || undefined
    }

    const breadcrumbs = internalLinkService.generateBreadcrumbs(
      currentPath,
      { name: site.name, domain: site.domain },
      article,
      tag
    )

    return successResponse(c, breadcrumbs)
  } catch (error) {
    return errorResponse(c, 'GENERATE_ERROR', `Failed to generate breadcrumbs: ${error}`, 500)
  }
})