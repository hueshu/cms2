import { Context, Next } from 'hono'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import type { Env } from '../index'
import { DatabaseService, KVService } from '../utils/database'
import { SiteService } from '../services/siteService'
import type { Site } from '../models/types'

// UUID v4 format validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * 多租户隔离中间件
 * 从请求路径中提取 siteId，验证站点存在性，并注入到上下文中
 */
export const tenantMiddleware = createMiddleware<{ Bindings: Env }>(
  async (c: Context<{ Bindings: Env }>, next: Next) => {
    // 从路径参数中提取 siteId
    const siteId = c.req.param('siteId')

    if (!siteId) {
      throw new HTTPException(400, {
        message: 'Site ID is required in the request path'
      })
    }

    // 验证 siteId 格式（UUID v4）
    if (!UUID_REGEX.test(siteId)) {
      throw new HTTPException(400, {
        message: 'Invalid site ID format. Must be a valid UUID v4'
      })
    }

    try {
      // 初始化服务
      const dbService = new DatabaseService(c.env.DB)
      const kvService = new KVService(c.env.CACHE_KV)
      const siteService = new SiteService(dbService, kvService)

      // 验证站点是否存在且状态为 active
      const site = await siteService.getSiteById(siteId)

      // 检查站点状态
      if (site.status !== 'active') {
        throw new HTTPException(403, {
          message: `Site is ${site.status}. Only active sites are accessible`
        })
      }

      // 将站点信息注入到上下文中
      c.set('siteId', siteId)
      c.set('site', site)
      c.set('dbService', dbService)
      c.set('kvService', kvService)
      c.set('siteService', siteService)

      await next()
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error
      }

      // 处理站点不存在的情况
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, {
          message: `Site with ID ${siteId} not found`
        })
      }

      // 处理其他数据库错误
      console.error('Tenant middleware error:', error)
      throw new HTTPException(500, {
        message: 'Internal server error while validating site access'
      })
    }
  }
)

/**
 * 可选的租户中间件
 * 如果路径中包含 siteId 则进行验证，否则跳过
 */
export const optionalTenantMiddleware = createMiddleware<{ Bindings: Env }>(
  async (c: Context<{ Bindings: Env }>, next: Next) => {
    const siteId = c.req.param('siteId')

    // 如果没有 siteId，直接继续
    if (!siteId) {
      await next()
      return
    }

    // 如果有 siteId，则使用完整的租户验证逻辑
    return tenantMiddleware(c, next)
  }
)

/**
 * 获取当前请求的站点 ID
 */
export function getCurrentSiteId(c: Context): string {
  const siteId = c.get('siteId')
  if (!siteId) {
    throw new HTTPException(500, {
      message: 'Site ID not found in context. Ensure tenant middleware is applied'
    })
  }
  return siteId
}

/**
 * 获取当前请求的站点信息
 */
export function getCurrentSite(c: Context): Site {
  const site = c.get('site')
  if (!site) {
    throw new HTTPException(500, {
      message: 'Site information not found in context. Ensure tenant middleware is applied'
    })
  }
  return site
}

/**
 * 验证当前用户是否有访问指定站点的权限
 * 这个函数可以与认证中间件结合使用
 */
export async function validateSiteAccess(
  c: Context<{ Bindings: Env }>,
  requestedSiteId: string
): Promise<boolean> {
  const currentSiteId = getCurrentSiteId(c)

  // 基本的站点隔离检查
  if (currentSiteId !== requestedSiteId) {
    return false
  }

  // 如果有 JWT payload，验证其中的 site_id
  const jwtPayload = c.get('jwtPayload')
  if (jwtPayload && jwtPayload.site_id !== requestedSiteId) {
    return false
  }

  return true
}

/**
 * 确保数据库查询只能访问当前站点的数据
 * 这是一个辅助函数，用于在数据库查询中添加站点过滤条件
 */
export function ensureSiteFilter(
  c: Context,
  baseQuery: string,
  params: any[] = []
): { query: string; params: any[] } {
  const siteId = getCurrentSiteId(c)

  // 如果查询中已经包含了 site_id 过滤，直接返回
  if (baseQuery.toLowerCase().includes('site_id')) {
    return { query: baseQuery, params }
  }

  // 添加 site_id 过滤条件
  const whereClause = baseQuery.toLowerCase().includes('where')
    ? ' AND site_id = ?'
    : ' WHERE site_id = ?'

  return {
    query: baseQuery + whereClause,
    params: [...params, siteId]
  }
}

/**
 * 创建站点作用域的缓存键
 */
export function createSiteScopedCacheKey(
  c: Context,
  prefix: string,
  ...parts: string[]
): string {
  const siteId = getCurrentSiteId(c)
  return [prefix, siteId, ...parts].join(':')
}