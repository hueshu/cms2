// 侧边栏小工具组件系统 - 提供模块化的侧边栏组件
import { TemplateEngine, TemplateContext } from '../services/templateEngine'
import { Site, Article } from '../../../cf-cms-worker/src/models/types'

// 小工具配置接口
export interface WidgetConfig {
  id: string
  title: string
  enabled: boolean
  order: number
  settings: Record<string, any>
  template?: string
  cacheKey?: string
  cacheDuration?: number // 缓存时间（分钟）
}

// 小工具数据接口
export interface WidgetData {
  [key: string]: any
}

// 小工具渲染结果
export interface WidgetRenderResult {
  html: string
  cached: boolean
  renderTime: number
  errors: string[]
}

// 缓存条目
interface CacheEntry {
  data: any
  timestamp: number
  duration: number
}

// 抽象小工具基类
export abstract class BaseWidget {
  protected config: WidgetConfig
  protected templateEngine: TemplateEngine
  private cache = new Map<string, CacheEntry>()

  constructor(config: WidgetConfig, templateEngine: TemplateEngine) {
    this.config = config
    this.templateEngine = templateEngine
  }

  // 抽象方法：获取小工具数据
  protected abstract fetchData(context: TemplateContext): Promise<WidgetData>

  // 渲染小工具
  async render(context: TemplateContext): Promise<WidgetRenderResult> {
    const startTime = Date.now()
    const errors: string[] = []

    try {
      // 检查是否启用
      if (!this.config.enabled) {
        return {
          html: '',
          cached: false,
          renderTime: Date.now() - startTime,
          errors: []
        }
      }

      // 获取数据（优先从缓存）
      let data: WidgetData
      let cached = false

      if (this.config.cacheKey && this.config.cacheDuration) {
        const cachedData = this.getFromCache(this.config.cacheKey)
        if (cachedData) {
          data = cachedData
          cached = true
        } else {
          data = await this.fetchData(context)
          this.setCache(this.config.cacheKey, data, this.config.cacheDuration)
        }
      } else {
        data = await this.fetchData(context)
      }

      // 构建模板上下文
      const widgetContext = {
        ...context,
        widget: {
          id: this.config.id,
          title: this.config.title,
          settings: this.config.settings,
          data
        }
      }

      // 渲染模板
      const template = this.getTemplate()
      const result = await this.templateEngine.render(template, widgetContext)

      return {
        html: result.html,
        cached,
        renderTime: Date.now() - startTime,
        errors: result.metadata.errors
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error')
      return {
        html: `<!-- Widget ${this.config.id} render error: ${errors.join(', ')} -->`,
        cached: false,
        renderTime: Date.now() - startTime,
        errors
      }
    }
  }

  // 获取模板内容
  protected getTemplate(): string {
    return this.config.template || this.getDefaultTemplate()
  }

  // 抽象方法：获取默认模板
  protected abstract getDefaultTemplate(): string

  // 缓存操作
  private getFromCache(key: string): any {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > entry.duration * 60 * 1000) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  private setCache(key: string, data: any, duration: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      duration
    })
  }

  // 清除缓存
  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key)
    } else {
      this.cache.clear()
    }
  }

  // 更新配置
  updateConfig(newConfig: Partial<WidgetConfig>): void {
    this.config = { ...this.config, ...newConfig }
    if (newConfig.cacheKey !== this.config.cacheKey) {
      this.clearCache()
    }
  }
}

// 最新文章列表小工具
export class RecentArticlesWidget extends BaseWidget {
  protected async fetchData(context: TemplateContext): Promise<WidgetData> {
    const { site } = context as { site: Site }
    const limit = this.config.settings.limit || 5
    const showThumbnail = this.config.settings.showThumbnail !== false
    const showDate = this.config.settings.showDate !== false
    const showViews = this.config.settings.showViews !== false

    // 这里应该从数据库或API获取最新文章
    // 现在先返回模拟数据结构
    const articles = await this.getRecentArticles(limit)

    return {
      articles: articles.map(article => ({
        ...article,
        url: `/articles/${article.slug}`,
        formattedDate: this.formatDate(article.published_at || article.created_at),
        thumbnail: showThumbnail ? article.cover_image : null
      })),
      showThumbnail,
      showDate,
      showViews,
      totalCount: articles.length
    }
  }

