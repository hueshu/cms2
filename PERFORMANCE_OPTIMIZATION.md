# CF-CMS 性能优化系统

这是任务6的完整实现，包含三个并行Stream的性能优化方案。

## 总览

本性能优化系统实现了以下三个主要功能流：

### Stream A: 缓存系统
- **多层缓存架构**：内存缓存 → Cache API → KV存储
- **智能缓存键生成**：基于内容、参数和用户上下文
- **缓存预热和失效策略**：支持标签失效和批量清理
- **缓存命中率监控**：实时统计和性能分析

### Stream B: 数据库优化
- **查询优化和批量处理**：自动优化查询结构
- **索引优化建议**：基于查询模式生成索引建议
- **连接池管理**：高效的数据库连接复用
- **查询性能分析**：实时监控和性能报告

### Stream C: 前端优化
- **图片和内容懒加载**：Intersection Observer API
- **Service Worker缓存**：离线支持和资源管理
- **资源压缩和合并**：自动优化资源加载
- **预加载策略**：智能预测和预加载

## 文件结构

```
cf-cms-worker/src/
├── services/
│   ├── cacheService.ts          # Stream A: 缓存服务
│   └── performanceService.ts    # 性能监控服务
├── middleware/
│   └── cache.ts                 # 缓存中间件
└── utils/
    └── queryOptimizer.ts        # Stream B: 查询优化器

cf-cms-pages/src/
├── utils/
│   └── lazyLoader.ts           # Stream C: 懒加载工具
├── templates/
│   └── performance-demo.html   # 性能优化演示页面
└── public/
    └── sw.js                   # Service Worker
```

## 功能特性

### 1. CacheService (缓存服务)

```typescript
import { CacheService } from './services/cacheService'

const cacheService = new CacheService(kvService)

// 智能缓存键生成
const key = cacheService.generateCacheKey('article', 'article-id', {
  page: 1,
  limit: 10
}, { userId: 'user-123', tenantId: 'tenant-456' })

// 多层缓存获取
const article = await cacheService.get(key)

// 缓存设置
await cacheService.set(key, article, {
  ttl: 3600,
  strategy: 'write-through',
  tags: ['articles', 'user-content']
})

// 缓存预热
await cacheService.warmup([
  {
    key: 'popular-articles',
    fetcher: () => fetchPopularArticles(),
    options: { ttl: 1800 }
  }
])
```

### 2. PerformanceService (性能监控)

```typescript
import { PerformanceService } from './services/performanceService'

const performanceService = new PerformanceService(kvNamespace)

// 记录性能指标
performanceService.recordMetric('api.response.time', 150, 'ms', {
  endpoint: '/api/articles',
  method: 'GET'
})

// 查询性能监控
performanceService.recordQueryPerformance(
  'SELECT * FROM articles WHERE site_id = ?',
  75,
  15
)

// 生成性能报告
const report = performanceService.generatePerformanceReport(cacheStats)
```

### 3. QueryOptimizer (查询优化器)

```typescript
import { QueryOptimizer } from './utils/queryOptimizer'

const optimizer = new QueryOptimizer(database, performanceService)

// 优化查询执行
const articles = await optimizer.executeOptimized(
  'SELECT * FROM articles WHERE site_id = ?',
  [siteId],
  {
    useCache: true,
    cacheTtl: 300,
    enableAnalysis: true
  }
)

// 批量查询处理
const results = await optimizer.executeBatch([
  { query: 'SELECT * FROM articles WHERE status = ?', params: ['published'] },
  { query: 'SELECT * FROM tags WHERE site_id = ?', params: [siteId] }
], {
  parallel: true,
  batchSize: 50
})

// 生成索引建议
const recommendations = await optimizer.generateIndexRecommendations(
  'articles',
  [
    'SELECT * FROM articles WHERE site_id = ? AND status = ?',
    'SELECT * FROM articles WHERE author = ? ORDER BY created_at DESC'
  ]
)
```

### 4. LazyLoader (懒加载工具)

```typescript
import { initializePerformanceOptimizations } from './utils/lazyLoader'

// 一键初始化所有性能优化
const perfOpt = initializePerformanceOptimizations({
  lazyLoading: true,
  imageOptimization: true,
  resourcePreloading: true,
  serviceWorkerCaching: true,
  customOptions: {
    lazyLoad: {
      rootMargin: '50px',
      threshold: 0.1,
      fadeIn: true,
      retryAttempts: 3
    },
    preloadResources: ['/css/main.css', '/js/app.js'],
    swPath: '/sw.js'
  }
})

// 手动懒加载设置
const lazyLoader = createLazyLoader({
  onLoad: (element) => console.log('Loaded:', element),
  onError: (element, error) => console.error('Failed:', error)
})

lazyLoader.observeAll('img[data-src]')
```

## 中间件集成

### 缓存中间件

