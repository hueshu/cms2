import { Hono } from 'hono'
import { successResponse, paginatedResponse, createdResponse, noContentResponse } from '../utils/response'
import { validateBody, validateQuery, siteSchema, paginationSchema } from '../middleware/validation'
import { DatabaseService, KVService } from '../utils/database'
import { SiteService } from '../services/siteService'
import type { Env } from '../index'
import type { CreateSiteInput, UpdateSiteInput } from '../models/types'

export const sitesRoutes = new Hono<{ Bindings: Env }>()

// Get all sites
sitesRoutes.get('/', validateQuery(paginationSchema), async (c) => {
  const query = c.get('validatedQuery')

  const db = new DatabaseService(c.env.DB)
  const kv = new KVService(c.env.CACHE_KV)
  const siteService = new SiteService(db, kv)

  const result = await siteService.getSites(query)
  return paginatedResponse(c, result.data, result.total, result.page, result.limit)
})

// Create new site
sitesRoutes.post('/', validateBody(siteSchema), async (c) => {
  const data = c.get('validatedData') as CreateSiteInput

  const db = new DatabaseService(c.env.DB)
  const kv = new KVService(c.env.CACHE_KV)
  const siteService = new SiteService(db, kv)

  const site = await siteService.createSite(data)
  return createdResponse(c, site, `/api/v1/sites/${site.id}`)
})

// Get site by ID
sitesRoutes.get('/:siteId', async (c) => {
  const siteId = c.req.param('siteId')

  const db = new DatabaseService(c.env.DB)
  const kv = new KVService(c.env.CACHE_KV)
  const siteService = new SiteService(db, kv)

  const site = await siteService.getSiteById(siteId)
  return successResponse(c, site)
})

// Update site
sitesRoutes.put('/:siteId', validateBody(siteSchema.partial()), async (c) => {
  const siteId = c.req.param('siteId')
  const data = c.get('validatedData') as UpdateSiteInput

  const db = new DatabaseService(c.env.DB)
  const kv = new KVService(c.env.CACHE_KV)
  const siteService = new SiteService(db, kv)

  const site = await siteService.updateSite(siteId, data)
  return successResponse(c, site)
})

// Delete site
sitesRoutes.delete('/:siteId', async (c) => {
  const siteId = c.req.param('siteId')

  const db = new DatabaseService(c.env.DB)
  const kv = new KVService(c.env.CACHE_KV)
  const siteService = new SiteService(db, kv)

  await siteService.deleteSite(siteId)
  return noContentResponse(c)
})