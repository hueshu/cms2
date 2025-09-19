import { Hono } from 'hono'
import { successResponse, paginatedResponse, createdResponse, noContentResponse } from '../utils/response'
import { validateBody, validateQuery, paginationSchema } from '../middleware/validation'
import { DatabaseService, KVService } from '../utils/database'
import { DomainService } from '../services/domainService'
import { tenantMiddleware } from '../middleware/tenant'
import type { Env } from '../index'
import type { CreateDomainInput, UpdateDomainInput } from '../models/types'
import { z } from 'zod'

// 域名相关的验证Schema
const domainSchema = z.object({
  site_id: z.string().min(1, 'Site ID is required'),
  domain: z.string()
    .min(1, 'Domain is required')
    .regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
           'Invalid domain format'),
  is_primary: z.boolean().optional(),
  verification_method: z.enum(['dns', 'file', 'email']).optional()
})

const updateDomainSchema = z.object({
  is_primary: z.boolean().optional(),
  verification_method: z.enum(['dns', 'file', 'email']).optional(),
  ssl_status: z.enum(['pending', 'active', 'failed', 'disabled']).optional(),
  dns_configured: z.boolean().optional()
})

export const domainsRoutes = new Hono<{ Bindings: Env }>()

// 获取网站的所有域名
domainsRoutes.get('/:siteId',
  tenantMiddleware,
  validateQuery(paginationSchema),
  async (c) => {
    const siteId = c.req.param('siteId')
    const query = c.get('validatedQuery')

    const db = new DatabaseService(c.env.DB)
    const kv = new KVService(c.env.CACHE_KV)
    const domainService = new DomainService(
      db,
      kv,
      c.env.CLOUDFLARE_API_TOKEN,
      c.env.CLOUDFLARE_API_EMAIL
    )

    const result = await domainService.getDomainsBySiteId(siteId, query)
    return paginatedResponse(c, result.data, result.total, result.page, result.limit)
  }
)

// 创建新域名
domainsRoutes.post('/',
  validateBody(domainSchema),
  async (c) => {
    const data = c.get('validatedData') as CreateDomainInput

    const db = new DatabaseService(c.env.DB)
    const kv = new KVService(c.env.CACHE_KV)
    const domainService = new DomainService(
      db,
      kv,
      c.env.CLOUDFLARE_API_TOKEN,
      c.env.CLOUDFLARE_API_EMAIL
    )

    const domain = await domainService.createDomain(data)
    return createdResponse(c, domain, `/api/v1/domains/${domain.id}`)
  }
)

// 获取特定域名信息
domainsRoutes.get('/:siteId/:domainId',
  tenantMiddleware,
  async (c) => {
    const domainId = c.req.param('domainId')

    const db = new DatabaseService(c.env.DB)
    const kv = new KVService(c.env.CACHE_KV)
    const domainService = new DomainService(
      db,
      kv,
      c.env.CLOUDFLARE_API_TOKEN,
      c.env.CLOUDFLARE_API_EMAIL
    )

    const domain = await domainService.getDomainById(domainId)
    return successResponse(c, domain)
  }
)

// 更新域名设置
domainsRoutes.put('/:siteId/:domainId',
  tenantMiddleware,
  validateBody(updateDomainSchema.partial()),
  async (c) => {
    const domainId = c.req.param('domainId')
    const data = c.get('validatedData') as UpdateDomainInput

    const db = new DatabaseService(c.env.DB)
    const kv = new KVService(c.env.CACHE_KV)
    const domainService = new DomainService(
      db,
      kv,
      c.env.CLOUDFLARE_API_TOKEN,
      c.env.CLOUDFLARE_API_EMAIL
    )

    const domain = await domainService.updateDomain(domainId, data)
    return successResponse(c, domain)
  }
)

// 删除域名
domainsRoutes.delete('/:siteId/:domainId',
  tenantMiddleware,
  async (c) => {
    const domainId = c.req.param('domainId')

    const db = new DatabaseService(c.env.DB)
    const kv = new KVService(c.env.CACHE_KV)
    const domainService = new DomainService(
      db,
      kv,
      c.env.CLOUDFLARE_API_TOKEN,
      c.env.CLOUDFLARE_API_EMAIL
    )

    await domainService.deleteDomain(domainId)
    return noContentResponse(c)
  }
)

