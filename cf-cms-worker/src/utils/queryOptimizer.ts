import { D1Database, D1PreparedStatement } from '@cloudflare/workers-types'
import { PerformanceService } from '../services/performanceService'

export interface QueryStats {
  query: string
  executionTime: number
  rowsReturned: number
  indexesUsed: string[]
  suggestions: string[]
}

export interface BatchQuery {
  query: string
  params: any[]
  key?: string
}

export interface QueryOptimization {
  originalQuery: string
  optimizedQuery: string
  estimatedImprovement: number
  reasoning: string
}

/**
 * 查询优化器 - Stream B核心功能
 * 提供数据库查询优化、批量处理和性能分析
 */
export class QueryOptimizer {
  private queryCache = new Map<string, any>()
  private preparedStatements = new Map<string, D1PreparedStatement>()
  private connectionPool: D1Database[] = []
  private currentConnection = 0

  constructor(
    private db: D1Database,
    private performanceService?: PerformanceService,
    private poolSize = 5
  ) {
    this.initializeConnectionPool()
  }

  /**
   * 优化查询执行
   */
  async executeOptimized<T>(
    query: string,
    params: any[] = [],
    options: {
      useCache?: boolean
      cacheTtl?: number
      enableAnalysis?: boolean
    } = {}
  ): Promise<T[]> {
    const {
      useCache = true,
      cacheTtl = 300,
      enableAnalysis = true
    } = options

    const startTime = Date.now()
    const queryKey = this.generateQueryKey(query, params)

    try {
      // 检查查询缓存
      if (useCache && this.queryCache.has(queryKey)) {
        const cached = this.queryCache.get(queryKey)
        if (Date.now() - cached.timestamp < cacheTtl * 1000) {
          return cached.data
        }
      }

      // 查询优化
      const optimizedQuery = this.optimizeQuery(query)

      // 获取或创建预处理语句
      const statement = this.getPreparedStatement(optimizedQuery)

      // 执行查询
      const result = await statement.bind(...params).all()
      const executionTime = Date.now() - startTime

      // 记录性能指标
      if (this.performanceService) {
        this.performanceService.recordQueryPerformance(
          query,
          executionTime,
          result.results?.length || 0
        )
      }

      // 分析查询性能
      if (enableAnalysis) {
        await this.analyzeQuery(query, executionTime, result.results?.length || 0)
      }

      // 缓存结果
      if (useCache && result.results) {
        this.queryCache.set(queryKey, {
          data: result.results,
          timestamp: Date.now()
        })
      }

      return result.results as T[]

    } catch (error) {
      const executionTime = Date.now() - startTime

      if (this.performanceService) {
        this.performanceService.recordQueryPerformance(
          query,
          executionTime,
          0,
          error.message
        )
      }

      throw error
    }
  }

  /**
   * 批量查询处理
   */
  async executeBatch<T>(
    queries: BatchQuery[],
    options: {
      parallel?: boolean
      batchSize?: number
      failFast?: boolean
    } = {}
  ): Promise<Map<string, T[]>> {
    const {
      parallel = true,
      batchSize = 50,
      failFast = false
    } = options

    const results = new Map<string, T[]>()
    const batches = this.chunkArray(queries, batchSize)

    for (const batch of batches) {
      try {
        if (parallel) {
          const batchResults = await this.executeParallelBatch(batch)
          batchResults.forEach((value, key) => results.set(key, value))
        } else {
          const batchResults = await this.executeSequentialBatch(batch)
          batchResults.forEach((value, key) => results.set(key, value))
        }
      } catch (error) {
        if (failFast) {
          throw error
        }
        console.error('Batch execution error:', error)
      }
    }

    return results
  }

  /**
   * 查询性能分析
   */
  async analyzeQuery(
    query: string,
    executionTime: number,
    rowsReturned: number
  ): Promise<QueryStats> {
    const suggestions: string[] = []
    const indexesUsed: string[] = []

    // 分析查询模式
    const analysis = this.analyzeQueryPattern(query)

    // 性能建议
    if (executionTime > 100) {
      suggestions.push('查询执行时间较长，考虑添加索引')
    }

    if (rowsReturned > 1000 && !query.toLowerCase().includes('limit')) {
      suggestions.push('返回大量数据，建议添加LIMIT限制')
    }

    if (analysis.hasJoin && !analysis.hasWhere) {
      suggestions.push('连接查询缺少WHERE条件，可能影响性能')
    }

    if (analysis.hasSubquery) {
      suggestions.push('考虑将子查询重写为JOIN以提高性能')
    }

    // 检查索引使用情况
    const indexAnalysis = await this.analyzeIndexUsage(query)
    indexesUsed.push(...indexAnalysis.usedIndexes)
    suggestions.push(...indexAnalysis.suggestions)

    return {
      query,
      executionTime,
      rowsReturned,
      indexesUsed,
      suggestions
    }
  }

