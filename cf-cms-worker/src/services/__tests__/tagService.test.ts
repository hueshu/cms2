import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TagService } from '../tagService'
import { DatabaseService, KVService } from '../../utils/database'
import { notFoundError, conflictError } from '../../middleware/error'
import type { Tag, CreateTagInput, UpdateTagInput } from '../../models/types'

// Mock the database and KV services
vi.mock('../../utils/database')

describe('TagService', () => {
  let tagService: TagService
  let mockDb: DatabaseService
  let mockKv: KVService

  const mockSiteId = 'test-site-id'
  const mockTagId = 'test-tag-id'
  const mockTag: Tag = {
    id: mockTagId,
    site_id: mockSiteId,
    name: 'Test Tag',
    slug: 'test-tag',
    description: 'A test tag',
    created_at: '2023-01-01T00:00:00.000Z'
  }

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Create mock instances
    mockDb = {
      generateId: vi.fn().mockReturnValue(mockTagId),
      generateSlug: vi.fn().mockImplementation((text: string) => text.toLowerCase().replace(/\s+/g, '-')),
      execute: vi.fn(),
      executeOne: vi.fn(),
      executeRun: vi.fn(),
      batch: vi.fn(),
      initializeDatabase: vi.fn()
    } as any

    mockKv = {
      cacheKey: vi.fn().mockImplementation((...parts: string[]) => parts.join(':')),
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
      cache: vi.fn(),
      invalidate: vi.fn()
    } as any

    tagService = new TagService(mockDb, mockKv)
  })

  describe('generateUniqueSlug', () => {
    it('should return base slug when no conflict exists', async () => {
      mockDb.executeOne = vi.fn().mockResolvedValue(null)

      const result = await tagService.generateUniqueSlug('Test Tag', mockSiteId)

      expect(result).toBe('test-tag')
      expect(mockDb.executeOne).toHaveBeenCalledWith(
        'SELECT id FROM tags WHERE site_id = ? AND slug = ? AND id != ?',
        [mockSiteId, 'test-tag', '']
      )
    })

    it('should append counter when conflict exists', async () => {
      mockDb.executeOne = vi.fn()
        .mockResolvedValueOnce({ id: 'existing-id' }) // First call finds conflict
        .mockResolvedValueOnce(null) // Second call finds no conflict

      const result = await tagService.generateUniqueSlug('Test Tag', mockSiteId)

      expect(result).toBe('test-tag-1')
      expect(mockDb.executeOne).toHaveBeenCalledTimes(2)
    })

    it('should exclude specific ID when provided', async () => {
      mockDb.executeOne = vi.fn().mockResolvedValue(null)

      await tagService.generateUniqueSlug('Test Tag', mockSiteId, 'exclude-id')

      expect(mockDb.executeOne).toHaveBeenCalledWith(
        'SELECT id FROM tags WHERE site_id = ? AND slug = ? AND id != ?',
        [mockSiteId, 'test-tag', 'exclude-id']
      )
    })
  })

  describe('createTag', () => {
    const createInput: CreateTagInput = {
      name: 'Test Tag',
      description: 'A test tag'
    }

    it('should create tag successfully', async () => {
      mockDb.executeOne = vi.fn()
        .mockResolvedValueOnce({ id: mockSiteId }) // Site exists
        .mockResolvedValueOnce(null) // No slug conflict

      mockDb.executeRun = vi.fn().mockResolvedValue({ success: true })
      mockKv.set = vi.fn().mockResolvedValue(undefined)

      const result = await tagService.createTag(createInput, mockSiteId)

      expect(result).toMatchObject({
        id: mockTagId,
        site_id: mockSiteId,
        name: 'Test Tag',
        slug: 'test-tag',
        description: 'A test tag'
      })

      expect(mockDb.executeRun).toHaveBeenCalledWith(
        'INSERT INTO tags (id, site_id, name, slug, description, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        expect.arrayContaining([mockTagId, mockSiteId, 'Test Tag', 'test-tag', 'A test tag'])
      )

      expect(mockKv.set).toHaveBeenCalledWith(
        'tag:test-tag-id',
        expect.any(Object),
        { expirationTtl: 3600 }
      )
    })

    it('should use provided slug when given', async () => {
      const inputWithSlug = { ...createInput, slug: 'custom-slug' }

      mockDb.executeOne = vi.fn()
        .mockResolvedValueOnce({ id: mockSiteId }) // Site exists
        .mockResolvedValueOnce(null) // No slug conflict

      mockDb.executeRun = vi.fn().mockResolvedValue({ success: true })
      mockKv.set = vi.fn().mockResolvedValue(undefined)

      const result = await tagService.createTag(inputWithSlug, mockSiteId)

      expect(result.slug).toBe('custom-slug')
    })

    it('should throw error when site does not exist', async () => {
      mockDb.executeOne = vi.fn().mockResolvedValue(null) // Site not found

      await expect(tagService.createTag(createInput, mockSiteId))
        .rejects.toThrow('Site not found')
    })

    it('should handle unique constraint violation', async () => {
      mockDb.executeOne = vi.fn()
        .mockResolvedValueOnce({ id: mockSiteId }) // Site exists
        .mockResolvedValueOnce(null) // No slug conflict

      const uniqueError = new Error('UNIQUE constraint failed')
      mockDb.executeRun = vi.fn().mockRejectedValue(uniqueError)

      await expect(tagService.createTag(createInput, mockSiteId))
        .rejects.toThrow('Tag name or slug already exists in this site')
    })
  })

  describe('getTagById', () => {
    it('should return cached tag when available', async () => {
      mockKv.get = vi.fn().mockResolvedValue(mockTag)

      const result = await tagService.getTagById(mockTagId, mockSiteId)

      expect(result).toEqual(mockTag)
      expect(mockKv.get).toHaveBeenCalledWith('tag:test-tag-id')
      expect(mockDb.executeOne).not.toHaveBeenCalled()
    })

    it('should fetch from database when not cached', async () => {
      mockKv.get = vi.fn().mockResolvedValue(null)
      mockDb.executeOne = vi.fn().mockResolvedValue(mockTag)
      mockKv.set = vi.fn().mockResolvedValue(undefined)

      const result = await tagService.getTagById(mockTagId, mockSiteId)

      expect(result).toEqual(mockTag)
      expect(mockDb.executeOne).toHaveBeenCalledWith(
        'SELECT * FROM tags WHERE id = ? AND site_id = ?',
        [mockTagId, mockSiteId]
      )
      expect(mockKv.set).toHaveBeenCalled()
    })

    it('should throw error when tag not found', async () => {
      mockKv.get = vi.fn().mockResolvedValue(null)
      mockDb.executeOne = vi.fn().mockResolvedValue(null)

      await expect(tagService.getTagById(mockTagId, mockSiteId))
        .rejects.toThrow('Tag not found')
    })

    it('should work without site filter', async () => {
      mockKv.get = vi.fn().mockResolvedValue(null)
      mockDb.executeOne = vi.fn().mockResolvedValue(mockTag)
      mockKv.set = vi.fn().mockResolvedValue(undefined)

      await tagService.getTagById(mockTagId)

      expect(mockDb.executeOne).toHaveBeenCalledWith(
        'SELECT * FROM tags WHERE id = ?',
        [mockTagId]
      )
    })
  })

  describe('getTagBySlug', () => {
    it('should return tag when found', async () => {
      mockDb.executeOne = vi.fn().mockResolvedValue(mockTag)

      const result = await tagService.getTagBySlug('test-tag', mockSiteId)

      expect(result).toEqual(mockTag)
      expect(mockDb.executeOne).toHaveBeenCalledWith(
        'SELECT * FROM tags WHERE slug = ? AND site_id = ?',
        ['test-tag', mockSiteId]
      )
    })

    it('should throw error when tag not found', async () => {
      mockDb.executeOne = vi.fn().mockResolvedValue(null)

      await expect(tagService.getTagBySlug('nonexistent', mockSiteId))
        .rejects.toThrow('Tag with slug not found')
    })
  })

  describe('searchTags', () => {
    const mockTags = [
      { ...mockTag, article_count: 5 },
      { ...mockTag, id: 'tag-2', name: 'Another Tag', slug: 'another-tag', article_count: 3 }
    ]

    it('should search tags with basic parameters', async () => {
      mockDb.executeOne = vi.fn().mockResolvedValue({ count: 2 })
      mockDb.execute = vi.fn().mockResolvedValue(mockTags)

      const result = await tagService.searchTags(mockSiteId, {
        page: 1,
        limit: 10,
        withStats: true
      })

      expect(result).toEqual({
        data: mockTags,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1
      })
    })

    it('should apply search filter', async () => {
      mockDb.executeOne = vi.fn().mockResolvedValue({ count: 1 })
      mockDb.execute = vi.fn().mockResolvedValue([mockTags[0]])

      await tagService.searchTags(mockSiteId, {
        search: 'test',
        withStats: true
      })

      expect(mockDb.executeOne).toHaveBeenCalledWith(
        expect.stringContaining('(t.name LIKE ? OR t.description LIKE ?)'),
        expect.arrayContaining([mockSiteId, '%test%', '%test%'])
      )
    })

    it('should work without stats', async () => {
      const tagsWithoutStats = mockTags.map(tag => ({ ...tag, article_count: 0 }))

      mockDb.executeOne = vi.fn().mockResolvedValue({ count: 2 })
      mockDb.execute = vi.fn().mockResolvedValue(mockTags.map(({ article_count, ...tag }) => tag))

      const result = await tagService.searchTags(mockSiteId, {
        withStats: false
      })

      expect(result.data).toEqual(tagsWithoutStats)
    })
  })

  describe('updateTag', () => {
    const updateInput: UpdateTagInput = {
      name: 'Updated Tag',
      description: 'Updated description'
    }

    it('should update tag successfully', async () => {
      // Mock getting existing tag
      mockKv.get = vi.fn().mockResolvedValue(mockTag)

      mockDb.executeRun = vi.fn().mockResolvedValue({ success: true })
      mockKv.delete = vi.fn().mockResolvedValue(undefined)

      // Mock getting updated tag
      const updatedTag = { ...mockTag, ...updateInput }
      mockKv.get = vi.fn()
        .mockResolvedValueOnce(mockTag) // First call for existing tag
        .mockResolvedValueOnce(null) // Second call for updated tag (cache miss)

      mockDb.executeOne = vi.fn().mockResolvedValue(updatedTag)
      mockKv.set = vi.fn().mockResolvedValue(undefined)

      const result = await tagService.updateTag(mockTagId, updateInput, mockSiteId)

      expect(mockDb.executeRun).toHaveBeenCalledWith(
        'UPDATE tags SET name = ?, description = ? WHERE id = ?',
        ['Updated Tag', 'Updated description', mockTagId]
      )

      expect(mockKv.delete).toHaveBeenCalledWith('tag:test-tag-id')
    })

    it('should handle slug update with uniqueness check', async () => {
      const inputWithSlug = { ...updateInput, slug: 'new-slug' }

      mockKv.get = vi.fn().mockResolvedValue(mockTag)
      mockDb.executeOne = vi.fn()
        .mockResolvedValueOnce(null) // No slug conflict
        .mockResolvedValueOnce({ ...mockTag, slug: 'new-slug' }) // Updated tag

      mockDb.executeRun = vi.fn().mockResolvedValue({ success: true })
      mockKv.delete = vi.fn().mockResolvedValue(undefined)
      mockKv.set = vi.fn().mockResolvedValue(undefined)

      await tagService.updateTag(mockTagId, inputWithSlug, mockSiteId)

      expect(mockDb.executeRun).toHaveBeenCalledWith(
        expect.stringContaining('slug = ?'),
        expect.arrayContaining(['new-slug'])
      )
    })

    it('should return existing tag when no updates provided', async () => {
      mockKv.get = vi.fn().mockResolvedValue(mockTag)

      const result = await tagService.updateTag(mockTagId, {}, mockSiteId)

      expect(result).toEqual(mockTag)
      expect(mockDb.executeRun).not.toHaveBeenCalled()
    })
  })

  describe('deleteTag', () => {
    it('should delete tag and its associations', async () => {
      mockKv.get = vi.fn().mockResolvedValue(mockTag)
      mockDb.executeRun = vi.fn().mockResolvedValue({ success: true })
      mockKv.delete = vi.fn().mockResolvedValue(undefined)

      await tagService.deleteTag(mockTagId, mockSiteId)

      expect(mockDb.executeRun).toHaveBeenCalledWith(
        'DELETE FROM article_tags WHERE tag_id = ?',
        [mockTagId]
      )

      expect(mockDb.executeRun).toHaveBeenCalledWith(
        'DELETE FROM tags WHERE id = ?',
        [mockTagId]
      )

      expect(mockKv.delete).toHaveBeenCalledWith('tag:test-tag-id')
    })
  })

  describe('getTagCloud', () => {
    const mockCloudData = [
      { id: 'tag1', name: 'Tag 1', slug: 'tag-1', count: 10 },
      { id: 'tag2', name: 'Tag 2', slug: 'tag-2', count: 5 },
      { id: 'tag3', name: 'Tag 3', slug: 'tag-3', count: 2 }
    ]

    it('should return tag cloud with calculated weights', async () => {
      mockKv.cache = vi.fn().mockImplementation(async (key, fetcher) => {
        return fetcher()
      })

      mockDb.execute = vi.fn().mockResolvedValue(mockCloudData)

      const result = await tagService.getTagCloud(mockSiteId, 50)

      expect(result).toHaveLength(3)
      expect(result[0]).toMatchObject({
        ...mockCloudData[0],
        weight: 1 // (10-2)/(10-2) = 1
      })
      expect(result[1]).toMatchObject({
        ...mockCloudData[1],
        weight: 0.375 // (5-2)/(10-2) = 3/8
      })
      expect(result[2]).toMatchObject({
        ...mockCloudData[2],
        weight: 0 // (2-2)/(10-2) = 0
      })
    })

    it('should return empty array when no tags found', async () => {
      mockKv.cache = vi.fn().mockImplementation(async (key, fetcher) => {
        return fetcher()
      })

      mockDb.execute = vi.fn().mockResolvedValue([])

      const result = await tagService.getTagCloud(mockSiteId)

      expect(result).toEqual([])
    })
  })

  describe('getRelatedArticles', () => {
    const mockArticles = [
      {
        id: 'article1',
        title: 'Article 1',
        site_id: mockSiteId,
        status: 'published',
        tags: []
      },
      {
        id: 'article2',
        title: 'Article 2',
        site_id: mockSiteId,
        status: 'published',
        tags: []
      }
    ]

    it('should return related articles', async () => {
      mockKv.cache = vi.fn().mockImplementation(async (key, fetcher) => {
        return fetcher()
      })

      mockDb.execute = vi.fn()
        .mockResolvedValueOnce(mockArticles) // Related articles
        .mockResolvedValue([]) // Article tags (called for each article)

      const result = await tagService.getRelatedArticles('article-id', mockSiteId)

      expect(result).toEqual(mockArticles)
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(shared_tags.tag_id) as common_tag_count'),
        ['article-id', mockSiteId, 'article-id', 1, 5]
      )
    })

    it('should respect custom parameters', async () => {
      mockKv.cache = vi.fn().mockImplementation(async (key, fetcher) => {
        return fetcher()
      })

      mockDb.execute = vi.fn()
        .mockResolvedValueOnce([]) // Related articles
        .mockResolvedValue([]) // Article tags

      await tagService.getRelatedArticles('article-id', mockSiteId, {
        excludeId: 'exclude-id',
        limit: 3,
        minCommonTags: 2
      })

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.any(String),
        ['article-id', mockSiteId, 'exclude-id', 2, 3]
      )
    })
  })

  describe('getTagSuggestions', () => {
    it('should return tag suggestions', async () => {
      mockKv.cache = vi.fn().mockImplementation(async (key, fetcher) => {
        return fetcher()
      })

      const mockSuggestions = [mockTag]
      mockDb.execute = vi.fn().mockResolvedValue(mockSuggestions)

      const result = await tagService.getTagSuggestions(mockSiteId, 'test', 10)

      expect(result).toEqual(mockSuggestions)
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('t.name LIKE ?'),
        [mockSiteId, '%test%', 10]
      )
    })

    it('should return empty array for empty query', async () => {
      const result = await tagService.getTagSuggestions(mockSiteId, '', 10)

      expect(result).toEqual([])
      expect(mockDb.execute).not.toHaveBeenCalled()
    })
  })

  describe('getTagStats', () => {
    it('should return tag statistics', async () => {
      mockKv.cache = vi.fn().mockImplementation(async (key, fetcher) => {
        return fetcher()
      })

      mockDb.executeOne = vi.fn()
        .mockResolvedValueOnce({ total: 10 })
        .mockResolvedValueOnce({ used: 7 })
        .mockResolvedValueOnce({ avg: 2.5 })

      const result = await tagService.getTagStats(mockSiteId)

      expect(result).toEqual({
        total: 10,
        used: 7,
        unused: 3,
        avgArticlesPerTag: 2.5
      })
    })

    it('should handle null results gracefully', async () => {
      mockKv.cache = vi.fn().mockImplementation(async (key, fetcher) => {
        return fetcher()
      })

      mockDb.executeOne = vi.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)

      const result = await tagService.getTagStats(mockSiteId)

      expect(result).toEqual({
        total: 0,
        used: 0,
        unused: 0,
        avgArticlesPerTag: 0
      })
    })
  })
})