# API文档

多站点CMS系统完整API参考文档。本系统基于REST架构，支持JSON格式的数据交换。

## 基础信息

- **基础URL**: `https://your-domain.com/api/v1`
- **认证方式**: JWT Token（管理API）/ API Key（内容API）
- **数据格式**: JSON
- **字符编码**: UTF-8

## 通用响应格式

### 成功响应
```json
{
  "success": true,
  "data": {
    // 响应数据
  },
  "message": "操作成功"
}
```

### 分页响应
```json
{
  "success": true,
  "data": [
    // 数据列表
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### 错误响应
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": {
      // 详细错误信息
    }
  }
}
```

## 认证

### JWT认证（管理API）
在请求头中包含JWT token：
```
Authorization: Bearer <your-jwt-token>
```

### API Key认证（内容API）
在请求头中包含API key：
```
X-API-Key: <your-api-key>
```

## 错误代码

| HTTP状态码 | 错误代码 | 描述 |
|-----------|---------|------|
| 400 | `VALIDATION_ERROR` | 请求参数验证失败 |
| 401 | `UNAUTHORIZED` | 未授权访问 |
| 403 | `FORBIDDEN` | 权限不足 |
| 404 | `NOT_FOUND` | 资源不存在 |
| 429 | `RATE_LIMIT_EXCEEDED` | 请求频率超限 |
| 500 | `INTERNAL_ERROR` | 服务器内部错误 |

---

## 认证管理

### 用户登录
获取JWT认证令牌。

**端点**: `POST /auth/login`

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400,
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "role": "admin"
    }
  }
}
```

### 刷新令牌
刷新JWT令牌延长有效期。

**端点**: `POST /auth/refresh`

**请求头**: `Authorization: Bearer <token>`

**响应示例**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400
  }
}
```

### 退出登录
废弃当前JWT令牌。

**端点**: `POST /auth/logout`

**请求头**: `Authorization: Bearer <token>`

---

## 站点管理

### 获取站点列表
获取所有站点的分页列表。

**端点**: `GET /sites`

**请求头**: `Authorization: Bearer <token>`