  /**
   * 查询优化建议
   */
  optimizeQuery(query: string): string {
    let optimized = query

    // 1. 移除不必要的子查询
    optimized = this.eliminateUnnecessarySubqueries(optimized)

    // 2. 优化JOIN顺序
    optimized = this.optimizeJoinOrder(optimized)

    // 3. 添加合适的索引提示
    optimized = this.addIndexHints(optimized)

    // 4. 优化WHERE条件顺序
    optimized = this.optimizeWhereConditions(optimized)

    // 5. 添加LIMIT如果缺失
    optimized = this.addLimitIfNeeded(optimized)

    return optimized
  }

  /**
   * 生成索引建议
   */
  async generateIndexRecommendations(
    tableName: string,
    queries: string[]
  ): Promise<string[]> {
    const recommendations: string[] = []
    const columnUsage = new Map<string, number>()
    const joinColumns = new Set<string>()
    const whereColumns = new Set<string>()

    // 分析查询模式
    for (const query of queries) {
      const analysis = this.analyzeQueryPattern(query)

      // 统计WHERE条件中的列
      analysis.whereColumns.forEach(col => {
        whereColumns.add(col)
        columnUsage.set(col, (columnUsage.get(col) || 0) + 1)
      })

      // 统计JOIN条件中的列
      analysis.joinColumns.forEach(col => {
        joinColumns.add(col)
        columnUsage.set(col, (columnUsage.get(col) || 0) + 2) // JOIN权重更高
      })
    }

    // 生成索引建议
    const sortedColumns = Array.from(columnUsage.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([col]) => col)

    // 单列索引建议
    sortedColumns.slice(0, 5).forEach(column => {
      if (whereColumns.has(column) || joinColumns.has(column)) {
        recommendations.push(`CREATE INDEX idx_${tableName}_${column} ON ${tableName}(${column});`)
      }
    })

    // 复合索引建议
    if (sortedColumns.length >= 2) {
      const compositeColumns = sortedColumns.slice(0, 3).join(', ')
      recommendations.push(`CREATE INDEX idx_${tableName}_composite ON ${tableName}(${compositeColumns});`)
    }

    return recommendations
  }

  /**
   * 连接池管理
   */
  private initializeConnectionPool(): void {
    // Cloudflare Workers中D1连接是自动管理的
    // 这里主要是为了兼容性和未来扩展
    for (let i = 0; i < this.poolSize; i++) {
      this.connectionPool.push(this.db)
    }
  }

  private getConnection(): D1Database {
    const connection = this.connectionPool[this.currentConnection]
    this.currentConnection = (this.currentConnection + 1) % this.poolSize
    return connection
  }

  /**
   * 预处理语句管理
   */
  private getPreparedStatement(query: string): D1PreparedStatement {
    if (!this.preparedStatements.has(query)) {
      const connection = this.getConnection()
      this.preparedStatements.set(query, connection.prepare(query))
    }
    return this.preparedStatements.get(query)!
  }

  private generateQueryKey(query: string, params: any[]): string {
    return `${query}:${JSON.stringify(params)}`
  }

  /**
   * 并行批量执行
   */
  private async executeParallelBatch<T>(
    batch: BatchQuery[]
  ): Promise<Map<string, T[]>> {
    const promises = batch.map(async ({ query, params, key }) => {
      const result = await this.executeOptimized<T>(query, params, {
        useCache: false, // 批量查询通常不缓存
        enableAnalysis: false
      })
      return { key: key || query, result }
    })

    const results = await Promise.all(promises)
    const resultMap = new Map<string, T[]>()

    results.forEach(({ key, result }) => {
      resultMap.set(key, result)
    })

    return resultMap
  }

