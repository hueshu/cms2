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

// ALLCUT case images URLs (proxied from original source)
const allcutCases: Record<string, string> = {
  '/images/allcut-cases/case-1.jpg': 'https://cms.stratusx.com/wp-content/uploads/2024/08/1-1%E5%89%AF%E6%9C%AC.png',
  '/images/allcut-cases/case-2.jpg': 'https://cms.stratusx.com/wp-content/uploads/2024/08/1-2%E5%89%AF%E6%9C%AC.png',
  '/images/allcut-cases/case-3.jpg': 'https://cms.stratusx.com/wp-content/uploads/2024/08/1-3%E5%89%AF%E6%9C%AC.png',
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

// Serve ALLCUT case images (redirect to external URLs for now)
staticRoutes.get('/images/allcut-cases/:filename', async (c) => {
  const filename = c.req.param('filename')
  const path = `/images/allcut-cases/${filename}`

  if (allcutCases[path]) {
    // Fetch the image from the external URL
    const response = await fetch(allcutCases[path])
    const buffer = await response.arrayBuffer()

    return c.body(buffer, 200, {
      'Content-Type': response.headers.get('content-type') || 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000',
    })
  }

  return c.notFound()
})

// Serve images from R2 bucket
staticRoutes.get('/r2-images/:key', async (c) => {
  const key = c.req.param('key')

  try {
    // Get the object from R2 bucket
    const object = await c.env.IMAGES_BUCKET.get(key)

    if (!object) {
      return c.notFound()
    }

    // Get the object body as array buffer
    const body = await object.arrayBuffer()

    // Determine content type from the key extension
    let contentType = 'application/octet-stream'
    if (key.endsWith('.png')) contentType = 'image/png'
    else if (key.endsWith('.jpg') || key.endsWith('.jpeg')) contentType = 'image/jpeg'
    else if (key.endsWith('.gif')) contentType = 'image/gif'
    else if (key.endsWith('.webp')) contentType = 'image/webp'
    else if (key.endsWith('.svg')) contentType = 'image/svg+xml'

    // Use the content type from R2 if available
    if (object.httpMetadata?.contentType) {
      contentType = object.httpMetadata.contentType
    }

    return c.body(body, 200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000',
      'ETag': object.httpEtag || undefined
    })
  } catch (error) {
    console.error('Error fetching from R2:', error)
    return c.notFound()
  }
})