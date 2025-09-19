import { Hono } from 'hono'
import { successResponse, paginatedResponse, createdResponse } from '../utils/response'
import {
  validateBody,
  validateQuery,
  tagSchema,
  paginationSchema,
  idParamSchema,
  siteIdParamSchema
} from '../middleware/validation'
import { getCurrentSiteId, validateSiteAccess } from '../middleware/tenant'
import { TagService } from '../services/tagService'
import { DatabaseService, KVService } from '../utils/database'
import type { Env } from '../index'
import { z } from 'zod'

export const tagsRoutes = new Hono<{ Bindings: Env }>()

// Tag search query schema
const tagSearchSchema = paginationSchema.extend({
  search: z.string().optional(),
  withStats: z.coerce.boolean().optional().default(false)
})

// Tag suggestions query schema
const suggestionsSchema = z.object({
  q: z.string().min(1, 'Query parameter required'),
  limit: z.coerce.number().min(1).max(50).optional().default(10)
})

// Tag cloud query schema
const tagCloudSchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50)
})

// Related articles query schema
const relatedArticlesSchema = z.object({
  excludeId: z.string().optional(),
  limit: z.coerce.number().min(1).max(20).optional().default(5),
  minCommonTags: z.coerce.number().min(1).optional().default(1)
})

// Initialize services
function getServices(c: any) {
  const db = new DatabaseService(c.env.DB)
  const kv = new KVService(c.env.KV)
  return new TagService(db, kv)
}

// Get all tags for a site with optional search and stats
tagsRoutes.get('/:siteId', validateQuery(tagSearchSchema), async (c) => {
  const siteId = c.req.param('siteId')
  const currentSiteId = getCurrentSiteId(c)

  // 验证站点访问权限
  if (!await validateSiteAccess(c, siteId)) {
    return c.json({ error: 'Access denied to this site' }, 403)
  }

  const tagService = getServices(c)
  const query = c.get('validatedQuery')

  try {
    const result = await tagService.searchTags(currentSiteId, query)
    return paginatedResponse(c, result)
  } catch (error) {
    console.error('Error fetching tags:', error)
    return c.json({ error: 'Failed to fetch tags' }, 500)
  }
})

// Create new tag
tagsRoutes.post('/:siteId', validateBody(tagSchema), async (c) => {
  const siteId = c.req.param('siteId')
  const currentSiteId = getCurrentSiteId(c)
  const data = c.get('validatedData')

  // 验证站点访问权限
  if (!await validateSiteAccess(c, siteId)) {
    return c.json({ error: 'Access denied to this site' }, 403)
  }

  const tagService = getServices(c)

  try {
    const tag = await tagService.createTag(data, currentSiteId)
    return createdResponse(c, tag, `/api/v1/tags/${currentSiteId}/${tag.id}`)
  } catch (error) {
    console.error('Error creating tag:', error)
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to create tag'
    }, error instanceof Error && error.message.includes('conflict') ? 409 : 500)
  }
})

// Get tag by ID
tagsRoutes.get('/:siteId/:tagId', async (c) => {
  const siteId = c.req.param('siteId')
  const tagId = c.req.param('tagId')
  const currentSiteId = getCurrentSiteId(c)

  // 验证站点访问权限
  if (!await validateSiteAccess(c, siteId)) {
    return c.json({ error: 'Access denied to this site' }, 403)
  }

  const tagService = getServices(c)

  try {
    const tag = await tagService.getTagById(tagId, currentSiteId)
    return successResponse(c, tag)
  } catch (error) {
    console.error('Error fetching tag:', error)
    if (error instanceof Error && error.message.includes('not found')) {
      return c.json({ error: 'Tag not found' }, 404)
    }
    return c.json({ error: 'Failed to fetch tag' }, 500)
  }
})

// Update tag
tagsRoutes.put('/:siteId/:tagId', validateBody(tagSchema.partial()), async (c) => {
  const siteId = c.req.param('siteId')
  const tagId = c.req.param('tagId')
  const currentSiteId = getCurrentSiteId(c)
  const data = c.get('validatedData')

  // 验证站点访问权限
  if (!await validateSiteAccess(c, siteId)) {
    return c.json({ error: 'Access denied to this site' }, 403)
  }

  const tagService = getServices(c)

  try {
    const tag = await tagService.updateTag(tagId, data, currentSiteId)
    return successResponse(c, tag)
  } catch (error) {
    console.error('Error updating tag:', error)
    if (error instanceof Error && error.message.includes('not found')) {
      return c.json({ error: 'Tag not found' }, 404)
    }
    if (error instanceof Error && error.message.includes('conflict')) {
      return c.json({ error: error.message }, 409)
    }
    return c.json({ error: 'Failed to update tag' }, 500)
  }
})

