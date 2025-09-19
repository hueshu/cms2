// 路由配置文件 - 定义站点的路由规则和页面映射
export interface RoutePattern {
  path: string
  template: string
  type: 'static' | 'dynamic' | 'collection'
  params?: Record<string, {
    type: 'string' | 'number' | 'slug'
    required?: boolean
    pattern?: string
  }>
  metadata?: {
    title?: string
    description?: string
    keywords?: string[]
  }
  redirect?: {
    to: string
    code: 301 | 302
    condition?: string
  }
  cache?: {
    ttl: number
    varyBy?: string[]
  }
}

export interface SitemapEntry {
  url: string
  lastModified?: string
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
}

export interface RSSFeedConfig {
  title: string
  description: string
  link: string
  language?: string
  copyright?: string
  managingEditor?: string
  webMaster?: string
  category?: string
  ttl?: number
  image?: {
    url: string
    title: string
    link: string
    width?: number
    height?: number
  }
}

export interface RobotsConfig {
  userAgent: string
  allow?: string[]
  disallow?: string[]
  crawlDelay?: number
  sitemap?: string[]
}

export interface RouteConfig {
  routes: RoutePattern[]
  sitemap: {
    enabled: boolean
    path: string
    excludePatterns?: string[]
    staticEntries?: SitemapEntry[]
  }
  rss: {
    enabled: boolean
    path: string
    config: RSSFeedConfig
    articlesLimit?: number
  }
  robots: {
    enabled: boolean
    path: string
    rules: RobotsConfig[]
  }
  redirects: Array<{
    from: string
    to: string
    code: 301 | 302
  }>
  errorPages: {
    404: string
    500: string
  }
}

// 默认路由配置
export const defaultRoutes: RouteConfig = {
  routes: [
    // 首页
    {
      path: '/',
      template: 'index',
      type: 'static',
      metadata: {
        title: '首页',
        description: '网站首页'
      },
      cache: {
        ttl: 3600, // 1小时缓存
        varyBy: ['Accept-Language']
      }
    },

    // 关于页面
    {
      path: '/about',
      template: 'page',
      type: 'static',
      metadata: {
        title: '关于我们',
        description: '了解更多关于我们的信息'
      },
      cache: {
        ttl: 86400 // 24小时缓存
      }
    },

    // 文章详情页
    {
      path: '/articles/:slug',
      template: 'article',
      type: 'dynamic',
      params: {
        slug: {
          type: 'slug',
          required: true,
          pattern: '^[a-z0-9-]+$'
        }
      },
      metadata: {
        title: '{{article.title}}',
        description: '{{article.summary}}',
        keywords: ['{{#each article.tags}}{{name}}{{#unless @last}},{{/unless}}{{/each}}']
      },
      cache: {
        ttl: 1800, // 30分钟缓存
        varyBy: ['Accept-Language', 'User-Agent']
      }
    },

    // 文章列表页
    {
      path: '/articles',
      template: 'list',
      type: 'collection',
      metadata: {
        title: '文章列表',
        description: '浏览所有文章'
      },
      cache: {
        ttl: 600 // 10分钟缓存
      }
    },

    // 分页文章列表
    {
      path: '/articles/page/:page',
      template: 'list',
      type: 'dynamic',
      params: {
        page: {
          type: 'number',
          required: true,
          pattern: '^[1-9]\\d*$'
        }
      },
      metadata: {
        title: '文章列表 - 第{{page}}页',
        description: '浏览所有文章，第{{page}}页'
      },
      cache: {
        ttl: 600
      }
    },

    // 标签页
    {
      path: '/tags/:tag',
      template: 'tag',
      type: 'dynamic',
      params: {
        tag: {
          type: 'slug',
          required: true,
          pattern: '^[a-z0-9-]+$'
        }
      },
      metadata: {
        title: '标签：{{tag.name}}',
        description: '查看标签"{{tag.name}}"的所有文章'
      },
      cache: {
        ttl: 1800
      }
    },

    // 标签列表
    {
      path: '/tags',
      template: 'tags',
      type: 'collection',
      metadata: {
        title: '标签云',
        description: '浏览所有标签'
      },
      cache: {
        ttl: 3600
      }
    },

    // 搜索页面
    {
      path: '/search',
      template: 'search',
      type: 'static',
      metadata: {
        title: '搜索',
        description: '搜索文章内容'
      },
      cache: {
        ttl: 0 // 不缓存搜索页面
      }
    },

    // API路由（如果需要）
    {
      path: '/api/search',
      template: 'json',
      type: 'dynamic',
      cache: {
        ttl: 300,
        varyBy: ['Accept', 'Content-Type']
      }
    }
  ],

  // 网站地图配置
  sitemap: {
    enabled: true,
    path: '/sitemap.xml',
    excludePatterns: [
      '/api/*',
      '/admin/*',
      '*.json'
    ],
    staticEntries: [
      {
        url: '/',
        changeFrequency: 'weekly',
        priority: 1.0
      },
      {
        url: '/about',
        changeFrequency: 'monthly',
        priority: 0.8
      },
      {
        url: '/articles',
        changeFrequency: 'daily',
        priority: 0.9
      },
      {
        url: '/tags',
        changeFrequency: 'weekly',
        priority: 0.7
      }
    ]
  },

  // RSS配置
  rss: {
    enabled: true,
    path: '/feed.xml',
    articlesLimit: 20,
    config: {
      title: '{{site.name}}',
      description: '{{site.description}}',
      link: '{{site.url}}',
      language: 'zh-CN',
      copyright: 'Copyright {{currentYear}} {{site.name}}',
      managingEditor: '{{site.author}}',
      webMaster: '{{site.author}}',
      category: 'Technology',
      ttl: 60,
      image: {
        url: '{{site.url}}/logo.png',
        title: '{{site.name}}',
        link: '{{site.url}}',
        width: 144,
        height: 144
      }
    }
  },

  // robots.txt配置
  robots: {
    enabled: true,
    path: '/robots.txt',
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: [
          '/api/',
          '/admin/',
          '/*.json$',
          '/search?*'
        ],
        crawlDelay: 1,
        sitemap: ['/sitemap.xml']
      },
      {
        userAgent: 'Googlebot',
        allow: ['/'],
        disallow: ['/api/', '/admin/'],
        sitemap: ['/sitemap.xml']
      }
    ]
  },

  // 重定向规则
  redirects: [
    {
      from: '/blog/:slug',
      to: '/articles/:slug',
      code: 301
    },
    {
      from: '/post/:slug',
      to: '/articles/:slug',
      code: 301
    },
    {
      from: '/category/:tag',
      to: '/tags/:tag',
      code: 301
    }
  ],

  // 错误页面
  errorPages: {
    404: '404',
    500: 'error'
  }
}

