/**
 * SEO Service Usage Examples
 *
 * This file demonstrates how to use the SEO optimization suite
 * including meta tags, sitemaps, internal links, and SEO analysis.
 */

import { DatabaseService } from '../utils/database'
import { SEOService } from './seoService'
import { MetaTagService } from './metaTagService'
import { SitemapService } from './sitemapService'
import { InternalLinkService } from './internalLinkService'
import {
  CreateSEOConfigInput,
  UpdateSEOConfigInput,
  CreateRedirectRuleInput,
  Article,
  Site,
  Tag
} from '../models/types'

// Example: Initialize SEO services
export function initializeSEOServices(database: D1Database) {
  const db = new DatabaseService(database)

  return {
    seoService: new SEOService(db),
    metaTagService: new MetaTagService(),
    sitemapService: new SitemapService(db),
    internalLinkService: new InternalLinkService(db)
  }
}

// Example: Create comprehensive SEO configuration
export async function createComprehensiveSEOConfig(
  seoService: SEOService,
  siteId: string
): Promise<void> {
  const seoConfig: CreateSEOConfigInput = {
    site_id: siteId,

    // Meta tags configuration
    meta_settings: {
      default_title_template: '{title} | My Awesome Blog',
      default_meta_description: 'Discover amazing content on our blog about technology, programming, and innovation.',
      default_keywords: ['technology', 'programming', 'innovation', 'blog'],
      og_image_default: 'https://myblog.com/images/og-default.jpg',
      twitter_card_type: 'summary_large_image',
      twitter_site: '@myblog',
      twitter_creator: '@author',
      enable_auto_meta: true,
      enable_open_graph: true,
      enable_twitter_cards: true,
      enable_schema_org: true
    },

    // Sitemap configuration
    sitemap_settings: {
      enabled: true,
      include_images: true,
      include_articles: true,
      include_tags: true,
      exclude_patterns: ['/admin/*', '/private/*', '/temp/*'],
      priority_settings: {
        homepage: 1.0,
        articles: 0.8,
        tags: 0.6,
        pages: 0.7
      },
      change_frequency: {
        homepage: 'daily',
        articles: 'weekly',
        tags: 'monthly',
        pages: 'monthly'
      }
    },

    // Internal linking configuration
    internal_link_settings: {
      enabled: true,
      max_links_per_article: 8,
      link_to_related_articles: true,
      link_to_tags: true,
      minimum_keyword_length: 4,
      only_link_once_per_article: true,
      link_class: 'internal-link',
      exclude_words: [
        'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
        'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
        'above', 'below', 'over', 'under', 'again', 'further', 'then', 'once'
      ]
    },

    // Schema.org structured data configuration
    schema_org_settings: {
      enabled: true,
      breadcrumb_enabled: true,
      faq_enabled: false,
      organization: {
        name: 'My Awesome Blog',
        logo: 'https://myblog.com/images/logo.png',
        url: 'https://myblog.com',
        same_as: [
          'https://twitter.com/myblog',
          'https://facebook.com/myblog',
          'https://linkedin.com/company/myblog'
        ],
        contact_point: {
          telephone: '+1-555-0123',
          contact_type: 'customer service',
          email: 'contact@myblog.com'
        },
        address: {
          street_address: '123 Tech Street',
          address_locality: 'San Francisco',
          address_region: 'CA',
          postal_code: '94102',
          address_country: 'US'
        }
      },
      website: {
        name: 'My Awesome Blog',
        url: 'https://myblog.com',
        description: 'The best technology blog on the internet',
        publisher: 'My Awesome Blog',
        potential_action: {
          target: 'https://myblog.com/search?q={search_term_string}',
          query_input: 'required name=search_term_string'
        }
      },
      default_article_schema: {
        author_type: 'Person',
        publisher_type: 'Organization',
        image_required: true,
        article_section: 'Technology',
        word_count_enabled: true,
        reading_time_enabled: true
      }
    },

    // Common redirect rules
    redirect_rules: [
      {
        from_path: '/blog/(.*)',
        to_path: '/articles/$1',
        redirect_type: 301,
        is_regex: true,
        enabled: true
      },
      {
        from_path: '/category/tech',
        to_path: '/tags/technology',
        redirect_type: 301,
        is_regex: false,
        enabled: true
      },
      {
        from_path: '/old-about',
        to_path: '/about',
        redirect_type: 301,
        is_regex: false,
        enabled: true
      }
    ],

    // Custom robots.txt
    robots_txt: `User-agent: *
Disallow: /admin/
Disallow: /api/
Disallow: /private/
Disallow: /temp/
Allow: /api/sitemap.xml
Allow: /api/robots.txt

# Specific bot rules
User-agent: Googlebot
Crawl-delay: 1

User-agent: Bingbot
Crawl-delay: 2

# Sitemap location
Sitemap: {site_url}/sitemap.xml
Sitemap: {site_url}/sitemap-news.xml`
  }

  await seoService.createSEOConfig(seoConfig)
  console.log('Comprehensive SEO configuration created successfully!')
}

