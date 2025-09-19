import { describe, it, expect, beforeAll, afterAll } from 'vitest'

/**
 * 端到端测试套件
 * 测试完整的用户工作流程和系统集成
 */

const BASE_URL = 'http://localhost:8787'
const API_BASE = `${BASE_URL}/api/v1`

// 全局测试状态
let authToken: string
let testSiteId: string
let testArticleId: string
let testDomain = 'e2e-test.example.com'

describe('E2E: 完整的站点创建和管理流程', () => {
  beforeAll(async () => {
    // 获取认证令牌
    const authResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword123'
      })
    })

    const authData = await authResponse.json()
    authToken = authData.data.token
  })

  it('完整的站点生命周期：创建 → 配置 → 发布 → 删除', async () => {
    // 步骤1: 创建站点
    const createSiteResponse = await fetch(`${API_BASE}/sites`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'E2E测试站点',
        domain: testDomain,
        description: '端到端测试站点',
        settings: {
          theme: 'modern',
          seo: {
            title: 'E2E测试站点',
            description: '这是一个端到端测试站点',
            keywords: ['测试', 'E2E', 'CMS']
          }
        }
      })
    })

    expect(createSiteResponse.status).toBe(201)
    const siteData = await createSiteResponse.json()
    testSiteId = siteData.data.id

    // 步骤2: 验证站点创建成功
    const getSiteResponse = await fetch(`${API_BASE}/sites/${testSiteId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    })

    expect(getSiteResponse.status).toBe(200)
    const site = await getSiteResponse.json()
    expect(site.data.domain).toBe(testDomain)

    // 步骤3: 配置站点设置
    const updateSiteResponse = await fetch(`${API_BASE}/sites/${testSiteId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        settings: {
          theme: 'dark',
          seo: {
            title: '更新后的E2E测试站点',
            description: '更新后的描述',
            keywords: ['测试', 'E2E', 'CMS', '更新']
          }
        }
      })
    })

    expect(updateSiteResponse.status).toBe(200)

    // 步骤4: 验证域名状态
    const verifyDomainResponse = await fetch(`${API_BASE}/domains/verify`, {
      method: 'POST',
      headers: {
        'X-API-Key': 'test-api-key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ domain: testDomain })
    })

    expect(verifyDomainResponse.status).toBe(200)

    // 步骤5: 清理 - 删除站点
    const deleteSiteResponse = await fetch(`${API_BASE}/sites/${testSiteId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    })

    expect(deleteSiteResponse.status).toBe(204)
  })
})

describe('E2E: 内容管理完整流程', () => {
  beforeAll(async () => {
    // 创建测试站点
    const createSiteResponse = await fetch(`${API_BASE}/sites`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: '内容测试站点',
        domain: 'content-test.example.com',
        description: '内容管理测试站点'
      })
    })

    const siteData = await createSiteResponse.json()
    testSiteId = siteData.data.id
  })

  afterAll(async () => {
    // 清理测试站点
    await fetch(`${API_BASE}/sites/${testSiteId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    })
  })

  it('完整的文章生命周期：创建 → 编辑 → 发布 → SEO优化 → 删除', async () => {
    // 步骤1: 创建草稿文章
    const createArticleResponse = await fetch(`${API_BASE}/articles/${testSiteId}`, {
      method: 'POST',
      headers: {
        'X-API-Key': 'test-api-key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'E2E测试文章',
        content: '这是一篇用于端到端测试的文章内容。\n\n## 子标题\n\n更多内容...',
        excerpt: '端到端测试文章摘要',
        status: 'draft',
        tags: ['E2E', '测试', '文章'],
        seo: {
          title: 'E2E测试文章 - SEO标题',
          description: 'E2E测试文章的SEO描述',
          keywords: ['E2E', '测试', '文章', 'CMS']
        }
      })
    })

    expect(createArticleResponse.status).toBe(201)
    const articleData = await createArticleResponse.json()
    testArticleId = articleData.data.id

    // 步骤2: 编辑文章内容
    const updateArticleResponse = await fetch(`${API_BASE}/articles/${testSiteId}/${testArticleId}`, {
      method: 'PUT',
      headers: {
        'X-API-Key': 'test-api-key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: '更新后的E2E测试文章',
        content: '这是更新后的文章内容。\n\n## 新的子标题\n\n更新的内容...',
        excerpt: '更新后的文章摘要'
      })
    })

    expect(updateArticleResponse.status).toBe(200)

    // 步骤3: 发布文章
    const publishArticleResponse = await fetch(`${API_BASE}/articles/${testSiteId}/${testArticleId}`, {
      method: 'PUT',
      headers: {
        'X-API-Key': 'test-api-key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'published'
      })
    })

    expect(publishArticleResponse.status).toBe(200)

    // 步骤4: SEO分析
    const seoAnalysisResponse = await fetch(`${API_BASE}/seo/${testSiteId}/analyze/${testArticleId}`, {
      headers: { 'X-API-Key': 'test-api-key' }
    })

    expect(seoAnalysisResponse.status).toBe(200)
    const seoData = await seoAnalysisResponse.json()
    expect(seoData.data.score).toBeDefined()
    expect(Array.isArray(seoData.data.recommendations)).toBe(true)

    // 步骤5: 验证文章在列表中
    const articlesListResponse = await fetch(`${API_BASE}/articles/${testSiteId}?status=published`, {
      headers: { 'X-API-Key': 'test-api-key' }
    })

    expect(articlesListResponse.status).toBe(200)
    const articlesData = await articlesListResponse.json()
    const publishedArticle = articlesData.data.find((article: any) => article.id === testArticleId)
    expect(publishedArticle).toBeDefined()
    expect(publishedArticle.status).toBe('published')

    // 步骤6: 清理 - 删除文章
    const deleteArticleResponse = await fetch(`${API_BASE}/articles/${testSiteId}/${testArticleId}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': 'test-api-key' }
    })

    expect(deleteArticleResponse.status).toBe(204)
  })

  it('标签管理和文章关联流程', async () => {
    // 步骤1: 创建多个标签
    const tags = [
      { name: '技术', description: '技术相关文章' },
      { name: '教程', description: '教程类文章' },
      { name: '新闻', description: '新闻资讯' }
    ]

    const createdTags = []
    for (const tag of tags) {
      const response = await fetch(`${API_BASE}/tags/${testSiteId}`, {
        method: 'POST',
        headers: {
          'X-API-Key': 'test-api-key',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tag)
      })

      expect(response.status).toBe(201)
      const tagData = await response.json()
      createdTags.push(tagData.data)
    }

    // 步骤2: 创建带标签的文章
    const createArticleResponse = await fetch(`${API_BASE}/articles/${testSiteId}`, {
      method: 'POST',
      headers: {
        'X-API-Key': 'test-api-key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: '带标签的测试文章',
        content: '这是一篇带标签的测试文章',
        status: 'published',
        tags: ['技术', '教程']
      })
    })

    expect(createArticleResponse.status).toBe(201)
    const articleData = await createArticleResponse.json()

    // 步骤3: 按标签过滤文章
    const filteredResponse = await fetch(`${API_BASE}/articles/${testSiteId}?tags=技术`, {
      headers: { 'X-API-Key': 'test-api-key' }
    })

    expect(filteredResponse.status).toBe(200)
    const filteredData = await filteredResponse.json()
    expect(filteredData.data.length).toBeGreaterThan(0)

    const foundArticle = filteredData.data.find((article: any) => article.id === articleData.data.id)
    expect(foundArticle).toBeDefined()

    // 清理
    await fetch(`${API_BASE}/articles/${testSiteId}/${articleData.data.id}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': 'test-api-key' }
    })
  })
})

