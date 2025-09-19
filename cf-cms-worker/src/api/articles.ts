import { Hono } from 'hono'
import { successResponse, paginatedResponse, createdResponse, noContentResponse } from '../utils/response'
import {
  validateBody,
  validateQuery,
  articleSchema,
  updateArticleSchema,
  articleSearchSchema,
  contentValidationMiddleware
} from '../middleware/validation'
import { tenantMiddleware, getCurrentSiteId } from '../middleware/tenant'
import { ArticleService } from '../services/articleService'
import { DatabaseService, KVService } from '../utils/database'
import type { Env } from '../index'

export const articlesRoutes = new Hono<{ Bindings: Env }>()

// Apply tenant middleware to all routes
articlesRoutes.use('/:siteId/*', tenantMiddleware)

// Get all articles for a site with search and filtering
articlesRoutes.get('/:siteId', validateQuery(articleSearchSchema), async (c) => {
  const siteId = getCurrentSiteId(c)
  const query = c.get('validatedQuery')

  const dbService = c.get('dbService') as DatabaseService
  const kvService = c.get('kvService') as KVService
  const articleService = new ArticleService(dbService, kvService)

  const result = await articleService.searchArticles(siteId, query)
  return paginatedResponse(c, result.data, result.total, result.page, result.limit)
})

// Create new article
articlesRoutes.post(
  '/:siteId',
  contentValidationMiddleware,
  validateBody(articleSchema),
  async (c) => {
    const siteId = getCurrentSiteId(c)
    const data = c.get('validatedData')

    const dbService = c.get('dbService') as DatabaseService
    const kvService = c.get('kvService') as KVService
    const articleService = new ArticleService(dbService, kvService)

    const article = await articleService.createArticle({
      ...data,
      site_id: siteId
    })

    return createdResponse(
      c,
      article,
      `/api/v1/articles/${siteId}/${article.id}`
    )
  }
)

// Get article by ID
articlesRoutes.get('/:siteId/:articleId', async (c) => {
  const siteId = getCurrentSiteId(c)
  const articleId = c.req.param('articleId')

  const dbService = c.get('dbService') as DatabaseService
  const kvService = c.get('kvService') as KVService
  const articleService = new ArticleService(dbService, kvService)

  const article = await articleService.getArticleById(articleId, siteId)
  return successResponse(c, article)
})

// Get article by slug
articlesRoutes.get('/:siteId/slug/:slug', async (c) => {
  const siteId = getCurrentSiteId(c)
  const slug = c.req.param('slug')

  const dbService = c.get('dbService') as DatabaseService
  const kvService = c.get('kvService') as KVService
  const articleService = new ArticleService(dbService, kvService)

  const article = await articleService.getArticleBySlug(slug, siteId)

  // Increment view count for published articles
  if (article.status === 'published') {
    await articleService.incrementViewCount(article.id)
  }

  return successResponse(c, article)
})

// Update article
articlesRoutes.put(
  '/:siteId/:articleId',
  contentValidationMiddleware,
  validateBody(updateArticleSchema),
  async (c) => {
    const siteId = getCurrentSiteId(c)
    const articleId = c.req.param('articleId')
    const data = c.get('validatedData')

    const dbService = c.get('dbService') as DatabaseService
    const kvService = c.get('kvService') as KVService
    const articleService = new ArticleService(dbService, kvService)

    const article = await articleService.updateArticle(articleId, data, siteId)
    return successResponse(c, article)
  }
)

// Delete article (soft delete)
articlesRoutes.delete('/:siteId/:articleId', async (c) => {
  const siteId = getCurrentSiteId(c)
  const articleId = c.req.param('articleId')

  const dbService = c.get('dbService') as DatabaseService
  const kvService = c.get('kvService') as KVService
  const articleService = new ArticleService(dbService, kvService)

  await articleService.deleteArticle(articleId, siteId)
  return noContentResponse(c)
})

// Get articles by tag
articlesRoutes.get('/:siteId/tag/:tagSlug', validateQuery(articleSearchSchema), async (c) => {
  const siteId = getCurrentSiteId(c)
  const tagSlug = c.req.param('tagSlug')
  const query = c.get('validatedQuery')

  const dbService = c.get('dbService') as DatabaseService
  const kvService = c.get('kvService') as KVService
  const articleService = new ArticleService(dbService, kvService)

  const result = await articleService.getArticlesByTag(tagSlug, siteId, query)
  return paginatedResponse(c, result.data, result.total, result.page, result.limit)
})

// Get published articles (public endpoint)
articlesRoutes.get('/:siteId/published', validateQuery(articleSearchSchema), async (c) => {
  const siteId = getCurrentSiteId(c)
  const query = c.get('validatedQuery')

  const dbService = c.get('dbService') as DatabaseService
  const kvService = c.get('kvService') as KVService
  const articleService = new ArticleService(dbService, kvService)

  const result = await articleService.getPublishedArticles(siteId, query)
  return paginatedResponse(c, result.data, result.total, result.page, result.limit)
})

// Get recent articles
articlesRoutes.get('/:siteId/recent/:limit?', async (c) => {
  const siteId = getCurrentSiteId(c)
  const limit = parseInt(c.req.param('limit') || '5')

  if (limit > 20) {
    return c.json({ error: 'Limit cannot exceed 20' }, 400)
  }

  const dbService = c.get('dbService') as DatabaseService
  const kvService = c.get('kvService') as KVService
  const articleService = new ArticleService(dbService, kvService)

  const articles = await articleService.getRecentArticles(siteId, limit)
  return successResponse(c, articles)
})

// Get popular articles
articlesRoutes.get('/:siteId/popular/:limit?', async (c) => {
  const siteId = getCurrentSiteId(c)
  const limit = parseInt(c.req.param('limit') || '5')

  if (limit > 20) {
    return c.json({ error: 'Limit cannot exceed 20' }, 400)
  }

  const dbService = c.get('dbService') as DatabaseService
  const kvService = c.get('kvService') as KVService
  const articleService = new ArticleService(dbService, kvService)

  const articles = await articleService.getPopularArticles(siteId, limit)
  return successResponse(c, articles)
})