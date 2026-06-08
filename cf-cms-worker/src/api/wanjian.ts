import { DatabaseService, KVService } from '../utils/database'
import { ArticleService } from '../services/articleService'
import { getICPInfo } from '../config/icp'

/**
 * 万剪网站渲染器 - 完全按照 https://wanjian666.com/ 的内容
 */
export async function renderWanjianHomepage(c: any, site: any) {
  // Get current domain for ICP info and dynamic SEO
  const host = c.req.header('x-forwarded-host') || c.req.header('host') || ''
  const domain = host.split(':')[0]
  const icpInfo = getICPInfo(domain)

  // Dynamic title/description based on domain
  const isCutNocopy = domain.includes('cut.nocopy.net')
  const pageTitle = isCutNocopy
    ? '万剪 | AI智能批量视频剪辑软件，批量二创视频剪辑软件'
    : '万剪官网 – 批量剪辑视频软件、批量混剪，万剪AI批量剪辑'
  const pageDesc = isCutNocopy
    ? '欢迎光临万剪视频处理官网,本软件主要功能有，视频批量二创软件,视频剪辑软件,视频过渡,添加封面,自动加字幕,视频切割分割,视频去水印,全自动剪辑,视频画中画,二创工具,加片头片尾'
    : '批量 | 自动批量剪辑，解放双手简单 | 一天就能快速上手二创 | 一键处理/画中画/加速等'
  const pageKeywords = isCutNocopy
    ? '万剪,AI智能剪辑,批量二创,视频剪辑软件,视频去水印,自动加字幕,视频切割分割,画中画,片头片尾'
    : '万剪,视频剪辑,批量剪辑,AI剪辑,批量混剪'

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageTitle}</title>
    <meta name="description" content="${pageDesc}">
    <meta name="keywords" content="${pageKeywords}">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
            background: #0a0e27;
            line-height: 1.6;
            color: #333;
            overflow-x: hidden;
        }

        /* Animated Background */
        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(45deg, #0a0e27, #1a1f3a, #0a0e27);
            background-size: 400% 400%;
            animation: gradientShift 15s ease infinite;
            z-index: -1;
        }

        @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }

        /* Floating particles */
        @keyframes float {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(180deg); }
        }

        /* Navigation */
        .navbar {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            padding: 1rem 0;
            position: sticky;
            top: 0;
            z-index: 1000;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
            border-bottom: 2px solid transparent;
            background-image: linear-gradient(90deg, rgba(255,255,255,0.95), rgba(255,255,255,0.95)),
                              linear-gradient(90deg, #667eea, #764ba2, #f093fb, #667eea);
            background-origin: border-box;
            background-clip: padding-box, border-box;
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
            height: 50px;
            transition: transform 0.3s;
        }
        .logo:hover {
            transform: scale(1.1) rotate(5deg);
        }
        .logo img {
            height: 100%;
            width: auto;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
        }
        .nav-menu {
            display: flex;
            list-style: none;
            gap: 2.5rem;
            align-items: center;
        }
        .nav-menu a {
            color: #333;
            text-decoration: none;
            font-size: 1.1rem;
            font-weight: 500;
            position: relative;
            transition: all 0.3s;
        }
        .nav-menu a::after {
            content: '';
            position: absolute;
            bottom: -5px;
            left: 50%;
            width: 0;
            height: 3px;
            background: linear-gradient(90deg, #667eea, #764ba2);
            transition: all 0.3s;
            transform: translateX(-50%);
        }
        .nav-menu a:hover::after {
            width: 100%;
        }
        .nav-menu a:hover {
            color: #667eea;
            transform: translateY(-2px);
        }
        .buy-btn {
            background: linear-gradient(135deg, #667eea, #764ba2, #f093fb);
            background-size: 200% 200%;
            color: white !important;
            padding: 12px 30px;
            border-radius: 50px;
            transition: all 0.3s;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            animation: shimmer 3s ease infinite;
        }
        @keyframes shimmer {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        .buy-btn:hover {
            transform: translateY(-3px) scale(1.05);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.6);
        }
        .buy-btn:hover::after {
            width: 0;
        }

        /* Hero Section */
        .hero {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
            padding: 140px 0 120px;
            color: white;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        .hero::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
            background-size: 50px 50px;
            animation: moveGrid 20s linear infinite;
        }
        @keyframes moveGrid {
            0% { transform: translate(0, 0); }
            100% { transform: translate(50px, 50px); }
        }
        .hero::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120"><path fill="rgba(255,255,255,0.1)" d="M0,56C150,100,350,0,600,56C850,112,1050,0,1200,56V120H0V56Z"></path></svg>');
            background-size: cover;
            animation: wave 10s linear infinite;
        }
        @keyframes wave {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
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
            text-shadow: 3px 3px 6px rgba(0,0,0,0.3);
            background: linear-gradient(45deg, #fff, #ffd700, #fff);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: textGlow 3s ease-in-out infinite;
        }
        @keyframes textGlow {
            0%, 100% { filter: brightness(1); }
            50% { filter: brightness(1.2) drop-shadow(0 0 20px rgba(255, 215, 0, 0.5)); }
        }
        .hero-features {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 2rem;
            margin: 4rem 0;
        }
        .hero-feature {
            background: linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05));
            backdrop-filter: blur(20px);
            padding: 2rem;
            border-radius: 20px;
            border: 2px solid rgba(255,255,255,0.3);
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            position: relative;
            overflow: hidden;
        }
        .hero-feature::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,215,0,0.3) 0%, transparent 70%);
            opacity: 0;
            transition: opacity 0.3s;
        }
        .hero-feature:hover::before {
            opacity: 1;
        }
        .hero-feature:hover {
            transform: translateY(-15px) scale(1.05);
            background: linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.1));
            border-color: #ffd700;
            box-shadow: 0 20px 40px rgba(102, 126, 234, 0.3);
        }
        .hero-feature h3 {
            font-size: 1.8rem;
            margin-bottom: 1rem;
            color: #ffd700;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            font-weight: 700;
        }
        .hero-feature p {
            font-size: 1.1rem;
            line-height: 1.6;
            color: rgba(255,255,255,0.95);
        }

        /* Function Introduction */
        .function-intro {
            padding: 100px 0;
            background: linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(248,249,250,0.95) 100%);
            position: relative;
        }
        .function-intro::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, #667eea, transparent);
        }
        .section-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
        }
        .section-title {
            font-size: 3rem;
            text-align: center;
            margin-bottom: 2rem;
            font-weight: 800;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            position: relative;
            display: inline-block;
            width: 100%;
        }
        .section-title::after {
            content: '';
            position: absolute;
            bottom: -10px;
            left: 50%;
            width: 80px;
            height: 4px;
            background: linear-gradient(90deg, #667eea, #764ba2);
            transform: translateX(-50%);
            border-radius: 2px;
        }
        .function-desc {
            text-align: center;
            font-size: 1.3rem;
            color: #555;
            max-width: 900px;
            margin: 3rem auto;
            line-height: 1.8;
            padding: 2rem;
            background: rgba(255,255,255,0.8);
            border-radius: 20px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.05);
            border: 1px solid rgba(102, 126, 234, 0.1);
        }

        /* Scenarios Section */
        .scenarios {
            padding: 100px 0;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05));
            position: relative;
            overflow: hidden;
        }
        .scenarios::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 200%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            animation: shine 8s infinite;
        }
        @keyframes shine {
            0% { left: -100%; }
            50%, 100% { left: 100%; }
        }
        .scenarios-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1.5rem;
            margin-top: 3rem;
        }
        .scenario-card {
            background: linear-gradient(135deg, #667eea, #764ba2, #f093fb);
            background-size: 200% 200%;
            color: white;
            padding: 2rem 1.5rem;
            border-radius: 20px;
            text-align: center;
            font-size: 1.1rem;
            font-weight: 600;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            cursor: pointer;
            position: relative;
            overflow: hidden;
            animation: gradientMove 5s ease infinite;
        }
        @keyframes gradientMove {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
        }
        .scenario-card::before {
            content: '';
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            background: linear-gradient(45deg, #ffd700, transparent, #ffd700);
            border-radius: 20px;
            opacity: 0;
            z-index: -1;
            transition: opacity 0.3s;
        }
        .scenario-card:hover::before {
            opacity: 1;
        }
        .scenario-card:hover {
            transform: translateY(-8px) scale(1.05) rotate(2deg);
            box-shadow: 0 15px 35px rgba(102, 126, 234, 0.5);
        }

        /* Features Section */
        .features {
            padding: 100px 0;
            background: linear-gradient(180deg, rgba(248,249,250,0.95) 0%, rgba(255,255,255,0.95) 100%);
            position: relative;
        }
        .features-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 3rem;
            margin-top: 3rem;
        }
        .feature-block {
            background: white;
            padding: 3rem;
            border-radius: 30px;
            box-shadow: 0 20px 60px rgba(102, 126, 234, 0.1);
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            position: relative;
            overflow: hidden;
            border: 2px solid transparent;
            background-image: linear-gradient(white, white),
                              linear-gradient(135deg, #667eea, #764ba2);
            background-origin: border-box;
            background-clip: padding-box, border-box;
        }
        .feature-block::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05));
            opacity: 0;
            transition: opacity 0.3s;
        }
        .feature-block:hover::before {
            opacity: 1;
        }
        .feature-block:hover {
            transform: translateY(-10px) scale(1.02);
            box-shadow: 0 30px 80px rgba(102, 126, 234, 0.2);
        }
        .feature-block h3 {
            font-size: 2rem;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 1.5rem;
            padding-bottom: 1rem;
            border-bottom: 3px solid;
            border-image: linear-gradient(90deg, #667eea, #764ba2) 1;
            font-weight: 700;
        }
        .feature-block p {
            font-size: 1.1rem;
            color: #555;
            line-height: 1.8;
        }

        /* Contact Section */
        .contact {
            padding: 100px 0;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.08), rgba(240, 147, 251, 0.08));
            position: relative;
        }
        .contact-content {
            text-align: center;
        }
        .contact-qr {
            width: 220px;
            margin: 3rem auto;
            position: relative;
            padding: 15px;
            background: white;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(102, 126, 234, 0.2);
            transition: all 0.3s;
        }
        .contact-qr:hover {
            transform: scale(1.05);
            box-shadow: 0 15px 50px rgba(102, 126, 234, 0.3);
        }
        .contact-qr img {
            width: 100%;
            height: auto;
            border-radius: 10px;
        }

        /* Footer */
        .footer {
            background: linear-gradient(180deg, #1a1f3a, #0a0e27);
            color: white;
            padding: 80px 0 30px;
            position: relative;
        }
        .footer::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, #667eea, #764ba2, #f093fb, #667eea);
            background-size: 200% 100%;
            animation: shimmer 3s linear infinite;
        }
        .footer-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 3rem;
        }
        .footer-column h3 {
            font-size: 1.5rem;
            margin-bottom: 1.5rem;
            background: linear-gradient(135deg, #ffd700, #fff);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            font-weight: 700;
        }
        .footer-column p, .footer-column a {
            color: rgba(255,255,255,0.8);
            text-decoration: none;
            line-height: 2;
            transition: all 0.3s;
        }
        .footer-column a:hover {
            color: #ffd700;
            transform: translateX(5px);
        }
        .footer-bottom {
            text-align: center;
            margin-top: 3rem;
            padding-top: 2rem;
            border-top: 1px solid rgba(255,255,255,0.1);
            color: rgba(255,255,255,0.6);
        }
        .footer-bottom a {
            color: rgba(255,255,255,0.8);
            text-decoration: none;
            transition: color 0.3s;
        }
        .footer-bottom a:hover {
            color: #ffd700;
        }

        /* Popup Modal */
        .popup-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            justify-content: center;
            align-items: center;
            animation: fadeIn 0.3s ease;
        }

        .popup-overlay.show {
            display: flex;
        }

        .popup-content {
            position: relative;
            max-width: 90%;
            max-height: 90%;
            animation: slideIn 0.3s ease;
        }

        .popup-close {
            position: absolute;
            top: -40px;
            right: 0;
            width: 40px;
            height: 40px;
            background: rgba(255, 255, 255, 0.1);
            border: 2px solid #fff;
            border-radius: 50%;
            color: #fff;
            font-size: 24px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s;
        }

        .popup-close:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: rotate(90deg);
        }

        .popup-image {
            max-width: 100%;
            max-height: 80vh;
            display: block;
            border-radius: 8px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
            }
            to {
                opacity: 1;
            }
        }

        @keyframes slideIn {
            from {
                transform: scale(0.8);
                opacity: 0;
            }
            to {
                transform: scale(1);
                opacity: 1;
            }
        }

        /* Responsive */
        @media (max-width: 768px) {
            .hero-title {
                font-size: 2rem;
            }
            .hero-features {
                grid-template-columns: 1fr;
                gap: 1rem;
            }
            .scenarios-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            .features-grid {
                grid-template-columns: 1fr;
            }
            .footer-container {
                grid-template-columns: 1fr;
            }
            .nav-menu {
                flex-direction: column;
                gap: 1rem;
            }
            .popup-content {
                max-width: 95%;
                max-height: 95%;
            }
            .popup-close {
                top: -35px;
                width: 35px;
                height: 35px;
                font-size: 20px;
            }
        }
    </style>
