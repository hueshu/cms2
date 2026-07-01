import { Hono } from 'hono'
import { getCurrentSite } from '../middleware/domain'
import type { Env } from '../index'
import { DatabaseService, KVService } from '../utils/database'
import { ArticleService } from '../services/articleService'
import { renderBwg87Homepage } from './bwg87'
import { renderXiniuHomepage, renderXiniuPricePage, renderXiniuDownloadPage, renderXiniuTutorialPage, renderXiniuAffiliatePage, renderXiniuChangelogPage } from './xiniu'
import { renderHostwindsHomepage } from './hostwinds'
import {
  renderAllcutHomepage,
  renderAllcutPricePage,
  renderAllcutDownloadPage,
  renderAllcutLearnMorePage,
  renderAllcutChangelogPage
} from './allcut'
import { renderWanjianHomepage } from './wanjian'
import { renderVultrHomepage } from './vultr'

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

    case 'site-003':
      // Hostwinds VPS site
      return renderHostwindsHomepage(c, site)

    case 'site-004':
      // ALLCUT site
      return renderAllcutHomepage(c, site)

    case 'site-005':
      // Wanjian site
      return renderWanjianHomepage(c, site)

    case 'site-006':
      // Vultr VPS site
      return renderVultrHomepage(c, site)

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

// Price page routes
unifiedFrontendRoutes.get('/price', async (c) => {
  const site = getCurrentSite(c)
  if (!site) return c.notFound()

  switch (site.id) {
    case 'site-001':
      return renderXiniuPricePage(c, site)
    case 'site-004':
      return renderAllcutPricePage(c, site)
    default:
      return c.notFound()
  }
})

unifiedFrontendRoutes.get('/download', async (c) => {
  const site = getCurrentSite(c)
  if (!site) return c.notFound()

  switch (site.id) {
    case 'site-001':
      return renderXiniuDownloadPage(c, site)
    case 'site-004':
      return renderAllcutDownloadPage(c, site)
    default:
      return c.notFound()
  }
})

// Tutorial transition page
unifiedFrontendRoutes.get('/tutorial', async (c) => {
  const site = getCurrentSite(c)
  if (!site) return c.notFound()

  switch (site.id) {
    case 'site-001':
      return renderXiniuTutorialPage(c, site)
    default:
      return c.notFound()
  }
})

// Affiliate transition page
unifiedFrontendRoutes.get('/affiliate', async (c) => {
  const site = getCurrentSite(c)
  if (!site) return c.notFound()

  switch (site.id) {
    case 'site-001':
      return renderXiniuAffiliatePage(c, site)
    default:
      return c.notFound()
  }
})

// 软件更新日志页(犀牛剪辑 / ALLCUT)
unifiedFrontendRoutes.get('/changelog', async (c) => {
  const site = getCurrentSite(c)
  if (!site) return c.notFound()

  switch (site.id) {
    case 'site-001':
      return renderXiniuChangelogPage(c, site)
    case 'site-004':
      return renderAllcutChangelogPage(c, site)
    default:
      return c.notFound()
  }
})

