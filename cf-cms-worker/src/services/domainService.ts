import { DatabaseService, KVService } from '../utils/database'
import {
  Domain,
  DomainVerificationLog,
  CreateDomainInput,
  UpdateDomainInput,
  DomainVerificationResult,
  CloudflareZoneInfo,
  CloudflareDNSRecord,
  DomainSSLInfo,
  PaginationParams,
  PaginatedResponse
} from '../models/types'
import {
  databaseError,
  notFoundError,
  conflictError,
  validationError
} from '../middleware/error'

export class DomainService {
  constructor(
    private db: DatabaseService,
    private kv: KVService,
    private cloudflareApiToken?: string,
    private cloudflareApiEmail?: string
  ) {}

  // 创建新域名
  async createDomain(input: CreateDomainInput): Promise<Domain> {
    try {
      // 验证域名格式
      if (!this.isValidDomain(input.domain)) {
        throw validationError('Invalid domain format')
      }

      // 检查域名是否已存在
      const existing = await this.db.executeOne<Domain>(
        'SELECT * FROM domains WHERE domain = ?',
        [input.domain]
      )

      if (existing) {
        throw conflictError('Domain', 'domain', input.domain)
      }

      // 如果设置为主域名，需要将其他主域名设置为非主域名
      if (input.is_primary) {
        await this.db.executeRun(
          'UPDATE domains SET is_primary = FALSE WHERE site_id = ? AND is_primary = TRUE',
          [input.site_id]
        )
      }

      const domainId = this.db.generateId()
      const verificationToken = this.generateVerificationToken()
      const now = new Date().toISOString()

      const domain: Domain = {
        id: domainId,
        site_id: input.site_id,
        domain: input.domain,
        is_primary: input.is_primary || false,
        verification_status: 'pending',
        verification_method: input.verification_method || 'dns',
        verification_token: verificationToken,
        verification_record: this.generateDNSVerificationRecord(input.domain, verificationToken),
        ssl_status: 'pending',
        dns_configured: false,
        created_at: now,
        updated_at: now
      }

      await this.db.executeRun(
        `INSERT INTO domains (
          id, site_id, domain, is_primary, verification_status, verification_method,
          verification_token, verification_record, ssl_status, dns_configured,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          domain.id,
          domain.site_id,
          domain.domain,
          domain.is_primary,
          domain.verification_status,
          domain.verification_method,
          domain.verification_token,
          domain.verification_record,
          domain.ssl_status,
          domain.dns_configured,
          domain.created_at,
          domain.updated_at
        ]
      )

      // 缓存域名数据
      await this.kv.set(
        this.kv.cacheKey('domain', domainId),
        domain,
        { expirationTtl: 3600 }
      )

      return domain
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE')) {
        throw conflictError('Domain', 'domain', input.domain)
      }
      throw error
    }
  }

  // 通过ID获取域名
  async getDomainById(domainId: string): Promise<Domain> {
    // 尝试从缓存获取
    const cached = await this.kv.get<Domain>(
      this.kv.cacheKey('domain', domainId)
    )
    if (cached) return cached

    const domain = await this.db.executeOne<Domain>(
      'SELECT * FROM domains WHERE id = ?',
      [domainId]
    )

    if (!domain) {
      throw notFoundError('Domain', domainId)
    }

    // 更新缓存
    await this.kv.set(
      this.kv.cacheKey('domain', domainId),
      domain,
      { expirationTtl: 3600 }
    )

    return domain
  }

  // 通过域名获取域名记录
  async getDomainByName(domainName: string): Promise<Domain> {
    const domain = await this.db.executeOne<Domain>(
      'SELECT * FROM domains WHERE domain = ?',
      [domainName]
    )

    if (!domain) {
      throw notFoundError('Domain with name', domainName)
    }

    return domain
  }

  // 获取网站的所有域名
  async getDomainsBySiteId(siteId: string, params: PaginationParams = {}): Promise<PaginatedResponse<Domain>> {
    const { page = 1, limit = 20, sort = 'desc', sortBy = 'created_at' } = params
    const offset = (page - 1) * limit

    // 获取总数
    const countResult = await this.db.executeOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM domains WHERE site_id = ?',
      [siteId]
    )
    const total = countResult?.count || 0

    // 获取分页域名
    const domains = await this.db.execute<Domain>(
      `SELECT * FROM domains
       WHERE site_id = ?
       ORDER BY ${sortBy} ${sort.toUpperCase()}
       LIMIT ? OFFSET ?`,
      [siteId, limit, offset]
    )

    return {
      data: domains,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  // 更新域名
  async updateDomain(domainId: string, input: UpdateDomainInput): Promise<Domain> {
    const existing = await this.getDomainById(domainId)

    const updates: string[] = []
    const values: any[] = []

    // 如果设置为主域名，需要将其他主域名设置为非主域名
    if (input.is_primary === true) {
      await this.db.executeRun(
        'UPDATE domains SET is_primary = FALSE WHERE site_id = ? AND is_primary = TRUE AND id != ?',
        [existing.site_id, domainId]
      )
    }

    if (input.is_primary !== undefined) {
      updates.push('is_primary = ?')
      values.push(input.is_primary)
    }

    if (input.verification_method !== undefined) {
      updates.push('verification_method = ?')
      values.push(input.verification_method)
    }

    if (input.ssl_status !== undefined) {
      updates.push('ssl_status = ?')
      values.push(input.ssl_status)
    }

    if (input.dns_configured !== undefined) {
      updates.push('dns_configured = ?')
      values.push(input.dns_configured)
    }

    if (updates.length === 0) {
      return existing
    }

    updates.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(domainId)

    await this.db.executeRun(
      `UPDATE domains SET ${updates.join(', ')} WHERE id = ?`,
      values
    )

    // 清除缓存
    await this.kv.delete(this.kv.cacheKey('domain', domainId))

    return this.getDomainById(domainId)
  }

  // 删除域名
  async deleteDomain(domainId: string): Promise<void> {
    const domain = await this.getDomainById(domainId)

    await this.db.executeRun(
      'DELETE FROM domains WHERE id = ?',
      [domainId]
    )

    // 清除缓存
    await this.kv.delete(this.kv.cacheKey('domain', domainId))
  }

  // 验证域名
  async verifyDomain(domainId: string): Promise<DomainVerificationResult> {
    const domain = await this.getDomainById(domainId)

    const result: DomainVerificationResult = {
      domain: domain.domain,
      verification_status: 'pending',
      ssl_status: 'pending',
      dns_configured: false,
      verification_details: {}
    }

    try {
      // DNS验证
      const dnsResult = await this.verifyDNSConfiguration(domain)
      result.verification_details.dns_records = dnsResult.dns_records
      result.dns_configured = dnsResult.is_configured

      // SSL验证
      const sslResult = await this.verifySSLCertificate(domain.domain)
      result.verification_details.ssl_certificate = sslResult
      result.ssl_status = sslResult.valid ? 'active' : 'failed'

      // Cloudflare集成验证
      if (this.cloudflareApiToken) {
        const cfResult = await this.verifyCloudflareConfiguration(domain.domain)
        result.verification_details.cloudflare_zone = cfResult
      }

      // 综合判断验证状态
      result.verification_status = this.determineVerificationStatus(result)

      // 更新域名状态
      await this.updateDomainVerificationStatus(domainId, result)

      // 记录验证日志
      await this.logVerificationResult(domainId, 'dns_check', result)

      return result
    } catch (error) {
      result.verification_status = 'failed'
      result.error_message = error instanceof Error ? error.message : 'Unknown error'

      // 记录失败日志
      await this.logVerificationResult(domainId, 'dns_check', result)

      return result
    }
  }

  // DNS配置验证
  private async verifyDNSConfiguration(domain: Domain): Promise<{
    dns_records: Array<{ name: string; type: string; value: string; status: 'valid' | 'invalid' | 'missing' }>;
    is_configured: boolean;
  }> {
    const records = []
    let isConfigured = true

    try {
      // 验证TXT记录（用于域名验证）
      if (domain.verification_token && domain.verification_method === 'dns') {
        const txtRecord = await this.lookupDNSRecord(domain.domain, 'TXT')
        const hasVerificationRecord = txtRecord.some(record =>
          record.includes(domain.verification_token!)
        )

        records.push({
          name: `_cms-verification.${domain.domain}`,
          type: 'TXT',
          value: domain.verification_token,
          status: hasVerificationRecord ? 'valid' : 'missing'
        })

        if (!hasVerificationRecord) {
          isConfigured = false
        }
      }

      // 验证A记录或CNAME记录
      const aRecords = await this.lookupDNSRecord(domain.domain, 'A')
      const cnameRecords = await this.lookupDNSRecord(domain.domain, 'CNAME')

      if (aRecords.length > 0) {
        records.push({
          name: domain.domain,
          type: 'A',
          value: aRecords[0],
          status: 'valid'
        })
      } else if (cnameRecords.length > 0) {
        records.push({
          name: domain.domain,
          type: 'CNAME',
          value: cnameRecords[0],
          status: 'valid'
        })
      } else {
        records.push({
          name: domain.domain,
          type: 'A',
          value: 'Required',
          status: 'missing'
        })
        isConfigured = false
      }

      return { dns_records: records, is_configured: isConfigured }
    } catch (error) {
      return { dns_records: records, is_configured: false }
    }
  }

  // SSL证书验证
  private async verifySSLCertificate(domain: string): Promise<{
    valid: boolean;
    expires_at?: string;
    issuer?: string;
  }> {
    try {
      // 发起HTTPS请求验证SSL证书
      const response = await fetch(`https://${domain}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      })

      // 如果请求成功，说明SSL证书有效
      if (response.ok) {
        return {
          valid: true,
          // 注意：在Cloudflare Workers环境中无法直接获取证书详细信息
          issuer: 'Unknown'
        }
      } else {
        return { valid: false }
      }
    } catch (error) {
      return { valid: false }
    }
  }

  // Cloudflare配置验证
  private async verifyCloudflareConfiguration(domain: string): Promise<{
    id: string;
    status: string;
    name_servers?: string[];
  }> {
    if (!this.cloudflareApiToken) {
      throw new Error('Cloudflare API token not configured')
    }

    try {
      const zone = await this.getCloudflareZone(domain)
      return {
        id: zone.id,
        status: zone.status,
        name_servers: zone.name_servers
      }
    } catch (error) {
      throw new Error(`Cloudflare verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // 获取Cloudflare Zone信息
  private async getCloudflareZone(domain: string): Promise<CloudflareZoneInfo> {
    const response = await fetch(`https://api.cloudflare.com/client/v4/zones?name=${domain}`, {
      headers: {
        'Authorization': `Bearer ${this.cloudflareApiToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Cloudflare API error: ${response.status}`)
    }

    const data = await response.json() as any
    if (!data.success || data.result.length === 0) {
      throw new Error('Zone not found in Cloudflare')
    }

    return data.result[0]
  }

  // 获取Cloudflare SSL信息
  async getCloudflareSSLInfo(domain: string): Promise<DomainSSLInfo> {
    const zone = await this.getCloudflareZone(domain)

    const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zone.id}/ssl/certificate_packs`, {
      headers: {
        'Authorization': `Bearer ${this.cloudflareApiToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Cloudflare SSL API error: ${response.status}`)
    }

    const data = await response.json() as any
    if (!data.success || data.result.length === 0) {
      throw new Error('SSL certificate not found')
    }

    const cert = data.result[0]
    return {
      status: cert.status,
      certificate_authority: cert.certificate_authority,
      type: cert.type,
      method: cert.validation_method,
      hosts: cert.hosts,
      uploaded_on: cert.uploaded_on,
      expires_on: cert.expires_on,
      issuer: cert.issuer,
      serial_number: cert.serial_number,
      signature: cert.signature,
      bundle_method: cert.bundle_method
    }
  }

  // DNS查询
  private async lookupDNSRecord(domain: string, type: string): Promise<string[]> {
    try {
      // 使用Cloudflare的DoH API进行DNS查询
      const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=${type}`, {
        headers: {
          'Accept': 'application/dns-json'
        }
      })

      if (!response.ok) {
        return []
      }

      const data = await response.json() as any
      if (data.Answer) {
        return data.Answer.map((answer: any) => answer.data)
      }

      return []
    } catch (error) {
      return []
    }
  }

