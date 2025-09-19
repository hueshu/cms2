# CF-CMS Pages - 模板引擎系统

CF-CMS Pages 是一个为 Cloudflare Workers 环境设计的高性能模板引擎系统，支持变量替换、条件渲染、循环、部分模板、模板继承和自定义辅助函数。

## 特性

### 核心功能
- 🔧 **变量替换**: `{{variable}}` - 支持嵌套对象属性访问
- 🔐 **HTML转义**: 自动转义HTML字符，防止XSS攻击
- 🎯 **原始输出**: `{{{variable}}}` - 输出原始HTML内容
- ✅ **条件渲染**: `{{#if condition}}...{{/if}}` - 支持复杂条件判断
- 🔄 **循环渲染**: `{{#each array}}...{{/each}}` - 支持数组和对象遍历
- 🧩 **部分模板**: `{{> partial}}` - 模块化模板组件
- 🏗️ **模板继承**: `{{extends "base"}}` - 基于布局的模板继承
- ⚡ **辅助函数**: `{{helper arg1 arg2}}` - 内置和自定义辅助函数

### 性能优化
- 📦 **智能缓存**: 模板解析结果缓存，提升渲染性能
- 🚀 **预编译**: 支持模板预编译，减少运行时开销
- 🔒 **安全沙箱**: 可选的安全沙箱模式，防止恶意代码执行
- 📊 **深度控制**: 防止无限递归，支持最大渲染深度设置

### 内置辅助函数
- 📅 `formatDate` - 日期格式化
- ✂️ `truncate` - 文本截取
- 🔤 `uppercase/lowercase/capitalize` - 文本大小写转换
- 🔗 `slugify` - 生成URL友好的slug
- 📝 `markdown` - Markdown渲染
- 📋 `json` - JSON序列化
- 📏 `length` - 获取长度
- 🔗 `join` - 数组连接
- 🎯 `default` - 默认值
- ❓ `if` - 条件辅助函数

### 页面级辅助函数
- 📄 `pageTitle` - 智能页面标题生成
- 📝 `pageDescription` - 页面描述
- 🔗 `canonicalUrl` - 规范URL
- 🧭 `breadcrumb` - 面包屑导航
- 📱 `navigation` - 导航菜单
- 📖 `pagination` - 分页组件
- ⏰ `timeAgo` - 相对时间
- 📰 `excerpt` - 文章摘要
- ⏱️ `readingTime` - 阅读时间估算
- 🏷️ `tagList` - 标签列表
- 📤 `socialShare` - 社交分享

## 安装

```bash
npm install cf-cms-pages
```

## 快速开始

### 基本使用

```typescript
import { TemplateEngine } from 'cf-cms-pages/engine'

const engine = new TemplateEngine()

// 简单变量替换
const result = await engine.render('Hello {{name}}!', { name: 'World' })
console.log(result.html) // "Hello World!"
```

### 使用模板服务

```typescript
import { TemplateService } from 'cf-cms-pages'

const service = new TemplateService()

// 注册模板
service.registerTemplate({
  name: 'article',
  type: 'page',
  path: '/templates/article.html',
  content: `
    <article>
      <h1>{{article.title}}</h1>
      <div class="meta">
        作者: {{article.author}} |
        发布时间: {{formatDate article.published_at "YYYY-MM-DD"}}
      </div>
      <div class="content">{{{article.content}}}</div>
    </article>
  `,
  lastModified: new Date().toISOString()
})

// 渲染页面
const pageContext = {
  site: { name: 'My Blog' },
  page: { title: 'Article Page', type: 'article' },
  article: {
    title: 'Hello World',
    author: 'John Doe',
    published_at: '2023-12-25T10:00:00Z',
    content: '<p>Article content</p>'
  },
  url: { current: 'https://example.com/article' }
}

const result = await service.renderPage('article', pageContext)
console.log(result.html)
```

## 模板语法

### 变量替换

```handlebars
<!-- 基本变量 -->
{{title}}

<!-- 嵌套对象 -->
{{user.name}}
{{site.config.theme}}

<!-- 原始HTML输出 -->
{{{htmlContent}}}
```

### 条件渲染

```handlebars
{{#if user.isAdmin}}
  <p>管理员界面</p>
{{/if}}

{{#if articles}}
  <h2>文章列表</h2>
{{/if}}
```

### 循环渲染

```handlebars
<!-- 简单数组 -->
{{#each tags}}
  <span class="tag">{{@item}}</span>
{{/each}}

<!-- 对象数组 -->
{{#each articles}}
  <article>
    <h3>{{@item.title}}</h3>
    <p>索引: {{@index}}</p>
    {{#if @first}}<span>第一篇</span>{{/if}}
    {{#if @last}}<span>最后一篇</span>{{/if}}
  </article>
{{/each}}
```

