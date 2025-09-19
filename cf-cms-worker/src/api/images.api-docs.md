# 图片服务 API 文档

## 概述

图片服务提供了强大的文字叠加功能，支持从简单的文字图片生成到复杂的多层文字叠加。本文档介绍了所有可用的API端点和使用方法。

## 基础功能

### 1. 生成简单文字图片

**POST** `/api/v1/images/generate`

```json
{
  "text": "Hello World",
  "width": 800,
  "height": 400,
  "backgroundColor": "#ffffff",
  "textColor": "#000000",
  "fontSize": 32,
  "fontFamily": "Arial, sans-serif",
  "format": "png",
  "quality": 85
}
```

**GET** `/api/v1/images/generate?text=Hello&width=800&height=400`

### 2. 转换图片

**POST** `/api/v1/images/transform`

```json
{
  "url": "https://example.com/image.jpg",
  "width": 800,
  "height": 600,
  "format": "webp",
  "quality": 80
}
```

## 高级文字叠加功能

### 1. 高级文字叠加

**POST** `/api/v1/images/advanced-text-overlay`

创建具有多个文字元素、特效和复杂布局的图片。

```json
{
  "width": 1200,
  "height": 630,
  "backgroundColor": "#f8fafc",
  "textElements": [
    {
      "text": "主标题",
      "style": {
        "fontSize": 64,
        "color": "#1f2937",
        "fontWeight": "bold",
        "shadow": {
          "offsetX": 2,
          "offsetY": 2,
          "blur": 4,
          "color": "rgba(0,0,0,0.3)"
        }
      },
      "position": {
        "x": "50%",
        "y": "30%",
        "anchor": "middle",
        "baseline": "middle"
      },
      "type": "title",
      "zIndex": 10
    },
    {
      "text": "副标题内容",
      "style": {
        "fontSize": 32,
        "color": "#6b7280",
        "fontWeight": "500",
        "gradient": {
          "type": "linear",
          "colors": ["#3b82f6", "#8b5cf6"],
          "direction": 45
        }
      },
      "position": {
        "x": "50%",
        "y": "60%",
        "anchor": "middle",
        "baseline": "middle",
        "maxWidth": 800
      },
      "type": "subtitle",
      "zIndex": 9
    }
  ],
  "format": "png",
  "quality": 90
}
```

**完整的文字样式选项：**

```json
{
  "style": {
    "fontSize": 48,
    "fontFamily": "Inter, system-ui, sans-serif",
    "color": "#000000",
    "fontWeight": "bold",
    "fontStyle": "italic",
    "textDecoration": "underline",
    "textTransform": "uppercase",
    "letterSpacing": 2,
    "lineHeight": 1.5,
    "shadow": {
      "offsetX": 3,
      "offsetY": 3,
      "blur": 6,
      "color": "rgba(0,0,0,0.5)"
    },
    "stroke": {
      "width": 2,
      "color": "#ffffff"
    },
    "gradient": {
      "type": "linear",
      "colors": ["#ff0000", "#00ff00", "#0000ff"],
      "direction": 90
    }
  }
}
```

**文字位置选项：**

```json
{
  "position": {
    "x": "50%",        // 可以是像素值或百分比
    "y": 200,          // 可以是像素值或百分比
    "anchor": "middle", // start, middle, end
    "baseline": "middle", // top, middle, bottom, hanging, central, ideographic
    "rotation": 15,     // 旋转角度
    "maxWidth": 600,    // 最大宽度（自动换行）
    "maxHeight": 400    // 最大高度
  }
}
```

### 2. 预设样式的文字叠加

**POST** `/api/v1/images/styled-text-overlay`

使用预定义的样式模板快速生成常见类型的图片。

```json
{
  "preset": "social-post",
  "title": "重大消息发布",
  "subtitle": "我们的新产品即将上线",
  "content": "敬请期待更多精彩功能和特性",
  "width": 1200,
  "height": 630,
  "backgroundColor": "#0f172a",
  "customColors": {
    "primary": "#38bdf8",
    "secondary": "#94a3b8",
    "accent": "#fbbf24"
  }
}
```

**GET** `/api/v1/images/styled-text-overlay?preset=article-header&title=文章标题&author=作者名`

**可用的预设样式：**

1. **social-post** - 社交媒体帖子
   - 支持字段：title, subtitle, content
   - 默认尺寸：1200x630

2. **article-header** - 文章封面
   - 支持字段：title, subtitle, author
   - 默认尺寸：1200x630

3. **watermark** - 水印
   - 支持字段：content
   - 自适应尺寸

4. **announcement** - 公告通知
   - 支持字段：title, content
   - 默认尺寸：1000x600

5. **quote** - 名言引用
   - 支持字段：content, author
   - 默认尺寸：800x600

### 3. 自动布局功能

在高级文字叠加中启用自动布局：

```json
{
  "textElements": [...],
  "autoLayout": {
    "enabled": true,
    "distribution": "space-between",
    "spacing": 30,
    "margin": {
      "top": 60,
      "right": 40,
      "bottom": 60,
      "left": 40
    }
  }
}
```

**分布方式选项：**
- `flex-start` - 顶部对齐
- `center` - 居中对齐
- `flex-end` - 底部对齐
- `space-between` - 两端对齐
- `space-around` - 环绕分布
- `space-evenly` - 均匀分布

### 4. 批量生成

**POST** `/api/v1/images/batch-text-overlay`

一次性生成多个图片（最多10个）：

