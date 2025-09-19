// Data model type definitions for Multi-Site CMS

export interface Site {
  id: string
  domain: string
  name: string
  description?: string
  config?: SiteConfig
  status: 'active' | 'inactive' | 'suspended'
  created_at: string
  updated_at: string
}

export interface SiteConfig {
  theme?: string
  template?: string
  seo?: {
    defaultTitle?: string
    defaultDescription?: string
    defaultKeywords?: string[]
  }
  features?: {
    enableComments?: boolean
    enableSearch?: boolean
    enableSitemap?: boolean
  }
  customCss?: string
  customJs?: string
}

export interface Article {
  id: string
  site_id: string
  title: string
  slug: string
  content?: string
  summary?: string
  cover_image?: string
  meta_title?: string
  meta_description?: string
  meta_keywords?: string
  status: 'draft' | 'published' | 'archived'
  author?: string
  view_count: number
  created_at: string
  updated_at: string
  published_at?: string
  tags?: Tag[]
}

export interface Tag {
  id: string
  site_id: string
  name: string
  slug: string
  description?: string
  created_at: string
  article_count?: number
}

export interface ApiKey {
  id: string
  site_id: string
  key_hash: string
  name?: string
  permissions?: string[]
  last_used_at?: string
  expires_at?: string
  created_at: string
}

export interface CreateSiteInput {
  domain: string
  name: string
  description?: string
  config?: SiteConfig
}

export interface UpdateSiteInput {
  name?: string
  description?: string
  config?: SiteConfig
  status?: 'active' | 'inactive' | 'suspended'
}

export interface CreateArticleInput {
  site_id: string
  title: string
  slug?: string
  content?: string
  summary?: string
  cover_image?: string
  meta_title?: string
  meta_description?: string
  meta_keywords?: string
  status?: 'draft' | 'published'
  author?: string
  tags?: string[]
}

export interface UpdateArticleInput {
  title?: string
  slug?: string
  content?: string
  summary?: string
  cover_image?: string
  meta_title?: string
  meta_description?: string
  meta_keywords?: string
  status?: 'draft' | 'published' | 'archived'
  tags?: string[]
}

export interface PaginationParams {
  page?: number
  limit?: number
  sort?: 'asc' | 'desc'
  sortBy?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CreateTagInput {
  name: string
  slug?: string
  description?: string
}

export interface UpdateTagInput {
  name?: string
  slug?: string
  description?: string
}

export interface TagWithStats extends Tag {
  article_count: number
  recent_articles?: Article[]
}

export interface TagCloudItem {
  id: string
  name: string
  slug: string
  count: number
  weight: number // 0-1, for font size calculation
}

export interface TagSearchParams extends PaginationParams {
  search?: string
  withStats?: boolean
}

export interface RelatedArticlesParams {
  excludeId?: string
  limit?: number
  minCommonTags?: number
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    timestamp: string
    version: string
  }
}

export interface Domain {
  id: string
  site_id: string
  domain: string
  is_primary: boolean
  verification_status: 'pending' | 'verified' | 'failed'
  verification_method: 'dns' | 'file' | 'email'
  verification_token?: string
  verification_record?: string
  ssl_status: 'pending' | 'active' | 'failed' | 'disabled'
  ssl_certificate_id?: string
  ssl_expires_at?: string
  cf_zone_id?: string
  cf_zone_status?: string
  dns_configured: boolean
  created_at: string
  updated_at: string
  verified_at?: string
}

export interface DomainVerificationLog {
  id: string
  domain_id: string
  verification_type: 'dns_check' | 'ssl_check' | 'cf_api_check'
  status: 'success' | 'failed' | 'pending'
  details?: any
  error_message?: string
  checked_at: string
}

export interface CreateDomainInput {
  site_id: string
  domain: string
  is_primary?: boolean
  verification_method?: 'dns' | 'file' | 'email'
}

export interface UpdateDomainInput {
  is_primary?: boolean
  verification_method?: 'dns' | 'file' | 'email'
  ssl_status?: 'pending' | 'active' | 'failed' | 'disabled'
  dns_configured?: boolean
}

export interface DomainVerificationResult {
  domain: string
  verification_status: 'verified' | 'failed' | 'pending'
  ssl_status: 'active' | 'failed' | 'pending'
  dns_configured: boolean
  verification_details?: {
    dns_records?: Array<{
      name: string
      type: string
      value: string
      status: 'valid' | 'invalid' | 'missing'
    }>
    ssl_certificate?: {
      valid: boolean
      expires_at?: string
      issuer?: string
    }
    cloudflare_zone?: {
      id: string
      status: string
      name_servers?: string[]
    }
  }
  error_message?: string
}

export interface CloudflareZoneInfo {
  id: string
  name: string
  status: string
  name_servers: string[]
  development_mode: number
  original_name_servers: string[]
  original_registrar: string
  original_dnshost: string
  created_on: string
  modified_on: string
  activated_on: string
}

export interface CloudflareDNSRecord {
  id: string
  type: string
  name: string
  content: string
  proxiable: boolean
  proxied: boolean
  ttl: number
  locked: boolean
  zone_id: string
  zone_name: string
  created_on: string
  modified_on: string
}

export interface DomainSSLInfo {
  status: 'active' | 'pending' | 'disabled' | 'failed'
  certificate_authority: string
  type: string
  method: string
  hosts: string[]
  uploaded_on?: string
  expires_on?: string
  issuer: string
  serial_number: string
  signature: string
  bundle_method: string
}

// SEO Related Types