  /**
   * 串行批量执行
   */
  private async executeSequentialBatch<T>(
    batch: BatchQuery[]
  ): Promise<Map<string, T[]>> {
    const results = new Map<string, T[]>()

    for (const { query, params, key } of batch) {
      const result = await this.executeOptimized<T>(query, params, {
        useCache: false,
        enableAnalysis: false
      })
      results.set(key || query, result)
    }

    return results
  }

  /**
   * 查询模式分析
   */
  private analyzeQueryPattern(query: string): {
    hasJoin: boolean
    hasWhere: boolean
    hasSubquery: boolean
    hasGroupBy: boolean
    hasOrderBy: boolean
    hasLimit: boolean
    whereColumns: string[]
    joinColumns: string[]
  } {
    const lowerQuery = query.toLowerCase()

    return {
      hasJoin: /\bjoin\b/.test(lowerQuery),
      hasWhere: /\bwhere\b/.test(lowerQuery),
      hasSubquery: /\(\s*select\b/.test(lowerQuery),
      hasGroupBy: /\bgroup\s+by\b/.test(lowerQuery),
      hasOrderBy: /\border\s+by\b/.test(lowerQuery),
      hasLimit: /\blimit\b/.test(lowerQuery),
      whereColumns: this.extractWhereColumns(query),
      joinColumns: this.extractJoinColumns(query)
    }
  }

  private extractWhereColumns(query: string): string[] {
    const whereMatch = query.match(/WHERE\s+(.+?)(?:\s+GROUP|ORDER|LIMIT|$)/i)
    if (!whereMatch) return []

    const whereClause = whereMatch[1]
    const columnMatches = whereClause.match(/(\w+)\s*[=<>!]/g)

    return columnMatches?.map(match =>
      match.replace(/\s*[=<>!].*/, '').trim()
    ) || []
  }

  private extractJoinColumns(query: string): string[] {
    const joinMatches = query.match(/JOIN\s+\w+\s+ON\s+(.+?)(?:\s+WHERE|GROUP|ORDER|LIMIT|$)/gi)
    if (!joinMatches) return []

    const columns: string[] = []
    joinMatches.forEach(joinClause => {
      const columnMatches = joinClause.match(/(\w+)\s*=\s*(\w+)/g)
      if (columnMatches) {
        columnMatches.forEach(match => {
          const parts = match.split('=').map(p => p.trim())
          columns.push(...parts)
        })
      }
    })

    return columns
  }

  /**
   * 索引使用分析
   */
  private async analyzeIndexUsage(query: string): Promise<{
    usedIndexes: string[]
    suggestions: string[]
  }> {
    // 在实际项目中，这里可以使用EXPLAIN QUERY PLAN
    // Cloudflare D1目前可能不支持，所以使用启发式分析

    const suggestions: string[] = []
    const usedIndexes: string[] = []

    const analysis = this.analyzeQueryPattern(query)

    if (analysis.hasWhere && analysis.whereColumns.length > 0) {
      analysis.whereColumns.forEach(column => {
        suggestions.push(`考虑为列 ${column} 创建索引`)
      })
    }

    if (analysis.hasJoin && analysis.joinColumns.length > 0) {
      analysis.joinColumns.forEach(column => {
        suggestions.push(`考虑为连接列 ${column} 创建索引`)
      })
    }

    return { usedIndexes, suggestions }
  }

  /**
   * 查询优化方法
   */
  private eliminateUnnecessarySubqueries(query: string): string {
    // 简化的子查询优化逻辑
    // 实际项目中需要更复杂的AST分析
    return query
  }

  private optimizeJoinOrder(query: string): string {
    // JOIN顺序优化
    // 实际项目中需要基于表大小和选择性进行优化
    return query
  }

  private addIndexHints(query: string): string {
    // 添加索引提示
    // 根据查询模式添加适当的索引提示
    return query
  }

  private optimizeWhereConditions(query: string): string {
    // WHERE条件顺序优化
    // 将选择性高的条件放在前面
    return query
  }

  private addLimitIfNeeded(query: string): string {
    const lowerQuery = query.toLowerCase()

    // 如果是SELECT查询且没有LIMIT，添加合理的LIMIT
    if (lowerQuery.startsWith('select') &&
        !lowerQuery.includes('limit') &&
        !lowerQuery.includes('count(')) {
      return `${query} LIMIT 1000`
    }

    return query
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }
}