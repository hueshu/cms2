// Service Worker for CF-CMS Pages Performance Optimization
// 支持缓存管理、预加载和离线功能

const CACHE_NAME = 'cf-cms-v1'
const CACHE_VERSION = '1.0.0'
const STATIC_CACHE_NAME = `${CACHE_NAME}-static`
const DYNAMIC_CACHE_NAME = `${CACHE_NAME}-dynamic`
const API_CACHE_NAME = `${CACHE_NAME}-api`

// 静态资源缓存列表
const STATIC_ASSETS = [
  '/',
  '/css/main.css',
  '/js/main.js',
  '/js/lazyLoader.js',
  '/images/logo.png',
  '/manifest.json'
]

// API端点缓存配置
const API_CACHE_CONFIG = {
  '/api/v1/articles': { ttl: 300000, strategy: 'staleWhileRevalidate' }, // 5分钟
  '/api/v1/tags': { ttl: 600000, strategy: 'cacheFirst' }, // 10分钟
  '/api/v1/images': { ttl: 86400000, strategy: 'cacheFirst' } // 24小时
}

// 缓存策略
const CACHE_STRATEGIES = {
  cacheFirst: 'cache-first',
  networkFirst: 'network-first',
  staleWhileRevalidate: 'stale-while-revalidate',
  networkOnly: 'network-only',
  cacheOnly: 'cache-only'
}

/**
 * Service Worker安装事件
 */
self.addEventListener('install', event => {
  console.log('[SW] Installing...')

  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('[SW] Precaching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => {
        console.log('[SW] Installation complete')
        return self.skipWaiting()
      })
      .catch(error => {
        console.error('[SW] Installation failed:', error)
      })
  )
})

/**
 * Service Worker激活事件
 */
self.addEventListener('activate', event => {
  console.log('[SW] Activating...')

  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE_NAME &&
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName !== API_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('[SW] Activation complete')
        return self.clients.claim()
      })
  )
})

/**
 * 网络请求拦截
 */
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // 跳过非GET请求
  if (request.method !== 'GET') {
    return
  }

  // 处理不同类型的请求
  if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(request))
  } else if (isAPIRequest(url)) {
    event.respondWith(handleAPIRequest(request))
  } else if (isImageRequest(url)) {
    event.respondWith(handleImageRequest(request))
  } else {
    event.respondWith(handleDynamicRequest(request))
  }
})

/**
 * 消息处理 - 与主线程通信
 */
self.addEventListener('message', event => {
  const { type, payload } = event.data

  switch (type) {
    case 'PRECACHE_RESOURCES':
      handlePrecacheResources(payload)
      break

    case 'CLEAR_EXPIRED_CACHE':
      handleClearExpiredCache()
      break

    case 'GET_CACHE_STATS':
      handleGetCacheStats(event.ports[0])
      break

    case 'UPDATE_CACHE_CONFIG':
      handleUpdateCacheConfig(payload)
      break

    default:
      console.warn('[SW] Unknown message type:', type)
  }
})

// 工具函数

function isStaticAsset(url) {
  return url.pathname.match(/\.(css|js|png|jpg|jpeg|svg|woff|woff2|ttf|ico)$/)
}

function isAPIRequest(url) {
  return url.pathname.startsWith('/api/')
}

function isImageRequest(url) {
  return url.pathname.match(/\.(png|jpg|jpeg|webp|svg)$/) ||
         url.pathname.includes('/images/')
}

/**
 * 静态资源处理 - Cache First策略
 */
async function handleStaticAsset(request) {
  try {
    const cache = await caches.open(STATIC_CACHE_NAME)
    const cachedResponse = await cache.match(request)

    if (cachedResponse) {
      return cachedResponse
    }

    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    console.error('[SW] Static asset error:', error)
    return new Response('Asset not available', { status: 404 })
  }
}

/**
 * API请求处理 - 根据配置选择策略
 */
async function handleAPIRequest(request) {
  const url = new URL(request.url)
  const endpoint = getAPIEndpoint(url.pathname)
  const config = API_CACHE_CONFIG[endpoint] || { strategy: 'networkFirst', ttl: 300000 }

  switch (config.strategy) {
    case 'cacheFirst':
      return handleCacheFirst(request, API_CACHE_NAME, config.ttl)
    case 'networkFirst':
      return handleNetworkFirst(request, API_CACHE_NAME, config.ttl)
    case 'staleWhileRevalidate':
      return handleStaleWhileRevalidate(request, API_CACHE_NAME, config.ttl)
    default:
      return fetch(request)
  }
}

/**
 * 图片请求处理 - Cache First with compression
 */