### 部分模板

```handlebars
<!-- 引入头部模板 -->
{{> header}}

<!-- 引入侧边栏 -->
{{> sidebar}}
```

### 辅助函数

```handlebars
<!-- 日期格式化 -->
{{formatDate article.publishedAt "YYYY年MM月DD日"}}

<!-- 文本截取 -->
{{truncate article.summary 150 "..."}}

<!-- 大小写转换 -->
{{uppercase title}}
{{capitalize author.name}}

<!-- 默认值 -->
{{default user.avatar "/images/default-avatar.png"}}

<!-- 条件输出 -->
{{if user.isVip "VIP用户" "普通用户"}}
```

## 高级用法

### 自定义辅助函数

```typescript
// 添加自定义辅助函数
engine.addHelper('currency', (context, amount, symbol = '¥') => {
  return `${symbol}${parseFloat(amount).toFixed(2)}`
})

// 在模板中使用
// {{currency price "$"}} → $29.99
```

### 异步辅助函数

```typescript
engine.addHelper('loadData', async (context, dataId) => {
  const data = await fetchData(dataId)
  return data.content
})
```

### 模板继承

```handlebars
<!-- base.html -->
<!DOCTYPE html>
<html>
<head>
  <title>{{pageTitle}}</title>
</head>
<body>
  {{content}}
</body>
</html>

<!-- page.html -->
{{extends "base"}}
<h1>{{title}}</h1>
<p>{{description}}</p>
```

### 缓存控制

```typescript
// 启用缓存
const engine = new TemplateEngine({
  enableCache: true,
  maxRenderDepth: 10
})

// 清除缓存
engine.clearCache()

// 预编译模板
const nodes = engine.compile(templateString)
```

## 默认模板

系统提供了一套完整的默认模板：

- `base.html` - 基础布局模板
- `index.html` - 首页模板
- `article.html` - 文章详情页模板
- `list.html` - 列表页模板
- `404.html` - 404错误页面
- `partials/sidebar.html` - 侧边栏组件
- `partials/footer-nav.html` - 底部导航组件

## 安全性

### HTML转义
所有变量输出默认进行HTML转义，防止XSS攻击：

```handlebars
{{userInput}} <!-- 自动转义 -->
{{{trustedHtml}}} <!-- 原始输出，需谨慎使用 -->
```

### 沙箱模式
启用沙箱模式以增强安全性：

```typescript
const engine = new TemplateEngine({
  enableSandbox: true,
  maxRenderDepth: 5
})
```

## 性能优化

### 缓存策略
- 模板解析结果缓存
- 部分模板缓存
- 智能缓存失效

### 最佳实践
1. 启用模板缓存
2. 预编译常用模板
3. 合理使用部分模板
4. 避免深层嵌套
5. 限制渲染深度

## 测试

```bash
# 运行所有测试
npm test

# 监视模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage

# 类型检查
npm run typecheck
```

## API 文档

### TemplateEngine

```typescript
class TemplateEngine {
  constructor(options?: TemplateEngineOptions)

  // 渲染模板
  render(template: string, context: TemplateContext): Promise<TemplateRenderResult>

  // 预编译模板
  compile(template: string): TemplateNode[]

  // 添加辅助函数
  addHelper(name: string, helper: TemplateHelper): void

  // 移除辅助函数
  removeHelper(name: string): void

  // 清除缓存
  clearCache(): void

  // 获取缓存统计
  getCacheStats(): { templateCacheSize: number, partialCacheSize: number }
}
```

### TemplateService

```typescript
class TemplateService {
  // 渲染页面
  renderPage(templateName: string, context: PageContext, options?: TemplateRenderOptions): Promise<TemplateRenderResult>

  // 注册模板
  registerTemplate(templateInfo: TemplateInfo, theme?: string): void

  // 注册主题
  registerTheme(theme: TemplateTheme): void

  // 添加辅助函数
  addHelper(name: string, helper: TemplateHelper): void

  // 设置默认主题
  setDefaultTheme(themeName: string): void

  // 获取主题列表
  getThemes(): TemplateTheme[]

  // 获取模板列表
  getTemplates(theme?: string): TemplateInfo[]

  // 预编译模板
  precompileTemplate(templateName: string, theme?: string): void

  // 清除缓存
  clearCache(theme?: string, template?: string): void
}
```

## 错误处理

系统提供完善的错误处理机制：

```typescript
const result = await engine.render(template, context)

// 检查渲染结果
if (result.metadata.errors.length > 0) {
  console.error('模板渲染错误:', result.metadata.errors)
}

if (result.metadata.warnings.length > 0) {
  console.warn('模板渲染警告:', result.metadata.warnings)
}
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request