  protected getDefaultTemplate(): string {
    return `
      <div class="sidebar-widget recent-articles-widget">
        <h3 class="widget-title">{{widget.title}}</h3>
        {{#if widget.data.articles}}
        <ul class="recent-articles-list">
          {{#each widget.data.articles}}
          <li class="recent-article-item">
            <article class="recent-article">
              {{#if ../widget.data.showThumbnail}}
              {{#if this.thumbnail}}
              <div class="article-thumbnail">
                <a href="{{this.url}}" aria-label="阅读: {{this.title}}">
                  <img src="{{this.thumbnail}}" alt="{{this.title}}" loading="lazy">
                </a>
              </div>
              {{/if}}
              {{/if}}

              <div class="article-content">
                <h4 class="article-title">
                  <a href="{{this.url}}">{{truncate this.title 40}}</a>
                </h4>

                <div class="article-meta">
                  {{#if ../widget.data.showDate}}
                  <time class="article-date" datetime="{{this.published_at}}">
                    {{this.formattedDate}}
                  </time>
                  {{/if}}

                  {{#if ../widget.data.showViews}}
                  {{#if this.view_count}}
                  <span class="article-views">{{this.view_count}} 阅读</span>
                  {{/if}}
                  {{/if}}
                </div>
              </div>
            </article>
          </li>
          {{/each}}
        </ul>

        {{#if widget.settings.showViewAll}}
        <div class="widget-footer">
          <a href="/articles" class="view-all-link">查看全部文章 →</a>
        </div>
        {{/if}}
        {{else}}
        <p class="widget-empty">暂无文章</p>
        {{/if}}
      </div>
    `
  }

  private async getRecentArticles(limit: number): Promise<Article[]> {
    // TODO: 从实际数据源获取文章
    // 这里返回模拟数据
    return []
  }

  private formatDate(date: string): string {
    if (!date) return ''
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return '今天'
    if (diffDays === 1) return '昨天'
    if (diffDays < 7) return `${diffDays}天前`

    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }
}

// 热门标签云小工具
export class TagCloudWidget extends BaseWidget {
  protected async fetchData(context: TemplateContext): Promise<WidgetData> {
    const maxTags = this.config.settings.maxTags || 20
    const minFontSize = this.config.settings.minFontSize || 0.8
    const maxFontSize = this.config.settings.maxFontSize || 1.5
    const colorScheme = this.config.settings.colorScheme || 'default'

    const tags = await this.getPopularTags(maxTags)

    // 计算标签权重
    const maxCount = Math.max(...tags.map(tag => tag.count))
    const minCount = Math.min(...tags.map(tag => tag.count))
    const countRange = maxCount - minCount || 1

    const processedTags = tags.map(tag => {
      const weight = (tag.count - minCount) / countRange
      const fontSize = minFontSize + (maxFontSize - minFontSize) * weight

      return {
        ...tag,
        url: `/tags/${tag.slug}`,
        fontSize: fontSize.toFixed(2),
        weight,
        colorClass: this.getColorClass(weight, colorScheme)
      }
    })

    return {
      tags: processedTags,
      totalTags: tags.length,
      colorScheme
    }
  }

  protected getDefaultTemplate(): string {
    return `
      <div class="sidebar-widget tag-cloud-widget">
        <h3 class="widget-title">{{widget.title}}</h3>
        {{#if widget.data.tags}}
        <div class="tag-cloud {{widget.data.colorScheme}}">
          {{#each widget.data.tags}}
          <a href="{{this.url}}"
             class="tag-link {{this.colorClass}}"
             style="font-size: {{this.fontSize}}em"
             title="{{this.count}} 篇文章"
             data-count="{{this.count}}">
            {{this.name}}
          </a>
          {{/each}}
        </div>

        {{#if widget.settings.showViewAll}}
        <div class="widget-footer">
          <a href="/tags" class="view-all-link">查看全部标签 →</a>
        </div>
        {{/if}}
        {{else}}
        <p class="widget-empty">暂无标签</p>
        {{/if}}
      </div>
    `
  }

