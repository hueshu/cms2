import { Hono } from 'hono'
import { getCurrentSite } from '../middleware/domain'
import type { Env } from '../index'
import { DatabaseService, KVService } from '../utils/database'
import { ArticleService } from '../services/articleService'
import { renderBwg87Homepage } from './bwg87'
import { renderXiniuHomepage } from './xiniu'

/**
 * Unified frontend routes for all sites
 */
export const unifiedFrontendRoutes = new Hono<{ Bindings: Env }>()

// Homepage router - handles all sites
unifiedFrontendRoutes.get('/', async (c) => {
  const site = getCurrentSite(c)

  if (!site) {
    // No site found, return API response
    return c.json({
      success: false,
      error: {
        code: 'SITE_NOT_FOUND',
        message: 'Site not found for this domain'
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    }, 404)
  }

  // Route to appropriate site renderer
  switch (site.id) {
    case 'site-001':
      // Xiniu Jianji site
      return renderXiniuHomepage(c, site)

    case 'site-002':
      // BWG87 site
      return renderBwg87Homepage(c, site)

    default:
      // Unknown site, return API response
      return c.json({
        success: true,
        data: {
          site: site.name,
          domain: site.domain,
          message: `Welcome to ${site.name}`
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      })
  }
})

export default unifiedFrontendRoutes