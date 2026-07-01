import { DatabaseService, KVService } from '../utils/database'
import { ArticleService } from '../services/articleService'
import { getICPInfo } from '../config/icp'
import { renderChangelogPage } from './changelog'

/**
 * ALLCUT site renderer - 完全按照 https://allcut.cn/ 的内容
 */
export async function renderAllcutHomepage(c: any, site: any) {
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
    const recentArticles = await articleService.getRecentArticles(site.id, 5)
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
    <title>ALLCUT官网 – 批量视频剪辑、混剪，AI批量剪辑，视频消重去重</title>
    <meta name="description" content="犀牛剪辑 批量剪辑视频神器 批量 | 批量剪辑、混剪，解放双手简单 | 界面简洁，快速上手二创 | 自动抽帧补">
    <meta name="keywords" content="ALLCUT,视频剪辑,批量剪辑,AI剪辑,视频消重,混剪">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
            background: #ffffff;
            line-height: 1.6;
            color: #333;
        }

        /* Navigation */
        .navbar {
            background: #fff;
            padding: 1rem 0;
            position: sticky;
            top: 0;
            z-index: 1000;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
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
            display: flex;
            align-items: center;
            gap: 10px;
            text-decoration: none;
            cursor: pointer;
        }
        .logo-icon {
            width: 38px;
            height: 38px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        }
        .logo-icon svg {
            width: 22px;
            height: 22px;
            fill: white;
        }
        .logo-text {
            font-size: 1.6rem;
            font-weight: 800;
            letter-spacing: -0.5px;
        }
        .logo-text .logo-all {
            color: #333;
        }
        .logo-text .logo-cut {
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .nav-menu {
            display: flex;
            list-style: none;
            gap: 2rem;
        }
        .nav-menu a {
            color: #333;
            text-decoration: none;
            font-size: 1.1rem;
            transition: color 0.3s;
        }
        .nav-menu a:hover {
            color: #0066ff;
        }

        /* Hero Section - Enhanced */
        .hero {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 100px 0 80px;
            color: white;
            text-align: center;
            position: relative;
            overflow: hidden;
        }

        /* Animated Background Pattern */
        .hero::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-image:
                radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 40% 40%, rgba(255, 255, 255, 0.05) 0%, transparent 50%);
            animation: bgMove 20s ease-in-out infinite;
        }

        @keyframes bgMove {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(-20px, -20px) scale(1.1); }
            66% { transform: translate(20px, -10px) scale(0.9); }
        }

        /* Floating Particles */
        .particles {
            position: absolute;
            width: 100%;
            height: 100%;
            top: 0;
            left: 0;
            pointer-events: none;
        }

        .particle {
            position: absolute;
            background: rgba(255, 255, 255, 0.5);
            border-radius: 50%;
            animation: float 15s infinite;
        }

        .particle:nth-child(1) {
            width: 8px;
            height: 8px;
            left: 10%;
            animation-delay: 0s;
            animation-duration: 20s;
        }

        .particle:nth-child(2) {
            width: 6px;
            height: 6px;
            left: 20%;
            animation-delay: 2s;
            animation-duration: 25s;
        }

        .particle:nth-child(3) {
            width: 10px;
            height: 10px;
            left: 30%;
            animation-delay: 4s;
            animation-duration: 18s;
        }

        .particle:nth-child(4) {
            width: 5px;
            height: 5px;
            left: 40%;
            animation-delay: 6s;
            animation-duration: 22s;
        }

        .particle:nth-child(5) {
            width: 12px;
            height: 12px;
            left: 50%;
            animation-delay: 8s;
            animation-duration: 20s;
        }

        .particle:nth-child(6) {
            width: 7px;
            height: 7px;
            left: 60%;
            animation-delay: 10s;
            animation-duration: 24s;
        }

        .particle:nth-child(7) {
            width: 9px;
            height: 9px;
            left: 70%;
            animation-delay: 12s;
            animation-duration: 19s;
        }

        .particle:nth-child(8) {
            width: 11px;
            height: 11px;
            left: 80%;
            animation-delay: 14s;
            animation-duration: 21s;
        }

        .particle:nth-child(9) {
            width: 6px;
            height: 6px;
            left: 90%;
            animation-delay: 16s;
            animation-duration: 23s;
        }

        @keyframes float {
            0% {
                bottom: -100px;
                transform: translateX(0);
                opacity: 0;
            }
            10% {
                opacity: 0.8;
            }
            90% {
                opacity: 0.8;
            }
            100% {
                bottom: 110%;
                transform: translateX(100px);
                opacity: 0;
            }
        }

        .hero-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
            position: relative;
            z-index: 1;
        }

        .hero-title {
            font-size: 4rem;
            font-weight: 800;
            margin-bottom: 2rem;
            background: linear-gradient(45deg, #ffffff, #f0f0f0);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: titleGlow 3s ease-in-out infinite;
            text-shadow: 0 0 80px rgba(255, 255, 255, 0.5);
            letter-spacing: 2px;
        }

        @keyframes titleGlow {
            0%, 100% {
                filter: brightness(1) drop-shadow(0 0 20px rgba(255, 255, 255, 0.5));
            }
            50% {
                filter: brightness(1.2) drop-shadow(0 0 40px rgba(255, 255, 255, 0.8));
            }
        }

        /* Typing Effect */
        .hero-subtitle {
            font-size: 1.5rem;
            margin-bottom: 3rem;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .typing-text {
            display: inline-block;
            position: relative;
        }

        .typing-text::after {
            content: '|';
            position: absolute;
            right: -10px;
            animation: blink 1s infinite;
        }

        @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
        }

        .hero-features {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 2rem;
            margin: 3rem 0;
        }

        .hero-feature {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            padding: 1.5rem;
            border-radius: 20px;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }

        .hero-feature::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent);
            transform: translateX(-100%);
            transition: transform 0.6s;
        }

        .hero-feature:hover::before {
            transform: translateX(100%);
        }

        .hero-feature:hover {
            transform: translateY(-10px) scale(1.05);
            background: rgba(255, 255, 255, 0.15);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
        }

        .hero-feature h3 {
            font-size: 1.5rem;
            margin-bottom: 0.5rem;
            font-weight: 700;
        }

        .hero-feature p {
            font-size: 1rem;
            line-height: 1.5;
            opacity: 0.95;
        }

        /* CTA Button */
        .hero-cta {
            margin-top: 3rem;
        }

        .cta-button {
            display: inline-block;
            padding: 15px 40px;
            font-size: 1.2rem;
            font-weight: 600;
            text-decoration: none;
            color: #764ba2;
            background: white;
            border-radius: 50px;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }

        .cta-button::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            border-radius: 50%;
            background: rgba(118, 75, 162, 0.1);
            transform: translate(-50%, -50%);
            transition: width 0.6s, height 0.6s;
        }

        .cta-button:hover::before {
            width: 300px;
            height: 300px;
        }

        .cta-button:hover {
            transform: translateY(-3px);
            box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
        }

        /* Stats */
        .hero-stats {
            margin-top: 4rem;
            display: flex;
            justify-content: center;
            gap: 4rem;
        }

        .stat-item {
            text-align: center;
        }

        .stat-number {
            font-size: 2.5rem;
            font-weight: 800;
            display: block;
            margin-bottom: 0.5rem;
        }

        .stat-label {
            font-size: 1rem;
            opacity: 0.9;
        }

        /* Responsive */
        @media (max-width: 768px) {
            .hero-title {
                font-size: 2.5rem;
            }

            .hero-features {
                grid-template-columns: repeat(2, 1fr);
                gap: 1rem;
            }

            .hero-stats {
                flex-direction: column;
                gap: 2rem;
            }
        }

        /* Scenarios Section - Enhanced */
        .scenarios {
            padding: 80px 0;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            position: relative;
            overflow: hidden;
        }

        .scenarios::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(102, 126, 234, 0.05) 0%, transparent 70%);
            animation: rotate 30s linear infinite;
        }

        @keyframes rotate {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .section-title {
            font-size: 3rem;
            text-align: center;
            margin-bottom: 4rem;
            color: #333;
            position: relative;
            font-weight: 800;
            letter-spacing: 1px;
        }

        .section-title::after {
            content: '';
            display: block;
            width: 80px;
            height: 4px;
            background: linear-gradient(90deg, #667eea, #764ba2);
            margin: 20px auto 0;
            border-radius: 2px;
        }

        .scenarios-grid {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 2rem;
            position: relative;
            z-index: 1;
        }

        .scenario-card {
            background: linear-gradient(145deg, #ffffff, #f3f4f6);
            padding: 2rem 1.5rem;
            border-radius: 20px;
            text-align: center;
            position: relative;
            overflow: hidden;
            border: 1px solid rgba(255,255,255,0.8);
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            cursor: pointer;
            font-weight: 600;
            color: #444;
            font-size: 1.1rem;
        }

        .scenario-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
            opacity: 0;
            transition: opacity 0.3s;
        }

        .scenario-card::after {
            content: '✨';
            position: absolute;
            top: 10px;
            right: 10px;
            font-size: 20px;
            opacity: 0;
            transform: scale(0);
            transition: all 0.3s;
        }

        .scenario-card:hover {
            transform: translateY(-10px) scale(1.05);
            box-shadow: 0 20px 40px rgba(102, 126, 234, 0.3);
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
        }

        .scenario-card:hover::before {
            opacity: 1;
        }

        .scenario-card:hover::after {
            opacity: 1;
            transform: scale(1);
        }

        /* Features Section - Enhanced */
        .features {
            padding: 80px 0;
            background: white;
            position: relative;
        }

        .features::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.3), transparent);
        }

        .features-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
        }

        .feature-note {
            text-align: center;
            color: #666;
            margin-bottom: 4rem;
            font-size: 1.2rem;
            font-style: italic;
            position: relative;
            padding: 20px;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05));
            border-radius: 10px;
            border-left: 4px solid #667eea;
        }

        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 3rem;
        }

        .feature-card {
            padding: 2.5rem;
            background: linear-gradient(145deg, #ffffff, #f8f9fa);
            border-radius: 25px;
            position: relative;
            overflow: hidden;
            border: 1px solid rgba(102, 126, 234, 0.1);
            transition: all 0.4s ease;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.08);
        }

        .feature-card::before {
            content: '';
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            background: linear-gradient(45deg, #667eea, #764ba2, #667eea);
            border-radius: 25px;
            opacity: 0;
            z-index: -1;
            transition: opacity 0.4s;
            background-size: 200% 200%;
            animation: gradientShift 3s ease infinite;
        }

        @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }

        .feature-card:hover::before {
            opacity: 1;
        }

        .feature-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 15px 40px rgba(102, 126, 234, 0.25);
            background: white;
        }

        .feature-card h3 {
            color: #333;
            margin-bottom: 1.5rem;
            font-size: 1.8rem;
            font-weight: 700;
            position: relative;
            padding-left: 30px;
        }

        .feature-card h3::before {
            content: '🚀';
            position: absolute;
            left: 0;
            top: 50%;
            transform: translateY(-50%);
            font-size: 1.5rem;
        }

        .feature-card:nth-child(2) h3::before { content: '⚡'; }
        .feature-card:nth-child(3) h3::before { content: '🎨'; }
        .feature-card:nth-child(4) h3::before { content: '📊'; }
        .feature-card:nth-child(5) h3::before { content: '🔧'; }
        .feature-card:nth-child(6) h3::before { content: '💡'; }

        .feature-card p {
            color: #555;
            line-height: 1.8;
            font-size: 1.05rem;
            margin-bottom: 0;
        }

        .feature-card ul {
            margin-top: 1rem;
            padding-left: 20px;
        }

        .feature-card ul li {
            color: #666;
            margin-bottom: 0.5rem;
            position: relative;
            list-style: none;
            padding-left: 25px;
        }

        .feature-card ul li::before {
            content: '✓';
            position: absolute;
            left: 0;
            color: #667eea;
            font-weight: bold;
        }

        /* User Cases Section (用户案例) */
        .user-cases {
            padding: 60px 0;
            background: #f8f9fa;
        }
        .user-cases-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
        }
        .user-cases-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 2rem;
            margin-top: 3rem;
        }
        .user-case-item {
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .user-case-image {
            width: 100%;
            height: auto;
            display: block;
        }

        /* FAQ Section */
        .faq {
            padding: 60px 0;
            background: white;
        }
        .faq-container {
            max-width: 900px;
            margin: 0 auto;
            padding: 0 2rem;
        }
        .faq-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 2rem;
        }
        .faq-item {
            padding: 1.5rem;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .faq-question {
            font-weight: bold;
            color: #333;
            margin-bottom: 0.5rem;
            font-size: 1.1rem;
        }
        .faq-answer {
            color: #666;
            line-height: 1.6;
        }

        /* Testimonials Section (用户反馈) */
        .testimonials {
            padding: 60px 0;
            background: #f8f9fa;
        }
        .testimonials-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
        }
        .testimonials-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
        }
        .testimonial-card {
            background: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .testimonial-content {
            color: #666;
            line-height: 1.8;
            margin-bottom: 1rem;
        }
        .testimonial-author {
            font-weight: bold;
            color: #333;
        }
        .testimonial-role {
            color: #999;
            font-size: 0.9rem;
        }

        /* Recent Articles Section */
        .articles {
            padding: 60px 0;
            background: white;
        }
        .articles-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
        }
        .articles-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
        }
        .article-card {
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            overflow: hidden;
            transition: transform 0.3s;
        }
        .article-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        .article-card a {
            text-decoration: none;
            color: inherit;
        }
        .article-image {
            width: 100%;
            height: 200px;
            object-fit: cover;
        }
        .article-content {
            padding: 1.5rem;
        }
        .article-title {
            font-size: 1.2rem;
            color: #333;
            margin-bottom: 0.5rem;
        }
        .article-summary {
            color: #666;
            font-size: 0.9rem;
            line-height: 1.5;
        }

        /* Footer */
        .footer {
            background: #2c3e50;
            color: #ecf0f1;
            padding: 40px 0 20px;
        }
        .footer-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
            text-align: center;
        }
        .footer-links {
            margin-bottom: 2rem;
        }
        .footer-links a {
            color: #ecf0f1;
            text-decoration: none;
            margin: 0 1rem;
        }
        .footer-links a:hover {
            text-decoration: underline;
        }
        .footer-copyright {
            border-top: 1px solid #34495e;
            padding-top: 1rem;
            margin-top: 2rem;
            color: #95a5a6;
        }

        @media (max-width: 768px) {
            .hero-title { font-size: 2rem; }
            .hero-features { grid-template-columns: 1fr; }
            .scenarios-grid { grid-template-columns: repeat(2, 1fr); }
            .features-grid { grid-template-columns: 1fr; }
            .faq-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <!-- Navigation -->
    <nav class="navbar">
        <div class="nav-container">
            <a href="/" class="logo">
                <div class="logo-icon">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm0 12c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm6-7.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5zM19 3l-6 6 2 2 7-7V3h-3z"/></svg>
                </div>
                <div class="logo-text"><span class="logo-all">ALL</span><span class="logo-cut">CUT</span></div>
            </a>
            <ul class="nav-menu">
                <li><a href="/">首页</a></li>
                <li><a href="https://sales.allcut.cn" target="_blank" rel="noopener">价格</a></li>
                <li><a href="https://nfbo7fbz4v.feishu.cn/docx/C3MjdmVJLowgtXx0LeKcR2PLnqd" target="_blank" rel="noopener">使用教程</a></li>
                <li><a href="/download">下载软件</a></li>
                <li><a href="/learn-more">了解更多</a></li>
                <li><a href="https://sales.allcut.cn/aff/" target="_blank" rel="noopener">推广赚钱</a></li>
                <li><a href="/matrix-publish">矩阵群发</a></li>
                <li><a href="/changelog">更新日志</a></li>
            </ul>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero">
        <!-- 动态粒子背景 -->
        <div class="particles">
            <div class="particle"></div>
            <div class="particle"></div>
            <div class="particle"></div>
            <div class="particle"></div>
            <div class="particle"></div>
            <div class="particle"></div>
            <div class="particle"></div>
            <div class="particle"></div>
            <div class="particle"></div>
        </div>

        <div class="hero-container">
            <h1 class="hero-title">批量剪辑视频神器</h1>

            <!-- 动态打字效果副标题 -->
            <div class="hero-subtitle">
                <span class="typing-text" id="typingText"></span>
            </div>

            <div class="hero-features">
                <div class="hero-feature">
                    <h3>批量</h3>
                    <p>批量剪辑、混剪，解放双手</p>
                </div>
                <div class="hero-feature">
                    <h3>简单</h3>
                    <p>界面简洁，快速上手</p>
                </div>
                <div class="hero-feature">
                    <h3>二创</h3>
                    <p>自动抽帧补帧/画中画/贴纸等</p>
                </div>
                <div class="hero-feature">
                    <h3>强大</h3>
                    <p>1套顶10套，效率翻倍</p>
                </div>
            </div>

            <!-- CTA按钮 -->
            <div class="hero-cta">
                <a href="https://nfbo7fbz4v.feishu.cn/docx/C3MjdmVJLowgtXx0LeKcR2PLnqd" target="_blank" rel="noopener" class="cta-button">立即看使用教程</a>
            </div>

            <!-- 统计数据 -->
            <div class="hero-stats">
                <div class="stat-item">
                    <span class="stat-number" data-target="10000">0</span>
                    <span class="stat-label">活跃用户</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number" data-target="5000000">0</span>
                    <span class="stat-label">处理视频</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number" data-target="99.9">0</span>
                    <span class="stat-label">用户满意度</span>
                </div>
            </div>
        </div>
    </section>

    <!-- Scenarios Section (适用场景) -->
    <section class="scenarios">
        <h2 class="section-title">适用场景</h2>
        <div class="scenarios-grid">
            <div class="scenario-card">本地生活服务商</div>
            <div class="scenario-card">同城团购从业者</div>
            <div class="scenario-card">信息流广告</div>
            <div class="scenario-card">电商达人</div>
            <div class="scenario-card">企业拓客</div>
            <div class="scenario-card">书单号</div>
            <div class="scenario-card">故事号</div>
            <div class="scenario-card">探店</div>
            <div class="scenario-card">剧情号</div>
            <div class="scenario-card">中视频</div>
            <div class="scenario-card">小说号</div>
            <div class="scenario-card">游戏混剪</div>
            <div class="scenario-card">影视解说</div>
            <div class="scenario-card">音乐号</div>
            <div class="scenario-card">口播带货</div>
        </div>
    </section>

    <!-- Features Section (功能介绍) -->
    <section class="features">
        <div class="features-container">
            <h2 class="section-title">功能介绍</h2>
            <p class="feature-note">以下仅部分功能，如需看完整功能，请看教程</p>

            <div class="features-grid">
                <div class="feature-card">
                    <h3>视频处理</h3>
                    <p>批量调色、画中画、视频镜像、修改帧率、智能调速、音频变声、抽帧、补帧、自动帧封面、视频画面替换、过渡、视频画面智能裁剪等功能。</p>
                </div>

                <div class="feature-card">
                    <h3>批量分割</h3>
                    <p>按时长分割，按镜头分割，自由度很高，你想要什么样的分割基本都有。</p>
                </div>

                <div class="feature-card">
                    <h3>批量组合</h3>
                    <p>随机组合，按顺序组合都可以，在组合的同时可以增加自定义音频，或者AI自动口播文案</p>
                </div>

                <div class="feature-card">
                    <h3>片头片尾</h3>
                    <p>支持自定义秒数准确去除视频的片头片尾广告想去几秒去几秒，支持批量给视频加专属属于自己的专属片头片尾，操作简单杜绝繁琐。</p>
                </div>

                <div class="feature-card">
                    <h3>水印功能</h3>
                    <p>软件支持加水印和去水印功能 支持添加png图片水印，自定义文字水印、自定义框选区域遮挡去水印、自定义裁剪去除水印添加或者去除软件支持同时多处水印处理。</p>
                </div>

                <div class="feature-card">
                    <h3>自动字幕</h3>
                    <p>给视频加字幕对于不会加字幕的用户这个太简单了、软件会自动识别视频音频自动给视频加字幕、准确率相当高也可以自定义修改字幕、也可以添加中英双字幕让视频老外也能看的懂</p>
                </div>
            </div>
        </div>
    </section>

    <!-- User Cases Section -->
    <section class="user-cases">
        <div class="user-cases-container">
            <h2 class="section-title">用户案例</h2>
            <div class="user-cases-grid">
                <div class="user-case-item">
                    <img src="/images/allcut-cases/case-3.jpg" alt="用户案例1" class="user-case-image">
                </div>
                <div class="user-case-item">
                    <img src="/images/allcut-cases/case-2.jpg" alt="用户案例2" class="user-case-image">
                </div>
                <div class="user-case-item">
                    <img src="/images/allcut-cases/case-1.jpg" alt="用户案例3" class="user-case-image">
                </div>
            </div>
        </div>
    </section>

    <!-- FAQ Section (常见问题) -->
    <section class="faq">
        <div class="faq-container">
            <h2 class="section-title">常见问题</h2>

            <div class="faq-grid">
                <div class="faq-item">
                    <div class="faq-question">Mac系统能用么？</div>
                    <div class="faq-answer">不能，只用用于Win10 , Win11</div>
                </div>

                <div class="faq-item">
                    <div class="faq-question">Do you offer enterprise pricing?</div>
                    <div class="faq-answer">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</div>
                </div>

                <div class="faq-item">
                    <div class="faq-question">生成视频数量有限制吗？</div>
                    <div class="faq-answer">软件本身没有限制，但是电脑配置会限制生成速度，如果是大量需要，建议多台电脑同时跑。</div>
                </div>

                <div class="faq-item">
                    <div class="faq-question">Do you offer an education discount?</div>
                    <div class="faq-answer">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</div>
                </div>
            </div>
        </div>
    </section>

    <!-- Testimonials Section (用户反馈) -->
    <section class="testimonials">
        <div class="testimonials-container">
            <h2 class="section-title">用户反馈</h2>

            <div class="testimonials-grid">
                <div class="testimonial-card">
                    <p class="testimonial-content">
                        软件非常的简单好用，很多功能都比PR这些软件简单方便，最主要的可以批量去执行，这样对我来说省去了太多的时间，强烈推荐真心不错软件。我可以去专心选品了，哈哈。
                    </p>
                    <div class="testimonial-author">Tim</div>
                    <div class="testimonial-role">带货达人</div>
                </div>

                <div class="testimonial-card">
                    <p class="testimonial-content">
                        我是做二次剪辑的博主，朋友推荐的使用ALLCUT，说这个软件批量混剪都很不错，用了以后发现效率提高很多。难怪朋友他们出视频效率那么快，ALLCUT可以处理画中画等，处理后可以重复使用一些素材，非常的棒。
                    </p>
                    <div class="testimonial-author">大熊**追大象</div>
                    <div class="testimonial-role">影视博主</div>
                </div>

                <div class="testimonial-card">
                    <p class="testimonial-content">
                        我是做好物工作室的，早点用上这个软件就好了，混剪嘎嘎快，能顶上几个人工了。我现有的人员配置，可以再多做几个账号了，感觉收入可以翻倍了，相当奈斯。
                    </p>
                    <div class="testimonial-author">夕阳**下山</div>
                    <div class="testimonial-role">带货工作室</div>
                </div>
            </div>
        </div>
    </section>

    <!-- Recent Articles Section -->
    ${articles && articles.length > 0 ? `
    <section class="articles">
        <div class="articles-container">
            <h2 class="section-title">最新文章</h2>

            <div class="articles-grid">
                ${articles.map(article => `
                    <div class="article-card">
                        <a href="/article/${article.slug}">
                            ${article.cover_image ? `<img src="${article.cover_image}" alt="${article.title}" class="article-image">` : ''}
                            <div class="article-content">
                                <h3 class="article-title">${article.title}</h3>
                                <p class="article-summary">${article.summary || ''}</p>
                            </div>
                        </a>
                    </div>
                `).join('')}
            </div>
            <div style="text-align:center;margin-top:30px;">
                <a href="/articles" style="display:inline-block;padding:12px 36px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border-radius:25px;text-decoration:none;font-size:15px;font-weight:600;transition:all .3s;box-shadow:0 4px 15px rgba(102,126,234,0.3);">查看更多文章</a>
            </div>
        </div>
    </section>
    ` : ''}

    <!-- Footer -->
    <footer class="footer">
        <div class="footer-container">
            <div class="footer-links">
                <a href="/sitemap.xml">网站地图</a>
            </div>

            <div class="footer-copyright">
                <p>© 2025 ALLCUT. All rights reserved.</p>
                ${icpInfo ? `<p>${icpInfo.company}</p>
                <p><a href="https://beian.miit.gov.cn/" target="_blank" style="color: #95a5a6;">${icpInfo.icp}</a></p>` : ''}
            </div>
        </div>
    </footer>

    <script>
        // 打字动画效果
        const texts = [
            "让视频创作更高效",
            "批量处理，节省时间",
            "AI智能，轻松上手",
            "专业品质，批量输出"
        ];
        let textIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        let typingSpeed = 100;

        function typeEffect() {
            const typingElement = document.getElementById('typingText');
            if (!typingElement) return;

            const currentText = texts[textIndex];

            if (isDeleting) {
                typingElement.textContent = currentText.substring(0, charIndex - 1);
                charIndex--;
                typingSpeed = 50;
            } else {
                typingElement.textContent = currentText.substring(0, charIndex + 1);
                charIndex++;
                typingSpeed = 100;
            }

            if (!isDeleting && charIndex === currentText.length) {
                typingSpeed = 2000; // 暂停
                isDeleting = true;
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                textIndex = (textIndex + 1) % texts.length;
                typingSpeed = 500; // 开始新文本前的暂停
            }

            setTimeout(typeEffect, typingSpeed);
        }

        // 数字递增动画
        function animateNumbers() {
            const counters = document.querySelectorAll('.stat-number');
            const speed = 200;

            counters.forEach(counter => {
                const target = +counter.getAttribute('data-target');
                const increment = target / speed;
                let currentValue = 0;

                const updateCounter = () => {
                    currentValue += increment;
                    if (currentValue < target) {
                        if (target === 99.9) {
                            counter.textContent = Math.floor(currentValue * 10) / 10 + '%';
                        } else if (target >= 1000000) {
                            counter.textContent = Math.floor(currentValue / 10000) + '万+';
                        } else {
                            counter.textContent = Math.floor(currentValue).toLocaleString() + '+';
                        }
                        requestAnimationFrame(updateCounter);
                    } else {
                        if (target === 99.9) {
                            counter.textContent = '99.9%';
                        } else if (target >= 1000000) {
                            counter.textContent = '500万+';
                        } else {
                            counter.textContent = target.toLocaleString() + '+';
                        }
                    }
                };

                updateCounter();
            });
        }

        // 监听滚动以触发动画
        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.5
        };

        const statsObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateNumbers();
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // 滚动触发动画
        function animateOnScroll() {
            const animateElements = document.querySelectorAll('.scenario-card, .feature-card');

            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry, index) => {
                    if (entry.isIntersecting) {
                        setTimeout(() => {
                            entry.target.classList.add('animate-in');
                        }, index * 100);
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '0px 0px -100px 0px'
            });

            animateElements.forEach(element => {
                element.style.opacity = '0';
                element.style.transform = 'translateY(30px)';
                observer.observe(element);
            });
        }

        // 页面加载后启动动画
        document.addEventListener('DOMContentLoaded', () => {
            // 启动打字动画
            typeEffect();

            // 监听统计数据区域
            const statsSection = document.querySelector('.hero-stats');
            if (statsSection) {
                statsObserver.observe(statsSection);
            }

            // 添加特效到特征卡片
            const featureCards = document.querySelectorAll('.hero-feature');
            featureCards.forEach((card, index) => {
                card.style.animationDelay = index * 0.1 + 's';
                card.classList.add('fade-in-up');
            });

            // 启动滚动动画
            animateOnScroll();

            // 添加波纹效果到场景卡片
            document.querySelectorAll('.scenario-card').forEach(card => {
                card.addEventListener('click', function(e) {
                    const ripple = document.createElement('span');
                    ripple.className = 'ripple';
                    ripple.style.width = ripple.style.height = '40px';
                    ripple.style.left = e.offsetX - 20 + 'px';
                    ripple.style.top = e.offsetY - 20 + 'px';
                    this.appendChild(ripple);
                    setTimeout(() => ripple.remove(), 600);
                });
            });
        });

        // 添加渐入动画类
        const style = document.createElement('style');
        style.textContent = \`
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            .fade-in-up {
                animation: fadeInUp 0.8s ease-out forwards;
            }
            .animate-in {
                opacity: 1 !important;
                transform: translateY(0) !important;
                transition: all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            .ripple {
                position: absolute;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.6);
                animation: rippleEffect 0.6s ease-out;
                pointer-events: none;
            }
            @keyframes rippleEffect {
                from {
                    transform: scale(0);
                    opacity: 1;
                }
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
        \`;
        document.head.appendChild(style);
    </script>

    <!-- Affiliate Popup -->
    <div id="affPopup" style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);align-items:center;justify-content:center;">
        <div style="background:#fff;border-radius:20px;padding:40px 32px 32px;max-width:420px;width:90%;text-align:center;position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:popIn .3s ease-out;">
            <button onclick="document.getElementById('affPopup').style.display='none'" style="position:absolute;top:12px;right:16px;background:none;border:none;font-size:22px;color:#999;cursor:pointer;line-height:1;">&times;</button>
            <div style="font-size:42px;margin-bottom:16px;">💰</div>
            <h3 style="font-size:22px;color:#1a1a1a;margin-bottom:10px;line-height:1.4;">分享 ALLCUT，躺着赚钱</h3>
            <p style="color:#555;font-size:15px;line-height:1.8;margin-bottom:20px;">推荐好友购买 ALLCUT，你就能拿佣金<br>不用囤货、不用客服，分享链接就行</p>
            <div style="background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border-radius:12px;padding:18px 20px;margin-bottom:22px;">
                <div style="font-size:36px;font-weight:800;margin-bottom:4px;">最高 40%</div>
                <div style="font-size:14px;opacity:0.9;">每笔订单分成直接到账</div>
            </div>
            <ul style="text-align:left;list-style:none;padding:0;margin-bottom:24px;font-size:14px;color:#555;">
                <li style="padding:6px 0;">✅ 专属优惠码，客户使用即关联你的佣金</li>
                <li style="padding:6px 0;">✅ 后台随时查看推广数据和佣金</li>
                <li style="padding:6px 0;">✅ 零门槛加入，免费注册即可开始推广</li>
            </ul>
            <a href="https://sales.allcut.cn/aff/" target="_blank" rel="noopener" style="display:block;background:linear-gradient(135deg,#ff6b35,#f7931e);color:#fff;padding:14px;border-radius:30px;font-size:16px;font-weight:600;text-decoration:none;transition:opacity .2s;">立即加入推广计划</a>
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
 * 渲染价格页面 - 跳转到 sales.allcut.cn
 */
export async function renderAllcutPricePage(c: any, site: any) {
  return c.redirect('https://sales.allcut.cn', 302)
}

/**
 * 渲染下载页面 - 引导先看教程再购买下载
 */
export async function renderAllcutDownloadPage(c: any, site: any) {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>下载软件 - ALLCUT官网</title>
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
                    <span class="step-text">打开 <a href="https://nfbo7fbz4v.feishu.cn/docx/C3MjdmVJLowgtXx0LeKcR2PLnqd" target="_blank" rel="noopener">视频教程文档</a>，了解 ALLCUT 功能是否适合你</span>
                </div>
                <div class="step">
                    <span class="step-num">2</span>
                    <span class="step-text"><a href="https://sales.allcut.cn" target="_blank" rel="noopener">购买软件授权</a></span>
                </div>
                <div class="step">
                    <span class="step-num">3</span>
                    <span class="step-text">按教程文档中的下载链接和安装说明完成安装</span>
                </div>
            </div>

            <a href="https://sales.allcut.cn" target="_blank" rel="noopener" class="btn btn-buy">立即购买</a>
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
                    <li style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;font-size:13px;color:#555;"><span style="color:#667eea;font-weight:700;">•</span><span>教程会在新窗口打开，不影响当前页面</span></li>
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
            window.open('https://nfbo7fbz4v.feishu.cn/docx/C3MjdmVJLowgtXx0LeKcR2PLnqd','_blank','noopener');
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
 * 渲染软件更新日志页 (ALLCUT 配色)
 */
export async function renderAllcutChangelogPage(c: any, site: any) {
  return renderChangelogPage(c, site, { brand: 'ALLCUT', primary: '#667eea', secondary: '#764ba2' })
}

/**
 * 渲染了解更多页面 - 引导加QQ
 */
export async function renderAllcutLearnMorePage(c: any, site: any) {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>了解更多 - ${site?.name || 'ALLCUT'}</title>
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
        }
        .back-home:hover {
            background: white;
            transform: translateY(-2px);
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 80px 20px;
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .content-card {
            background: white;
            border-radius: 20px;
            padding: 50px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.2);
        }
        h1 {
            color: #333;
            font-size: 28px;
            margin-bottom: 30px;
        }
        .qq-id {
            background: white;
            border: 2px solid #667eea;
            border-radius: 10px;
            padding: 15px 30px;
            display: inline-block;
            font-size: 22px;
            color: #667eea;
            font-weight: bold;
            letter-spacing: 1px;
            margin: 20px 0;
        }
        .tips {
            color: #666;
            font-size: 16px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <a href="/" class="back-home">← 返回首页</a>

    <div class="container">
        <div class="content-card">
            <h1>了解更多</h1>
            <div class="qq-id">QQ号：58231808</div>
            <p class="tips">添加QQ了解更多详情</p>
        </div>
    </div>
</body>
</html>`
  return c.html(html)
}