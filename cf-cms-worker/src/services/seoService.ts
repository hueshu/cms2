import { DatabaseService } from '../utils/database'
import {
  SEOConfig,
  CreateSEOConfigInput,
  UpdateSEOConfigInput,
  RedirectRule,
  CreateRedirectRuleInput,
  UpdateRedirectRuleInput,
  SEOAnalysis,
  SEOIssue,
  SEORecommendation,
  SEOMetrics,
  HeadingAnalysis,
  Article,
  MetaSettings,
  SitemapSettings,
  InternalLinkSettings,
  SchemaOrgSettings
} from '../models/types'

export class SEOService {
  constructor(private db: DatabaseService) {}

  // SEO Configuration Management

  async getSEOConfig(siteId: string): Promise<SEOConfig | null> {
    const config = await this.db.executeOne<SEOConfig>(
      `SELECT * FROM seo_configs WHERE site_id = ?`,
      [siteId]
    )

    if (config) {
      // Parse JSON fields
      config.meta_settings = JSON.parse(config.meta_settings as any)
      config.sitemap_settings = JSON.parse(config.sitemap_settings as any)
      config.internal_link_settings = JSON.parse(config.internal_link_settings as any)
      config.schema_org_settings = JSON.parse(config.schema_org_settings as any)

      // Get redirect rules
      config.redirect_rules = await this.getRedirectRules(siteId)
    }

    return config
  }

  async createSEOConfig(input: CreateSEOConfigInput): Promise<SEOConfig> {
    const id = this.db.generateId()
    const now = new Date().toISOString()

    // Default settings
    const defaultMetaSettings: MetaSettings = {
      default_title_template: '{title} | {site_name}',
      enable_auto_meta: true,
      enable_open_graph: true,
      enable_twitter_cards: true,
      enable_schema_org: true,
      twitter_card_type: 'summary_large_image',
      ...input.meta_settings
    }

    const defaultSitemapSettings: SitemapSettings = {
      enabled: true,
      include_images: true,
      include_articles: true,
      include_tags: true,
      priority_settings: {
        homepage: 1.0,
        articles: 0.8,
        tags: 0.6,
        pages: 0.7
      },
      change_frequency: {
        homepage: 'daily',
        articles: 'weekly',
        tags: 'weekly',
        pages: 'monthly'
      },
      ...input.sitemap_settings
    }

    const defaultInternalLinkSettings: InternalLinkSettings = {
      enabled: true,
      max_links_per_article: 5,
      link_to_related_articles: true,
      link_to_tags: true,
      minimum_keyword_length: 3,
      only_link_once_per_article: true,
      link_class: 'internal-link',
      exclude_words: ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'],
      ...input.internal_link_settings
    }

    const defaultSchemaOrgSettings: SchemaOrgSettings = {
      enabled: true,
      breadcrumb_enabled: true,
      faq_enabled: false,
      default_article_schema: {
        author_type: 'Person',
        publisher_type: 'Organization',
        image_required: true,
        word_count_enabled: true,
        reading_time_enabled: true
      },
      ...input.schema_org_settings
    }

    const defaultRobotsTxt = input.robots_txt || `User-agent: *
Disallow: /admin/
Disallow: /api/
Allow: /api/sitemap.xml

Sitemap: {site_url}/sitemap.xml`

    await this.db.executeRun(
      `INSERT INTO seo_configs (
        id, site_id, meta_settings, sitemap_settings, internal_link_settings,
        robots_txt, schema_org_settings, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.site_id,
        JSON.stringify(defaultMetaSettings),
        JSON.stringify(defaultSitemapSettings),
        JSON.stringify(defaultInternalLinkSettings),
        defaultRobotsTxt,
        JSON.stringify(defaultSchemaOrgSettings),
        now,
        now
      ]
    )

    // Create redirect rules if provided
    if (input.redirect_rules && input.redirect_rules.length > 0) {
      for (const rule of input.redirect_rules) {
        await this.createRedirectRule({
          site_id: input.site_id,
          ...rule
        })
      }
    }

    return this.getSEOConfig(input.site_id) as Promise<SEOConfig>
  }

  async updateSEOConfig(siteId: string, input: UpdateSEOConfigInput): Promise<SEOConfig> {
    const existing = await this.getSEOConfig(siteId)
    if (!existing) {
      throw new Error('SEO config not found')
    }

    const now = new Date().toISOString()
    const updates: string[] = []
    const params: any[] = []

    if (input.meta_settings) {
      updates.push('meta_settings = ?')
      params.push(JSON.stringify({ ...existing.meta_settings, ...input.meta_settings }))
    }

    if (input.sitemap_settings) {
      updates.push('sitemap_settings = ?')
      params.push(JSON.stringify({ ...existing.sitemap_settings, ...input.sitemap_settings }))
    }

    if (input.internal_link_settings) {
      updates.push('internal_link_settings = ?')
      params.push(JSON.stringify({ ...existing.internal_link_settings, ...input.internal_link_settings }))
    }

    if (input.schema_org_settings) {
      updates.push('schema_org_settings = ?')
      params.push(JSON.stringify({ ...existing.schema_org_settings, ...input.schema_org_settings }))
    }

    if (input.robots_txt !== undefined) {
      updates.push('robots_txt = ?')
      params.push(input.robots_txt)
    }

    if (updates.length > 0) {
      updates.push('updated_at = ?')
      params.push(now, siteId)

      await this.db.executeRun(
        `UPDATE seo_configs SET ${updates.join(', ')} WHERE site_id = ?`,
        params
      )
    }

    // Update redirect rules if provided
    if (input.redirect_rules) {
      // Delete existing rules
      await this.db.executeRun(
        'DELETE FROM redirect_rules WHERE site_id = ?',
        [siteId]
      )

      // Create new rules
      for (const rule of input.redirect_rules) {
        await this.createRedirectRule({
          site_id: siteId,
          ...rule
        })
      }
    }

    return this.getSEOConfig(siteId) as Promise<SEOConfig>
  }

  async deleteSEOConfig(siteId: string): Promise<void> {
    await this.db.executeRun(
      'DELETE FROM seo_configs WHERE site_id = ?',
      [siteId]
    )

    await this.db.executeRun(
      'DELETE FROM redirect_rules WHERE site_id = ?',
      [siteId]
    )
  }

  // Redirect Rules Management

  async getRedirectRules(siteId: string): Promise<RedirectRule[]> {
    return this.db.execute<RedirectRule>(
      'SELECT * FROM redirect_rules WHERE site_id = ? ORDER BY created_at ASC',
      [siteId]
    )
  }

  async getRedirectRule(id: string): Promise<RedirectRule | null> {
    return this.db.executeOne<RedirectRule>(
      'SELECT * FROM redirect_rules WHERE id = ?',
      [id]
    )
  }

  async createRedirectRule(input: CreateRedirectRuleInput): Promise<RedirectRule> {
    const id = this.db.generateId()
    const now = new Date().toISOString()

    await this.db.executeRun(
      `INSERT INTO redirect_rules (
        id, site_id, from_path, to_path, redirect_type, is_regex, enabled, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.site_id,
        input.from_path,
        input.to_path,
        input.redirect_type || 301,
        input.is_regex || false,
        input.enabled !== false,
        now,
        now
      ]
    )

    return this.getRedirectRule(id) as Promise<RedirectRule>
  }