  // 更新域名验证状态
  private async updateDomainVerificationStatus(domainId: string, result: DomainVerificationResult): Promise<void> {
    const updates: string[] = []
    const values: any[] = []

    updates.push('verification_status = ?')
    values.push(result.verification_status)

    updates.push('ssl_status = ?')
    values.push(result.ssl_status)

    updates.push('dns_configured = ?')
    values.push(result.dns_configured)

    if (result.verification_status === 'verified') {
      updates.push('verified_at = ?')
      values.push(new Date().toISOString())
    }

    updates.push('updated_at = ?')
    values.push(new Date().toISOString())

    values.push(domainId)

    await this.db.executeRun(
      `UPDATE domains SET ${updates.join(', ')} WHERE id = ?`,
      values
    )

    // 清除缓存
    await this.kv.delete(this.kv.cacheKey('domain', domainId))
  }

  // 记录验证日志
  private async logVerificationResult(domainId: string, verificationType: string, result: DomainVerificationResult): Promise<void> {
    const logId = this.db.generateId()
    const status = result.verification_status === 'verified' ? 'success' : 'failed'

    await this.db.executeRun(
      `INSERT INTO domain_verification_logs (
        id, domain_id, verification_type, status, details, error_message, checked_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        logId,
        domainId,
        verificationType,
        status,
        JSON.stringify(result.verification_details),
        result.error_message || null,
        new Date().toISOString()
      ]
    )
  }

  // 获取域名验证日志
  async getDomainVerificationLogs(domainId: string, limit: number = 10): Promise<DomainVerificationLog[]> {
    return await this.db.execute<DomainVerificationLog>(
      `SELECT * FROM domain_verification_logs
       WHERE domain_id = ?
       ORDER BY checked_at DESC
       LIMIT ?`,
      [domainId, limit]
    )
  }

  // 工具方法：验证域名格式
  private isValidDomain(domain: string): boolean {
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    return domainRegex.test(domain) && domain.length <= 253
  }

  // 工具方法：生成验证令牌
  private generateVerificationToken(): string {
    return 'cms-verify-' + Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  // 工具方法：生成DNS验证记录
  private generateDNSVerificationRecord(domain: string, token: string): string {
    return `_cms-verification.${domain}. TXT "${token}"`
  }

  // 工具方法：判断综合验证状态
  private determineVerificationStatus(result: DomainVerificationResult): 'verified' | 'failed' | 'pending' {
    // 如果DNS已配置且SSL有效，则认为验证成功
    if (result.dns_configured && result.ssl_status === 'active') {
      return 'verified'
    }

    // 如果有明确错误或SSL失败，则认为验证失败
    if (result.error_message || result.ssl_status === 'failed') {
      return 'failed'
    }

    // 其他情况认为是待验证
    return 'pending'
  }
}