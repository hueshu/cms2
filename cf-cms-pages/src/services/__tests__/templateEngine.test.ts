// 模板引擎测试
import { describe, it, expect, beforeEach } from 'vitest'
import { TemplateEngine, TemplateError } from '../templateEngine'

describe('TemplateEngine', () => {
  let engine: TemplateEngine

  beforeEach(() => {
    engine = new TemplateEngine({
      enableCache: false, // 测试时禁用缓存以确保每次都重新解析
      enableSandbox: true,
      maxRenderDepth: 5
    })
  })

  describe('变量替换', () => {
    it('应该正确替换简单变量', async () => {
      const template = 'Hello {{name}}!'
      const context = { name: 'World' }
      const result = await engine.render(template, context)

      expect(result.html).toBe('Hello World!')
      expect(result.metadata.errors).toHaveLength(0)
    })

    it('应该正确替换嵌套对象属性', async () => {
      const template = 'User: {{user.name}}, Email: {{user.email}}'
      const context = {
        user: {
          name: 'John Doe',
          email: 'john@example.com'
        }
      }
      const result = await engine.render(template, context)

      expect(result.html).toBe('User: John Doe, Email: john@example.com')
    })

    it('应该处理未定义变量', async () => {
      const template = 'Hello {{undefined_var}}!'
      const context = {}
      const result = await engine.render(template, context)

      expect(result.html).toBe('Hello !')
    })

    it('应该正确转义HTML字符', async () => {
      const template = 'Content: {{content}}'
      const context = { content: '<script>alert("xss")</script>' }
      const result = await engine.render(template, context)

      expect(result.html).toBe('Content: &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
    })

    it('应该支持原始输出（不转义）', async () => {
      const template = 'Raw content: {{{content}}}'
      const context = { content: '<strong>Bold</strong>' }
      const result = await engine.render(template, context)

      expect(result.html).toBe('Raw content: <strong>Bold</strong>')
    })
  })

  describe('条件渲染', () => {
    it('应该在条件为真时渲染内容', async () => {
      const template = '{{#if showContent}}Content is visible{{/if}}'
      const context = { showContent: true }
      const result = await engine.render(template, context)

      expect(result.html).toBe('Content is visible')
    })

    it('应该在条件为假时不渲染内容', async () => {
      const template = '{{#if showContent}}Content is visible{{/if}}'
      const context = { showContent: false }
      const result = await engine.render(template, context)

      expect(result.html).toBe('')
    })

    it('应该正确判断不同类型的真假值', async () => {
      const testCases = [
        { value: true, expected: 'true' },
        { value: false, expected: '' },
        { value: 1, expected: 'true' },
        { value: 0, expected: '' },
        { value: 'hello', expected: 'true' },
        { value: '', expected: '' },
        { value: [], expected: '' },
        { value: [1, 2], expected: 'true' },
        { value: {}, expected: '' },
        { value: { a: 1 }, expected: 'true' },
        { value: null, expected: '' },
        { value: undefined, expected: '' }
      ]

      for (const testCase of testCases) {
        const template = '{{#if value}}true{{/if}}'
        const context = { value: testCase.value }
        const result = await engine.render(template, context)
        expect(result.html).toBe(testCase.expected)
      }
    })
  })

  describe('循环渲染', () => {
    it('应该正确渲染数组循环', async () => {
      const template = '{{#each items}}Item: {{@item}}; {{/each}}'
      const context = { items: ['A', 'B', 'C'] }
      const result = await engine.render(template, context)

      expect(result.html).toBe('Item: A; Item: B; Item: C; ')
    })

    it('应该提供循环上下文变量', async () => {
      const template = '{{#each items}}{{@index}}: {{@item}}{{#if @first}} (first){{/if}}{{#if @last}} (last){{/if}}; {{/each}}'
      const context = { items: ['A', 'B'] }
      const result = await engine.render(template, context)

      expect(result.html).toBe('0: A (first); 1: B (last); ')
    })

    it('应该处理对象数组', async () => {
      const template = '{{#each users}}{{@item.name}} ({{@item.age}}); {{/each}}'
      const context = {
        users: [
          { name: 'John', age: 30 },
          { name: 'Jane', age: 25 }
        ]
      }
      const result = await engine.render(template, context)

      expect(result.html).toBe('John (30); Jane (25); ')
    })

    it('应该处理空数组', async () => {
      const template = '{{#each items}}Item: {{@item}}{{/each}}'
      const context = { items: [] }
      const result = await engine.render(template, context)

      expect(result.html).toBe('')
    })

    it('应该处理非数组值', async () => {
      const template = '{{#each notArray}}Item: {{@item}}{{/each}}'
      const context = { notArray: 'not an array' }
      const result = await engine.render(template, context)

      expect(result.html).toBe('')
    })
  })

  describe('部分模板', () => {
    it('应该正确渲染部分模板', async () => {
      // 设置部分模板解析器
      engine = new TemplateEngine({
        enableCache: false,
        partialResolver: async (name: string) => {
          if (name === 'header') {
            return '<h1>{{title}}</h1>'
          }
          throw new Error(`Partial not found: ${name}`)
        }
      })

      const template = '{{> header}}'
      const context = { title: 'Test Title' }
      const result = await engine.render(template, context)

      expect(result.html).toBe('<h1>Test Title</h1>')
    })

    it('应该处理不存在的部分模板', async () => {
      const template = '{{> nonexistent}}'
      const context = {}
      const result = await engine.render(template, context)

      expect(result.html).toContain('<!-- Partial not found: nonexistent -->')
      expect(result.metadata.errors.length).toBeGreaterThan(0)
    })
  })

  describe('辅助函数', () => {
    it('应该正确调用内置辅助函数', async () => {
      const template = '{{uppercase text}}'
      const context = { text: 'hello world' }
      const result = await engine.render(template, context)

      expect(result.html).toBe('HELLO WORLD')
    })

    it('应该支持多个参数的辅助函数', async () => {
      const template = '{{truncate text 5 "..."}}'
      const context = { text: 'This is a long text' }
      const result = await engine.render(template, context)

      expect(result.html).toBe('This ...')
    })

    it('应该支持自定义辅助函数', async () => {
      engine.addHelper('reverse', (context, text) => {
        return text ? text.split('').reverse().join('') : ''
      })

      const template = '{{reverse text}}'
      const context = { text: 'hello' }
      const result = await engine.render(template, context)

      expect(result.html).toBe('olleh')
    })

    it('应该处理不存在的辅助函数', async () => {
      const template = '{{nonexistent "arg"}}'
      const context = {}
      const result = await engine.render(template, context)

      expect(result.html).toBe('')
      expect(result.metadata.warnings.length).toBeGreaterThan(0)
    })

    describe('内置辅助函数测试', () => {
      it('formatDate 应该正确格式化日期', async () => {
        const template = '{{formatDate date "YYYY-MM-DD"}}'
        const context = { date: '2023-12-25T10:30:00Z' }
        const result = await engine.render(template, context)

        expect(result.html).toBe('2023-12-25')
      })

      it('truncate 应该正确截取文本', async () => {
        const template = '{{truncate text 10 "..."}}'
        const context = { text: 'This is a very long text that should be truncated' }
        const result = await engine.render(template, context)

        expect(result.html).toBe('This is a ...')
      })

      it('slugify 应该生成正确的URL slug', async () => {
        const template = '{{slugify text}}'
        const context = { text: 'Hello World 中文测试!' }
        const result = await engine.render(template, context)

        expect(result.html).toBe('hello-world-中文测试')
      })

      it('length 应该返回正确的长度', async () => {
        const tests = [
          { value: [1, 2, 3], expected: '3' },
          { value: 'hello', expected: '5' },
          { value: { a: 1, b: 2 }, expected: '2' },
          { value: null, expected: '0' }
        ]

        for (const test of tests) {
          const template = '{{length value}}'
          const context = { value: test.value }
          const result = await engine.render(template, context)
          expect(result.html).toBe(test.expected)
        }
      })

      it('join 应该正确连接数组', async () => {
        const template = '{{join items " | "}}'
        const context = { items: ['apple', 'banana', 'orange'] }
        const result = await engine.render(template, context)

        expect(result.html).toBe('apple | banana | orange')
      })

      it('default 应该提供默认值', async () => {
        const template = '{{default value "default text"}}'
        const context = { value: '' }
        const result = await engine.render(template, context)

        expect(result.html).toBe('default text')
      })
    })
  })

  describe('复杂模板', () => {
    it('应该正确处理嵌套结构', async () => {
      const template = `
        {{#if user}}
          <div>
            <h1>{{user.name}}</h1>
            {{#if user.posts}}
              <ul>
                {{#each user.posts}}
                  <li>{{@item.title}} - {{formatDate @item.date "YYYY-MM-DD"}}</li>
                {{/each}}
              </ul>
            {{/if}}
          </div>
        {{/if}}
      `

      const context = {
        user: {
          name: 'John Doe',
          posts: [
            { title: 'First Post', date: '2023-01-01' },
            { title: 'Second Post', date: '2023-01-02' }
          ]
        }
      }

      const result = await engine.render(template, context)

      expect(result.html).toContain('<h1>John Doe</h1>')
      expect(result.html).toContain('First Post - 2023-01-01')
      expect(result.html).toContain('Second Post - 2023-01-02')
    })

    it('应该正确处理混合内容', async () => {
      const template = `
        <article>
          <h1>{{title}}</h1>
          <p>作者: {{author}} | 发布时间: {{formatDate publishedAt "YYYY年MM月DD日"}}</p>

          {{#if tags}}
            <div class="tags">
              标签: {{#each tags}}<span class="tag">{{@item}}</span>{{/each}}
            </div>
          {{/if}}

          <div class="content">
            {{{content}}}
          </div>

          <div class="stats">
            <span>字数: {{length plainText}}</span>
            <span>阅读时间: {{default readingTime "未知"}}</span>
          </div>
        </article>
      `

      const context = {
        title: '测试文章',
        author: '张三',
        publishedAt: '2023-12-25',
        tags: ['技术', '教程'],
        content: '<p>这是文章内容</p>',
        plainText: '这是文章内容',
        readingTime: '5分钟'
      }

      const result = await engine.render(template, context)

      expect(result.html).toContain('<h1>测试文章</h1>')
      expect(result.html).toContain('作者: 张三')
      expect(result.html).toContain('2023年12月25日')
      expect(result.html).toContain('<span class="tag">技术</span>')
      expect(result.html).toContain('<span class="tag">教程</span>')
      expect(result.html).toContain('<p>这是文章内容</p>')
      expect(result.html).toContain('字数: 6')
      expect(result.html).toContain('阅读时间: 5分钟')
    })
  })

  describe('错误处理', () => {
    it('应该处理模板语法错误', async () => {
      const template = '{{#if unclosed condition}}'
      const context = {}
      const result = await engine.render(template, context)

      // 应该返回错误注释而不是抛出异常
      expect(result.html).toContain('<!-- Template Error:')
      expect(result.metadata.errors.length).toBeGreaterThan(0)
    })

    it('应该限制渲染深度', async () => {
      // 创建一个最大深度为2的引擎
      const shallowEngine = new TemplateEngine({
        maxRenderDepth: 2
      })

      // 模拟递归渲染（通过部分模板）
      let renderCount = 0
      shallowEngine = new TemplateEngine({
        maxRenderDepth: 2,
        partialResolver: async (name: string) => {
          renderCount++
          if (name === 'recursive') {
            return '{{> recursive}}'
          }
          return ''
        }
      })

      const template = '{{> recursive}}'
      const result = await shallowEngine.render(template, {})

      expect(result.metadata.errors.length).toBeGreaterThan(0)
      expect(result.metadata.errors[0]).toContain('Maximum render depth exceeded')
    })

    it('应该处理辅助函数错误', async () => {
      engine.addHelper('errorHelper', () => {
        throw new Error('Helper error')
      })

      const template = '{{errorHelper}}'
      const context = {}
      const result = await engine.render(template, context)

      expect(result.html).toBe('')
      expect(result.metadata.errors.length).toBeGreaterThan(0)
      expect(result.metadata.errors[0]).toContain('Helper error')
    })
  })

  describe('性能和缓存', () => {
    it('应该支持缓存功能', async () => {
      const cachedEngine = new TemplateEngine({
        enableCache: true
      })

      const template = '{{name}}'
      const context = { name: 'Test' }

      // 第一次渲染
      const result1 = await cachedEngine.render(template, context)
      expect(result1.html).toBe('Test')

      // 第二次渲染（应该使用缓存）
      const result2 = await cachedEngine.render(template, context)
      expect(result2.html).toBe('Test')

      // 验证缓存统计
      const stats = cachedEngine.getCacheStats()
      expect(stats.templateCacheSize).toBeGreaterThan(0)
    })

    it('应该支持模板预编译', () => {
      const template = '{{name}} - {{#if active}}active{{/if}}'
      const nodes = engine.compile(template)

      expect(nodes).toBeDefined()
      expect(Array.isArray(nodes)).toBe(true)
      expect(nodes.length).toBeGreaterThan(0)
    })

    it('应该支持缓存清理', async () => {
      const cachedEngine = new TemplateEngine({
        enableCache: true
      })

      // 渲染模板以创建缓存
      await cachedEngine.render('{{test}}', { test: 'value' })

      // 验证缓存存在
      let stats = cachedEngine.getCacheStats()
      expect(stats.templateCacheSize).toBeGreaterThan(0)

      // 清理缓存
      cachedEngine.clearCache()

      // 验证缓存已清理
      stats = cachedEngine.getCacheStats()
      expect(stats.templateCacheSize).toBe(0)
    })
  })

  describe('安全性', () => {
    it('应该正确转义HTML以防止XSS', async () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(1)">',
        '<svg onload="alert(1)">',
        'javascript:alert(1)',
        '"><script>alert(1)</script>'
      ]

      for (const input of maliciousInputs) {
        const template = '{{content}}'
        const context = { content: input }
        const result = await engine.render(template, context)

        // 确保没有原始的危险标签
        expect(result.html).not.toContain('<script>')
        expect(result.html).not.toContain('onerror=')
        expect(result.html).not.toContain('onload=')
        expect(result.html).not.toContain('javascript:')
      }
    })

    it('原始输出应该绕过HTML转义（需要谨慎使用）', async () => {
      const template = '{{{content}}}'
      const context = { content: '<strong>Bold Text</strong>' }
      const result = await engine.render(template, context)

      expect(result.html).toBe('<strong>Bold Text</strong>')
    })
  })

  describe('边缘情况', () => {
    it('应该处理空模板', async () => {
      const result = await engine.render('', {})
      expect(result.html).toBe('')
      expect(result.metadata.errors).toHaveLength(0)
    })

    it('应该处理只包含空白的模板', async () => {
      const result = await engine.render('   \n\t   ', {})
      expect(result.html).toBe('   \n\t   ')
    })

    it('应该处理空上下文', async () => {
      const template = 'Static text {{missing}}'
      const result = await engine.render(template, {})
      expect(result.html).toBe('Static text ')
    })

    it('应该处理复杂的变量路径', async () => {
      const template = '{{deeply.nested.property.value}}'
      const context = {
        deeply: {
          nested: {
            property: {
              value: 'found'
            }
          }
        }
      }
      const result = await engine.render(template, context)
      expect(result.html).toBe('found')
    })

    it('应该处理中断的变量路径', async () => {
      const template = '{{deeply.missing.property}}'
      const context = {
        deeply: null
      }
      const result = await engine.render(template, context)
      expect(result.html).toBe('')
    })

    it('应该处理特殊字符在变量名中', async () => {
      const template = '{{user-name}} {{user_email}}'
      const context = {
        'user-name': 'John',
        'user_email': 'john@example.com'
      }
      const result = await engine.render(template, context)
      expect(result.html).toBe('John john@example.com')
    })
  })
})