import { DatabaseService, KVService } from '../utils/database'
import { ArticleService } from '../services/articleService'

/**
 * Vultr VPS 网站渲染器 - 完全按照 https://vultrvps.cn/ 的内容
 */
export async function renderVultrHomepage(c: any, site: any) {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>vultr官网 - vultr服务器，vultr优惠码，vultr vps，vultr100美元</title>
    <meta name="description" content="Vultr中文网新用户 送300美元 全球32个机房任意选任意VPS 5美元起">
    <meta name="keywords" content="vultr,vultr vps,vultr优惠码,vultr服务器,vultr100美元">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
            background: #0a0f1b;
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
            background: linear-gradient(45deg, #0a0f1b, #1a2332, #0a0f1b);
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
        .particles {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 0;
        }

        .particle {
            position: absolute;
            width: 4px;
            height: 4px;
            background: rgba(0, 123, 255, 0.5);
            border-radius: 50%;
            animation: float 20s linear infinite;
        }

        @keyframes float {
            0% {
                transform: translateY(100vh) translateX(0);
                opacity: 0;
            }
            10% {
                opacity: 1;
            }
            90% {
                opacity: 1;
            }
            100% {
                transform: translateY(-100vh) translateX(100px);
                opacity: 0;
            }
        }

        /* Header */
        .header {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            box-shadow: 0 5px 20px rgba(0, 123, 255, 0.2);
            position: sticky;
            top: 0;
            z-index: 1000;
            border-bottom: 2px solid transparent;
            background-image: linear-gradient(90deg, rgba(255,255,255,0.95), rgba(255,255,255,0.95)),
                              linear-gradient(90deg, #007bff, #00d4ff, #007bff);
            background-origin: border-box;
            background-clip: padding-box, border-box;
        }

        .nav-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 1rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .logo {
            font-size: 2rem;
            font-weight: bold;
            background: linear-gradient(135deg, #007bff, #00d4ff);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            text-decoration: none;
            transition: transform 0.3s;
        }

        .logo:hover {
            transform: scale(1.1);
        }

        .nav-menu {
            display: flex;
            list-style: none;
            gap: 2rem;
            align-items: center;
        }

        .nav-menu a {
            color: #333;
            text-decoration: none;
            font-size: 1.1rem;
            position: relative;
            transition: all 0.3s;
            font-weight: 500;
        }

        .nav-menu a::after {
            content: '';
            position: absolute;
            bottom: -5px;
            left: 50%;
            width: 0;
            height: 3px;
            background: linear-gradient(90deg, #007bff, #00d4ff);
            transition: all 0.3s;
            transform: translateX(-50%);
        }

        .nav-menu a:hover::after {
            width: 100%;
        }

        .nav-menu a:hover {
            color: #007bff;
            transform: translateY(-2px);
        }

        .buy-now-btn {
            background: linear-gradient(135deg, #007bff, #00d4ff);
            background-size: 200% 200%;
            color: white !important;
            padding: 12px 30px;
            border-radius: 50px;
            transition: all 0.3s;
            box-shadow: 0 4px 15px rgba(0, 123, 255, 0.4);
            animation: shimmer 3s ease infinite;
            font-weight: bold;
        }

        @keyframes shimmer {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }

        .buy-now-btn:hover {
            transform: translateY(-3px) scale(1.05);
            box-shadow: 0 8px 25px rgba(0, 123, 255, 0.6);
        }

        .buy-now-btn:hover::after {
            width: 0;
        }

        /* Hero Section */
        .hero {
            background: linear-gradient(135deg, #007bff 0%, #00d4ff 50%, #0056b3 100%);
            color: white;
            padding: 120px 20px;
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

        .hero-content {
            max-width: 1000px;
            margin: 0 auto;
            position: relative;
            z-index: 1;
        }

        .hero h1 {
            font-size: 4rem;
            margin-bottom: 1.5rem;
            font-weight: 800;
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

        .hero-subtitle {
            font-size: 2rem;
            margin-bottom: 1rem;
            color: #ffd700;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            font-weight: 600;
        }

        .hero-description {
            font-size: 1.4rem;
            margin-bottom: 3rem;
            color: rgba(255,255,255,0.95);
            text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
        }

        .hero-cta {
            background: linear-gradient(135deg, #ff4757, #ff6b7a);
            background-size: 200% 200%;
            color: white;
            padding: 18px 50px;
            font-size: 1.3rem;
            font-weight: bold;
            border-radius: 50px;
            text-decoration: none;
            display: inline-block;
            transition: all 0.3s;
            box-shadow: 0 10px 30px rgba(255, 71, 87, 0.4);
            animation: pulse 2s infinite;
            position: relative;
            overflow: hidden;
        }

        .hero-cta::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            background: rgba(255,255,255,0.3);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            transition: width 0.6s, height 0.6s;
        }

        .hero-cta:hover::before {
            width: 300px;
            height: 300px;
        }

        .hero-cta:hover {
            transform: translateY(-3px) scale(1.05);
            box-shadow: 0 15px 40px rgba(255, 71, 87, 0.5);
        }

        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.02); }
            100% { transform: scale(1); }
        }

        /* Promotions Section */
        .promotions {
            padding: 100px 20px;
            background: linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(248,249,250,0.95) 100%);
            position: relative;
        }

        .promotions::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, #007bff, transparent);
        }

        .section-title {
            text-align: center;
            font-size: 3rem;
            margin-bottom: 3rem;
            font-weight: 800;
            background: linear-gradient(135deg, #007bff, #00d4ff);
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
            width: 100px;
            height: 4px;
            background: linear-gradient(90deg, #007bff, #00d4ff);
            transform: translateX(-50%);
            border-radius: 2px;
        }

        .promo-grid {
            max-width: 1200px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
            gap: 2rem;
        }

        .promo-card {
            background: white;
            border: 2px solid transparent;
            border-radius: 20px;
            padding: 2.5rem;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            position: relative;
            overflow: hidden;
            background-image: linear-gradient(white, white),
                              linear-gradient(135deg, #007bff, #00d4ff);
            background-origin: border-box;
            background-clip: padding-box, border-box;
        }

        .promo-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 5px;
            background: linear-gradient(90deg, #007bff, #00d4ff, #007bff);
            background-size: 200% 100%;
            animation: shimmer 3s linear infinite;
        }

        .promo-card::after {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(0,123,255,0.1) 0%, transparent 70%);
            opacity: 0;
            transition: opacity 0.3s;
        }

        .promo-card:hover::after {
            opacity: 1;
        }

        .promo-card:hover {
            box-shadow: 0 20px 60px rgba(0,123,255,0.3);
            transform: translateY(-10px) scale(1.02);
        }

        .promo-amount {
            font-size: 3rem;
            background: linear-gradient(135deg, #ff4757, #ff6b7a);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            font-weight: 900;
            margin-bottom: 0.5rem;
            animation: textPulse 2s ease-in-out infinite;
        }

        @keyframes textPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }

        .promo-title {
            font-size: 1.5rem;
            color: #333;
            margin-bottom: 1rem;
        }

        .promo-description {
            color: #666;
            margin-bottom: 1.5rem;
            line-height: 1.6;
        }

        .promo-code {
            background: #f0f3f7;
            padding: 0.5rem 1rem;
            border-radius: 5px;
            display: inline-block;
            margin-bottom: 1rem;
            font-family: monospace;
            font-weight: bold;
            color: #007bff;
        }

        .promo-btn {
            background: linear-gradient(135deg, #007bff, #00d4ff);
            background-size: 200% 200%;
            color: white;
            padding: 14px 35px;
            border-radius: 50px;
            text-decoration: none;
            display: inline-block;
            transition: all 0.3s;
            font-weight: bold;
            box-shadow: 0 4px 15px rgba(0,123,255,0.3);
            position: relative;
            overflow: hidden;
        }

        .promo-btn::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            background: rgba(255,255,255,0.3);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            transition: width 0.6s, height 0.6s;
        }

        .promo-btn:hover::before {
            width: 200px;
            height: 200px;
        }

        .promo-btn:hover {
            transform: translateY(-2px) scale(1.05);
            box-shadow: 0 8px 25px rgba(0,123,255,0.4);
            animation: shimmer 1s ease;
        }

        /* Instructions Section */
        .instructions {
            padding: 80px 20px;
            background: #f8f9fa;
        }

        .instructions-content {
            max-width: 1000px;
            margin: 0 auto;
        }

        .instruction-list {
            background: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }

        .instruction-list h3 {
            font-size: 1.8rem;
            margin-bottom: 1.5rem;
            color: #333;
        }

        .instruction-list ul {
            list-style: none;
            padding: 0;
        }

        .instruction-list li {
            padding: 1rem;
            border-bottom: 1px solid #e1e8ed;
            color: #555;
            position: relative;
            padding-left: 2rem;
        }

        .instruction-list li:last-child {
            border-bottom: none;
        }

        .instruction-list li:before {
            content: '✓';
            position: absolute;
            left: 0.5rem;
            color: #00c851;
            font-weight: bold;
        }

        /* FAQ Section */
        .faq {
            padding: 80px 20px;
            background: white;
        }

        .faq-container {
            max-width: 900px;
            margin: 0 auto;
        }

        .faq-item {
            background: white;
            border: 1px solid #e1e8ed;
            border-radius: 8px;
            margin-bottom: 1rem;
            overflow: hidden;
            transition: all 0.3s;
        }

        .faq-item:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .faq-question {
            padding: 1.5rem;
            background: #f8f9fa;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: 600;
            color: #333;
        }

        .faq-question:hover {
            background: #e9ecef;
        }

        .faq-answer {
            padding: 1.5rem;
            color: #666;
            line-height: 1.6;
            display: none;
        }

        .faq-item.active .faq-answer {
            display: block;
        }

        .faq-arrow {
            transition: transform 0.3s;
            font-size: 1.2rem;
        }

        .faq-item.active .faq-arrow {
            transform: rotate(180deg);
        }

        /* Footer */
        .footer {
            background: #2c3e50;
            color: white;
            padding: 40px 20px 20px;
        }

        .footer-content {
            max-width: 1200px;
            margin: 0 auto;
            text-align: center;
        }

        .footer-tags {
            margin-bottom: 2rem;
        }

        .footer-tags a {
            color: #bdc3c7;
            text-decoration: none;
            margin: 0 10px;
            font-size: 0.9rem;
            transition: color 0.3s;
        }

        .footer-tags a:hover {
            color: white;
        }

        .footer-copyright {
            padding-top: 20px;
            border-top: 1px solid rgba(255,255,255,0.1);
            color: #95a5a6;
        }

        .footer-copyright a {
            color: #3498db;
            text-decoration: none;
        }

        .footer-copyright a:hover {
            color: #2980b9;
        }

        /* Responsive */
        @media (max-width: 768px) {
            .hero h1 {
                font-size: 2rem;
            }

            .hero-subtitle {
                font-size: 1.2rem;
            }

            .promo-grid {
                grid-template-columns: 1fr;
            }

            .nav-menu {
                flex-direction: column;
                gap: 1rem;
            }

            .promo-amount {
                font-size: 2rem;
            }
        }
    </style>
</head>
<body>
    <!-- Floating Particles -->
    <div class="particles">
        <div class="particle" style="left: 10%; animation-delay: 0s;"></div>
        <div class="particle" style="left: 20%; animation-delay: 2s;"></div>
        <div class="particle" style="left: 30%; animation-delay: 4s;"></div>
        <div class="particle" style="left: 40%; animation-delay: 6s;"></div>
        <div class="particle" style="left: 50%; animation-delay: 8s;"></div>
        <div class="particle" style="left: 60%; animation-delay: 10s;"></div>
        <div class="particle" style="left: 70%; animation-delay: 12s;"></div>
        <div class="particle" style="left: 80%; animation-delay: 14s;"></div>
        <div class="particle" style="left: 90%; animation-delay: 16s;"></div>
    </div>

    <!-- Header -->
    <header class="header">
        <div class="nav-container">
            <a href="/" class="logo">Vultr中文网</a>
            <nav>
                <ul class="nav-menu">
                    <li><a href="/">主页</a></li>
                    <li><a href="#news">最新资讯</a></li>
                    <li><a href="https://www.vultr.com/?ref=9602990-8H" target="_blank" class="buy-now-btn">立即购买</a></li>
                </ul>
            </nav>
        </div>
    </header>

    <!-- Hero Section -->
    <section class="hero">
        <div class="hero-content">
            <h1>Vultr中文网新用户 送300美元</h1>
            <p class="hero-subtitle">全球32个机房任意选</p>
            <p class="hero-description">任意VPS 5美元起</p>
            <a href="https://www.vultr.com/promo/try300/?ref=9661911-9J" target="_blank" class="hero-cta">立即参加</a>
        </div>
    </section>

    <!-- Promotions -->
    <section class="promotions">
        <h2 class="section-title">Vultr 最新优惠活动</h2>
        <div class="promo-grid">
            <div class="promo-card">
                <div class="promo-amount">$250</div>
                <h3 class="promo-title">Vultr 新用户注册赠送250美元</h3>
                <p class="promo-description">主要针对新用户，通过优惠链接注册才可以得到250美元赠送，注意250美元有效期为30天，超过一个月赠款将失效。</p>
                <a href="https://www.vultr.com/promo/try300/?ref=9661911-9J" target="_blank" class="promo-btn">立即参与</a>
            </div>

            <div class="promo-card">
                <div class="promo-amount">$100</div>
                <h3 class="promo-title">Vultr 新用户注册赠送100美元活动</h3>
                <p class="promo-description">主要针对新用户，通过优惠链接注册才可以得到100美元赠送，注意100美元有效期为14天，超过14天赠款将失效。</p>
                <a href="https://www.vultr.com/promo/try300/?ref=9661911-9J" target="_blank" class="promo-btn">立即参与</a>
            </div>

            <div class="promo-card">
                <div class="promo-amount">$200</div>
                <h3 class="promo-title">Vultr 新用户注册免费赠送200美元</h3>
                <p class="promo-description">主要针对新用户，通过优惠链接注册才可以得到50美元赠送，注意50美元有效期为30天，超过一个月赠款将失效。</p>
                <div class="promo-code">优惠码：FLYTWOHUNDRED</div>
                <a href="https://www.vultr.com/promo/try300/?ref=9661911-9J" target="_blank" class="promo-btn">立即使用</a>
            </div>

            <div class="promo-card">
                <div class="promo-amount">100%</div>
                <h3 class="promo-title">Vultr 优惠码充值翻倍</h3>
                <p class="promo-description">主要针对新用户，通过优惠链接注册才可以得到100美元赠送，注意100美元有效期为14天，超过14天赠款将失效。</p>
                <div class="promo-code">优惠码：VULTRMATCH</div>
                <a href="https://www.vultr.com/promo/try300/?ref=9661911-9J" target="_blank" class="promo-btn">立即参与</a>
            </div>

            <div class="promo-card">
                <div class="promo-amount">75折</div>
                <h3 class="promo-title">Vultr 云服务器终身75折优惠码</h3>
                <p class="promo-description">本次优惠活动针对新用户，适用于在创建帐户后30天内启动的实例。只要实例处于活动状态，新的云计算实例将获得 25% 折扣。</p>
                <div class="promo-code">优惠码：25OFF</div>
                <a href="https://www.vultr.com/promo/try300/?ref=9661911-9J" target="_blank" class="promo-btn">立即使用</a>
            </div>

            <div class="promo-card">
                <div class="promo-amount">$3</div>
                <h3 class="promo-title">Vultr 绑定社交平台免费领取3美元（已失效）</h3>
                <p class="promo-description">方式：验证您的Twitter帐户可以获得1美元 ，在Twitter上关注@Vultr并获得1美元，发布一条关于Vultr的Twitter文章，并获得1美元。</p>
                <a href="#" class="promo-btn" style="opacity: 0.5; cursor: not-allowed;">已失效</a>
            </div>
        </div>
    </section>

    <!-- Instructions -->
    <section class="instructions">
        <div class="instructions-content">
            <h2 class="section-title">Vultr VPS相关说明+注意事项</h2>
            <div class="instruction-list">
                <ul>
                    <li>选择适合自己的Vultr vps核对购买年限和机房并点下一步</li>
                    <li>跳转到官网并核实信息</li>
                    <li>注册填写个人资料等信息点击付款</li>
                    <li>免费无限次重启Vultr VPS</li>
                    <li>客户拥有所有VPS的基本操作权限</li>
                    <li>勿进行对外攻击、垃圾邮件、端口扫描、钓鱼诈骗、传播木马等行为</li>
                    <li>客户需自觉遵守美国与数据中心当地法律法规、机房管理制度</li>
                </ul>
            </div>
        </div>
    </section>

    <!-- FAQ Section -->
    <section class="faq">
        <div class="faq-container">
            <h2 class="section-title">Vultr VPS 常见问题解答</h2>

            <div class="faq-item">
                <div class="faq-question">
                    问：Vultr可以安装哪些系统？Windows可以安装吗？
                    <span class="faq-arrow">▼</span>
                </div>
                <div class="faq-answer">
                    答：可以安装Windows，也可安装主流Linux系统，如CentOS、Ubuntu、FreeBSD等系统。
                </div>
            </div>

            <div class="faq-item">
                <div class="faq-question">
                    问：系统重装或更换其他系统有限制吗？需要收费吗？
                    <span class="faq-arrow">▼</span>
                </div>
                <div class="faq-answer">
                    答：Vultr VPS可以免费无限次重装或更换系统，您可以任意切换各种系统。
                </div>
            </div>

            <div class="faq-item">
                <div class="faq-question">
                    问：Vultr VPS适合用来建站吗？
                    <span class="faq-arrow">▼</span>
                </div>
                <div class="faq-answer">
                    答：完全可以！Vultr VPS非常适合搭建中小型网站。
                </div>
            </div>

            <div class="faq-item">
                <div class="faq-question">
                    问：我可以用远程桌面管理VPS吗？
                    <span class="faq-arrow">▼</span>
                </div>
                <div class="faq-answer">
                    答：不可以，Vultr需通过SSH进行连接、管理。
                </div>
            </div>

            <div class="faq-item">
                <div class="faq-question">
                    问：Vultr VPS状态显示Fraud(欺诈)怎么办？
                    <span class="faq-arrow">▼</span>
                </div>
                <div class="faq-answer">
                    答：注册信息不要胡乱填写，尤其国家一栏需与你当前网络环境的IP一致；另外不要用一些黑PayPal付款，100%会被发现。
                </div>
            </div>

            <div class="faq-item">
                <div class="faq-question">
                    问：连接SSH的工具有哪些推荐？
                    <span class="faq-arrow">▼</span>
                </div>
                <div class="faq-answer">
                    答：站长推荐使用XShell进行管理，SecureCRT和PuTTY也是大家常用程序。
                </div>
            </div>

            <div class="faq-item">
                <div class="faq-question">
                    问：Vultr VPS什么时候续费？可以一次买多年吗？
                    <span class="faq-arrow">▼</span>
                </div>
                <div class="faq-answer">
                    答：Vultr采用国外通用的账单模式，不可以买多年。系统会在VPS到期后的一周内生成新账单并以邮件通知，在一周内续费即可。
                </div>
            </div>

            <div class="faq-item">
                <div class="faq-question">
                    问：选择什么数据中心较好
                    <span class="faq-arrow">▼</span>
                </div>
                <div class="faq-answer">
                    答：Vultr VPS目前拥有日本东京、美国洛杉矶、西雅图、英国伦敦、德国等全球15个数据中心对中文速度较好的是硅谷和洛杉矶。
                </div>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
        <div class="footer-content">
            <div class="footer-tags">
                <a href="#">VPS</a>
                <a href="#">VPS服务器</a>
                <a href="#">Vultr</a>
                <a href="#">Vultr VPS</a>
                <a href="#">高性价比VPS</a>
                <a href="#">独立IP</a>
                <a href="#">全球机房</a>
                <a href="#">支付宝支付</a>
                <a href="#">CN2线路</a>
                <a href="#">稳定VPS</a>
            </div>
            <div class="footer-copyright">
                <p>© 2024 Vultr中文网 | <a href="https://beian.miit.gov.cn/" target="_blank">沪ICP备2022016551号</a> | <a href="/sitemap">网站地图</a></p>
            </div>
        </div>
    </footer>

    <script>
        // FAQ Toggle
        document.querySelectorAll('.faq-question').forEach(question => {
            question.addEventListener('click', () => {
                const item = question.parentElement;
                item.classList.toggle('active');
            });
        });
    </script>
</body>
</html>`

  return c.html(html)
}

export default renderVultrHomepage