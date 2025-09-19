import { Context, Next } from 'hono'
import { createMiddleware } from 'hono/factory'
import { sign, verify } from 'hono/jwt'
import { HTTPException } from 'hono/http-exception'
import type { Env } from '../index'

export interface JWTPayload {
  site_id: string
  exp?: number
  iat?: number
}

// JWT secret from environment
const getJWTSecret = (c: Context<{ Bindings: Env }>) => {
  return c.env.JWT_SECRET || 'development-secret-change-in-production'
}

// Generate JWT token
export async function generateToken(
  payload: JWTPayload,
  c: Context<{ Bindings: Env }>
): Promise<string> {
  const secret = getJWTSecret(c)
  const now = Math.floor(Date.now() / 1000)

  return await sign(
    {
      ...payload,
      iat: now,
      exp: now + 86400 // 24 hours
    },
    secret
  )
}

// Verify JWT token
export async function verifyToken(
  token: string,
  c: Context<{ Bindings: Env }>
): Promise<JWTPayload> {
  const secret = getJWTSecret(c)
  try {
    return await verify(token, secret) as JWTPayload
  } catch (error) {
    throw new HTTPException(401, { message: 'Invalid or expired token' })
  }
}

// Auth middleware
export const authMiddleware = createMiddleware<{ Bindings: Env }>(
  async (c: Context<{ Bindings: Env }>, next: Next) => {
    const authHeader = c.req.header('Authorization')

    if (!authHeader) {
      throw new HTTPException(401, { message: 'Authorization header missing' })
    }

    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token) {
      throw new HTTPException(401, { message: 'Token missing' })
    }

    try {
      const payload = await verifyToken(token, c)

      // Check if token is expired
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        throw new HTTPException(401, { message: 'Token expired' })
      }

      // Store user data in context
      c.set('jwtPayload', payload)
      c.set('siteId', payload.site_id)

      await next()
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error
      }
      throw new HTTPException(401, { message: 'Invalid token' })
    }
  }
)

// API Key authentication middleware
export const apiKeyMiddleware = createMiddleware<{ Bindings: Env }>(
  async (c: Context<{ Bindings: Env }>, next: Next) => {
    const apiKey = c.req.header('X-API-Key')

    if (!apiKey) {
      throw new HTTPException(401, { message: 'API key missing' })
    }

    // Hash the API key for comparison
    const encoder = new TextEncoder()
    const data = encoder.encode(apiKey)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // Verify API key in database
    const db = c.env.DB
    const apiKeyRecord = await db
      .prepare('SELECT * FROM api_keys WHERE key_hash = ? AND (expires_at IS NULL OR expires_at > datetime("now"))')
      .bind(keyHash)
      .first()

    if (!apiKeyRecord) {
      throw new HTTPException(401, { message: 'Invalid API key' })
    }

    // Update last used timestamp
    await db
      .prepare('UPDATE api_keys SET last_used_at = datetime("now") WHERE id = ?')
      .bind(apiKeyRecord.id)
      .run()

    // Store site ID in context
    c.set('siteId', apiKeyRecord.site_id)
    c.set('apiKeyId', apiKeyRecord.id)

    await next()
  }
)

// Optional auth middleware (auth not required but parsed if present)
export const optionalAuthMiddleware = createMiddleware<{ Bindings: Env }>(
  async (c: Context<{ Bindings: Env }>, next: Next) => {
    const authHeader = c.req.header('Authorization')

    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, '')
      if (token) {
        try {
          const payload = await verifyToken(token, c)
          if (!payload.exp || payload.exp >= Math.floor(Date.now() / 1000)) {
            c.set('jwtPayload', payload)
            c.set('siteId', payload.site_id)
          }
        } catch {
          // Ignore invalid tokens in optional auth
        }
      }
    }

    await next()
  }
)