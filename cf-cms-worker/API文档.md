# CF-CMS-Worker API 文档

## 概述
CF-CMS-Worker 是一个基于 Cloudflare Workers 的多站点内容管理系统，支持多域名映射和反向代理。

## 部署信息
- **主域名**: https://cf-cms-worker.email777.org
- **反向代理域名示例**:
  - cmsceshi.xiniujianji.com → site-001 (犀牛剪辑)
  - cms.bwg87.com → site-002 (搬瓦工VPS)

## 站点列表
| 站点ID | 站点名称 | 主域名 | 备用域名 |
|--------|----------|--------|----------|
| site-001 | 犀牛剪辑 | cmsceshi.xiniujianji.com | - |
| site-002 | 搬瓦工VPS | cms.bwg87.com | www.bwg87.com, bwg87.com |

## API 接口说明

### 认证方式
API 使用 `X-API-Key` 进行认证，在请求头中添加：
```
X-API-Key: YOUR_API_KEY
```

### 基础路径
所有 API 请求的基础路径为：`/api/v1`

---

## 文章管理接口

### 1. 创建文章
**接口**: `POST /api/v1/articles/{siteId}`

**请求头**:
```
X-API-Key: YOUR_API_KEY
Content-Type: application/json
```

**请求体**:
```json
{
  "title": "文章标题",           // 必填，1-200字符
  "slug": "article-slug",        // 可选，URL友好标识(小写字母数字加横杠)
  "content": "文章内容HTML",     // 可选，支持HTML格式
  "summary": "文章摘要",         // 可选，最多500字符
  "cover_image": "https://...",  // 可选，封面图URL
  "meta_title": "SEO标题",       // 可选，最多100字符
  "meta_description": "SEO描述", // 可选，最多200字符
  "meta_keywords": "关键词",     // 可选，SEO关键词
  "status": "published",         // 可选，draft(草稿)|published(已发布)
  "author": "作者名",            // 可选
  "tags": ["标签1", "标签2"]     // 可选，标签数组
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "article-uuid",
    "title": "文章标题",
    "slug": "article-slug",
    "site_id": "site-001",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### 2. 更新文章
**接口**: `PUT /api/v1/articles/{siteId}/{articleId}`

**请求头**:
```
X-API-Key: YOUR_API_KEY
Content-Type: application/json
```

**请求体**: 所有字段均为可选
```json
{
  "title": "更新的标题",
  "slug": "updated-slug",
  "content": "更新的内容",
  "summary": "更新的摘要",
  "cover_image": "https://...",
  "meta_title": "SEO标题",
  "meta_description": "SEO描述",
  "meta_keywords": "关键词",
  "status": "published",        // draft|published|archived
  "tags": ["新标签1", "新标签2"]
}
```

### 3. 获取文章列表
**接口**: `GET /api/v1/articles/{siteId}`

**查询参数**:
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | number | 1 | 页码 |
| limit | number | 20 | 每页数量(最大100) |
| sort | string | desc | 排序方向(asc/desc) |
| sortBy | string | created_at | 排序字段 |
| search | string | - | 搜索关键词 |
| tags | string | - | 标签过滤(逗号分隔) |
| status | string | - | 状态过滤(draft/published/archived) |
| author | string | - | 作者过滤 |
| dateFrom | datetime | - | 开始日期 |
| dateTo | datetime | - | 结束日期 |

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": "article-uuid",
      "title": "文章标题",
      "slug": "article-slug",
      "summary": "文章摘要",
      "status": "published",
      "view_count": 100,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

### 4. 获取单篇文章
**通过ID获取**: `GET /api/v1/articles/{siteId}/{articleId}`

**通过Slug获取**: `GET /api/v1/articles/{siteId}/slug/{slug}`

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "article-uuid",
    "title": "文章标题",
    "slug": "article-slug",
    "content": "<p>文章内容...</p>",
    "summary": "文章摘要",
    "cover_image": "https://...",
    "status": "published",
    "author": "作者名",
    "tags": ["标签1", "标签2"],
    "view_count": 100,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
    "published_at": "2024-01-01T00:00:00Z"
  }
}
```

### 5. 删除文章
**接口**: `DELETE /api/v1/articles/{siteId}/{articleId}`

**响应**: 204 No Content

---

## 标签管理接口

### 1. 创建标签
**接口**: `POST /api/v1/tags/{siteId}`

**请求体**:
```json
{
  "name": "标签名",              // 必填，1-50字符
  "slug": "tag-slug",           // 可选，URL友好标识
  "description": "标签描述"      // 可选，最多200字符
}
```

### 2. 获取标签列表
**接口**: `GET /api/v1/tags/{siteId}`

### 3. 更新标签
**接口**: `PUT /api/v1/tags/{siteId}/{tagId}`

### 4. 删除标签
**接口**: `DELETE /api/v1/tags/{siteId}/{tagId}`

---

## 图片管理接口

