import { Hono } from 'hono'
import type { Env } from '../index'

/**
 * Static asset routes
 * Serves images and other static assets
 */
export const staticRoutes = new Hono<{ Bindings: Env }>()

// Image assets
const images: Record<string, string> = {
  '/static/img/rhino-icon.png': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  '/static/img/hero-bg.jpg': 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAAAA',
}

// CSS styles
const styles = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif;
}
`

// Serve static images
staticRoutes.get('/static/img/:filename', (c) => {
  const filename = c.req.param('filename')
  const path = `/static/img/${filename}`

  if (images[path]) {
    const [type, data] = images[path].split(',')
    const mimeType = type.split(':')[1].split(';')[0]

    return c.body(Buffer.from(data, 'base64'), 200, {
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=31536000',
    })
  }

  return c.notFound()
})

// Serve CSS
staticRoutes.get('/static/css/style.css', (c) => {
  return c.text(styles, 200, {
    'Content-Type': 'text/css',
    'Cache-Control': 'public, max-age=3600',
  })
})