  private async getPopularTags(limit: number): Promise<any[]> {
    // TODO: 从实际数据源获取标签
    return []
  }

  private getColorClass(weight: number, scheme: string): string {
    if (scheme === 'rainbow') {
      if (weight > 0.8) return 'tag-hot'
      if (weight > 0.6) return 'tag-warm'
      if (weight > 0.4) return 'tag-medium'
      if (weight > 0.2) return 'tag-cool'
      return 'tag-cold'
    }

    // 默认方案
    if (weight > 0.7) return 'tag-primary'
    if (weight > 0.4) return 'tag-secondary'
    return 'tag-tertiary'
  }
}

// 文章归档小工具
export class ArchiveWidget extends BaseWidget {
  protected async fetchData(context: TemplateContext): Promise<WidgetData> {
    const groupBy = this.config.settings.groupBy || 'month' // month, year
    const limit = this.config.settings.limit || 12
    const showCount = this.config.settings.showCount !== false

    const archives = await this.getArchives(groupBy, limit)

    return {
      archives: archives.map(archive => ({
        ...archive,
        url: this.generateArchiveUrl(archive, groupBy),
        displayName: this.formatArchiveName(archive, groupBy)
      })),
      groupBy,
      showCount,
      totalPeriods: archives.length
    }
  }

  protected getDefaultTemplate(): string {
    return `
      <div class="sidebar-widget archive-widget">
        <h3 class="widget-title">{{widget.title}}</h3>
        {{#if widget.data.archives}}
        <ul class="archive-list">
          {{#each widget.data.archives}}
          <li class="archive-item">
            <a href="{{this.url}}" class="archive-link">
              <span class="archive-period">{{this.displayName}}</span>
              {{#if ../widget.data.showCount}}
              <span class="archive-count">({{this.count}})</span>
              {{/if}}
            </a>
          </li>
          {{/each}}
        </ul>

        {{#if widget.settings.showViewAll}}
        <div class="widget-footer">
          <a href="/archives" class="view-all-link">查看全部归档 →</a>
        </div>
        {{/if}}
        {{else}}
        <p class="widget-empty">暂无归档</p>
        {{/if}}
      </div>
    `
  }

  private async getArchives(groupBy: string, limit: number): Promise<any[]> {
    // TODO: 从实际数据源获取归档数据
    return []
  }

  private generateArchiveUrl(archive: any, groupBy: string): string {
    if (groupBy === 'year') {
      return `/archives/${archive.year}`
    }
    return `/archives/${archive.year}/${archive.month.toString().padStart(2, '0')}`
  }

  private formatArchiveName(archive: any, groupBy: string): string {
    if (groupBy === 'year') {
      return `${archive.year}年`
    }
    return `${archive.year}年${archive.month}月`
  }
}

// 搜索框小工具
export class SearchWidget extends BaseWidget {
  protected async fetchData(context: TemplateContext): Promise<WidgetData> {
    const placeholder = this.config.settings.placeholder || '搜索文章...'
    const actionUrl = this.config.settings.actionUrl || '/search'
    const showSuggestions = this.config.settings.showSuggestions !== false
    const showHotKeywords = this.config.settings.showHotKeywords !== false

    let hotKeywords: string[] = []
    if (showHotKeywords) {
      hotKeywords = await this.getHotKeywords()
    }

    return {
      placeholder,
      actionUrl,
      showSuggestions,
      showHotKeywords,
      hotKeywords: hotKeywords.map(keyword => ({
        name: keyword,
        url: `/search?q=${encodeURIComponent(keyword)}`
      }))
    }
  }

