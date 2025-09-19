import {
  MetaTags,
  StructuredData,
  Article,
  Site,
  Tag,
  SEOConfig,
  OrganizationSchema,
  WebsiteSchema,
  ArticleSchema
} from '../models/types'

export class MetaTagService {
  // Generate meta tags for articles
  generateArticleMetaTags(
    article: Article,
    site: Site,
    seoConfig?: SEOConfig,
    baseUrl?: string
  ): MetaTags {
    const siteConfig = site.config
    const metaSettings = seoConfig?.meta_settings
    const url = baseUrl ? `${baseUrl}/articles/${article.slug}` : undefined

    // Title generation
    let title = article.meta_title || article.title
    if (metaSettings?.default_title_template && title) {
      title = metaSettings.default_title_template
        .replace('{title}', title)
        .replace('{site_name}', site.name)
    }

    // Description
    const description = article.meta_description ||
                      article.summary ||
                      this.extractFirstParagraph(article.content) ||
                      metaSettings?.default_meta_description ||
                      siteConfig?.seo?.defaultDescription

    // Keywords
    const keywords = article.meta_keywords
      ? article.meta_keywords.split(',').map(k => k.trim())
      : article.tags?.map(tag => tag.name) ||
        metaSettings?.default_keywords ||
        siteConfig?.seo?.defaultKeywords

    const metaTags: MetaTags = {
      title,
      description,
      keywords,
      canonical: url,
      author: article.author,
      robots: 'index, follow'
    }

    // Open Graph tags
    if (metaSettings?.enable_open_graph !== false) {
      metaTags.og_title = title
      metaTags.og_description = description
      metaTags.og_type = 'article'
      metaTags.og_url = url

      if (article.cover_image) {
        metaTags.og_image = article.cover_image
      } else if (metaSettings?.og_image_default) {
        metaTags.og_image = metaSettings.og_image_default
      }
    }

    // Twitter Card tags
    if (metaSettings?.enable_twitter_cards !== false) {
      metaTags.twitter_card = metaSettings?.twitter_card_type || 'summary_large_image'
      metaTags.twitter_title = title
      metaTags.twitter_description = description

      if (article.cover_image) {
        metaTags.twitter_image = article.cover_image
      } else if (metaSettings?.og_image_default) {
        metaTags.twitter_image = metaSettings.og_image_default
      }

      if (metaSettings?.twitter_site) {
        metaTags.twitter_site = metaSettings.twitter_site
      }

      if (metaSettings?.twitter_creator) {
        metaTags.twitter_creator = metaSettings.twitter_creator
      }
    }

    return metaTags
  }

  // Generate meta tags for tag pages
  generateTagMetaTags(
    tag: Tag,
    site: Site,
    seoConfig?: SEOConfig,
    baseUrl?: string,
    articleCount?: number
  ): MetaTags {
    const metaSettings = seoConfig?.meta_settings
    const url = baseUrl ? `${baseUrl}/tags/${tag.slug}` : undefined

    const title = metaSettings?.default_title_template
      ? metaSettings.default_title_template
          .replace('{title}', tag.name)
          .replace('{site_name}', site.name)
      : `${tag.name} | ${site.name}`

    const description = tag.description ||
                      `Browse articles tagged with ${tag.name} on ${site.name}` +
                      (articleCount ? ` (${articleCount} articles)` : '') ||
                      metaSettings?.default_meta_description

    const metaTags: MetaTags = {
      title,
      description,
      keywords: [tag.name],
      canonical: url,
      robots: 'index, follow'
    }

    // Open Graph tags
    if (metaSettings?.enable_open_graph !== false) {
      metaTags.og_title = title
      metaTags.og_description = description
      metaTags.og_type = 'website'
      metaTags.og_url = url

      if (metaSettings?.og_image_default) {
        metaTags.og_image = metaSettings.og_image_default
      }
    }

    // Twitter Card tags
    if (metaSettings?.enable_twitter_cards !== false) {
      metaTags.twitter_card = 'summary'
      metaTags.twitter_title = title
      metaTags.twitter_description = description

      if (metaSettings?.twitter_site) {
        metaTags.twitter_site = metaSettings.twitter_site
      }
    }

    return metaTags
  }

