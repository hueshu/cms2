import { DatabaseService, KVService } from '../utils/database'
import { ArticleService } from '../services/articleService'
import { getICPInfo } from '../config/icp'
import { renderChangelogPage } from './changelog'

/**
 * Xiniu Jianji (犀牛剪辑) site renderer
 */
export async function renderXiniuHomepage(c: any, site: any) {
  let articles = []

  // Get current domain for ICP info
  const host = c.req.header('x-forwarded-host') || c.req.header('host') || ''
  const domain = host.split(':')[0]
  const icpInfo = getICPInfo(domain)

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
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 0.5rem;
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
            <a href="/" class="logo">🦏 <span>犀牛剪辑</span></a>
            <ul class="nav-menu">
                <li><a href="/price">价格</a></li>
                <li><a href="/tutorial">使用教程</a></li>
                <li><a href="/download">下载软件</a></li>
                <li><a href="/affiliate">推广赚钱</a></li>
                <li><a href="/matrix-publish">矩阵群发</a></li>
                <li><a href="/changelog">更新日志</a></li>
            </ul>
            <a href="/download" class="nav-cta">立即下载</a>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero">
        <div class="hero-container">
            <div class="hero-content">
                <h1 class="hero-title">
                    <span class="hero-highlight">犀牛剪辑</span><br>
                    AI批量剪辑视频工具
                </h1>
                <p class="hero-description">
                    批量剪辑视频、批量混剪短视频，一键批量处理视频，视频消重去重<br>
                    让视频创作更高效，解放双手，提升10倍效率
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
                <a href="/tutorial" class="hero-cta">立即看使用教程</a>
            </div>
            <div class="hero-image">
                <div class="hero-image-placeholder">🦏</div>
            </div>
        </div>
    </section>

    <!-- Scenarios Section -->
    <section class="scenarios" style="padding: 80px 0; background: white;">
        <div style="max-width: 1200px; margin: 0 auto; padding: 0 2rem;">
            <div class="section-header">
                <h2 class="section-title">适用场景</h2>
                <p class="section-subtitle">满足各行业批量视频处理需求</p>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-top: 3rem;">
                <div style="text-align: center; padding: 1.5rem; background: #f8fafc; border-radius: 15px; transition: transform 0.3s;" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🎬</div>
                    <h4 style="color: #1e293b; margin-bottom: 0.5rem;">电影混剪</h4>
                    <p style="font-size: 0.9rem; color: #64748b;">批量剪辑精彩片段</p>
                </div>
                <div style="text-align: center; padding: 1.5rem; background: #f8fafc; border-radius: 15px; transition: transform 0.3s;" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📺</div>
                    <h4 style="color: #1e293b; margin-bottom: 0.5rem;">电视剧剪辑</h4>
                    <p style="font-size: 0.9rem; color: #64748b;">批量去片头片尾</p>
                </div>
                <div style="text-align: center; padding: 1.5rem; background: #f8fafc; border-radius: 15px; transition: transform 0.3s;" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🎥</div>
                    <h4 style="color: #1e293b; margin-bottom: 0.5rem;">短视频创作</h4>
                    <p style="font-size: 0.9rem; color: #64748b;">快速生成原创内容</p>
                </div>
                <div style="text-align: center; padding: 1.5rem; background: #f8fafc; border-radius: 15px; transition: transform 0.3s;" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🎮</div>
                    <h4 style="color: #1e293b; margin-bottom: 0.5rem;">游戏精彩</h4>
                    <p style="font-size: 0.9rem; color: #64748b;">批量剪辑游戏集锦</p>
                </div>
                <div style="text-align: center; padding: 1.5rem; background: #f8fafc; border-radius: 15px; transition: transform 0.3s;" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📚</div>
                    <h4 style="color: #1e293b; margin-bottom: 0.5rem;">教育培训</h4>
                    <p style="font-size: 0.9rem; color: #64748b;">批量处理课程视频</p>
                </div>
                <div style="text-align: center; padding: 1.5rem; background: #f8fafc; border-radius: 15px; transition: transform 0.3s;" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🛍️</div>
                    <h4 style="color: #1e293b; margin-bottom: 0.5rem;">电商带货</h4>
                    <p style="font-size: 0.9rem; color: #64748b;">批量制作商品视频</p>
                </div>
                <div style="text-align: center; padding: 1.5rem; background: #f8fafc; border-radius: 15px; transition: transform 0.3s;" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🎉</div>
                    <h4 style="color: #1e293b; margin-bottom: 0.5rem;">娱乐搞笑</h4>
                    <p style="font-size: 0.9rem; color: #64748b;">批量制作娱乐视频</p>
                </div>
                <div style="text-align: center; padding: 1.5rem; background: #f8fafc; border-radius: 15px; transition: transform 0.3s;" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🎵</div>
                    <h4 style="color: #1e293b; margin-bottom: 0.5rem;">音乐MV</h4>
                    <p style="font-size: 0.9rem; color: #64748b;">批量制作音乐视频</p>
                </div>
                <div style="text-align: center; padding: 1.5rem; background: #f8fafc; border-radius: 15px; transition: transform 0.3s;" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">💼</div>
                    <h4 style="color: #1e293b; margin-bottom: 0.5rem;">企业宣传</h4>
                    <p style="font-size: 0.9rem; color: #64748b;">批量处理宣传素材</p>
                </div>
                <div style="text-align: center; padding: 1.5rem; background: #f8fafc; border-radius: 15px; transition: transform 0.3s;" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📰</div>
                    <h4 style="color: #1e293b; margin-bottom: 0.5rem;">新闻资讯</h4>
                    <p style="font-size: 0.9rem; color: #64748b;">快速剪辑新闻片段</p>
                </div>
                <div style="text-align: center; padding: 1.5rem; background: #f8fafc; border-radius: 15px; transition: transform 0.3s;" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🏆</div>
                    <h4 style="color: #1e293b; margin-bottom: 0.5rem;">体育赛事</h4>
                    <p style="font-size: 0.9rem; color: #64748b;">批量剪辑精彩瞬间</p>
                </div>
                <div style="text-align: center; padding: 1.5rem; background: #f8fafc; border-radius: 15px; transition: transform 0.3s;" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🎯</div>
                    <h4 style="color: #1e293b; margin-bottom: 0.5rem;">广告营销</h4>
                    <p style="font-size: 0.9rem; color: #64748b;">批量制作广告素材</p>
                </div>
                <div style="text-align: center; padding: 1.5rem; background: #f8fafc; border-radius: 15px; transition: transform 0.3s;" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📷</div>
                    <h4 style="color: #1e293b; margin-bottom: 0.5rem;">个人Vlog</h4>
                    <p style="font-size: 0.9rem; color: #64748b;">批量处理日常记录</p>
                </div>
                <div style="text-align: center; padding: 1.5rem; background: #f8fafc; border-radius: 15px; transition: transform 0.3s;" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🎤</div>
                    <h4 style="color: #1e293b; margin-bottom: 0.5rem;">直播回放</h4>
                    <p style="font-size: 0.9rem; color: #64748b;">批量剪辑直播精华</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Features Section -->
    <section class="features" id="features">
        <div class="features-container">
            <div class="section-header">
                <h2 class="section-title">核心功能</h2>
                <p class="section-subtitle">一站式视频批量处理解决方案，让创作更高效</p>
            </div>
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon">✂️</div>
                    <h3 class="feature-title">批量剪辑</h3>
                    <p class="feature-desc">批量剪辑多段视频，是批量混剪工具，批量去片头片尾，批量插广告、合并视频，批量消重/去重等</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🎲</div>
                    <h3 class="feature-title">智能混剪</h3>
                    <p class="feature-desc">混剪功能支持视频的随机切割组合，视频片段顺序组合，视频画面合成，剪辑合成等功能</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🎞️</div>
                    <h3 class="feature-title">加减片头片尾</h3>
                    <p class="feature-desc">批量加片头片尾，电影视频批量减片头片尾，电视剧批量去片头片尾，全自动快速处理</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">💧</div>
                    <h3 class="feature-title">批量加减水印</h3>
                    <p class="feature-desc">批量给视频加水印，同时支持批量给视频去水印，图片文字水印动态水印都支持</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">📝</div>
                    <h3 class="feature-title">智能字幕</h3>
                    <p class="feature-desc">软件支持批量视频加字幕，语音识别字幕，实时字幕，双语字幕，字幕翻译等功能</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🎨</div>
                    <h3 class="feature-title">视频二创</h3>
                    <p class="feature-desc">二次创作优化，批量裁剪画面，镜像翻转，画面缩放，多种转场，变速抽帧补帧等</p>
                </div>
            </div>
        </div>
    </section>

    <!-- User Cases Section -->
    <section class="cases" style="padding: 80px 0; background: #f9fafb;">
        <div style="max-width: 1200px; margin: 0 auto; padding: 0 2rem;">
            <div class="section-header">
                <h2 class="section-title">用户案例</h2>
                <p class="section-subtitle">看看大家如何使用犀牛剪辑提升创作效率</p>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 2rem; margin-top: 3rem;">
                <div style="background: white; padding: 2rem; border-radius: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.08);">
                    <div style="display: flex; align-items: center; margin-bottom: 1rem;">
                        <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; margin-right: 1rem;">张先生</div>
                        <div>
                            <h4 style="color: #1e293b; margin-bottom: 0.25rem;">电商运营</h4>
                            <p style="color: #64748b; font-size: 0.9rem;">淘宝店主</p>
                        </div>
                    </div>
                    <p style="color: #475569; line-height: 1.6;">"使用犀牛剪辑后，我的商品视频制作效率提高了10倍！以前一天只能做3-5个视频，现在可以批量处理50个以上，销售转化率也明显提升。"</p>
                </div>
                <div style="background: white; padding: 2rem; border-radius: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.08);">
                    <div style="display: flex; align-items: center; margin-bottom: 1rem;">
                        <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #f59e0b, #ef4444); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; margin-right: 1rem;">李女士</div>
                        <div>
                            <h4 style="color: #1e293b; margin-bottom: 0.25rem;">短视频创作者</h4>
                            <p style="color: #64748b; font-size: 0.9rem;">抖音达人</p>
                        </div>
                    </div>
                    <p style="color: #475569; line-height: 1.6;">"混剪功能太强大了！我可以快速将多个素材组合成新的创意视频，配合批量消重功能，让每个视频都是原创，粉丝增长速度翻倍。"</p>
                </div>
                <div style="background: white; padding: 2rem; border-radius: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.08);">
                    <div style="display: flex; align-items: center; margin-bottom: 1rem;">
                        <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #10b981, #3b82f6); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; margin-right: 1rem;">王老师</div>
                        <div>
                            <h4 style="color: #1e293b; margin-bottom: 0.25rem;">教育工作者</h4>
                            <p style="color: #64748b; font-size: 0.9rem;">在线教育讲师</p>
                        </div>
                    </div>
                    <p style="color: #475569; line-height: 1.6;">"批量处理课程视频节省了大量时间。自动去除课程开头结尾，批量添加字幕和水印，让我能专注于教学内容的打磨。"</p>
                </div>
            </div>
        </div>
    </section>

    <!-- FAQ Section -->
    <section class="faq" style="padding: 80px 0; background: white;" id="faq">
        <div style="max-width: 1200px; margin: 0 auto; padding: 0 2rem;">
            <div class="section-header">
                <h2 class="section-title">常见问题</h2>
                <p class="section-subtitle">解答您最关心的问题</p>
            </div>
            <div style="max-width: 800px; margin: 3rem auto 0;">
                <details style="background: #f8fafc; border-radius: 10px; padding: 1.5rem; margin-bottom: 1rem; cursor: pointer;">
                    <summary style="font-weight: 600; color: #1e293b; font-size: 1.1rem;">犀牛剪辑支持哪些视频格式？</summary>
                    <p style="color: #64748b; margin-top: 1rem; line-height: 1.6;">支持所有主流视频格式，包括MP4、AVI、MOV、MKV、FLV、WMV、WEBM等，基本涵盖市面上99%的视频格式。</p>
                </details>
                <details style="background: #f8fafc; border-radius: 10px; padding: 1.5rem; margin-bottom: 1rem; cursor: pointer;">
                    <summary style="font-weight: 600; color: #1e293b; font-size: 1.1rem;">批量处理有数量限制吗？</summary>
                    <p style="color: #64748b; margin-top: 1rem; line-height: 1.6;">没有硬性限制，理论上可以同时处理数千个视频。实际处理速度取决于您的电脑配置和视频大小。</p>
                </details>
                <details style="background: #f8fafc; border-radius: 10px; padding: 1.5rem; margin-bottom: 1rem; cursor: pointer;">
                    <summary style="font-weight: 600; color: #1e293b; font-size: 1.1rem;">处理后的视频会损失画质吗？</summary>
                    <p style="color: #64748b; margin-top: 1rem; line-height: 1.6;">犀牛剪辑采用先进的编码技术，支持无损输出。您可以自定义输出质量，在文件大小和画质之间找到最佳平衡。</p>
                </details>
                <details style="background: #f8fafc; border-radius: 10px; padding: 1.5rem; margin-bottom: 1rem; cursor: pointer;">
                    <summary style="font-weight: 600; color: #1e293b; font-size: 1.1rem;">软件是一次性购买还是订阅制？</summary>
                    <p style="color: #64748b; margin-top: 1rem; line-height: 1.6;">提供多种购买方案：月度订阅、年度订阅和永久授权。永久授权一次购买，终身使用，包含一年免费更新。</p>
                </details>
                <details style="background: #f8fafc; border-radius: 10px; padding: 1.5rem; margin-bottom: 1rem; cursor: pointer;">
                    <summary style="font-weight: 600; color: #1e293b; font-size: 1.1rem;">支持Mac系统吗？</summary>
                    <p style="color: #64748b; margin-top: 1rem; line-height: 1.6;">目前支持Windows系统（Win7及以上），Mac版本正在开发中，预计近期推出。</p>
                </details>
                <details style="background: #f8fafc; border-radius: 10px; padding: 1.5rem; margin-bottom: 1rem; cursor: pointer;">
                    <summary style="font-weight: 600; color: #1e293b; font-size: 1.1rem;">有使用教程吗？</summary>
                    <p style="color: #64748b; margin-top: 1rem; line-height: 1.6;">提供详细的视频教程和文档说明，购买后可加入用户群，有专人指导使用。软件界面简洁直观，大部分功能看一遍就会。</p>
                </details>
            </div>
        </div>
    </section>

    <!-- Testimonials Section -->
    <section class="testimonials" style="padding: 80px 0; background: linear-gradient(135deg, #f5f3ff 0%, #e0e7ff 100%);">
        <div style="max-width: 1200px; margin: 0 auto; padding: 0 2rem;">
            <div class="section-header">
                <h2 class="section-title">用户评价</h2>
                <p class="section-subtitle">超过10万+创作者的共同选择</p>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; margin-top: 3rem;">
                <div style="background: white; padding: 1.5rem; border-radius: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
                    <div style="color: #fbbf24; font-size: 1.2rem; margin-bottom: 1rem;">⭐⭐⭐⭐⭐</div>
                    <p style="color: #475569; line-height: 1.6; margin-bottom: 1rem;">"神器！批量剪辑效率超高，节省了我80%的时间。"</p>
                    <p style="color: #6b7280; font-size: 0.9rem;">- 小红书博主</p>
                </div>
                <div style="background: white; padding: 1.5rem; border-radius: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
                    <div style="color: #fbbf24; font-size: 1.2rem; margin-bottom: 1rem;">⭐⭐⭐⭐⭐</div>
                    <p style="color: #475569; line-height: 1.6; margin-bottom: 1rem;">"功能全面，操作简单，价格实惠，强烈推荐！"</p>
                    <p style="color: #6b7280; font-size: 0.9rem;">- B站UP主</p>
                </div>
                <div style="background: white; padding: 1.5rem; border-radius: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
                    <div style="color: #fbbf24; font-size: 1.2rem; margin-bottom: 1rem;">⭐⭐⭐⭐⭐</div>
                    <p style="color: #475569; line-height: 1.6; margin-bottom: 1rem;">"客服响应快，问题解决及时，软件稳定性很好。"</p>
                    <p style="color: #6b7280; font-size: 0.9rem;">- 影视工作室</p>
                </div>
                <div style="background: white; padding: 1.5rem; border-radius: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
                    <div style="color: #fbbf24; font-size: 1.2rem; margin-bottom: 1rem;">⭐⭐⭐⭐⭐</div>
                    <p style="color: #475569; line-height: 1.6; margin-bottom: 1rem;">"混剪功能太棒了，轻松制作原创视频内容。"</p>
                    <p style="color: #6b7280; font-size: 0.9rem;">- 视频号运营者</p>
                </div>
                <div style="background: white; padding: 1.5rem; border-radius: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
                    <div style="color: #fbbf24; font-size: 1.2rem; margin-bottom: 1rem;">⭐⭐⭐⭐⭐</div>
                    <p style="color: #475569; line-height: 1.6; margin-bottom: 1rem;">"去重功能很实用，再也不怕平台判定重复了。"</p>
                    <p style="color: #6b7280; font-size: 0.9rem;">- 自媒体团队</p>
                </div>
                <div style="background: white; padding: 1.5rem; border-radius: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
                    <div style="color: #fbbf24; font-size: 1.2rem; margin-bottom: 1rem;">⭐⭐⭐⭐⭐</div>
                    <p style="color: #475569; line-height: 1.6; margin-bottom: 1rem;">"性价比超高，功能比其他软件多，价格却更实惠。"</p>
                    <p style="color: #6b7280; font-size: 0.9rem;">- 个人创作者</p>
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
                    <a href="/articles" class="view-all-btn">查看更多文章</a>
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
                    <li><a href="/">功能介绍</a></li>
                    <li><a href="/price">价格方案</a></li>
                    <li><a href="/download">下载中心</a></li>
                    <li><a href="/affiliate">推广赚钱</a></li>
                </ul>
            </div>
            <div class="footer-column">
                <h4>支持</h4>
                <ul>
                    <li><a href="/tutorial">使用教程</a></li>
                    <li><a href="/download">常见问题</a></li>
                    <li><a href="/learn-more">联系客服</a></li>
                    <li><a href="https://sales.allcut.cn" target="_blank" rel="noopener">意见反馈</a></li>
                </ul>
            </div>
            <div class="footer-column">
                <h4>网站地图</h4>
                <ul>
                    <li><a href="/">首页</a></li>
                    <li><a href="/articles">文章列表</a></li>
                    <li><a href="/sitemap.xml">XML地图</a></li>
                    ${articles.length > 0 ? articles.slice(0, 3).map(article =>
                        `<li><a href="/article/${article.slug}">${article.title.length > 20 ? article.title.substring(0, 20) + '...' : article.title}</a></li>`
                    ).join('') : ''}
                </ul>
            </div>
        </div>
        <div class="footer-bottom">
            <p>© 2024 犀牛剪辑${icpInfo ? ` | ${icpInfo.company}` : ''}</p>
            ${icpInfo ? `<p><a href="https://beian.miit.gov.cn/" target="_blank" style="color: #9ca3af;">${icpInfo.icp}</a></p>` : ''}
        </div>
    </footer>

    <!-- Affiliate Popup -->
    <div id="affPopup" style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);align-items:center;justify-content:center;">
        <div style="background:#fff;border-radius:20px;padding:40px 32px 32px;max-width:420px;width:90%;text-align:center;position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:popIn .3s ease-out;">
            <button onclick="document.getElementById('affPopup').style.display='none'" style="position:absolute;top:12px;right:16px;background:none;border:none;font-size:22px;color:#999;cursor:pointer;line-height:1;">&times;</button>
            <div style="font-size:42px;margin-bottom:16px;">💰</div>
            <h3 style="font-size:22px;color:#1a1a1a;margin-bottom:10px;line-height:1.4;">分享软件，躺着赚钱</h3>
            <p style="color:#555;font-size:15px;line-height:1.8;margin-bottom:20px;">推荐好友购买犀牛剪辑(ALLCUT)，你就能拿佣金<br>不用囤货、不用客服，分享链接就行</p>
            <div style="background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border-radius:12px;padding:18px 20px;margin-bottom:22px;">
                <div style="font-size:36px;font-weight:800;margin-bottom:4px;">最高 40%</div>
                <div style="font-size:14px;opacity:0.9;">每笔订单分成直接到账</div>
            </div>
            <ul style="text-align:left;list-style:none;padding:0;margin-bottom:24px;font-size:14px;color:#555;">
                <li style="padding:6px 0;">✅ 专属优惠码，客户使用即关联你的佣金</li>
                <li style="padding:6px 0;">✅ 后台随时查看推广数据和佣金</li>
                <li style="padding:6px 0;">✅ 零门槛加入，免费注册即可开始推广</li>
            </ul>
            <a href="/affiliate" style="display:block;background:linear-gradient(135deg,#ff6b35,#f7931e);color:#fff;padding:14px;border-radius:30px;font-size:16px;font-weight:600;text-decoration:none;transition:opacity .2s;">立即加入推广计划</a>
            <p style="color:#aaa;font-size:12px;margin-top:12px;">已有 200+ 推广员在赚取佣金</p>
        </div>
    </div>
    <style>@keyframes popIn{from{transform:scale(0.8);opacity:0}to{transform:scale(1);opacity:1}}</style>
    <script>
        setTimeout(function(){
            if(!sessionStorage.getItem('affShown')){
                document.getElementById('affPopup').style.display='flex';
                sessionStorage.setItem('affShown','1');
            }
        },3000);
        document.getElementById('affPopup').addEventListener('click',function(e){
            if(e.target===this)this.style.display='none';
        });
    </script>

    <!-- Exit Intent Popup -->
    <div id="exitPopup" style="display:none;position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);align-items:center;justify-content:center;">
        <div style="background:#fff;border-radius:24px;max-width:380px;width:90%;overflow:hidden;box-shadow:0 25px 60px rgba(255,80,0,0.2);animation:exitBounce .5s cubic-bezier(.34,1.56,.64,1);">
            <div style="background:linear-gradient(135deg,#ff6b35,#f43f5e,#ec4899);padding:32px 24px 40px;text-align:center;position:relative;overflow:hidden;">
                <div style="width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,0.2);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;animation:exitShake .6s ease-in-out;">
                    <span style="font-size:30px;">👋</span>
                </div>
                <h3 style="font-size:22px;font-weight:900;color:#fff;margin-bottom:6px;text-shadow:0 2px 8px rgba(0,0,0,0.15);">顺便看看矩阵工具？</h3>
                <p style="color:rgba(255,255,255,0.9);font-size:14px;font-weight:500;">剪辑 + 分发，矩阵效率直接翻倍！</p>
            </div>
            <div style="background:#fff;border-radius:24px 24px 0 0;margin-top:-20px;position:relative;padding:20px 24px 24px;">
                <div style="border:2px solid #fed7aa;background:linear-gradient(135deg,#fff7ed,#fef2f2);border-radius:16px;padding:16px;margin-bottom:16px;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                        <span style="display:inline-flex;width:10px;height:10px;border-radius:50%;background:#ef4444;animation:exitPing 1.5s infinite;"></span>
                        <span style="font-size:14px;font-weight:700;color:#111;">矩阵分发神器</span>
                        <span style="padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;background:#ef4444;color:#fff;">限时免费体验</span>
                    </div>
                    <p style="font-size:14px;color:#444;line-height:1.7;margin-bottom:12px;">
                        一键分发 <span style="color:#ea580c;font-weight:900;font-size:16px;">50+</span> 自媒体平台<br>
                        支持 <span style="color:#dc2626;font-weight:900;font-size:16px;">1000+</span> 账号同步管理
                    </p>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
                        <div style="display:flex;align-items:center;gap:6px;background:#fff;border-radius:8px;padding:8px 10px;border:1px solid #fed7aa;font-size:12px;color:#555;">🚀 50+平台一键分发</div>
                        <div style="display:flex;align-items:center;gap:6px;background:#fff;border-radius:8px;padding:8px 10px;border:1px solid #fed7aa;font-size:12px;color:#555;">📱 1000+账号管理</div>
                        <div style="display:flex;align-items:center;gap:6px;background:#fff;border-radius:8px;padding:8px 10px;border:1px solid #fed7aa;font-size:12px;color:#555;">📊 数据统一看板</div>
                        <div style="display:flex;align-items:center;gap:6px;background:#fff;border-radius:8px;padding:8px 10px;border:1px solid #fed7aa;font-size:12px;color:#555;">⚡ 定时自动发布</div>
                    </div>
                </div>
                <a href="https://www.17van.com/ad?channel=partner&inviteCode=3tt14e" target="_blank" rel="noopener" style="display:block;width:100%;padding:14px;border-radius:16px;text-align:center;font-size:16px;font-weight:900;color:#fff;background:linear-gradient(135deg,#ff6b35,#ef4444);text-decoration:none;animation:exitGlow 2s ease-in-out infinite;">免费体验矩阵群发 →</a>
                <button onclick="document.getElementById('exitPopup').style.display='none'" style="display:block;width:100%;text-align:center;font-size:12px;color:#aaa;background:none;border:none;cursor:pointer;padding:10px;margin-top:4px;">不感兴趣，继续浏览</button>
            </div>
        </div>
    </div>
    <style>
        @keyframes exitBounce{0%{opacity:0;transform:scale(.3) rotate(-5deg)}50%{opacity:1;transform:scale(1.05) rotate(1deg)}70%{transform:scale(.95) rotate(-.5deg)}100%{transform:scale(1) rotate(0)}}
        @keyframes exitShake{0%,100%{transform:translateX(0)}15%{transform:translateX(-4px)}30%{transform:translateX(4px)}45%{transform:translateX(-3px)}60%{transform:translateX(3px)}75%{transform:translateX(-1px)}}
        @keyframes exitGlow{0%,100%{box-shadow:0 0 20px rgba(255,80,0,.3)}50%{box-shadow:0 0 40px rgba(255,80,0,.6)}}
        @keyframes exitPing{0%{opacity:1;transform:scale(1)}75%,100%{opacity:0;transform:scale(2)}}
    </style>
    <script>
        document.addEventListener('mouseleave',function(e){
            if(e.clientY<=5 && !sessionStorage.getItem('exitShown')){
                document.getElementById('exitPopup').style.display='flex';
                sessionStorage.setItem('exitShown','1');
            }
        });
        document.getElementById('exitPopup').addEventListener('click',function(e){
            if(e.target===this)this.style.display='none';
        });
    </script>
