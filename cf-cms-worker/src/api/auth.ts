import { Hono } from 'hono'
import { generateToken } from '../middleware/auth'
import { successResponse } from '../utils/response'
import { authRateLimitMiddleware } from '../middleware/rateLimit'
import type { Env } from '../index'

export const authRoutes = new Hono<{ Bindings: Env }>()

// Apply rate limiting to auth routes
authRoutes.use('*', authRateLimitMiddleware)

// Login endpoint (placeholder for now)
authRoutes.post('/login', async (c) => {
  // TODO: Implement actual authentication logic
  const { email, password } = await c.req.json()

  // Mock authentication for now
  if (email && password) {
    const token = await generateToken(
      { site_id: 'test-site-id' },
      c
    )

    return successResponse(c, {
      token,
      expiresIn: 86400
    })
  }

  return c.json({
    success: false,
    error: {
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password'
    }
  }, 401)
})

// Token refresh endpoint
authRoutes.post('/refresh', async (c) => {
  // TODO: Implement token refresh logic
  return successResponse(c, {
    message: 'Token refresh endpoint'
  })
})

// Logout endpoint
authRoutes.post('/logout', async (c) => {
  // TODO: Implement logout logic (invalidate token)
  return successResponse(c, {
    message: 'Logged out successfully'
  })
})