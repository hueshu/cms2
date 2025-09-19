import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import { tagsRoutes } from '../tags'
import type { Env } from '../../index'

// Mock dependencies
vi.mock('../services/tagService')
vi.mock('../../utils/database')
vi.mock('../../middleware/tenant', () => ({
  getCurrentSiteId: vi.fn().mockReturnValue('test-site-id'),
  validateSiteAccess: vi.fn().mockResolvedValue(true)
}))

// Mock TagService
const mockTagService = {
  createTag: vi.fn(),
  getTagById: vi.fn(),
  getTagBySlug: vi.fn(),
  searchTags: vi.fn(),
  updateTag: vi.fn(),
  deleteTag: vi.fn(),
  getTagCloud: vi.fn(),
  getTagSuggestions: vi.fn(),
  getPopularTags: vi.fn(),
  getTagStats: vi.fn(),
  getRelatedArticles: vi.fn()
}

// Mock DatabaseService and KVService constructors
vi.mock('../../services/tagService', () => ({
  TagService: vi.fn().mockImplementation(() => mockTagService)
}))

describe('Tags API', () => {
  let app: Hono<{ Bindings: Env }>

  const mockTag = {
    id: 'test-tag-id',
    site_id: 'test-site-id',
    name: 'Test Tag',
    slug: 'test-tag',
    description: 'A test tag',
    created_at: '2023-01-01T00:00:00.000Z'
  }

  const mockEnv = {
    DB: {} as any,
    KV: {} as any
  }

  beforeEach(() => {
    vi.clearAllMocks()

    app = new Hono<{ Bindings: Env }>()
    app.route('/tags', tagsRoutes)
  })

  describe('GET /tags/:siteId', () => {
    it('should return paginated tags', async () => {
      const mockResponse = {
        data: [mockTag],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      }

      mockTagService.searchTags.mockResolvedValue(mockResponse)

      const res = await app.request('/tags/test-site-id?page=1&limit=20', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }, mockEnv)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockResponse)
      expect(mockTagService.searchTags).toHaveBeenCalledWith(
        'test-site-id',
        expect.objectContaining({
          page: 1,
          limit: 20,
          withStats: false
        })
      )
    })

    it('should handle search parameters', async () => {
      const mockResponse = {
        data: [mockTag],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      }

      mockTagService.searchTags.mockResolvedValue(mockResponse)

      const res = await app.request('/tags/test-site-id?search=test&withStats=true', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }, mockEnv)

      expect(res.status).toBe(200)
      expect(mockTagService.searchTags).toHaveBeenCalledWith(
        'test-site-id',
        expect.objectContaining({
          search: 'test',
          withStats: true
        })
      )
    })

    it('should handle service errors', async () => {
      mockTagService.searchTags.mockRejectedValue(new Error('Database error'))

      const res = await app.request('/tags/test-site-id', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }, mockEnv)

      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toBe('Failed to fetch tags')
    })
  })

  describe('POST /tags/:siteId', () => {
    const createInput = {
      name: 'New Tag',
      description: 'A new tag'
    }

    it('should create tag successfully', async () => {
      mockTagService.createTag.mockResolvedValue(mockTag)

      const res = await app.request('/tags/test-site-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createInput)
      }, mockEnv)

      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockTag)
      expect(mockTagService.createTag).toHaveBeenCalledWith(
        createInput,
        'test-site-id'
      )
    })

    it('should handle validation errors', async () => {
      const invalidInput = {
        name: '', // Empty name should fail validation
        description: 'A new tag'
      }

      const res = await app.request('/tags/test-site-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidInput)
      }, mockEnv)

      expect(res.status).toBe(400)
    })

    it('should handle conflict errors', async () => {
      mockTagService.createTag.mockRejectedValue(new Error('Tag name or slug already exists in this site'))

      const res = await app.request('/tags/test-site-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createInput)
      }, mockEnv)

      expect(res.status).toBe(409)
      const data = await res.json()
      expect(data.error).toBe('Tag name or slug already exists in this site')
    })
  })

  describe('GET /tags/:siteId/:tagId', () => {
    it('should return tag by ID', async () => {
      mockTagService.getTagById.mockResolvedValue(mockTag)

      const res = await app.request('/tags/test-site-id/test-tag-id', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }, mockEnv)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockTag)
      expect(mockTagService.getTagById).toHaveBeenCalledWith(
        'test-tag-id',
        'test-site-id'
      )
    })

    it('should handle tag not found', async () => {
      mockTagService.getTagById.mockRejectedValue(new Error('Tag not found'))

      const res = await app.request('/tags/test-site-id/nonexistent', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }, mockEnv)

      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe('Tag not found')
    })
  })

  describe('PUT /tags/:siteId/:tagId', () => {
    const updateInput = {
      name: 'Updated Tag',
      description: 'Updated description'
    }

    it('should update tag successfully', async () => {
      const updatedTag = { ...mockTag, ...updateInput }
      mockTagService.updateTag.mockResolvedValue(updatedTag)

      const res = await app.request('/tags/test-site-id/test-tag-id', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateInput)
      }, mockEnv)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data).toEqual(updatedTag)
      expect(mockTagService.updateTag).toHaveBeenCalledWith(
        'test-tag-id',
        updateInput,
        'test-site-id'
      )
    })

    it('should handle tag not found during update', async () => {
      mockTagService.updateTag.mockRejectedValue(new Error('Tag not found'))

      const res = await app.request('/tags/test-site-id/nonexistent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateInput)
      }, mockEnv)

      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe('Tag not found')
    })
  })

  describe('DELETE /tags/:siteId/:tagId', () => {
    it('should delete tag successfully', async () => {
      mockTagService.deleteTag.mockResolvedValue(undefined)

      const res = await app.request('/tags/test-site-id/test-tag-id', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      }, mockEnv)

      expect(res.status).toBe(204)
      expect(mockTagService.deleteTag).toHaveBeenCalledWith(
        'test-tag-id',
        'test-site-id'
      )
    })

    it('should handle tag not found during deletion', async () => {
      mockTagService.deleteTag.mockRejectedValue(new Error('Tag not found'))

      const res = await app.request('/tags/test-site-id/nonexistent', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      }, mockEnv)

      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe('Tag not found')
    })
  })

  describe('GET /tags/:siteId/cloud', () => {
    it('should return tag cloud', async () => {
      const mockCloud = [
        { id: 'tag1', name: 'Tag 1', slug: 'tag-1', count: 10, weight: 1 },
        { id: 'tag2', name: 'Tag 2', slug: 'tag-2', count: 5, weight: 0.5 }
      ]

      mockTagService.getTagCloud.mockResolvedValue(mockCloud)

      const res = await app.request('/tags/test-site-id/cloud?limit=50', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }, mockEnv)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockCloud)
      expect(mockTagService.getTagCloud).toHaveBeenCalledWith(
        'test-site-id',
        50
      )
    })
  })

  describe('GET /tags/:siteId/suggestions', () => {
    it('should return tag suggestions', async () => {
      const mockSuggestions = [mockTag]
      mockTagService.getTagSuggestions.mockResolvedValue(mockSuggestions)

      const res = await app.request('/tags/test-site-id/suggestions?q=test&limit=10', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }, mockEnv)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockSuggestions)
      expect(mockTagService.getTagSuggestions).toHaveBeenCalledWith(
        'test-site-id',
        'test',
        10
      )
    })

    it('should require query parameter', async () => {
      const res = await app.request('/tags/test-site-id/suggestions', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }, mockEnv)

      expect(res.status).toBe(400)
    })
  })

  describe('GET /tags/:siteId/popular', () => {
    it('should return popular tags', async () => {
      const mockPopular = [
        { ...mockTag, article_count: 10, recent_articles: [] }
      ]

      mockTagService.getPopularTags.mockResolvedValue(mockPopular)

      const res = await app.request('/tags/test-site-id/popular?limit=10', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }, mockEnv)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockPopular)
      expect(mockTagService.getPopularTags).toHaveBeenCalledWith(
        'test-site-id',
        10
      )
    })
  })

  describe('GET /tags/:siteId/stats', () => {
    it('should return tag statistics', async () => {
      const mockStats = {
        total: 50,
        used: 35,
        unused: 15,
        avgArticlesPerTag: 3.2
      }

      mockTagService.getTagStats.mockResolvedValue(mockStats)

      const res = await app.request('/tags/test-site-id/stats', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }, mockEnv)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockStats)
      expect(mockTagService.getTagStats).toHaveBeenCalledWith('test-site-id')
    })
  })

  describe('GET /tags/:siteId/:tagId/related-articles', () => {
    it('should return related articles for a tag', async () => {
      const mockArticles = [
        {
          id: 'article1',
          title: 'Related Article 1',
          site_id: 'test-site-id',
          status: 'published',
          tags: []
        }
      ]

      mockTagService.getTagById.mockResolvedValue(mockTag)
      mockTagService.getRelatedArticles.mockResolvedValue(mockArticles)

      const res = await app.request('/tags/test-site-id/test-tag-id/related-articles?limit=5', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }, mockEnv)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockArticles)

      expect(mockTagService.getTagById).toHaveBeenCalledWith(
        'test-tag-id',
        'test-site-id'
      )
      expect(mockTagService.getRelatedArticles).toHaveBeenCalledWith(
        'test-tag-id',
        'test-site-id',
        expect.objectContaining({ limit: 5 })
      )
    })

    it('should handle tag not found for related articles', async () => {
      mockTagService.getTagById.mockRejectedValue(new Error('Tag not found'))

      const res = await app.request('/tags/test-site-id/nonexistent/related-articles', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }, mockEnv)

      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe('Tag not found')
    })
  })

  describe('Site Access Validation', () => {
    beforeEach(() => {
      // Reset the mock to simulate access denied
      const { validateSiteAccess } = require('../../middleware/tenant')
      validateSiteAccess.mockResolvedValue(false)
    })

    it('should deny access to tags when site access is denied', async () => {
      const res = await app.request('/tags/unauthorized-site-id', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }, mockEnv)

      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toBe('Access denied to this site')
    })

    it('should deny access to tag creation when site access is denied', async () => {
      const res = await app.request('/tags/unauthorized-site-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Tag',
          description: 'Test description'
        })
      }, mockEnv)

      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toBe('Access denied to this site')
    })
  })
})