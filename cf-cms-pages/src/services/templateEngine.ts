// 模板引擎核心 - 支持变量替换、条件渲染、循环、部分模板、继承和辅助函数
import { marked } from 'marked'

// 模板引擎配置选项
export interface TemplateEngineOptions {
  enableCache?: boolean
  enableSandbox?: boolean
  maxRenderDepth?: number
  customHelpers?: Record<string, TemplateHelper>
  partialResolver?: PartialResolver
}

// 模板上下文数据
export interface TemplateContext {
  [key: string]: any
}

// 模板辅助函数类型
export type TemplateHelper = (context: TemplateContext, ...args: any[]) => string | Promise<string>

// 部分模板解析器
export type PartialResolver = (name: string) => string | Promise<string>

// 模板渲染结果
export interface TemplateRenderResult {
  html: string
  metadata: {
    renderTime: number
    dependencies: string[]
    errors: string[]
    warnings: string[]
  }
}

// 模板语法节点类型
interface TemplateNode {
  type: 'text' | 'variable' | 'condition' | 'loop' | 'partial' | 'helper' | 'raw'
  content: string
  children?: TemplateNode[]
  condition?: string
  variable?: string
  helper?: string
  args?: string[]
}

// 模板解析错误
export class TemplateError extends Error {
  constructor(
    message: string,
    public position?: number,
    public context?: string
  ) {
    super(message)
    this.name = 'TemplateError'
  }
}

export class TemplateEngine {
  private options: Required<TemplateEngineOptions>
  private templateCache = new Map<string, TemplateNode[]>()
  private partialCache = new Map<string, string>()
  private renderDepth = 0

