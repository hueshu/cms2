import { DatabaseService } from '../utils/database'
import {
  SitemapEntry,
  SitemapImage,
  Article,
  Tag,
  Site,
  SEOConfig,
  SitemapSettings
} from '../models/types'

export class SitemapService {
  constructor(private db: DatabaseService) {}

  // Generate XML sitemap for a site
  async generateSitemap(siteId: string, baseUrl: string, seoConfig?: SEOConfig): Promise<string> {
    const site = await this.db.executeOne<Site>(
      'SELECT * FROM sites WHERE id = ?',
      [siteId]
    )

    if (!site) {
      throw new Error('Site not found')
    }

    const settings = seoConfig?.sitemap_settings || this.getDefaultSitemapSettings()

    if (!settings.enabled) {
      return this.generateEmptySitemap()
    }

    const entries: SitemapEntry[] = []

    // Add homepage
    entries.push({
      loc: baseUrl,
      lastmod: new Date().toISOString(),
      changefreq: settings.change_frequency.homepage,
      priority: settings.priority_settings.homepage
    })

    // Add articles
    if (settings.include_articles) {
      const articles = await this.getPublishedArticles(siteId)
      for (const article of articles) {
        if (!this.shouldExcludeUrl(`/articles/${article.slug}`, settings.exclude_patterns)) {
          const entry: SitemapEntry = {
            loc: `${baseUrl}/articles/${article.slug}`,
            lastmod: article.updated_at,
            changefreq: settings.change_frequency.articles,
            priority: settings.priority_settings.articles
          }

          // Add images if enabled
          if (settings.include_images && article.cover_image) {
            entry.images = [{
              loc: article.cover_image,
              title: article.title,
              caption: article.meta_description || article.summary
            }]

            // Extract additional images from content
            const contentImages = this.extractImagesFromContent(article.content)
            if (contentImages.length > 0) {
              entry.images.push(...contentImages)
            }
          }

          entries.push(entry)
        }
      }
    }

    // Add tags
    if (settings.include_tags) {
      const tags = await this.getActiveTags(siteId)
      for (const tag of tags) {
        if (!this.shouldExcludeUrl(`/tags/${tag.slug}`, settings.exclude_patterns)) {
          entries.push({
            loc: `${baseUrl}/tags/${tag.slug}`,
            lastmod: new Date().toISOString(),
            changefreq: settings.change_frequency.tags,
            priority: settings.priority_settings.tags
          })
        }
      }
    }

    return this.generateSitemapXML(entries)
  }

  // Generate sitemap index for large sites
  async generateSitemapIndex(siteId: string, baseUrl: string, seoConfig?: SEOConfig): Promise<string> {
    const settings = seoConfig?.sitemap_settings || this.getDefaultSitemapSettings()

    if (!settings.enabled) {
      return this.generateEmptySitemap()
    }

    const sitemaps: { loc: string; lastmod: string }[] = []

    // Main sitemap
    sitemaps.push({
      loc: `${baseUrl}/sitemap.xml`,
      lastmod: new Date().toISOString()
    })

    // Articles sitemap if there are many articles
    const articleCount = await this.getArticleCount(siteId)
    if (articleCount > 1000) {
      sitemaps.push({
        loc: `${baseUrl}/sitemap-articles.xml`,
        lastmod: new Date().toISOString()
      })
    }

    // Tags sitemap if there are many tags
    const tagCount = await this.getTagCount(siteId)
    if (tagCount > 100) {
      sitemaps.push({
        loc: `${baseUrl}/sitemap-tags.xml`,
        lastmod: new Date().toISOString()
      })
    }

    // Images sitemap if enabled
    if (settings.include_images) {
      sitemaps.push({
        loc: `${baseUrl}/sitemap-images.xml`,
        lastmod: new Date().toISOString()
      })
    }

    return this.generateSitemapIndexXML(sitemaps)
  }

  // Generate articles-only sitemap
  async generateArticlesSitemap(siteId: string, baseUrl: string, seoConfig?: SEOConfig): Promise<string> {
    const settings = seoConfig?.sitemap_settings || this.getDefaultSitemapSettings()

    if (!settings.enabled || !settings.include_articles) {
      return this.generateEmptySitemap()
    }

    const entries: SitemapEntry[] = []
    const articles = await this.getPublishedArticles(siteId)

    for (const article of articles) {
      if (!this.shouldExcludeUrl(`/articles/${article.slug}`, settings.exclude_patterns)) {
        const entry: SitemapEntry = {
          loc: `${baseUrl}/articles/${article.slug}`,
          lastmod: article.updated_at,
          changefreq: settings.change_frequency.articles,
          priority: settings.priority_settings.articles
        }

        // Add images if enabled
        if (settings.include_images && article.cover_image) {
          entry.images = [{
            loc: article.cover_image,
            title: article.title,
            caption: article.meta_description || article.summary
          }]

          const contentImages = this.extractImagesFromContent(article.content)
          if (contentImages.length > 0) {
            entry.images.push(...contentImages)
          }
        }

        entries.push(entry)
      }
    }

    return this.generateSitemapXML(entries)
  }

