// 模板服务测试
import { describe, it, expect, beforeEach } from 'vitest'
import { TemplateService, PageContext, TemplateInfo, TemplateTheme } from '../templateService'

describe('TemplateService', () => {
  let service: TemplateService
  let mockPageContext: PageContext

  beforeEach(() => {
    service = new TemplateService()

    // 创建模拟的页面上下文
    mockPageContext = {
      site: {
        id: 'test-site',
        domain: 'example.com',
        name: 'Test Site',
        description: 'A test website',
        status: 'active',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        config: {
          theme: 'default'
        }
      },
      page: {
        title: 'Test Page',
        description: 'Test page description',
        type: 'index'
      },
      url: {
        base: 'https://example.com',
        current: 'https://example.com/test',
        path: '/test',
        query: {}
      },
      request: {
        userAgent: 'test-agent',
        ip: '127.0.0.1'
      }
    }
  })

  describe('模板注册和管理', () => {
    it('应该能够注册新模板', () => {
      const templateInfo: TemplateInfo = {
        name: 'test-template',
        type: 'page',
        path: '/templates/test.html',
        content: '<h1>{{title}}</h1>',
        lastModified: '2023-01-01T00:00:00Z'
      }

      expect(() => {
        service.registerTemplate(templateInfo)
      }).not.toThrow()

      const templates = service.getTemplates()
      expect(templates.some(t => t.name === 'test-template')).toBe(true)
    })

    it('应该能够注册新主题', () => {
      const theme: TemplateTheme = {
        name: 'custom-theme',
        version: '1.0.0',
        description: 'Custom test theme',
        author: 'Test Author',
        templates: {},
        assets: {
          css: ['/css/style.css'],
          js: ['/js/script.js'],
          images: []
        },
        config: {
          colorScheme: 'dark'
        }
      }

      service.registerTheme(theme)

      const themes = service.getThemes()
      expect(themes.some(t => t.name === 'custom-theme')).toBe(true)
    })

    it('应该能够设置默认主题', () => {
      const theme: TemplateTheme = {
        name: 'new-default',
        version: '1.0.0',
        description: 'New default theme',
        author: 'Test Author',
        templates: {},
        assets: { css: [], js: [], images: [] },
        config: {}
      }

      service.registerTheme(theme)
      service.setDefaultTheme('new-default')

      // 测试通过尝试获取默认主题的模板
      const templates = service.getTemplates()
      expect(Array.isArray(templates)).toBe(true)
    })
  })

  describe('页面辅助函数', () => {
    it('pageTitle 应该正确生成页面标题', async () => {
      // 注册一个测试模板
      const templateInfo: TemplateInfo = {
        name: 'title-test',
        type: 'page',
        path: '/templates/title-test.html',
        content: '{{pageTitle}}',
        lastModified: '2023-01-01T00:00:00Z'
      }
      service.registerTemplate(templateInfo)

      const result = await service.renderPage('title-test', mockPageContext)
      expect(result.html).toBe('Test Page - Test Site')
    })

    it('pageDescription 应该返回页面描述', async () => {
      const templateInfo: TemplateInfo = {
        name: 'desc-test',
        type: 'page',
        path: '/templates/desc-test.html',
        content: '{{pageDescription}}',
        lastModified: '2023-01-01T00:00:00Z'
      }
      service.registerTemplate(templateInfo)

      const result = await service.renderPage('desc-test', mockPageContext)
      expect(result.html).toBe('Test page description')
    })

    it('canonicalUrl 应该返回规范URL', async () => {
      const templateInfo: TemplateInfo = {
        name: 'canonical-test',
        type: 'page',
        path: '/templates/canonical-test.html',
        content: '{{canonicalUrl}}',
        lastModified: '2023-01-01T00:00:00Z'
      }
      service.registerTemplate(templateInfo)

      const result = await service.renderPage('canonical-test', mockPageContext)
      expect(result.html).toBe('https://example.com/test')
    })

    it('timeAgo 应该正确计算相对时间', async () => {
      const templateInfo: TemplateInfo = {
        name: 'time-test',
        type: 'page',
        path: '/templates/time-test.html',
        content: '{{timeAgo date}}',
        lastModified: '2023-01-01T00:00:00Z'
      }
      service.registerTemplate(templateInfo)

      // 测试刚刚发布的时间
      const recentDate = new Date()
      recentDate.setMinutes(recentDate.getMinutes() - 30)

      const context = {
        ...mockPageContext,
        date: recentDate.toISOString()
      }

      const result = await service.renderPage('time-test', context)
      expect(result.html).toContain('分钟前')
    })

    it('readingTime 应该正确估算阅读时间', async () => {
      const templateInfo: TemplateInfo = {
        name: 'reading-time-test',
        type: 'page',
        path: '/templates/reading-time-test.html',
        content: '{{readingTime}}',
        lastModified: '2023-01-01T00:00:00Z'
      }
      service.registerTemplate(templateInfo)

      const context: PageContext = {
        ...mockPageContext,
        article: {
          id: 'test-article',
          site_id: 'test-site',
          title: 'Test Article',
          slug: 'test-article',
          content: '这是一个测试文章的内容。'.repeat(100), // 重复100次以创建足够的内容
          status: 'published',
          view_count: 0,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z'
        }
      }

      const result = await service.renderPage('reading-time-test', context)
      expect(result.html).toContain('约')
      expect(result.html).toContain('分钟阅读')
    })

    it('socialShare 应该生成社交分享链接', async () => {
      const templateInfo: TemplateInfo = {
        name: 'share-test',
        type: 'page',
        path: '/templates/share-test.html',
        content: '{{{socialShare "weibo,wechat"}}}',
        lastModified: '2023-01-01T00:00:00Z'
      }
      service.registerTemplate(templateInfo)

      const result = await service.renderPage('share-test', mockPageContext)
      expect(result.html).toContain('share-weibo')
      expect(result.html).toContain('share-wechat')
      expect(result.html).toContain('weibo.com')
    })
  })

  describe('模板渲染', () => {
    beforeEach(() => {
      // 注册测试模板
      const templates = [
        {
          name: 'simple-page',
          type: 'page' as const,
          path: '/templates/simple.html',
          content: '<h1>{{page.title}}</h1><p>{{page.description}}</p>',
          lastModified: '2023-01-01T00:00:00Z'
        },
        {
          name: 'with-layout',
          type: 'page' as const,
          path: '/templates/with-layout.html',
          content: '<main>{{content}}</main>',
          lastModified: '2023-01-01T00:00:00Z'
        },
        {
          name: 'layout',
          type: 'layout' as const,
          path: '/templates/layout.html',
          content: '<html><body>{{content}}</body></html>',
          lastModified: '2023-01-01T00:00:00Z'
        }
      ]

      templates.forEach(template => {
        service.registerTemplate(template)
      })
    })

    it('应该能够渲染简单页面', async () => {
      const result = await service.renderPage('simple-page', mockPageContext)

      expect(result.html).toContain('<h1>Test Page</h1>')
      expect(result.html).toContain('<p>Test page description</p>')
      expect(result.metadata.errors).toHaveLength(0)
    })

    it('应该支持布局应用', async () => {
      const result = await service.renderPage('with-layout', mockPageContext, {
        layout: 'layout'
      })

      expect(result.html).toContain('<html>')
      expect(result.html).toContain('<main>')
      expect(result.html).toContain('</body></html>')
    })

    it('应该支持自定义数据注入', async () => {
      const customData = {
        customValue: 'Custom Content'
      }

      // 创建包含自定义变量的模板
      const templateInfo: TemplateInfo = {
        name: 'custom-data-test',
        type: 'page',
        path: '/templates/custom-data-test.html',
        content: '<div>{{customValue}}</div>',
        lastModified: '2023-01-01T00:00:00Z'
      }
      service.registerTemplate(templateInfo)

      const result = await service.renderPage('custom-data-test', mockPageContext, {
        customData
      })

      expect(result.html).toContain('<div>Custom Content</div>')
    })

    it('应该支持SEO增强', async () => {
      const templateInfo: TemplateInfo = {
        name: 'seo-test',
        type: 'page',
        path: '/templates/seo-test.html',
        content: '<html><head></head><body><h1>{{page.title}}</h1></body></html>',
        lastModified: '2023-01-01T00:00:00Z'
      }
      service.registerTemplate(templateInfo)

      const result = await service.renderPage('seo-test', mockPageContext, {
        enableSEO: true
      })

      expect(result.html).toContain('<title>')
      expect(result.html).toContain('name="description"')
      expect(result.html).toContain('application/ld+json')
    })

    it('应该支持HTML压缩', async () => {
      const templateInfo: TemplateInfo = {
        name: 'minify-test',
        type: 'page',
        path: '/templates/minify-test.html',
        content: `
          <html>
            <body>
              <h1>  Title  </h1>
              <!-- Comment -->
              <p>   Content   </p>
            </body>
          </html>
        `,
        lastModified: '2023-01-01T00:00:00Z'
      }
      service.registerTemplate(templateInfo)

      const result = await service.renderPage('minify-test', mockPageContext, {
        enableMinification: true
      })

      // 验证空白被压缩
      expect(result.html).not.toContain('  ')
      // 验证注释被移除
      expect(result.html).not.toContain('<!-- Comment -->')
      // 验证内容仍然存在
      expect(result.html).toContain('<h1>Title</h1>')
    })
  })

  describe('错误处理', () => {
    it('应该处理不存在的模板', async () => {
      await expect(
        service.renderPage('nonexistent-template', mockPageContext)
      ).rejects.toThrow('Template not found')
    })

    it('应该处理不存在的主题', async () => {
      expect(() => {
        service.setDefaultTheme('nonexistent-theme')
      }).toThrow('Theme not found')
    })

    it('应该处理模板渲染错误', async () => {
      const templateInfo: TemplateInfo = {
        name: 'error-template',
        type: 'page',
        path: '/templates/error.html',
        content: '{{#if unclosed}}', // 语法错误
        lastModified: '2023-01-01T00:00:00Z'
      }
      service.registerTemplate(templateInfo)

      await expect(
        service.renderPage('error-template', mockPageContext)
      ).rejects.toThrow('Template rendering failed')
    })
  })

  describe('自定义辅助函数', () => {
    it('应该能够添加自定义辅助函数', async () => {
      // 添加自定义辅助函数
      service.addHelper('customHelper', (context, text) => {
        return `Custom: ${text}`
      })

      const templateInfo: TemplateInfo = {
        name: 'helper-test',
        type: 'page',
        path: '/templates/helper-test.html',
        content: '{{customHelper "test text"}}',
        lastModified: '2023-01-01T00:00:00Z'
      }
      service.registerTemplate(templateInfo)

      const result = await service.renderPage('helper-test', mockPageContext)
      expect(result.html).toBe('Custom: test text')
    })

    it('应该支持异步辅助函数', async () => {
      // 添加异步自定义辅助函数
      service.addHelper('asyncHelper', async (context, delay) => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return `Async result after ${delay}ms`
      })

      const templateInfo: TemplateInfo = {
        name: 'async-helper-test',
        type: 'page',
        path: '/templates/async-helper-test.html',
        content: '{{asyncHelper "10"}}',
        lastModified: '2023-01-01T00:00:00Z'
      }
      service.registerTemplate(templateInfo)

      const result = await service.renderPage('async-helper-test', mockPageContext)
      expect(result.html).toBe('Async result after 10ms')
    })
  })

  describe('缓存管理', () => {
    it('应该支持缓存统计', () => {
      const stats = service.getCacheStats()
      expect(stats).toHaveProperty('templateCacheSize')
      expect(stats).toHaveProperty('engineCacheSize')
      expect(typeof stats.templateCacheSize).toBe('number')
    })

    it('应该支持缓存清理', async () => {
      // 先渲染一些模板以创建缓存
      const templateInfo: TemplateInfo = {
        name: 'cache-test',
        type: 'page',
        path: '/templates/cache-test.html',
        content: '{{page.title}}',
        lastModified: '2023-01-01T00:00:00Z'
      }
      service.registerTemplate(templateInfo)

      await service.renderPage('cache-test', mockPageContext)

      // 清理缓存
      service.clearCache()

      // 验证缓存被清理
      const stats = service.getCacheStats()
      expect(stats.templateCacheSize).toBe(0)
    })

    it('应该支持选择性缓存清理', async () => {
      const templateInfo: TemplateInfo = {
        name: 'selective-cache-test',
        type: 'page',
        path: '/templates/selective-cache-test.html',
        content: '{{page.title}}',
        lastModified: '2023-01-01T00:00:00Z'
      }
      service.registerTemplate(templateInfo)

      await service.renderPage('selective-cache-test', mockPageContext)

      // 清理特定模板缓存
      service.clearCache('default', 'selective-cache-test')

      // 缓存应该被部分清理
      const stats = service.getCacheStats()
      expect(typeof stats.templateCacheSize).toBe('number')
    })
  })

  describe('模板预编译', () => {
    it('应该支持模板预编译', () => {
      const templateInfo: TemplateInfo = {
        name: 'precompile-test',
        type: 'page',
        path: '/templates/precompile-test.html',
        content: '{{page.title}} - {{#if page.description}}{{page.description}}{{/if}}',
        lastModified: '2023-01-01T00:00:00Z'
      }
      service.registerTemplate(templateInfo)

      // 预编译模板
      expect(() => {
        service.precompileTemplate('precompile-test')
      }).not.toThrow()

      // 检查模板是否被标记为已编译
      const templates = service.getTemplates()
      const compiledTemplate = templates.find(t => t.name === 'precompile-test')
      expect(compiledTemplate?.compiled).toBe(true)
    })
  })

  describe('结构化数据生成', () => {
    it('应该为文章页面生成正确的结构化数据', async () => {
      const templateInfo: TemplateInfo = {
        name: 'article-structured-data',
        type: 'page',
        path: '/templates/article-structured-data.html',
        content: '<html><head></head><body><h1>{{article.title}}</h1></body></html>',
        lastModified: '2023-01-01T00:00:00Z'
      }
      service.registerTemplate(templateInfo)

      const articleContext: PageContext = {
        ...mockPageContext,
        page: {
          ...mockPageContext.page,
          type: 'article'
        },
        article: {
          id: 'test-article',
          site_id: 'test-site',
          title: 'Test Article',
          slug: 'test-article',
          content: 'Article content',
          summary: 'Article summary',
          author: 'John Doe',
          status: 'published',
          view_count: 100,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          published_at: '2023-01-01T00:00:00Z'
        }
      }

      const result = await service.renderPage('article-structured-data', articleContext, {
        enableSEO: true
      })

      expect(result.html).toContain('application/ld+json')
      expect(result.html).toContain('"@type": "Article"')
      expect(result.html).toContain('"headline": "Test Article"')
      expect(result.html).toContain('"author"')
    })
  })

  describe('实际使用场景', () => {
    it('应该能够渲染完整的博客文章页面', async () => {
      const articleTemplate: TemplateInfo = {
        name: 'blog-article',
        type: 'page',
        path: '/templates/blog-article.html',
        content: `
          <article>
            <header>
              <h1>{{article.title}}</h1>
              <div class="meta">
                作者: {{article.author}} |
                发布时间: {{formatDate article.published_at "YYYY-MM-DD"}} |
                阅读时间: {{readingTime}}
              </div>
              {{#if article.tags}}
              <div class="tags">
                {{#each article.tags}}
                <span class="tag">{{this.name}}</span>
                {{/each}}
              </div>
              {{/if}}
            </header>
            <div class="content">
              {{{article.content}}}
            </div>
            <footer>
              <div class="social-share">
                {{{socialShare "weibo,wechat,qq"}}}
              </div>
            </footer>
          </article>
        `,
        lastModified: '2023-01-01T00:00:00Z'
      }
      service.registerTemplate(articleTemplate)

      const articleContext: PageContext = {
        ...mockPageContext,
        page: {
          title: 'Amazing Blog Post',
          description: 'This is an amazing blog post',
          type: 'article'
        },
        article: {
          id: 'blog-post-1',
          site_id: 'test-site',
          title: 'Amazing Blog Post',
          slug: 'amazing-blog-post',
          content: '<p>This is the <strong>content</strong> of the blog post.</p>',
          summary: 'This is an amazing blog post',
          author: 'Jane Doe',
          status: 'published',
          view_count: 150,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          published_at: '2023-01-01T00:00:00Z',
          tags: [
            { id: '1', site_id: 'test-site', name: 'Technology', slug: 'technology', created_at: '2023-01-01T00:00:00Z' },
            { id: '2', site_id: 'test-site', name: 'Web Development', slug: 'web-development', created_at: '2023-01-01T00:00:00Z' }
          ]
        }
      }

      const result = await service.renderPage('blog-article', articleContext)

      expect(result.html).toContain('<h1>Amazing Blog Post</h1>')
      expect(result.html).toContain('作者: Jane Doe')
      expect(result.html).toContain('2023-01-01')
      expect(result.html).toContain('<span class="tag">Technology</span>')
      expect(result.html).toContain('<span class="tag">Web Development</span>')
      expect(result.html).toContain('<p>This is the <strong>content</strong>')
      expect(result.html).toContain('social-share')
      expect(result.metadata.errors).toHaveLength(0)
    })
  })
})