// Example: Generate complete meta tags for an article
export async function generateCompleteMetaTags(
  metaTagService: MetaTagService,
  seoService: SEOService,
  article: Article,
  site: Site,
  baseUrl: string
) {
  // Get SEO configuration
  const seoConfig = await seoService.getSEOConfig(site.id)

  // Generate meta tags
  const metaTags = metaTagService.generateArticleMetaTags(
    article,
    site,
    seoConfig,
    baseUrl
  )

  // Generate structured data
  const structuredData = metaTagService.generateArticleStructuredData(
    article,
    site,
    seoConfig,
    baseUrl
  )

  // Render HTML
  const metaTagsHtml = metaTagService.renderMetaTagsHtml(metaTags)
  const structuredDataHtml = metaTagService.renderStructuredDataHtml(structuredData)

  return {
    metaTags,
    structuredData,
    html: {
      metaTags: metaTagsHtml,
      structuredData: structuredDataHtml,
      complete: `${metaTagsHtml}\n${structuredDataHtml}`
    }
  }
}

// Example: Generate and submit sitemaps
export async function generateAndSubmitSitemaps(
  sitemapService: SitemapService,
  seoService: SEOService,
  siteId: string,
  baseUrl: string
) {
  const seoConfig = await seoService.getSEOConfig(siteId)

  // Generate main sitemap
  const mainSitemap = await sitemapService.generateSitemap(siteId, baseUrl, seoConfig)
  console.log('Main sitemap generated')

  // Generate specialized sitemaps
  const articlesSitemap = await sitemapService.generateArticlesSitemap(siteId, baseUrl, seoConfig)
  const tagsSitemap = await sitemapService.generateTagsSitemap(siteId, baseUrl, seoConfig)
  const imagesSitemap = await sitemapService.generateImagesSitemap(siteId, baseUrl, seoConfig)
  const newsSitemap = await sitemapService.generateNewsSitemap(siteId, baseUrl, seoConfig)

  console.log('All specialized sitemaps generated')

  // Generate sitemap index
  const sitemapIndex = await sitemapService.generateSitemapIndex(siteId, baseUrl, seoConfig)
  console.log('Sitemap index generated')

  // Validate main sitemap
  const validation = await sitemapService.validateSitemap(siteId, baseUrl)
  console.log('Sitemap validation:', validation)

  if (validation.valid) {
    // Submit to search engines
    const submission = await sitemapService.submitSitemap(siteId, `${baseUrl}/sitemap.xml`)
    console.log('Sitemap submission results:', submission)
  }

  return {
    sitemaps: {
      main: mainSitemap,
      articles: articlesSitemap,
      tags: tagsSitemap,
      images: imagesSitemap,
      news: newsSitemap,
      index: sitemapIndex
    },
    validation,
    submission: validation.valid ? await sitemapService.submitSitemap(siteId, `${baseUrl}/sitemap.xml`) : null
  }
}

// Example: Process internal links for multiple articles
export async function processInternalLinksForSite(
  internalLinkService: InternalLinkService,
  seoService: SEOService,
  siteId: string,
  articleIds: string[]
) {
  const seoConfig = await seoService.getSEOConfig(siteId)
  const results = []

  for (const articleId of articleIds) {
    try {
      // Get article content (this would come from your article service)
      const article = await getArticleById(articleId) // You'd implement this

      if (article && article.content) {
        const result = await internalLinkService.processArticleLinks(
          articleId,
          article.content,
          seoConfig
        )

        results.push({
          articleId,
          title: article.title,
          linksAdded: result.addedLinks.length,
          processedContent: result.content
        })

        console.log(`Processed ${result.addedLinks.length} internal links for "${article.title}"`)
      }
    } catch (error) {
      console.error(`Error processing article ${articleId}:`, error)
      results.push({
        articleId,
        error: error.message
      })
    }
  }

  return results
}