// Article list page
unifiedFrontendRoutes.get('/articles', async (c) => {
  const site = getCurrentSite(c)
  if (!site) return c.notFound()

  const db = new DatabaseService(c.env.DB)
  const kv = new KVService(c.env.CACHE_KV)
  const articleService = new ArticleService(db, kv, c.env.DB, c.env.CACHE_KV)

  const page = parseInt(c.req.query('page') || '1', 10)
  const pageSize = 20

  try {
    const result = await articleService.searchArticles(site.id, {
      page,
      limit: pageSize,
      sort: 'desc',
      sortBy: 'published_at',
    })

    const articles = result.data || []
    const totalPages = Math.ceil((result.pagination?.total || 0) / pageSize)

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>全部文章 - ${site.name}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
            background: #f5f7fa;
            color: #333;
            line-height: 1.6;
        }
        .top-bar {
            background: #fff;
            border-bottom: 1px solid #e8e8e8;
            padding: 14px 0;
            position: sticky;
            top: 0;
            z-index: 10;
        }
        .top-bar-inner {
            max-width: 900px;
            margin: 0 auto;
            padding: 0 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .top-bar a { color: #667eea; text-decoration: none; font-size: 15px; }
        .top-bar a:hover { text-decoration: underline; }
        .container {
            max-width: 900px;
            margin: 0 auto;
            padding: 30px 20px 60px;
        }
        h1 {
            font-size: 26px;
            margin-bottom: 24px;
            color: #1a1a1a;
        }
        .article-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        .article-item {
            background: #fff;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            transition: transform .2s, box-shadow .2s;
        }
        .article-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 16px rgba(0,0,0,0.1);
        }
        .article-item a { text-decoration: none; color: inherit; display: block; }
        .article-item h2 {
            font-size: 18px;
            color: #1a1a1a;
            margin-bottom: 8px;
            line-height: 1.4;
        }
        .article-item p {
            color: #666;
            font-size: 14px;
            line-height: 1.6;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        .article-meta {
            color: #999;
            font-size: 13px;
            margin-top: 10px;
        }
        .pagination {
            display: flex;
            justify-content: center;
            gap: 8px;
            margin-top: 36px;
        }
        .pagination a, .pagination span {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 8px;
            text-decoration: none;
            font-size: 14px;
        }
        .pagination a {
            background: #fff;
            color: #667eea;
            border: 1px solid #e2e8f0;
        }
        .pagination a:hover { background: #f0f4ff; }
        .pagination .current {
            background: #667eea;
            color: #fff;
            border: 1px solid #667eea;
        }
        @media (max-width: 600px) {
            .article-item { padding: 18px; }
            h1 { font-size: 22px; }
        }
    </style>
</head>
<body>
    <div class="top-bar">
        <div class="top-bar-inner">
            <a href="/">&larr; 返回首页</a>
            <span style="color:#999;font-size:13px;">${site.name}</span>
        </div>
    </div>
    <div class="container">
        <h1>全部文章</h1>
        <div class="article-list">
            ${articles.map(article => `
                <div class="article-item">
                    <a href="/article/${article.slug}">
                        <h2>${article.title}</h2>
                        <p>${article.summary || ''}</p>
                        <div class="article-meta">${article.published_at ? new Date(article.published_at).toLocaleDateString('zh-CN') : ''}</div>
                    </a>
                </div>
            `).join('')}
        </div>
        ${totalPages > 1 ? `
        <div class="pagination">
            ${page > 1 ? `<a href="/articles?page=${page - 1}">上一页</a>` : ''}
            ${Array.from({length: Math.min(totalPages, 10)}, (_, i) => {
              const p = i + 1
              return p === page
                ? `<span class="current">${p}</span>`
                : `<a href="/articles?page=${p}">${p}</a>`
            }).join('')}
            ${page < totalPages ? `<a href="/articles?page=${page + 1}">下一页</a>` : ''}
        </div>
        ` : ''}
    </div>
</body>
</html>`
    return c.html(html)
  } catch (e) {
    return c.notFound()
  }
})

// Article detail page
unifiedFrontendRoutes.get('/article/:slug', async (c) => {
  const site = getCurrentSite(c)
  if (!site) return c.notFound()

  const slug = c.req.param('slug')
  const db = new DatabaseService(c.env.DB)
  const kv = new KVService(c.env.CACHE_KV)
  const articleService = new ArticleService(db, kv, c.env.DB, c.env.CACHE_KV)

  try {
    const article = await articleService.getArticleBySlug(slug, site.id)
    if (!article) return c.notFound()

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${article.title} - ${site.name}</title>
    <meta name="description" content="${article.summary || ''}">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
            background: #f5f7fa;
            color: #333;
            line-height: 1.8;
        }
        .back-nav {
            background: #fff;
            border-bottom: 1px solid #e8e8e8;
            padding: 14px 0;
            position: sticky;
            top: 0;
            z-index: 10;
        }
        .back-nav-inner {
            max-width: 800px;
            margin: 0 auto;
            padding: 0 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .back-nav a {
            color: #667eea;
            text-decoration: none;
            font-size: 15px;
        }
        .back-nav a:hover { text-decoration: underline; }
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 30px 20px 60px;
        }
        .article-header {
            background: #fff;
            border-radius: 12px;
            padding: 40px;
            margin-bottom: 24px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }
        .article-header h1 {
            font-size: 28px;
            line-height: 1.4;
            margin-bottom: 16px;
            color: #1a1a1a;
        }
        .article-meta {
            color: #999;
            font-size: 14px;
        }
        .article-cover {
            width: 100%;
            border-radius: 12px;
            margin-bottom: 24px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }
        .article-body {
            background: #fff;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.06);
            font-size: 16px;
            line-height: 2;
        }
        .article-body h2 { font-size: 22px; margin: 32px 0 16px; color: #1a1a1a; }
        .article-body h3 { font-size: 18px; margin: 24px 0 12px; color: #333; }
        .article-body p { margin-bottom: 16px; }
        .article-body img { max-width: 100%; border-radius: 8px; margin: 16px 0; }
        .article-body a { color: #667eea; text-decoration: none; }
        .article-body a:hover { text-decoration: underline; }
        .article-body ul, .article-body ol { padding-left: 24px; margin-bottom: 16px; }
        .article-body li { margin-bottom: 8px; }
        .article-body blockquote {
            border-left: 4px solid #667eea;
            padding: 12px 20px;
            margin: 16px 0;
            background: #f8f9ff;
            color: #555;
            border-radius: 0 8px 8px 0;
        }
        .article-body pre {
            background: #f5f7fa;
            border-radius: 8px;
            padding: 16px;
            overflow-x: auto;
            margin: 16px 0;
            font-size: 14px;
        }
        .article-body code {
            background: #f0f2f5;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 14px;
        }
        @media (max-width: 600px) {
            .article-header, .article-body { padding: 24px 18px; }
            .article-header h1 { font-size: 22px; }
        }
    </style>
</head>
<body>
    <div class="back-nav">
        <div class="back-nav-inner">
            <a href="/">&larr; 返回首页</a>
            <span style="color:#999;font-size:13px;">${site.name}</span>
        </div>
    </div>
    <div class="container">
        <div class="article-header">
            <h1>${article.title}</h1>
            <div class="article-meta">
                ${article.published_at ? new Date(article.published_at).toLocaleDateString('zh-CN') : new Date(article.created_at).toLocaleDateString('zh-CN')}
            </div>
        </div>
        ${article.cover_image ? `<img src="${article.cover_image}" alt="${article.title}" class="article-cover">` : ''}
        <div class="article-body">
            ${article.content || article.summary || '<p>暂无内容</p>'}
        </div>
    </div>
</body>
</html>`
    return c.html(html)
  } catch (e) {
    return c.notFound()
  }
})

// Sitemap XML - dynamic per site
unifiedFrontendRoutes.get('/sitemap.xml', async (c) => {
  const site = getCurrentSite(c)
  if (!site) return c.notFound()

  const db = new DatabaseService(c.env.DB)
  const requestHost = c.req.header('x-forwarded-host') || c.req.header('host') || site.domain
  const baseUrl = `https://${requestHost.split(':')[0]}`
  const now = new Date().toISOString()

  // Static pages per site
  const staticPages: { loc: string; priority: string; changefreq: string }[] = [
    { loc: baseUrl, priority: '1.0', changefreq: 'daily' },
    { loc: `${baseUrl}/articles`, priority: '0.8', changefreq: 'daily' },
    { loc: `${baseUrl}/download`, priority: '0.8', changefreq: 'monthly' },
    { loc: `${baseUrl}/price`, priority: '0.7', changefreq: 'monthly' },
    { loc: `${baseUrl}/changelog`, priority: '0.6', changefreq: 'weekly' },
  ]

  // Get all published articles
  const articles = await db.execute<{ slug: string; updated_at: string; published_at: string }>(
    `SELECT slug, updated_at, published_at FROM articles WHERE site_id = ? AND status = 'published' ORDER BY published_at DESC`,
    [site.id]
  )

  const escXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`

  for (const p of staticPages) {
    xml += `  <url>\n    <loc>${escXml(p.loc)}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>\n`
  }

  for (const a of articles) {
    const lastmod = a.updated_at || a.published_at || now
    xml += `  <url>\n    <loc>${escXml(`${baseUrl}/article/${a.slug}`)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`
  }

  xml += `</urlset>`

  return c.newResponse(xml, 200, {
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': 'public, max-age=3600',
  })
})

// /index.html redirect to /
unifiedFrontendRoutes.get('/index.html', async (c) => {
  return c.redirect('/', 301)
})

// /sitemap redirect to /sitemap.xml
unifiedFrontendRoutes.get('/sitemap', async (c) => {
  return c.redirect('/sitemap.xml', 301)
})

// Robots.txt
unifiedFrontendRoutes.get('/robots.txt', async (c) => {
  const site = getCurrentSite(c)
  if (!site) return c.notFound()

  const requestHost = c.req.header('x-forwarded-host') || c.req.header('host') || site.domain
  const baseUrl = `https://${requestHost.split(':')[0]}`
  const txt = `User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}/sitemap.xml\n`

  return c.newResponse(txt, 200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'public, max-age=86400',
  })
})

// Matrix publish transition page - available for all sites
unifiedFrontendRoutes.get('/matrix-publish', async (c) => {
  const site = getCurrentSite(c)
  if (!site) return c.notFound()

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>矩阵群发工具 - ${site.name}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
            background: linear-gradient(135deg, #ff6b35 0%, #f7931e 50%, #ff4757 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .card {
            background: white;
            border-radius: 20px;
            padding: 50px 40px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.2);
            max-width: 500px;
            margin: 20px;
        }
        .icon { font-size: 48px; margin-bottom: 20px; }
        h1 { color: #333; font-size: 22px; margin-bottom: 16px; line-height: 1.5; }
        p { color: #555; font-size: 15px; line-height: 1.8; margin-bottom: 12px; }
        .features {
            text-align: left;
            background: #fff8f0;
            border: 1px solid #ffe0c0;
            border-radius: 12px;
            padding: 18px 20px;
            margin: 20px 0;
        }
        .features li {
            list-style: none;
            padding: 6px 0;
            font-size: 14px;
            color: #555;
        }
        .note {
            color: #ff6b35;
            font-size: 13px;
            margin-bottom: 28px;
            padding: 10px 16px;
            background: #fff5f0;
            border-radius: 8px;
            display: inline-block;
        }
        .confirm-btn {
            display: inline-block;
            background: linear-gradient(135deg, #ff6b35, #f7931e);
            color: #fff;
            padding: 14px 48px;
            border-radius: 30px;
            font-size: 16px;
            font-weight: 600;
            text-decoration: none;
            transition: opacity .2s;
            box-shadow: 0 4px 15px rgba(255,107,53,0.4);
        }
        .confirm-btn:hover { opacity: .85; }
        .back { display: block; margin-top: 20px; color: #999; font-size: 13px; text-decoration: none; }
        .back:hover { color: #666; }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">🚀</div>
        <h1>矩阵群发神器</h1>
        <p>剪辑好的视频，一键分发到 50+ 自媒体平台<br>支持 1000+ 账号同步管理，矩阵效率直接翻倍</p>
        <div class="features">
            <li>🚀 50+ 平台一键分发（抖音、快手、视频号、小红书...）</li>
            <li>📱 1000+ 账号批量管理</li>
            <li>📊 数据统一看板，全平台数据一目了然</li>
            <li>⚡ 定时自动发布，解放双手</li>
        </div>
        <div class="note">搭配剪辑软件使用，剪辑 + 分发效率翻倍</div>
        <br><br>
        <a href="https://www.17van.com/ad?channel=partner&inviteCode=3tt14e" target="_blank" rel="noopener" class="confirm-btn">免费体验矩阵群发</a>
        <a href="/" class="back">&larr; 返回首页</a>
    </div>
</body>
</html>`
  return c.html(html)
})

unifiedFrontendRoutes.get('/learn-more', async (c) => {
  const site = getCurrentSite(c)
  // 犀牛(site-001)与 ALLCUT(site-004)共用同一个 QQ 联系页
  if (site && (site.id === 'site-004' || site.id === 'site-001')) {
    return renderAllcutLearnMorePage(c, site)
  }
  return c.notFound()
})

export default unifiedFrontendRoutes