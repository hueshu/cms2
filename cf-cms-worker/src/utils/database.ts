import { D1Database } from '@cloudflare/workers-types'
import { v4 as uuidv4 } from 'uuid'

export class DatabaseService {
  constructor(private db: D1Database) {}

  // Generate unique ID
  generateId(): string {
    return uuidv4()
  }

  // Generate slug from text
  generateSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[\s\W-]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  // Execute query with error handling
  async execute<T>(query: string, params: any[] = []): Promise<T[]> {
    try {
      const result = await this.db.prepare(query).bind(...params).all()
      return result.results as T[]
    } catch (error) {
      console.error('Database query error:', error)
      throw new Error('Database operation failed')
    }
  }

  // Execute single query
  async executeOne<T>(query: string, params: any[] = []): Promise<T | null> {
    try {
      const result = await this.db.prepare(query).bind(...params).first()
      return result as T | null
    } catch (error) {
      console.error('Database query error:', error)
      throw new Error('Database operation failed')
    }
  }

  // Execute insert/update/delete
  async executeRun(query: string, params: any[] = []): Promise<D1Result> {
    try {
      return await this.db.prepare(query).bind(...params).run()
    } catch (error) {
      console.error('Database execution error:', error)
      throw new Error('Database operation failed')
    }
  }

  // Batch execute for transactions
  async batch(statements: D1PreparedStatement[]): Promise<D1Result[]> {
    try {
      return await this.db.batch(statements)
    } catch (error) {
      console.error('Database batch error:', error)
      throw new Error('Database batch operation failed')
    }
  }

  // Initialize database with schema
  async initializeDatabase(): Promise<void> {
    const schema = await fetch('/schema.sql').then(res => res.text())
    const statements = schema
      .split(';')
      .filter(stmt => stmt.trim())
      .map(stmt => this.db.prepare(stmt))

    await this.batch(statements)
  }
}

// KV Storage utilities
export class KVService {
  constructor(private kv: KVNamespace) {}

  // Generate cache key
  cacheKey(prefix: string, ...parts: string[]): string {
    return [prefix, ...parts].join(':')
  }

  // Get with JSON parse
  async get<T>(key: string): Promise<T | null> {
    const value = await this.kv.get(key)
    if (!value) return null
    try {
      return JSON.parse(value) as T
    } catch {
      return value as T
    }
  }

  // Set with JSON stringify
  async set(key: string, value: any, options?: KVNamespacePutOptions): Promise<void> {
    const data = typeof value === 'string' ? value : JSON.stringify(value)
    await this.kv.put(key, data, options)
  }

  // Delete key
  async delete(key: string): Promise<void> {
    await this.kv.delete(key)
  }

  // List keys with prefix
  async list(prefix: string, limit = 1000): Promise<string[]> {
    const result = await this.kv.list({ prefix, limit })
    return result.keys.map(key => key.name)
  }

  // Cache with TTL
  async cache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl = 3600
  ): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached) return cached

    const data = await fetcher()
    await this.set(key, data, { expirationTtl: ttl })
    return data
  }

  // Invalidate cache by pattern
  async invalidate(pattern: string): Promise<void> {
    const keys = await this.list(pattern)
    await Promise.all(keys.map(key => this.delete(key)))
  }
}