describe('E2E: 图片生成和CDN集成流程', () => {
  it('完整的图片生成和CDN管理流程', async () => {
    // 步骤1: 生成社交媒体图片
    const generateImageResponse = await fetch(`${API_BASE}/images/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'E2E测试图片',
        width: 1200,
        height: 630,
        template: 'social',
        fontSize: 48,
        fontColor: '#ffffff',
        backgroundColor: '#007bff'
      })
    })

    expect(generateImageResponse.status).toBe(200)
    expect(generateImageResponse.headers.get('content-type')).toContain('image/')

    // 步骤2: 生成不同尺寸的图片
    const sizes = [
      { width: 800, height: 600, template: 'blog' },
      { width: 400, height: 300, template: 'thumbnail' },
      { width: 1920, height: 1080, template: 'hero' }
    ]

    for (const size of sizes) {
      const response = await fetch(`${API_BASE}/images/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `${size.template}图片`,
          ...size
        })
      })

      expect(response.status).toBe(200)
    }

    // 步骤3: 测试CDN缓存清除
    const purgeResponse = await fetch(`${API_BASE}/cdn/purge`, {
      method: 'POST',
      headers: {
        'X-API-Key': 'test-api-key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        files: ['https://example.com/test-image.jpg']
      })
    })

    expect(purgeResponse.status).toBe(200)

    // 步骤4: 获取CDN统计信息
    const statsResponse = await fetch(`${API_BASE}/cdn/stats`, {
      headers: { 'X-API-Key': 'test-api-key' }
    })

    expect(statsResponse.status).toBe(200)
    const statsData = await statsResponse.json()
    expect(statsData.success).toBe(true)
  })
})