**查询参数**:
- `page` (int, 可选): 页码，默认为1
- `limit` (int, 可选): 每页数量，默认为10，最大100
- `search` (string, 可选): 搜索关键词
- `status` (string, 可选): 站点状态 (`active`, `inactive`)

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": "site-123",
      "name": "我的博客",
      "domain": "myblog.com",
      "description": "个人技术博客",
      "status": "active",
      "settings": {
        "theme": "modern",
        "seo": {
          "title": "我的博客",
          "description": "分享技术和生活",
          "keywords": ["技术", "博客", "编程"]
        }
      },
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1
  }
}
```

### 创建站点
创建新的站点。

**端点**: `POST /sites`

**请求头**: `Authorization: Bearer <token>`

**请求体**:
```json
{
  "name": "我的新站点",
  "domain": "newsite.com",
  "description": "站点描述",
  "settings": {
    "theme": "modern",
    "seo": {
      "title": "站点标题",
      "description": "站点SEO描述",
      "keywords": ["关键词1", "关键词2"]
    }
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "site-456",
    "name": "我的新站点",
    "domain": "newsite.com",
    "description": "站点描述",
    "status": "active",
    "settings": {
      "theme": "modern",
      "seo": {
        "title": "站点标题",
        "description": "站点SEO描述",
        "keywords": ["关键词1", "关键词2"]
      }
    },
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### 获取单个站点
根据ID获取站点详细信息。

**端点**: `GET /sites/{siteId}`

**请求头**: `Authorization: Bearer <token>`

**路径参数**:
- `siteId` (string): 站点ID

**响应示例**: 同创建站点响应

### 更新站点
更新站点信息。

**端点**: `PUT /sites/{siteId}`

**请求头**: `Authorization: Bearer <token>`

**路径参数**:
- `siteId` (string): 站点ID

**请求体**: 同创建站点，所有字段可选

### 删除站点
删除指定站点及其所有内容。

**端点**: `DELETE /sites/{siteId}`

**请求头**: `Authorization: Bearer <token>`

**路径参数**:
- `siteId` (string): 站点ID

**响应**: HTTP 204 No Content

---

## 文章管理

### 获取文章列表
获取指定站点的文章列表。

**端点**: `GET /articles/{siteId}`

**请求头**: `X-API-Key: <api-key>`

**路径参数**:
- `siteId` (string): 站点ID

**查询参数**:
- `page` (int, 可选): 页码，默认为1
- `limit` (int, 可选): 每页数量，默认为10
- `status` (string, 可选): 文章状态 (`draft`, `published`, `archived`)
- `tags` (string, 可选): 标签过滤，多个标签用逗号分隔
- `search` (string, 可选): 搜索关键词
- `sortBy` (string, 可选): 排序字段 (`createdAt`, `updatedAt`, `publishedAt`)
- `sortOrder` (string, 可选): 排序方向 (`asc`, `desc`)

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": "article-123",
      "title": "我的第一篇文章",
      "slug": "my-first-article",
      "excerpt": "这是文章摘要",
      "content": "文章完整内容...",
      "status": "published",
      "tags": ["技术", "入门"],
      "seo": {
        "title": "我的第一篇文章 - SEO标题",
        "description": "文章SEO描述",
        "keywords": ["技术", "文章", "博客"]
      },
      "author": {
        "id": "user-123",
        "name": "作者名称"
      },
      "publishedAt": "2024-01-01T10:00:00Z",
      "createdAt": "2024-01-01T09:00:00Z",
      "updatedAt": "2024-01-01T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

### 创建文章
在指定站点创建新文章。

**端点**: `POST /articles/{siteId}`

**请求头**: `X-API-Key: <api-key>`

**路径参数**:
- `siteId` (string): 站点ID

**请求体**:
```json
{
  "title": "文章标题",
  "content": "文章内容（支持Markdown）",
  "excerpt": "文章摘要",
  "status": "draft",
  "tags": ["标签1", "标签2"],
  "seo": {
    "title": "SEO标题",
    "description": "SEO描述",
    "keywords": ["关键词1", "关键词2"]
  }
}
```

**响应示例**: 同文章列表中的单个文章对象

### 获取单个文章
根据ID获取文章详细信息。

**端点**: `GET /articles/{siteId}/{articleId}`

**请求头**: `X-API-Key: <api-key>`

**路径参数**:
- `siteId` (string): 站点ID
- `articleId` (string): 文章ID

### 更新文章
更新文章内容。

**端点**: `PUT /articles/{siteId}/{articleId}`

**请求头**: `X-API-Key: <api-key>`

**路径参数**:
- `siteId` (string): 站点ID
- `articleId` (string): 文章ID

**请求体**: 同创建文章，所有字段可选

### 删除文章
删除指定文章。

**端点**: `DELETE /articles/{siteId}/{articleId}`

**请求头**: `X-API-Key: <api-key>`

**路径参数**:
- `siteId` (string): 站点ID
- `articleId` (string): 文章ID

**响应**: HTTP 204 No Content

---

## 标签管理

### 获取标签列表
获取指定站点的所有标签。

**端点**: `GET /tags/{siteId}`

**请求头**: `X-API-Key: <api-key>`

**路径参数**:
- `siteId` (string): 站点ID

**查询参数**:
- `page` (int, 可选): 页码，默认为1
- `limit` (int, 可选): 每页数量，默认为10
- `search` (string, 可选): 搜索关键词

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": "tag-123",
      "name": "技术",
      "slug": "tech",
      "description": "技术相关文章",
      "color": "#007bff",
      "articleCount": 15,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 8,
    "totalPages": 1
  }
}
```

### 创建标签
在指定站点创建新标签。

**端点**: `POST /tags/{siteId}`

**请求头**: `X-API-Key: <api-key>`

**路径参数**:
- `siteId` (string): 站点ID

**请求体**:
```json
{
  "name": "新标签",
  "description": "标签描述",
  "color": "#28a745"
}
```

### 更新标签
更新标签信息。

**端点**: `PUT /tags/{siteId}/{tagId}`

**请求头**: `X-API-Key: <api-key>`

**路径参数**:
- `siteId` (string): 站点ID
- `tagId` (string): 标签ID

### 删除标签
删除标签（会从相关文章中移除）。

**端点**: `DELETE /tags/{siteId}/{tagId}`

**请求头**: `X-API-Key: <api-key>`

**路径参数**:
- `siteId` (string): 站点ID
- `tagId` (string): 标签ID

---

## 图片生成

### 生成图片
根据文本和配置生成图片。

**端点**: `POST /images/generate`

**请求体**:
```json
{
  "text": "图片文字",
  "width": 800,
  "height": 600,
  "fontSize": 32,
  "fontColor": "#ffffff",
  "backgroundColor": "#007bff",
  "template": "social"
}
```

**模板类型**:
- `social`: 社交媒体图片 (1200x630)
- `blog`: 博客文章图片 (800x600)
- `thumbnail`: 缩略图 (400x300)
- `hero`: 首页横幅 (1920x1080)

**响应**: 图片二进制数据 (Content-Type: image/png)

### 批量生成图片
批量生成多个图片。

**端点**: `POST /images/batch-generate`

**请求体**:
```json
{
  "images": [
    {
      "text": "图片1",
      "template": "social"
    },
    {
      "text": "图片2",
      "template": "blog"
    }
  ]
}
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "index": 0,
      "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
      "metadata": {
        "width": 1200,
        "height": 630,
        "size": 15432
      }
    }
  ]
}
```

---

## SEO管理

### 生成站点地图
生成指定站点的XML站点地图。

**端点**: `GET /seo/{siteId}/sitemap`

**请求头**: `X-API-Key: <api-key>`

**路径参数**:
- `siteId` (string): 站点ID

**响应**: XML格式的站点地图 (Content-Type: application/xml)

### 生成robots.txt
生成指定站点的robots.txt文件。

**端点**: `GET /seo/{siteId}/robots`

**请求头**: `X-API-Key: <api-key>`

**路径参数**:
- `siteId` (string): 站点ID

**响应**: robots.txt内容 (Content-Type: text/plain)

### SEO分析
分析文章的SEO质量并提供优化建议。

**端点**: `GET /seo/{siteId}/analyze/{articleId}`

**请求头**: `X-API-Key: <api-key>`

**路径参数**:
- `siteId` (string): 站点ID
- `articleId` (string): 文章ID

**响应示例**:
```json
{
  "success": true,
  "data": {
    "score": 85,
    "grade": "B+",
    "metrics": {
      "titleLength": 45,
      "descriptionLength": 155,
      "keywordDensity": 2.5,
      "headingStructure": "good",
      "imageAltTags": "partial",
      "internalLinks": 3,
      "readabilityScore": 78
    },
    "recommendations": [
      {
        "type": "warning",
        "message": "标题长度建议在50-60字符之间",
        "priority": "medium"
      },
      {
        "type": "suggestion",
        "message": "添加更多内部链接提升SEO效果",
        "priority": "low"
      }
    ]
  }
}
```

---

## CDN管理

### 清除缓存
清除指定文件或目录的CDN缓存。

**端点**: `POST /cdn/purge`

**请求头**: `X-API-Key: <api-key>`

**请求体**:
```json
{
  "files": [
    "https://example.com/article/123",
    "https://example.com/images/*"
  ]
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "purgeId": "purge-123456",
    "status": "processing",
    "filesCount": 2,
    "estimatedTime": 300
  }
}
```

### 获取缓存统计
获取CDN缓存命中率和性能统计。

**端点**: `GET /cdn/stats`

**请求头**: `X-API-Key: <api-key>`

**查询参数**:
- `days` (int, 可选): 统计天数，默认为7天
- `zone` (string, 可选): 指定区域

**响应示例**:
```json
{
  "success": true,
  "data": {
    "hitRate": 94.5,
    "bandwidth": {
      "total": "150.2 GB",
      "cached": "142.1 GB",
      "uncached": "8.1 GB"
    },
    "requests": {
      "total": 1250000,
      "cached": 1180000,
      "uncached": 70000
    },
    "geography": {
      "Asia": 45.2,
      "Europe": 32.1,
      "Americas": 22.7
    }
  }
}
```

---

## 域名管理

### 验证域名
验证域名DNS配置和SSL证书状态。

**端点**: `POST /domains/verify`

**请求头**: `X-API-Key: <api-key>`

**请求体**:
```json
{
  "domain": "example.com"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "domain": "example.com",
    "status": "active",
    "dnsStatus": "configured",
    "sslStatus": "active",
    "sslExpiry": "2024-12-01T00:00:00Z",
    "nameservers": [
      "ns1.cloudflare.com",
      "ns2.cloudflare.com"
    ],
    "records": [
      {
        "type": "A",
        "name": "@",
        "content": "192.168.1.1"
      }
    ]
  }
}
```

### 获取域名列表
获取所有已配置的域名。

**端点**: `GET /domains`

**请求头**: `X-API-Key: <api-key>`

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "domain": "example.com",
      "status": "active",
      "siteId": "site-123",
      "dnsStatus": "configured",
      "sslStatus": "active",
      "lastVerified": "2024-01-01T12:00:00Z"
    }
  ]
}
```

