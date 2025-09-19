import { Hono } from 'hono'
import { successResponse, paginatedResponse, createdResponse } from '../utils/response'
import { validateBody, validateQuery, articleSchema, paginationSchema } from '../middleware/validation'
import type { Env } from '../index'

export const articlesRoutes = new Hono<{ Bindings: Env }>()

// Get all articles for a site
articlesRoutes.get('/:siteId', validateQuery(paginationSchema), async (c) => {
  const siteId = c.req.param('siteId')
  const query = c.get('validatedQuery')

  // TODO: Implement actual database query
  return paginatedResponse(c, [], 0, query.page, query.limit)
})

// Create new article
articlesRoutes.post('/:siteId', validateBody(articleSchema), async (c) => {
  const siteId = c.req.param('siteId')
  const data = c.get('validatedData')

  // TODO: Implement article creation logic
  return createdResponse(c, {
    id: 'new-article-id',
    site_id: siteId,
    ...data,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }, `/api/v1/articles/${siteId}/new-article-id`)
})

// Get article by ID
articlesRoutes.get('/:siteId/:articleId', async (c) => {
  const siteId = c.req.param('siteId')
  const articleId = c.req.param('articleId')

  // TODO: Implement fetch article logic
  return successResponse(c, {
    id: articleId,
    site_id: siteId,
    message: 'Article details'
  })
})

// Update article
articlesRoutes.put('/:siteId/:articleId', async (c) => {
  const siteId = c.req.param('siteId')
  const articleId = c.req.param('articleId')
  const body = await c.req.json()

  // TODO: Implement update logic
  return successResponse(c, {
    id: articleId,
    site_id: siteId,
    message: 'Article updated'
  })
})

// Delete article
articlesRoutes.delete('/:siteId/:articleId', async (c) => {
  const siteId = c.req.param('siteId')
  const articleId = c.req.param('articleId')

  // TODO: Implement delete logic
  return c.body(null, 204)
})