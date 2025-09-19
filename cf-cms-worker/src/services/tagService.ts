import { DatabaseService, KVService } from '../utils/database'
import {
  Tag,
  Article,
  CreateTagInput,
  UpdateTagInput,
  TagWithStats,
  TagCloudItem,
  TagSearchParams,
  RelatedArticlesParams,
  PaginatedResponse
} from '../models/types'
import {
  databaseError,
  notFoundError,
  conflictError,
  validationError
} from '../middleware/error'

export class TagService {
  constructor(
    private db: DatabaseService,
    private kv: KVService
  ) {}

  // Generate unique slug with conflict resolution
  async generateUniqueSlug(name: string, siteId: string, excludeId?: string): Promise<string> {
    let baseSlug = this.db.generateSlug(name)
    let slug = baseSlug
    let counter = 0

    while (true) {
      // Check if slug exists for this site
      const existing = await this.db.executeOne<{ id: string }>(
        'SELECT id FROM tags WHERE site_id = ? AND slug = ? AND id != ?',
        [siteId, slug, excludeId || '']
      )

      if (!existing) {
        return slug
      }

      counter++
      slug = `${baseSlug}-${counter}`
    }
  }

  // Create new tag
  async createTag(input: CreateTagInput, siteId: string): Promise<Tag> {
    try {
      const tagId = this.db.generateId()
      const now = new Date().toISOString()

      // Generate unique slug
      const slug = input.slug
        ? await this.generateUniqueSlug(input.slug, siteId)
        : await this.generateUniqueSlug(input.name, siteId)

      // Validate site exists
      const site = await this.db.executeOne(
        'SELECT id FROM sites WHERE id = ? AND status != ?',
        [siteId, 'deleted']
      )
      if (!site) {
        throw notFoundError('Site', siteId)
      }

      const tag: Tag = {
        id: tagId,
        site_id: siteId,
        name: input.name.trim(),
        slug,
        description: input.description?.trim(),
        created_at: now
      }

      // Insert tag
      await this.db.executeRun(
        'INSERT INTO tags (id, site_id, name, slug, description, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [tag.id, tag.site_id, tag.name, tag.slug, tag.description || null, tag.created_at]
      )

      // Cache tag
      await this.kv.set(
        this.kv.cacheKey('tag', tagId),
        tag,
        { expirationTtl: 3600 }
      )

      // Invalidate related caches
      await this.invalidateTagListCaches(siteId)

      return tag
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        throw conflictError('Tag name or slug already exists in this site')
      }
      throw error instanceof Error ? error : databaseError('create tag', error)
    }
  }

  // Get tag by ID
  async getTagById(tagId: string, siteId?: string): Promise<Tag> {
    // Try cache first
    const cached = await this.kv.get<Tag>(this.kv.cacheKey('tag', tagId))
    if (cached && (!siteId || cached.site_id === siteId)) {
      return cached
    }

    // Build query with optional site filter
    const params = [tagId]
    let query = 'SELECT * FROM tags WHERE id = ?'

    if (siteId) {
      query += ' AND site_id = ?'
      params.push(siteId)
    }

    const tag = await this.db.executeOne<Tag>(query, params)

    if (!tag) {
      throw notFoundError('Tag', tagId)
    }

    // Update cache
    await this.kv.set(
      this.kv.cacheKey('tag', tagId),
      tag,
      { expirationTtl: 3600 }
    )

    return tag
  }

  // Get tag by slug
  async getTagBySlug(slug: string, siteId: string): Promise<Tag> {
    const tag = await this.db.executeOne<Tag>(
      'SELECT * FROM tags WHERE slug = ? AND site_id = ?',
      [slug, siteId]
    )

    if (!tag) {
      throw notFoundError('Tag with slug', slug)
    }

    return tag
  }

  // Search tags with filters
  async searchTags(siteId: string, params: TagSearchParams): Promise<PaginatedResponse<TagWithStats>> {
    const {
      page = 1,
      limit = 20,
      sort = 'desc',
      sortBy = 'created_at',
      search,
      withStats = false
    } = params

    const offset = (page - 1) * limit

    // Build where conditions
    const conditions: string[] = ['t.site_id = ?']
    const queryParams: any[] = [siteId]

    if (search) {
      conditions.push('(t.name LIKE ? OR t.description LIKE ?)')
      const searchTerm = `%${search}%`
      queryParams.push(searchTerm, searchTerm)
    }

    const whereClause = conditions.join(' AND ')

    // Base query with article count if stats requested
    const selectClause = withStats
      ? `t.*, COUNT(at.tag_id) as article_count`
      : 't.*'

    const fromClause = withStats
      ? `tags t LEFT JOIN article_tags at ON t.id = at.tag_id LEFT JOIN articles a ON at.article_id = a.id AND a.status = 'published'`
      : 'tags t'

    const groupByClause = withStats ? 'GROUP BY t.id' : ''
    const orderByClause = withStats && sortBy === 'article_count'
      ? `ORDER BY article_count ${sort.toUpperCase()}, t.name ASC`
      : `ORDER BY t.${sortBy} ${sort.toUpperCase()}`

    // Get total count
    const countResult = await this.db.executeOne<{ count: number }>(
      `SELECT COUNT(DISTINCT t.id) as count FROM ${fromClause} WHERE ${whereClause}`,
      queryParams
    )
    const total = countResult?.count || 0

    // Get paginated tags
    const query = `
      SELECT ${selectClause}
      FROM ${fromClause}
      WHERE ${whereClause}
      ${groupByClause}
      ${orderByClause}
      LIMIT ? OFFSET ?
    `

    const tags = await this.db.execute<TagWithStats>(
      query,
      [...queryParams, limit, offset]
    )

    // If stats not requested, set article_count to 0
    if (!withStats) {
      tags.forEach(tag => {
        tag.article_count = 0
      })
    }

    return {
      data: tags,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  // Update tag
  async updateTag(tagId: string, input: UpdateTagInput, siteId?: string): Promise<Tag> {
    const existing = await this.getTagById(tagId, siteId)

    const updates: string[] = []
    const values: any[] = []

    if (input.name !== undefined) {
      updates.push('name = ?')
      values.push(input.name.trim())
    }

    if (input.slug !== undefined) {
      // Ensure slug uniqueness
      const uniqueSlug = await this.generateUniqueSlug(input.slug, existing.site_id, tagId)
      updates.push('slug = ?')
      values.push(uniqueSlug)
    }

    if (input.description !== undefined) {
      updates.push('description = ?')
      values.push(input.description?.trim() || null)
    }

    if (updates.length === 0) {
      return existing
    }

    values.push(tagId)

    // Update tag
    await this.db.executeRun(
      `UPDATE tags SET ${updates.join(', ')} WHERE id = ?`,
      values
    )

    // Invalidate caches
    await this.kv.delete(this.kv.cacheKey('tag', tagId))
    await this.invalidateTagListCaches(existing.site_id)

    return this.getTagById(tagId, siteId)
  }

  // Delete tag
  async deleteTag(tagId: string, siteId?: string): Promise<void> {
    const existing = await this.getTagById(tagId, siteId)

    // Remove tag associations first
    await this.db.executeRun(
      'DELETE FROM article_tags WHERE tag_id = ?',
      [tagId]
    )

    // Delete the tag
    await this.db.executeRun(
      'DELETE FROM tags WHERE id = ?',
      [tagId]
    )

    // Clean up caches
    await this.kv.delete(this.kv.cacheKey('tag', tagId))
    await this.invalidateTagListCaches(existing.site_id)
  }

  // Get tag cloud (tags with usage statistics)
  async getTagCloud(siteId: string, limit: number = 50): Promise<TagCloudItem[]> {
    const cacheKey = this.kv.cacheKey('tag_cloud', siteId, limit.toString())

    return this.kv.cache(cacheKey, async () => {
      const tags = await this.db.execute<TagCloudItem>(
        `SELECT
          t.id,
          t.name,
          t.slug,
          COUNT(at.tag_id) as count
        FROM tags t
        LEFT JOIN article_tags at ON t.id = at.tag_id
        LEFT JOIN articles a ON at.article_id = a.id AND a.status = 'published'
        WHERE t.site_id = ?
        GROUP BY t.id, t.name, t.slug
        HAVING count > 0
        ORDER BY count DESC, t.name ASC
        LIMIT ?`,
        [siteId, limit]
      )

      // Calculate weights (0-1 scale for font sizing)
      if (tags.length === 0) return []

      const maxCount = Math.max(...tags.map(t => t.count))
      const minCount = Math.min(...tags.map(t => t.count))
      const range = maxCount - minCount || 1

      return tags.map(tag => ({
        ...tag,
        weight: (tag.count - minCount) / range
      }))
    }, 1800) // 30 minutes cache
  }

  // Get related articles based on tags
  async getRelatedArticles(
    articleId: string,
    siteId: string,
    params: RelatedArticlesParams = {}
  ): Promise<Article[]> {
    const { excludeId = articleId, limit = 5, minCommonTags = 1 } = params

    const cacheKey = this.kv.cacheKey('related_articles', articleId, limit.toString(), minCommonTags.toString())

    return this.kv.cache(cacheKey, async () => {
      // Get articles that share tags with the given article
      const articles = await this.db.execute<Article>(
        `SELECT DISTINCT a.*, COUNT(shared_tags.tag_id) as common_tag_count
        FROM articles a
        JOIN article_tags at2 ON a.id = at2.article_id
        JOIN (
          SELECT at.tag_id
          FROM article_tags at
          WHERE at.article_id = ?
        ) shared_tags ON at2.tag_id = shared_tags.tag_id
        WHERE a.site_id = ?
          AND a.status = 'published'
          AND a.id != ?
        GROUP BY a.id
        HAVING common_tag_count >= ?
        ORDER BY common_tag_count DESC, a.published_at DESC
        LIMIT ?`,
        [articleId, siteId, excludeId, minCommonTags, limit]
      )

      // Load tags for each article
      for (const article of articles) {
        article.tags = await this.getArticleTags(article.id)
      }

      return articles
    }, 1800) // 30 minutes cache
  }

  // Get tags suggestions (autocomplete)
  async getTagSuggestions(siteId: string, query: string, limit: number = 10): Promise<Tag[]> {
    if (!query.trim()) return []

    const cacheKey = this.kv.cacheKey('tag_suggestions', siteId, query.toLowerCase(), limit.toString())

    return this.kv.cache(cacheKey, async () => {
      const searchTerm = `%${query.trim()}%`

      return this.db.execute<Tag>(
        `SELECT t.*, COUNT(at.tag_id) as usage_count
        FROM tags t
        LEFT JOIN article_tags at ON t.id = at.tag_id
        LEFT JOIN articles a ON at.article_id = a.id AND a.status = 'published'
        WHERE t.site_id = ? AND t.name LIKE ?
        GROUP BY t.id
        ORDER BY usage_count DESC, t.name ASC
        LIMIT ?`,
        [siteId, searchTerm, limit]
      )
    }, 600) // 10 minutes cache
  }

  // Get popular tags (most used)
  async getPopularTags(siteId: string, limit: number = 10): Promise<TagWithStats[]> {
    const cacheKey = this.kv.cacheKey('popular_tags', siteId, limit.toString())

    return this.kv.cache(cacheKey, async () => {
      const tags = await this.db.execute<TagWithStats>(
        `SELECT
          t.*,
          COUNT(at.tag_id) as article_count
        FROM tags t
        JOIN article_tags at ON t.id = at.tag_id
        JOIN articles a ON at.article_id = a.id AND a.status = 'published'
        WHERE t.site_id = ?
        GROUP BY t.id
        ORDER BY article_count DESC, t.name ASC
        LIMIT ?`,
        [siteId, limit]
      )

      // Load recent articles for each tag
      for (const tag of tags) {
        tag.recent_articles = await this.db.execute<Article>(
          `SELECT a.*
          FROM articles a
          JOIN article_tags at ON a.id = at.article_id
          WHERE at.tag_id = ? AND a.status = 'published'
          ORDER BY a.published_at DESC
          LIMIT 3`,
          [tag.id]
        )
      }

      return tags
    }, 3600) // 1 hour cache
  }

  // Get tag statistics
  async getTagStats(siteId: string): Promise<{
    total: number
    used: number
    unused: number
    avgArticlesPerTag: number
  }> {
    const cacheKey = this.kv.cacheKey('tag_stats', siteId)

    return this.kv.cache(cacheKey, async () => {
      const [totalResult, usedResult, avgResult] = await Promise.all([
        this.db.executeOne<{ total: number }>(
          'SELECT COUNT(*) as total FROM tags WHERE site_id = ?',
          [siteId]
        ),
        this.db.executeOne<{ used: number }>(
          `SELECT COUNT(DISTINCT t.id) as used
          FROM tags t
          JOIN article_tags at ON t.id = at.tag_id
          JOIN articles a ON at.article_id = a.id AND a.status = 'published'
          WHERE t.site_id = ?`,
          [siteId]
        ),
        this.db.executeOne<{ avg: number }>(
          `SELECT AVG(tag_count) as avg FROM (
            SELECT COUNT(at.tag_id) as tag_count
            FROM tags t
            LEFT JOIN article_tags at ON t.id = at.tag_id
            LEFT JOIN articles a ON at.article_id = a.id AND a.status = 'published'
            WHERE t.site_id = ?
            GROUP BY t.id
          )`,
          [siteId]
        )
      ])

      const total = totalResult?.total || 0
      const used = usedResult?.used || 0
      const unused = total - used
      const avgArticlesPerTag = Math.round((avgResult?.avg || 0) * 100) / 100

      return {
        total,
        used,
        unused,
        avgArticlesPerTag
      }
    }, 3600) // 1 hour cache
  }

  // Get all tags for a site (with optional stats)
  async getAllTags(siteId: string, withStats: boolean = false): Promise<TagWithStats[]> {
    const cacheKey = this.kv.cacheKey('all_tags', siteId, withStats.toString())

    return this.kv.cache(cacheKey, async () => {
      if (withStats) {
        return this.db.execute<TagWithStats>(
          `SELECT
            t.*,
            COUNT(at.tag_id) as article_count
          FROM tags t
          LEFT JOIN article_tags at ON t.id = at.tag_id
          LEFT JOIN articles a ON at.article_id = a.id AND a.status = 'published'
          WHERE t.site_id = ?
          GROUP BY t.id
          ORDER BY t.name ASC`,
          [siteId]
        )
      } else {
        const tags = await this.db.execute<Tag>(
          'SELECT * FROM tags WHERE site_id = ? ORDER BY name ASC',
          [siteId]
        )
        return tags.map(tag => ({ ...tag, article_count: 0 }))
      }
    }, 1800) // 30 minutes cache
  }

  // Helper method to get article tags
  private async getArticleTags(articleId: string): Promise<Tag[]> {
    return this.db.execute<Tag>(
      `SELECT t.* FROM tags t
       JOIN article_tags at ON t.id = at.tag_id
       WHERE at.article_id = ?
       ORDER BY t.name`,
      [articleId]
    )
  }

  // Invalidate tag list caches
  private async invalidateTagListCaches(siteId: string): Promise<void> {
    await this.kv.invalidate(this.kv.cacheKey('all_tags', siteId))
    await this.kv.invalidate(this.kv.cacheKey('tag_cloud', siteId))
    await this.kv.invalidate(this.kv.cacheKey('popular_tags', siteId))
    await this.kv.invalidate(this.kv.cacheKey('tag_stats', siteId))
    await this.kv.invalidate(this.kv.cacheKey('tag_suggestions', siteId))
    await this.kv.invalidate(this.kv.cacheKey('related_articles'))
  }
}