  // Generate tags-only sitemap
  async generateTagsSitemap(siteId: string, baseUrl: string, seoConfig?: SEOConfig): Promise<string> {
    const settings = seoConfig?.sitemap_settings || this.getDefaultSitemapSettings()

    if (!settings.enabled || !settings.include_tags) {
      return this.generateEmptySitemap()
    }

    const entries: SitemapEntry[] = []
    const tags = await this.getActiveTags(siteId)

    for (const tag of tags) {
      if (!this.shouldExcludeUrl(`/tags/${tag.slug}`, settings.exclude_patterns)) {
        entries.push({
          loc: `${baseUrl}/tags/${tag.slug}`,
          lastmod: new Date().toISOString(),
          changefreq: settings.change_frequency.tags,
          priority: settings.priority_settings.tags
        })
      }
    }

    return this.generateSitemapXML(entries)
  }

  // Generate images-only sitemap
  async generateImagesSitemap(siteId: string, baseUrl: string, seoConfig?: SEOConfig): Promise<string> {
    const settings = seoConfig?.sitemap_settings || this.getDefaultSitemapSettings()

    if (!settings.enabled || !settings.include_images) {
      return this.generateEmptySitemap()
    }

    const entries: SitemapEntry[] = []
    const articles = await this.getPublishedArticles(siteId)

    for (const article of articles) {
      if (!this.shouldExcludeUrl(`/articles/${article.slug}`, settings.exclude_patterns)) {
        const images: SitemapImage[] = []

        // Add cover image
        if (article.cover_image) {
          images.push({
            loc: article.cover_image,
            title: article.title,
            caption: article.meta_description || article.summary
          })
        }

        // Extract images from content
        const contentImages = this.extractImagesFromContent(article.content)
        images.push(...contentImages)

        if (images.length > 0) {
          entries.push({
            loc: `${baseUrl}/articles/${article.slug}`,
            lastmod: article.updated_at,
            images
          })
        }
      }
    }

    return this.generateSitemapXML(entries)
  }

  // Generate news sitemap (for recent articles)
  async generateNewsSitemap(siteId: string, baseUrl: string, seoConfig?: SEOConfig): Promise<string> {
    const settings = seoConfig?.sitemap_settings || this.getDefaultSitemapSettings()

    if (!settings.enabled || !settings.include_articles) {
      return this.generateEmptySitemap()
    }

    // Get articles from last 2 days for news sitemap
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

    const recentArticles = await this.db.execute<Article>(
      `SELECT * FROM articles
       WHERE site_id = ? AND status = 'published'
       AND (published_at >= ? OR created_at >= ?)
       ORDER BY published_at DESC, created_at DESC`,
      [siteId, twoDaysAgo.toISOString(), twoDaysAgo.toISOString()]
    )

    const entries: SitemapEntry[] = []

    for (const article of recentArticles) {
      if (!this.shouldExcludeUrl(`/articles/${article.slug}`, settings.exclude_patterns)) {
        entries.push({
          loc: `${baseUrl}/articles/${article.slug}`,
          lastmod: article.updated_at,
          changefreq: 'hourly',
          priority: 0.9
        })
      }
    }

    return this.generateSitemapXML(entries)
  }

  // Data fetching methods

  private async getPublishedArticles(siteId: string): Promise<Article[]> {
    return this.db.execute<Article>(
      `SELECT * FROM articles
       WHERE site_id = ? AND status = 'published'
       ORDER BY published_at DESC, created_at DESC`,
      [siteId]
    )
  }

  private async getActiveTags(siteId: string): Promise<Tag[]> {
    return this.db.execute<Tag>(
      `SELECT DISTINCT t.* FROM tags t
       INNER JOIN article_tags at ON t.id = at.tag_id
       INNER JOIN articles a ON at.article_id = a.id
       WHERE t.site_id = ? AND a.status = 'published'
       ORDER BY t.name`,
      [siteId]
    )
  }

