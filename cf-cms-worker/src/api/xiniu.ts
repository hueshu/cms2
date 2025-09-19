import { DatabaseService, KVService } from '../utils/database'
import { ArticleService } from '../services/articleService'

/**
 * Xiniu Jianji (犀牛剪辑) site renderer
 */
export async function renderXiniuHomepage(c: any, site: any) {
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
    <title>犀牛剪辑 - 批量视频剪辑、混剪，AI批量剪辑，视频消重去重</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
            background: #ffffff;
            min-height: 100vh;
            overflow-x: hidden;
        }

        /* Navigation */
        .navbar {
            background: rgba(255, 255, 255, 0.98);
            backdrop-filter: blur(10px);
            padding: 1rem 0;
            position: fixed;
            width: 100%;
            top: 0;
            z-index: 1000;
            box-shadow: 0 1px 10px rgba(0,0,0,0.08);
        }
        .nav-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .logo {
            font-size: 1.5rem;
            font-weight: bold;
            color: #333;
        }
        .logo span {
            color: #6366f1;
        }
        .nav-menu {
            display: flex;
            list-style: none;
            gap: 2.5rem;
        }
        .nav-menu a {
            color: #333;
            text-decoration: none;
            font-size: 1rem;
            transition: color 0.3s;
        }
        .nav-menu a:hover {
            color: #6366f1;
        }
        .nav-cta {
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            padding: 0.7rem 1.8rem;
            border-radius: 25px;
            text-decoration: none;
            font-size: 0.95rem;
            transition: transform 0.3s, box-shadow 0.3s;
        }
        .nav-cta:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 20px rgba(99, 102, 241, 0.4);
        }

        /* Hero Section */
        .hero {
            background: linear-gradient(135deg, #f5f3ff 0%, #e0e7ff 100%);
            padding: 120px 0 80px;
            position: relative;
        }
        .hero-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4rem;
            align-items: center;
        }
        .hero-content {
            animation: fadeInLeft 1s;
        }
        .hero-title {
            font-size: 3.5rem;
            line-height: 1.2;
            color: #1a202c;
            margin-bottom: 1.5rem;
        }
        .hero-highlight {
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .hero-description {
            font-size: 1.25rem;
            color: #64748b;
            line-height: 1.6;
            margin-bottom: 2rem;
        }
        .hero-features {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        .hero-feature {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }
        .hero-feature-icon {
            width: 40px;
            height: 40px;
            background: rgba(99, 102, 241, 0.1);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
        }
        .hero-feature-content {
            flex: 1;
        }
        .hero-feature-title {
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 0.25rem;
        }
        .hero-feature-desc {
            font-size: 0.9rem;
            color: #64748b;
        }
        .hero-cta {
            display: inline-block;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            padding: 1rem 2.5rem;
            border-radius: 30px;
            text-decoration: none;
            font-size: 1.1rem;
            font-weight: 600;
            transition: transform 0.3s, box-shadow 0.3s;
            margin-top: 1rem;
        }
        .hero-cta:hover {
            transform: translateY(-3px);
            box-shadow: 0 15px 40px rgba(99, 102, 241, 0.3);
        }
        .hero-image {
            position: relative;
            animation: fadeInRight 1s;
        }
        .hero-image-placeholder {
            width: 100%;
            height: 500px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 6rem;
            color: white;
            box-shadow: 0 30px 60px rgba(99, 102, 241, 0.3);
        }

        /* Features Section */
        .features {
            padding: 80px 0;
            background: white;
        }
        .features-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
        }
        .section-header {
            text-align: center;
            margin-bottom: 60px;
        }
        .section-title {
            font-size: 3rem;
            color: #1a202c;
            margin-bottom: 1rem;
        }
        .section-subtitle {
            font-size: 1.2rem;
            color: #64748b;
        }
        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 2rem;
        }
        .feature-card {
            background: #f8fafc;
            border-radius: 20px;
            padding: 2rem;
            transition: transform 0.3s, box-shadow 0.3s;
        }
        .feature-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .feature-icon {
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            border-radius: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            margin-bottom: 1.5rem;
        }
        .feature-title {
            font-size: 1.5rem;
            color: #1e293b;
            margin-bottom: 1rem;
        }
        .feature-desc {
            color: #64748b;
            line-height: 1.6;
        }

        /* Articles Section */
        .articles {
            padding: 80px 0;
            background: #f9fafb;
        }
        .articles-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
        }
        .articles-header {
            text-align: center;
            margin-bottom: 3rem;
        }
        .articles-title {
            font-size: 3rem;
            color: #1f2937;
            margin-bottom: 1rem;
        }
        .articles-subtitle {
            font-size: 1.2rem;
            color: #6b7280;
        }
        .articles-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 2rem;
        }
        .article-card {
            background: white;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 5px 20px rgba(0,0,0,0.08);
            transition: transform 0.3s, box-shadow 0.3s;
            text-decoration: none;
            display: flex;
            flex-direction: column;
        }
        .article-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 40px rgba(0,0,0,0.15);
        }
        .article-image {
            width: 100%;
            height: 180px;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 2rem;
        }
        .article-content {
            padding: 1.5rem;
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        .article-date {
            font-size: 0.85rem;
            color: #6b7280;
            margin-bottom: 0.5rem;
        }
        .article-title {
            font-size: 1.2rem;
            color: #1f2937;
            font-weight: 600;
            margin-bottom: 0.8rem;
            line-height: 1.4;
        }
        .article-summary {
            font-size: 0.95rem;
            color: #6b7280;
            line-height: 1.6;
            flex: 1;
        }
        .article-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-top: 1rem;
        }
        .article-tag {
            font-size: 0.8rem;
            padding: 0.3rem 0.8rem;
            background: #e0e7ff;
            color: #6366f1;
            border-radius: 15px;
        }
        .view-all-articles {
            text-align: center;
            margin-top: 3rem;
        }
        .view-all-btn {
            display: inline-block;
            padding: 1rem 2rem;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            text-decoration: none;
            border-radius: 25px;
            font-weight: 600;
            transition: transform 0.3s, box-shadow 0.3s;
        }
        .view-all-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(99, 102, 241, 0.3);
        }

        /* Footer */
        .footer {
            background: #1f2937;
            color: white;
            padding: 50px 0 30px;
        }
        .footer-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
            display: grid;
            grid-template-columns: 2fr 1fr 1fr 1fr;
            gap: 3rem;
        }
        .footer-brand {
            font-size: 1.5rem;
            font-weight: bold;
            margin-bottom: 1rem;
        }
        .footer-desc {
            color: #9ca3af;
            line-height: 1.6;
            margin-bottom: 1.5rem;
        }
        .footer-column h4 {
            margin-bottom: 1.5rem;
            font-size: 1.1rem;
        }
        .footer-column ul {
            list-style: none;
            display: flex;
            flex-direction: column;
            gap: 0.8rem;
        }
        .footer-column a {
            color: #9ca3af;
            text-decoration: none;
            transition: color 0.3s;
        }
        .footer-column a:hover {
            color: white;
        }
        .footer-bottom {
            text-align: center;
            margin-top: 3rem;
            padding-top: 2rem;
            border-top: 1px solid rgba(255,255,255,0.1);
            color: #6b7280;
        }

        @keyframes fadeInLeft {
            from { opacity: 0; transform: translateX(-50px); }
            to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeInRight {
            from { opacity: 0; transform: translateX(50px); }
            to { opacity: 1; transform: translateX(0); }
        }

        @media (max-width: 768px) {
            .hero-container { grid-template-columns: 1fr; }
            .hero-title { font-size: 2.5rem; }
            .nav-menu { display: none; }
            .footer-container { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <!-- Navigation -->
    <nav class="navbar">
        <div class="nav-container">
            <div class="logo">🦏 <span>犀牛剪辑</span></div>
            <ul class="nav-menu">
                <li><a href="#features">功能</a></li>
                <li><a href="#cases">案例</a></li>
                <li><a href="#pricing">价格</a></li>
                <li><a href="#download">下载</a></li>
            </ul>
            <a href="#download" class="nav-cta">立即下载</a>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero">
        <div class="hero-container">
            <div class="hero-content">
                <h1 class="hero-title">
                    <span class="hero-highlight">犀牛剪辑</span><br>
                    批量剪辑视频神器
                </h1>
                <p class="hero-description">
                    让视频创作更高效，一键批量处理，智能剪辑优化
                </p>
                <div class="hero-features">
                    <div class="hero-feature">
                        <div class="hero-feature-icon">⚡</div>
                        <div class="hero-feature-content">
                            <div class="hero-feature-title">批量</div>
                            <div class="hero-feature-desc">批量剪辑、混剪，解放双手</div>
                        </div>
                    </div>
                    <div class="hero-feature">
                        <div class="hero-feature-icon">🎯</div>
                        <div class="hero-feature-content">
                            <div class="hero-feature-title">简单</div>
                            <div class="hero-feature-desc">界面简洁，快速上手</div>
                        </div>
                    </div>
                    <div class="hero-feature">
                        <div class="hero-feature-icon">🎨</div>
                        <div class="hero-feature-content">
                            <div class="hero-feature-title">二创</div>
                            <div class="hero-feature-desc">自动抽帧补帧/画中画/贴纸等</div>
                        </div>
                    </div>
                    <div class="hero-feature">
                        <div class="hero-feature-icon">💪</div>
                        <div class="hero-feature-content">
                            <div class="hero-feature-title">强大</div>
                            <div class="hero-feature-desc">1套顶10套，效率翻倍</div>
                        </div>
                    </div>
                </div>
                <a href="#download" class="hero-cta">立即试用</a>
            </div>
            <div class="hero-image">
                <div class="hero-image-placeholder">🦏</div>
            </div>
        </div>
    </section>

    <!-- Features Section -->
    <section class="features" id="features">
        <div class="features-container">
            <div class="section-header">
                <h2 class="section-title">强大功能，助力创作</h2>
                <p class="section-subtitle">一站式视频批量处理解决方案</p>
            </div>
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon">✂️</div>
                    <h3 class="feature-title">批量剪辑</h3>
                    <p class="feature-desc">一键批量剪辑多个视频，支持自定义剪辑规则，大幅提升工作效率</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🎲</div>
                    <h3 class="feature-title">智能混剪</h3>
                    <p class="feature-desc">随机或按顺序组合视频片段，自动生成新内容，创意无限</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🎞️</div>
                    <h3 class="feature-title">片头片尾</h3>
                    <p class="feature-desc">批量添加专属片头片尾，精确去除视频开头结尾广告</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">💧</div>
                    <h3 class="feature-title">水印处理</h3>
                    <p class="feature-desc">支持添加图片/文字水印，智能去除原有水印</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">📝</div>
                    <h3 class="feature-title">自动字幕</h3>
                    <p class="feature-desc">AI识别语音自动生成字幕，支持中英双语字幕</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🎨</div>
                    <h3 class="feature-title">特效滤镜</h3>
                    <p class="feature-desc">丰富的视频特效和滤镜，让视频更具吸引力</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Articles Section -->
    <section class="articles">
        <div class="articles-container">
            <div class="articles-header">
                <h2 class="articles-title">最新文章</h2>
                <p class="articles-subtitle">了解视频剪辑技巧与行业动态</p>
            </div>
            <div class="articles-grid">
                ${
                    articles.length > 0
                    ? articles.map(article => `
                        <a href="/article/${article.slug}" class="article-card">
                            <div class="article-image">
                                ${article.cover_image ? `<img src="${article.cover_image}" alt="${article.title}" style="width:100%;height:100%;object-fit:cover;">` : '📄'}
                            </div>
                            <div class="article-content">
                                <div class="article-date">${new Date(article.published_at || article.created_at).toLocaleDateString('zh-CN')}</div>
                                <h3 class="article-title">${article.title}</h3>
                                <p class="article-summary">${article.summary || article.content?.substring(0, 100) + '...' || ''}</p>
                                ${article.tags && article.tags.length > 0 ? `
                                    <div class="article-tags">
                                        ${article.tags.slice(0, 3).map(tag => `<span class="article-tag">${tag.name}</span>`).join('')}
                                    </div>
                                ` : ''}
                            </div>
                        </a>
                    `).join('')
                    : `
                        <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #6b7280;">
                            <p style="font-size: 1.2rem; margin-bottom: 1rem;">暂无文章</p>
                            <p>精彩内容即将推出，敬请期待！</p>
                        </div>
                    `
                }
            </div>
            ${articles.length > 0 ? `
                <div class="view-all-articles">
                    <a href="/articles" class="view-all-btn">查看所有文章</a>
                </div>
            ` : ''}
        </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
        <div class="footer-container">
            <div class="footer-brand-section">
                <div class="footer-brand">🦏 犀牛剪辑</div>
                <p class="footer-desc">
                    批量视频剪辑神器，让视频创作更高效。支持批量剪辑、混剪、AI智能处理等功能，是视频创作者的最佳选择。
                </p>
            </div>
            <div class="footer-column">
                <h4>产品</h4>
                <ul>
                    <li><a href="/#features">功能介绍</a></li>
                    <li><a href="/#pricing">价格方案</a></li>
                    <li><a href="/changelog">更新日志</a></li>
                    <li><a href="/#download">下载中心</a></li>
                </ul>
            </div>
            <div class="footer-column">
                <h4>支持</h4>
                <ul>
                    <li><a href="/tutorials">使用教程</a></li>
                    <li><a href="/#faq">常见问题</a></li>
                    <li><a href="/contact">联系客服</a></li>
                    <li><a href="/feedback">意见反馈</a></li>
                </ul>
            </div>
            <div class="footer-column">
                <h4>网站地图</h4>
                <ul>
                    <li><a href="/">首页</a></li>
                    <li><a href="/articles">文章列表</a></li>
                    <li><a href="/about">关于我们</a></li>
                    <li><a href="/sitemap.xml">XML地图</a></li>
                    <li><a href="/privacy">隐私政策</a></li>
                    <li><a href="/terms">服务条款</a></li>
                    ${articles.length > 0 ? articles.slice(0, 3).map(article =>
                        `<li><a href="/article/${article.slug}">${article.title.length > 20 ? article.title.substring(0, 20) + '...' : article.title}</a></li>`
                    ).join('') : ''}
                </ul>
            </div>
        </div>
        <div class="footer-bottom">
            <p>© 2024 犀牛剪辑 | 深圳市犀牛科技有限公司 | 粤ICP备2024xxxxx号</p>
        </div>
    </footer>
</body>
</html>`

  return c.html(html)
}