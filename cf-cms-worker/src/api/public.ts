import { Hono } from 'hono'
import { DatabaseService, KVService } from '../utils/database'
import { ArticleService } from '../services/articleService'
import { TagService } from '../services/tagService'
import { SiteService } from '../services/siteService'
import { successResponse, errorResponse, paginatedResponse } from '../utils/response'
import { getCurrentSite, getCurrentSiteId, isSiteNotFound } from '../middleware/domain'
import type { Env } from '../index'

/**
 * Public API routes that work based on domain
 * No authentication required, content is determined by the domain
 */
export const publicRoutes = new Hono<{ Bindings: Env }>()

// Get articles for current domain
publicRoutes.get('/articles', async (c) => {
  const site = getCurrentSite(c)

  if (!site) {
    return errorResponse(c, 'SITE_NOT_FOUND', 'No site configured for this domain', null, 404)
  }

  const query = c.req.query()
  const db = new DatabaseService(c.env.DB)
  const kv = new KVService(c.env.CACHE_KV)
  const articleService = new ArticleService(db, kv)

  try {
    const searchParams = {
      page: parseInt(query.page || '1'),
      limit: parseInt(query.limit || '10'),
      status: 'published', // Only show published articles in public API
      search: query.search,
      tags: query.tags?.split(','),
      sortBy: query.sortBy || 'published_at',
      sort: query.sort as 'asc' | 'desc' || 'desc'
    }

    const result = await articleService.searchArticles(site.id, searchParams)
    return paginatedResponse(c, result.data, result.total, result.page, result.limit)
  } catch (error) {
    return errorResponse(c, 'FETCH_ERROR', 'Failed to fetch articles', error)
  }
})

// Get article by slug for current domain
publicRoutes.get('/articles/:slug', async (c) => {
  const site = getCurrentSite(c)

  if (!site) {
    return errorResponse(c, 'SITE_NOT_FOUND', 'No site configured for this domain', null, 404)
  }

  const slug = c.req.param('slug')
  const db = new DatabaseService(c.env.DB)
  const kv = new KVService(c.env.CACHE_KV)
  const articleService = new ArticleService(db, kv)

  try {
    const article = await articleService.getArticleBySlug(slug, site.id)

    // Increment view count
    await articleService.incrementViewCount(article.id)

    return successResponse(c, article)
  } catch (error) {
    return errorResponse(c, 'NOT_FOUND', 'Article not found', null, 404)
  }
})

// Get tags for current domain
publicRoutes.get('/tags', async (c) => {
  const site = getCurrentSite(c)

  if (!site) {
    return errorResponse(c, 'SITE_NOT_FOUND', 'No site configured for this domain', null, 404)
  }

  const query = c.req.query()
  const db = new DatabaseService(c.env.DB)
  const kv = new KVService(c.env.CACHE_KV)
  const tagService = new TagService(db, kv)

  try {
    const params = {
      page: parseInt(query.page || '1'),
      limit: parseInt(query.limit || '20'),
      search: query.search
    }

    const result = await tagService.getTags(site.id, params)
    return paginatedResponse(c, result.data, result.total, result.page, result.limit)
  } catch (error) {
    return errorResponse(c, 'FETCH_ERROR', 'Failed to fetch tags', error)
  }
})

// Get tag cloud for current domain
publicRoutes.get('/tags/cloud', async (c) => {
  const site = getCurrentSite(c)

  if (!site) {
    return errorResponse(c, 'SITE_NOT_FOUND', 'No site configured for this domain', null, 404)
  }

  const db = new DatabaseService(c.env.DB)
  const kv = new KVService(c.env.CACHE_KV)
  const tagService = new TagService(db, kv)

  try {
    const limit = parseInt(c.req.query('limit') || '30')
    const tagCloud = await tagService.getTagCloud(site.id, limit)
    return successResponse(c, tagCloud)
  } catch (error) {
    return errorResponse(c, 'FETCH_ERROR', 'Failed to fetch tag cloud', error)
  }
})

// Get site info for current domain
publicRoutes.get('/site', async (c) => {
  const site = getCurrentSite(c)

  if (!site) {
    return errorResponse(c, 'SITE_NOT_FOUND', 'No site configured for this domain', null, 404)
  }

  // Return public site information
  return successResponse(c, {
    id: site.id,
    name: site.name,
    domain: site.domain,
    description: site.description,
    config: site.config
  })
})

// Search articles for current domain
publicRoutes.get('/search', async (c) => {
  const site = getCurrentSite(c)

  if (!site) {
    return errorResponse(c, 'SITE_NOT_FOUND', 'No site configured for this domain', null, 404)
  }

  const query = c.req.query()
  const db = new DatabaseService(c.env.DB)
  const kv = new KVService(c.env.CACHE_KV)
  const articleService = new ArticleService(db, kv)

  try {
    const searchParams = {
      page: parseInt(query.page || '1'),
      limit: parseInt(query.limit || '10'),
      status: 'published',
      search: query.q || query.search, // Support both 'q' and 'search' parameters
      sortBy: 'relevance' // Sort by relevance when searching
    }

    const result = await articleService.searchArticles(site.id, searchParams)
    return paginatedResponse(c, result.data, result.total, result.page, result.limit)
  } catch (error) {
    return errorResponse(c, 'SEARCH_ERROR', 'Search failed', error)
  }
})

// Get recent articles for current domain
publicRoutes.get('/recent', async (c) => {
  const site = getCurrentSite(c)

  if (!site) {
    return errorResponse(c, 'SITE_NOT_FOUND', 'No site configured for this domain', null, 404)
  }

  const limit = parseInt(c.req.query('limit') || '5')
  const db = new DatabaseService(c.env.DB)
  const kv = new KVService(c.env.CACHE_KV)
  const articleService = new ArticleService(db, kv)

  try {
    const result = await articleService.getRecentArticles(site.id, limit)
    return successResponse(c, result)
  } catch (error) {
    return errorResponse(c, 'FETCH_ERROR', 'Failed to fetch recent articles', error)
  }
})

// Get popular articles for current domain
publicRoutes.get('/popular', async (c) => {
  const site = getCurrentSite(c)

  if (!site) {
    return errorResponse(c, 'SITE_NOT_FOUND', 'No site configured for this domain', null, 404)
  }

  const limit = parseInt(c.req.query('limit') || '5')
  const db = new DatabaseService(c.env.DB)
  const kv = new KVService(c.env.CACHE_KV)
  const articleService = new ArticleService(db, kv)

  try {
    const result = await articleService.getPopularArticles(site.id, limit)
    return successResponse(c, result)
  } catch (error) {
    return errorResponse(c, 'FETCH_ERROR', 'Failed to fetch popular articles', error)
  }
})