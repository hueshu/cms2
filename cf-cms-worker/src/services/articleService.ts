import { DatabaseService, KVService } from '../utils/database'
import { CacheService, cached } from './cacheService'
import { PerformanceService } from './performanceService'
import { QueryOptimizer } from '../utils/queryOptimizer'
import {
  Article,
  Tag,
  CreateArticleInput,
  UpdateArticleInput,
  PaginationParams,
  PaginatedResponse
} from '../models/types'
import {
  databaseError,
  notFoundError,
  conflictError,
  validationError
} from '../middleware/error'

export interface ArticleSearchParams extends PaginationParams {
  search?: string
  tags?: string[]
  status?: 'draft' | 'published' | 'archived'
  author?: string
  dateFrom?: string
  dateTo?: string
}

export class ArticleService {
  private cacheService: CacheService
  private performanceService: PerformanceService
  private queryOptimizer: QueryOptimizer

  constructor(
    private db: DatabaseService,
    private kv: KVService,
    database: D1Database,
    kvNamespace?: KVNamespace
  ) {
    this.cacheService = new CacheService(kv)
    this.performanceService = new PerformanceService(kvNamespace)
    this.queryOptimizer = new QueryOptimizer(database, this.performanceService)
  }

  // Generate unique slug with conflict resolution
  async generateUniqueSlug(title: string, siteId: string, excludeId?: string): Promise<string> {
    let baseSlug = this.db.generateSlug(title)
    let slug = baseSlug
    let counter = 0

    while (true) {
      // Check if slug exists for this site
      const existing = await this.db.executeOne<{ id: string }>(
        'SELECT id FROM articles WHERE site_id = ? AND slug = ? AND id != ? AND status != ?',
        [siteId, slug, excludeId || '', 'deleted']
      )

      if (!existing) {
        return slug
      }

      counter++
      slug = `${baseSlug}-${counter}`
    }
  }

