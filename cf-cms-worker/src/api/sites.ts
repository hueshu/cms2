import { Hono } from 'hono'
import { successResponse, paginatedResponse, createdResponse } from '../utils/response'
import { validateBody, validateQuery, siteSchema, paginationSchema } from '../middleware/validation'
import type { Env } from '../index'

export const sitesRoutes = new Hono<{ Bindings: Env }>()

// Get all sites
sitesRoutes.get('/', validateQuery(paginationSchema), async (c) => {
  const query = c.get('validatedQuery')

  // TODO: Implement actual database query
  return paginatedResponse(c, [], 0, query.page, query.limit)
})

// Create new site
sitesRoutes.post('/', validateBody(siteSchema), async (c) => {
  const data = c.get('validatedData')

  // TODO: Implement site creation logic
  return createdResponse(c, {
    id: 'new-site-id',
    ...data,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }, '/api/v1/sites/new-site-id')
})

// Get site by ID
sitesRoutes.get('/:siteId', async (c) => {
  const siteId = c.req.param('siteId')

  // TODO: Implement fetch site logic
  return successResponse(c, {
    id: siteId,
    message: 'Site details'
  })
})

// Update site
sitesRoutes.put('/:siteId', async (c) => {
  const siteId = c.req.param('siteId')
  const body = await c.req.json()

  // TODO: Implement update logic
  return successResponse(c, {
    id: siteId,
    message: 'Site updated'
  })
})

// Delete site
sitesRoutes.delete('/:siteId', async (c) => {
  const siteId = c.req.param('siteId')

  // TODO: Implement delete logic
  return c.body(null, 204)
})