describe('E2E: SEO优化完整流程', () => {
  beforeAll(async () => {
    // 创建测试站点和文章
    const createSiteResponse = await fetch(`${API_BASE}/sites`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'SEO测试站点',
        domain: 'seo-test.example.com',
        description: 'SEO测试站点'
      })
    })

    const siteData = await createSiteResponse.json()
    testSiteId = siteData.data.id

    // 创建测试文章
    const createArticleResponse = await fetch(`${API_BASE}/articles/${testSiteId}`, {
      method: 'POST',
      headers: {
        'X-API-Key': 'test-api-key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'SEO测试文章',
        content: '# SEO测试文章\n\n这是一篇用于SEO测试的文章内容。\n\n## 子标题\n\n更多优质内容...',
        status: 'published',
        seo: {
          title: 'SEO测试文章 - 最佳实践',
          description: '这是一篇详细介绍SEO最佳实践的文章，包含丰富的内容和优化建议。',
          keywords: ['SEO', '优化', '测试', '最佳实践']
        }
      })
    })

    const articleData = await createArticleResponse.json()
    testArticleId = articleData.data.id
  })

  afterAll(async () => {
    // 清理测试数据
    await fetch(`${API_BASE}/articles/${testSiteId}/${testArticleId}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': 'test-api-key' }
    })

    await fetch(`${API_BASE}/sites/${testSiteId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    })
  })

  it('完整的SEO优化和生成流程', async () => {
    // 步骤1: 生成站点地图
    const sitemapResponse = await fetch(`${API_BASE}/seo/${testSiteId}/sitemap`, {
      headers: { 'X-API-Key': 'test-api-key' }
    })

    expect(sitemapResponse.status).toBe(200)
    expect(sitemapResponse.headers.get('content-type')).toContain('application/xml')

    const sitemapContent = await sitemapResponse.text()
    expect(sitemapContent).toContain('<?xml version="1.0"')
    expect(sitemapContent).toContain('<urlset')

    // 步骤2: 生成robots.txt
    const robotsResponse = await fetch(`${API_BASE}/seo/${testSiteId}/robots`, {
      headers: { 'X-API-Key': 'test-api-key' }
    })

    expect(robotsResponse.status).toBe(200)
    expect(robotsResponse.headers.get('content-type')).toContain('text/plain')

    const robotsContent = await robotsResponse.text()
    expect(robotsContent).toContain('User-agent:')
    expect(robotsContent).toContain('Sitemap:')

    // 步骤3: SEO分析
    const analysisResponse = await fetch(`${API_BASE}/seo/${testSiteId}/analyze/${testArticleId}`, {
      headers: { 'X-API-Key': 'test-api-key' }
    })

    expect(analysisResponse.status).toBe(200)
    const analysisData = await analysisResponse.json()

    expect(analysisData.success).toBe(true)
    expect(typeof analysisData.data.score).toBe('number')
    expect(analysisData.data.score).toBeGreaterThanOrEqual(0)
    expect(analysisData.data.score).toBeLessThanOrEqual(100)
    expect(Array.isArray(analysisData.data.recommendations)).toBe(true)
    expect(analysisData.data.metrics).toBeDefined()

    // 步骤4: 验证SEO元数据
    const articleResponse = await fetch(`${API_BASE}/articles/${testSiteId}/${testArticleId}`, {
      headers: { 'X-API-Key': 'test-api-key' }
    })

    const articleData = await articleResponse.json()
    expect(articleData.data.seo.title).toBeDefined()
    expect(articleData.data.seo.description).toBeDefined()
    expect(Array.isArray(articleData.data.seo.keywords)).toBe(true)
  })
})

