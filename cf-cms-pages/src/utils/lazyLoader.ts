/**
 * 懒加载工具 - Stream C核心功能
 * 提供图片、内容和资源的懒加载功能
 */

export interface LazyLoadOptions {
  root?: Element | null
  rootMargin?: string
  threshold?: number | number[]
  onLoad?: (element: Element) => void
  onError?: (element: Element, error: Error) => void
  onIntersect?: (element: Element) => void
  placeholder?: string
  fadeIn?: boolean
  retryAttempts?: number
  retryDelay?: number
}

export interface PreloadOptions {
  priority?: 'high' | 'low' | 'auto'
  crossOrigin?: 'anonymous' | 'use-credentials'
  referrerPolicy?: string
}

export interface ResourceHint {
  href: string
  rel: 'preload' | 'prefetch' | 'dns-prefetch' | 'preconnect'
  as?: 'script' | 'style' | 'image' | 'font' | 'fetch'
  crossOrigin?: string
  type?: string
}

/**
 * 主要懒加载管理器
 */
export class LazyLoader {
  private observer: IntersectionObserver | null = null
  private loadedElements = new WeakSet<Element>()
  private retryMap = new WeakMap<Element, number>()

  constructor(private options: LazyLoadOptions = {}) {
    this.initializeObserver()
  }

  /**
   * 添加元素到懒加载监控
   */
  observe(element: Element): void {
    if (this.observer && !this.loadedElements.has(element)) {
      this.observer.observe(element)
    }
  }

  /**
   * 移除元素监控
   */
  unobserve(element: Element): void {
    if (this.observer) {
      this.observer.unobserve(element)
    }
  }

  /**
   * 批量添加元素
   */
  observeAll(selector: string): void {
    const elements = document.querySelectorAll(selector)
    elements.forEach(element => this.observe(element))
  }

  /**
   * 销毁观察器
   */
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }
  }

  private initializeObserver(): void {
    if (!('IntersectionObserver' in window)) {
      // 降级处理：立即加载所有内容
      this.loadAllImmediately()
      return
    }

    const {
      root = null,
      rootMargin = '50px',
      threshold = 0.1
    } = this.options

    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      { root, rootMargin, threshold }
    )
  }

  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        this.loadElement(entry.target)
        this.options.onIntersect?.(entry.target)
      }
    })
  }

  private async loadElement(element: Element): Promise<void> {
    if (this.loadedElements.has(element)) return

    try {
      await this.performLoad(element)
      this.loadedElements.add(element)
      this.unobserve(element)
      this.options.onLoad?.(element)
    } catch (error) {
      await this.handleLoadError(element, error)
    }
  }

  private async performLoad(element: Element): Promise<void> {
    if (element.tagName === 'IMG') {
      await this.loadImage(element as HTMLImageElement)
    } else if (element.hasAttribute('data-lazy-content')) {
      await this.loadContent(element)
    } else if (element.hasAttribute('data-lazy-script')) {
      await this.loadScript(element)
    } else if (element.hasAttribute('data-lazy-style')) {
      await this.loadStyle(element)
    }
  }

  private async loadImage(img: HTMLImageElement): Promise<void> {
    const src = img.dataset.src || img.dataset.lazySrc
    const srcset = img.dataset.srcset
    const sizes = img.dataset.sizes

    if (!src) return

    return new Promise((resolve, reject) => {
      const newImg = new Image()

      newImg.onload = () => {
        img.src = src
        if (srcset) img.srcset = srcset
        if (sizes) img.sizes = sizes

        if (this.options.fadeIn) {
          this.fadeInElement(img)
        }

        resolve()
      }

      newImg.onerror = () => {
        reject(new Error(`Failed to load image: ${src}`))
      }

      newImg.src = src
    })
  }

  private async loadContent(element: Element): Promise<void> {
    const url = element.getAttribute('data-lazy-content')
    if (!url) return

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to load content: ${response.statusText}`)
    }

    const content = await response.text()
    element.innerHTML = content

    // 处理新加载内容中的懒加载元素
    this.observeAll('[data-src], [data-lazy-content], [data-lazy-script]')
  }

  private async loadScript(element: Element): Promise<void> {
    const src = element.getAttribute('data-lazy-script')
    if (!src) return

    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = src
      script.async = true

      script.onload = () => resolve()
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`))

      document.head.appendChild(script)
    })
  }

  private async loadStyle(element: Element): Promise<void> {
    const href = element.getAttribute('data-lazy-style')
    if (!href) return

    return new Promise((resolve, reject) => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href

      link.onload = () => resolve()
      link.onerror = () => reject(new Error(`Failed to load style: ${href}`))

      document.head.appendChild(link)
    })
  }

  private async handleLoadError(element: Element, error: Error): Promise<void> {
    const retryAttempts = this.options.retryAttempts || 3
    const retryDelay = this.options.retryDelay || 1000
    const currentAttempts = this.retryMap.get(element) || 0

    if (currentAttempts < retryAttempts) {
      this.retryMap.set(element, currentAttempts + 1)

      setTimeout(() => {
        this.loadElement(element)
      }, retryDelay * (currentAttempts + 1))
    } else {
      this.options.onError?.(element, error)
      this.unobserve(element)
    }
  }

  private fadeInElement(element: Element): void {
    const htmlElement = element as HTMLElement
    htmlElement.style.opacity = '0'
    htmlElement.style.transition = 'opacity 0.3s ease-in-out'

    requestAnimationFrame(() => {
      htmlElement.style.opacity = '1'
    })
  }

  private loadAllImmediately(): void {
    // 降级处理：立即加载所有懒加载元素
    const lazyElements = document.querySelectorAll('[data-src], [data-lazy-content]')
    lazyElements.forEach(element => {
      this.loadElement(element).catch(console.error)
    })
  }
}

