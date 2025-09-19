import { Context } from 'hono'
import type { ApiResponse, PaginatedResponse } from '../models/types'

// Success response helper
export function successResponse<T>(
  c: Context,
  data: T,
  statusCode = 200
): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  }

  return c.json(response, statusCode)
}

// Error response helper
export function errorResponse(
  c: Context,
  code: string,
  message: string,
  details?: any,
  statusCode = 500
): Response {
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details })
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  }

  return c.json(response, statusCode)
}

// Paginated response helper
export function paginatedResponse<T>(
  c: Context,
  data: T[],
  total: number,
  page: number,
  limit: number,
  statusCode = 200
): Response {
  const totalPages = Math.ceil(total / limit)

  const paginatedData: PaginatedResponse<T> = {
    data,
    total,
    page,
    limit,
    totalPages
  }

  const response: ApiResponse<PaginatedResponse<T>> = {
    success: true,
    data: paginatedData,
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  }

  return c.json(response, statusCode)
}

// No content response
export function noContentResponse(c: Context): Response {
  return c.body(null, 204)
}

// Created response with location header
export function createdResponse<T>(
  c: Context,
  data: T,
  location?: string
): Response {
  if (location) {
    c.header('Location', location)
  }

  return successResponse(c, data, 201)
}

// Accepted response for async operations
export function acceptedResponse(
  c: Context,
  taskId?: string,
  message = 'Request accepted for processing'
): Response {
  const response: ApiResponse = {
    success: true,
    data: {
      message,
      ...(taskId && { taskId })
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  }

  return c.json(response, 202)
}

// Cache control headers
export function setCacheHeaders(
  c: Context,
  options: {
    maxAge?: number
    sMaxAge?: number
    public?: boolean
    private?: boolean
    noCache?: boolean
    noStore?: boolean
    mustRevalidate?: boolean
  } = {}
): void {
  const directives: string[] = []

  if (options.public) directives.push('public')
  if (options.private) directives.push('private')
  if (options.noCache) directives.push('no-cache')
  if (options.noStore) directives.push('no-store')
  if (options.mustRevalidate) directives.push('must-revalidate')
  if (options.maxAge !== undefined) directives.push(`max-age=${options.maxAge}`)
  if (options.sMaxAge !== undefined) directives.push(`s-maxage=${options.sMaxAge}`)

  if (directives.length > 0) {
    c.header('Cache-Control', directives.join(', '))
  }
}

// CORS headers helper
export function setCorsHeaders(
  c: Context,
  origin = '*',
  methods = 'GET, POST, PUT, DELETE, OPTIONS',
  headers = 'Content-Type, Authorization, X-API-Key'
): void {
  c.header('Access-Control-Allow-Origin', origin)
  c.header('Access-Control-Allow-Methods', methods)
  c.header('Access-Control-Allow-Headers', headers)
  c.header('Access-Control-Max-Age', '86400')
}

// Security headers
export function setSecurityHeaders(c: Context): void {
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('X-XSS-Protection', '1; mode=block')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
}