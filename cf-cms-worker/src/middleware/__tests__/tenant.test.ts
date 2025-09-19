import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'
import { tenantMiddleware, optionalTenantMiddleware, getCurrentSiteId, getCurrentSite, validateSiteAccess } from '../tenant'
import type { Env } from '../../index'

// Mock services
const mockSiteService = {
  getSiteById: vi.fn()
}

const mockDbService = {
  generateId: vi.fn()
}

const mockKvService = {
  get: vi.fn(),
  set: vi.fn()
}

// Mock SiteService constructor
vi.mock('../../services/siteService', () => ({
  SiteService: vi.fn().mockImplementation(() => mockSiteService)
}))

vi.mock('../../utils/database', () => ({
  DatabaseService: vi.fn().mockImplementation(() => mockDbService),
  KVService: vi.fn().mockImplementation(() => mockKvService)
}))

// Test environment
const testEnv: Env = {
  DB: {} as any,
  CACHE_KV: {} as any,
  ENVIRONMENT: 'test',
  JWT_SECRET: 'test-secret'
}

// Test site data
const mockSite = {
  id: '12345678-1234-4123-8123-123456789abc',
  domain: 'example.com',
  name: 'Test Site',
  status: 'active',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z'
}

describe('Tenant Middleware', () => {
  let app: Hono<{ Bindings: Env }>

  beforeEach(() => {
    app = new Hono<{ Bindings: Env }>()
    vi.clearAllMocks()
  })

  describe('tenantMiddleware', () => {
    it('should extract siteId and validate site successfully', async () => {
      mockSiteService.getSiteById.mockResolvedValue(mockSite)

      app.use('/api/:siteId/*', tenantMiddleware)
      app.get('/api/:siteId/test', (c) => {
        return c.json({ siteId: getCurrentSiteId(c) })
      })

      const res = await app.request(
        `/api/${mockSite.id}/test`,
        {},
        testEnv
      )

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ siteId: mockSite.id })
      expect(mockSiteService.getSiteById).toHaveBeenCalledWith(mockSite.id)
    })

    it('should reject request without siteId', async () => {
      app.use('/api/*', tenantMiddleware)
      app.get('/api/test', (c) => c.json({ ok: true }))

      const res = await app.request('/api/test', {}, testEnv)

      expect(res.status).toBe(400)
      const body = await res.text()
      expect(body).toContain('Site ID is required in the request path')
    })

    it('should reject invalid UUID format', async () => {
      app.use('/api/:siteId/*', tenantMiddleware)
      app.get('/api/:siteId/test', (c) => c.json({ ok: true }))

      const res = await app.request('/api/invalid-uuid/test', {}, testEnv)

      expect(res.status).toBe(400)
      const body = await res.text()
      expect(body).toContain('Invalid site ID format. Must be a valid UUID v4')
    })

    it('should reject non-existent site', async () => {
      const error = new Error('Site not found')
      error.message = 'Site not found'
      mockSiteService.getSiteById.mockRejectedValue(error)

      app.use('/api/:siteId/*', tenantMiddleware)
      app.get('/api/:siteId/test', (c) => c.json({ ok: true }))

      const validUuid = '12345678-1234-4123-8123-123456789abc'
      const res = await app.request(`/api/${validUuid}/test`, {}, testEnv)

      expect(res.status).toBe(404)
      const body = await res.text()
      expect(body).toContain(`Site with ID ${validUuid} not found`)
    })

    it('should reject inactive site', async () => {
      const inactiveSite = { ...mockSite, status: 'inactive' }
      mockSiteService.getSiteById.mockResolvedValue(inactiveSite)

      app.use('/api/:siteId/*', tenantMiddleware)
      app.get('/api/:siteId/test', (c) => c.json({ ok: true }))

      const res = await app.request(`/api/${mockSite.id}/test`, {}, testEnv)

      expect(res.status).toBe(403)
      const body = await res.text()
      expect(body).toContain('Site is inactive. Only active sites are accessible')
    })

    it('should inject site data into context', async () => {
      mockSiteService.getSiteById.mockResolvedValue(mockSite)

      app.use('/api/:siteId/*', tenantMiddleware)
      app.get('/api/:siteId/test', (c) => {
        const site = getCurrentSite(c)
        return c.json({ siteName: site.name })
      })

      const res = await app.request(`/api/${mockSite.id}/test`, {}, testEnv)

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ siteName: mockSite.name })
    })
  })

  describe('optionalTenantMiddleware', () => {
    it('should proceed without siteId', async () => {
      app.use('/api/*', optionalTenantMiddleware)
      app.get('/api/test', (c) => c.json({ ok: true }))

      const res = await app.request('/api/test', {}, testEnv)

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ ok: true })
    })

    it('should validate site when siteId is present', async () => {
      mockSiteService.getSiteById.mockResolvedValue(mockSite)

      app.use('/api/:siteId/*', optionalTenantMiddleware)
      app.get('/api/:siteId/test', (c) => {
        const siteId = c.get('siteId')
        return c.json({ siteId: siteId || null })
      })

      const res = await app.request(`/api/${mockSite.id}/test`, {}, testEnv)

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ siteId: mockSite.id })
    })
  })

  describe('getCurrentSiteId', () => {
    it('should return siteId from context', () => {
      const mockContext = {
        get: vi.fn().mockReturnValue(mockSite.id)
      } as any

      const result = getCurrentSiteId(mockContext)
      expect(result).toBe(mockSite.id)
      expect(mockContext.get).toHaveBeenCalledWith('siteId')
    })

    it('should throw error if siteId not found in context', () => {
      const mockContext = {
        get: vi.fn().mockReturnValue(null)
      } as any

      expect(() => getCurrentSiteId(mockContext)).toThrow(
        'Site ID not found in context. Ensure tenant middleware is applied'
      )
    })
  })

  describe('getCurrentSite', () => {
    it('should return site from context', () => {
      const mockContext = {
        get: vi.fn().mockReturnValue(mockSite)
      } as any

      const result = getCurrentSite(mockContext)
      expect(result).toEqual(mockSite)
      expect(mockContext.get).toHaveBeenCalledWith('site')
    })

    it('should throw error if site not found in context', () => {
      const mockContext = {
        get: vi.fn().mockReturnValue(null)
      } as any

      expect(() => getCurrentSite(mockContext)).toThrow(
        'Site information not found in context. Ensure tenant middleware is applied'
      )
    })
  })

  describe('validateSiteAccess', () => {
    it('should allow access when siteIds match', async () => {
      const mockContext = {
        get: vi.fn().mockImplementation((key) => {
          if (key === 'siteId') return mockSite.id
          return null
        })
      } as any

      const result = await validateSiteAccess(mockContext, mockSite.id)
      expect(result).toBe(true)
    })

    it('should deny access when siteIds do not match', async () => {
      const mockContext = {
        get: vi.fn().mockImplementation((key) => {
          if (key === 'siteId') return mockSite.id
          return null
        })
      } as any

      const differentSiteId = '87654321-4321-4321-4321-210987654321'
      const result = await validateSiteAccess(mockContext, differentSiteId)
      expect(result).toBe(false)
    })

    it('should validate JWT payload site_id', async () => {
      const mockContext = {
        get: vi.fn().mockImplementation((key) => {
          if (key === 'siteId') return mockSite.id
          if (key === 'jwtPayload') return { site_id: 'different-site' }
          return null
        })
      } as any

      const result = await validateSiteAccess(mockContext, mockSite.id)
      expect(result).toBe(false)
    })

    it('should allow access when JWT payload matches', async () => {
      const mockContext = {
        get: vi.fn().mockImplementation((key) => {
          if (key === 'siteId') return mockSite.id
          if (key === 'jwtPayload') return { site_id: mockSite.id }
          return null
        })
      } as any

      const result = await validateSiteAccess(mockContext, mockSite.id)
      expect(result).toBe(true)
    })
  })
})