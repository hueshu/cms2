import { DatabaseService, KVService } from '../utils/database'
import {
  Site,
  CreateSiteInput,
  UpdateSiteInput,
  PaginationParams,
  PaginatedResponse
} from '../models/types'
import {
  databaseError,
  notFoundError,
  conflictError
} from '../middleware/error'

export class SiteService {
  constructor(
    private db: DatabaseService,
    private kv: KVService
  ) {}

  // Create new site
  async createSite(input: CreateSiteInput): Promise<Site> {
    try {
      // Check if domain already exists
      const existing = await this.db.executeOne<Site>(
        'SELECT * FROM sites WHERE domain = ?',
        [input.domain]
      )

      if (existing) {
        throw conflictError('Site', 'domain', input.domain)
      }

      const siteId = this.db.generateId()
      const now = new Date().toISOString()

      const site: Site = {
        id: siteId,
        domain: input.domain,
        name: input.name,
        description: input.description,
        config: input.config || {},
        status: 'active',
        created_at: now,
        updated_at: now
      }

      await this.db.executeRun(
        `INSERT INTO sites (id, domain, name, description, config, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          site.id,
          site.domain,
          site.name,
          site.description || null,
          JSON.stringify(site.config),
          site.status,
          site.created_at,
          site.updated_at
        ]
      )

      // Cache site data
      await this.kv.set(
        this.kv.cacheKey('site', siteId),
        site,
        { expirationTtl: 3600 }
      )

      return site
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE')) {
        throw conflictError('Site', 'domain', input.domain)
      }
      throw error
    }
  }

  // Get site by ID
  async getSiteById(siteId: string): Promise<Site> {
    // Try cache first
    const cached = await this.kv.get<Site>(
      this.kv.cacheKey('site', siteId)
    )
    if (cached) return cached

    const site = await this.db.executeOne<Site>(
      'SELECT * FROM sites WHERE id = ?',
      [siteId]
    )

    if (!site) {
      throw notFoundError('Site', siteId)
    }

    // Parse JSON config
    if (typeof site.config === 'string') {
      site.config = JSON.parse(site.config)
    }

    // Update cache
    await this.kv.set(
      this.kv.cacheKey('site', siteId),
      site,
      { expirationTtl: 3600 }
    )

    return site
  }

  // Get site by domain
  async getSiteByDomain(domain: string): Promise<Site> {
    const site = await this.db.executeOne<Site>(
      'SELECT * FROM sites WHERE domain = ?',
      [domain]
    )

    if (!site) {
      throw notFoundError('Site with domain', domain)
    }

    // Parse JSON config
    if (typeof site.config === 'string') {
      site.config = JSON.parse(site.config)
    }

    return site
  }

  // Get all sites with pagination
  async getSites(params: PaginationParams): Promise<PaginatedResponse<Site>> {
    const { page = 1, limit = 20, sort = 'desc', sortBy = 'created_at' } = params
    const offset = (page - 1) * limit

    // Get total count
    const countResult = await this.db.executeOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM sites WHERE status != ?',
      ['deleted']
    )
    const total = countResult?.count || 0

    // Get paginated sites
    const sites = await this.db.execute<Site>(
      `SELECT * FROM sites
       WHERE status != ?
       ORDER BY ${sortBy} ${sort.toUpperCase()}
       LIMIT ? OFFSET ?`,
      ['deleted', limit, offset]
    )

    // Parse JSON configs
    sites.forEach(site => {
      if (typeof site.config === 'string') {
        site.config = JSON.parse(site.config)
      }
    })

    return {
      data: sites,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  // Update site
  async updateSite(siteId: string, input: UpdateSiteInput): Promise<Site> {
    const existing = await this.getSiteById(siteId)

    const updates: string[] = []
    const values: any[] = []

    if (input.name !== undefined) {
      updates.push('name = ?')
      values.push(input.name)
    }

    if (input.description !== undefined) {
      updates.push('description = ?')
      values.push(input.description)
    }

    if (input.config !== undefined) {
      updates.push('config = ?')
      values.push(JSON.stringify(input.config))
    }

    if (input.status !== undefined) {
      updates.push('status = ?')
      values.push(input.status)
    }

    if (updates.length === 0) {
      return existing
    }

    updates.push('updated_at = ?')
    values.push(new Date().toISOString())

    values.push(siteId)

    await this.db.executeRun(
      `UPDATE sites SET ${updates.join(', ')} WHERE id = ?`,
      values
    )

    // Invalidate cache
    await this.kv.delete(this.kv.cacheKey('site', siteId))

    return this.getSiteById(siteId)
  }

  // Delete site (soft delete)
  async deleteSite(siteId: string): Promise<void> {
    await this.getSiteById(siteId) // Verify site exists

    await this.db.executeRun(
      `UPDATE sites SET status = ?, updated_at = ? WHERE id = ?`,
      ['deleted', new Date().toISOString(), siteId]
    )

    // Invalidate cache
    await this.kv.delete(this.kv.cacheKey('site', siteId))

    // Also delete all related data caches
    await this.kv.invalidate(this.kv.cacheKey('articles', siteId))
    await this.kv.invalidate(this.kv.cacheKey('tags', siteId))
  }

  // Verify site ownership
  async verifySiteOwnership(siteId: string, userId?: string): Promise<boolean> {
    // TODO: Implement proper ownership verification
    // For now, just check if site exists
    try {
      await this.getSiteById(siteId)
      return true
    } catch {
      return false
    }
  }
}