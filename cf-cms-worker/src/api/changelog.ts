import { getICPInfo } from '../config/icp'
import { CHANGELOG_ENTRIES } from './changelog-data'

/**
 * 更新日志页面主题(按站点配色)
 */
export interface ChangelogTheme {
  /** 品牌显示名(可含 emoji),用于顶栏 */
  brand: string
  /** 主色 */
  primary: string
  /** 副色(渐变终点) */
  secondary: string
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** 以数字加点开头的是普通更新条目,其余(如"新增XX功能：")作为小标题引导行 */
const renderLine = (line: string) =>
  /^\d+[.．、]/.test(line)
    ? `<li class="cl-item">${esc(line)}</li>`
    : `<li class="cl-lead">${esc(line)}</li>`

const renderEntry = (e: { version: string; date: string; lines: string[] }) => `
        <article class="cl-ver">
            <div class="cl-ver-head">
                <span class="cl-badge">v${esc(e.version)}</span>
                <time class="cl-date">${esc(e.date)}</time>
            </div>
            <ul class="cl-lines">${e.lines.map(renderLine).join('')}</ul>
        </article>`

/**
 * 渲染软件更新日志页(犀牛剪辑 / ALLCUT 共用,配色由 theme 决定)
 */
export function renderChangelogPage(c: any, site: any, theme: ChangelogTheme) {
  const host = c.req.header('x-forwarded-host') || c.req.header('host') || ''
  const domain = host.split(':')[0]
  const icpInfo = getICPInfo(domain)

  const total = CHANGELOG_ENTRIES.length
  const latest = CHANGELOG_ENTRIES[0]
  const name = site?.name || theme.brand

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>软件更新日志 - ${esc(name)}</title>
    <meta name="description" content="${esc(name)}软件更新日志,记录每个版本的新增功能与优化,共 ${total} 个版本,最新版本 v${esc(latest.version)}。">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
            background: #f6f7fb;
            color: #1a202c;
            line-height: 1.6;
        }
        a { color: inherit; }
        .cl-top {
            position: sticky; top: 0; z-index: 100;
            background: linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%);
            color: #fff;
            box-shadow: 0 2px 12px rgba(0,0,0,0.12);
        }
        .cl-top-in {
            max-width: 900px; margin: 0 auto; padding: 0 20px;
            height: 60px; display: flex; align-items: center; justify-content: space-between;
        }
        .cl-brand { font-size: 1.25rem; font-weight: 700; text-decoration: none; color: #fff; }
        .cl-back {
            background: rgba(255,255,255,0.18); color: #fff; text-decoration: none;
            padding: 8px 16px; border-radius: 20px; font-size: 0.9rem; transition: background .3s;
        }
        .cl-back:hover { background: rgba(255,255,255,0.3); }
        .cl-hero {
            max-width: 900px; margin: 0 auto; padding: 48px 20px 8px; text-align: center;
        }
        .cl-hero h1 { font-size: 2.2rem; margin-bottom: 12px; }
        .cl-sub { color: #64748b; font-size: 1rem; }
        .cl-sub b { color: ${theme.primary}; }
        .cl-list {
            max-width: 900px; margin: 0 auto; padding: 24px 20px 80px;
            position: relative;
        }
        /* 时间线竖线 */
        .cl-list::before {
            content: ''; position: absolute; left: 32px; top: 24px; bottom: 80px;
            width: 2px; background: linear-gradient(${theme.primary}, ${theme.secondary}); opacity: .25;
        }
        .cl-ver {
            position: relative; margin-left: 56px; margin-bottom: 22px;
            background: #fff; border-radius: 14px; padding: 20px 24px;
            box-shadow: 0 4px 18px rgba(0,0,0,0.06);
        }
        /* 时间线圆点 */
        .cl-ver::before {
            content: ''; position: absolute; left: -32px; top: 26px;
            width: 12px; height: 12px; border-radius: 50%;
            background: ${theme.primary}; border: 3px solid #fff;
            box-shadow: 0 0 0 2px ${theme.primary};
        }
        .cl-ver-head { display: flex; align-items: center; gap: 14px; margin-bottom: 12px; flex-wrap: wrap; }
        .cl-badge {
            background: linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%);
            color: #fff; font-weight: 700; font-size: 0.95rem;
            padding: 4px 14px; border-radius: 20px;
        }
        .cl-date { color: #94a3b8; font-size: 0.88rem; }
        .cl-lines { list-style: none; }
        .cl-item, .cl-lead { position: relative; padding: 3px 0 3px 4px; color: #334155; font-size: 0.96rem; }
        .cl-lead { font-weight: 600; color: ${theme.primary}; margin-top: 4px; }
        .cl-foot {
            text-align: center; padding: 30px 20px 50px; color: #94a3b8; font-size: 0.85rem;
            border-top: 1px solid #e5e7eb; background: #fff;
        }
        .cl-foot a { color: #94a3b8; text-decoration: none; }
        .cl-foot a:hover { text-decoration: underline; }
        @media (max-width: 600px) {
            .cl-hero h1 { font-size: 1.7rem; }
            .cl-list::before { left: 20px; }
            .cl-ver { margin-left: 40px; padding: 16px 18px; }
            .cl-ver::before { left: -26px; }
        }
    </style>
</head>
<body>
    <header class="cl-top">
        <div class="cl-top-in">
            <a href="/" class="cl-brand">${theme.brand}</a>
            <a href="/" class="cl-back">← 返回首页</a>
        </div>
    </header>

    <section class="cl-hero">
        <h1>软件更新日志</h1>
        <p class="cl-sub">持续迭代升级 · 共 ${total} 个版本 · 最新 <b>v${esc(latest.version)}</b>(${esc(latest.date)})</p>
    </section>

    <main class="cl-list">
${CHANGELOG_ENTRIES.map(renderEntry).join('\n')}
    </main>

    <footer class="cl-foot">
        <p>© 2025 ${esc(name)}. All rights reserved.</p>
        ${icpInfo ? `<p>${esc(icpInfo.company)} · <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener">${esc(icpInfo.icp)}</a></p>` : ''}
    </footer>
</body>
</html>`

  return c.html(html)
}
