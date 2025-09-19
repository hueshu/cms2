import { Context, Next } from 'hono'
import { DatabaseService, KVService } from '../utils/database'
import { SiteService } from '../services/siteService'
import type { Site } from '../models/types'

/**
 * 域名识别中间件
 * 根据请求的Host头识别对应的站点
 */
export const domainMiddleware = async (c: Context, next: Next) => {
  try {
    // 优先使用 x-forwarded-host（反向代理情况）
    // 然后使用 host header
    // 最后使用 URL 中的 hostname
    const xForwardedHost = c.req.header('x-forwarded-host')
    const hostHeader = c.req.header('host')
    const urlHostname = new URL(c.req.url).hostname

    const requestHost = xForwardedHost || hostHeader || urlHostname

    // 移除端口号（如果有）
    const domain = requestHost.split(':')[0]

    console.log('Request domain:', domain, '(x-forwarded-host:', xForwardedHost, ', host:', hostHeader, ')')

    // 如果是Workers默认域名，使用默认站点或跳过
    if (domain.includes('workers.dev') || domain === 'localhost') {
      // 可以设置一个默认站点ID
      c.set('currentDomain', domain)
      c.set('isDefaultDomain', true)
      return next()
    }

    // 查询对应的站点
    const db = new DatabaseService(c.env.DB)
    const kv = new KVService(c.env.CACHE_KV)
    const siteService = new SiteService(db, kv)

    try {
      const site = await siteService.getSiteByDomain(domain)

      // 将站点信息注入到上下文
      c.set('currentSite', site)
      c.set('currentSiteId', site.id)
      c.set('currentDomain', domain)

      // 添加响应头标识当前站点
      c.header('X-Site-ID', site.id)
      c.header('X-Site-Domain', domain) // Use actual domain not site.domain

    } catch (error) {
      // 如果找不到对应的站点，返回404或默认内容
      console.error('Site not found for domain:', domain, error)

      // 或者设置为未找到站点，让路由自己处理
      c.set('currentDomain', domain)
      c.set('siteNotFound', true)
    }

    return next()
  } catch (error) {
    console.error('Domain middleware error:', error)
    return c.json({
      success: false,
      error: {
        code: 'DOMAIN_MIDDLEWARE_ERROR',
        message: 'Failed to process domain',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }, 500)
  }
}

/**
 * 获取当前请求的站点信息
 */
export function getCurrentSite(c: Context): Site | undefined {
  return c.get('currentSite')
}

/**
 * 获取当前请求的站点ID
 */
export function getCurrentSiteId(c: Context): string | undefined {
  return c.get('currentSiteId')
}

/**
 * 获取当前请求的域名
 */
export function getCurrentDomain(c: Context): string {
  return c.get('currentDomain') || 'unknown'
}

/**
 * 检查是否是默认域名（Workers域名）
 */
export function isDefaultDomain(c: Context): boolean {
  return c.get('isDefaultDomain') || false
}

/**
 * 检查站点是否未找到
 */
export function isSiteNotFound(c: Context): boolean {
  return c.get('siteNotFound') || false
}