### 1. 生成图片
**接口**: `GET /api/v1/images/generate`

**查询参数**:
- `text`: 显示文本
- `width`: 图片宽度(默认800)
- `height`: 图片高度(默认600)
- `bg`: 背景颜色(hex格式，不含#)
- `color`: 文字颜色(hex格式，不含#)
- `fontSize`: 字体大小

**示例**: `/api/v1/images/generate?text=Hello&width=400&height=300&bg=6366f1&color=ffffff`

---

## 公开接口（无需认证）

### 1. 获取站点最新文章
**接口**: `GET /api/public/articles`

基于访问域名自动识别站点，返回该站点的最新文章列表。

**查询参数**:
- `limit`: 文章数量(默认10)
- `tag`: 标签过滤

### 2. 获取文章详情
**接口**: `GET /api/public/articles/{slug}`

通过slug获取文章详情，基于域名自动识别站点。

### 3. 获取站点标签
**接口**: `GET /api/public/tags`

获取当前站点的所有标签。

---

## 使用示例

### cURL 示例

#### 发布新文章
```bash
curl -X POST https://cf-cms-worker.email777.org/api/v1/articles/site-001 \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "犀牛剪辑新版本发布",
    "slug": "xiniu-new-version",
    "content": "<p>犀牛剪辑v2.0正式发布，带来全新功能...</p>",
    "summary": "新版本带来了更强大的批量处理功能",
    "status": "published",
    "tags": ["产品更新", "新功能"]
  }'
```

#### 获取文章列表
```bash
curl -X GET "https://cf-cms-worker.email777.org/api/v1/articles/site-001?page=1&limit=10&status=published" \
  -H "X-API-Key: YOUR_API_KEY"
```

#### 更新文章
```bash
curl -X PUT https://cf-cms-worker.email777.org/api/v1/articles/site-001/article-uuid \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "更新后的标题",
    "status": "published"
  }'
```

### JavaScript/Node.js 示例

```javascript
// 发布文章
async function publishArticle() {
  const response = await fetch('https://cf-cms-worker.email777.org/api/v1/articles/site-001', {
    method: 'POST',
    headers: {
      'X-API-Key': 'YOUR_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: '犀牛剪辑新版本发布',
      slug: 'xiniu-new-version',
      content: '<p>犀牛剪辑v2.0正式发布...</p>',
      summary: '新版本带来了更强大的批量处理功能',
      status: 'published',
      tags: ['产品更新', '新功能']
    })
  });

  const data = await response.json();
  console.log('发布成功:', data);
}

// 获取文章列表
async function getArticles() {
  const response = await fetch('https://cf-cms-worker.email777.org/api/v1/articles/site-001?status=published', {
    headers: {
      'X-API-Key': 'YOUR_API_KEY'
    }
  });

  const data = await response.json();
  console.log('文章列表:', data);
}
```

### Python 示例

```python
import requests

# 配置
API_BASE_URL = 'https://cf-cms-worker.email777.org/api/v1'
API_KEY = 'YOUR_API_KEY'
SITE_ID = 'site-001'

# 发布文章
def publish_article():
    url = f'{API_BASE_URL}/articles/{SITE_ID}'
    headers = {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
    }
    data = {
        'title': '犀牛剪辑新版本发布',
        'slug': 'xiniu-new-version',
        'content': '<p>犀牛剪辑v2.0正式发布...</p>',
        'summary': '新版本带来了更强大的批量处理功能',
        'status': 'published',
        'tags': ['产品更新', '新功能']
    }

    response = requests.post(url, headers=headers, json=data)
    return response.json()

# 获取文章列表
def get_articles(status='published', limit=10):
    url = f'{API_BASE_URL}/articles/{SITE_ID}'
    headers = {'X-API-Key': API_KEY}
    params = {'status': status, 'limit': limit}

    response = requests.get(url, headers=headers, params=params)
    return response.json()
```

---

## 错误处理

API 返回的错误格式：
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": {}
  }
}
```

常见错误码：
- `UNAUTHORIZED`: 未授权，API密钥无效
- `NOT_FOUND`: 资源不存在
- `VALIDATION_ERROR`: 请求参数验证失败
- `INTERNAL_ERROR`: 服务器内部错误
- `RATE_LIMIT_EXCEEDED`: 请求频率超限

---

## 注意事项

1. **API密钥安全**: 请妥善保管API密钥，不要在客户端代码中暴露
2. **请求频率限制**: API有频率限制，请避免过于频繁的请求
3. **内容格式**: 文章内容支持HTML格式，请确保HTML格式正确
4. **Slug规范**: slug应使用小写字母、数字和横杠，不含空格和特殊字符
5. **缓存策略**: 公开接口有10分钟缓存，管理接口有5分钟缓存

---

## 更新日志

### v1.0.0 (2024-01)
- 初始版本发布
- 支持多站点管理
- 文章、标签管理功能
- 反向代理域名支持
- API密钥认证