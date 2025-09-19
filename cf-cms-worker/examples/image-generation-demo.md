# 图片处理服务演示

这个文档演示了如何使用Cloudflare Workers图片处理服务的各种功能。

## 功能特性

- ✅ 动态文字图片生成
- ✅ 图片格式转换（WebP/AVIF）
- ✅ 尺寸调整和优化
- ✅ 高效缓存策略
- ✅ Workers环境优化

## API端点

### 基础信息

```http
GET /api/v1/images/info
```

返回支持的格式、限制和功能列表。

### 健康检查

```http
GET /api/v1/images/health
```

检查服务状态和缓存连接。

## 文字图片生成

### 1. 通过GET请求生成

```http
GET /api/v1/images/generate?text=Hello%20World&width=800&height=400&backgroundColor=%23ffffff&textColor=%23000000&format=png
```

**参数说明：**
- `text` (必需): 要显示的文字
- `width`: 图片宽度 (默认: 800, 最大: 4096)
- `height`: 图片高度 (默认: 400, 最大: 4096)
- `backgroundColor`: 背景颜色 (默认: #ffffff)
- `textColor`: 文字颜色 (默认: #000000)
- `fontSize`: 字体大小 (默认: 32, 范围: 8-200)
- `fontFamily`: 字体族 (默认: Arial, sans-serif)
- `format`: 输出格式 (默认: png, 支持: jpeg/png/webp/avif/svg)
- `quality`: 图片质量 (默认: 85, 范围: 1-100)

### 2. 通过POST请求生成

```http
POST /api/v1/images/generate
Content-Type: application/json

{
  "text": "Hello World",
  "width": 800,
  "height": 400,
  "backgroundColor": "#ffffff",
  "textColor": "#000000",
  "fontSize": 32,
  "format": "png",
  "quality": 85
}
```

### 示例用法

#### 创建简单的文字图片
```bash
curl "https://your-worker.dev/api/v1/images/generate?text=Hello%20World"
```

#### 创建自定义样式的图片
```bash
curl "https://your-worker.dev/api/v1/images/generate?text=重要通知&width=1200&height=600&backgroundColor=%23ff6b6b&textColor=%23ffffff&fontSize=48"
```

#### 创建多行文本图片
```bash
curl "https://your-worker.dev/api/v1/images/generate?text=这是一个很长的文本，会自动换行显示在多行上&width=400&fontSize=24"
```

## 图片转换

### 1. 通过URL转换图片

```http
GET /api/v1/images/transform?url=https://example.com/image.jpg&width=400&height=300&format=webp&quality=80
```

**参数说明：**
- `url` (必需): 要转换的图片URL
- `width`: 目标宽度
- `height`: 目标高度
- `format`: 目标格式 (jpeg/png/webp/avif)
- `quality`: 压缩质量 (1-100)
- `fit`: 适应方式 (scale-down/contain/cover/crop/pad)
- `sharpen`: 锐化强度 (0-10)
- `blur`: 模糊强度 (0-250)
- `brightness`: 亮度调整 (-1 到 1)
- `contrast`: 对比度调整 (-1 到 1)
- `saturation`: 饱和度调整 (-1 到 1)
- `gamma`: 伽马调整 (0.3-3)
- `rotate`: 旋转角度 (90/180/270)

### 2. 通过文件上传转换

```http
POST /api/v1/images/transform
Content-Type: multipart/form-data

file: [图片文件]
width: 400
height: 300
format: webp
quality: 80
```

### 3. 通过JSON请求转换

```http
POST /api/v1/images/transform
Content-Type: application/json

{
  "url": "https://example.com/image.jpg",
  "width": 400,
  "height": 300,
  "format": "webp",
  "quality": 80,
  "fit": "cover"
}
```

### 示例用法

#### 调整图片尺寸
```bash
curl "https://your-worker.dev/api/v1/images/transform?url=https://example.com/large-image.jpg&width=800&height=600&fit=cover"
```

#### 转换为WebP格式
```bash
curl "https://your-worker.dev/api/v1/images/transform?url=https://example.com/image.png&format=webp&quality=80"
```

#### 应用多种效果
```bash
curl "https://your-worker.dev/api/v1/images/transform?url=https://example.com/image.jpg&sharpen=2&brightness=0.1&contrast=0.2&saturation=-0.1"
```

## 缓存管理

### 清除特定缓存

```http
DELETE /api/v1/images/cache/CACHE_KEY
```

### 清除所有缓存

```http
DELETE /api/v1/images/cache
```

## 响应格式

### 成功响应

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "message": "图片生成成功"
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "version": "1.0.0"
  }
}
```

### 错误响应

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数无效",
    "details": [...]
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "version": "1.0.0"
  }
}
```