```json
{
  "batches": [
    {
      "id": "image1",
      "options": {
        "width": 800,
        "height": 400,
        "backgroundColor": "#ffffff",
        "textElements": [
          {
            "text": "第一张图片",
            "style": { "fontSize": 48, "color": "#000000" },
            "position": { "x": "50%", "y": "50%", "anchor": "middle", "baseline": "middle" }
          }
        ]
      }
    },
    {
      "id": "image2",
      "options": {
        "width": 800,
        "height": 400,
        "backgroundColor": "#f3f4f6",
        "textElements": [
          {
            "text": "第二张图片",
            "style": { "fontSize": 48, "color": "#1f2937" },
            "position": { "x": "50%", "y": "50%", "anchor": "middle", "baseline": "middle" }
          }
        ]
      }
    }
  ]
}
```

**响应格式：**

```json
{
  "success": true,
  "data": {
    "message": "批量生成完成",
    "totalCount": 2,
    "successCount": 2,
    "failureCount": 0,
    "results": [
      {
        "id": "image1",
        "success": true,
        "imageData": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
        "contentType": "image/png"
      },
      {
        "id": "image2",
        "success": true,
        "imageData": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
        "contentType": "image/png"
      }
    ]
  }
}
```

## 工具API

### 1. 获取文字样式模板

**GET** `/api/v1/images/text-style-templates`

返回预定义的文字样式模板：

```json
{
  "success": true,
  "data": {
    "templates": {
      "heading": {
        "fontSize": 48,
        "fontFamily": "Inter, system-ui, sans-serif",
        "fontWeight": "bold",
        "lineHeight": 1.2,
        "color": "#1f2937"
      },
      "body": {
        "fontSize": 24,
        "fontFamily": "Inter, system-ui, sans-serif",
        "fontWeight": "normal",
        "lineHeight": 1.5,
        "color": "#374151"
      },
      // ... 更多模板
    }
  }
}
```

### 2. 获取预设样式信息

**GET** `/api/v1/images/presets`

返回所有可用的预设样式及其说明。

### 3. 获取服务信息

**GET** `/api/v1/images/info`

返回服务的能力、限制和端点信息。

## 使用示例

### 创建社交媒体分享图

```bash
curl -X POST "https://your-domain.com/api/v1/images/styled-text-overlay" \
  -H "Content-Type: application/json" \
  -d '{
    "preset": "social-post",
    "title": "🎉 产品发布会邀请",
    "subtitle": "全新AI驱动的内容管理系统",
    "content": "2024年12月1日 | 上海科技馆",
    "customColors": {
      "primary": "#38bdf8",
      "secondary": "#94a3b8",
      "accent": "#fbbf24"
    }
  }' \
  --output social-post.png
```

### 创建文章封面

```bash
curl -X GET "https://your-domain.com/api/v1/images/styled-text-overlay?preset=article-header&title=微服务架构设计原则&subtitle=从单体应用到分布式系统的演进策略&author=架构师小王" \
  --output article-header.png
```

### 创建复杂的文字叠加

```javascript
const response = await fetch('/api/v1/images/advanced-text-overlay', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    width: 1200,
    height: 800,
    backgroundColor: '#1e293b',
    textElements: [
      {
        text: 'AI技术峰会',
        style: {
          fontSize: 72,
          color: '#ffffff',
          fontWeight: 'bold',
          gradient: {
            type: 'linear',
            colors: ['#3b82f6', '#8b5cf6', '#ec4899'],
            direction: 45
          },
          shadow: {
            offsetX: 0,
            offsetY: 4,
            blur: 12,
            color: 'rgba(0,0,0,0.5)'
          }
        },
        position: {
          x: '50%',
          y: '25%',
          anchor: 'middle',
          baseline: 'middle'
        },
        type: 'title',
        zIndex: 10
      },
      {
        text: '探索人工智能的未来边界',
        style: {
          fontSize: 36,
          color: '#e2e8f0',
          fontWeight: '500',
          letterSpacing: 1
        },
        position: {
          x: '50%',
          y: '40%',
          anchor: 'middle',
          baseline: 'middle'
        },
        type: 'subtitle',
        zIndex: 9
      }
    ]
  })
})

const blob = await response.blob()
// 处理图片数据
```

## 错误处理

所有API返回统一的错误格式：

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数无效",
    "details": [
      {
        "path": ["textElements", 0, "style", "fontSize"],
        "message": "Number must be greater than or equal to 6"
      }
    ]
  }
}
```

常见错误代码：
- `VALIDATION_ERROR` - 参数验证失败
- `ADVANCED_TEXT_OVERLAY_ERROR` - 高级文字叠加生成失败
- `STYLED_TEXT_OVERLAY_ERROR` - 预设样式生成失败
- `BATCH_TEXT_OVERLAY_ERROR` - 批量生成失败
- `MISSING_PRESET` - 缺少预设样式参数
- `INVALID_PRESET` - 无效的预设样式

## 性能优化

1. **缓存策略**：
   - 基础文字图片缓存24小时
   - 高级文字叠加缓存10分钟粒度
   - 预设样式缓存30分钟粒度

2. **图片格式选择**：
   - 简单图形使用PNG
   - 照片背景使用JPEG
   - 现代浏览器使用WebP或AVIF

3. **尺寸建议**：
   - 社交媒体：1200x630
   - 文章封面：1200x630
   - 移动端分享：1080x1350 (9:16)
   - 桌面壁纸：1920x1080

## 限制说明

- 最大图片尺寸：4096x4096
- 最大文字元素数量：20个
- 单个文字元素最大长度：2000字符
- 批量生成最大数量：10个
- 渐变最大颜色数量：10个
- 字体大小范围：6-500px（高级模式）

## 更新日志

### v2.0.0 (2024-12-01)
- 新增高级文字叠加功能
- 支持多层文字元素
- 添加阴影、描边、渐变效果
- 实现自动布局功能
- 支持背景图片
- 新增预设样式模板
- 支持批量生成
- 优化缓存策略