</head>
<body>
    <!-- Navigation -->
    <nav class="navbar">
        <div class="nav-container">
            <a href="/" class="logo">
                <img src="/images/wanjian/logowj.png" alt="万剪官网">
            </a>
            <ul class="nav-menu">
                <li><a href="/">主页</a></li>
                <li><a href="https://nfbo7fbz4v.feishu.cn/docs/doccnSqSLv8P44y3cRloTsR5UHb" target="_blank">视频教程</a></li>
                <li><a href="#news">行业资讯</a></li>
                <li><a href="/matrix-publish">矩阵群发</a></li>
                <li><a href="https://nfbo7fbz4v.feishu.cn/docx/doxcnP9X6uUPZ5yfArCG85BNWvh" target="_blank" class="buy-btn">立即购买</a></li>
            </ul>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero">
        <div class="hero-container">
            <h1 class="hero-title">批量剪辑视频神器</h1>
            <div class="hero-features">
                <div class="hero-feature">
                    <h3>批量</h3>
                    <p>自动批量剪辑，解放双手</p>
                </div>
                <div class="hero-feature">
                    <h3>简单</h3>
                    <p>一天就能快速上手</p>
                </div>
                <div class="hero-feature">
                    <h3>二创</h3>
                    <p>一键处理/画中画/加速等</p>
                </div>
                <div class="hero-feature">
                    <h3>强大</h3>
                    <p>一个顶5个，效率翻倍</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Function Introduction -->
    <section class="function-intro">
        <div class="section-container">
            <h2 class="section-title">功能简介</h2>
            <p class="function-desc">
                一键混剪、根据模板批量剪辑、多种分割、多种合并、多种混剪、文案提取、文字转语音等，
                一个顶5个。只要你是做好物号，书单号，故事号，探店号，剧情号等，万剪就是【效率神器】
            </p>
        </div>
    </section>

    <!-- Scenarios Section -->
    <section class="scenarios">
        <div class="section-container">
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
        </div>
    </section>

    <!-- Features Section -->
    <section class="features">
        <div class="section-container">
            <h2 class="section-title">超多功能 即买即用</h2>
            <div class="features-grid">
                <div class="feature-block">
                    <h3>批量处理</h3>
                    <p>分割、提取、合成裂变、去水印、画中画等视频分割、提取无声视频、提取视频中的BGM、视频截图、视频格式无损转换、画中画、音频分割、视频镜头切片、文件分配分类、mob转mp4与画面校正、横竖屏转换、音量音调统一、字幕文件格式转换、封面截图、图片加文字水印、图转视频、视频裁剪、去水印</p>
                </div>
                <div class="feature-block">
                    <h3>批量混剪</h3>
                    <p>100+参数，AI智能一键全自动批量剪辑。自动修改MD5，左右上下翻转，234宫格混剪，加减片头片尾，分辨率，重编码，顺序/随机混剪，转场特效，主副视频替换混剪，横竖屏转换，比特率，区域裁剪，添加/替换音频、背景音乐，贴纸特效，滤镜LUT，定帧补帧，背景填充，封面目录，抽取时长/生成视频时长，标题seo，字幕样式自定义，色度抠图，整段/分段文案，上下左右开幕，帧率，随机旋转角度，亮度，降噪，对比度，锐化，饱和度，边框，蒙版倒置，光晕，马赛克，网格，卡通风格，变速，抽帧，十字关键帧运镜，透明蒙层，间隔翻转，字幕背景条，动态缩放，无声音轨，透明度，图片边框，箭头贴纸，特效视频</p>
                </div>
                <div class="feature-block">
                    <h3>文音互转</h3>
                    <p>自动配字幕、提取文案、文字转语音等。自动配字幕（自定义字体/描边/阴影/字幕大小距离位置和背景、自定义字幕背景条覆盖原字幕）、提取文案（支持MP3、MP4、m4a、wav格式，可导出txt、lrc、ass、vtt、ssa、mp3和外语格式）、文本合成语音（阿里云语音平台，93种配音员，微软云语音，309种配音员，支持语速，语调，音量，角色，说话风格自定义，文本支持txt、lrc、ass、vtt、ssa格式）</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Contact Section -->
    <section class="contact">
        <div class="section-container">
            <h2 class="section-title">联系我们</h2>
            <div class="contact-content">
                <div class="contact-qr">
                    <img src="/images/wanjian/output.jpg" alt="联系二维码">
                </div>
                <p style="color: #666; font-size: 1.1rem;">扫码添加微信，了解更多详情</p>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
        <div class="footer-container">
            <div class="footer-column">
                <h3>快速链接</h3>
                <p><a href="/">主页</a></p>
                <p><a href="#news">行业资讯</a></p>
                <p><a href="https://nfbo7fbz4v.feishu.cn/docx/doxcnP9X6uUPZ5yfArCG85BNWvh" target="_blank">立即购买</a></p>
            </div>
            <div class="footer-column">
                <h3>联系方式</h3>
                <p>扫码添加微信咨询</p>
                <p>专业团队为您服务</p>
            </div>
            <div class="footer-column">
                <h3>友情链接</h3>
                <p>更多合作伙伴</p>
            </div>
        </div>
        <div class="footer-bottom">
            <p>©2024 万剪 批量剪辑软件 版权所有${icpInfo ? ` | ${icpInfo.company}` : ''}</p>
            ${icpInfo ? `<p>备案号：<a href="https://beian.miit.gov.cn/" target="_blank">${icpInfo.icp}</a></p>` : ''}
        </div>
    </footer>

    <!-- Popup Modal -->
    <div id="popupOverlay" class="popup-overlay">
        <div class="popup-content">
            <span class="popup-close" onclick="closePopup()">×</span>
            <img class="popup-image" src="https://tuiguangpic1.oss-cn-hangzhou.aliyuncs.com/wanjian/%E4%BE%A7%E8%BE%B9.gif" alt="万剪优惠活动">
        </div>
    </div>

    <script>
        // 5秒后自动弹窗
        let popupTimer;
        let hasShownPopup = false;

        function showPopup() {
            if (!hasShownPopup) {
                const overlay = document.getElementById('popupOverlay');
                overlay.classList.add('show');
                hasShownPopup = true;

                // 记录到sessionStorage，避免刷新页面重复弹出
                sessionStorage.setItem('wanjianPopupShown', 'true');
            }
        }

        function closePopup() {
            const overlay = document.getElementById('popupOverlay');
            overlay.classList.remove('show');
        }

        // 检查是否已经显示过弹窗
        if (!sessionStorage.getItem('wanjianPopupShown')) {
            popupTimer = setTimeout(showPopup, 5000); // 5秒后显示弹窗
        }

        // 点击遮罩层也可以关闭弹窗
        document.getElementById('popupOverlay').addEventListener('click', function(e) {
            if (e.target === this) {
                closePopup();
            }
        });

        // 清理定时器
        window.addEventListener('beforeunload', function() {
            if (popupTimer) {
                clearTimeout(popupTimer);
            }
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

export default renderWanjianHomepage