  // 内置辅助函数
  private builtinHelpers: Record<string, TemplateHelper> = {
    // 格式化日期
    formatDate: (context, date, format = 'YYYY-MM-DD') => {
      if (!date) return ''
      const d = new Date(date)
      if (isNaN(d.getTime())) return date

      return format
        .replace('YYYY', d.getFullYear().toString())
        .replace('MM', (d.getMonth() + 1).toString().padStart(2, '0'))
        .replace('DD', d.getDate().toString().padStart(2, '0'))
        .replace('HH', d.getHours().toString().padStart(2, '0'))
        .replace('mm', d.getMinutes().toString().padStart(2, '0'))
    },

    // 截取文本
    truncate: (context, text, length = 100, suffix = '...') => {
      if (!text || text.length <= length) return text || ''
      return text.substring(0, length) + suffix
    },

    // 大写转换
    uppercase: (context, text) => {
      return text ? text.toString().toUpperCase() : ''
    },

    // 小写转换
    lowercase: (context, text) => {
      return text ? text.toString().toLowerCase() : ''
    },

    // 首字母大写
    capitalize: (context, text) => {
      if (!text) return ''
      return text.toString().charAt(0).toUpperCase() + text.toString().slice(1)
    },

    // 生成URL slug
    slugify: (context, text) => {
      if (!text) return ''
      return text.toString()
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fff]+/g, '-')
        .replace(/^-+|-+$/g, '')
    },

    // Markdown渲染
    markdown: (context, text) => {
      if (!text) return ''
      return marked(text.toString())
    },

    // JSON格式化
    json: (context, data, pretty = false) => {
      try {
        return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data)
      } catch {
        return ''
      }
    },

    // 数组长度
    length: (context, array) => {
      if (Array.isArray(array)) return array.length.toString()
      if (typeof array === 'string') return array.length.toString()
      if (array && typeof array === 'object') return Object.keys(array).length.toString()
      return '0'
    },

    // 数组连接
    join: (context, array, separator = ', ') => {
      if (!Array.isArray(array)) return ''
      return array.map(item => item?.toString() || '').join(separator)
    },

    // 默认值
    default: (context, value, defaultValue = '') => {
      return value !== undefined && value !== null && value !== '' ? value : defaultValue
    },

    // 条件渲染
    if: (context, condition, trueValue = '', falseValue = '') => {
      return this.isTruthy(condition) ? trueValue : falseValue
    },

    // 数学运算
    multiply: (context, value, multiplier) => {
      const num = parseFloat(value) || 0
      const mult = parseFloat(multiplier) || 1
      return (num * mult).toString()
    },

    add: (context, value, addend) => {
      const num = parseFloat(value) || 0
      const add = parseFloat(addend) || 0
      return (num + add).toString()
    },

    subtract: (context, value, subtrahend) => {
      const num = parseFloat(value) || 0
      const sub = parseFloat(subtrahend) || 0
      return (num - sub).toString()
    },

    // 比较函数
    eq: (context, left, right) => {
      return left === right ? 'true' : 'false'
    },

    ne: (context, left, right) => {
      return left !== right ? 'true' : 'false'
    },

    gt: (context, left, right) => {
      return parseFloat(left) > parseFloat(right) ? 'true' : 'false'
    },

    lt: (context, left, right) => {
      return parseFloat(left) < parseFloat(right) ? 'true' : 'false'
    },

    // 数组操作
    limit: (context, array, limit) => {
      if (!Array.isArray(array)) return []
      const num = parseInt(limit) || 0
      return array.slice(0, num)
    },

    // 日期相关
    daysSince: (context, date) => {
      if (!date) return '0'
      const startDate = new Date(date)
      const now = new Date()
      const diffTime = Math.abs(now.getTime() - startDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays.toString()
    }
  }

  constructor(options: TemplateEngineOptions = {}) {
    this.options = {
      enableCache: true,
      enableSandbox: true,
      maxRenderDepth: 10,
      customHelpers: {},
      partialResolver: async (name) => {
        throw new Error(`Partial resolver not configured for: ${name}`)
      },
      ...options
    }
  }

  /**
   * 渲染模板
   */
  async render(template: string, context: TemplateContext = {}): Promise<TemplateRenderResult> {
    const startTime = Date.now()
    const metadata = {
      renderTime: 0,
      dependencies: [] as string[],
      errors: [] as string[],
      warnings: [] as string[]
    }

    try {
      // 检查渲染深度
      if (this.renderDepth >= this.options.maxRenderDepth) {
        throw new TemplateError('Maximum render depth exceeded')
      }

      this.renderDepth++

      // 解析模板
      const nodes = this.parseTemplate(template)

      // 渲染节点
      const html = await this.renderNodes(nodes, context, metadata)

      metadata.renderTime = Date.now() - startTime

      return {
        html,
        metadata
      }
    } catch (error) {
      metadata.errors.push(error instanceof Error ? error.message : 'Unknown error')
      metadata.renderTime = Date.now() - startTime

      // 在开发环境中显示错误信息
      return {
        html: `<!-- Template Error: ${error instanceof Error ? error.message : 'Unknown error'} -->`,
        metadata
      }
    } finally {
      this.renderDepth--
    }
  }

  /**
   * 解析模板
   */
  private parseTemplate(template: string): TemplateNode[] {
    // 从缓存中获取已解析的模板
    if (this.options.enableCache && this.templateCache.has(template)) {
      return this.templateCache.get(template)!
    }

    const nodes: TemplateNode[] = []
    let currentIndex = 0

    while (currentIndex < template.length) {
      let nearestMatch: RegExpExecResult | null = null
      let nearestIndex = template.length
      let matchType = ''

      // 按顺序检查不同类型的模板语法
      const syntaxPatterns = [
        { pattern: /\{\{\s*#if\s+([^}]+)\s*\}\}([\s\S]*?)\{\{\s*\/if\s*\}\}/g, type: 'if' },
        { pattern: /\{\{\s*#each\s+([^}]+)\s*\}\}([\s\S]*?)\{\{\s*\/each\s*\}\}/g, type: 'each' },
        { pattern: /\{\{\s*>\s*([^}]+)\s*\}\}/g, type: 'partial' },
        { pattern: /\{\{\{\s*([^}]+)\s*\}\}\}/g, type: 'raw' },
        { pattern: /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s+([^}]+?)\s*\}\}/g, type: 'helper' },
        { pattern: /\{\{\s*([^}]+?)\s*\}\}/g, type: 'variable' }
      ]

      // 找到最近的匹配
      for (const { pattern, type } of syntaxPatterns) {
        pattern.lastIndex = currentIndex
        const match = pattern.exec(template)
        if (match && match.index < nearestIndex) {
          nearestMatch = match
          nearestIndex = match.index
          matchType = type
        }
      }

      // 处理纯文本
      if (nearestMatch && nearestIndex > currentIndex) {
        const textContent = template.substring(currentIndex, nearestIndex)
        if (textContent) {
          nodes.push({
            type: 'text',
            content: textContent
          })
        }
      }

      // 处理模板语法
      if (nearestMatch && matchType) {
        const node = this.parseMatchedNodeByType(nearestMatch, matchType)
        if (node) {
          nodes.push(node)
        }
        currentIndex = nearestMatch.index + nearestMatch[0].length
      } else {
        // 处理剩余文本
        if (currentIndex < template.length) {
          nodes.push({
            type: 'text',
            content: template.substring(currentIndex)
          })
        }
        break
      }
    }

    // 缓存解析结果
    if (this.options.enableCache) {
      this.templateCache.set(template, nodes)
    }

    return nodes
  }

  /**
   * 根据类型解析匹配的节点
   */
  private parseMatchedNodeByType(match: RegExpExecResult, type: string): TemplateNode | null {
    switch (type) {
      case 'if':
        return {
          type: 'condition',
          condition: match[1].trim(),
          content: match[2],
          children: this.parseTemplate(match[2])
        }

      case 'each':
        return {
          type: 'loop',
          variable: match[1].trim(),
          content: match[2],
          children: this.parseTemplate(match[2])
        }

      case 'partial':
        return {
          type: 'partial',
          content: match[1].trim()
        }

      case 'raw':
        return {
          type: 'raw',
          content: match[1].trim()
        }

      case 'helper':
        const helperName = match[1].trim()
        const argsStr = match[2].trim()
        const args = this.parseArguments(argsStr)

        return {
          type: 'helper',
          helper: helperName,
          args,
          content: match[0]
        }

      case 'variable':
        return {
          type: 'variable',
          content: match[1].trim()
        }

      default:
        return null
    }
  }

  /**
   * 解析辅助函数参数
   */
  private parseArguments(argsStr: string): string[] {
    const args: string[] = []
    let currentArg = ''
    let inQuotes = false
    let quoteChar = ''

    for (let i = 0; i < argsStr.length; i++) {
      const char = argsStr[i]

      if (!inQuotes && (char === '"' || char === "'")) {
        inQuotes = true
        quoteChar = char
      } else if (inQuotes && char === quoteChar) {
        inQuotes = false
        quoteChar = ''
      } else if (!inQuotes && char === ' ') {
        if (currentArg.trim()) {
          args.push(currentArg.trim())
          currentArg = ''
        }
      } else {
        currentArg += char
      }
    }

    if (currentArg.trim()) {
      args.push(currentArg.trim())
    }

    return args
  }

  /**
   * 渲染节点数组
   */
  private async renderNodes(
    nodes: TemplateNode[],
    context: TemplateContext,
    metadata: TemplateRenderResult['metadata']
  ): Promise<string> {
    let result = ''

    for (const node of nodes) {
      try {
        const rendered = await this.renderNode(node, context, metadata)
        result += rendered
      } catch (error) {
        metadata.errors.push(`Node render error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        // 继续渲染其他节点
      }
    }

    return result
  }

  /**
   * 渲染单个节点
   */
  private async renderNode(
    node: TemplateNode,
    context: TemplateContext,
    metadata: TemplateRenderResult['metadata']
  ): Promise<string> {
    switch (node.type) {
      case 'text':
        return node.content

      case 'variable':
        return this.escapeHtml(this.resolveVariable(node.content, context))

      case 'raw':
        return this.resolveVariable(node.content, context)

      case 'condition':
        if (node.condition && this.evaluateCondition(node.condition, context)) {
          return node.children ? await this.renderNodes(node.children, context, metadata) : ''
        }
        return ''

      case 'loop':
        return await this.renderLoop(node, context, metadata)

      case 'partial':
        return await this.renderPartial(node.content, context, metadata)

      case 'helper':
        return await this.renderHelper(node, context, metadata)

      default:
        metadata.warnings.push(`Unknown node type: ${(node as any).type}`)
        return ''
    }
  }

  /**
   * 解析变量值（返回原始值）
   */
  private resolveVariableRaw(path: string, context: TemplateContext): any {
    try {
      const parts = path.split('.')
      let value: any = context

      for (const part of parts) {
        if (value === null || value === undefined) {
          return undefined
        }
        value = value[part]
      }

      return value
    } catch {
      return undefined
    }
  }

  /**
   * 解析变量值（返回字符串）
   */
  private resolveVariable(path: string, context: TemplateContext): string {
    const value = this.resolveVariableRaw(path, context)
    return value !== undefined && value !== null ? value.toString() : ''
  }

  /**
   * 评估条件表达式
   */
  private evaluateCondition(condition: string, context: TemplateContext): boolean {
    try {
      // 直接从上下文获取原始值，而不是字符串化的值
      const value = this.resolveVariableRaw(condition, context)
      return this.isTruthy(value)
    } catch {
      return false
    }
  }

  /**
   * 判断值是否为真
   */
  private isTruthy(value: any): boolean {
    if (value === null || value === undefined) return false
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value !== 0
    if (typeof value === 'string') return value.length > 0
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'object') return Object.keys(value).length > 0
    return Boolean(value)
  }

  /**
   * 渲染循环
   */
  private async renderLoop(
    node: TemplateNode,
    context: TemplateContext,
    metadata: TemplateRenderResult['metadata']
  ): Promise<string> {
    if (!node.variable || !node.children) return ''

    const arrayValue = this.resolveVariableRaw(node.variable, context)
    if (!Array.isArray(arrayValue)) return ''

    let result = ''
    for (let i = 0; i < arrayValue.length; i++) {
      const item = arrayValue[i]
      const loopContext = {
        ...context,
        // 添加循环变量到根级别以便访问
        '@item': item,
        '@index': i,
        '@first': i === 0,
        '@last': i === arrayValue.length - 1,
        '@length': arrayValue.length,
        // 同时保持原有的上下文
        item,
        index: i,
        first: i === 0,
        last: i === arrayValue.length - 1,
        length: arrayValue.length
      }

      result += await this.renderNodes(node.children, loopContext, metadata)
    }

    return result
  }

  /**
   * 渲染部分模板
   */
  private async renderPartial(
    partialName: string,
    context: TemplateContext,
    metadata: TemplateRenderResult['metadata']
  ): Promise<string> {
    try {
      metadata.dependencies.push(partialName)

      // 从缓存获取部分模板
      let partialContent = this.partialCache.get(partialName)

      if (!partialContent) {
        partialContent = await this.options.partialResolver(partialName)
        this.partialCache.set(partialName, partialContent)
      }

      // 递归渲染部分模板
      const result = await this.render(partialContent, context)
      metadata.dependencies.push(...result.metadata.dependencies)
      metadata.errors.push(...result.metadata.errors)
      metadata.warnings.push(...result.metadata.warnings)

      return result.html
    } catch (error) {
      metadata.errors.push(`Partial render error (${partialName}): ${error instanceof Error ? error.message : 'Unknown error'}`)
      return `<!-- Partial not found: ${partialName} -->`
    }
  }

  /**
   * 渲染辅助函数
   */
  private async renderHelper(
    node: TemplateNode,
    context: TemplateContext,
    metadata: TemplateRenderResult['metadata']
  ): Promise<string> {
    if (!node.helper || !node.args) return ''

    // 查找辅助函数
    const helper = this.options.customHelpers[node.helper] || this.builtinHelpers[node.helper]

    if (!helper) {
      metadata.warnings.push(`Helper not found: ${node.helper}`)
      return ''
    }

    try {
      // 解析参数
      const args = node.args.map(arg => {
        // 移除引号
        if ((arg.startsWith('"') && arg.endsWith('"')) || (arg.startsWith("'") && arg.endsWith("'"))) {
          return arg.slice(1, -1)
        }
        // 对于变量，先尝试获取原始值，如果是基本类型则直接返回，否则返回字符串
        const rawValue = this.resolveVariableRaw(arg, context)
        if (rawValue !== undefined && rawValue !== null) {
          // 如果是基本类型，直接返回
          if (typeof rawValue === 'string' || typeof rawValue === 'number' || typeof rawValue === 'boolean') {
            return rawValue
          }
          // 如果是数组或对象，返回原始值（用于某些辅助函数）
          if (typeof rawValue === 'object') {
            return rawValue
          }
        }
        // 回退到字符串形式
        return this.resolveVariable(arg, context)
      })

      // 调用辅助函数
      const result = await helper(context, ...args)
      return result || ''
    } catch (error) {
      metadata.errors.push(`Helper error (${node.helper}): ${error instanceof Error ? error.message : 'Unknown error'}`)
      return ''
    }
  }

  /**
   * HTML转义
   */
  private escapeHtml(text: string): string {
    if (!text) return ''
    return text.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.templateCache.clear()
    this.partialCache.clear()
  }

  /**
   * 添加自定义辅助函数
   */
  addHelper(name: string, helper: TemplateHelper): void {
    this.options.customHelpers[name] = helper
  }

  /**
   * 移除自定义辅助函数
   */
  removeHelper(name: string): void {
    delete this.options.customHelpers[name]
  }

  /**
   * 预编译模板（仅解析，不渲染）
   */
  compile(template: string): TemplateNode[] {
    return this.parseTemplate(template)
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): {
    templateCacheSize: number
    partialCacheSize: number
  } {
    return {
      templateCacheSize: this.templateCache.size,
      partialCacheSize: this.partialCache.size
    }
  }
}

// 导出默认实例
export const templateEngine = new TemplateEngine()