## 缓存策略

- **缓存时间**: 生成的图片缓存24小时
- **浏览器缓存**: 1年 (max-age=31536000)
- **缓存键**: 基于输入参数的哈希值生成
- **缓存命中**: 响应头包含 `X-Cache: HIT`
- **缓存未命中**: 响应头包含 `X-Cache: MISS`

## 限制说明

### 尺寸限制
- 最大宽度/高度: 4096px
- 最小尺寸: 1px

### 文字限制
- 最大字符数: 500字符
- 字体大小范围: 8-200px

### 格式支持
- 输入格式: JPEG, PNG, WebP, AVIF
- 输出格式: JPEG, PNG, WebP, AVIF, SVG

### Workers限制
- CPU时间: 每个请求最多10秒
- 内存: 128MB
- 文件大小: 建议小于10MB

## 性能优化建议

1. **使用缓存**: 相同参数的请求会从缓存返回
2. **选择合适格式**: WebP/AVIF体积更小
3. **调整质量**: 根据用途选择合适的压缩质量
4. **批量处理**: 对于大量图片，考虑分批处理
5. **CDN配合**: 将Workers部署在CDN后，进一步提升性能

## 实际应用场景

### 1. 动态OG图片生成
```bash
# 为博客文章生成Open Graph图片
curl "https://your-worker.dev/api/v1/images/generate?text=博客标题&width=1200&height=630&backgroundColor=%231a73e8&textColor=%23ffffff&fontSize=40"
```

### 2. 头像占位图生成
```bash
# 生成用户头像占位图
curl "https://your-worker.dev/api/v1/images/generate?text=张三&width=200&height=200&backgroundColor=%23f0f0f0&fontSize=60"
```

### 3. 图片压缩优化
```bash
# 压缩用户上传的图片
curl "https://your-worker.dev/api/v1/images/transform?url=https://example.com/upload.jpg&format=webp&quality=75&width=1024"
```

### 4. 响应式图片生成
```bash
# 生成不同尺寸的响应式图片
curl "https://your-worker.dev/api/v1/images/transform?url=https://example.com/hero.jpg&width=320&format=webp"
curl "https://your-worker.dev/api/v1/images/transform?url=https://example.com/hero.jpg&width=768&format=webp"
curl "https://your-worker.dev/api/v1/images/transform?url=https://example.com/hero.jpg&width=1200&format=webp"
```

## 错误代码说明

- `VALIDATION_ERROR`: 请求参数验证失败
- `MISSING_PARAMETER`: 缺少必需参数
- `INVALID_DIMENSION`: 图片尺寸无效
- `INVALID_FORMAT`: 图片格式无效
- `INVALID_COLOR`: 颜色格式无效
- `MISSING_URL`: 缺少图片URL
- `MISSING_FILE`: 缺少上传文件
- `INVALID_CONTENT_TYPE`: 不支持的内容类型
- `IMAGE_GENERATION_ERROR`: 图片生成失败
- `IMAGE_TRANSFORM_ERROR`: 图片转换失败
- `CACHE_CLEAR_ERROR`: 缓存清除失败
- `HEALTH_CHECK_ERROR`: 健康检查失败