/**
 * 多租户隔离中间件使用示例
 *
 * 这个文件展示了如何在实际应用中使用多租户隔离中间件
 */

import { Hono } from 'hono'
import {
  tenantMiddleware,
  optionalTenantMiddleware,
  getCurrentSiteId,
  getCurrentSite,
  validateSiteAccess,
  ensureSiteFilter,
  createSiteScopedCacheKey
} from './tenant'
import type { Env } from '../index'

const exampleApp = new Hono<{ Bindings: Env }>()

// 示例 1: 强制多租户隔离
// 所有请求都必须包含有效的 siteId
exampleApp.use('/api/sites/:siteId/*', tenantMiddleware)

exampleApp.get('/api/sites/:siteId/articles', async (c) => {
  const siteId = getCurrentSiteId(c) // 从中间件注入的上下文获取
  const site = getCurrentSite(c) // 获取完整的站点信息

  // 数据库查询自动包含站点过滤
  const dbService = c.get('dbService')
  const { query, params } = ensureSiteFilter(
    c,
    'SELECT * FROM articles WHERE status = ?',
    ['published']
  )

  const articles = await dbService.execute(query, params)

  return c.json({
    site: site.name,
    articles,
    total: articles.length
  })
})

// 示例 2: 可选多租户隔离
// 请求可以包含或不包含 siteId
exampleApp.use('/api/public/*', optionalTenantMiddleware)

exampleApp.get('/api/public/articles', async (c) => {
  const siteId = c.get('siteId') // 可能为 null

  if (siteId) {
    // 如果有 siteId，只返回该站点的文章
    const site = getCurrentSite(c)
    return c.json({ site: site.name, articles: [] })
  } else {
    // 没有 siteId，返回全局文章列表
    return c.json({ articles: [] })
  }
})

// 示例 3: 站点访问权限验证
exampleApp.post('/api/sites/:siteId/articles', async (c) => {
  const requestedSiteId = c.req.param('siteId')

  // 验证用户是否有权限访问该站点
  if (!await validateSiteAccess(c, requestedSiteId)) {
    return c.json({ error: 'Access denied to this site' }, 403)
  }

  const currentSiteId = getCurrentSiteId(c)
  const articleData = await c.req.json()

  // 创建文章时确保使用当前站点的 ID
  const newArticle = {
    ...articleData,
    site_id: currentSiteId, // 强制使用经过验证的站点 ID
    id: crypto.randomUUID(),
    created_at: new Date().toISOString()
  }

  return c.json(newArticle, 201)
})

// 示例 4: 站点作用域的缓存
exampleApp.get('/api/sites/:siteId/stats', async (c) => {
  const kvService = c.get('kvService')

  // 创建站点特定的缓存键
  const cacheKey = createSiteScopedCacheKey(c, 'stats', 'daily')

  // 尝试从缓存获取
  let stats = await kvService.get(cacheKey)

  if (!stats) {
    // 如果缓存中没有，从数据库查询
    const dbService = c.get('dbService')
    const { query, params } = ensureSiteFilter(
      c,
      'SELECT COUNT(*) as article_count FROM articles',
      []
    )

    const result = await dbService.executeOne(query, params)
    stats = { article_count: result?.article_count || 0 }

    // 缓存结果
    await kvService.set(cacheKey, stats, { expirationTtl: 3600 })
  }

  return c.json(stats)
})

// 示例 5: 批量操作的站点隔离
exampleApp.delete('/api/sites/:siteId/articles/batch', async (c) => {
  const currentSiteId = getCurrentSiteId(c)
  const { articleIds } = await c.req.json()

  const dbService = c.get('dbService')

  // 确保只删除当前站点的文章
  const placeholders = articleIds.map(() => '?').join(',')
  const { query, params } = ensureSiteFilter(
    c,
    `DELETE FROM articles WHERE id IN (${placeholders})`,
    articleIds
  )

  const result = await dbService.executeRun(query, params)

  return c.json({
    deleted: result.changes,
    site_id: currentSiteId
  })
})

// 示例 6: 错误处理和日志记录
exampleApp.get('/api/sites/:siteId/sensitive-data', async (c) => {
  try {
    const site = getCurrentSite(c)
    const currentSiteId = getCurrentSiteId(c)

    // 记录访问日志（包含站点信息）
    console.log(`Site ${site.name} (${currentSiteId}) accessed sensitive data`, {
      timestamp: new Date().toISOString(),
      userAgent: c.req.header('User-Agent'),
      ip: c.req.header('CF-Connecting-IP')
    })

    // 返回站点特定的敏感数据
    return c.json({
      site: site.name,
      data: 'sensitive information for this site only'
    })

  } catch (error) {
    console.error('Error accessing sensitive data:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default exampleApp