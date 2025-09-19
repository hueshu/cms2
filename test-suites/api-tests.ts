import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Env } from '../cf-cms-worker/src/index'

/**
 * API测试套件
 * 完整测试所有API端点的功能和错误处理
 */

// 测试环境配置
const TEST_ENV: Env = {
  DB: {} as D1Database,
  CACHE_KV: {} as KVNamespace,
  ENVIRONMENT: 'test',
  JWT_SECRET: 'test-jwt-secret',
  CLOUDFLARE_API_TOKEN: 'test-token',
  CLOUDFLARE_API_EMAIL: 'test@example.com'
}

const BASE_URL = 'http://localhost:8787'
const API_BASE = `${BASE_URL}/api/v1`

// 测试数据
const testSite = {
  name: '测试站点',
  domain: 'test.example.com',
  description: '这是一个测试站点',
  settings: {
    theme: 'default',
    seo: {
      title: '测试站点',
      description: '测试站点描述',
      keywords: ['测试', 'CMS']
    }
  }
}

const testArticle = {
  title: '测试文章',
  content: '这是一篇测试文章的内容',
  excerpt: '测试文章摘要',
  status: 'published' as const,
  tags: ['测试', '文章'],
  seo: {
    title: '测试文章 - SEO标题',
    description: '测试文章的SEO描述',
    keywords: ['测试', '文章', 'CMS']
  }
}

let authToken: string
let testSiteId: string
let testArticleId: string

describe('认证API测试', () => {
  it('应该能够成功登录', async () => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword123'
      })
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.token).toBeDefined()
    authToken = data.data.token
  })

  it('登录失败时应该返回错误', async () => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'wrong@example.com',
        password: 'wrongpassword'
      })
    })

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.success).toBe(false)
  })

  it('应该能够刷新令牌', async () => {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.token).toBeDefined()
  })
})

describe('站点管理API测试', () => {
  it('应该能够创建新站点', async () => {
    const response = await fetch(`${API_BASE}/sites`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testSite)
    })

    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.name).toBe(testSite.name)
    expect(data.data.domain).toBe(testSite.domain)
    testSiteId = data.data.id
  })

  it('应该能够获取站点列表', async () => {
    const response = await fetch(`${API_BASE}/sites`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
    expect(data.pagination).toBeDefined()
  })

  it('应该能够获取单个站点', async () => {
    const response = await fetch(`${API_BASE}/sites/${testSiteId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.id).toBe(testSiteId)
    expect(data.data.name).toBe(testSite.name)
  })

  it('应该能够更新站点', async () => {
    const updateData = { name: '更新后的站点名称' }
    const response = await fetch(`${API_BASE}/sites/${testSiteId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.name).toBe(updateData.name)
  })

  it('获取不存在的站点应该返回404', async () => {
    const response = await fetch(`${API_BASE}/sites/non-existent-id`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    })

    expect(response.status).toBe(404)
  })
})

