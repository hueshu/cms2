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