// Delete tag
tagsRoutes.delete('/:siteId/:tagId', async (c) => {
  const siteId = c.req.param('siteId')
  const tagId = c.req.param('tagId')
  const currentSiteId = getCurrentSiteId(c)

  // 验证站点访问权限
  if (!await validateSiteAccess(c, siteId)) {
    return c.json({ error: 'Access denied to this site' }, 403)
  }

  const tagService = getServices(c)

  try {
    await tagService.deleteTag(tagId, currentSiteId)
    return c.body(null, 204)
  } catch (error) {
    console.error('Error deleting tag:', error)
    if (error instanceof Error && error.message.includes('not found')) {
      return c.json({ error: 'Tag not found' }, 404)
    }
    return c.json({ error: 'Failed to delete tag' }, 500)
  }
})

// Get tag cloud
tagsRoutes.get('/:siteId/cloud', validateQuery(tagCloudSchema), async (c) => {
  const siteId = c.req.param('siteId')
  const currentSiteId = getCurrentSiteId(c)
  const { limit } = c.get('validatedQuery')

  // 验证站点访问权限
  if (!await validateSiteAccess(c, siteId)) {
    return c.json({ error: 'Access denied to this site' }, 403)
  }

  const tagService = getServices(c)

  try {
    const cloud = await tagService.getTagCloud(currentSiteId, limit)
    return successResponse(c, cloud)
  } catch (error) {
    console.error('Error fetching tag cloud:', error)
    return c.json({ error: 'Failed to fetch tag cloud' }, 500)
  }
})

// Get tag suggestions (autocomplete)
tagsRoutes.get('/:siteId/suggestions', validateQuery(suggestionsSchema), async (c) => {
  const siteId = c.req.param('siteId')
  const currentSiteId = getCurrentSiteId(c)
  const { q, limit } = c.get('validatedQuery')

  // 验证站点访问权限
  if (!await validateSiteAccess(c, siteId)) {
    return c.json({ error: 'Access denied to this site' }, 403)
  }

  const tagService = getServices(c)

  try {
    const suggestions = await tagService.getTagSuggestions(currentSiteId, q, limit)
    return successResponse(c, suggestions)
  } catch (error) {
    console.error('Error fetching tag suggestions:', error)
    return c.json({ error: 'Failed to fetch tag suggestions' }, 500)
  }
})

// Get popular tags
tagsRoutes.get('/:siteId/popular', validateQuery(tagCloudSchema), async (c) => {
  const siteId = c.req.param('siteId')
  const currentSiteId = getCurrentSiteId(c)
  const { limit } = c.get('validatedQuery')

  // 验证站点访问权限
  if (!await validateSiteAccess(c, siteId)) {
    return c.json({ error: 'Access denied to this site' }, 403)
  }

  const tagService = getServices(c)

  try {
    const tags = await tagService.getPopularTags(currentSiteId, limit)
    return successResponse(c, tags)
  } catch (error) {
    console.error('Error fetching popular tags:', error)
    return c.json({ error: 'Failed to fetch popular tags' }, 500)
  }
})

// Get tag statistics
tagsRoutes.get('/:siteId/stats', async (c) => {
  const siteId = c.req.param('siteId')
  const currentSiteId = getCurrentSiteId(c)

  // 验证站点访问权限
  if (!await validateSiteAccess(c, siteId)) {
    return c.json({ error: 'Access denied to this site' }, 403)
  }

  const tagService = getServices(c)

  try {
    const stats = await tagService.getTagStats(currentSiteId)
    return successResponse(c, stats)
  } catch (error) {
    console.error('Error fetching tag stats:', error)
    return c.json({ error: 'Failed to fetch tag statistics' }, 500)
  }
})

// Get related articles for a tag
tagsRoutes.get('/:siteId/:tagId/related-articles', validateQuery(relatedArticlesSchema), async (c) => {
  const siteId = c.req.param('siteId')
  const tagId = c.req.param('tagId')
  const currentSiteId = getCurrentSiteId(c)
  const params = c.get('validatedQuery')

  // 验证站点访问权限
  if (!await validateSiteAccess(c, siteId)) {
    return c.json({ error: 'Access denied to this site' }, 403)
  }

  const tagService = getServices(c)

  try {
    // First get the tag to ensure it exists
    await tagService.getTagById(tagId, currentSiteId)

    // Get related articles using any article from this tag
    const articles = await tagService.getRelatedArticles(tagId, currentSiteId, params)
    return successResponse(c, articles)
  } catch (error) {
    console.error('Error fetching related articles:', error)
    if (error instanceof Error && error.message.includes('not found')) {
      return c.json({ error: 'Tag not found' }, 404)
    }
    return c.json({ error: 'Failed to fetch related articles' }, 500)
  }
})