/**
 * 图片懒加载专用类
 */
export class ImageLazyLoader extends LazyLoader {
  constructor(options: LazyLoadOptions = {}) {
    super({
      ...options,
      onLoad: (element) => {
        const img = element as HTMLImageElement
        img.classList.add('loaded')
        options.onLoad?.(element)
      }
    })
  }

  /**
   * 预加载关键图片
   */
  preloadCriticalImages(selectors: string[]): void {
    selectors.forEach(selector => {
      const images = document.querySelectorAll<HTMLImageElement>(selector)
      images.forEach(img => {
        const src = img.dataset.src || img.src
        if (src) {
          const preloadImg = new Image()
          preloadImg.src = src
        }
      })
    })
  }

  /**
   * 响应式图片处理
   */
  setupResponsiveImages(): void {
    const images = document.querySelectorAll('img[data-sizes]')

    images.forEach(img => {
      const htmlImg = img as HTMLImageElement
      const sizes = htmlImg.dataset.sizes

      if (sizes) {
        this.updateImageSizes(htmlImg, sizes)
      }
    })

    // 监听窗口大小变化
    window.addEventListener('resize', () => {
      images.forEach(img => {
        const htmlImg = img as HTMLImageElement
        const sizes = htmlImg.dataset.sizes
        if (sizes) {
          this.updateImageSizes(htmlImg, sizes)
        }
      })
    })
  }

  private updateImageSizes(img: HTMLImageElement, sizesData: string): void {
    try {
      const sizes = JSON.parse(sizesData)
      const windowWidth = window.innerWidth

      let selectedSize = sizes.default

      Object.keys(sizes)
        .filter(key => key !== 'default')
        .sort((a, b) => parseInt(b) - parseInt(a))
        .forEach(breakpoint => {
          if (windowWidth >= parseInt(breakpoint)) {
            selectedSize = sizes[breakpoint]
          }
        })

      if (img.src !== selectedSize) {
        img.src = selectedSize
      }
    } catch (error) {
      console.error('Error parsing responsive sizes:', error)
    }
  }
}

/**
 * 资源预加载管理器
 */
export class ResourcePreloader {
  private preloadedResources = new Set<string>()

  /**
   * 预加载资源
   */
  preload(href: string, options: PreloadOptions = {}): Promise<void> {
    if (this.preloadedResources.has(href)) {
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.href = href

      if (options.priority) {
        link.setAttribute('importance', options.priority)
      }

      if (options.crossOrigin) {
        link.crossOrigin = options.crossOrigin
      }

      if (options.referrerPolicy) {
        link.referrerPolicy = options.referrerPolicy
      }

      // 根据URL推断资源类型
      const as = this.inferResourceType(href)
      if (as) {
        link.as = as
      }

      link.onload = () => {
        this.preloadedResources.add(href)
        resolve()
      }

      link.onerror = () => {
        reject(new Error(`Failed to preload: ${href}`))
      }

      document.head.appendChild(link)
    })
  }

  /**
   * 预取资源
   */
  prefetch(href: string): void {
    if (this.preloadedResources.has(href)) return

    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = href

    document.head.appendChild(link)
    this.preloadedResources.add(href)
  }

  /**
   * DNS预解析
   */
  dnsPrefetch(hostname: string): void {
    const link = document.createElement('link')
    link.rel = 'dns-prefetch'
    link.href = `//${hostname}`

    document.head.appendChild(link)
  }

  /**
   * 预连接
   */
  preconnect(href: string, crossOrigin?: boolean): void {
    const link = document.createElement('link')
    link.rel = 'preconnect'
    link.href = href

    if (crossOrigin) {
      link.crossOrigin = 'anonymous'
    }

    document.head.appendChild(link)
  }

  /**
   * 批量添加资源提示
   */
  addResourceHints(hints: ResourceHint[]): void {
    hints.forEach(hint => {
      const link = document.createElement('link')
      link.rel = hint.rel
      link.href = hint.href

      if (hint.as) link.as = hint.as
      if (hint.crossOrigin) link.crossOrigin = hint.crossOrigin
      if (hint.type) link.type = hint.type

      document.head.appendChild(link)
    })
  }

  /**
   * 智能预加载 - 基于用户行为预测
   */
  smartPreload(
    triggerSelector: string,
    resourceMap: Map<string, string[]>
  ): void {
    const triggers = document.querySelectorAll(triggerSelector)

    triggers.forEach(trigger => {
      trigger.addEventListener('mouseenter', () => {
        const resources = resourceMap.get(trigger.getAttribute('href') || '')
        if (resources) {
          resources.forEach(resource => {
            this.prefetch(resource)
          })
        }
      })
    })
  }

  private inferResourceType(href: string): string | null {
    const url = new URL(href, window.location.origin)
    const extension = url.pathname.split('.').pop()?.toLowerCase()

    const typeMap: Record<string, string> = {
      'js': 'script',
      'css': 'style',
      'jpg': 'image',
      'jpeg': 'image',
      'png': 'image',
      'webp': 'image',
      'svg': 'image',
      'woff': 'font',
      'woff2': 'font',
      'ttf': 'font',
      'otf': 'font'
    }

    return extension ? typeMap[extension] || null : null
  }
}