```typescript
import { apiCacheMiddleware, cacheInvalidationMiddleware } from './middleware/cache'

// API响应缓存
app.use('/api/articles/*', apiCacheMiddleware({
  ttl: 300,
  tags: ['articles'],
  keyGenerator: (c) => `articles:${c.req.path}:${c.req.query()}`
}))

// 缓存失效
app.use('/api/articles/*', cacheInvalidationMiddleware(['articles']))
```

### 性能监控装饰器

```typescript
class ArticleService {
  @cached({ ttl: 3600, tags: ['articles'] })
  @PerformanceService.monitor('article.getById')
  async getArticleById(id: string): Promise<Article> {
    // 方法实现
  }
}
```

## Service Worker集成

### 前端集成

```html
<!-- 在HTML页面中 -->
<script type="module">
  import { createServiceWorkerManager } from '/js/lazyLoader.js';

  const swManager = createServiceWorkerManager();
  await swManager.initialize('/sw.js');

  // 预缓存关键资源
  await swManager.precacheResources([
    '/css/critical.css',
    '/js/core.js',
    '/api/v1/articles?featured=true'
  ]);
</script>
```

### 图片懒加载

```html
<!-- 懒加载图片 -->
<img data-src="/images/hero.jpg"
     class="lazy-image"
     alt="Hero image"
     src="data:image/svg+xml;base64,..."> <!-- placeholder -->

<!-- 响应式图片 -->
<img data-src="/images/article.jpg"
     data-sizes='{"320": "/images/article-mobile.jpg", "768": "/images/article-tablet.jpg", "default": "/images/article-desktop.jpg"}'
     class="lazy-image responsive">
```

## 性能监控

### 监控端点

```
GET /api/performance
```

返回完整的性能报告：

```json
{
  "performance": {
    "timestamp": 1640995200000,
    "cache": {
      "hitRate": 0.85,
      "efficiency": "good",
      "recommendations": ["考虑增加热点数据预热"]
    },
    "queries": {
      "averageDuration": 45.2,
      "errorRate": 0.002,
      "slowQueries": [...],
      "recommendations": ["考虑为user_id列添加索引"]
    },
    "api": {
      "averageResponseTime": 120.5,
      "errorRate": 0.001,
      "throughput": 85.2,
      "recommendations": ["API响应正常"]
    },
    "system": {
      "memoryUsage": 45.6,
      "cpuUsage": 23.1,
      "requestCount": 1250
    },
    "overallHealth": "good",
    "criticalIssues": []
  }
}
```

## 配置选项

### 缓存配置

```typescript
const cacheOptions = {
  ttl: 3600,                    // 缓存时间（秒）
  strategy: 'write-through',    // 缓存策略
  compression: true,            // 是否压缩
  tags: ['articles', 'public'], // 缓存标签
  vary: ['Authorization']       // Vary头
}
```

### 性能监控配置

```typescript
const performanceConfig = {
  enableQueryAnalysis: true,    // 启用查询分析
  slowQueryThreshold: 100,      // 慢查询阈值（ms）
  errorRateThreshold: 0.05,     // 错误率阈值
  metricsRetention: 7           // 指标保留天数
}
```

### 懒加载配置

```typescript
const lazyLoadConfig = {
  rootMargin: '50px',          // 预加载边距
  threshold: 0.1,              // 可见性阈值
  fadeIn: true,                // 淡入效果
  retryAttempts: 3,            // 重试次数
  retryDelay: 1000            // 重试延迟（ms）
}
```

## 性能指标

### 关键指标

- **缓存命中率**：目标 > 80%
- **API响应时间**：目标 < 200ms
- **查询执行时间**：目标 < 50ms
- **页面加载时间**：目标 < 2s
- **图片加载时间**：目标 < 1s

### 优化建议

1. **缓存策略**
   - 热点数据预热
   - 合理设置TTL
   - 使用标签失效

2. **数据库优化**
   - 添加必要索引
   - 优化查询结构
   - 使用批量处理

3. **前端优化**
   - 懒加载非关键资源
   - 预加载下一页内容
   - 使用Service Worker

## 使用示例

查看 `/cf-cms-pages/src/templates/performance-demo.html` 获取完整的使用示例和演示。

## 监控和调试

### 开发工具

1. **浏览器开发者工具**
   - Network面板查看缓存命中
   - Performance面板分析加载性能
   - Application面板检查Service Worker

2. **性能监控**
   - `/api/performance` 端点获取实时指标
   - 控制台日志查看缓存状态
   - Service Worker消息调试

3. **缓存调试**
   ```javascript
   // 检查缓存状态
   cacheService.getStats()

   // 清理过期缓存
   await cacheService.cleanup()

   // 手动失效缓存
   await cacheService.deleteByTags(['articles'])
   ```

## 部署注意事项

1. **Cloudflare Workers配置**
   - 确保KV命名空间已创建
   - 设置适当的环境变量
   - 启用Cache API

2. **DNS设置**
   - 配置CDN域名
   - 设置合适的TTL
   - 启用HTTP/2

3. **监控设置**
   - 配置性能告警
   - 设置日志收集
   - 定期检查性能报告

通过这个完整的性能优化系统，CF-CMS能够提供卓越的用户体验和系统性能。