describe('文章管理API测试', () => {
  it('应该能够创建新文章', async () => {
    const response = await fetch(`${API_BASE}/articles/${testSiteId}`, {
      method: 'POST',
      headers: {
        'X-API-Key': 'test-api-key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testArticle)
    })

    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.title).toBe(testArticle.title)
    expect(data.data.content).toBe(testArticle.content)
    testArticleId = data.data.id
  })

  it('应该能够获取文章列表', async () => {
    const response = await fetch(`${API_BASE}/articles/${testSiteId}?page=1&limit=10`, {
      headers: { 'X-API-Key': 'test-api-key' }
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
  })

  it('应该能够获取单个文章', async () => {
    const response = await fetch(`${API_BASE}/articles/${testSiteId}/${testArticleId}`, {
      headers: { 'X-API-Key': 'test-api-key' }
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.id).toBe(testArticleId)
  })

  it('应该能够更新文章', async () => {
    const updateData = { title: '更新后的文章标题' }
    const response = await fetch(`${API_BASE}/articles/${testSiteId}/${testArticleId}`, {
      method: 'PUT',
      headers: {
        'X-API-Key': 'test-api-key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.title).toBe(updateData.title)
  })

  it('应该能够按标签过滤文章', async () => {
    const response = await fetch(`${API_BASE}/articles/${testSiteId}?tags=测试`, {
      headers: { 'X-API-Key': 'test-api-key' }
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
  })

  it('应该能够按状态过滤文章', async () => {
    const response = await fetch(`${API_BASE}/articles/${testSiteId}?status=published`, {
      headers: { 'X-API-Key': 'test-api-key' }
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
  })
})

describe('标签管理API测试', () => {
  it('应该能够获取标签列表', async () => {
    const response = await fetch(`${API_BASE}/tags/${testSiteId}`, {
      headers: { 'X-API-Key': 'test-api-key' }
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
  })

  it('应该能够创建新标签', async () => {
    const tagData = { name: '新标签', description: '这是一个新标签' }
    const response = await fetch(`${API_BASE}/tags/${testSiteId}`, {
      method: 'POST',
      headers: {
        'X-API-Key': 'test-api-key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tagData)
    })

    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.name).toBe(tagData.name)
  })
})

describe('图片管理API测试', () => {
  it('应该能够生成图片', async () => {
    const imageData = {
      text: '测试图片',
      width: 800,
      height: 600,
      fontSize: 32,
      fontColor: '#ffffff',
      backgroundColor: '#007bff'
    }

    const response = await fetch(`${API_BASE}/images/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(imageData)
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('image/')
  })

  it('应该能够生成不同尺寸的图片', async () => {
    const imageData = {
      text: '测试图片',
      width: 1200,
      height: 630,
      template: 'social'
    }

    const response = await fetch(`${API_BASE}/images/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(imageData)
    })

    expect(response.status).toBe(200)
  })
})

describe('SEO API测试', () => {
  it('应该能够获取站点地图', async () => {
    const response = await fetch(`${API_BASE}/seo/${testSiteId}/sitemap`, {
      headers: { 'X-API-Key': 'test-api-key' }
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/xml')
  })

  it('应该能够获取robots.txt', async () => {
    const response = await fetch(`${API_BASE}/seo/${testSiteId}/robots`, {
      headers: { 'X-API-Key': 'test-api-key' }
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/plain')
  })

  it('应该能够分析SEO', async () => {
    const response = await fetch(`${API_BASE}/seo/${testSiteId}/analyze/${testArticleId}`, {
      headers: { 'X-API-Key': 'test-api-key' }
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.score).toBeDefined()
    expect(data.data.recommendations).toBeDefined()
  })
})

describe('CDN API测试', () => {
  it('应该能够清除缓存', async () => {
    const response = await fetch(`${API_BASE}/cdn/purge`, {
      method: 'POST',
      headers: {
        'X-API-Key': 'test-api-key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        files: [`https://${testSite.domain}/`]
      })
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
  })

  it('应该能够获取缓存统计', async () => {
    const response = await fetch(`${API_BASE}/cdn/stats`, {
      headers: { 'X-API-Key': 'test-api-key' }
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
  })
})

describe('域名管理API测试', () => {
  it('应该能够验证域名', async () => {
    const response = await fetch(`${API_BASE}/domains/verify`, {
      method: 'POST',
      headers: {
        'X-API-Key': 'test-api-key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ domain: testSite.domain })
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.status).toBeDefined()
  })
})

describe('性能和健康检查测试', () => {
  it('应该能够获取健康状态', async () => {
    const response = await fetch(`${BASE_URL}/api/health`)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.status).toBe('healthy')
  })

  it('应该能够获取性能报告', async () => {
    const response = await fetch(`${BASE_URL}/api/performance`)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
  })

  it('根路径应该返回服务信息', async () => {
    const response = await fetch(BASE_URL)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.service).toBe('cf-cms-worker')
  })
})

describe('错误处理和边界条件测试', () => {
  it('无效的API密钥应该返回401', async () => {
    const response = await fetch(`${API_BASE}/articles/${testSiteId}`, {
      headers: { 'X-API-Key': 'invalid-key' }
    })

    expect(response.status).toBe(401)
  })

  it('无效的JWT令牌应该返回401', async () => {
    const response = await fetch(`${API_BASE}/sites`, {
      headers: { 'Authorization': 'Bearer invalid-token' }
    })

    expect(response.status).toBe(401)
  })

  it('缺少必填字段应该返回400', async () => {
    const response = await fetch(`${API_BASE}/sites`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: '' }) // 缺少必填字段
    })

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.success).toBe(false)
  })

  it('超出限制的请求应该被限流', async () => {
    // 快速发送多个请求测试限流
    const promises = Array(20).fill(0).map(() =>
      fetch(`${BASE_URL}/api/health`)
    )

    const responses = await Promise.all(promises)
    const rateLimitedResponse = responses.find(r => r.status === 429)

    // 至少有一个请求应该被限流
    expect(rateLimitedResponse).toBeDefined()
  })

  it('不存在的端点应该返回404', async () => {
    const response = await fetch(`${API_BASE}/non-existent-endpoint`)

    expect(response.status).toBe(404)
  })
})

// 清理测试数据
describe('测试清理', () => {
  it('应该能够删除测试文章', async () => {
    if (testArticleId) {
      const response = await fetch(`${API_BASE}/articles/${testSiteId}/${testArticleId}`, {
        method: 'DELETE',
        headers: { 'X-API-Key': 'test-api-key' }
      })

      expect(response.status).toBe(204)
    }
  })

  it('应该能够删除测试站点', async () => {
    if (testSiteId) {
      const response = await fetch(`${API_BASE}/sites/${testSiteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      })

      expect(response.status).toBe(204)
    }
  })
})