export interface SEOConfig {
  id: string
  site_id: string
  meta_settings: MetaSettings
  sitemap_settings: SitemapSettings
  internal_link_settings: InternalLinkSettings
  redirect_rules: RedirectRule[]
  robots_txt: string
  schema_org_settings: SchemaOrgSettings
  created_at: string
  updated_at: string
}

export interface MetaSettings {
  default_title_template?: string // e.g., "{title} | {site_name}"
  default_meta_description?: string
  default_keywords?: string[]
  og_image_default?: string
  twitter_card_type?: 'summary' | 'summary_large_image' | 'app' | 'player'
  twitter_site?: string
  twitter_creator?: string
  enable_auto_meta?: boolean
  enable_open_graph?: boolean
  enable_twitter_cards?: boolean
  enable_schema_org?: boolean
}

export interface SitemapSettings {
  enabled: boolean
  include_images: boolean
  include_articles: boolean
  include_tags: boolean
  exclude_patterns?: string[]
  priority_settings: {
    homepage: number
    articles: number
    tags: number
    pages: number
  }
  change_frequency: {
    homepage: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
    articles: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
    tags: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
    pages: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  }
}

export interface InternalLinkSettings {
  enabled: boolean
  max_links_per_article: number
  link_to_related_articles: boolean
  link_to_tags: boolean
  minimum_keyword_length: number
  exclude_words?: string[]
  link_class?: string
  only_link_once_per_article: boolean
}

export interface RedirectRule {
  id: string
  site_id: string
  from_path: string
  to_path: string
  redirect_type: 301 | 302 | 307 | 308
  is_regex: boolean
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface SchemaOrgSettings {
  enabled: boolean
  organization?: OrganizationSchema
  website?: WebsiteSchema
  default_article_schema?: ArticleSchema
  breadcrumb_enabled: boolean
  faq_enabled: boolean
}

export interface OrganizationSchema {
  name: string
  logo?: string
  url?: string
  same_as?: string[] // Social media URLs
  contact_point?: {
    telephone?: string
    contact_type?: string
    email?: string
  }
  address?: {
    street_address?: string
    address_locality?: string
    address_region?: string
    postal_code?: string
    address_country?: string
  }
}

export interface WebsiteSchema {
  name: string
  url: string
  description?: string
  publisher?: string
  potential_action?: {
    target: string
    query_input: string
  }
}

export interface ArticleSchema {
  author_type: 'Person' | 'Organization'
  publisher_type: 'Person' | 'Organization'
  image_required: boolean
  article_section?: string
  word_count_enabled: boolean
  reading_time_enabled: boolean
}

export interface SitemapEntry {
  loc: string
  lastmod?: string
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
  images?: SitemapImage[]
}

export interface SitemapImage {
  loc: string
  caption?: string
  title?: string
}

export interface MetaTags {
  title?: string
  description?: string
  keywords?: string[]
  canonical?: string
  og_title?: string
  og_description?: string
  og_image?: string
  og_url?: string
  og_type?: string
  twitter_card?: string
  twitter_title?: string
  twitter_description?: string
  twitter_image?: string
  twitter_site?: string
  twitter_creator?: string
  robots?: string
  author?: string
  publisher?: string
}

export interface StructuredData {
  '@context': string
  '@type': string
  [key: string]: any
}

export interface SEOAnalysis {
  score: number
  issues: SEOIssue[]
  recommendations: SEORecommendation[]
  metrics: SEOMetrics
}

export interface SEOIssue {
  type: 'error' | 'warning' | 'info'
  category: 'meta' | 'content' | 'technical' | 'links' | 'images'
  message: string
  element?: string
  suggestion?: string
}

export interface SEORecommendation {
  priority: 'high' | 'medium' | 'low'
  category: 'meta' | 'content' | 'technical' | 'links' | 'images'
  title: string
  description: string
  action: string
}

export interface SEOMetrics {
  title_length?: number
  description_length?: number
  keyword_density?: { [keyword: string]: number }
  word_count?: number
  heading_structure?: HeadingAnalysis
  internal_links_count?: number
  external_links_count?: number
  images_without_alt?: number
  reading_time?: number
}

export interface HeadingAnalysis {
  h1_count: number
  h2_count: number
  h3_count: number
  h4_count: number
  h5_count: number
  h6_count: number
  structure_valid: boolean
  missing_h1: boolean
}

export interface InternalLink {
  id: string
  site_id: string
  from_article_id: string
  to_article_id?: string
  to_tag_id?: string
  to_url?: string
  anchor_text: string
  context: string
  position: number
  created_at: string
  click_count: number
}

export interface CreateSEOConfigInput {
  site_id: string
  meta_settings?: Partial<MetaSettings>
  sitemap_settings?: Partial<SitemapSettings>
  internal_link_settings?: Partial<InternalLinkSettings>
  redirect_rules?: Omit<RedirectRule, 'id' | 'created_at' | 'updated_at'>[]
  robots_txt?: string
  schema_org_settings?: Partial<SchemaOrgSettings>
}

export interface UpdateSEOConfigInput {
  meta_settings?: Partial<MetaSettings>
  sitemap_settings?: Partial<SitemapSettings>
  internal_link_settings?: Partial<InternalLinkSettings>
  redirect_rules?: Omit<RedirectRule, 'id' | 'created_at' | 'updated_at'>[]
  robots_txt?: string
  schema_org_settings?: Partial<SchemaOrgSettings>
}

export interface CreateRedirectRuleInput {
  site_id: string
  from_path: string
  to_path: string
  redirect_type?: 301 | 302 | 307 | 308
  is_regex?: boolean
  enabled?: boolean
}

export interface UpdateRedirectRuleInput {
  from_path?: string
  to_path?: string
  redirect_type?: 301 | 302 | 307 | 308
  is_regex?: boolean
  enabled?: boolean
}