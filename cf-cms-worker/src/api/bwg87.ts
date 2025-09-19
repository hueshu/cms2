import { Hono } from 'hono'
import { getCurrentSite } from '../middleware/domain'
import type { Env } from '../index'

/**
 * BWG87.com site renderer
 */
export const bwg87Routes = new Hono<{ Bindings: Env }>()

// Homepage renderer for BWG87.com
export function renderBwg87Homepage(c: any, site: any) {

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>搬瓦工VPS - BandwagonHost中文网 - 高速稳定美国CN2 GIA VPS</title>
    <meta name="description" content="搬瓦工VPS官网,BandwagonHost中文网,提供高速稳定的美国CN2 GIA VPS服务器,支持支付宝付款,30天退款保证">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;
            background: #f5f5f5;
            color: #333;
        }

        /* Header */
        .header {
            background: #2c3e50;
            padding: 0;
            position: sticky;
            top: 0;
            z-index: 1000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .nav-container {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            padding: 0 20px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #fff;
            padding: 15px 0;
            margin-right: 40px;
        }
        .nav-menu {
            display: flex;
            list-style: none;
            flex: 1;
        }
        .nav-menu a {
            color: #ecf0f1;
            text-decoration: none;
            padding: 20px 15px;
            display: block;
            transition: background 0.3s;
        }
        .nav-menu a:hover {
            background: #34495e;
        }

        /* Hero Section */
        .hero {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 80px 20px;
            text-align: center;
        }
        .hero-title {
            font-size: 48px;
            margin-bottom: 20px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }
        .hero-subtitle {
            font-size: 20px;
            margin-bottom: 40px;
            opacity: 0.95;
        }
        .hero-features {
            display: flex;
            justify-content: center;
            gap: 40px;
            flex-wrap: wrap;
            margin-top: 40px;
        }
        .hero-feature {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 16px;
        }
        .hero-feature-icon {
            font-size: 24px;
        }

        /* Features Grid */
        .features {
            padding: 60px 20px;
            background: white;
        }
        .features-container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .features-title {
            text-align: center;
            font-size: 36px;
            margin-bottom: 50px;
            color: #2c3e50;
        }
        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 30px;
        }
        .feature-card {
            text-align: center;
            padding: 30px 20px;
            border-radius: 10px;
            transition: transform 0.3s, box-shadow 0.3s;
            background: #f8f9fa;
        }
        .feature-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .feature-icon {
            font-size: 48px;
            margin-bottom: 20px;
        }
        .feature-title {
            font-size: 20px;
            margin-bottom: 15px;
            color: #2c3e50;
        }
        .feature-desc {
            color: #7f8c8d;
            line-height: 1.6;
        }

        /* Pricing Section */
        .pricing {
            padding: 60px 20px;
            background: #f5f5f5;
        }
        .pricing-container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .pricing-title {
            text-align: center;
            font-size: 36px;
            margin-bottom: 20px;
            color: #2c3e50;
        }
        .pricing-subtitle {
            text-align: center;
            font-size: 18px;
            color: #7f8c8d;
            margin-bottom: 50px;
        }
        .pricing-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 30px;
        }
        .pricing-card {
            background: white;
            border-radius: 10px;
            padding: 30px;
            text-align: center;
            position: relative;
            transition: transform 0.3s, box-shadow 0.3s;
            border: 2px solid transparent;
        }
        .pricing-card:hover {
            transform: translateY(-10px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            border-color: #667eea;
        }
        .pricing-card.featured {
            border-color: #667eea;
            transform: scale(1.05);
        }
        .pricing-badge {
            position: absolute;
            top: -15px;
            left: 50%;
            transform: translateX(-50%);
            background: #e74c3c;
            color: white;
            padding: 5px 20px;
            border-radius: 20px;
            font-size: 14px;
        }
        .pricing-name {
            font-size: 24px;
            margin-bottom: 20px;
            color: #2c3e50;
        }
        .pricing-price {
            font-size: 36px;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 10px;
        }
        .pricing-period {
            color: #7f8c8d;
            margin-bottom: 30px;
        }
        .pricing-features {
            list-style: none;
            margin-bottom: 30px;
        }
        .pricing-features li {
            padding: 10px 0;
            border-bottom: 1px solid #ecf0f1;
            color: #555;
        }
        .pricing-features li:last-child {
            border-bottom: none;
        }
        .pricing-button {
            display: inline-block;
            width: 100%;
            padding: 15px 30px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            transition: background 0.3s;
            font-weight: bold;
        }
        .pricing-button:hover {
            background: #5a67d8;
        }

        /* Why Choose Section */
        .why-choose {
            padding: 60px 20px;
            background: white;
        }
        .why-choose-container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .why-choose-title {
            text-align: center;
            font-size: 36px;
            margin-bottom: 50px;
            color: #2c3e50;
        }
        .why-choose-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 40px;
        }
        .why-card {
            display: flex;
            gap: 20px;
        }
        .why-icon {
            font-size: 36px;
            color: #667eea;
            flex-shrink: 0;
        }
        .why-content h3 {
            font-size: 20px;
            margin-bottom: 10px;
            color: #2c3e50;
        }
        .why-content p {
            color: #7f8c8d;
            line-height: 1.6;
        }

        /* Footer */
        .footer {
            background: #2c3e50;
            color: #ecf0f1;
            padding: 40px 20px;
            text-align: center;
        }
        .footer-container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .footer-links {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        .footer-links a {
            color: #ecf0f1;
            text-decoration: none;
            transition: color 0.3s;
        }
        .footer-links a:hover {
            color: #3498db;
        }
        .footer-copyright {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #34495e;
            color: #95a5a6;
        }

        /* CTA Button */
        .cta-button {
            display: inline-block;
            padding: 15px 40px;
            background: #e74c3c;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-size: 18px;
            font-weight: bold;
            transition: background 0.3s, transform 0.3s;
            margin-top: 20px;
        }
        .cta-button:hover {
            background: #c0392b;
            transform: translateY(-2px);
        }

        @media (max-width: 768px) {
            .hero-title { font-size: 32px; }
            .nav-menu { flex-direction: column; }
            .pricing-card.featured { transform: none; }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <header class="header">
        <nav class="nav-container">
            <div class="logo">🚀 搬瓦工VPS</div>
            <ul class="nav-menu">
                <li><a href="/">首页</a></li>
                <li><a href="#pricing">立即购买</a></li>
                <li><a href="#features">介绍</a></li>
                <li><a href="#cn2">CN2 & CN2 GIA</a></li>
                <li><a href="#faq">常见问题</a></li>
                <li><a href="https://bandwagonhost.com" target="_blank">搬瓦工英文网</a></li>
            </ul>
        </nav>
    </header>

    <!-- Hero Section -->
    <section class="hero">
        <h1 class="hero-title">搬瓦工 VPS</h1>
        <p class="hero-subtitle">高速稳定的美国 VPS 服务器，行业领先的主机稳定性</p>
        <div class="hero-features">
            <div class="hero-feature">
                <span class="hero-feature-icon">✅</span>
                <span>NO.1 行业稳定性</span>
            </div>
            <div class="hero-feature">
                <span class="hero-feature-icon">🌐</span>
                <span>独立IP地址</span>
            </div>
            <div class="hero-feature">
                <span class="hero-feature-icon">💳</span>
                <span>支持支付宝</span>
            </div>
            <div class="hero-feature">
                <span class="hero-feature-icon">💰</span>
                <span>高性价比</span>
            </div>
            <div class="hero-feature">
                <span class="hero-feature-icon">🔒</span>
                <span>30天退款保证</span>
            </div>
        </div>
        <a href="#pricing" class="cta-button">立即选购</a>
    </section>

    <!-- Features Section -->
    <section class="features" id="features">
        <div class="features-container">
            <h2 class="features-title">为什么选择搬瓦工VPS？</h2>
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon">⚡</div>
                    <h3 class="feature-title">高速网络</h3>
                    <p class="feature-desc">最低1Gbps带宽保证，CN2 GIA线路直连中国，延迟低至120ms</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🛡️</div>
                    <h3 class="feature-title">稳定可靠</h3>
                    <p class="feature-desc">99.9%正常运行时间保证，企业级硬件，冗余网络设计</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">💻</div>
                    <h3 class="feature-title">独立服务器</h3>
                    <p class="feature-desc">完全独立的VPS资源，root权限，自由安装任何软件</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🔐</div>
                    <h3 class="feature-title">SSL保护</h3>
                    <p class="feature-desc">免费SSL证书，HTTPS加密传输，保护数据安全</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">📊</div>
                    <h3 class="feature-title">智能管理</h3>
                    <p class="feature-desc">强大的控制面板，一键重装系统，实时监控服务器状态</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🔄</div>
                    <h3 class="feature-title">7x24监控</h3>
                    <p class="feature-desc">全天候服务器监控，自动故障转移，确保服务持续在线</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Pricing Section - 经济方案 -->
    <section class="pricing" id="pricing">
        <div class="pricing-container">
            <h2 class="pricing-title">经济方案</h2>
            <p class="pricing-subtitle"><a href="https://bwh81.net/aff.php?aff=74559" target="_blank" style="color: #667eea; text-decoration: none;">&gt;&gt;点击查看全部方案&lt;&lt;</a></p>
            <div class="pricing-grid">
                <!-- 热销款（性能好） -->
                <div class="pricing-card">
                    <div class="pricing-badge">热销款（性能好）</div>
                    <h3 class="pricing-name">性能优选版</h3>
                    <div class="pricing-price">$49.99</div>
                    <div class="pricing-period">每年</div>
                    <ul class="pricing-features">
                        <li>CPU: 2核</li>
                        <li>内存: 1 GB</li>
                        <li>硬盘: 20GB 固态硬盘</li>
                        <li>带宽: 1 Gbps</li>
                        <li>流量: 1000 GB/月</li>
                        <li>机房: 多机房（美国）</li>
                        <li>网络: 普通网络</li>
                    </ul>
                    <a href="https://bwh81.net/aff.php?aff=74559&pid=44" target="_blank" class="pricing-button">立即购买</a>
                </div>

                <!-- 热销款（网速够用） -->
                <div class="pricing-card featured">
                    <div class="pricing-badge">热销款（网速够用）</div>
                    <h3 class="pricing-name">CN2网络版</h3>
                    <div class="pricing-price">$49.99</div>
                    <div class="pricing-period">每年</div>
                    <ul class="pricing-features">
                        <li>CPU: 1核</li>
                        <li>内存: 1 GB</li>
                        <li>硬盘: 20GB 固态硬盘</li>
                        <li>带宽: 1 Gbps</li>
                        <li>流量: 1000 GB/月</li>
                        <li>机房: 洛杉矶（美国）</li>
                        <li>网络: CN2 网络</li>
                    </ul>
                    <a href="https://bwh81.net/aff.php?aff=74559&pid=57" target="_blank" class="pricing-button">立即购买</a>
                </div>

                <!-- 热销款（最优选） -->
                <div class="pricing-card">
                    <div class="pricing-badge">热销款（最优选）</div>
                    <h3 class="pricing-name">CN2 GIA-E版</h3>
                    <div class="pricing-price">$49.99</div>
                    <div class="pricing-period">每季度</div>
                    <ul class="pricing-features">
                        <li>CPU: 2核</li>
                        <li>内存: 1 GB</li>
                        <li>硬盘: 20GB 固态硬盘</li>
                        <li>带宽: 2.5 Gbps</li>
                        <li>流量: 1000 GB/月</li>
                        <li>机房: 洛杉矶/日本大阪</li>
                        <li>网络: CN2 GIA-E 网络</li>
                    </ul>
                    <a href="https://bwh81.net/aff.php?aff=74559&pid=87" target="_blank" class="pricing-button">立即购买</a>
                </div>
            </div>
        </div>
    </section>

    <!-- Pricing Section - 高端方案 -->
    <section class="pricing" style="background: white;">
        <div class="pricing-container">
            <h2 class="pricing-title">高端方案</h2>
            <p class="pricing-subtitle"><a href="https://bwh81.net/aff.php?aff=74559" target="_blank" style="color: #667eea; text-decoration: none;">&gt;&gt;点击查看全部方案&lt;&lt;</a></p>
            <div class="pricing-grid">
                <!-- 基本款-香港 -->
                <div class="pricing-card">
                    <h3 class="pricing-name">基本款-香港</h3>
                    <div class="pricing-price">$89.99</div>
                    <div class="pricing-period">每月</div>
                    <ul class="pricing-features">
                        <li>CPU: 2核</li>
                        <li>内存: 2 GB</li>
                        <li>硬盘: 40GB 固态硬盘</li>
                        <li>带宽: 1 Gbps</li>
                        <li>流量: 500 GB/月</li>
                        <li>机房: 香港（中国）</li>
                        <li>网络: CN2 GIA（企业级）</li>
                    </ul>
                    <a href="https://bwh81.net/aff.php?aff=74559&pid=95" target="_blank" class="pricing-button">立即购买</a>
                </div>

                <!-- 进阶款-香港 -->
                <div class="pricing-card featured">
                    <div class="pricing-badge">站长推荐</div>
                    <h3 class="pricing-name">进阶款-香港</h3>
                    <div class="pricing-price">$155.99</div>
                    <div class="pricing-period">每月</div>
                    <ul class="pricing-features">
                        <li>CPU: 4核</li>
                        <li>内存: 4 GB</li>
                        <li>硬盘: 80GB 固态硬盘</li>
                        <li>带宽: 1 Gbps</li>
                        <li>流量: 1000 GB/月</li>
                        <li>机房: 香港（中国）</li>
                        <li>网络: CN2 GIA（企业级）</li>
                    </ul>
                    <a href="https://bwh81.net/aff.php?aff=74559&pid=96" target="_blank" class="pricing-button">立即购买</a>
                </div>

                <!-- 高端款-香港 -->
                <div class="pricing-card">
                    <h3 class="pricing-name">高端款-香港</h3>
                    <div class="pricing-price">$299.99</div>
                    <div class="pricing-period">每月</div>
                    <ul class="pricing-features">
                        <li>CPU: 6核</li>
                        <li>内存: 8 GB</li>
                        <li>硬盘: 160GB 固态硬盘</li>
                        <li>带宽: 1 Gbps</li>
                        <li>流量: 2000 GB/月</li>
                        <li>机房: 香港（中国）</li>
                        <li>网络: CN2 GIA（企业级）</li>
                    </ul>
                    <a href="https://bwh81.net/aff.php?aff=74559&pid=97" target="_blank" class="pricing-button">立即购买</a>
                </div>

                <!-- 基本款-东京 -->
                <div class="pricing-card">
                    <h3 class="pricing-name">基本款-东京</h3>
                    <div class="pricing-price">$89.99</div>
                    <div class="pricing-period">每月</div>
                    <ul class="pricing-features">
                        <li>CPU: 2核</li>
                        <li>内存: 2 GB</li>
                        <li>硬盘: 40GB 固态硬盘</li>
                        <li>带宽: 1.2 Gbps</li>
                        <li>流量: 500 GB/月</li>
                        <li>机房: 东京（日本）</li>
                        <li>网络: CN2 GIA（企业级）</li>
                    </ul>
                    <a href="https://bwh81.net/aff.php?aff=74559&pid=108" target="_blank" class="pricing-button">立即购买</a>
                </div>

                <!-- 进阶款-东京 -->
                <div class="pricing-card featured">
                    <div class="pricing-badge">站长推荐</div>
                    <h3 class="pricing-name">进阶款-东京</h3>
                    <div class="pricing-price">$155.99</div>
                    <div class="pricing-period">每月</div>
                    <ul class="pricing-features">
                        <li>CPU: 4核</li>
                        <li>内存: 4 GB</li>
                        <li>硬盘: 80GB 固态硬盘</li>
                        <li>带宽: 1.2 Gbps</li>
                        <li>流量: 1000 GB/月</li>
                        <li>机房: 东京（日本）</li>
                        <li>网络: CN2 GIA（企业级）</li>
                    </ul>
                    <a href="https://bwh81.net/aff.php?aff=74559&pid=109" target="_blank" class="pricing-button">立即购买</a>
                </div>

                <!-- 高端款-东京 -->
                <div class="pricing-card">
                    <h3 class="pricing-name">高端款-东京</h3>
                    <div class="pricing-price">$299.99</div>
                    <div class="pricing-period">每月</div>
                    <ul class="pricing-features">
                        <li>CPU: 6核</li>
                        <li>内存: 8 GB</li>
                        <li>硬盘: 160GB 固态硬盘</li>
                        <li>带宽: 1.2 Gbps</li>
                        <li>流量: 2000 GB/月</li>
                        <li>机房: 东京（日本）</li>
                        <li>网络: CN2 GIA（企业级）</li>
                    </ul>
                    <a href="https://bwh81.net/aff.php?aff=74559&pid=110" target="_blank" class="pricing-button">立即购买</a>
                </div>
            </div>
        </div>
    </section>

    <!-- Why Choose Section -->
    <section class="why-choose">
        <div class="why-choose-container">
            <h2 class="why-choose-title">搬瓦工VPS优势</h2>
            <div class="why-choose-grid">
                <div class="why-card">
                    <div class="why-icon">🌍</div>
                    <div class="why-content">
                        <h3>全球数据中心</h3>
                        <p>在美国、香港、日本等地拥有多个数据中心，可根据需求自由切换机房</p>
                    </div>
                </div>
                <div class="why-card">
                    <div class="why-icon">🚀</div>
                    <div class="why-content">
                        <h3>CN2 GIA线路</h3>
                        <p>采用中国电信CN2 GIA高速线路，三网直连，延迟低速度快</p>
                    </div>
                </div>
                <div class="why-card">
                    <div class="why-icon">💰</div>
                    <div class="why-content">
                        <h3>支付方便</h3>
                        <p>支持支付宝、微信、PayPal等多种支付方式，购买简单快捷</p>
                    </div>
                </div>
                <div class="why-card">
                    <div class="why-icon">🔧</div>
                    <div class="why-content">
                        <h3>技术支持</h3>
                        <p>专业技术团队7x24小时在线支持，快速响应解决问题</p>
                    </div>
                </div>
                <div class="why-card">
                    <div class="why-icon">📈</div>
                    <div class="why-content">
                        <h3>弹性升级</h3>
                        <p>随时升级配置，按需扩容，满足业务增长需求</p>
                    </div>
                </div>
                <div class="why-card">
                    <div class="why-icon">🛡️</div>
                    <div class="why-content">
                        <h3>安全保障</h3>
                        <p>DDoS防护，定期安全审查，保障服务器和数据安全</p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
        <div class="footer-container">
            <div class="footer-links">
                <a href="/">首页</a>
                <a href="#pricing">价格方案</a>
                <a href="#features">产品特性</a>
                <a href="/about">关于我们</a>
                <a href="/contact">联系我们</a>
                <a href="/terms">服务条款</a>
                <a href="/privacy">隐私政策</a>
                <a href="/sitemap">网站地图</a>
            </div>
            <div class="footer-copyright">
                <p>Copyright © 2024 搬瓦工 All rights reserved.</p>
                <p><a href="https://beian.miit.gov.cn/" target="_blank" style="color: #95a5a6; text-decoration: none;">沪ICP备2022016551号</a></p>
                <p>本站为搬瓦工VPS推荐网站，提供最新优惠信息和购买指导</p>
            </div>
        </div>
    </footer>
</body>
</html>`

  return c.html(html)
}

// Legacy route handler
bwg87Routes.get('/', (c) => {
  const site = getCurrentSite(c)
  if (site && site.id === 'site-002') {
    return renderBwg87Homepage(c, site)
  }
})

export default bwg87Routes