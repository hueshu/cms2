import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { Hono } from 'hono'
import { domainsRoutes } from '../domains'
import { DatabaseService, KVService } from '../../utils/database'
import { DomainService } from '../../services/domainService'

// Mock dependencies
vi.mock('../../utils/database')
vi.mock('../../services/domainService')
vi.mock('../../middleware/validation', () => ({
  validateBody: (schema: any) => (c: any, next: any) => {
    c.set('validatedData', c.req.json())
    return next()
  },
  validateQuery: (schema: any) => (c: any, next: any) => {
    c.set('validatedQuery', c.req.query())
    return next()
  }
}))
vi.mock('../../middleware/tenant', () => ({
  tenantMiddleware: (c: any, next: any) => next()
}))

describe('Domains API', () => {
  let app: Hono
  let mockDomainService: vi.Mocked<DomainService>

  beforeEach(() => {
    app = new Hono()
    app.route('/', domainsRoutes)

    // Create mock service instance
    mockDomainService = {
      createDomain: vi.fn(),
      getDomainById: vi.fn(),
      getDomainByName: vi.fn(),
      getDomainsBySiteId: vi.fn(),
      updateDomain: vi.fn(),
      deleteDomain: vi.fn(),
      verifyDomain: vi.fn(),
      getDomainVerificationLogs: vi.fn(),
      getCloudflareSSLInfo: vi.fn(),
    } as any

    // Mock DomainService constructor
    vi.mocked(DomainService).mockImplementation(() => mockDomainService)

    // Mock environment
    app.use('*', async (c, next) => {
      c.env = {
        DB: {} as any,
        CACHE_KV: {} as any,
        CLOUDFLARE_API_TOKEN: 'test-token',
        CLOUDFLARE_API_EMAIL: 'test@example.com'
      }
      await next()
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /:siteId - Get domains for site', () => {
    test('should return paginated domains', async () => {
      const mockResponse = {
        data: [
          {
            id: 'domain-1',
            site_id: 'site-1',
            domain: 'example.com',
            is_primary: true,
            verification_status: 'verified',
            ssl_status: 'active'
          },
          {
            id: 'domain-2',
            site_id: 'site-1',
            domain: 'test.example.com',
            is_primary: false,
            verification_status: 'pending',
            ssl_status: 'pending'
          }
        ],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1
      }

      mockDomainService.getDomainsBySiteId.mockResolvedValueOnce(mockResponse)

      const res = await app.request('/site-1?page=1&limit=20')

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockResponse.data)
      expect(data.meta.pagination.total).toBe(2)
    })
  })

  describe('POST / - Create domain', () => {
    test('should create new domain successfully', async () => {
      const mockDomain = {
        id: 'domain-1',
        site_id: 'site-1',
        domain: 'newdomain.com',
        is_primary: false,
        verification_status: 'pending',
        verification_method: 'dns',
        verification_token: 'test-token',
        ssl_status: 'pending',
        dns_configured: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      const createInput = {
        site_id: 'site-1',
        domain: 'newdomain.com',
        is_primary: false,
        verification_method: 'dns'
      }

      mockDomainService.createDomain.mockResolvedValueOnce(mockDomain)

      const res = await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createInput)
      })

      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockDomain)
      expect(mockDomainService.createDomain).toHaveBeenCalledWith(createInput)
    })

    test('should handle domain creation conflict', async () => {
      const createInput = {
        site_id: 'site-1',
        domain: 'existing.com'
      }

      mockDomainService.createDomain.mockRejectedValueOnce(
        new Error('Domain already exists')
      )

      const res = await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createInput)
      })

      expect(res.status).toBe(500) // Error middleware should handle this
    })
  })

  describe('GET /:siteId/:domainId - Get domain by ID', () => {
    test('should return specific domain', async () => {
      const mockDomain = {
        id: 'domain-1',
        site_id: 'site-1',
        domain: 'example.com',
        is_primary: true,
        verification_status: 'verified',
        ssl_status: 'active'
      }

      mockDomainService.getDomainById.mockResolvedValueOnce(mockDomain)

      const res = await app.request('/site-1/domain-1')

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockDomain)
      expect(mockDomainService.getDomainById).toHaveBeenCalledWith('domain-1')
    })

    test('should handle domain not found', async () => {
      mockDomainService.getDomainById.mockRejectedValueOnce(
        new Error('Domain not found')
      )

      const res = await app.request('/site-1/non-existent')

      expect(res.status).toBe(500) // Error middleware should handle this
    })
  })

  describe('PUT /:siteId/:domainId - Update domain', () => {
    test('should update domain successfully', async () => {
      const updateInput = {
        is_primary: true,
        ssl_status: 'active' as const
      }

      const updatedDomain = {
        id: 'domain-1',
        site_id: 'site-1',
        domain: 'example.com',
        is_primary: true,
        ssl_status: 'active',
        updated_at: '2024-01-01T01:00:00Z'
      }

      mockDomainService.updateDomain.mockResolvedValueOnce(updatedDomain)

      const res = await app.request('/site-1/domain-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateInput)
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data).toEqual(updatedDomain)
      expect(mockDomainService.updateDomain).toHaveBeenCalledWith('domain-1', updateInput)
    })
  })

  describe('DELETE /:siteId/:domainId - Delete domain', () => {
    test('should delete domain successfully', async () => {
      mockDomainService.deleteDomain.mockResolvedValueOnce(undefined)

      const res = await app.request('/site-1/domain-1', {
        method: 'DELETE'
      })

      expect(res.status).toBe(204)
      expect(mockDomainService.deleteDomain).toHaveBeenCalledWith('domain-1')
    })
  })

  describe('POST /:siteId/:domainId/verify - Verify domain', () => {
    test('should verify domain successfully', async () => {
      const verificationResult = {
        domain: 'example.com',
        verification_status: 'verified' as const,
        ssl_status: 'active' as const,
        dns_configured: true,
        verification_details: {
          dns_records: [
            {
              name: '_cms-verification.example.com',
              type: 'TXT',
              value: 'test-token',
              status: 'valid' as const
            }
          ],
          ssl_certificate: {
            valid: true,
            expires_at: '2024-12-31T23:59:59Z',
            issuer: "Let's Encrypt"
          }
        }
      }

      mockDomainService.verifyDomain.mockResolvedValueOnce(verificationResult)

      const res = await app.request('/site-1/domain-1/verify', {
        method: 'POST'
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data).toEqual(verificationResult)
      expect(mockDomainService.verifyDomain).toHaveBeenCalledWith('domain-1')
    })

    test('should handle verification failure', async () => {
      const verificationResult = {
        domain: 'example.com',
        verification_status: 'failed' as const,
        ssl_status: 'failed' as const,
        dns_configured: false,
        error_message: 'DNS verification failed'
      }

      mockDomainService.verifyDomain.mockResolvedValueOnce(verificationResult)

      const res = await app.request('/site-1/domain-1/verify', {
        method: 'POST'
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.verification_status).toBe('failed')
      expect(data.data.error_message).toBe('DNS verification failed')
    })
  })

  describe('GET /:siteId/:domainId/logs - Get verification logs', () => {
    test('should return verification logs', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          domain_id: 'domain-1',
          verification_type: 'dns_check',
          status: 'success',
          details: { dns_configured: true },
          checked_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'log-2',
          domain_id: 'domain-1',
          verification_type: 'ssl_check',
          status: 'success',
          details: { ssl_valid: true },
          checked_at: '2024-01-01T00:01:00Z'
        }
      ]

      mockDomainService.getDomainVerificationLogs.mockResolvedValueOnce(mockLogs)

      const res = await app.request('/site-1/domain-1/logs?limit=5')

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockLogs)
      expect(mockDomainService.getDomainVerificationLogs).toHaveBeenCalledWith('domain-1', 5)
    })
  })

  describe('GET /:siteId/:domainId/ssl - Get SSL information', () => {
    test('should return SSL information', async () => {
      const mockDomain = {
        id: 'domain-1',
        domain: 'example.com'
      }

      const mockSSLInfo = {
        status: 'active' as const,
        certificate_authority: 'lets_encrypt',
        type: 'advanced',
        method: 'http',
        hosts: ['example.com'],
        expires_on: '2024-12-31T23:59:59Z',
        issuer: 'R3',
        serial_number: '123456789',
        signature: 'sha256',
        bundle_method: 'ubiquitous'
      }

      mockDomainService.getDomainById.mockResolvedValueOnce(mockDomain)
      mockDomainService.getCloudflareSSLInfo.mockResolvedValueOnce(mockSSLInfo)

      const res = await app.request('/site-1/domain-1/ssl')

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockSSLInfo)
    })

    test('should handle SSL information error', async () => {
      const mockDomain = {
        id: 'domain-1',
        domain: 'example.com'
      }

      mockDomainService.getDomainById.mockResolvedValueOnce(mockDomain)
      mockDomainService.getCloudflareSSLInfo.mockRejectedValueOnce(
        new Error('SSL certificate not found')
      )

      const res = await app.request('/site-1/domain-1/ssl')

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('SSL_INFO_ERROR')
    })
  })

  describe('GET /resolve/:domain - Resolve domain to site', () => {
    test('should resolve domain to site successfully', async () => {
      const mockDomain = {
        id: 'domain-1',
        site_id: 'site-1',
        domain: 'example.com',
        verification_status: 'verified'
      }

      const mockSite = {
        id: 'site-1',
        name: 'Example Site',
        domain: 'example.com',
        status: 'active'
      }

      mockDomainService.getDomainByName.mockResolvedValueOnce(mockDomain)

      // Mock database service for site lookup
      vi.mocked(DatabaseService).mockImplementation(() => ({
        executeOne: vi.fn().mockResolvedValueOnce(mockSite)
      } as any))

      const res = await app.request('/resolve/example.com')

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.domain).toEqual(mockDomain)
      expect(data.data.site).toEqual(mockSite)
      expect(data.data.resolved_at).toBeDefined()
    })

    test('should handle domain not found', async () => {
      mockDomainService.getDomainByName.mockRejectedValueOnce(
        new Error('Domain not found')
      )

      const res = await app.request('/resolve/nonexistent.com')

      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('DOMAIN_NOT_FOUND')
    })
  })

  describe('POST /batch-verify - Batch verify domains', () => {
    test('should batch verify domains successfully', async () => {
      const mockDomains = [
        { id: 'domain-1' },
        { id: 'domain-2' }
      ]

      const mockResults = [
        {
          domain_id: 'domain-1',
          status: 'verified',
          result: {
            domain: 'example1.com',
            verification_status: 'verified',
            ssl_status: 'active',
            dns_configured: true
          }
        },
        {
          domain_id: 'domain-2',
          status: 'failed',
          error: 'DNS verification failed'
        }
      ]

      // Mock database service for domain lookup
      vi.mocked(DatabaseService).mockImplementation(() => ({
        execute: vi.fn().mockResolvedValueOnce(mockDomains)
      } as any))

      mockDomainService.verifyDomain
        .mockResolvedValueOnce(mockResults[0].result as any)
        .mockRejectedValueOnce(new Error('DNS verification failed'))

      const res = await app.request('/batch-verify', {
        method: 'POST'
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.total_processed).toBe(2)
      expect(data.data.results).toHaveLength(2)
      expect(data.data.results[0].status).toBe('verified')
      expect(data.data.results[1].status).toBe('failed')
    })
  })
})