  // Generate meta tags for homepage
  generateHomepageMetaTags(
    site: Site,
    seoConfig?: SEOConfig,
    baseUrl?: string
  ): MetaTags {
    const siteConfig = site.config
    const metaSettings = seoConfig?.meta_settings

    const title = siteConfig?.seo?.defaultTitle || site.name
    const description = siteConfig?.seo?.defaultDescription ||
                      site.description ||
                      metaSettings?.default_meta_description

    const metaTags: MetaTags = {
      title,
      description,
      keywords: siteConfig?.seo?.defaultKeywords || metaSettings?.default_keywords,
      canonical: baseUrl,
      robots: 'index, follow'
    }

    // Open Graph tags
    if (metaSettings?.enable_open_graph !== false) {
      metaTags.og_title = title
      metaTags.og_description = description
      metaTags.og_type = 'website'
      metaTags.og_url = baseUrl

      if (metaSettings?.og_image_default) {
        metaTags.og_image = metaSettings.og_image_default
      }
    }

    // Twitter Card tags
    if (metaSettings?.enable_twitter_cards !== false) {
      metaTags.twitter_card = 'summary'
      metaTags.twitter_title = title
      metaTags.twitter_description = description

      if (metaSettings?.twitter_site) {
        metaTags.twitter_site = metaSettings.twitter_site
      }
    }

    return metaTags
  }

  // Generate structured data for articles
  generateArticleStructuredData(
    article: Article,
    site: Site,
    seoConfig?: SEOConfig,
    baseUrl?: string
  ): StructuredData[] {
    const structuredData: StructuredData[] = []
    const schemaSettings = seoConfig?.schema_org_settings

    if (!schemaSettings?.enabled) {
      return structuredData
    }

    const articleSchema = schemaSettings.default_article_schema
    const url = baseUrl ? `${baseUrl}/articles/${article.slug}` : undefined

    // Article Schema
    const articleData: StructuredData = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description: article.meta_description || article.summary,
      url,
      datePublished: article.published_at || article.created_at,
      dateModified: article.updated_at
    }

    // Author
    if (article.author) {
      articleData.author = {
        '@type': articleSchema?.author_type || 'Person',
        name: article.author
      }
    }

    // Publisher
    if (schemaSettings.organization) {
      articleData.publisher = {
        '@type': 'Organization',
        name: schemaSettings.organization.name,
        logo: schemaSettings.organization.logo ? {
          '@type': 'ImageObject',
          url: schemaSettings.organization.logo
        } : undefined
      }
    }

    // Image
    if (article.cover_image) {
      articleData.image = {
        '@type': 'ImageObject',
        url: article.cover_image
      }
    }

    // Word count and reading time
    if (articleSchema?.word_count_enabled && article.content) {
      const wordCount = this.countWords(article.content)
      articleData.wordCount = wordCount

      if (articleSchema.reading_time_enabled) {
        articleData.timeRequired = `PT${Math.ceil(wordCount / 200)}M`
      }
    }

    // Article section
    if (articleSchema?.article_section && article.tags && article.tags.length > 0) {
      articleData.articleSection = article.tags[0].name
    }

    // Keywords
    if (article.meta_keywords) {
      articleData.keywords = article.meta_keywords
    } else if (article.tags) {
      articleData.keywords = article.tags.map(tag => tag.name).join(', ')
    }

    structuredData.push(articleData)