describe('E2E: 性能和监控流程', () => {
  it('完整的性能监控和优化流程', async () => {
    // 步骤1: 获取基础性能指标
    const performanceResponse = await fetch(`${BASE_URL}/api/performance`)

    expect(performanceResponse.status).toBe(200)
    const performanceData = await performanceResponse.json()
    expect(performanceData.success).toBe(true)
    expect(performanceData.data.performance).toBeDefined()

    // 步骤2: 健康检查
    const healthResponse = await fetch(`${BASE_URL}/api/health`)

    expect(healthResponse.status).toBe(200)
    const healthData = await healthResponse.json()
    expect(healthData.data.status).toBe('healthy')

    // 步骤3: 服务信息验证
    const serviceResponse = await fetch(BASE_URL)

    expect(serviceResponse.status).toBe(200)
    const serviceData = await serviceResponse.json()
    expect(serviceData.data.service).toBe('cf-cms-worker')
    expect(serviceData.data.version).toBeDefined()
    expect(serviceData.data.environment).toBeDefined()

    // 步骤4: 多次调用测试缓存性能
    const startTime = Date.now()
    const testRequests = 10

    const promises = Array(testRequests).fill(0).map(() =>
      fetch(`${BASE_URL}/api/health`)
    )

    const responses = await Promise.all(promises)
    const endTime = Date.now()

    // 所有请求都应该成功
    responses.forEach(response => {
      expect(response.status).toBe(200)
    })

    // 验证响应时间合理
    const avgResponseTime = (endTime - startTime) / testRequests
    expect(avgResponseTime).toBeLessThan(1000) // 平均响应时间应该小于1秒
  })
})

describe('E2E: 错误处理和恢复流程', () => {
  it('完整的错误处理和系统恢复流程', async () => {
    // 步骤1: 测试认证失败恢复
    const invalidAuthResponse = await fetch(`${API_BASE}/sites`, {
      headers: { 'Authorization': 'Bearer invalid-token' }
    })

    expect(invalidAuthResponse.status).toBe(401)

    // 步骤2: 测试API密钥失败恢复
    const invalidApiKeyResponse = await fetch(`${API_BASE}/articles/test-site-id`, {
      headers: { 'X-API-Key': 'invalid-key' }
    })

    expect(invalidApiKeyResponse.status).toBe(401)

    // 步骤3: 测试资源不存在处理
    const notFoundResponse = await fetch(`${API_BASE}/sites/non-existent-id`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    })

    expect(notFoundResponse.status).toBe(404)

    // 步骤4: 测试数据验证错误
    const invalidDataResponse = await fetch(`${API_BASE}/sites`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: '', // 无效的空名称
        domain: 'invalid-domain' // 无效的域名格式
      })
    })

    expect(invalidDataResponse.status).toBe(400)
    const errorData = await invalidDataResponse.json()
    expect(errorData.success).toBe(false)
    expect(errorData.errors).toBeDefined()

    // 步骤5: 测试方法不允许
    const methodNotAllowedResponse = await fetch(`${API_BASE}/sites`, {
      method: 'PATCH', // 不支持的方法
      headers: { 'Authorization': `Bearer ${authToken}` }
    })

    expect(methodNotAllowedResponse.status).toBe(405)

    // 步骤6: 验证系统在错误后仍能正常工作
    const recoveryResponse = await fetch(`${BASE_URL}/api/health`)

    expect(recoveryResponse.status).toBe(200)
    const recoveryData = await recoveryResponse.json()
    expect(recoveryData.data.status).toBe('healthy')
  })
})