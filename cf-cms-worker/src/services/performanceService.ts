import { CacheStats } from './cacheService'

export interface PerformanceMetric {
  name: string
  value: number
  unit: string
  timestamp: number
  tags?: Record<string, string>
}

export interface QueryPerformance {
  query: string
  duration: number
  rows: number
  timestamp: number
  error?: string
}

export interface APIPerformance {
  endpoint: string
  method: string
  duration: number
  statusCode: number
  timestamp: number
  userAgent?: string
  ip?: string
}

export interface SystemMetrics {
  memoryUsage: number
  cpuUsage: number
  requestCount: number
  errorRate: number
  responseTime: number
}

/**
 * 性能监控服务 - 收集和分析性能指标
 */
export class PerformanceService {
  private metrics: PerformanceMetric[] = []
  private queryPerformance: QueryPerformance[] = []
  private apiPerformance: APIPerformance[] = []
  private readonly maxMetricsSize = 10000

  constructor(private kvNamespace?: KVNamespace) {}

  /**
   * 记录性能指标
   */
  recordMetric(
    name: string,
    value: number,
    unit: string,
    tags?: Record<string, string>
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      tags
    }

    this.metrics.push(metric)
    this.trimMetrics()

    // 异步持久化到KV
    if (this.kvNamespace) {
      this.persistMetric(metric).catch(console.error)
    }
  }

  /**
   * 记录数据库查询性能
   */
  recordQueryPerformance(
    query: string,
    duration: number,
    rows: number,
    error?: string
  ): void {
    const performance: QueryPerformance = {
      query: this.sanitizeQuery(query),
      duration,
      rows,
      timestamp: Date.now(),
      error
    }

    this.queryPerformance.push(performance)
    this.trimQueryPerformance()

    // 记录为通用指标
    this.recordMetric('db.query.duration', duration, 'ms', {
      hasError: error ? 'true' : 'false',
      rowCount: rows.toString()
    })
  }

  /**
   * 记录API性能
   */
  recordAPIPerformance(
    endpoint: string,
    method: string,
    duration: number,
    statusCode: number,
    userAgent?: string,
    ip?: string
  ): void {
    const performance: APIPerformance = {
      endpoint: this.sanitizeEndpoint(endpoint),
      method,
      duration,
      statusCode,
      timestamp: Date.now(),
      userAgent,
      ip
    }

    this.apiPerformance.push(performance)
    this.trimAPIPerformance()

    // 记录为通用指标
    this.recordMetric('api.request.duration', duration, 'ms', {
      endpoint: performance.endpoint,
      method,
      statusCode: statusCode.toString(),
      success: statusCode < 400 ? 'true' : 'false'
    })
  }

  /**
   * 性能监控装饰器
   */
  static monitor(metricName?: string) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
      const method = descriptor.value

      descriptor.value = async function (...args: any[]) {
        const performanceService = this.performanceService as PerformanceService
        const startTime = Date.now()

        try {
          const result = await method.apply(this, args)
          const duration = Date.now() - startTime

          if (performanceService) {
            performanceService.recordMetric(
              metricName || `${target.constructor.name}.${propertyName}`,
              duration,
              'ms',
              { success: 'true' }
            )
          }

          return result
        } catch (error) {
          const duration = Date.now() - startTime

          if (performanceService) {
            performanceService.recordMetric(
              metricName || `${target.constructor.name}.${propertyName}`,
              duration,
              'ms',
              { success: 'false', error: error.message }
            )
          }

          throw error
        }
      }

      return descriptor
    }
  }

  /**
   * 获取缓存性能报告
   */
  getCachePerformanceReport(cacheStats: CacheStats): {
    hitRate: number
    efficiency: string
    recommendations: string[]
  } {
    const { hitRate, hits, misses, size } = cacheStats
    const recommendations: string[] = []

    let efficiency = 'good'
    if (hitRate < 0.5) {
      efficiency = 'poor'
      recommendations.push('缓存命中率过低，考虑调整缓存策略或增加TTL')
    } else if (hitRate < 0.7) {
      efficiency = 'fair'
      recommendations.push('缓存命中率可以改善，检查缓存键的生成策略')
    }

    if (size > 50 * 1024 * 1024) { // 50MB
      recommendations.push('缓存大小较大，考虑实施更积极的清理策略')
    }

    if (hits + misses > 10000 && hitRate < 0.8) {
      recommendations.push('高负载下缓存效果不理想，考虑预热热点数据')
    }

    return {
      hitRate,
      efficiency,
      recommendations
    }
  }

  /**
   * 获取查询性能分析
   */
  getQueryPerformanceAnalysis(): {
    slowQueries: QueryPerformance[]
    averageDuration: number
    errorRate: number
    recommendations: string[]
  } {
    const recentQueries = this.queryPerformance.slice(-1000)
    const recommendations: string[] = []

    // 慢查询（超过100ms）
    const slowQueries = recentQueries.filter(q => q.duration > 100)

    // 平均查询时间
    const averageDuration = recentQueries.length > 0
      ? recentQueries.reduce((sum, q) => sum + q.duration, 0) / recentQueries.length
      : 0

    // 错误率
    const errorCount = recentQueries.filter(q => q.error).length
    const errorRate = recentQueries.length > 0 ? errorCount / recentQueries.length : 0

    // 生成建议
    if (slowQueries.length > recentQueries.length * 0.1) {
      recommendations.push('检测到大量慢查询，考虑添加索引或优化查询结构')
    }

    if (averageDuration > 50) {
      recommendations.push('平均查询时间较高，考虑实施查询缓存')
    }

    if (errorRate > 0.05) {
      recommendations.push('查询错误率较高，检查数据库连接和查询语法')
    }

    // 查找重复查询模式
    const queryPatterns = this.analyzeQueryPatterns(recentQueries)
    if (queryPatterns.length > 0) {
      recommendations.push('发现重复查询模式，建议实施查询结果缓存')
    }

    return {
      slowQueries,
      averageDuration,
      errorRate,
      recommendations
    }
  }

  /**
   * 获取API性能分析
   */
  getAPIPerformanceAnalysis(): {
    slowEndpoints: APIPerformance[]
    averageResponseTime: number
    errorRate: number
    throughput: number
    recommendations: string[]
  } {
    const recentAPIs = this.apiPerformance.slice(-1000)
    const recommendations: string[] = []

    // 慢接口（超过500ms）
    const slowEndpoints = recentAPIs.filter(api => api.duration > 500)

    // 平均响应时间
    const averageResponseTime = recentAPIs.length > 0
      ? recentAPIs.reduce((sum, api) => sum + api.duration, 0) / recentAPIs.length
      : 0

    // 错误率
    const errorCount = recentAPIs.filter(api => api.statusCode >= 400).length
    const errorRate = recentAPIs.length > 0 ? errorCount / recentAPIs.length : 0

    // 吞吐量（每秒请求数）
    const timeSpan = recentAPIs.length > 0
      ? (Date.now() - recentAPIs[0].timestamp) / 1000
      : 1
    const throughput = recentAPIs.length / timeSpan

    // 生成建议
    if (slowEndpoints.length > recentAPIs.length * 0.1) {
      recommendations.push('检测到慢接口，考虑优化业务逻辑或添加缓存')
    }

    if (averageResponseTime > 200) {
      recommendations.push('平均响应时间较高，考虑并行处理或预计算')
    }

    if (errorRate > 0.05) {
      recommendations.push('API错误率较高，检查错误处理和验证逻辑')
    }

    if (throughput > 100) {
      recommendations.push('高并发场景，确保缓存和限流策略有效')
    }

    return {
      slowEndpoints,
      averageResponseTime,
      errorRate,
      throughput,
      recommendations
    }
  }

  /**
   * 获取系统性能指标
   */
  getSystemMetrics(): SystemMetrics {
    const recentMetrics = this.metrics.slice(-100)

    return {
      memoryUsage: this.getLatestMetricValue('memory.usage') || 0,
      cpuUsage: this.getLatestMetricValue('cpu.usage') || 0,
      requestCount: recentMetrics.filter(m => m.name === 'api.request.duration').length,
      errorRate: this.calculateErrorRate(recentMetrics),
      responseTime: this.getAverageMetricValue('api.request.duration') || 0
    }
  }

  /**
   * 生成性能报告
   */
  generatePerformanceReport(cacheStats?: CacheStats): {
    timestamp: number
    cache?: any
    queries: any
    api: any
    system: SystemMetrics
    overallHealth: 'excellent' | 'good' | 'fair' | 'poor'
    criticalIssues: string[]
  } {
    const report = {
      timestamp: Date.now(),
      cache: cacheStats ? this.getCachePerformanceReport(cacheStats) : undefined,
      queries: this.getQueryPerformanceAnalysis(),
      api: this.getAPIPerformanceAnalysis(),
      system: this.getSystemMetrics(),
      overallHealth: 'good' as const,
      criticalIssues: [] as string[]
    }

    // 评估整体健康状况
    const issues = []

    if (report.cache && report.cache.hitRate < 0.5) {
      issues.push('缓存命中率严重偏低')
    }

    if (report.queries.errorRate > 0.1) {
      issues.push('数据库查询错误率过高')
    }

    if (report.api.errorRate > 0.1) {
      issues.push('API错误率过高')
    }

    if (report.api.averageResponseTime > 1000) {
      issues.push('API响应时间过长')
    }

    report.criticalIssues = issues

    if (issues.length > 2) {
      report.overallHealth = 'poor'
    } else if (issues.length > 0) {
      report.overallHealth = 'fair'
    } else if (
      (report.cache?.hitRate || 0.8) > 0.8 &&
      report.queries.errorRate < 0.01 &&
      report.api.errorRate < 0.01 &&
      report.api.averageResponseTime < 100
    ) {
      report.overallHealth = 'excellent'
    }

    return report
  }

  // 私有方法

  private trimMetrics(): void {
    if (this.metrics.length > this.maxMetricsSize) {
      this.metrics = this.metrics.slice(-this.maxMetricsSize)
    }
  }

  private trimQueryPerformance(): void {
    if (this.queryPerformance.length > 1000) {
      this.queryPerformance = this.queryPerformance.slice(-1000)
    }
  }

  private trimAPIPerformance(): void {
    if (this.apiPerformance.length > 1000) {
      this.apiPerformance = this.apiPerformance.slice(-1000)
    }
  }

  private async persistMetric(metric: PerformanceMetric): Promise<void> {
    if (!this.kvNamespace) return

    const key = `metrics:${Date.now()}:${Math.random()}`
    await this.kvNamespace.put(key, JSON.stringify(metric), {
      expirationTtl: 7 * 24 * 3600 // 7天过期
    })
  }

  private sanitizeQuery(query: string): string {
    // 移除参数值，保留查询结构
    return query
      .replace(/('[^']*'|"[^"]*"|\d+)/g, '?')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 200)
  }

  private sanitizeEndpoint(endpoint: string): string {
    // 移除ID等动态部分
    return endpoint
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid')
      .substring(0, 100)
  }

  private analyzeQueryPatterns(queries: QueryPerformance[]): string[] {
    const patterns = new Map<string, number>()

    queries.forEach(q => {
      const pattern = q.query
      patterns.set(pattern, (patterns.get(pattern) || 0) + 1)
    })

    return Array.from(patterns.entries())
      .filter(([, count]) => count > 5)
      .map(([pattern]) => pattern)
  }

  private getLatestMetricValue(metricName: string): number | undefined {
    const metric = this.metrics
      .filter(m => m.name === metricName)
      .pop()
    return metric?.value
  }

  private getAverageMetricValue(metricName: string): number | undefined {
    const relevantMetrics = this.metrics.filter(m => m.name === metricName)
    if (relevantMetrics.length === 0) return undefined

    const sum = relevantMetrics.reduce((acc, m) => acc + m.value, 0)
    return sum / relevantMetrics.length
  }

  private calculateErrorRate(metrics: PerformanceMetric[]): number {
    const apiMetrics = metrics.filter(m => m.name === 'api.request.duration')
    if (apiMetrics.length === 0) return 0

    const errorCount = apiMetrics.filter(m => m.tags?.success === 'false').length
    return errorCount / apiMetrics.length
  }
}