  async updateRedirectRule(id: string, input: UpdateRedirectRuleInput): Promise<RedirectRule> {
    const existing = await this.getRedirectRule(id)
    if (!existing) {
      throw new Error('Redirect rule not found')
    }

    const now = new Date().toISOString()
    const updates: string[] = []
    const params: any[] = []

    if (input.from_path !== undefined) {
      updates.push('from_path = ?')
      params.push(input.from_path)
    }

    if (input.to_path !== undefined) {
      updates.push('to_path = ?')
      params.push(input.to_path)
    }

    if (input.redirect_type !== undefined) {
      updates.push('redirect_type = ?')
      params.push(input.redirect_type)
    }

    if (input.is_regex !== undefined) {
      updates.push('is_regex = ?')
      params.push(input.is_regex)
    }

    if (input.enabled !== undefined) {
      updates.push('enabled = ?')
      params.push(input.enabled)
    }

    if (updates.length > 0) {
      updates.push('updated_at = ?')
      params.push(now, id)

      await this.db.executeRun(
        `UPDATE redirect_rules SET ${updates.join(', ')} WHERE id = ?`,
        params
      )
    }

    return this.getRedirectRule(id) as Promise<RedirectRule>
  }

  async deleteRedirectRule(id: string): Promise<void> {
    await this.db.executeRun(
      'DELETE FROM redirect_rules WHERE id = ?',
      [id]
    )
  }