  protected getDefaultTemplate(): string {
    return `
      <div class="sidebar-widget search-widget">
        <h3 class="widget-title">{{widget.title}}</h3>
        <form class="search-form" action="{{widget.data.actionUrl}}" method="get" role="search">
          <div class="search-input-group">
            <input type="search"
                   name="q"
                   class="search-input"
                   placeholder="{{widget.data.placeholder}}"
                   aria-label="搜索内容"
                   autocomplete="off"
                   {{#if widget.data.showSuggestions}}data-suggestions="true"{{/if}}>
            <button type="submit" class="search-btn" aria-label="执行搜索">
              <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="M21 21l-4.35-4.35"></path>
              </svg>
            </button>
          </div>

          {{#if widget.data.showSuggestions}}
          <div class="search-suggestions" style="display: none;">
            <ul class="suggestions-list"></ul>
          </div>
          {{/if}}
        </form>

        {{#if widget.data.showHotKeywords}}
        {{#if widget.data.hotKeywords}}
        <div class="hot-keywords">
          <div class="hot-keywords-label">热门搜索：</div>
          <div class="hot-keywords-list">
            {{#each widget.data.hotKeywords}}
            <a href="{{this.url}}" class="hot-keyword">{{this.name}}</a>
            {{/each}}
          </div>
        </div>
        {{/if}}
        {{/if}}
      </div>
    `
  }

  private async getHotKeywords(): Promise<string[]> {
    // TODO: 从实际数据源获取热门关键词
    return []
  }
}

// 分类列表小工具
export class CategoryListWidget extends BaseWidget {
  protected async fetchData(context: TemplateContext): Promise<WidgetData> {
    const showHierarchy = this.config.settings.showHierarchy !== false
    const showCount = this.config.settings.showCount !== false
    const maxDepth = this.config.settings.maxDepth || 3
    const sortBy = this.config.settings.sortBy || 'count' // count, name, order

    const categories = await this.getCategories(showHierarchy, maxDepth, sortBy)

    return {
      categories: categories.map(category => this.processCategoryItem(category, showCount)),
      showHierarchy,
      showCount,
      totalCategories: this.countAllCategories(categories)
    }
  }

  protected getDefaultTemplate(): string {
    return `
      <div class="sidebar-widget category-list-widget">
        <h3 class="widget-title">{{widget.title}}</h3>
        {{#if widget.data.categories}}
        <ul class="category-list {{#if widget.data.showHierarchy}}hierarchical{{/if}}">
          {{#each widget.data.categories}}
          <li class="category-item" data-level="{{this.level}}">
            <a href="{{this.url}}" class="category-link">
              <span class="category-name">{{this.name}}</span>
              {{#if ../widget.data.showCount}}
              <span class="category-count">({{this.count}})</span>
              {{/if}}
            </a>

            {{#if this.children}}
            <ul class="subcategory-list">
              {{#each this.children}}
              <li class="subcategory-item">
                <a href="{{this.url}}" class="subcategory-link">
                  <span class="subcategory-name">{{this.name}}</span>
                  {{#if ../../widget.data.showCount}}
                  <span class="subcategory-count">({{this.count}})</span>
                  {{/if}}
                </a>
              </li>
              {{/each}}
            </ul>
            {{/if}}
          </li>
          {{/each}}
        </ul>

        {{#if widget.settings.showViewAll}}
        <div class="widget-footer">
          <a href="/categories" class="view-all-link">查看全部分类 →</a>
        </div>
        {{/if}}
        {{else}}
        <p class="widget-empty">暂无分类</p>
        {{/if}}
      </div>
    `
  }

  private async getCategories(showHierarchy: boolean, maxDepth: number, sortBy: string): Promise<any[]> {
    // TODO: 从实际数据源获取分类数据
    return []
  }

  private processCategoryItem(category: any, showCount: boolean): any {
    return {
      ...category,
      url: `/categories/${category.slug}`,
      children: category.children?.map((child: any) => this.processCategoryItem(child, showCount))
    }
  }

  private countAllCategories(categories: any[]): number {
    let count = categories.length
    for (const category of categories) {
      if (category.children) {
        count += this.countAllCategories(category.children)
      }
    }
    return count
  }
}

// 自定义HTML小工具
export class CustomHtmlWidget extends BaseWidget {
  protected async fetchData(context: TemplateContext): Promise<WidgetData> {
    const htmlContent = this.config.settings.htmlContent || ''
    const enableProcessing = this.config.settings.enableProcessing !== false

    return {
      htmlContent,
      enableProcessing,
      processedContent: enableProcessing ? await this.processHtmlContent(htmlContent, context) : htmlContent
    }
  }

