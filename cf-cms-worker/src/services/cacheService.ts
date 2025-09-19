import { KVService } from '../utils/database'

export interface CacheOptions {
  ttl?: number
  strategy?: 'write-through' | 'write-behind' | 'cache-aside'
  compression?: boolean
  tags?: string[]
}

export interface CacheStats {
  hits: number
  misses: number
  sets: number
  deletes: number
  size: number
  hitRate: number
}

export interface CacheEntry<T = any> {
  data: T
  timestamp: number
  ttl: number
  tags: string[]
  compressed: boolean
  size: number
}

/**
 * 多层缓存服务 - Stream A核心功能
 * 支持KV存储、Cache API和内存缓存的三层架构
 */
export class CacheService {
  private memoryCache = new Map<string, CacheEntry>()
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    size: 0,
    hitRate: 0
  }
  private readonly maxMemorySize = 100 * 1024 * 1024 // 100MB内存缓存限制

  constructor(
    private kvService: KVService,
    private cacheApi?: Cache
  ) {}

  /**
   * 智能缓存键生成
   * 基于内容、参数和用户上下文生成唯一键
   */
  generateCacheKey(
    type: string,
    identifier: string,
    params?: Record<string, any>,
    userContext?: { userId?: string; tenantId?: string }
  ): string {
    const keyParts = [type, identifier]

    if (params) {
      const sortedParams = Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join('&')
      keyParts.push(sortedParams)
    }

    if (userContext?.tenantId) {
      keyParts.push(`tenant:${userContext.tenantId}`)
    }

    if (userContext?.userId) {
      keyParts.push(`user:${userContext.userId}`)
    }

    return keyParts.join(':')
  }

  /**
   * 获取缓存数据 - 多层级查找
   * 1. 内存缓存 (最快)
   * 2. Cache API (中等速度)
   * 3. KV存储 (相对较慢但持久)
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // 第一层：内存缓存
      const memoryEntry = this.memoryCache.get(key)
      if (memoryEntry && !this.isExpired(memoryEntry)) {
        this.stats.hits++
        this.updateHitRate()
        return this.decompressData(memoryEntry.data, memoryEntry.compressed)
      }

      // 第二层：Cache API
      if (this.cacheApi) {
        const cacheResponse = await this.cacheApi.match(key)
        if (cacheResponse) {
          const cacheData = await cacheResponse.json() as CacheEntry<T>
          if (!this.isExpired(cacheData)) {
            // 回填到内存缓存
            this.setMemoryCache(key, cacheData)
            this.stats.hits++
            this.updateHitRate()
            return this.decompressData(cacheData.data, cacheData.compressed)
          }
        }
      }

      // 第三层：KV存储
      const kvData = await this.kvService.get<CacheEntry<T>>(key)
      if (kvData && !this.isExpired(kvData)) {
        // 回填到上层缓存
        this.setMemoryCache(key, kvData)
        if (this.cacheApi) {
          await this.setCacheApi(key, kvData)
        }
        this.stats.hits++
        this.updateHitRate()
        return this.decompressData(kvData.data, kvData.compressed)
      }

      this.stats.misses++
      this.updateHitRate()
      return null
    } catch (error) {
      console.error('Cache get error:', error)
      this.stats.misses++
      this.updateHitRate()
      return null
    }
  }

  /**
   * 设置缓存数据 - 写入所有层级
   */
  async set<T>(
    key: string,
    data: T,
    options: CacheOptions = {}
  ): Promise<void> {
    try {
      const {
        ttl = 3600,
        strategy = 'write-through',
        compression = true,
        tags = []
      } = options

      const compressedData = compression ? this.compressData(data) : data
      const entry: CacheEntry<T> = {
        data: compressedData,
        timestamp: Date.now(),
        ttl: ttl * 1000, // 转换为毫秒
        tags,
        compressed: compression,
        size: this.calculateSize(compressedData)
      }

      switch (strategy) {
        case 'write-through':
          await this.writeThrough(key, entry, ttl)
          break
        case 'write-behind':
          await this.writeBehind(key, entry, ttl)
          break
        case 'cache-aside':
          await this.cacheAside(key, entry, ttl)
          break
      }

      this.stats.sets++
      this.stats.size += entry.size
    } catch (error) {
      console.error('Cache set error:', error)
      throw error
    }
  }

  /**
   * 删除缓存
   */
  async delete(key: string): Promise<void> {
    try {
      // 从内存缓存删除
      const memoryEntry = this.memoryCache.get(key)
      if (memoryEntry) {
        this.stats.size -= memoryEntry.size
        this.memoryCache.delete(key)
      }

      // 从Cache API删除
      if (this.cacheApi) {
        await this.cacheApi.delete(key)
      }

      // 从KV存储删除
      await this.kvService.delete(key)

      this.stats.deletes++
    } catch (error) {
      console.error('Cache delete error:', error)
      throw error
    }
  }

  /**
   * 按标签批量删除缓存
   */
  async deleteByTags(tags: string[]): Promise<void> {
    try {
      // 内存缓存按标签删除
      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.tags.some(tag => tags.includes(tag))) {
          await this.delete(key)
        }
      }

      // KV存储按标签删除（通过前缀扫描）
      for (const tag of tags) {
        const keys = await this.kvService.list(`tag:${tag}:`)
        await Promise.all(keys.map(key => this.delete(key)))
      }
    } catch (error) {
      console.error('Cache delete by tags error:', error)
      throw error
    }
  }

  /**
   * 缓存预热
   */
  async warmup(
    keys: Array<{
      key: string
      fetcher: () => Promise<any>
      options?: CacheOptions
    }>
  ): Promise<void> {
    try {
      const warmupPromises = keys.map(async ({ key, fetcher, options }) => {
        const cached = await this.get(key)
        if (!cached) {
          const data = await fetcher()
          await this.set(key, data, options)
        }
      })

      await Promise.all(warmupPromises)
    } catch (error) {
      console.error('Cache warmup error:', error)
      throw error
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    return { ...this.stats }
  }

  /**
   * 清理过期缓存
   */
  async cleanup(): Promise<void> {
    try {
      // 清理内存缓存
      for (const [key, entry] of this.memoryCache.entries()) {
        if (this.isExpired(entry)) {
          this.stats.size -= entry.size
          this.memoryCache.delete(key)
        }
      }

      // 内存使用超限时清理最老的条目
      if (this.stats.size > this.maxMemorySize) {
        await this.evictLRU()
      }
    } catch (error) {
      console.error('Cache cleanup error:', error)
    }
  }

  // 私有方法

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0
  }

  private compressData<T>(data: T): T {
    // 简单的JSON压缩，实际项目中可以使用gzip等
    if (typeof data === 'string' && data.length > 1000) {
      return JSON.stringify(data) as T
    }
    return data
  }

  private decompressData<T>(data: T, compressed: boolean): T {
    if (compressed && typeof data === 'string') {
      try {
        return JSON.parse(data as string)
      } catch {
        return data
      }
    }
    return data
  }

  private calculateSize(data: any): number {
    return JSON.stringify(data).length * 2 // 粗略估算字节大小
  }

  private setMemoryCache<T>(key: string, entry: CacheEntry<T>): void {
    if (this.stats.size + entry.size <= this.maxMemorySize) {
      this.memoryCache.set(key, entry)
    }
  }

  private async setCacheApi<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    if (this.cacheApi) {
      const response = new Response(JSON.stringify(entry), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `max-age=${Math.floor(entry.ttl / 1000)}`
        }
      })
      await this.cacheApi.put(key, response)
    }
  }

  private async writeThrough<T>(
    key: string,
    entry: CacheEntry<T>,
    ttl: number
  ): Promise<void> {
    // 同时写入所有层级
    this.setMemoryCache(key, entry)

    if (this.cacheApi) {
      await this.setCacheApi(key, entry)
    }

    await this.kvService.set(key, entry, { expirationTtl: ttl })
  }

  private async writeBehind<T>(
    key: string,
    entry: CacheEntry<T>,
    ttl: number
  ): Promise<void> {
    // 立即写入内存，异步写入其他层级
    this.setMemoryCache(key, entry)

    // 异步写入
    Promise.all([
      this.cacheApi ? this.setCacheApi(key, entry) : Promise.resolve(),
      this.kvService.set(key, entry, { expirationTtl: ttl })
    ]).catch(error => {
      console.error('Write behind error:', error)
    })
  }

  private async cacheAside<T>(
    key: string,
    entry: CacheEntry<T>,
    ttl: number
  ): Promise<void> {
    // 只写入KV存储，其他层级按需填充
    await this.kvService.set(key, entry, { expirationTtl: ttl })
  }

  private async evictLRU(): Promise<void> {
    // 按时间戳排序，删除最老的条目
    const entries = Array.from(this.memoryCache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp)

    let removedSize = 0
    const targetSize = this.maxMemorySize * 0.8 // 清理到80%

    for (const [key, entry] of entries) {
      if (this.stats.size - removedSize <= targetSize) break

      this.memoryCache.delete(key)
      removedSize += entry.size
    }

    this.stats.size -= removedSize
  }
}

/**
 * 缓存装饰器工厂
 */
export function cached(options: CacheOptions & { keyGenerator?: (...args: any[]) => string }) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const cacheService = this.cacheService as CacheService
      if (!cacheService) {
        return method.apply(this, args)
      }

      const key = options.keyGenerator
        ? options.keyGenerator(...args)
        : `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`

      const cached = await cacheService.get(key)
      if (cached !== null) {
        return cached
      }

      const result = await method.apply(this, args)
      await cacheService.set(key, result, options)
      return result
    }

    return descriptor
  }
}