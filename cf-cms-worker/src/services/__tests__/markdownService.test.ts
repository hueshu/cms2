/**
 * Markdown处理服务测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { MarkdownService, markdownService, type MarkdownOptions } from '../markdownService'

describe('MarkdownService', () => {
  let service: MarkdownService

  beforeEach(() => {
    service = new MarkdownService()
  })

  describe('基础Markdown渲染', () => {
    it('应该渲染简单的Markdown文本', async () => {
      const markdown = '# 标题\n\n这是一段文字。'
      const result = await service.render(markdown)

      expect(result.html).toContain('<h1')
      expect(result.html).toContain('标题')
      expect(result.html).toContain('<p>')
      expect(result.html).toContain('这是一段文字')
      expect(result.wordCount).toBeGreaterThan(0)
      expect(result.readingTime).toBeGreaterThan(0)
    })

    it('应该处理多级标题', async () => {
      const markdown = `# 一级标题
## 二级标题
### 三级标题`

      const result = await service.render(markdown)

      expect(result.html).toContain('<h1')
      expect(result.html).toContain('<h2')
      expect(result.html).toContain('<h3')
    })

    it('应该处理列表', async () => {
      const markdown = `
- 列表项1
- 列表项2
  - 嵌套项

1. 有序列表1
2. 有序列表2`

      const result = await service.render(markdown)

      expect(result.html).toContain('<ul>')
      expect(result.html).toContain('<ol>')
      expect(result.html).toContain('<li>')
    })

    it('应该处理链接和图片', async () => {
      const markdown = `
[链接文本](https://example.com)
![图片描述](https://example.com/image.jpg)`

      const result = await service.render(markdown)

      expect(result.html).toContain('<a href="https://example.com"')
      expect(result.html).toContain('target="_blank"')
      expect(result.html).toContain('rel="noopener noreferrer"')
      expect(result.html).toContain('<figure class="image-figure">')
      expect(result.html).toContain('<img src="https://example.com/image.jpg"')
    })

    it('应该处理表格', async () => {
      const markdown = `
| 列1 | 列2 |
|-----|-----|
| 行1 | 数据1 |
| 行2 | 数据2 |`

      const result = await service.render(markdown)

      expect(result.html).toContain('<div class="table-wrapper">')
      expect(result.html).toContain('<table class="markdown-table">')
      expect(result.html).toContain('<thead>')
      expect(result.html).toContain('<tbody>')
    })

    it('应该处理引用块', async () => {
      const markdown = '> 这是一个引用块\n> 包含多行内容'
      const result = await service.render(markdown)

      expect(result.html).toContain('<blockquote class="markdown-blockquote">')
    })
  })

  describe('代码高亮功能', () => {
    it('应该高亮代码块', async () => {
      const markdown = '```javascript\nconst hello = "world";\nconsole.log(hello);\n```'
      const result = await service.render(markdown, { enableHighlight: true })

      expect(result.html).toContain('<div class="code-block">')
      expect(result.html).toContain('<div class="code-header">')
      expect(result.html).toContain('<span class="language">javascript</span>')
      expect(result.html).toContain('<button class="copy-btn"')
      expect(result.html).toContain('class="hljs language-javascript"')
    })

    it('应该处理无语言标记的代码块', async () => {
      const markdown = '```\nconst hello = "world";\n```'
      const result = await service.render(markdown)

      expect(result.html).toContain('<div class="code-block">')
      expect(result.html).toContain('<span class="language">text</span>')
    })

    it('应该处理行内代码', async () => {
      const markdown = '这里有一段 `inline code` 代码。'
      const result = await service.render(markdown)

      expect(result.html).toContain('<code>')
      expect(result.html).toContain('inline code')
    })
  })

  describe('目录生成功能', () => {
    it('应该生成基础目录', async () => {
      const markdown = `# 一级标题
## 二级标题1
### 三级标题1
## 二级标题2
### 三级标题2`

      const result = await service.render(markdown, { enableToc: true })

      expect(result.toc).toBeDefined()
      expect(result.toc).toHaveLength(1) // 一个一级标题
      expect(result.toc![0].text).toBe('一级标题')
      expect(result.toc![0].level).toBe(1)
      expect(result.toc![0].children).toHaveLength(2) // 两个二级标题
    })

    it('应该限制目录深度', async () => {
      const markdown = `# 一级
## 二级
### 三级
#### 四级
##### 五级
###### 六级`

      const result = await service.render(markdown, {
        enableToc: true,
        tocMaxDepth: 2
      })

      expect(result.toc).toBeDefined()
      // 应该只包含一级和二级标题
      const allItems = flattenToc(result.toc!)
      const maxLevel = Math.max(...allItems.map(item => item.level))
      expect(maxLevel).toBeLessThanOrEqual(2)
    })

    it('应该为标题生成正确的ID', async () => {
      const markdown = `# 中文标题
## English Title
### 123 数字标题`

      const result = await service.render(markdown)

      expect(result.html).toContain('id="中文标题"')
      expect(result.html).toContain('id="english-title"')
      expect(result.html).toContain('id="123-数字标题"')
    })

    function flattenToc(toc: any[]): any[] {
      let result: any[] = []
      for (const item of toc) {
        result.push(item)
        if (item.children) {
          result = result.concat(flattenToc(item.children))
        }
      }
      return result
    }
  })

  describe('摘要生成功能', () => {
    it('应该生成指定长度的摘要', async () => {
      const markdown = `
# 标题

这是一段很长的文字内容。重复很多次来测试摘要功能。这是一段很长的文字内容。重复很多次来测试摘要功能。这是一段很长的文字内容。重复很多次来测试摘要功能。这是一段很长的文字内容。重复很多次来测试摘要功能。

## 副标题

更多内容在这里。更多内容在这里。更多内容在这里。`

      const result = await service.render(markdown, {
        enableSummary: true,
        summaryLength: 50
      })

      expect(result.summary).toBeDefined()
      expect(result.summary!.length).toBeLessThanOrEqual(53) // 包含...
    })

    it('应该去除Markdown标记', async () => {
      const markdown = `
# 标题

这是 **粗体** 和 *斜体* 文字。还有 [链接](http://example.com) 和 ![图片](img.jpg)。

\`\`\`javascript
const code = "block";
\`\`\`

- 列表项
- 另一项`

      const result = await service.render(markdown, { enableSummary: true })

      expect(result.summary).toBeDefined()
      expect(result.summary).not.toContain('#')
      expect(result.summary).not.toContain('**')
      expect(result.summary).not.toContain('*')
      expect(result.summary).not.toContain('[')
      expect(result.summary).not.toContain('```')
      expect(result.summary).not.toContain('-')
    })

    it('应该在句子边界截断', async () => {
      const markdown = '第一句话。第二句话！第三句话？第四句话。第五句话。'

      const result = await service.render(markdown, {
        enableSummary: true,
        summaryLength: 15
      })

      expect(result.summary).toBeDefined()
      // 应该在句号处截断
      expect(result.summary).toMatch(/[。！？]$/)
    })
  })

  describe('图片优化功能', () => {
    it('应该优化相对路径图片', async () => {
      const markdown = '![图片](./images/test.jpg)'
      const cdnUrl = 'https://cdn.example.com'

      const result = await service.render(markdown, {
        enableImageOptimization: true,
        imageCdnUrl: cdnUrl,
        imageQuality: 80
      })

      expect(result.html).toContain(cdnUrl)
      expect(result.html).toContain('q=80')
      expect(result.html).toContain('f=webp')
      expect(result.html).toContain('fit=scale-down')
      expect(result.html).toContain('w=1200')
    })

    it('应该保持外部图片不变', async () => {
      const markdown = '![图片](https://external.com/image.jpg)'
      const cdnUrl = 'https://cdn.example.com'

      const result = await service.render(markdown, {
        enableImageOptimization: true,
        imageCdnUrl: cdnUrl
      })

      expect(result.html).toContain('https://external.com/image.jpg')
      expect(result.html).not.toContain(cdnUrl)
    })
  })

  describe('自定义语法功能', () => {
    it('应该处理提示框语法', async () => {
      const markdown = `
:::tip
这是一个提示框
:::

:::warning
这是一个警告框
:::

:::error
这是一个错误框
:::`

      const result = await service.render(markdown)

      expect(result.html).toContain('<div class="callout callout-tip">')
      expect(result.html).toContain('<div class="callout-title">💡 提示</div>')
      expect(result.html).toContain('<div class="callout callout-warning">')
      expect(result.html).toContain('<div class="callout-title">⚠️ 警告</div>')
      expect(result.html).toContain('<div class="callout callout-error">')
      expect(result.html).toContain('<div class="callout-title">❌ 错误</div>')
    })

    it('应该处理数学公式', async () => {
      const markdown = `
这是行内公式：$E = mc^2$

这是块级公式：
$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$`

      const result = await service.render(markdown)

      expect(result.html).toContain('<span class="math-inline">E = mc^2</span>')
      expect(result.html).toContain('<div class="math-block">')
    })
  })

  describe('HTML安全性', () => {
    it('应该移除危险的script标签', async () => {
      const markdown = `
# 标题

<script>alert('xss')</script>

正常内容`

      const result = await service.render(markdown, { sanitizeHtml: true })

      expect(result.html).not.toContain('<script>')
      expect(result.html).not.toContain('alert')
      expect(result.html).toContain('正常内容')
    })

    it('应该移除危险的事件处理器', async () => {
      const markdown = `<img src="x" onerror="alert('xss')" />`

      const result = await service.render(markdown, { sanitizeHtml: true })

      expect(result.html).not.toContain('onerror')
      expect(result.html).not.toContain('alert')
    })

    it('应该移除javascript: URL', async () => {
      const markdown = `[危险链接](javascript:alert('xss'))`

      const result = await service.render(markdown, { sanitizeHtml: true })

      expect(result.html).not.toContain('javascript:')
      // alert可能仍然存在，但不应该在javascript URL中
      expect(result.html).toContain('href="#"')
    })

    it('应该保留安全的HTML标签', async () => {
      const markdown = `
# 标题

**粗体** *斜体*

[链接](https://example.com)

![图片](https://example.com/img.jpg)`

      const result = await service.render(markdown, { sanitizeHtml: true })

      expect(result.html).toContain('<h1')
      expect(result.html).toContain('<strong>')
      expect(result.html).toContain('<em>')
      expect(result.html).toContain('<a href="https://example.com"')
      expect(result.html).toContain('<img src="https://example.com/img.jpg"')
    })
  })

  describe('统计功能', () => {
    it('应该正确计算字数', async () => {
      const markdown = `
# 标题

这是中文内容，包含 English words 和 123 数字。

More English content here.`

      const result = await service.render(markdown)

      expect(result.wordCount).toBeGreaterThan(0)
      // 中文按字计算，英文按词计算
      expect(result.wordCount).toBeGreaterThan(10)
    })

    it('应该计算阅读时间', async () => {
      const markdown = '这是一段很短的文字。'
      const result = await service.render(markdown)

      expect(result.readingTime).toBeGreaterThanOrEqual(1)
    })

    it('应该获取详细统计信息', async () => {
      const markdown = `
# 标题1
## 标题2

这是文字内容。

[链接](https://example.com)
![图片](image.jpg)

更多内容。`

      const stats = await service.getStatistics(markdown)

      expect(stats.wordCount).toBeGreaterThan(0)
      expect(stats.characterCount).toBeGreaterThan(0)
      expect(stats.readingTime).toBeGreaterThan(0)
      expect(stats.headingCount).toBe(2)
      expect(stats.imageCount).toBe(1)
      expect(stats.linkCount).toBe(1)
    })
  })

  describe('独立功能', () => {
    it('应该只渲染摘要', async () => {
      const markdown = '# 标题\n\n这是一段文字内容。'
      const summary = await service.renderSummary(markdown, 50)

      expect(summary).toContain('这是一段文字内容')
    })

    it('应该只渲染目录', async () => {
      const markdown = `# 一级标题
## 二级标题`

      const toc = await service.renderToc(markdown)

      expect(toc).toHaveLength(1)
      expect(toc[0].text).toBe('一级标题')
      expect(toc[0].children).toHaveLength(1)
    })
  })

  describe('错误处理', () => {
    it('应该处理空内容', async () => {
      const result = await service.render('')

      expect(result.html).toBe('')
      expect(result.wordCount).toBe(0)
      expect(result.readingTime).toBe(1) // 最少1分钟
    })

    it('应该处理无效的Markdown', async () => {
      // 测试不会崩溃的边界情况
      const markdown = '```\n未闭合的代码块'

      await expect(service.render(markdown)).resolves.toBeDefined()
    })
  })

  describe('配置选项', () => {
    it('应该支持禁用功能', async () => {
      const markdown = `# 标题

这是内容。

\`\`\`javascript
const code = true;
\`\`\``

      const options: MarkdownOptions = {
        enableHighlight: false,
        enableToc: false,
        enableSummary: false,
        sanitizeHtml: false
      }

      const result = await service.render(markdown, options)

      expect(result.toc).toBeUndefined()
      expect(result.summary).toBeUndefined()
      // 应该仍然有基础的HTML渲染
      expect(result.html).toContain('<h1')
      expect(result.html).toContain('<p>')
    })
  })
})

describe('markdownService 单例', () => {
  it('应该导出服务实例', () => {
    expect(markdownService).toBeInstanceOf(MarkdownService)
  })

  it('应该与新实例功能一致', async () => {
    const markdown = '# 测试标题'

    const result1 = await markdownService.render(markdown)
    const result2 = await new MarkdownService().render(markdown)

    expect(result1.html).toBe(result2.html)
    expect(result1.wordCount).toBe(result2.wordCount)
    expect(result1.readingTime).toBe(result2.readingTime)
  })
})