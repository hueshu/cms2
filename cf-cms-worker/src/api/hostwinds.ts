import { DatabaseService, KVService } from '../utils/database'
import { ArticleService } from '../services/articleService'

/**
 * Hostwinds VPS site renderer
 */
export async function renderHostwindsHomepage(c: any, site: any) {
  let articles = []

  // Get articles for the site
  const db = new DatabaseService(c.env.DB)
  const kv = new KVService(c.env.CACHE_KV)
  const articleService = new ArticleService(db, kv, c.env.DB, c.env.CACHE_KV)

  try {
    const recentArticles = await articleService.getRecentArticles(site.id, 8)
    articles = recentArticles
  } catch (error) {
    console.error('Error fetching articles:', error)
    // Continue without articles
  }

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HostWinds VPS官网 - HostWinds服务器，HostWinds教程</title>
    <meta name="description" content="目前最便宜的Hostwinds VPS方案是Unmanaged Linux VPS（非托管Linux VPS）">
    <meta name="keywords" content="Hostwinds,VPS,服务器,云主机,Linux VPS,Windows VPS">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
            background: #f5f5f5;
            color: #333;
            line-height: 1.6;
        }

        /* Header */
        .header {
            background: #2c3e50;
            color: white;
            padding: 1rem 0;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .header-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
        }
        .nav {
            display: flex;
            gap: 30px;
        }
        .nav a {
            color: white;
            text-decoration: none;
            transition: opacity 0.3s;
        }
        .nav a:hover {
            opacity: 0.8;
        }

        /* Main Content */
        .main-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        /* Hero Section */
        .hero {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 60px 20px;
            text-align: center;
            margin-bottom: 40px;
            border-radius: 10px;
        }
        .hero h1 {
            font-size: 2.5rem;
            margin-bottom: 20px;
        }
        .hero p {
            font-size: 1.2rem;
            opacity: 0.95;
        }

        /* VPS Section */
        .vps-section {
            margin-bottom: 50px;
        }
        .section-title {
            font-size: 28px;
            margin-bottom: 30px;
            text-align: center;
            color: #2c3e50;
            padding-bottom: 10px;
            border-bottom: 2px solid #e0e0e0;
        }

        /* Pricing Table */
        .pricing-table {
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 40px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th {
            background: #34495e;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
        }
        td {
            padding: 15px;
            border-bottom: 1px solid #e0e0e0;
        }
        tr:hover {
            background: #f8f9fa;
        }
        tr:last-child td {
            border-bottom: none;
        }
        .price {
            color: #e74c3c;
            font-weight: bold;
            font-size: 18px;
        }
        .buy-btn {
            display: inline-block;
            background: #3498db;
            color: white;
            padding: 8px 20px;
            border-radius: 5px;
            text-decoration: none;
            transition: background 0.3s;
        }
        .buy-btn:hover {
            background: #2980b9;
        }

        /* Features */
        .features {
            background: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 40px;
        }
        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .feature-item {
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #3498db;
        }
        .feature-item h3 {
            color: #2c3e50;
            margin-bottom: 10px;
        }

        /* Articles */
        .articles {
            background: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 40px;
        }
        .articles-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .article-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-decoration: none;
            color: #333;
            transition: transform 0.3s, box-shadow 0.3s;
            border: 1px solid #e0e0e0;
        }
        .article-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        .article-date {
            font-size: 14px;
            color: #666;
            margin-bottom: 10px;
        }
        .article-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 10px;
            color: #2c3e50;
        }
        .article-summary {
            font-size: 14px;
            color: #666;
            line-height: 1.5;
        }

        /* Footer */
        .footer {
            background: #2c3e50;
            color: white;
            padding: 40px 0;
            margin-top: 50px;
        }
        .footer-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
            text-align: center;
        }
        .footer-links {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin-bottom: 20px;
        }
        .footer-links a {
            color: white;
            text-decoration: none;
            opacity: 0.8;
            transition: opacity 0.3s;
        }
        .footer-links a:hover {
            opacity: 1;
        }
        .copyright {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid rgba(255,255,255,0.1);
            opacity: 0.8;
        }
        .copyright a {
            color: white;
            text-decoration: none;
        }
        .copyright a:hover {
            text-decoration: underline;
        }

        @media (max-width: 768px) {
            .hero h1 { font-size: 2rem; }
            table { font-size: 14px; }
            th, td { padding: 10px; }
            .nav { flex-direction: column; gap: 10px; }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <header class="header">
        <div class="header-container">
            <div class="logo">Hostwinds VPS</div>
            <nav class="nav">
                <a href="/">首页</a>
                <a href="#linux-vps">Linux VPS</a>
                <a href="#managed-vps">托管VPS</a>
                <a href="#windows-vps">Windows VPS</a>
                <a href="#articles">教程</a>
            </nav>
        </div>
    </header>

    <!-- Hero Section -->
    <div class="hero">
        <h1>HostWinds VPS官网 - 高性价比VPS服务器</h1>
        <p>目前最便宜的Hostwinds VPS方案是Unmanaged Linux VPS（非托管Linux VPS）</p>
    </div>

    <!-- Main Container -->
    <div class="main-container">
        <!-- Unmanaged Linux VPS -->
        <section id="linux-vps" class="vps-section">
            <h2 class="section-title">Unmanaged Linux VPS (非托管Linux VPS)</h2>
            <div class="pricing-table">
                <table>
                    <thead>
                        <tr>
                            <th>套餐</th>
                            <th>CPU</th>
                            <th>内存</th>
                            <th>硬盘</th>
                            <th>带宽</th>
                            <th>流量</th>
                            <th>价格</th>
                            <th>购买</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>基础款</strong></td>
                            <td>1核</td>
                            <td>1 GB</td>
                            <td>30GB SSD</td>
                            <td>1 Gbps</td>
                            <td>1TB/月</td>
                            <td class="price">$4.99/月</td>
                            <td><a href="https://www.hostwinds.com/7781.html" class="buy-btn" target="_blank" rel="nofollow">立即购买</a></td>
                        </tr>
                        <tr>
                            <td><strong>1核2G</strong></td>
                            <td>1核</td>
                            <td>2 GB</td>
                            <td>50GB SSD</td>
                            <td>1 Gbps</td>
                            <td>2TB/月</td>
                            <td class="price">$9.99/月</td>
                            <td><a href="https://www.hostwinds.com/7781.html" class="buy-btn" target="_blank" rel="nofollow">立即购买</a></td>
                        </tr>
                        <tr>
                            <td><strong>2核4G</strong></td>
                            <td>2核</td>
                            <td>4 GB</td>
                            <td>75GB SSD</td>
                            <td>1 Gbps</td>
                            <td>2TB/月</td>
                            <td class="price">$18.99/月</td>
                            <td><a href="https://www.hostwinds.com/7781.html" class="buy-btn" target="_blank" rel="nofollow">立即购买</a></td>
                        </tr>
                        <tr>
                            <td><strong>4核8G</strong></td>
                            <td>4核</td>
                            <td>8 GB</td>
                            <td>150GB SSD</td>
                            <td>1 Gbps</td>
                            <td>3TB/月</td>
                            <td class="price">$38.99/月</td>
                            <td><a href="https://www.hostwinds.com/7781.html" class="buy-btn" target="_blank" rel="nofollow">立即购买</a></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>

        <!-- Managed Linux VPS -->
        <section id="managed-vps" class="vps-section">
            <h2 class="section-title">Managed Linux VPS (托管Linux VPS)</h2>
            <div class="pricing-table">
                <table>
                    <thead>
                        <tr>
                            <th>套餐</th>
                            <th>CPU</th>
                            <th>内存</th>
                            <th>硬盘</th>
                            <th>带宽</th>
                            <th>流量</th>
                            <th>机房</th>
                            <th>价格</th>
                            <th>购买</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>基础款</strong></td>
                            <td>1核</td>
                            <td>1 GB</td>
                            <td>30GB SSD</td>
                            <td>1 Gbps</td>
                            <td>1TB/月</td>
                            <td>美国/荷兰</td>
                            <td class="price">$8.24/月</td>
                            <td><a href="https://www.hostwinds.com/7781.html" class="buy-btn" target="_blank" rel="nofollow">立即购买</a></td>
                        </tr>
                        <tr>
                            <td><strong>1核2G</strong></td>
                            <td>1核</td>
                            <td>2 GB</td>
                            <td>50GB SSD</td>
                            <td>1 Gbps</td>
                            <td>2TB/月</td>
                            <td>美国/荷兰</td>
                            <td class="price">$16.49/月</td>
                            <td><a href="https://www.hostwinds.com/7781.html" class="buy-btn" target="_blank" rel="nofollow">立即购买</a></td>
                        </tr>
                        <tr>
                            <td><strong>2核4G</strong></td>
                            <td>2核</td>
                            <td>4 GB</td>
                            <td>75GB SSD</td>
                            <td>1 Gbps</td>
                            <td>2TB/月</td>
                            <td>美国/荷兰</td>
                            <td class="price">$29.99/月</td>
                            <td><a href="https://www.hostwinds.com/7781.html" class="buy-btn" target="_blank" rel="nofollow">立即购买</a></td>
                        </tr>
                        <tr>
                            <td><strong>4核8G</strong></td>
                            <td>4核</td>
                            <td>8 GB</td>
                            <td>150GB SSD</td>
                            <td>1 Gbps</td>
                            <td>3TB/月</td>
                            <td>美国/荷兰</td>
                            <td class="price">$59.99/月</td>
                            <td><a href="https://www.hostwinds.com/7781.html" class="buy-btn" target="_blank" rel="nofollow">立即购买</a></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>

        <!-- Windows VPS -->
        <section id="windows-vps" class="vps-section">
            <h2 class="section-title">Windows VPS</h2>
            <div class="pricing-table">
                <table>
                    <thead>
                        <tr>
                            <th>套餐</th>
                            <th>CPU</th>
                            <th>内存</th>
                            <th>硬盘</th>
                            <th>带宽</th>
                            <th>流量</th>
                            <th>价格</th>
                            <th>购买</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>基础款</strong></td>
                            <td>1核</td>
                            <td>1 GB</td>
                            <td>30GB SSD</td>
                            <td>1 Gbps</td>
                            <td>1TB/月</td>
                            <td class="price">$10.99/月</td>
                            <td><a href="https://www.hostwinds.com/7781.html" class="buy-btn" target="_blank" rel="nofollow">立即购买</a></td>
                        </tr>
                        <tr>
                            <td><strong>标准款</strong></td>
                            <td>2核</td>
                            <td>2 GB</td>
                            <td>50GB SSD</td>
                            <td>1 Gbps</td>
                            <td>2TB/月</td>
                            <td class="price">$18.99/月</td>
                            <td><a href="https://www.hostwinds.com/7781.html" class="buy-btn" target="_blank" rel="nofollow">立即购买</a></td>
                        </tr>
                        <tr>
                            <td><strong>高级款</strong></td>
                            <td>4核</td>
                            <td>4 GB</td>
                            <td>75GB SSD</td>
                            <td>1 Gbps</td>
                            <td>3TB/月</td>
                            <td class="price">$34.99/月</td>
                            <td><a href="https://www.hostwinds.com/7781.html" class="buy-btn" target="_blank" rel="nofollow">立即购买</a></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>

        <!-- Features -->
        <section class="features">
            <h2 class="section-title">为什么选择Hostwinds?</h2>
            <div class="features-grid">
                <div class="feature-item">
                    <h3>🚀 高性能SSD</h3>
                    <p>所有VPS均采用SSD固态硬盘，提供极速的读写性能</p>
                </div>
                <div class="feature-item">
                    <h3>🌐 全球机房</h3>
                    <p>美国西雅图、达拉斯和荷兰阿姆斯特丹机房可选</p>
                </div>
                <div class="feature-item">
                    <h3>💰 价格优惠</h3>
                    <p>业界最具竞争力的价格，最低仅需$4.99/月</p>
                </div>
                <div class="feature-item">
                    <h3>🔧 完全控制</h3>
                    <p>完整的root访问权限，可自定义配置服务器</p>
                </div>
                <div class="feature-item">
                    <h3>📈 即时扩展</h3>
                    <p>随时升级配置，满足业务增长需求</p>
                </div>
                <div class="feature-item">
                    <h3>🛡️ 99.9%正常运行时间</h3>
                    <p>高可靠性保证，确保您的业务持续在线</p>
                </div>
            </div>
        </section>

        <!-- Articles Section -->
        <section id="articles" class="articles">
            <h2 class="section-title">最新教程</h2>
            ${
                articles.length > 0
                ? `<div class="articles-grid">
                    ${articles.map(article => `
                        <a href="/article/${article.slug}" class="article-card">
                            <div class="article-date">${new Date(article.published_at || article.created_at).toLocaleDateString('zh-CN')}</div>
                            <h3 class="article-title">${article.title}</h3>
                            <p class="article-summary">${article.summary || article.content?.substring(0, 100) + '...' || ''}</p>
                        </a>
                    `).join('')}
                </div>`
                : `<div style="text-align: center; padding: 40px; color: #666;">
                    <p>暂无教程文章，敬请期待！</p>
                </div>`
            }
        </section>
    </div>

    <!-- Footer -->
    <footer class="footer">
        <div class="footer-container">
            <div class="footer-links">
                <a href="/">首页</a>
                <a href="/about">关于我们</a>
                <a href="/contact">联系我们</a>
                <a href="/sitemap.xml">网站地图</a>
            </div>
            <div class="copyright">
                <p>© 2024 vps honter. All rights reserved.</p>
                <p><a href="https://beian.miit.gov.cn/" target="_blank" rel="nofollow">沪ICP备2022016551号</a></p>
            </div>
        </div>
    </footer>
</body>
</html>`

  return c.html(html)
}