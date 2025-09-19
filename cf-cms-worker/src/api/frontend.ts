import { Hono } from 'hono'
import { getCurrentSite } from '../middleware/domain'
import type { Env } from '../index'
import { DatabaseService, KVService } from '../utils/database'
import { ArticleService } from '../services/articleService'

/**
 * Frontend routes for rendering HTML pages
 * These routes serve HTML pages for sites
 */
export const frontendRoutes = new Hono<{ Bindings: Env }>()

// Homepage
frontendRoutes.get('/', async (c) => {
  const site = getCurrentSite(c)

  if (!site || site.id !== 'site-001') {
    // Not for this site, pass through
    return
  }

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
            overflow: hidden;
        }
        .hero::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -10%;
            width: 600px;
            height: 600px;
            background: radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%);
            border-radius: 50%;
        }
        .hero-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4rem;
            align-items: center;
            position: relative;
            z-index: 1;
        }
        .hero-content h1 {
            font-size: 3.5rem;
            color: #1f2937;
            margin-bottom: 1rem;
            line-height: 1.2;
        }
        .hero-content h1 span {
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .hero-subtitle {
            font-size: 1.5rem;
            color: #4b5563;
            margin-bottom: 2rem;
        }
        .hero-features {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            margin-bottom: 2.5rem;
        }
        .feature-item {
            display: flex;
            align-items: center;
            gap: 1rem;
            color: #4b5563;
            font-size: 1.05rem;
        }
        .feature-tag {
            background: #6366f1;
            color: white;
            padding: 0.2rem 0.6rem;
            border-radius: 5px;
            font-size: 0.85rem;
            font-weight: 600;
            min-width: 50px;
            text-align: center;
        }
        .hero-actions {
            display: flex;
            gap: 1.5rem;
            align-items: center;
        }
        .primary-btn {
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            padding: 1rem 2.5rem;
            border-radius: 30px;
            text-decoration: none;
            font-size: 1.1rem;
            font-weight: 500;
            transition: transform 0.3s, box-shadow 0.3s;
            display: inline-block;
        }
        .primary-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(99, 102, 241, 0.4);
        }
        .secondary-btn {
            color: #6366f1;
            text-decoration: none;
            font-size: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            transition: gap 0.3s;
        }
        .secondary-btn:hover {
            gap: 1rem;
        }
        .hero-image {
            position: relative;
        }
        .hero-image img {
            width: 100%;
            max-width: 500px;
            height: auto;
        }
        .hero-video-placeholder {
            background: white;
            border-radius: 20px;
            padding: 2rem;
            box-shadow: 0 20px 60px rgba(0,0,0,0.15);
            aspect-ratio: 16/9;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow: hidden;
        }
        .play-button {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.3s;
        }
        .play-button:hover {
            transform: scale(1.1);
        }
        .play-button::after {
            content: '▶';
            color: white;
            font-size: 24px;
            margin-left: 5px;
        }

        /* Scenarios Section */
        .scenarios {
            padding: 80px 0;
            background: #fafafa;
        }
        .scenarios-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
        }
        .section-header {
            text-align: center;
            margin-bottom: 4rem;
        }
        .section-title {
            font-size: 2.5rem;
            color: #1f2937;
            margin-bottom: 1rem;
        }
        .section-subtitle {
            font-size: 1.1rem;
            color: #6b7280;
        }
        .scenarios-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 1.5rem;
            max-width: 1000px;
            margin: 0 auto;
        }
        .scenario-card {
            background: white;
            border-radius: 15px;
            padding: 1.5rem;
            text-align: center;
            transition: transform 0.3s, box-shadow 0.3s;
            cursor: pointer;
            border: 2px solid transparent;
        }
        .scenario-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            border-color: #6366f1;
        }
        .scenario-icon {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
        }
        .scenario-name {
            font-size: 1rem;
            color: #4b5563;
            font-weight: 500;
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
        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 3rem;
        }
        .feature-card {
            padding: 2rem;
            border-radius: 15px;
            background: #f9fafb;
            transition: transform 0.3s, background 0.3s;
        }
        .feature-card:hover {
            transform: translateY(-5px);
            background: linear-gradient(135deg, #f5f3ff 0%, #e0e7ff 100%);
        }
        .feature-icon {
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            border-radius: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 1.5rem;
            margin-bottom: 1.5rem;
        }
        .feature-title {
            font-size: 1.4rem;
            color: #1f2937;
            margin-bottom: 1rem;
            font-weight: 600;
        }
        .feature-desc {
            color: #6b7280;
            line-height: 1.7;
        }

        /* Cases Section */
        .cases {
            padding: 80px 0;
            background: #fafafa;
        }
        .cases-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
        }
        .cases-carousel {
            display: flex;
            gap: 2rem;
            overflow-x: auto;
            padding: 2rem 0;
            scroll-snap-type: x mandatory;
        }
        .case-slide {
            min-width: 350px;
            background: white;
            border-radius: 20px;
            overflow: hidden;
            scroll-snap-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.08);
        }
        .case-image {
            width: 100%;
            height: 250px;
            background: linear-gradient(135deg, #f5f3ff 0%, #e0e7ff 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 4rem;
        }
        .case-content {
            padding: 2rem;
        }
        .case-title {
            font-size: 1.3rem;
            color: #1f2937;
            margin-bottom: 0.5rem;
        }
        .case-desc {
            color: #6b7280;
            line-height: 1.6;
        }

        /* FAQ Section */
        .faq {
            padding: 80px 0;
            background: white;
        }
        .faq-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 0 2rem;
        }
        .faq-list {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }
        .faq-item {
            background: #f9fafb;
            border-radius: 15px;
            padding: 2rem;
            transition: background 0.3s;
        }
        .faq-item:hover {
            background: #f3f4f6;
        }
        .faq-question {
            font-size: 1.2rem;
            color: #1f2937;
            margin-bottom: 1rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        .faq-icon {
            color: #6366f1;
            font-size: 1.5rem;
        }
        .faq-answer {
            color: #6b7280;
            line-height: 1.7;
            margin-left: 2.5rem;
        }

        /* Testimonials Section */
        .testimonials {
            padding: 80px 0;
            background: linear-gradient(135deg, #f5f3ff 0%, #e0e7ff 100%);
        }
        .testimonials-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
        }
        .testimonials-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 2rem;
        }
        .testimonial-card {
            background: white;
            border-radius: 20px;
            padding: 2.5rem;
            box-shadow: 0 10px 30px rgba(0,0,0,0.08);
            position: relative;
        }
        .quote-icon {
            position: absolute;
            top: 1.5rem;
            right: 1.5rem;
            font-size: 3rem;
            color: #e0e7ff;
        }
        .testimonial-content {
            color: #4b5563;
            line-height: 1.7;
            margin-bottom: 2rem;
            font-size: 1.05rem;
        }
        .testimonial-author {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        .author-avatar {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
        }
        .author-info {
            flex: 1;
        }
        .author-name {
            font-weight: 600;
            color: #1f2937;
            font-size: 1.1rem;
        }
        .author-role {
            color: #6b7280;
            font-size: 0.9rem;
        }

        /* CTA Section */
        .cta {
            padding: 100px 0;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            text-align: center;
        }
        .cta-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 0 2rem;
        }
        .cta-title {
            font-size: 3rem;
            color: white;
            margin-bottom: 1.5rem;
        }
        .cta-subtitle {
            font-size: 1.3rem;
            color: rgba(255,255,255,0.9);
            margin-bottom: 3rem;
        }
        .cta-button {
            background: white;
            color: #6366f1;
            padding: 1.2rem 3rem;
            border-radius: 30px;
            text-decoration: none;
            font-size: 1.2rem;
            font-weight: 600;
            display: inline-block;
            transition: transform 0.3s, box-shadow 0.3s;
        }
        .cta-button:hover {
            transform: translateY(-3px);
            box-shadow: 0 15px 40px rgba(0,0,0,0.2);
        }

        /* Article Section */
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
        .social-links {
            display: flex;
            gap: 1rem;
        }
        .social-link {
            width: 40px;
            height: 40px;
            background: rgba(255,255,255,0.1);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            color: white;
            transition: background 0.3s;
        }
        .social-link:hover {
            background: #6366f1;
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

        /* Responsive */
        @media (max-width: 768px) {
            .hero-container {
                grid-template-columns: 1fr;
                text-align: center;
            }
            .hero-content h1 {
                font-size: 2.5rem;
            }
            .hero-features {
                align-items: center;
            }
            .scenarios-grid {
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            }
            .features-grid {
                grid-template-columns: 1fr;
            }
            .testimonials-grid {
                grid-template-columns: 1fr;
            }
            .footer-container {
                grid-template-columns: 1fr;
                text-align: center;
            }
            .nav-menu {
                display: none;
            }
        }
    </style>
</head>
<body>
    <!-- Navigation -->
    <nav class="navbar">
        <div class="nav-container">
            <div class="logo">🦏 <span>犀牛剪辑</span></div>
            <ul class="nav-menu">
                <li><a href="#home">首页</a></li>
                <li><a href="#features">功能介绍</a></li>
                <li><a href="#scenarios">适用场景</a></li>
                <li><a href="#cases">用户案例</a></li>
                <li><a href="#pricing">价格</a></li>
                <li><a href="#support">帮助中心</a></li>
            </ul>
            <a href="#download" class="nav-cta">立即下载</a>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero" id="home">
        <div class="hero-container">
            <div class="hero-content">
                <h1><span>犀牛剪辑</span></h1>
                <p class="hero-subtitle">批量剪辑视频神器</p>
                <div class="hero-features">
                    <div class="feature-item">
                        <span class="feature-tag">批量</span>
                        <span>批量剪辑、混剪，解放双手</span>
                    </div>
                    <div class="feature-item">
                        <span class="feature-tag">简单</span>
                        <span>界面简洁，快速上手</span>
                    </div>
                    <div class="feature-item">
                        <span class="feature-tag">二创</span>
                        <span>自动抽帧补帧/画中画/贴纸等</span>
                    </div>
                    <div class="feature-item">
                        <span class="feature-tag">强大</span>
                        <span>1套顶10套，效率翻倍</span>
                    </div>
                </div>
                <div class="hero-actions">
                    <a href="#download" class="primary-btn">立即试用</a>
                    <a href="#demo" class="secondary-btn">
                        观看演示视频 →
                    </a>
                </div>
            </div>
            <div class="hero-image">
                <div class="hero-video-placeholder">
                    <div class="play-button"></div>
                </div>
            </div>
        </div>
    </section>

    <!-- Scenarios Section -->
    <section class="scenarios" id="scenarios">
        <div class="scenarios-container">
            <div class="section-header">
                <h2 class="section-title">适用场景</h2>
                <p class="section-subtitle">覆盖各类视频创作需求，助力内容创作者高效产出</p>
            </div>
            <div class="scenarios-grid">
                <div class="scenario-card">
                    <div class="scenario-icon">🏪</div>
                    <div class="scenario-name">本地生活</div>
                </div>
                <div class="scenario-card">
                    <div class="scenario-icon">🛍️</div>
                    <div class="scenario-name">同城团购</div>
                </div>
                <div class="scenario-card">
                    <div class="scenario-icon">📱</div>
                    <div class="scenario-name">信息流广告</div>
                </div>
                <div class="scenario-card">
                    <div class="scenario-icon">🛒</div>
                    <div class="scenario-name">电商达人</div>
                </div>
                <div class="scenario-card">
                    <div class="scenario-icon">💼</div>
                    <div class="scenario-name">企业拓客</div>
                </div>
                <div class="scenario-card">
                    <div class="scenario-icon">📚</div>
                    <div class="scenario-name">书单号</div>
                </div>
                <div class="scenario-card">
                    <div class="scenario-icon">📖</div>
                    <div class="scenario-name">故事号</div>
                </div>
                <div class="scenario-card">
                    <div class="scenario-icon">🍜</div>
                    <div class="scenario-name">探店</div>
                </div>
                <div class="scenario-card">
                    <div class="scenario-icon">🎬</div>
                    <div class="scenario-name">剧情号</div>
                </div>
                <div class="scenario-card">
                    <div class="scenario-icon">📹</div>
                    <div class="scenario-name">中视频</div>
                </div>
                <div class="scenario-card">
                    <div class="scenario-icon">📝</div>
                    <div class="scenario-name">小说号</div>
                </div>
                <div class="scenario-card">
                    <div class="scenario-icon">🎮</div>
                    <div class="scenario-name">游戏混剪</div>
                </div>
                <div class="scenario-card">
                    <div class="scenario-icon">🎞️</div>
                    <div class="scenario-name">影视解说</div>
                </div>
                <div class="scenario-card">
                    <div class="scenario-icon">🎵</div>
                    <div class="scenario-name">音乐号</div>
                </div>
                <div class="scenario-card">
                    <div class="scenario-icon">🎙️</div>
                    <div class="scenario-name">口播带货</div>
                </div>
            </div>
        </div>
    </section>

    <!-- Features Section -->
    <section class="features" id="features">
        <div class="features-container">
            <div class="section-header">
                <h2 class="section-title">功能介绍</h2>
                <p class="section-subtitle">以下仅部分功能，如需看完整功能，请看教程</p>
            </div>
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon">🎬</div>
                    <h3 class="feature-title">视频处理</h3>
                    <p class="feature-desc">批量调色、画中画、视频镜像、修改帧率、智能调速、音频变声、抽帧、补帧、自动帧封面、视频画面替换、过渡、视频画面智能裁剪等功能。</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">✂️</div>
                    <h3 class="feature-title">批量分割</h3>
                    <p class="feature-desc">按时长分割，按镜头分割，自由度很高，你想要什么样的分割基本都有。</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🎲</div>
                    <h3 class="feature-title">批量组合</h3>
                    <p class="feature-desc">随机组合，按顺序组合都可以，在组合的同时可以增加自定义音频，或者AI自动口播文案。</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🎞️</div>
                    <h3 class="feature-title">片头片尾</h3>
                    <p class="feature-desc">支持自定义秒数准确去除视频的片头片尾广告想去几秒去几秒，支持批量给视频加专属属于自己的专属片头片尾。</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">💧</div>
                    <h3 class="feature-title">水印功能</h3>
                    <p class="feature-desc">软件支持加水印和去水印功能，支持添加png图片水印，自定义文字水印、自定义框选区域遮挡去水印。</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">📝</div>
                    <h3 class="feature-title">自动字幕</h3>
                    <p class="feature-desc">软件会自动识别视频音频自动给视频加字幕，准确率相当高也可以自定义修改字幕，也可以添加中英双字幕。</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Cases Section -->
    <section class="cases" id="cases">
        <div class="cases-container">
            <div class="section-header">
                <h2 class="section-title">用户案例</h2>
                <p class="section-subtitle">看看其他创作者如何使用犀牛剪辑</p>
            </div>
            <div class="cases-carousel">
                <div class="case-slide">
                    <div class="case-image">📹</div>
                    <div class="case-content">
                        <h3 class="case-title">电商带货团队</h3>
                        <p class="case-desc">通过批量剪辑功能，每天产出50+条商品展示视频，销售额提升300%</p>
                    </div>
                </div>
                <div class="case-slide">
                    <div class="case-image">🎬</div>
                    <div class="case-content">
                        <h3 class="case-title">影视解说博主</h3>
                        <p class="case-desc">使用自动字幕和批量处理，制作效率提升10倍，粉丝突破百万</p>
                    </div>
                </div>
                <div class="case-slide">
                    <div class="case-image">🏪</div>
                    <div class="case-content">
                        <h3 class="case-title">本地生活服务商</h3>
                        <p class="case-desc">批量制作探店视频，月产300+条优质内容，合作商家超过100家</p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- FAQ Section -->
    <section class="faq" id="faq">
        <div class="faq-container">
            <div class="section-header">
                <h2 class="section-title">常见问题</h2>
            </div>
            <div class="faq-list">
                <div class="faq-item">
                    <div class="faq-question">
                        <span class="faq-icon">❓</span>
                        Mac系统能用么？
                    </div>
                    <div class="faq-answer">
                        不能，只用用于Win10，Win11
                    </div>
                </div>
                <div class="faq-item">
                    <div class="faq-question">
                        <span class="faq-icon">❓</span>
                        生成视频数量有限制吗？
                    </div>
                    <div class="faq-answer">
                        软件本身没有限制，但是电脑配置会限制生成速度，如果是大量需要，建议多台电脑同时跑。
                    </div>
                </div>
                <div class="faq-item">
                    <div class="faq-question">
                        <span class="faq-icon">❓</span>
                        支持哪些视频格式？
                    </div>
                    <div class="faq-answer">
                        支持市面上所有主流视频格式，包括MP4、AVI、MOV、MKV、FLV等。
                    </div>
                </div>
                <div class="faq-item">
                    <div class="faq-question">
                        <span class="faq-icon">❓</span>
                        如何获取技术支持？
                    </div>
                    <div class="faq-answer">
                        购买后提供一对一技术支持，24小时在线解答，确保您能顺利使用软件的所有功能。
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Testimonials Section -->
    <section class="testimonials" id="testimonials">
        <div class="testimonials-container">
            <div class="section-header">
                <h2 class="section-title">用户反馈</h2>
                <p class="section-subtitle">听听他们怎么说</p>
            </div>
            <div class="testimonials-grid">
                <div class="testimonial-card">
                    <span class="quote-icon">"</span>
                    <p class="testimonial-content">
                        软件非常的简单好用，很多功能都比PR这些软件简单方便，最主要的可以批量去执行，这样对我来说省去了太多的时间，强烈推荐真心不错软件。我可以去专心选品了，哈哈。
                    </p>
                    <div class="testimonial-author">
                        <div class="author-avatar">T</div>
                        <div class="author-info">
                            <div class="author-name">Tim</div>
                            <div class="author-role">带货达人</div>
                        </div>
                    </div>
                </div>
                <div class="testimonial-card">
                    <span class="quote-icon">"</span>
                    <p class="testimonial-content">
                        我是做二次剪辑的博主，朋友推荐的使用犀牛剪辑，说这个软件批量混剪都很不错，用了以后发现效率提高很多。难怪朋友他们出视频效率那么快，犀牛剪辑可以处理画中画等，非常的棒。
                    </p>
                    <div class="testimonial-author">
                        <div class="author-avatar">大</div>
                        <div class="author-info">
                            <div class="author-name">大熊**追大象</div>
                            <div class="author-role">影视博主</div>
                        </div>
                    </div>
                </div>
                <div class="testimonial-card">
                    <span class="quote-icon">"</span>
                    <p class="testimonial-content">
                        我是做好物工作室的，早点用上这个软件就好了，混剪嘎嘎快，能顶上几个人工了。我现有的人员配置，可以再多做几个账号了，感觉收入可以翻倍了，相当奈斯。
                    </p>
                    <div class="testimonial-author">
                        <div class="author-avatar">夕</div>
                        <div class="author-info">
                            <div class="author-name">夕阳**下山</div>
                            <div class="author-role">带货工作室</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- CTA Section -->
    <section class="cta" id="download">
        <div class="cta-container">
            <h2 class="cta-title">准备好提升你的视频创作效率了吗？</h2>
            <p class="cta-subtitle">加入10万+创作者，用犀牛剪辑让视频创作更简单</p>
            <a href="#" class="cta-button">立即下载试用</a>
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
                <div class="social-links">
                    <a href="#" class="social-link">📧</a>
                    <a href="#" class="social-link">💬</a>
                    <a href="#" class="social-link">📱</a>
                </div>
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
})

// Other pages
frontendRoutes.get('/products', (c) => {
  const site = getCurrentSite(c)
  if (!site || site.id !== 'site-001') {
    return
  }
  return c.html('<h1>产品中心</h1>')
})

frontendRoutes.get('/features', (c) => {
  const site = getCurrentSite(c)
  if (!site || site.id !== 'site-001') {
    return
  }
  return c.html('<h1>功能介绍</h1>')
})

frontendRoutes.get('/cases', (c) => {
  const site = getCurrentSite(c)
  if (!site || site.id !== 'site-001') {
    return
  }
  return c.html('<h1>用户案例</h1>')
})

frontendRoutes.get('/about', (c) => {
  const site = getCurrentSite(c)
  if (!site || site.id !== 'site-001') {
    return
  }
  return c.html('<h1>关于我们</h1>')
})

frontendRoutes.get('/contact', (c) => {
  const site = getCurrentSite(c)
  if (!site || site.id !== 'site-001') {
    return
  }
  return c.html('<h1>联系我们</h1>')
})