  protected getDefaultTemplate(): string {
    return `
      <div class="sidebar-widget custom-html-widget">
        {{#if widget.title}}
        <h3 class="widget-title">{{widget.title}}</h3>
        {{/if}}
        <div class="custom-html-content">
          {{{widget.data.processedContent}}}
        </div>
      </div>
    `
  }

  private async processHtmlContent(content: string, context: TemplateContext): Promise<string> {
    // 处理模板变量
    try {
      const result = await this.templateEngine.render(content, context)
      return result.html
    } catch (error) {
      // 如果处理失败，返回原始内容
      return content
    }
  }
}

// 社交媒体链接小工具
export class SocialLinksWidget extends BaseWidget {
  protected async fetchData(context: TemplateContext): Promise<WidgetData> {
    const links = this.config.settings.links || []
    const style = this.config.settings.style || 'icon' // icon, text, both
    const target = this.config.settings.target || '_blank'
    const showLabels = this.config.settings.showLabels !== false

    const processedLinks = links.map((link: any) => ({
      ...link,
      iconClass: this.getPlatformIconClass(link.platform),
      ariaLabel: `访问我的${link.platform}主页`
    }))

    return {
      links: processedLinks,
      style,
      target,
      showLabels,
      hasLinks: processedLinks.length > 0
    }
  }

  protected getDefaultTemplate(): string {
    return `
      <div class="sidebar-widget social-links-widget">
        <h3 class="widget-title">{{widget.title}}</h3>
        {{#if widget.data.hasLinks}}
        <div class="social-links {{widget.data.style}}">
          {{#each widget.data.links}}
          <a href="{{this.url}}"
             target="{{../widget.data.target}}"
             rel="noopener noreferrer"
             class="social-link {{this.platform}}"
             aria-label="{{this.ariaLabel}}"
             title="{{this.name}}">

            {{#if this.iconClass}}
            <i class="{{this.iconClass}}" aria-hidden="true"></i>
            {{/if}}

            {{#if ../widget.data.showLabels}}
            <span class="social-label">{{this.name}}</span>
            {{/if}}
          </a>
          {{/each}}
        </div>
        {{else}}
        <p class="widget-empty">暂无社交链接</p>
        {{/if}}
      </div>
    `
  }

  private getPlatformIconClass(platform: string): string {
    const iconMap: Record<string, string> = {
      weibo: 'fab fa-weibo',
      wechat: 'fab fa-weixin',
      qq: 'fab fa-qq',
      github: 'fab fa-github',
      twitter: 'fab fa-twitter',
      facebook: 'fab fa-facebook',
      instagram: 'fab fa-instagram',
      linkedin: 'fab fa-linkedin',
      youtube: 'fab fa-youtube',
      bilibili: 'fab fa-bilibili',
      zhihu: 'fab fa-zhihu',
      douyin: 'fab fa-tiktok',
      email: 'fas fa-envelope',
      rss: 'fas fa-rss'
    }

    return iconMap[platform.toLowerCase()] || 'fas fa-link'
  }
}

// 侧边栏小工具管理器
export class SidebarWidgetManager {
  private widgets = new Map<string, BaseWidget>()
  private templateEngine: TemplateEngine
  private globalConfig: Record<string, any> = {}

  constructor(templateEngine: TemplateEngine) {
    this.templateEngine = templateEngine
  }

  // 注册小工具
  registerWidget(widget: BaseWidget): void {
    this.widgets.set(widget['config'].id, widget)
  }

  // 创建并注册内置小工具
  setupBuiltinWidgets(configs: WidgetConfig[]): void {
    for (const config of configs) {
      let widget: BaseWidget

      switch (config.id) {
        case 'recent-articles':
          widget = new RecentArticlesWidget(config, this.templateEngine)
          break
        case 'tag-cloud':
          widget = new TagCloudWidget(config, this.templateEngine)
          break
        case 'archive':
          widget = new ArchiveWidget(config, this.templateEngine)
          break
        case 'search':
          widget = new SearchWidget(config, this.templateEngine)
          break
        case 'category-list':
          widget = new CategoryListWidget(config, this.templateEngine)
          break
        case 'custom-html':
          widget = new CustomHtmlWidget(config, this.templateEngine)
          break
        case 'social-links':
          widget = new SocialLinksWidget(config, this.templateEngine)
          break
        default:
          console.warn(`Unknown widget type: ${config.id}`)
          continue
      }

      this.registerWidget(widget)
    }
  }