    // Breadcrumb Schema
    if (schemaSettings.breadcrumb_enabled && baseUrl) {
      const breadcrumbData: StructuredData = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: site.name,
            item: baseUrl
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Articles',
            item: `${baseUrl}/articles`
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: article.title,
            item: url
          }
        ]
      }

      structuredData.push(breadcrumbData)
    }

    return structuredData
  }

  // Generate structured data for website
  generateWebsiteStructuredData(
    site: Site,
    seoConfig?: SEOConfig,
    baseUrl?: string
  ): StructuredData[] {
    const structuredData: StructuredData[] = []
    const schemaSettings = seoConfig?.schema_org_settings

    if (!schemaSettings?.enabled) {
      return structuredData
    }

    // Website Schema
    if (schemaSettings.website) {
      const websiteData: StructuredData = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: schemaSettings.website.name,
        url: schemaSettings.website.url || baseUrl,
        description: schemaSettings.website.description || site.description
      }

      if (schemaSettings.website.potential_action) {
        websiteData.potentialAction = {
          '@type': 'SearchAction',
          target: schemaSettings.website.potential_action.target,
          'query-input': schemaSettings.website.potential_action.query_input
        }
      }

      if (schemaSettings.website.publisher) {
        websiteData.publisher = {
          '@type': 'Organization',
          name: schemaSettings.website.publisher
        }
      }

      structuredData.push(websiteData)
    }

    // Organization Schema
    if (schemaSettings.organization) {
      const orgData: StructuredData = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: schemaSettings.organization.name,
        url: schemaSettings.organization.url || baseUrl
      }

      if (schemaSettings.organization.logo) {
        orgData.logo = schemaSettings.organization.logo
      }

      if (schemaSettings.organization.same_as) {
        orgData.sameAs = schemaSettings.organization.same_as
      }

      if (schemaSettings.organization.contact_point) {
        orgData.contactPoint = {
          '@type': 'ContactPoint',
          telephone: schemaSettings.organization.contact_point.telephone,
          contactType: schemaSettings.organization.contact_point.contact_type,
          email: schemaSettings.organization.contact_point.email
        }
      }

      if (schemaSettings.organization.address) {
        orgData.address = {
          '@type': 'PostalAddress',
          streetAddress: schemaSettings.organization.address.street_address,
          addressLocality: schemaSettings.organization.address.address_locality,
          addressRegion: schemaSettings.organization.address.address_region,
          postalCode: schemaSettings.organization.address.postal_code,
          addressCountry: schemaSettings.organization.address.address_country
        }
      }

      structuredData.push(orgData)
    }

    return structuredData
  }

  // Generate structured data for tag pages
  generateTagStructuredData(
    tag: Tag,
    site: Site,
    articles: Article[],
    baseUrl?: string
  ): StructuredData[] {
    const structuredData: StructuredData[] = []

    // Collection Page Schema
    const collectionData: StructuredData = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${tag.name} - ${site.name}`,
      description: tag.description || `Articles tagged with ${tag.name}`,
      url: baseUrl ? `${baseUrl}/tags/${tag.slug}` : undefined,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: articles.length,
        itemListElement: articles.map((article, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'Article',
            headline: article.title,
            description: article.summary || article.meta_description,
            url: baseUrl ? `${baseUrl}/articles/${article.slug}` : undefined,
            datePublished: article.published_at || article.created_at,
            author: article.author ? {
              '@type': 'Person',
              name: article.author
            } : undefined,
            image: article.cover_image ? {
              '@type': 'ImageObject',
              url: article.cover_image
            } : undefined
          }
        }))
      }
    }

    structuredData.push(collectionData)

    return structuredData
  }

  // Convert meta tags to HTML
  renderMetaTagsHtml(metaTags: MetaTags): string {
    const tags: string[] = []

    if (metaTags.title) {
      tags.push(`<title>${this.escapeHtml(metaTags.title)}</title>`)
    }

    if (metaTags.description) {
      tags.push(`<meta name="description" content="${this.escapeHtml(metaTags.description)}">`)
    }

    if (metaTags.keywords && metaTags.keywords.length > 0) {
      tags.push(`<meta name="keywords" content="${this.escapeHtml(metaTags.keywords.join(', '))}">`)
    }

    if (metaTags.canonical) {
      tags.push(`<link rel="canonical" href="${this.escapeHtml(metaTags.canonical)}">`)
    }

    if (metaTags.author) {
      tags.push(`<meta name="author" content="${this.escapeHtml(metaTags.author)}">`)
    }

    if (metaTags.publisher) {
      tags.push(`<meta name="publisher" content="${this.escapeHtml(metaTags.publisher)}">`)
    }

    if (metaTags.robots) {
      tags.push(`<meta name="robots" content="${this.escapeHtml(metaTags.robots)}">`)
    }

    // Open Graph tags
    if (metaTags.og_title) {
      tags.push(`<meta property="og:title" content="${this.escapeHtml(metaTags.og_title)}">`)
    }

    if (metaTags.og_description) {
      tags.push(`<meta property="og:description" content="${this.escapeHtml(metaTags.og_description)}">`)
    }

    if (metaTags.og_type) {
      tags.push(`<meta property="og:type" content="${this.escapeHtml(metaTags.og_type)}">`)
    }

    if (metaTags.og_url) {
      tags.push(`<meta property="og:url" content="${this.escapeHtml(metaTags.og_url)}">`)
    }

    if (metaTags.og_image) {
      tags.push(`<meta property="og:image" content="${this.escapeHtml(metaTags.og_image)}">`)
    }

    // Twitter Card tags
    if (metaTags.twitter_card) {
      tags.push(`<meta name="twitter:card" content="${this.escapeHtml(metaTags.twitter_card)}">`)
    }

    if (metaTags.twitter_title) {
      tags.push(`<meta name="twitter:title" content="${this.escapeHtml(metaTags.twitter_title)}">`)
    }

    if (metaTags.twitter_description) {
      tags.push(`<meta name="twitter:description" content="${this.escapeHtml(metaTags.twitter_description)}">`)
    }

    if (metaTags.twitter_image) {
      tags.push(`<meta name="twitter:image" content="${this.escapeHtml(metaTags.twitter_image)}">`)
    }

    if (metaTags.twitter_site) {
      tags.push(`<meta name="twitter:site" content="${this.escapeHtml(metaTags.twitter_site)}">`)
    }

    if (metaTags.twitter_creator) {
      tags.push(`<meta name="twitter:creator" content="${this.escapeHtml(metaTags.twitter_creator)}">`)
    }

    return tags.join('\n')
  }

  // Convert structured data to JSON-LD
  renderStructuredDataHtml(structuredData: StructuredData[]): string {
    if (structuredData.length === 0) {
      return ''
    }

    const scripts = structuredData.map(data =>
      `<script type="application/ld+json">${JSON.stringify(data, null, 2)}</script>`
    )

    return scripts.join('\n')
  }

  // Utility methods
  private extractFirstParagraph(content?: string): string | undefined {
    if (!content) return undefined

    // Remove HTML tags and get first paragraph
    const plainText = content.replace(/<[^>]*>/g, '')
    const firstParagraph = plainText.split('\n\n')[0]

    return firstParagraph.length > 160
      ? firstParagraph.substring(0, 157) + '...'
      : firstParagraph
  }

  private countWords(content: string): number {
    return content.trim().split(/\s+/).length
  }

  private escapeHtml(text: string): string {
    const div = new (class {
      innerHTML: string = ''
      textContent: string = ''
      constructor() {}
    })()
    div.textContent = text
    return div.innerHTML || text.replace(/[&<>"']/g, (m) => {
      switch (m) {
        case '&': return '&amp;'
        case '<': return '&lt;'
        case '>': return '&gt;'
        case '"': return '&quot;'
        case "'": return '&#39;'
        default: return m
      }
    })
  }
}