</body>
</html>`

  return c.html(html)
}

/**
 * Render Xiniu pricing page - 跳转到 ALLCUT 购买页
 */
export async function renderXiniuPricePage(c: any, site: any) {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>价格 - 犀牛剪辑</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
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
        .highlight { color: #6366f1; font-weight: bold; }
        p { color: #666; font-size: 15px; line-height: 1.6; margin-bottom: 24px; }
        .confirm-btn {
            display: inline-block;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: #fff;
            padding: 14px 48px;
            border-radius: 30px;
            font-size: 16px;
            font-weight: 600;
            text-decoration: none;
            transition: opacity .2s;
        }
        .confirm-btn:hover { opacity: .85; }
        .back { display: block; margin-top: 20px; color: #999; font-size: 13px; text-decoration: none; }
        .back:hover { color: #666; }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">🦏 &rarr; ✂️</div>
        <h1>犀牛剪辑已升级为 <span class="highlight">ALLCUT</span></h1>
        <p>全新品牌，功能更强大！<br>点击下方按钮前往 ALLCUT 购买页面</p>
        <a href="https://sales.allcut.cn" target="_blank" rel="noopener" class="confirm-btn">前往 ALLCUT 购买页面</a>
        <a href="/" class="back">&larr; 返回首页</a>
    </div>
</body>
</html>`
  return c.html(html)
}

