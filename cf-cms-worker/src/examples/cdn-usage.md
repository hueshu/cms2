# CDN服务使用示例

## 概述

CDN服务为CMS系统提供了完整的内容分发网络功能，包括：

- 智能缓存策略管理
- 响应式图片生成
- 懒加载支持
- 缓存清除和预热
- 性能监控分析
- 地理限制控制

## API接口使用

### 1. 获取CDN配置

```bash
curl -X GET "https://cf-cms-worker.email777.org/api/v1/cdn/config" \
  -H "X-API-Key: your-api-key"
```

### 2. 清除缓存

```bash
# 清除指定URL
curl -X POST "https://cf-cms-worker.email777.org/api/v1/cdn/purge" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "urls": [
      "https://example.com/image.jpg",
      "https://example.com/style.css"
    ],
    "reason": "Content updated"
  }'

# 按标签清除
curl -X POST "https://cf-cms-worker.email777.org/api/v1/cdn/purge" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "tags": ["images", "static"],
    "reason": "Batch content update"
  }'

# 清除所有缓存
curl -X POST "https://cf-cms-worker.email777.org/api/v1/cdn/purge" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "purgeEverything": true,
    "reason": "Major site update"
  }'
```

### 3. 预热缓存

```bash
curl -X POST "https://cf-cms-worker.email777.org/api/v1/cdn/warmup" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "urls": [
      "https://example.com/",
      "https://example.com/about",
      "https://example.com/products"
    ],
    "priority": "high",
    "batchSize": 5,
    "delay": 100,
    "reason": "Pre-launch preparation"
  }'
```

### 4. 生成响应式图片

```bash
curl -X POST "https://cf-cms-worker.email777.org/api/v1/cdn/responsive-image" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "url": "https://example.com/image.jpg",
    "quality": 85,
    "format": "webp"
  }'
```

### 5. 生成懒加载HTML

```bash
curl -X POST "https://cf-cms-worker.email777.org/api/v1/cdn/lazy-html" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "imageSet": {
      "src": "https://example.com/image.jpg",
      "srcset": "https://example.com/image.jpg?w=320 320w, https://example.com/image.jpg?w=640 640w",
      "sizes": "(max-width: 640px) 320px, 640px",
      "placeholder": "https://example.com/image.jpg?w=40&h=40&q=20",
      "formats": [
        {
          "format": "avif",
          "srcset": "https://example.com/image.avif?w=320 320w"
        },
        {
          "format": "webp",
          "srcset": "https://example.com/image.webp?w=320 320w"
        }
      ]
    },
    "alt": "Example image",
    "className": "responsive-image"
  }'
```

### 6. 获取缓存指标

```bash
curl -X GET "https://cf-cms-worker.email777.org/api/v1/cdn/metrics?timeframe=24h" \
  -H "X-API-Key: your-api-key"
```

### 7. 分析URL缓存策略

```bash
curl -X GET "https://cf-cms-worker.email777.org/api/v1/cdn/analyze?url=/static/app.js" \
  -H "X-API-Key: your-api-key"
```

## 代码集成示例

### 在Worker中使用CDN服务

```typescript
import { CDNService } from './services/cdnService'

// 创建CDN服务实例
const cdnService = new CDNService(c.env, {
  debug: true,
  config: {
    zoneId: 'your-zone-id',
    responsiveImages: {
      sizes: [320, 640, 768, 1024, 1280, 1920],
      formats: ['avif', 'webp', 'jpeg'],
      quality: 85
    }
  }
})

// 应用缓存头
const response = new Response('Hello World')
const cachedResponse = cdnService.applyCacheHeaders(response, '/api/data')

// 生成响应式图片
const imageSet = cdnService.generateResponsiveImageSet(
  'https://example.com/hero.jpg',
  {
    quality: 90,
    format: 'webp'
  }
)

// 生成懒加载HTML
const html = cdnService.generateLazyLoadHTML(
  imageSet,
  'Hero image',
  'hero-image'
)
```

### 在前端中使用懒加载

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    .responsive-image {
      width: 100%;
      height: auto;
      transition: opacity 0.3s;
    }
    .responsive-image[data-src] {
      opacity: 0.7;
      filter: blur(5px);
    }
    .responsive-image.lazy-loaded {
      opacity: 1;
      filter: none;
    }
  </style>
</head>
<body>
  <!-- 响应式图片HTML（由API生成） -->
  <picture>
    <source srcset="image.avif?w=320 320w, image.avif?w=640 640w" sizes="(max-width: 640px) 320px, 640px" type="image/avif">
    <source srcset="image.webp?w=320 320w, image.webp?w=640 640w" sizes="(max-width: 640px) 320px, 640px" type="image/webp">
    <img class="responsive-image" src="placeholder.jpg" data-src="image.jpg" data-srcset="image.jpg?w=320 320w, image.jpg?w=640 640w" data-sizes="(max-width: 640px) 320px, 640px" alt="Example image" loading="lazy" decoding="async">
  </picture>

  <!-- 懒加载脚本（由API生成） -->
  <script>
    // 懒加载实现代码...
  </script>
</body>
</html>
```

## 缓存策略配置

### 默认缓存策略

- **静态资源** (`/static/*`): 1年缓存，不可变
- **图片资源** (`/images/*`): 30天浏览器缓存，90天边缘缓存
- **API响应** (`/api/*`): 5分钟浏览器缓存，10分钟边缘缓存
- **HTML页面** (`/*.html`): 1小时浏览器缓存，2小时边缘缓存
- **动态内容** (`/*`): 不缓存浏览器，1分钟边缘缓存

### 自定义缓存策略

```typescript
const customConfig = {
  cacheStrategies: {
    static: {
      maxAge: 86400 * 365, // 1年
      sMaxAge: 86400 * 365,
      public: true,
      immutable: true
    },
    api: {
      maxAge: 300, // 5分钟
      sMaxAge: 600, // 10分钟
      staleWhileRevalidate: 300,
      public: false,
      mustRevalidate: true
    }
  },
  routes: [
    {
      pattern: '/api/articles/*',
      cacheStrategy: 'api',
      headers: {
        'X-Content-Type': 'application/json'
      }
    }
  ]
}
```

## 性能优化建议

### 1. 图片优化

- 使用现代格式（AVIF > WebP > JPEG）
- 实现响应式图片和懒加载
- 设置合适的质量参数（85-90%）

### 2. 缓存优化

- 静态资源使用长期缓存
- API响应使用适中的缓存时间
- 利用stale-while-revalidate策略

### 3. 安全配置

- 启用防盗链保护
- 配置地理限制
- 设置IP白名单/黑名单

### 4. 监控和分析

- 定期检查缓存命中率
- 监控响应时间
- 分析地理分布

## 故障排除

### 常见问题

1. **缓存清除失败**
   - 检查Zone ID和API Token配置
   - 验证URL格式是否正确
   - 确认权限设置

2. **图片转换问题**
   - 检查原始图片URL可访问性
   - 验证转换参数是否在允许范围内
   - 确认图片格式支持

3. **懒加载不工作**
   - 检查浏览器是否支持IntersectionObserver
   - 验证JavaScript是否正确加载
   - 确认图片元素data属性设置

### 调试技巧

- 启用debug模式查看详细日志
- 使用浏览器开发者工具检查网络请求
- 通过健康检查接口验证服务状态