---

## 性能监控

### 健康检查
检查服务健康状态。

**端点**: `GET /health`

**响应示例**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T12:00:00Z",
    "uptime": 86400,
    "version": "1.0.0"
  }
}
```

### 性能报告
获取系统性能报告。

**端点**: `GET /performance`

**响应示例**:
```json
{
  "success": true,
  "data": {
    "performance": {
      "responseTime": {
        "avg": 125,
        "p95": 200,
        "p99": 350
      },
      "throughput": {
        "requestsPerSecond": 150,
        "peakRps": 300
      },
      "cache": {
        "hitRate": 92.5,
        "missRate": 7.5,
        "size": "1.2 GB"
      },
      "database": {
        "connections": 15,
        "queryTime": 45
      }
    },
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

---

## 限流

系统实施多层限流保护：

### IP级别限流
- **限制**: 每分钟100个请求
- **响应**: HTTP 429 Too Many Requests

### API Key级别限流
- **限制**: 每分钟1000个请求
- **响应**: HTTP 429 Too Many Requests

### 端点特定限流
- **图片生成**: 每分钟10个请求
- **SEO分析**: 每分钟5个请求
- **CDN清除**: 每小时50个请求

### 限流响应头
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
Retry-After: 60
```

---

## 缓存策略

### API响应缓存
- **文章列表**: 5分钟
- **单个文章**: 10分钟
- **标签列表**: 10分钟
- **站点信息**: 30分钟

### 缓存控制头
```
Cache-Control: public, max-age=300
ETag: "abc123"
Last-Modified: Wed, 21 Oct 2024 07:28:00 GMT
```

### 缓存失效
- 创建/更新/删除操作自动清除相关缓存
- 支持手动清除CDN缓存
- 标签更新会清除相关文章缓存

---

## 数据格式规范

### 日期时间
- **格式**: ISO 8601 (YYYY-MM-DDTHH:mm:ssZ)
- **时区**: UTC
- **示例**: `2024-01-01T12:00:00Z`

### 分页参数
- **page**: 页码，从1开始
- **limit**: 每页数量，范围1-100
- **默认**: page=1, limit=10

### 排序参数
- **sortBy**: 排序字段名
- **sortOrder**: `asc` 或 `desc`
- **默认**: 按创建时间降序

### 状态枚举
- **文章状态**: `draft`, `published`, `archived`
- **站点状态**: `active`, `inactive`, `maintenance`
- **域名状态**: `pending`, `active`, `error`

---

## 安全考虑

### HTTPS要求
- 所有API端点要求HTTPS连接
- 支持TLS 1.2及以上版本

### CORS配置
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key
Access-Control-Max-Age: 86400
```

### 内容安全
- 自动HTML转义
- Markdown内容过滤
- 文件上传验证
- SQL注入防护

### 数据验证
- 输入参数严格验证
- 文件类型检查
- 文件大小限制
- 域名格式验证

---

## SDK和工具

### JavaScript SDK
```javascript
import { CMSClient } from '@cms/js-sdk'

const client = new CMSClient({
  baseURL: 'https://api.example.com/v1',
  apiKey: 'your-api-key'
})

// 获取文章列表
const articles = await client.articles.list('site-123')

// 创建文章
const article = await client.articles.create('site-123', {
  title: '新文章',
  content: '文章内容'
})
```

### Python SDK
```python
from cms_sdk import CMSClient

client = CMSClient(
    base_url='https://api.example.com/v1',
    api_key='your-api-key'
)

# 获取文章列表
articles = client.articles.list('site-123')

# 创建文章
article = client.articles.create('site-123', {
    'title': '新文章',
    'content': '文章内容'
})
```

### CLI工具
```bash
# 安装CLI工具
npm install -g @cms/cli

# 配置认证
cms auth login

# 创建站点
cms sites create --name "我的站点" --domain "example.com"

# 发布文章
cms articles publish site-123 article-456
```

---

## 版本变更

### v1.1.0 (计划中)
- 添加文章模板功能
- 支持多媒体文件管理
- 增强SEO分析功能

### v1.0.0 (当前)
- 基础站点和文章管理
- 标签系统
- 图片生成服务
- SEO优化工具
- CDN集成

---

## 支持和联系

- **文档**: https://docs.example.com
- **GitHub**: https://github.com/example/cms
- **问题反馈**: https://github.com/example/cms/issues
- **邮箱**: support@example.com

---

*最后更新: 2024年1月1日*