async function handleImageRequest(request) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME)
    const cachedResponse = await cache.match(request)

    if (cachedResponse) {
      return cachedResponse
    }

    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      // 缓存图片，设置长期TTL
      const responseToCache = networkResponse.clone()
      cache.put(request, responseToCache)
    }

    return networkResponse
  } catch (error) {
    console.error('[SW] Image request error:', error)
    return new Response('Image not available', { status: 404 })
  }
}

/**
 * 动态请求处理 - Network First策略
 */
async function handleDynamicRequest(request) {
  return handleNetworkFirst(request, DYNAMIC_CACHE_NAME, 300000)
}

/**
 * Cache First策略实现
 */
async function handleCacheFirst(request, cacheName, ttl) {
  try {
    const cache = await caches.open(cacheName)
    const cachedResponse = await cache.match(request)

    if (cachedResponse && !isExpired(cachedResponse, ttl)) {
      return cachedResponse
    }

    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const responseToCache = addTimestamp(networkResponse.clone())
      cache.put(request, responseToCache)
    }

    return networkResponse
  } catch (error) {
    console.error('[SW] Cache first error:', error)
    const cache = await caches.open(cacheName)
    return cache.match(request) || new Response('Service unavailable', { status: 503 })
  }
}

/**
 * Network First策略实现
 */
async function handleNetworkFirst(request, cacheName, ttl) {
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      const responseToCache = addTimestamp(networkResponse.clone())
      cache.put(request, responseToCache)
    }
    return networkResponse
  } catch (error) {
    console.error('[SW] Network first fallback to cache:', error)
    const cache = await caches.open(cacheName)
    const cachedResponse = await cache.match(request)
    return cachedResponse || new Response('Service unavailable', { status: 503 })
  }
}

/**
 * Stale While Revalidate策略实现
 */
async function handleStaleWhileRevalidate(request, cacheName, ttl) {
  const cache = await caches.open(cacheName)
  const cachedResponse = await cache.match(request)

  // 异步更新缓存
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      const responseToCache = addTimestamp(networkResponse.clone())
      cache.put(request, responseToCache)
    }
    return networkResponse
  }).catch(error => {
    console.error('[SW] Background update failed:', error)
  })

  // 如果有缓存，立即返回；否则等待网络请求
  if (cachedResponse) {
    return cachedResponse
  } else {
    return fetchPromise
  }
}

/**
 * 消息处理函数
 */
async function handlePrecacheResources(resources) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME)
    const requests = resources.map(url => new Request(url))
    await Promise.all(
      requests.map(request =>
        fetch(request)
          .then(response => {
            if (response.ok) {
              return cache.put(request, response)
            }
          })
          .catch(error => {
            console.warn('[SW] Precache failed for:', request.url, error)
          })
      )
    )
    console.log('[SW] Precache completed for', resources.length, 'resources')
  } catch (error) {
    console.error('[SW] Precache error:', error)
  }
}

async function handleClearExpiredCache() {
  try {
    const cacheNames = [STATIC_CACHE_NAME, DYNAMIC_CACHE_NAME, API_CACHE_NAME]

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName)
      const requests = await cache.keys()

      for (const request of requests) {
        const response = await cache.match(request)
        if (isExpired(response, 86400000)) { // 24小时过期
          await cache.delete(request)
        }
      }
    }

    console.log('[SW] Expired cache cleared')
  } catch (error) {
    console.error('[SW] Clear cache error:', error)
  }
}

async function handleGetCacheStats(port) {
  try {
    const stats = {
      caches: {},
      totalSize: 0,
      version: CACHE_VERSION
    }

    const cacheNames = await caches.keys()

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName)
      const requests = await cache.keys()

      stats.caches[cacheName] = {
        entryCount: requests.length,
        lastUpdated: Date.now()
      }
    }

    port.postMessage(stats)
  } catch (error) {
    console.error('[SW] Get stats error:', error)
    port.postMessage({ error: error.message })
  }
}

function handleUpdateCacheConfig(config) {
  Object.assign(API_CACHE_CONFIG, config)
  console.log('[SW] Cache config updated')
}

// 辅助函数

function getAPIEndpoint(pathname) {
  const parts = pathname.split('/')
  return `/${parts[1]}/${parts[2]}/${parts[3]}`
}

function addTimestamp(response) {
  const headers = new Headers(response.headers)
  headers.set('sw-cached-at', Date.now().toString())
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

function isExpired(response, ttl) {
  if (!response) return true

  const cachedAt = response.headers.get('sw-cached-at')
  if (!cachedAt) return false

  return Date.now() - parseInt(cachedAt) > ttl
}

// 错误处理
self.addEventListener('error', event => {
  console.error('[SW] Global error:', event.error)
})

self.addEventListener('unhandledrejection', event => {
  console.error('[SW] Unhandled promise rejection:', event.reason)
})

console.log('[SW] Service Worker loaded, version:', CACHE_VERSION)