/**
 * Service Worker 缓存管理
 */
export class ServiceWorkerCacheManager {
  private registration: ServiceWorkerRegistration | null = null

  async initialize(swPath = '/sw.js'): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported')
      return
    }

    try {
      this.registration = await navigator.serviceWorker.register(swPath)
      console.log('Service Worker registered successfully')

      // 监听更新
      this.registration.addEventListener('updatefound', () => {
        this.handleServiceWorkerUpdate()
      })
    } catch (error) {
      console.error('Service Worker registration failed:', error)
    }
  }

  /**
   * 预缓存关键资源
   */
  async precacheResources(resources: string[]): Promise<void> {
    if (!this.registration?.active) return

    // 向Service Worker发送预缓存消息
    this.registration.active.postMessage({
      type: 'PRECACHE_RESOURCES',
      payload: resources
    })
  }

  /**
   * 清理过期缓存
   */
  async clearExpiredCache(): Promise<void> {
    if (!this.registration?.active) return

    this.registration.active.postMessage({
      type: 'CLEAR_EXPIRED_CACHE'
    })
  }

  /**
   * 获取缓存统计
   */
  async getCacheStats(): Promise<any> {
    if (!this.registration?.active) return null

    return new Promise((resolve) => {
      const channel = new MessageChannel()

      channel.port1.onmessage = (event) => {
        resolve(event.data)
      }

      this.registration!.active!.postMessage({
        type: 'GET_CACHE_STATS'
      }, [channel.port2])
    })
  }

  private handleServiceWorkerUpdate(): void {
    const installingWorker = this.registration?.installing

    if (installingWorker) {
      installingWorker.onstatechange = () => {
        if (installingWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // 新版本可用，提示用户刷新
            this.showUpdateNotification()
          }
        }
      }
    }
  }

  private showUpdateNotification(): void {
    // 可以集成到UI通知系统
    if (confirm('网站有新版本可用，是否立即刷新？')) {
      window.location.reload()
    }
  }
}

/**
 * 工厂函数 - 创建懒加载器实例
 */
export function createLazyLoader(options?: LazyLoadOptions): LazyLoader {
  return new LazyLoader(options)
}

export function createImageLazyLoader(options?: LazyLoadOptions): ImageLazyLoader {
  return new ImageLazyLoader(options)
}

export function createResourcePreloader(): ResourcePreloader {
  return new ResourcePreloader()
}

export function createServiceWorkerManager(): ServiceWorkerCacheManager {
  return new ServiceWorkerCacheManager()
}

/**
 * 一键初始化所有性能优化功能
 */
export function initializePerformanceOptimizations(config: {
  lazyLoading?: boolean
  imageOptimization?: boolean
  resourcePreloading?: boolean
  serviceWorkerCaching?: boolean
  customOptions?: {
    lazyLoad?: LazyLoadOptions
    preloadResources?: string[]
    swPath?: string
  }
} = {}): {
  lazyLoader?: LazyLoader
  imageLoader?: ImageLazyLoader
  preloader?: ResourcePreloader
  swManager?: ServiceWorkerCacheManager
} {
  const {
    lazyLoading = true,
    imageOptimization = true,
    resourcePreloading = true,
    serviceWorkerCaching = true,
    customOptions = {}
  } = config

  const result: any = {}

  if (lazyLoading) {
    result.lazyLoader = createLazyLoader(customOptions.lazyLoad)
    result.lazyLoader.observeAll('[data-src], [data-lazy-content]')
  }

  if (imageOptimization) {
    result.imageLoader = createImageLazyLoader(customOptions.lazyLoad)
    result.imageLoader.observeAll('img[data-src]')
    result.imageLoader.setupResponsiveImages()
  }

  if (resourcePreloading) {
    result.preloader = createResourcePreloader()

    if (customOptions.preloadResources) {
      customOptions.preloadResources.forEach(resource => {
        result.preloader.prefetch(resource)
      })
    }
  }

  if (serviceWorkerCaching) {
    result.swManager = createServiceWorkerManager()
    result.swManager.initialize(customOptions.swPath)
  }

  return result
}