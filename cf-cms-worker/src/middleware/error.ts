import { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { ApiResponse } from '../models/types'

// Error codes
export const ErrorCodes = {
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  EXPIRED_TOKEN: 'EXPIRED_TOKEN',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_FIELD: 'MISSING_FIELD',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Business logic errors
  INVALID_OPERATION: 'INVALID_OPERATION',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED'
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]

// Custom error class
export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Global error handler
export const errorHandler = (err: Error, c: Context): Response => {
  console.error('Error:', err)

  let statusCode = 500
  let errorCode: ErrorCode = ErrorCodes.INTERNAL_ERROR
  let message = 'An unexpected error occurred'
  let details: any = undefined

  // Handle different error types
  if (err instanceof ApiError) {
    statusCode = err.statusCode
    errorCode = err.code
    message = err.message
    details = err.details
  } else if (err instanceof HTTPException) {
    statusCode = err.status
    message = err.message

    // Map HTTP status to error codes
    switch (statusCode) {
      case 400:
        errorCode = ErrorCodes.INVALID_INPUT
        break
      case 401:
        errorCode = ErrorCodes.UNAUTHORIZED
        break
      case 403:
        errorCode = ErrorCodes.FORBIDDEN
        break
      case 404:
        errorCode = ErrorCodes.NOT_FOUND
        break
      case 409:
        errorCode = ErrorCodes.CONFLICT
        break
      case 429:
        errorCode = ErrorCodes.RATE_LIMIT_EXCEEDED
        break
      default:
        errorCode = ErrorCodes.INTERNAL_ERROR
    }
  } else if (err instanceof SyntaxError) {
    statusCode = 400
    errorCode = ErrorCodes.INVALID_INPUT
    message = 'Invalid JSON in request body'
  }

  // Build error response
  const response: ApiResponse = {
    success: false,
    error: {
      code: errorCode,
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

// Not found handler
export const notFoundHandler = (c: Context): Response => {
  const response: ApiResponse = {
    success: false,
    error: {
      code: ErrorCodes.NOT_FOUND,
      message: `Route not found: ${c.req.method} ${c.req.path}`
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  }

  return c.json(response, 404)
}

// Validation error helper
export function validationError(field: string, message: string): ApiError {
  return new ApiError(
    ErrorCodes.VALIDATION_ERROR,
    `Validation failed: ${message}`,
    400,
    { field, message }
  )
}

// Database error helper
export function databaseError(operation: string, error: any): ApiError {
  return new ApiError(
    ErrorCodes.DATABASE_ERROR,
    `Database operation failed: ${operation}`,
    500,
    { operation, error: error?.message }
  )
}

// Not found error helper
export function notFoundError(resource: string, id?: string): ApiError {
  const message = id
    ? `${resource} with id '${id}' not found`
    : `${resource} not found`

  return new ApiError(ErrorCodes.NOT_FOUND, message, 404, { resource, id })
}

// Conflict error helper
export function conflictError(resource: string, field: string, value: string): ApiError {
  return new ApiError(
    ErrorCodes.CONFLICT,
    `${resource} with ${field} '${value}' already exists`,
    409,
    { resource, field, value }
  )
}