  // Create new article
  async createArticle(input: CreateArticleInput): Promise<Article> {
    try {
      const articleId = this.db.generateId()
      const now = new Date().toISOString()

      // Generate unique slug
      const slug = input.slug
        ? await this.generateUniqueSlug(input.slug, input.site_id)
        : await this.generateUniqueSlug(input.title, input.site_id)

      // Validate site exists
      const site = await this.db.executeOne(
        'SELECT id FROM sites WHERE id = ? AND status != ?',
        [input.site_id, 'deleted']
      )
      if (!site) {
        throw notFoundError('Site', input.site_id)
      }

      const article: Article = {
        id: articleId,
        site_id: input.site_id,
        title: input.title,
        slug,
        content: input.content,
        summary: input.summary,
        cover_image: input.cover_image,
        meta_title: input.meta_title,
        meta_description: input.meta_description,
        meta_keywords: input.meta_keywords,
        status: input.status || 'draft',
        author: input.author,
        view_count: 0,
        created_at: now,
        updated_at: now,
        published_at: input.status === 'published' ? now : undefined
      }

      // Insert article
      await this.db.executeRun(
        `INSERT INTO articles (
          id, site_id, title, slug, content, summary, cover_image,
          meta_title, meta_description, meta_keywords, status, author,
          view_count, created_at, updated_at, published_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          article.id,
          article.site_id,
          article.title,
          article.slug,
          article.content || null,
          article.summary || null,
          article.cover_image || null,
          article.meta_title || null,
          article.meta_description || null,
          article.meta_keywords || null,
          article.status,
          article.author || null,
          article.view_count,
          article.created_at,
          article.updated_at,
          article.published_at || null
        ]
      )

      // Handle tags if provided
      if (input.tags && input.tags.length > 0) {
        await this.associateArticleTags(articleId, input.tags, input.site_id)
      }

      // Cache article
      await this.kv.set(
        this.kv.cacheKey('article', articleId),
        article,
        { expirationTtl: 3600 }
      )

      // Invalidate related caches
      await this.invalidateArticleListCaches(input.site_id)

      return article
    } catch (error) {
      throw error instanceof Error ? error : databaseError('create article', error)
    }
  }

  // Get article by ID
  @cached({
    ttl: 3600,
    keyGenerator: (articleId: string, siteId?: string) =>
      `article:${articleId}${siteId ? `:${siteId}` : ''}`
  })
  @PerformanceService.monitor('article.getById')
  async getArticleById(articleId: string, siteId?: string): Promise<Article> {
    // Try cache first
    const cached = await this.kv.get<Article>(
      this.kv.cacheKey('article', articleId)
    )
    if (cached && (!siteId || cached.site_id === siteId)) {
      return cached
    }

    // Build query with optional site filter
    const params = [articleId]
    let query = 'SELECT * FROM articles WHERE id = ? AND status != ?'
    params.push('deleted')

    if (siteId) {
      query += ' AND site_id = ?'
      params.push(siteId)
    }

    const article = await this.db.executeOne<Article>(query, params)

    if (!article) {
      throw notFoundError('Article', articleId)
    }

    // Load associated tags
    article.tags = await this.getArticleTags(articleId)

    // Update cache
    await this.kv.set(
      this.kv.cacheKey('article', articleId),
      article,
      { expirationTtl: 3600 }
    )

    return article
  }

  // Get article by slug
  async getArticleBySlug(slug: string, siteId: string): Promise<Article> {
    const article = await this.db.executeOne<Article>(
      'SELECT * FROM articles WHERE slug = ? AND site_id = ? AND status != ?',
      [slug, siteId, 'deleted']
    )

    if (!article) {
      throw notFoundError('Article with slug', slug)
    }

    // Load associated tags
    article.tags = await this.getArticleTags(article.id)

    return article
  }

  // Search articles with filters
  @PerformanceService.monitor('article.search')
  async searchArticles(siteId: string, params: ArticleSearchParams): Promise<PaginatedResponse<Article>> {
    const {
      page = 1,
      limit = 20,
      sort = 'desc',
      sortBy = 'created_at',
      search,
      tags,
      status,
      author,
      dateFrom,
      dateTo
    } = params

    const offset = (page - 1) * limit

    // Build where conditions
    const conditions: string[] = ['site_id = ?', 'status != ?']
    const queryParams: any[] = [siteId, 'deleted']

    if (status) {
      conditions.push('status = ?')
      queryParams.push(status)
    }

    if (author) {
      conditions.push('author = ?')
      queryParams.push(author)
    }

    if (search) {
      conditions.push('(title LIKE ? OR content LIKE ? OR summary LIKE ?)')
      const searchTerm = `%${search}%`
      queryParams.push(searchTerm, searchTerm, searchTerm)
    }

    if (dateFrom) {
      conditions.push('created_at >= ?')
      queryParams.push(dateFrom)
    }

    if (dateTo) {
      conditions.push('created_at <= ?')
      queryParams.push(dateTo)
    }

    let baseQuery = `FROM articles WHERE ${conditions.join(' AND ')}`

    // Handle tag filtering with subquery
    if (tags && tags.length > 0) {
      const tagPlaceholders = tags.map(() => '?').join(',')
      baseQuery += ` AND id IN (
        SELECT DISTINCT at.article_id
        FROM article_tags at
        JOIN tags t ON at.tag_id = t.id
        WHERE t.slug IN (${tagPlaceholders})
        GROUP BY at.article_id
        HAVING COUNT(DISTINCT t.slug) = ?
      )`
      queryParams.push(...tags, tags.length)
    }

    // Get total count
    const countResult = await this.db.executeOne<{ count: number }>(
      `SELECT COUNT(*) as count ${baseQuery}`,
      queryParams
    )
    const total = countResult?.count || 0

    // Get paginated articles
    const articles = await this.db.execute<Article>(
      `SELECT * ${baseQuery} ORDER BY ${sortBy} ${sort.toUpperCase()} LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    )

    // Load tags for each article
    for (const article of articles) {
      article.tags = await this.getArticleTags(article.id)
    }

    return {
      data: articles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  // Update article
  async updateArticle(articleId: string, input: UpdateArticleInput, siteId?: string): Promise<Article> {
    const existing = await this.getArticleById(articleId, siteId)

    const updates: string[] = []
    const values: any[] = []

    if (input.title !== undefined) {
      updates.push('title = ?')
      values.push(input.title)
    }

    if (input.slug !== undefined) {
      // Ensure slug uniqueness
      const uniqueSlug = await this.generateUniqueSlug(input.slug, existing.site_id, articleId)
      updates.push('slug = ?')
      values.push(uniqueSlug)
    }

    if (input.content !== undefined) {
      updates.push('content = ?')
      values.push(input.content)
    }

    if (input.summary !== undefined) {
      updates.push('summary = ?')
      values.push(input.summary)
    }

    if (input.cover_image !== undefined) {
      updates.push('cover_image = ?')
      values.push(input.cover_image)
    }

    if (input.meta_title !== undefined) {
      updates.push('meta_title = ?')
      values.push(input.meta_title)
    }

    if (input.meta_description !== undefined) {
      updates.push('meta_description = ?')
      values.push(input.meta_description)
    }

    if (input.meta_keywords !== undefined) {
      updates.push('meta_keywords = ?')
      values.push(input.meta_keywords)
    }

    if (input.status !== undefined) {
      updates.push('status = ?')
      values.push(input.status)

      // Set published_at when changing to published
      if (input.status === 'published' && existing.status !== 'published') {
        updates.push('published_at = ?')
        values.push(new Date().toISOString())
      }
    }

    if (updates.length === 0 && !input.tags) {
      return existing
    }

    // Always update timestamp
    updates.push('updated_at = ?')
    values.push(new Date().toISOString())

    values.push(articleId)

    // Update article
    if (updates.length > 0) {
      await this.db.executeRun(
        `UPDATE articles SET ${updates.join(', ')} WHERE id = ?`,
        values
      )
    }

    // Handle tags update
    if (input.tags !== undefined) {
      await this.updateArticleTags(articleId, input.tags, existing.site_id)
    }

    // Invalidate caches
    await this.kv.delete(this.kv.cacheKey('article', articleId))
    await this.invalidateArticleListCaches(existing.site_id)

    return this.getArticleById(articleId, siteId)
  }

  // Delete article (soft delete)
  async deleteArticle(articleId: string, siteId?: string): Promise<void> {
    const existing = await this.getArticleById(articleId, siteId)

    await this.db.executeRun(
      'UPDATE articles SET status = ?, updated_at = ? WHERE id = ?',
      ['deleted', new Date().toISOString(), articleId]
    )

    // Clean up caches
    await this.kv.delete(this.kv.cacheKey('article', articleId))
    await this.invalidateArticleListCaches(existing.site_id)

    // Remove tag associations
    await this.db.executeRun(
      'DELETE FROM article_tags WHERE article_id = ?',
      [articleId]
    )
  }

  // Increment view count
  async incrementViewCount(articleId: string): Promise<void> {
    await this.db.executeRun(
      'UPDATE articles SET view_count = view_count + 1 WHERE id = ?',
      [articleId]
    )

    // Invalidate cache
    await this.kv.delete(this.kv.cacheKey('article', articleId))
  }

  // Get articles by tag
  async getArticlesByTag(tagSlug: string, siteId: string, params: PaginationParams): Promise<PaginatedResponse<Article>> {
    const { page = 1, limit = 20, sort = 'desc', sortBy = 'created_at' } = params
    const offset = (page - 1) * limit

    // Get total count
    const countResult = await this.db.executeOne<{ count: number }>(
      `SELECT COUNT(DISTINCT a.id) as count
       FROM articles a
       JOIN article_tags at ON a.id = at.article_id
       JOIN tags t ON at.tag_id = t.id
       WHERE t.slug = ? AND a.site_id = ? AND a.status = ?`,
      [tagSlug, siteId, 'published']
    )
    const total = countResult?.count || 0

    // Get paginated articles
    const articles = await this.db.execute<Article>(
      `SELECT DISTINCT a.*
       FROM articles a
       JOIN article_tags at ON a.id = at.article_id
       JOIN tags t ON at.tag_id = t.id
       WHERE t.slug = ? AND a.site_id = ? AND a.status = ?
       ORDER BY a.${sortBy} ${sort.toUpperCase()}
       LIMIT ? OFFSET ?`,
      [tagSlug, siteId, 'published', limit, offset]
    )

    // Load tags for each article
    for (const article of articles) {
      article.tags = await this.getArticleTags(article.id)
    }

    return {
      data: articles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  // Get article tags
  private async getArticleTags(articleId: string): Promise<Tag[]> {
    return this.db.execute<Tag>(
      `SELECT t.* FROM tags t
       JOIN article_tags at ON t.id = at.tag_id
       WHERE at.article_id = ?
       ORDER BY t.name`,
      [articleId]
    )
  }

  // Associate article with tags
  private async associateArticleTags(articleId: string, tagSlugs: string[], siteId: string): Promise<void> {
    for (const tagSlug of tagSlugs) {
      // Get or create tag
      let tag = await this.db.executeOne<Tag>(
        'SELECT * FROM tags WHERE slug = ? AND site_id = ?',
        [tagSlug, siteId]
      )

      if (!tag) {
        // Create new tag
        const tagId = this.db.generateId()
        const now = new Date().toISOString()

        tag = {
          id: tagId,
          site_id: siteId,
          name: tagSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          slug: tagSlug,
          created_at: now
        }

        await this.db.executeRun(
          'INSERT INTO tags (id, site_id, name, slug, created_at) VALUES (?, ?, ?, ?, ?)',
          [tag.id, tag.site_id, tag.name, tag.slug, tag.created_at]
        )
      }

      // Create association
      await this.db.executeRun(
        'INSERT OR IGNORE INTO article_tags (article_id, tag_id) VALUES (?, ?)',
        [articleId, tag.id]
      )
    }
  }

  // Update article tags
  private async updateArticleTags(articleId: string, tagSlugs: string[], siteId: string): Promise<void> {
    // Remove existing associations
    await this.db.executeRun(
      'DELETE FROM article_tags WHERE article_id = ?',
      [articleId]
    )

    // Add new associations
    if (tagSlugs.length > 0) {
      await this.associateArticleTags(articleId, tagSlugs, siteId)
    }
  }

  // Invalidate article list caches
  private async invalidateArticleListCaches(siteId: string): Promise<void> {
    await this.kv.invalidate(this.kv.cacheKey('articles', siteId))
    await this.kv.invalidate(this.kv.cacheKey('article_search', siteId))
  }

  // Get published articles for site
  async getPublishedArticles(siteId: string, params: PaginationParams): Promise<PaginatedResponse<Article>> {
    return this.searchArticles(siteId, {
      ...params,
      status: 'published'
    })
  }

  // Get recent articles
  async getRecentArticles(siteId: string, limit: number = 5): Promise<Article[]> {
    const cacheKey = this.kv.cacheKey('recent_articles', siteId, limit.toString())

    return this.kv.cache(cacheKey, async () => {
      const articles = await this.db.execute<Article>(
        `SELECT * FROM articles
         WHERE site_id = ? AND status = ?
         ORDER BY published_at DESC
         LIMIT ?`,
        [siteId, 'published', limit]
      )

      // Load tags for each article
      for (const article of articles) {
        article.tags = await this.getArticleTags(article.id)
      }

      return articles
    }, 1800) // 30 minutes cache
  }

  // Get popular articles by view count
  async getPopularArticles(siteId: string, limit: number = 5): Promise<Article[]> {
    const cacheKey = this.kv.cacheKey('popular_articles', siteId, limit.toString())

    return this.kv.cache(cacheKey, async () => {
      const articles = await this.db.execute<Article>(
        `SELECT * FROM articles
         WHERE site_id = ? AND status = ?
         ORDER BY view_count DESC
         LIMIT ?`,
        [siteId, 'published', limit]
      )

      // Load tags for each article
      for (const article of articles) {
        article.tags = await this.getArticleTags(article.id)
      }

      return articles
    }, 3600) // 1 hour cache
  }
}