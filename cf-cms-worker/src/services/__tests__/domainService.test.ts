import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { DomainService } from '../domainService'
import { DatabaseService, KVService } from '../../utils/database'
import { CreateDomainInput, UpdateDomainInput } from '../../models/types'

// Mock external dependencies
vi.mock('../../utils/database')

// Mock fetch for DNS and SSL validation
global.fetch = vi.fn()

describe('DomainService', () => {
  let domainService: DomainService
  let mockDb: vi.Mocked<DatabaseService>
  let mockKv: vi.Mocked<KVService>

  beforeEach(() => {
    // Create mocked instances
    mockDb = {
      executeOne: vi.fn(),
      execute: vi.fn(),
      executeRun: vi.fn(),
      generateId: vi.fn().mockReturnValue('test-domain-id'),
    } as any

    mockKv = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      invalidate: vi.fn(),
      cacheKey: vi.fn().mockImplementation((prefix, id) => `${prefix}:${id}`),
    } as any

    domainService = new DomainService(
      mockDb,
      mockKv,
      'test-cloudflare-token',
      'test@example.com'
    )

    // Reset fetch mock
    vi.mocked(fetch).mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('createDomain', () => {
    test('should create a new domain successfully', async () => {
      const input: CreateDomainInput = {
        site_id: 'test-site-id',
        domain: 'example.com',
        is_primary: true,
        verification_method: 'dns'
      }

      // Mock database responses
      mockDb.executeOne.mockResolvedValueOnce(null) // Domain doesn't exist
      mockDb.executeRun.mockResolvedValueOnce(undefined) // Update primary domains
      mockDb.executeRun.mockResolvedValueOnce(undefined) // Insert new domain
      mockKv.set.mockResolvedValueOnce(undefined)

      const result = await domainService.createDomain(input)

      expect(result).toMatchObject({
        id: 'test-domain-id',
        site_id: input.site_id,
        domain: input.domain,
        is_primary: input.is_primary,
        verification_status: 'pending',
        verification_method: input.verification_method,
        ssl_status: 'pending',
        dns_configured: false
      })

      expect(mockDb.executeOne).toHaveBeenCalledWith(
        'SELECT * FROM domains WHERE domain = ?',
        [input.domain]
      )

      expect(mockDb.executeRun).toHaveBeenCalledWith(
        'UPDATE domains SET is_primary = FALSE WHERE site_id = ? AND is_primary = TRUE',
        [input.site_id]
      )
    })

    test('should throw conflict error if domain already exists', async () => {
      const input: CreateDomainInput = {
        site_id: 'test-site-id',
        domain: 'example.com'
      }

      mockDb.executeOne.mockResolvedValueOnce({
        id: 'existing-domain-id',
        domain: 'example.com'
      }) // Domain already exists

      await expect(domainService.createDomain(input)).rejects.toThrow()
    })

    test('should throw validation error for invalid domain format', async () => {
      const input: CreateDomainInput = {
        site_id: 'test-site-id',
        domain: 'invalid-domain-format'
      }

      await expect(domainService.createDomain(input)).rejects.toThrow('Invalid domain format')
    })
  })

  describe('getDomainById', () => {
    test('should return domain from cache if available', async () => {
      const mockDomain = {
        id: 'test-domain-id',
        domain: 'example.com',
        site_id: 'test-site-id'
      }

      mockKv.get.mockResolvedValueOnce(mockDomain)

      const result = await domainService.getDomainById('test-domain-id')

      expect(result).toEqual(mockDomain)
      expect(mockKv.get).toHaveBeenCalledWith('domain:test-domain-id')
      expect(mockDb.executeOne).not.toHaveBeenCalled()
    })

    test('should fetch from database and cache if not in cache', async () => {
      const mockDomain = {
        id: 'test-domain-id',
        domain: 'example.com',
        site_id: 'test-site-id'
      }

      mockKv.get.mockResolvedValueOnce(null) // Not in cache
      mockDb.executeOne.mockResolvedValueOnce(mockDomain)
      mockKv.set.mockResolvedValueOnce(undefined)

      const result = await domainService.getDomainById('test-domain-id')

      expect(result).toEqual(mockDomain)
      expect(mockKv.set).toHaveBeenCalledWith(
        'domain:test-domain-id',
        mockDomain,
        { expirationTtl: 3600 }
      )
    })

    test('should throw not found error if domain does not exist', async () => {
      mockKv.get.mockResolvedValueOnce(null)
      mockDb.executeOne.mockResolvedValueOnce(null)

      await expect(domainService.getDomainById('non-existent-id')).rejects.toThrow()
    })
  })

  describe('updateDomain', () => {
    test('should update domain successfully', async () => {
      const existingDomain = {
        id: 'test-domain-id',
        site_id: 'test-site-id',
        domain: 'example.com',
        is_primary: false
      }

      const updateInput: UpdateDomainInput = {
        is_primary: true,
        ssl_status: 'active'
      }

      mockKv.get.mockResolvedValueOnce(existingDomain)
      mockDb.executeRun.mockResolvedValueOnce(undefined) // Update primary domains
      mockDb.executeRun.mockResolvedValueOnce(undefined) // Update domain
      mockKv.delete.mockResolvedValueOnce(undefined)
      mockKv.get.mockResolvedValueOnce(null) // For re-fetch after update
      mockDb.executeOne.mockResolvedValueOnce({
        ...existingDomain,
        ...updateInput
      })
      mockKv.set.mockResolvedValueOnce(undefined)

      const result = await domainService.updateDomain('test-domain-id', updateInput)

      expect(result.is_primary).toBe(true)
      expect(result.ssl_status).toBe('active')
      expect(mockKv.delete).toHaveBeenCalledWith('domain:test-domain-id')
    })
  })

  describe('verifyDomain', () => {
    test('should verify domain with successful DNS and SSL checks', async () => {
      const mockDomain = {
        id: 'test-domain-id',
        domain: 'example.com',
        site_id: 'test-site-id',
        verification_token: 'test-token',
        verification_method: 'dns' as const
      }

      mockKv.get.mockResolvedValueOnce(mockDomain)

      // Mock DNS lookup responses
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            Answer: [{ data: 'test-token' }]
          })
        } as any) // TXT record lookup
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            Answer: [{ data: '192.168.1.1' }]
          })
        } as any) // A record lookup
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            Answer: []
          })
        } as any) // CNAME record lookup
        .mockResolvedValueOnce({
          ok: true
        } as any) // SSL check

      // Mock database operations for status updates and logging
      mockDb.executeRun.mockResolvedValue(undefined)

      const result = await domainService.verifyDomain('test-domain-id')

      expect(result.verification_status).toBe('verified')
      expect(result.ssl_status).toBe('active')
      expect(result.dns_configured).toBe(true)
      expect(result.verification_details?.dns_records).toBeDefined()
      expect(result.verification_details?.ssl_certificate).toBeDefined()
    })

    test('should handle verification failure', async () => {
      const mockDomain = {
        id: 'test-domain-id',
        domain: 'example.com',
        site_id: 'test-site-id',
        verification_token: 'test-token',
        verification_method: 'dns' as const
      }

      mockKv.get.mockResolvedValueOnce(mockDomain)

      // Mock failed DNS lookup
      vi.mocked(fetch).mockRejectedValue(new Error('DNS lookup failed'))

      // Mock database operations
      mockDb.executeRun.mockResolvedValue(undefined)

      const result = await domainService.verifyDomain('test-domain-id')

      expect(result.verification_status).toBe('failed')
      expect(result.error_message).toContain('DNS lookup failed')
    })
  })

  describe('getDomainsBySiteId', () => {
    test('should return paginated domains for a site', async () => {
      const mockDomains = [
        { id: 'domain-1', domain: 'example.com', site_id: 'test-site-id' },
        { id: 'domain-2', domain: 'test.com', site_id: 'test-site-id' }
      ]

      mockDb.executeOne.mockResolvedValueOnce({ count: 2 })
      mockDb.execute.mockResolvedValueOnce(mockDomains)

      const result = await domainService.getDomainsBySiteId('test-site-id', {
        page: 1,
        limit: 10
      })

      expect(result.data).toEqual(mockDomains)
      expect(result.total).toBe(2)
      expect(result.page).toBe(1)
      expect(result.totalPages).toBe(1)
    })
  })

  describe('deleteDomain', () => {
    test('should delete domain successfully', async () => {
      const mockDomain = {
        id: 'test-domain-id',
        domain: 'example.com'
      }

      mockKv.get.mockResolvedValueOnce(mockDomain)
      mockDb.executeRun.mockResolvedValueOnce(undefined)
      mockKv.delete.mockResolvedValueOnce(undefined)

      await domainService.deleteDomain('test-domain-id')

      expect(mockDb.executeRun).toHaveBeenCalledWith(
        'DELETE FROM domains WHERE id = ?',
        ['test-domain-id']
      )
      expect(mockKv.delete).toHaveBeenCalledWith('domain:test-domain-id')
    })
  })

  describe('Cloudflare integration', () => {
    test('should get Cloudflare zone information', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          result: [{
            id: 'cf-zone-id',
            name: 'example.com',
            status: 'active',
            name_servers: ['ns1.cloudflare.com', 'ns2.cloudflare.com']
          }]
        })
      } as any)

      // Use reflection to test private method
      const zoneInfo = await (domainService as any).getCloudflareZone('example.com')

      expect(zoneInfo.id).toBe('cf-zone-id')
      expect(zoneInfo.name).toBe('example.com')
      expect(zoneInfo.status).toBe('active')
    })

    test('should get SSL information from Cloudflare', async () => {
      // Mock Cloudflare zone response
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            result: [{
              id: 'cf-zone-id',
              name: 'example.com'
            }]
          })
        } as any)
        // Mock SSL certificate response
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            result: [{
              status: 'active',
              certificate_authority: 'lets_encrypt',
              type: 'advanced',
              method: 'http',
              hosts: ['example.com'],
              expires_on: '2024-12-31T23:59:59Z',
              issuer: 'R3'
            }]
          })
        } as any)

      const sslInfo = await domainService.getCloudflareSSLInfo('example.com')

      expect(sslInfo.status).toBe('active')
      expect(sslInfo.certificate_authority).toBe('lets_encrypt')
      expect(sslInfo.hosts).toContain('example.com')
    })
  })

  describe('utility methods', () => {
    test('should validate domain format correctly', () => {
      // Use reflection to test private method
      const isValid = (domainService as any).isValidDomain

      expect(isValid('example.com')).toBe(true)
      expect(isValid('sub.example.com')).toBe(true)
      expect(isValid('valid-domain.co.uk')).toBe(true)
      expect(isValid('invalid_domain')).toBe(false)
      expect(isValid('example.com.')).toBe(false)
      expect(isValid('.example.com')).toBe(false)
      expect(isValid('example..com')).toBe(false)
    })

    test('should generate verification token', () => {
      const token = (domainService as any).generateVerificationToken()

      expect(token).toMatch(/^cms-verify-[a-f0-9]{32}$/)
    })

    test('should generate DNS verification record', () => {
      const record = (domainService as any).generateDNSVerificationRecord('example.com', 'test-token')

      expect(record).toBe('_cms-verification.example.com. TXT "test-token"')
    })
  })
})