  private async getArticleCount(siteId: string): Promise<number> {
    const result = await this.db.executeOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM articles WHERE site_id = ? AND status = "published"',
      [siteId]
    )
    return result?.count || 0
  }

  private async getTagCount(siteId: string): Promise<number> {
    const result = await this.db.executeOne<{ count: number }>(
      'SELECT COUNT(DISTINCT t.id) as count FROM tags t INNER JOIN article_tags at ON t.id = at.tag_id INNER JOIN articles a ON at.article_id = a.id WHERE t.site_id = ? AND a.status = "published"',
      [siteId]
    )
    return result?.count || 0
  }

  // XML generation methods

  private generateSitemapXML(entries: SitemapEntry[]): string {
    const urlElements = entries.map(entry => {
      let urlXml = `  <url>\n    <loc>${this.escapeXml(entry.loc)}</loc>\n`

      if (entry.lastmod) {
        urlXml += `    <lastmod>${entry.lastmod}</lastmod>\n`
      }

      if (entry.changefreq) {
        urlXml += `    <changefreq>${entry.changefreq}</changefreq>\n`
      }

      if (entry.priority !== undefined) {
        urlXml += `    <priority>${entry.priority}</priority>\n`
      }

      // Add images
      if (entry.images && entry.images.length > 0) {
        for (const image of entry.images) {
          urlXml += `    <image:image>\n`
          urlXml += `      <image:loc>${this.escapeXml(image.loc)}</image:loc>\n`

          if (image.title) {
            urlXml += `      <image:title>${this.escapeXml(image.title)}</image:title>\n`
          }

          if (image.caption) {
            urlXml += `      <image:caption>${this.escapeXml(image.caption)}</image:caption>\n`
          }

          urlXml += `    </image:image>\n`
        }
      }

      urlXml += `  </url>`
      return urlXml
    }).join('\n')

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlElements}
</urlset>`
  }

  private generateSitemapIndexXML(sitemaps: { loc: string; lastmod: string }[]): string {
    const sitemapElements = sitemaps.map(sitemap =>
      `  <sitemap>\n    <loc>${this.escapeXml(sitemap.loc)}</loc>\n    <lastmod>${sitemap.lastmod}</lastmod>\n  </sitemap>`
    ).join('\n')

    return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapElements}
</sitemapindex>`
  }

  private generateEmptySitemap(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`
  }

  // Utility methods

  private getDefaultSitemapSettings(): SitemapSettings {
    return {
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
      }
    }
  }

  private shouldExcludeUrl(url: string, excludePatterns?: string[]): boolean {
    if (!excludePatterns || excludePatterns.length === 0) {
      return false
    }

    return excludePatterns.some(pattern => {
      try {
        const regex = new RegExp(pattern)
        return regex.test(url)
      } catch {
        // If regex is invalid, try simple string matching
        return url.includes(pattern)
      }
    })
  }

  private extractImagesFromContent(content?: string): SitemapImage[] {
    if (!content) return []

    const images: SitemapImage[] = []
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
    let match

    while ((match = imgRegex.exec(content)) !== null) {
      const src = match[1]

      // Extract alt text if available
      const altMatch = match[0].match(/alt=["']([^"']+)["']/)
      const alt = altMatch ? altMatch[1] : undefined

      // Extract title if available
      const titleMatch = match[0].match(/title=["']([^"']+)["']/)
      const title = titleMatch ? titleMatch[1] : undefined

      images.push({
        loc: src,
        title: title || alt,
        caption: alt
      })
    }

    return images
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  // Sitemap validation

  async validateSitemap(siteId: string, baseUrl: string): Promise<{
    valid: boolean
    errors: string[]
    warnings: string[]
    stats: {
      totalUrls: number
      totalImages: number
      lastModified: string
    }
  }> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      const sitemap = await this.generateSitemap(siteId, baseUrl)

      // Basic XML validation
      if (!sitemap.includes('<?xml')) {
        errors.push('Missing XML declaration')
      }

      if (!sitemap.includes('<urlset')) {
        errors.push('Missing urlset element')
      }

      // Count URLs and images
      const urlCount = (sitemap.match(/<url>/g) || []).length
      const imageCount = (sitemap.match(/<image:image>/g) || []).length

      if (urlCount === 0) {
        warnings.push('Sitemap contains no URLs')
      }

      if (urlCount > 50000) {
        warnings.push('Sitemap contains more than 50,000 URLs - consider using sitemap index')
      }

      // Check file size (approximate)
      const sizeInBytes = Buffer.byteLength(sitemap, 'utf8')
      if (sizeInBytes > 50 * 1024 * 1024) { // 50MB
        warnings.push('Sitemap file size exceeds 50MB - consider splitting into multiple sitemaps')
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        stats: {
          totalUrls: urlCount,
          totalImages: imageCount,
          lastModified: new Date().toISOString()
        }
      }
    } catch (error) {
      errors.push(`Sitemap generation failed: ${error}`)
      return {
        valid: false,
        errors,
        warnings,
        stats: {
          totalUrls: 0,
          totalImages: 0,
          lastModified: new Date().toISOString()
        }
      }
    }
  }

  // Submit sitemap to search engines
  async submitSitemap(siteId: string, sitemapUrl: string): Promise<{
    success: boolean
    submissions: {
      searchEngine: string
      submitted: boolean
      error?: string
    }[]
  }> {
    const submissions: {
      searchEngine: string
      submitted: boolean
      error?: string
    }[] = []

    // Google Search Console submission
    try {
      const googleUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`
      const response = await fetch(googleUrl, { method: 'GET' })

      submissions.push({
        searchEngine: 'Google',
        submitted: response.ok,
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
      })
    } catch (error) {
      submissions.push({
        searchEngine: 'Google',
        submitted: false,
        error: `Submission failed: ${error}`
      })
    }

    // Bing Webmaster Tools submission
    try {
      const bingUrl = `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`
      const response = await fetch(bingUrl, { method: 'GET' })

      submissions.push({
        searchEngine: 'Bing',
        submitted: response.ok,
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
      })
    } catch (error) {
      submissions.push({
        searchEngine: 'Bing',
        submitted: false,
        error: `Submission failed: ${error}`
      })
    }

    const successCount = submissions.filter(s => s.submitted).length

    return {
      success: successCount > 0,
      submissions
    }
  }
}