// 路由模式匹配工具函数
export class RoutePattern {
  private pattern: RegExp
  private paramNames: string[] = []

  constructor(private path: string) {
    this.compile()
  }

  private compile(): void {
    const paramPattern = /:([a-zA-Z_][a-zA-Z0-9_]*)/g
    let regexPattern = this.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    let match
    while ((match = paramPattern.exec(this.path)) !== null) {
      this.paramNames.push(match[1])
      regexPattern = regexPattern.replace(`:${match[1]}`, '([^/]+)')
    }

    this.pattern = new RegExp(`^${regexPattern}$`)
  }

  match(url: string): { matches: boolean; params: Record<string, string> } {
    const match = this.pattern.exec(url)
    if (!match) {
      return { matches: false, params: {} }
    }

    const params: Record<string, string> = {}
    for (let i = 0; i < this.paramNames.length; i++) {
      params[this.paramNames[i]] = match[i + 1]
    }

    return { matches: true, params }
  }

  static create(path: string): RoutePattern {
    return new RoutePattern(path)
  }
}

// 工具函数：验证参数
export function validateRouteParam(
  value: string,
  config: RoutePattern['params'][string]
): boolean {
  if (!config) return true

  // 检查是否必需
  if (config.required && !value) {
    return false
  }

  // 检查模式匹配
  if (config.pattern) {
    const regex = new RegExp(config.pattern)
    if (!regex.test(value)) {
      return false
    }
  }

  // 检查类型
  switch (config.type) {
    case 'number':
      return !isNaN(Number(value))
    case 'slug':
      return /^[a-z0-9-]+$/.test(value)
    case 'string':
    default:
      return true
  }
}

// 工具函数：构建URL
export function buildUrl(pattern: string, params: Record<string, string>): string {
  let url = pattern
  for (const [key, value] of Object.entries(params)) {
    url = url.replace(`:${key}`, encodeURIComponent(value))
  }
  return url
}