/**
 * Render Xiniu download page - same structure as ALLCUT with rebrand notice
 */
export async function renderXiniuDownloadPage(c: any, site: any) {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>下载软件 - 犀牛剪辑(ALLCUT)</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .back-home {
            position: fixed;
            top: 20px;
            left: 20px;
            background: rgba(255,255,255,0.9);
            color: #667eea;
            padding: 10px 20px;
            border-radius: 25px;
            text-decoration: none;
            font-size: 14px;
            transition: all 0.3s;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 10;
        }
        .back-home:hover {
            background: white;
            transform: translateY(-2px);
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        .container {
            max-width: 680px;
            margin: 0 auto;
            padding: 80px 20px 40px;
            flex: 1;
        }
        .rebrand-banner {
            background: rgba(255,255,255,0.15);
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: 12px;
            padding: 16px 24px;
            margin-bottom: 24px;
            text-align: center;
            color: #fff;
            font-size: 15px;
            line-height: 1.6;
        }
        .rebrand-banner strong { font-size: 17px; }
        .content-card {
            background: white;
            border-radius: 20px;
            padding: 50px 40px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.2);
        }
        h1 {
            color: #333;
            font-size: 28px;
            margin-bottom: 16px;
        }
        .notice {
            background: #fff8e1;
            border: 1px solid #ffe082;
            border-radius: 12px;
            padding: 16px 20px;
            margin-bottom: 30px;
            color: #795548;
            font-size: 15px;
            line-height: 1.6;
        }
        .notice strong { color: #e65100; }
        .section-title {
            color: #333;
            font-size: 20px;
            margin-bottom: 12px;
            font-weight: 600;
        }
        .tutorial-box {
            background: #f0f4ff;
            border: 2px solid #667eea;
            border-radius: 16px;
            padding: 28px 24px;
            margin-bottom: 28px;
        }
        .tutorial-box p {
            color: #555;
            font-size: 15px;
            line-height: 1.8;
            margin-bottom: 16px;
        }
        .btn {
            display: inline-block;
            padding: 14px 36px;
            border-radius: 30px;
            text-decoration: none;
            font-size: 16px;
            font-weight: 600;
            transition: all 0.3s;
            cursor: pointer;
        }
        .btn-primary {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 25px rgba(102, 126, 234, 0.5);
        }
        .btn-buy {
            background: linear-gradient(135deg, #ff6b35, #f7931e);
            color: white;
            box-shadow: 0 4px 15px rgba(255, 107, 53, 0.4);
            margin-top: 8px;
        }
        .btn-buy:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 25px rgba(255, 107, 53, 0.5);
        }
        .divider {
            height: 1px;
            background: #e8e8e8;
            margin: 28px 0;
        }
        .steps {
            text-align: left;
            margin: 20px 0;
        }
        .step {
            display: flex;
            align-items: flex-start;
            margin-bottom: 16px;
        }
        .step-num {
            background: #667eea;
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: bold;
            flex-shrink: 0;
            margin-right: 12px;
            margin-top: 2px;
        }
        .step-text {
            color: #555;
            font-size: 15px;
            line-height: 1.6;
        }
        .step-text a {
            color: #667eea;
            text-decoration: none;
            font-weight: 500;
        }
        .step-text a:hover { text-decoration: underline; }
        .feature-guide {
            background: #f8fafb;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            padding: 24px;
            margin-bottom: 28px;
            text-align: left;
        }
        .feature-guide-title {
            color: #333;
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 14px;
            text-align: center;
        }
        .feature-item {
            display: flex;
            align-items: baseline;
            margin-bottom: 10px;
            font-size: 14px;
            line-height: 1.6;
            color: #555;
        }
        .feature-label {
            font-weight: 600;
            color: #333;
            white-space: nowrap;
            margin-right: 8px;
        }
        .feature-num {
            display: inline-block;
            background: #667eea;
            color: white;
            border-radius: 4px;
            padding: 1px 6px;
            font-size: 12px;
            font-weight: 600;
            margin: 0 2px;
        }
        .feature-note {
            color: #888;
            font-size: 13px;
        }
        .feature-total {
            text-align: center;
            margin-top: 14px;
            padding-top: 14px;
            border-top: 1px solid #e2e8f0;
            color: #667eea;
            font-weight: 600;
            font-size: 15px;
        }
        @media (max-width: 600px) {
            .content-card { padding: 30px 20px; }
            h1 { font-size: 24px; }
            .btn { padding: 12px 28px; font-size: 15px; }
        }
    </style>
</head>
<body>
    <a href="/" class="back-home">&larr; 返回首页</a>

    <div class="container">
        <div class="rebrand-banner">
            <strong>犀牛剪辑已升级为 ALLCUT</strong><br>
            品牌全新升级，功能更强大！下载地址与使用方式不变。
        </div>

        <div class="content-card">
            <h1>下载 ALLCUT</h1>

            <div class="notice">
                <strong>温馨提示：</strong>软件暂无试用版，安装包较大。建议先查看教程了解功能，确认适合您的需求后再购买下载。
            </div>

            <h3 class="section-title">建议先看软件教程</h3>
            <div class="tutorial-box">
                <p>这是软件视频教程，功能有点多。<br>你可以先看下，是否适合你的需求。<br><strong>软件下载链接和安装教程也在里面。</strong></p>
                <a href="javascript:void(0)" onclick="showDownloadWarning()" class="btn btn-primary">查看视频教程 &amp; 下载软件</a>
            </div>

            <div class="feature-guide">
                <div class="feature-guide-title">快速找到你需要的教程</div>
                <div class="feature-item">
                    <span class="feature-label">批量混剪：</span>
                    <span>看教程 <span class="feature-num">1</span> <span class="feature-num">40</span> <span class="feature-note">（有序组合）</span> <span class="feature-num">39</span> <span class="feature-note">（随机组合）</span></span>
                </div>
                <div class="feature-item">
                    <span class="feature-label">批量去重：</span>
                    <span>看教程 <span class="feature-num">43</span></span>
                </div>
                <div class="feature-item">
                    <span class="feature-label">视频切片：</span>
                    <span>看教程 <span class="feature-num">57</span></span>
                </div>
                <div class="feature-item">
                    <span class="feature-label">批量分割：</span>
                    <span>看教程 <span class="feature-num">10</span> <span class="feature-num">11</span></span>
                </div>
                <div class="feature-total">共有 60+ 功能模块，查看教程了解完整功能列表</div>
            </div>

            <div class="divider"></div>

            <h3 class="section-title">下载步骤</h3>
            <div class="steps">
                <div class="step">
                    <span class="step-num">1</span>
                    <span class="step-text">打开 <a href="/tutorial">视频教程文档</a>，了解 ALLCUT 功能是否适合你</span>
                </div>
                <div class="step">
                    <span class="step-num">2</span>
                    <span class="step-text"><a href="/price">购买软件授权</a></span>
                </div>
                <div class="step">
                    <span class="step-num">3</span>
                    <span class="step-text">按教程文档中的下载链接和安装说明完成安装</span>
                </div>
            </div>

            <a href="/price" class="btn btn-buy">立即购买</a>
        </div>
    </div>

    <!-- Download Warning Modal -->
    <div id="dlWarnModal" style="display:none;position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.55);backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:20px;">
        <div style="background:#fff;border-radius:20px;max-width:440px;width:100%;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.3);animation:dlModalIn .35s cubic-bezier(.34,1.56,.64,1);">
            <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:28px 24px 32px;text-align:center;position:relative;">
                <div style="width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,0.2);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">
                    <span style="font-size:32px;">⚠️</span>
                </div>
                <h3 style="font-size:20px;font-weight:800;color:#fff;margin-bottom:4px;">温馨提示</h3>
                <p style="color:rgba(255,255,255,0.85);font-size:13px;">请先阅读后再继续</p>
            </div>
            <div style="padding:24px 28px 20px;">
                <div style="background:#fff8e1;border-left:4px solid #ff9800;border-radius:8px;padding:14px 16px;margin-bottom:18px;">
                    <p style="color:#5d4037;font-size:14px;line-height:1.8;">
                        软件<strong style="color:#e65100;">暂无试用版</strong>，安装包较大。<br>
                        建议先查看教程了解功能，确认适合您的需求后再购买下载。
                    </p>
                </div>
                <ul style="list-style:none;padding:0;margin-bottom:22px;">
                    <li style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;font-size:13px;color:#555;"><span style="color:#667eea;font-weight:700;">•</span><span>教程文档里有软件下载链接和安装说明</span></li>
                    <li style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;font-size:13px;color:#555;"><span style="color:#667eea;font-weight:700;">•</span><span>60+ 功能模块，先看教程找到适合你的场景</span></li>
                    <li style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;font-size:13px;color:#555;"><span style="color:#667eea;font-weight:700;">•</span><span>犀牛剪辑已升级为 ALLCUT，教程内容同步更新</span></li>
                </ul>
                <div style="display:flex;gap:10px;">
                    <button onclick="document.getElementById('dlWarnModal').style.display='none'" style="flex:1;padding:13px;border-radius:12px;border:1.5px solid #e2e8f0;background:#fff;color:#666;font-size:15px;font-weight:600;cursor:pointer;transition:all .2s;">取消</button>
                    <button onclick="confirmDownloadWarning()" style="flex:1.5;padding:13px;border-radius:12px;border:none;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;font-size:15px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(102,126,234,0.35);transition:all .2s;">我已了解，继续查看</button>
                </div>
            </div>
        </div>
    </div>
    <style>
        @keyframes dlModalIn{0%{opacity:0;transform:scale(.85) translateY(20px)}100%{opacity:1;transform:scale(1) translateY(0)}}
        #dlWarnModal button:hover{opacity:.92;transform:translateY(-1px);}
    </style>
    <script>
        function showDownloadWarning(){
            document.getElementById('dlWarnModal').style.display='flex';
        }
        function confirmDownloadWarning(){
            document.getElementById('dlWarnModal').style.display='none';
            window.location.href='/tutorial';
        }
        document.getElementById('dlWarnModal').addEventListener('click',function(e){
            if(e.target===this)this.style.display='none';
        });
    </script>
</body>
</html>`

  return c.html(html)
}

/**
 * Render transition page for tutorial link
 */
export async function renderXiniuTutorialPage(c: any, site: any) {
  return c.html(renderTransitionPage({
    title: '即将前往使用教程',
    icon: '📖',
    message: '您即将前往飞书文档查看 ALLCUT 使用教程',
    note: '犀牛剪辑已升级为 ALLCUT，教程内容同步更新',
    targetUrl: 'https://nfbo7fbz4v.feishu.cn/docx/C3MjdmVJLowgtXx0LeKcR2PLnqd',
    btnText: '前往使用教程',
    siteName: '犀牛剪辑(ALLCUT)',
  }))
}

/**
 * Render transition page for affiliate link
 */
export async function renderXiniuAffiliatePage(c: any, site: any) {
  return c.html(renderTransitionPage({
    title: '即将前往推广赚钱页面',
    icon: '💰',
    message: '您即将前往 ALLCUT 推广合作页面，成为推广员即可赚取佣金',
    note: '犀牛剪辑已升级为 ALLCUT，推广计划由 ALLCUT 统一管理',
    targetUrl: 'https://sales.allcut.cn/aff/',
    btnText: '前往推广赚钱',
    siteName: '犀牛剪辑(ALLCUT)',
  }))
}

/**
 * Render software changelog page (犀牛剪辑 theme)
 */
export async function renderXiniuChangelogPage(c: any, site: any) {
  return renderChangelogPage(c, site, { brand: '🦏 犀牛剪辑', primary: '#6366f1', secondary: '#8b5cf6' })
}

/**
 * Reusable transition page template
 */
function renderTransitionPage(opts: {
  title: string
  icon: string
  message: string
  note: string
  targetUrl: string
  btnText: string
  siteName: string
}): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${opts.title} - ${opts.siteName}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
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
        p { color: #666; font-size: 15px; line-height: 1.6; margin-bottom: 12px; }
        .note {
            color: #8b5cf6;
            font-size: 13px;
            margin-bottom: 28px;
            padding: 10px 16px;
            background: #f5f3ff;
            border-radius: 8px;
            display: inline-block;
        }
        .confirm-btn {
            display: inline-block;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: #fff;
            padding: 14px 48px;
            border-radius: 30px;
            font-size: 16px;
            font-weight: 600;
            text-decoration: none;
            transition: opacity .2s;
        }
        .confirm-btn:hover { opacity: .85; }
        .back { display: block; margin-top: 20px; color: #999; font-size: 13px; text-decoration: none; }
        .back:hover { color: #666; }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">${opts.icon}</div>
        <h1>${opts.title}</h1>
        <p>${opts.message}</p>
        <div class="note">${opts.note}</div>
        <br><br>
        <a href="${opts.targetUrl}" target="_blank" rel="noopener" class="confirm-btn">${opts.btnText}</a>
        <a href="/" class="back">&larr; 返回首页</a>
    </div>
</body>
</html>`
}