// Example: Comprehensive SEO analysis
export async function comprehensiveSEOAnalysis(
  seoService: SEOService,
  internalLinkService: InternalLinkService,
  articles: Article[],
  siteId: string
) {
  const analysisResults = []

  for (const article of articles) {
    const analysis = await seoService.analyzeSEO(article)
    const backlinks = await internalLinkService.getArticleBacklinks(article.id)
    const internalLinks = await internalLinkService.getArticleInternalLinks(article.id)

    analysisResults.push({
      article: {
        id: article.id,
        title: article.title,
        slug: article.slug
      },
      seoScore: analysis.score,
      issues: analysis.issues,
      recommendations: analysis.recommendations,
      metrics: analysis.metrics,
      linkMetrics: {
        internalLinksOut: internalLinks.length,
        backlinksIn: backlinks.length,
        linkRatio: internalLinks.length > 0 ? backlinks.length / internalLinks.length : 0
      }
    })
  }

  // Generate site-wide analytics
  const internalLinksAnalytics = await internalLinkService.getInternalLinksAnalytics(siteId)

  return {
    articles: analysisResults,
    sitewide: {
      averageSEOScore: analysisResults.reduce((sum, r) => sum + r.seoScore, 0) / analysisResults.length,
      totalIssues: analysisResults.reduce((sum, r) => sum + r.issues.length, 0),
      internalLinksAnalytics
    },
    recommendations: {
      topPriorityIssues: analysisResults
        .flatMap(r => r.issues.filter(i => i.type === 'error'))
        .slice(0, 10),
      improvementSuggestions: [
        'Consider increasing internal linking between related articles',
        'Optimize meta descriptions for articles with missing or short descriptions',
        'Add alt text to images without accessibility descriptions',
        'Ensure consistent heading structure across all articles'
      ]
    }
  }
}

// Example: Set up automated SEO tasks
export async function setupAutomatedSEOTasks(
  services: ReturnType<typeof initializeSEOServices>,
  siteId: string,
  baseUrl: string
) {
  const { seoService, sitemapService, internalLinkService } = services

  // Task 1: Daily sitemap generation and submission
  const dailySitemapTask = async () => {
    try {
      const sitemap = await sitemapService.generateSitemap(siteId, baseUrl)
      const validation = await sitemapService.validateSitemap(siteId, baseUrl)

      if (validation.valid) {
        await sitemapService.submitSitemap(siteId, `${baseUrl}/sitemap.xml`)
        console.log(`✅ Daily sitemap updated and submitted for site ${siteId}`)
      } else {
        console.error(`❌ Sitemap validation failed for site ${siteId}:`, validation.errors)
      }
    } catch (error) {
      console.error(`❌ Daily sitemap task failed for site ${siteId}:`, error)
    }
  }

  // Task 2: Weekly internal links optimization
  const weeklyInternalLinksTask = async () => {
    try {
      const analytics = await internalLinkService.getInternalLinksAnalytics(siteId)
      console.log(`📊 Internal links analytics for site ${siteId}:`, analytics)

      // You could implement logic here to automatically optimize internal links
      // based on the analytics data
    } catch (error) {
      console.error(`❌ Weekly internal links task failed for site ${siteId}:`, error)
    }
  }

  // Task 3: Monthly SEO health check
  const monthlySEOHealthCheck = async () => {
    try {
      // This would require fetching all articles for the site
      // const articles = await getAllArticlesForSite(siteId)
      // const healthReport = await comprehensiveSEOAnalysis(seoService, internalLinkService, articles, siteId)
      // console.log(`📈 Monthly SEO health report for site ${siteId}:`, healthReport)
    } catch (error) {
      console.error(`❌ Monthly SEO health check failed for site ${siteId}:`, error)
    }
  }

  return {
    dailySitemapTask,
    weeklyInternalLinksTask,
    monthlySEOHealthCheck
  }
}

// Helper function examples
async function getArticleById(articleId: string): Promise<Article | null> {
  // This would be implemented using your ArticleService
  // For demonstration purposes, returning null
  return null
}

// Example usage in a Cloudflare Worker
export async function handleSEORequest(
  request: Request,
  env: { DB: D1Database }
): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname

  const services = initializeSEOServices(env.DB)

  try {
    if (path.endsWith('/sitemap.xml')) {
      // Extract site ID from domain or path
      const siteId = extractSiteIdFromRequest(request)
      const baseUrl = `${url.protocol}//${url.host}`

      const sitemap = await services.sitemapService.generateSitemap(siteId, baseUrl)

      return new Response(sitemap, {
        headers: {
          'Content-Type': 'application/xml',
          'Cache-Control': 'public, max-age=3600'
        }
      })
    }

    if (path.endsWith('/robots.txt')) {
      const siteId = extractSiteIdFromRequest(request)
      const baseUrl = `${url.protocol}//${url.host}`

      const robotsTxt = await services.seoService.getRobotsTxt(siteId, baseUrl)

      return new Response(robotsTxt, {
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'public, max-age=86400'
        }
      })
    }

    return new Response('Not Found', { status: 404 })
  } catch (error) {
    console.error('SEO request handling error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

function extractSiteIdFromRequest(request: Request): string {
  // Implementation would extract site ID from domain or headers
  // For demonstration purposes
  return 'default-site-id'
}