  async findRedirectRule(siteId: string, path: string): Promise<RedirectRule | null> {
    const rules = await this.db.execute<RedirectRule>(
      'SELECT * FROM redirect_rules WHERE site_id = ? AND enabled = true ORDER BY is_regex ASC',
      [siteId]
    )

    for (const rule of rules) {
      if (rule.is_regex) {
        try {
          const regex = new RegExp(rule.from_path)
          if (regex.test(path)) {
            return rule
          }
        } catch (error) {
          console.error('Invalid regex in redirect rule:', rule.id, error)
        }
      } else {
        if (rule.from_path === path) {
          return rule
        }
      }
    }

    return null
  }

  // SEO Analysis

  async analyzeSEO(article: Article, siteConfig?: SEOConfig): Promise<SEOAnalysis> {
    const issues: SEOIssue[] = []
    const recommendations: SEORecommendation[] = []
    const metrics: SEOMetrics = {}

    // Title analysis
    if (!article.title) {
      issues.push({
        type: 'error',
        category: 'meta',
        message: 'Title is missing',
        suggestion: 'Add a descriptive title for the article'
      })
    } else {
      metrics.title_length = article.title.length
      if (article.title.length < 30) {
        issues.push({
          type: 'warning',
          category: 'meta',
          message: 'Title is too short',
          suggestion: 'Title should be at least 30 characters long'
        })
      } else if (article.title.length > 60) {
        issues.push({
          type: 'warning',
          category: 'meta',
          message: 'Title is too long',
          suggestion: 'Title should be less than 60 characters for better display in search results'
        })
      }
    }

    // Meta description analysis
    if (!article.meta_description) {
      issues.push({
        type: 'warning',
        category: 'meta',
        message: 'Meta description is missing',
        suggestion: 'Add a meta description to improve search result appearance'
      })
    } else {
      metrics.description_length = article.meta_description.length
      if (article.meta_description.length < 120) {
        issues.push({
          type: 'info',
          category: 'meta',
          message: 'Meta description is short',
          suggestion: 'Consider expanding meta description to 120-160 characters'
        })
      } else if (article.meta_description.length > 160) {
        issues.push({
          type: 'warning',
          category: 'meta',
          message: 'Meta description is too long',
          suggestion: 'Meta description should be less than 160 characters'
        })
      }
    }

    // Content analysis
    if (article.content) {
      metrics.word_count = this.countWords(article.content)
      metrics.reading_time = Math.ceil(metrics.word_count / 200) // Average reading speed

      if (metrics.word_count < 300) {
        issues.push({
          type: 'warning',
          category: 'content',
          message: 'Content is too short',
          suggestion: 'Consider expanding content to at least 300 words for better SEO'
        })
      }

      // Heading structure analysis
      metrics.heading_structure = this.analyzeHeadingStructure(article.content)
      if (metrics.heading_structure.missing_h1) {
        issues.push({
          type: 'error',
          category: 'content',
          message: 'Missing H1 heading',
          suggestion: 'Add an H1 heading to structure your content'
        })
      }

      if (!metrics.heading_structure.structure_valid) {
        issues.push({
          type: 'warning',
          category: 'content',
          message: 'Invalid heading structure',
          suggestion: 'Ensure headings follow proper hierarchy (H1 > H2 > H3, etc.)'
        })
      }

      // Keyword density analysis
      if (article.meta_keywords) {
        metrics.keyword_density = this.analyzeKeywordDensity(article.content, article.meta_keywords)
      }

      // Link analysis
      const linkAnalysis = this.analyzeLlinks(article.content)
      metrics.internal_links_count = linkAnalysis.internal
      metrics.external_links_count = linkAnalysis.external

      // Image analysis
      metrics.images_without_alt = this.countImagesWithoutAlt(article.content)
      if (metrics.images_without_alt > 0) {
        issues.push({
          type: 'warning',
          category: 'images',
          message: `${metrics.images_without_alt} images without alt text`,
          suggestion: 'Add descriptive alt text to all images for accessibility and SEO'
        })
      }
    }

    // Generate recommendations
    recommendations.push(...this.generateRecommendations(metrics, issues))

    // Calculate SEO score
    const score = this.calculateSEOScore(issues, metrics)

    return {
      score,
      issues,
      recommendations,
      metrics
    }
  }

  private countWords(content: string): number {
    return content.trim().split(/\s+/).length
  }

  private analyzeHeadingStructure(content: string): HeadingAnalysis {
    const headingRegex = /<h([1-6])[^>]*>.*?<\/h[1-6]>/gi
    const headings = content.match(headingRegex) || []

    const counts = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 }

