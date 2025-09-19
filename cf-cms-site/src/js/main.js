// Main JavaScript for Multi-Site CMS

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787'

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    console.log('Multi-Site CMS initialized')
    loadContent()
})

// Load content based on current path
async function loadContent() {
    const path = window.location.pathname
    const contentEl = document.getElementById('content')

    try {
        if (path === '/' || path === '/index.html') {
            contentEl.innerHTML = await loadHomePage()
        } else if (path.startsWith('/articles')) {
            contentEl.innerHTML = await loadArticles()
        } else if (path.startsWith('/tags')) {
            contentEl.innerHTML = await loadTags()
        }
    } catch (error) {
        console.error('Failed to load content:', error)
        contentEl.innerHTML = '<p>加载内容失败，请稍后重试。</p>'
    }
}

// Load home page content
async function loadHomePage() {
    return `
        <div class="home-content">
            <h3>功能特性</h3>
            <ul>
                <li>🌐 多站点管理</li>
                <li>📝 Markdown内容编辑</li>
                <li>🔍 SEO优化</li>
                <li>⚡ 边缘计算加速</li>
                <li>🎨 自定义模板</li>
            </ul>
        </div>
    `
}

// Load articles list
async function loadArticles() {
    return `
        <div class="articles">
            <h2>文章列表</h2>
            <p>文章功能开发中...</p>
        </div>
    `
}

// Load tags
async function loadTags() {
    return `
        <div class="tags">
            <h2>标签云</h2>
            <p>标签功能开发中...</p>
        </div>
    `
}

export { API_BASE, loadContent }