  // 渲染所有启用的小工具
  async renderAllWidgets(context: TemplateContext): Promise<string> {
    const enabledWidgets = Array.from(this.widgets.values())
      .filter(widget => widget['config'].enabled)
      .sort((a, b) => (a['config'].order || 0) - (b['config'].order || 0))

    const results: string[] = []

    for (const widget of enabledWidgets) {
      try {
        const result = await widget.render(context)
        if (result.html.trim()) {
          results.push(result.html)
        }
      } catch (error) {
        console.error(`Widget render error: ${widget['config'].id}`, error)
      }
    }

    return results.join('\n')
  }

  // 渲染特定小工具
  async renderWidget(widgetId: string, context: TemplateContext): Promise<WidgetRenderResult | null> {
    const widget = this.widgets.get(widgetId)
    if (!widget) return null

    return await widget.render(context)
  }

  // 获取小工具列表
  getWidgets(): BaseWidget[] {
    return Array.from(this.widgets.values())
  }

  // 获取特定小工具
  getWidget(widgetId: string): BaseWidget | undefined {
    return this.widgets.get(widgetId)
  }

  // 更新小工具配置
  updateWidgetConfig(widgetId: string, config: Partial<WidgetConfig>): boolean {
    const widget = this.widgets.get(widgetId)
    if (!widget) return false

    widget.updateConfig(config)
    return true
  }

  // 移除小工具
  removeWidget(widgetId: string): boolean {
    return this.widgets.delete(widgetId)
  }

  // 清除所有小工具缓存
  clearAllCaches(): void {
    for (const widget of this.widgets.values()) {
      widget.clearCache()
    }
  }

  // 设置全局配置
  setGlobalConfig(config: Record<string, any>): void {
    this.globalConfig = { ...this.globalConfig, ...config }
  }

  // 获取小工具统计信息
  getStats(): {
    totalWidgets: number
    enabledWidgets: number
    disabledWidgets: number
    widgetTypes: Record<string, number>
  } {
    const widgets = Array.from(this.widgets.values())
    const enabled = widgets.filter(w => w['config'].enabled)
    const disabled = widgets.filter(w => !w['config'].enabled)

    const types: Record<string, number> = {}
    for (const widget of widgets) {
      const type = widget.constructor.name
      types[type] = (types[type] || 0) + 1
    }

    return {
      totalWidgets: widgets.length,
      enabledWidgets: enabled.length,
      disabledWidgets: disabled.length,
      widgetTypes: types
    }
  }
}

// 导出默认小工具配置
export const defaultWidgetConfigs: WidgetConfig[] = [
  {
    id: 'recent-articles',
    title: '最新文章',
    enabled: true,
    order: 1,
    settings: {
      limit: 5,
      showThumbnail: true,
      showDate: true,
      showViews: true,
      showViewAll: true
    },
    cacheKey: 'recent-articles',
    cacheDuration: 5
  },
  {
    id: 'tag-cloud',
    title: '标签云',
    enabled: true,
    order: 2,
    settings: {
      maxTags: 20,
      minFontSize: 0.8,
      maxFontSize: 1.5,
      colorScheme: 'default',
      showViewAll: true
    },
    cacheKey: 'tag-cloud',
    cacheDuration: 15
  },
  {
    id: 'category-list',
    title: '分类目录',
    enabled: true,
    order: 3,
    settings: {
      showHierarchy: true,
      showCount: true,
      maxDepth: 3,
      sortBy: 'count',
      showViewAll: true
    },
    cacheKey: 'category-list',
    cacheDuration: 10
  },
  {
    id: 'archive',
    title: '文章归档',
    enabled: true,
    order: 4,
    settings: {
      groupBy: 'month',
      limit: 12,
      showCount: true,
      showViewAll: true
    },
    cacheKey: 'archive',
    cacheDuration: 30
  },
  {
    id: 'search',
    title: '搜索',
    enabled: true,
    order: 0,
    settings: {
      placeholder: '搜索文章...',
      actionUrl: '/search',
      showSuggestions: true,
      showHotKeywords: true
    }
  }
]