    headings.forEach(heading => {
      const level = heading.match(/<h([1-6])/i)?.[1]
      if (level) {
        counts[`h${level}` as keyof typeof counts]++
      }
    })

    return {
      h1_count: counts.h1,
      h2_count: counts.h2,
      h3_count: counts.h3,
      h4_count: counts.h4,
      h5_count: counts.h5,
      h6_count: counts.h6,
      structure_valid: counts.h1 <= 1,
      missing_h1: counts.h1 === 0
    }
  }

  private analyzeKeywordDensity(content: string, keywords: string): { [keyword: string]: number } {
    const keywordList = keywords.split(',').map(k => k.trim().toLowerCase())
    const contentLower = content.toLowerCase()
    const wordCount = this.countWords(content)
    const density: { [keyword: string]: number } = {}

    keywordList.forEach(keyword => {
      const matches = (contentLower.match(new RegExp(keyword, 'g')) || []).length
      density[keyword] = (matches / wordCount) * 100
    })

    return density
  }

  private analyzeLlinks(content: string): { internal: number; external: number } {
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi
    const links = content.match(linkRegex) || []

    let internal = 0
    let external = 0

    links.forEach(link => {
      const href = link.match(/href=["']([^"']+)["']/)?.[1]
      if (href) {
        if (href.startsWith('http://') || href.startsWith('https://')) {
          external++
        } else {
          internal++
        }
      }
    })

    return { internal, external }
  }

  private countImagesWithoutAlt(content: string): number {
    const imgRegex = /<img[^>]*>/gi
    const images = content.match(imgRegex) || []

    return images.filter(img => !img.includes('alt=')).length
  }

  private generateRecommendations(metrics: SEOMetrics, issues: SEOIssue[]): SEORecommendation[] {
    const recommendations: SEORecommendation[] = []

    // Content recommendations
    if (metrics.word_count && metrics.word_count < 1000) {
      recommendations.push({
        priority: 'medium',
        category: 'content',
        title: 'Expand Content Length',
        description: 'Longer content typically performs better in search results',
        action: 'Add more detailed information, examples, or related topics'
      })
    }

    // Internal linking recommendations
    if (metrics.internal_links_count !== undefined && metrics.internal_links_count < 3) {
      recommendations.push({
        priority: 'medium',
        category: 'links',
        title: 'Add Internal Links',
        description: 'Internal links help search engines understand your site structure',
        action: 'Link to related articles and important pages on your site'
      })
    }

    // Image optimization recommendations
    if (metrics.images_without_alt && metrics.images_without_alt > 0) {
      recommendations.push({
        priority: 'high',
        category: 'images',
        title: 'Add Alt Text to Images',
        description: 'Alt text improves accessibility and helps search engines understand images',
        action: 'Add descriptive alt attributes to all images'
      })
    }

    return recommendations
  }

  private calculateSEOScore(issues: SEOIssue[], metrics: SEOMetrics): number {
    let score = 100

    // Deduct points for issues
    issues.forEach(issue => {
      switch (issue.type) {
        case 'error':
          score -= 15
          break
        case 'warning':
          score -= 8
          break
        case 'info':
          score -= 3
          break
      }
    })

    // Bonus points for good metrics
    if (metrics.word_count && metrics.word_count > 500) {
      score += 5
    }

    if (metrics.internal_links_count && metrics.internal_links_count >= 3) {
      score += 5
    }

    if (metrics.images_without_alt === 0) {
      score += 5
    }

    return Math.max(0, Math.min(100, score))
  }

  // Utility methods

  async getRobotsTxt(siteId: string, siteUrl: string): Promise<string> {
    const config = await this.getSEOConfig(siteId)
    if (!config) {
      return `User-agent: *
Disallow: /admin/
Disallow: /api/
Allow: /api/sitemap.xml

Sitemap: ${siteUrl}/sitemap.xml`
    }

    return config.robots_txt.replace('{site_url}', siteUrl)
  }

  async processRedirect(siteId: string, path: string): Promise<{ redirect: RedirectRule; processedPath: string } | null> {
    const rule = await this.findRedirectRule(siteId, path)
    if (!rule) return null

    let processedPath = rule.to_path

    if (rule.is_regex) {
      try {
        const regex = new RegExp(rule.from_path)
        processedPath = path.replace(regex, rule.to_path)
      } catch (error) {
        console.error('Error processing regex redirect:', error)
        return null
      }
    }

    return {
      redirect: rule,
      processedPath
    }
  }
}