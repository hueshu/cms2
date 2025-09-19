import { Context, Next } from 'hono'
import { createMiddleware } from 'hono/factory'
import { z, ZodError, ZodSchema } from 'zod'
import { validationError } from './error'

// Validation schemas
export const siteSchema = z.object({
  domain: z.string().min(1).regex(/^[a-zA-Z0-9][a-zA-Z0-9-_.]*[a-zA-Z0-9]$/),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  config: z.object({
    theme: z.string().optional(),
    template: z.string().optional(),
    seo: z.object({
      defaultTitle: z.string().optional(),
      defaultDescription: z.string().optional(),
      defaultKeywords: z.array(z.string()).optional()
    }).optional(),
    features: z.object({
      enableComments: z.boolean().optional(),
      enableSearch: z.boolean().optional(),
      enableSitemap: z.boolean().optional()
    }).optional(),
    customCss: z.string().optional(),
    customJs: z.string().optional()
  }).optional()
})

export const articleSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  content: z.string().optional(),
  summary: z.string().max(500).optional(),
  cover_image: z.string().url().optional(),
  meta_title: z.string().max(100).optional(),
  meta_description: z.string().max(200).optional(),
  meta_keywords: z.string().optional(),
  status: z.enum(['draft', 'published']).optional(),
  author: z.string().optional(),
  tags: z.array(z.string()).optional()
})

export const updateArticleSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  content: z.string().optional(),
  summary: z.string().max(500).optional(),
  cover_image: z.string().url().optional(),
  meta_title: z.string().max(100).optional(),
  meta_description: z.string().max(200).optional(),
  meta_keywords: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  tags: z.array(z.string()).optional()
})

export const articleSearchSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  sort: z.enum(['asc', 'desc']).optional().default('desc'),
  sortBy: z.enum(['created_at', 'updated_at', 'published_at', 'title', 'view_count']).optional().default('created_at'),
  search: z.string().optional(),
  tags: z.string().transform(val => val ? val.split(',').map(s => s.trim()) : []).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  author: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional()
})

export const tagSchema = z.object({
  name: z.string().min(1).max(50),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  description: z.string().max(200).optional()
})

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  sort: z.enum(['asc', 'desc']).optional().default('desc'),
  sortBy: z.string().optional().default('created_at')
})

// Create validation middleware
export function validateBody<T>(schema: ZodSchema<T>) {
  return createMiddleware(async (c: Context, next: Next) => {
    try {
      const body = await c.req.json()
      const validated = schema.parse(body)
      c.set('validatedData', validated)
      await next()
    } catch (error) {
      if (error instanceof ZodError) {
        const firstError = error.errors[0]
        throw validationError(
          firstError.path.join('.'),
          firstError.message
        )
      }
      throw validationError('body', 'Invalid request body')
    }
  })
}

// Validate query parameters
export function validateQuery<T>(schema: ZodSchema<T>) {
  return createMiddleware(async (c: Context, next: Next) => {
    try {
      const query = c.req.query()
      const validated = schema.parse(query)
      c.set('validatedQuery', validated)
      await next()
    } catch (error) {
      if (error instanceof ZodError) {
        const firstError = error.errors[0]
        throw validationError(
          firstError.path.join('.'),
          firstError.message
        )
      }
      throw validationError('query', 'Invalid query parameters')
    }
  })
}

// Validate path parameters
export function validateParams<T>(schema: ZodSchema<T>) {
  return createMiddleware(async (c: Context, next: Next) => {
    try {
      const params = c.req.param()
      const validated = schema.parse(params)
      c.set('validatedParams', validated)
      await next()
    } catch (error) {
      if (error instanceof ZodError) {
        const firstError = error.errors[0]
        throw validationError(
          firstError.path.join('.'),
          firstError.message
        )
      }
      throw validationError('params', 'Invalid path parameters')
    }
  })
}

// Common parameter schemas
export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format')
})

export const siteIdParamSchema = z.object({
  siteId: z.string().uuid('Invalid site ID format')
})

export const slugParamSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
})

// Sanitize HTML content
export function sanitizeHtml(html: string): string {
  // Basic HTML sanitization (consider using a proper library in production)
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+\s*=\s*"[^"]*"/g, '')
    .replace(/on\w+\s*=\s*'[^']*'/g, '')
    .replace(/javascript:/gi, '')
}

// Validate and sanitize content
export const contentValidationMiddleware = createMiddleware(
  async (c: Context, next: Next) => {
    const body = await c.req.json().catch(() => ({}))

    if (body.content && typeof body.content === 'string') {
      body.content = sanitizeHtml(body.content)
    }

    if (body.summary && typeof body.summary === 'string') {
      body.summary = sanitizeHtml(body.summary)
    }

    c.set('sanitizedBody', body)
    await next()
  }
)