// 验证域名配置
domainsRoutes.post('/:siteId/:domainId/verify',
  tenantMiddleware,
  async (c) => {
    const domainId = c.req.param('domainId')

    const db = new DatabaseService(c.env.DB)
    const kv = new KVService(c.env.CACHE_KV)
    const domainService = new DomainService(
      db,
      kv,
      c.env.CLOUDFLARE_API_TOKEN,
      c.env.CLOUDFLARE_API_EMAIL
    )

    const result = await domainService.verifyDomain(domainId)
    return successResponse(c, result)
  }
)

// 获取域名验证日志
domainsRoutes.get('/:siteId/:domainId/logs',
  tenantMiddleware,
  async (c) => {
    const domainId = c.req.param('domainId')
    const limit = parseInt(c.req.query('limit') || '10')

    const db = new DatabaseService(c.env.DB)
    const kv = new KVService(c.env.CACHE_KV)
    const domainService = new DomainService(
      db,
      kv,
      c.env.CLOUDFLARE_API_TOKEN,
      c.env.CLOUDFLARE_API_EMAIL
    )

    const logs = await domainService.getDomainVerificationLogs(domainId, limit)
    return successResponse(c, logs)
  }
)

// 获取域名的SSL信息（需要Cloudflare集成）
domainsRoutes.get('/:siteId/:domainId/ssl',
  tenantMiddleware,
  async (c) => {
    const domainId = c.req.param('domainId')

    const db = new DatabaseService(c.env.DB)
    const kv = new KVService(c.env.CACHE_KV)
    const domainService = new DomainService(
      db,
      kv,
      c.env.CLOUDFLARE_API_TOKEN,
      c.env.CLOUDFLARE_API_EMAIL
    )

    try {
      const domain = await domainService.getDomainById(domainId)
      const sslInfo = await domainService.getCloudflareSSLInfo(domain.domain)
      return successResponse(c, sslInfo)
    } catch (error) {
      return c.json({
        success: false,
        error: {
          code: 'SSL_INFO_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get SSL information'
        }
      }, 400)
    }
  }
)

// 通过域名查找对应的网站（用于路由解析）
domainsRoutes.get('/resolve/:domain', async (c) => {
  const domainName = c.req.param('domain')

  const db = new DatabaseService(c.env.DB)
  const kv = new KVService(c.env.CACHE_KV)
  const domainService = new DomainService(
    db,
    kv,
    c.env.CLOUDFLARE_API_TOKEN,
    c.env.CLOUDFLARE_API_EMAIL
  )

  try {
    const domain = await domainService.getDomainByName(domainName)

    // 获取关联的网站信息
    const site = await db.executeOne(
      'SELECT id, name, domain, status FROM sites WHERE id = ?',
      [domain.site_id]
    )

    if (!site) {
      return c.json({
        success: false,
        error: {
          code: 'SITE_NOT_FOUND',
          message: 'Associated site not found'
        }
      }, 404)
    }

    return successResponse(c, {
      domain: domain,
      site: site,
      resolved_at: new Date().toISOString()
    })
  } catch (error) {
    return c.json({
      success: false,
      error: {
        code: 'DOMAIN_NOT_FOUND',
        message: 'Domain not found or not configured'
      }
    }, 404)
  }
})

// 批量验证所有域名（后台任务触发）
domainsRoutes.post('/batch-verify', async (c) => {
  const db = new DatabaseService(c.env.DB)
  const kv = new KVService(c.env.CACHE_KV)
  const domainService = new DomainService(
    db,
    kv,
    c.env.CLOUDFLARE_API_TOKEN,
    c.env.CLOUDFLARE_API_EMAIL
  )

  try {
    // 获取需要验证的域名（状态为pending或failed的域名）
    const domains = await db.execute(
      `SELECT id FROM domains
       WHERE verification_status IN ('pending', 'failed')
       AND updated_at < datetime('now', '-1 hour')
       LIMIT 50`
    )

    const results = []
    for (const domain of domains) {
      try {
        const result = await domainService.verifyDomain(domain.id)
        results.push({
          domain_id: domain.id,
          status: 'verified',
          result: result
        })
      } catch (error) {
        results.push({
          domain_id: domain.id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return successResponse(c, {
      total_processed: results.length,
      results: results,
      processed_at: new Date().toISOString()
    })
  } catch (error) {
    return c.json({
      success: false,
      error: {
        code: 'BATCH_VERIFY_ERROR',
        message: error instanceof Error ? error.message : 'Batch verification failed'
      }
    }, 500)
  }
})