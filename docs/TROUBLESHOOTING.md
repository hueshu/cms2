# 故障排查指南

本指南提供系统常见问题的诊断和解决方案，帮助您快速定位和解决技术问题。

## 📋 故障排查流程

### 基本排查步骤

1. **确认问题现象** - 详细描述问题表现
2. **收集错误信息** - 查看错误日志和状态码
3. **检查系统状态** - 验证服务和组件运行状态
4. **分析可能原因** - 根据症状判断问题类型
5. **执行解决方案** - 按优先级尝试修复方法
6. **验证修复效果** - 确认问题是否已解决
7. **记录处理过程** - 为后续类似问题提供参考

### 快速诊断工具

```bash
# 健康检查脚本
#!/bin/bash
echo "=== 系统健康检查 ==="

# 检查API服务状态
echo "检查API服务..."
curl -f https://your-domain.com/api/health || echo "❌ API服务异常"

# 检查数据库连接
echo "检查数据库..."
wrangler d1 execute cms-production --command="SELECT 1" || echo "❌ 数据库连接异常"

# 检查KV存储
echo "检查KV存储..."
wrangler kv:key list --namespace-id=YOUR_KV_ID | head -1 || echo "❌ KV存储异常"

# 检查CDN状态
echo "检查CDN..."
curl -I https://your-domain.com | grep -i "cf-ray" || echo "❌ CDN异常"

echo "=== 检查完成 ==="
```

---

## 🚨 服务不可用问题

### API服务无响应

**症状表现**
- API请求返回502/503错误
- 连接超时
- 服务完全无法访问

**可能原因**
1. Workers服务故障
2. 数据库连接问题
3. 资源配额耗尽
4. DNS解析问题

**排查步骤**

```bash
# 1. 检查Workers状态
wrangler tail --format=pretty

# 2. 检查最近部署
wrangler deployments list --env production

# 3. 检查资源使用
wrangler metrics --env production

# 4. 测试本地环境
wrangler dev
```

**解决方案**

**方案1: 重新部署服务**
```bash
# 回滚到上一个工作版本
wrangler rollback --env production

# 或重新部署当前版本
wrangler deploy --env production
```

**方案2: 检查配置问题**
```bash
# 验证环境变量
wrangler secret list

# 检查绑定配置
wrangler binding list
```

**方案3: 扩容资源**
- 升级Workers计划
- 增加CPU时间配额
- 扩展内存限制

### 数据库连接失败

**症状表现**
- 数据库操作超时
- D1连接错误
- 数据查询失败

**排查步骤**

```bash
# 1. 测试数据库连接
wrangler d1 execute cms-production --command="SELECT 1"

# 2. 检查数据库状态
wrangler d1 info cms-production

# 3. 验证绑定配置
grep -A 5 "d1_databases" wrangler.toml
```

**解决方案**

**方案1: 检查数据库ID**
```toml
# 确保wrangler.toml中的database_id正确
[[d1_databases]]
binding = "DB"
database_name = "cms-production"
database_id = "your-correct-database-id"
```

**方案2: 重建数据库连接**
```bash
# 创建新的数据库实例
wrangler d1 create cms-production-backup

# 导出现有数据
wrangler d1 export cms-production --output=backup.sql

# 导入到新实例
wrangler d1 execute cms-production-backup --file=backup.sql
```

---

## 🔐 认证和权限问题

### JWT令牌失效

**症状表现**
- 登录后立即提示重新登录
- API返回401未授权错误
- 令牌验证失败

**排查步骤**

```bash
# 1. 检查JWT密钥设置
wrangler secret list | grep JWT_SECRET

# 2. 验证令牌格式
echo "YOUR_JWT_TOKEN" | base64 -d

# 3. 检查系统时间
date -u
```

**解决方案**

**方案1: 重新设置JWT密钥**
```bash
# 生成新的强密钥
openssl rand -base64 32

# 更新密钥
wrangler secret put JWT_SECRET
```

**方案2: 调整令牌配置**
```javascript
// 增加令牌有效期
const token = jwt.sign(payload, secret, {
  expiresIn: '24h',  // 从1h改为24h
  issuer: 'cms-system',
  audience: 'cms-users'
})
```

### API密钥认证失败

**症状表现**
- API请求返回401错误
- 密钥验证不通过
- 权限不足提示

**排查步骤**

```bash
# 1. 测试API密钥
curl -H "X-API-Key: YOUR_API_KEY" \
     https://your-domain.com/api/v1/sites

# 2. 检查密钥格式
echo -n "YOUR_API_KEY" | wc -c

# 3. 验证请求头
curl -v -H "X-API-Key: YOUR_API_KEY" \
     https://your-domain.com/api/v1/health
```

**解决方案**

**方案1: 重新生成API密钥**
```javascript
// 生成新的API密钥
const crypto = require('crypto')
const apiKey = crypto.randomBytes(32).toString('hex')
console.log(apiKey)
```

**方案2: 检查密钥验证逻辑**
```javascript
// 确保密钥验证逻辑正确
const validateApiKey = (providedKey) => {
  const validKeys = env.API_KEYS?.split(',') || []
  return validKeys.includes(providedKey)
}
```

---

## 💾 数据库问题

### 查询性能慢

**症状表现**
- 数据库查询超时
- API响应时间过长
- 大量慢查询日志

**排查步骤**

```sql
-- 1. 检查表结构
.schema

-- 2. 分析查询计划
EXPLAIN QUERY PLAN SELECT * FROM articles WHERE status = 'published';

-- 3. 检查索引使用
.indices

-- 4. 查看表统计信息
ANALYZE;
SELECT * FROM sqlite_stat1;
```

**解决方案**

**方案1: 添加索引**
```sql
-- 为常用查询字段添加索引
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_site_id ON articles(site_id);
CREATE INDEX idx_articles_created_at ON articles(created_at);

-- 复合索引
CREATE INDEX idx_articles_site_status ON articles(site_id, status);
```

**方案2: 优化查询**
```javascript
// 避免SELECT *，只查询需要的字段
const articles = await db.prepare(`
  SELECT id, title, excerpt, status, created_at
  FROM articles
  WHERE site_id = ? AND status = 'published'
  ORDER BY created_at DESC
  LIMIT ?
`).bind(siteId, limit).all()

// 使用分页减少数据量
const offset = (page - 1) * limit
const articles = await db.prepare(`
  SELECT * FROM articles
  WHERE site_id = ?
  ORDER BY created_at DESC
  LIMIT ? OFFSET ?
`).bind(siteId, limit, offset).all()
```

### 数据丢失或损坏

**症状表现**
- 查询返回空结果
- 数据不一致
- 外键约束错误

**排查步骤**

```sql
-- 1. 检查表完整性
PRAGMA integrity_check;

-- 2. 检查外键约束
PRAGMA foreign_key_check;

-- 3. 统计表记录数
SELECT
  name,
  (SELECT COUNT(*) FROM sqlite_master WHERE name = main.name) as count
FROM sqlite_master
WHERE type = 'table';

-- 4. 检查最近的修改
SELECT * FROM articles ORDER BY updated_at DESC LIMIT 10;
```

**解决方案**

**方案1: 从备份恢复**
```bash
# 列出可用备份
wrangler d1 backup list cms-production

# 恢复指定备份
wrangler d1 backup restore cms-production --backup-id=BACKUP_ID
```

**方案2: 修复数据一致性**
```sql
-- 删除孤立记录
DELETE FROM article_tags
WHERE article_id NOT IN (SELECT id FROM articles);

-- 修复外键关系
UPDATE articles
SET site_id = (SELECT id FROM sites LIMIT 1)
WHERE site_id NOT IN (SELECT id FROM sites);
```

---

## 🌐 网络和CDN问题

### CDN缓存问题

**症状表现**
- 内容更新不生效
- 缓存命中率低
- 缓存失效延迟

**排查步骤**

```bash
# 1. 检查缓存状态
curl -H "Cache-Control: no-cache" https://your-domain.com/api/health

# 2. 查看缓存头信息
curl -I https://your-domain.com/api/articles

# 3. 测试缓存清除
curl -X POST https://your-domain.com/api/v1/cdn/purge \
     -H "X-API-Key: YOUR_API_KEY" \
     -d '{"files": ["https://your-domain.com/"]}'
```

**解决方案**

**方案1: 手动清除缓存**
```javascript
// 清除特定URL缓存
const purgeCache = async (urls) => {
  const response = await fetch('https://api.cloudflare.com/client/v4/zones/ZONE_ID/purge_cache', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ files: urls })
  })

  return await response.json()
}
```

**方案2: 调整缓存策略**
```javascript
// 设置更合理的缓存TTL
app.use('/api/articles/*', cacheMiddleware({
  ttl: 300,              // 5分钟缓存
  staleWhileRevalidate: 60, // 后台更新
  tags: ['articles']     // 缓存标签
}))
```

### 域名解析问题

**症状表现**
- 域名无法访问
- DNS解析失败
- SSL证书错误

**排查步骤**

```bash
# 1. 检查DNS解析
nslookup your-domain.com
dig your-domain.com

# 2. 检查DNS传播
dig @8.8.8.8 your-domain.com
dig @1.1.1.1 your-domain.com

# 3. 验证SSL证书
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# 4. 检查路由配置
curl -H "Host: your-domain.com" http://workers.dev/test
```

**解决方案**

**方案1: 修复DNS配置**
```bash
# 在Cloudflare DNS设置中添加正确记录
# A记录: @ -> 192.0.2.1 (代理开启)
# CNAME记录: www -> your-domain.com (代理开启)
```

**方案2: 重新申请SSL证书**
```bash
# 在Cloudflare SSL/TLS设置中
# 1. 设置为"完全"模式
# 2. 启用"始终使用HTTPS"
# 3. 强制HTTPS重写
```

---

## 🖼️ 图片生成问题

### 图片生成失败

**症状表现**
- 图片生成接口返回错误
- 生成的图片损坏
- 生成超时

**排查步骤**

```bash
# 1. 测试图片生成API
curl -X POST https://your-domain.com/api/v1/images/generate \
     -H "Content-Type: application/json" \
     -d '{
       "text": "测试图片",
       "width": 800,
       "height": 600,
       "template": "social"
     }' --output test-image.png

# 2. 检查生成参数
curl -v -X POST https://your-domain.com/api/v1/images/generate \
     -H "Content-Type: application/json" \
     -d '{"text": "简单测试"}'

# 3. 验证资源限制
wrangler metrics --env production | grep memory
```

**解决方案**

**方案1: 优化生成参数**
```javascript
// 限制文本长度和图片尺寸
const generateImage = async (params) => {
  // 限制文本长度
  if (params.text.length > 100) {
    params.text = params.text.substring(0, 100) + '...'
  }

  // 限制图片尺寸
  if (params.width > 2000) params.width = 2000
  if (params.height > 2000) params.height = 2000

  return await imageService.generate(params)
}
```

**方案2: 添加错误处理**
```javascript
const generateImageWithRetry = async (params, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await generateImage(params)
    } catch (error) {
      console.error(`生成失败 (尝试 ${i + 1}/${retries}):`, error)

      if (i === retries - 1) throw error

      // 等待重试
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
    }
  }
}
```

### 图片加载慢

**症状表现**
- 图片加载时间过长
- 图片无法显示
- 缓存未生效

**解决方案**

**方案1: 启用图片优化**
```javascript
// 图片压缩和格式优化
const optimizeImage = (imageBuffer, format = 'webp') => {
  return sharp(imageBuffer)
    .resize(800, 600, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .format(format, { quality: 85 })
    .toBuffer()
}
```

**方案2: 实现渐进式加载**
```javascript
// 生成缩略图和全尺寸图片
const generateMultiSizeImages = async (params) => {
  const [thumbnail, fullSize] = await Promise.all([
    generateImage({ ...params, width: 200, height: 150 }),
    generateImage(params)
  ])

  return { thumbnail, fullSize }
}
```

---

## 📊 性能问题

### 响应时间过长

**症状表现**
- API响应超过2秒
- 页面加载缓慢
- 用户体验差

**排查步骤**

```bash
# 1. 测量响应时间
time curl https://your-domain.com/api/v1/sites

# 2. 分析性能瓶颈
curl -w "DNS解析: %{time_namelookup}s\n连接时间: %{time_connect}s\n传输时间: %{time_total}s\n" \
     https://your-domain.com/api/health

# 3. 检查数据库性能
wrangler d1 execute cms-production --command="
  EXPLAIN QUERY PLAN
  SELECT * FROM articles
  WHERE site_id = 'test' AND status = 'published';"
```

**解决方案**

**方案1: 优化数据库查询**
```javascript
// 使用预编译语句
const getArticles = db.prepare(`
  SELECT id, title, excerpt, created_at
  FROM articles
  WHERE site_id = ? AND status = 'published'
  ORDER BY created_at DESC
  LIMIT ?
`)

// 批量查询
const articles = await getArticles.bind(siteId, limit).all()
```

**方案2: 增加缓存层**
```javascript
// 多层缓存策略
const getCachedArticles = async (siteId) => {
  // 1. 检查内存缓存
  let articles = memoryCache.get(`articles:${siteId}`)
  if (articles) return articles

  // 2. 检查KV缓存
  articles = await kv.get(`articles:${siteId}`, 'json')
  if (articles) {
    memoryCache.set(`articles:${siteId}`, articles, 300)
    return articles
  }

  // 3. 查询数据库
  articles = await db.getArticles(siteId)

  // 4. 更新缓存
  await kv.put(`articles:${siteId}`, JSON.stringify(articles), {
    expirationTtl: 3600
  })
  memoryCache.set(`articles:${siteId}`, articles, 300)

  return articles
}
```

### 内存使用过高

**症状表现**
- Workers内存超限
- 频繁内存错误
- 性能急剧下降

**解决方案**

**方案1: 优化内存使用**
```javascript
// 流式处理大数据
const processLargeData = async (data) => {
  const CHUNK_SIZE = 1000

  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.slice(i, i + CHUNK_SIZE)
    await processChunk(chunk)

    // 手动垃圾回收提示
    if (global.gc) global.gc()
  }
}

// 及时释放大对象
const processImage = async (imageData) => {
  try {
    const result = await generateImage(imageData)
    return result
  } finally {
    imageData = null // 释放引用
  }
}
```

**方案2: 限制并发请求**
```javascript
// 请求队列管理
class RequestQueue {
  constructor(maxConcurrent = 10) {
    this.maxConcurrent = maxConcurrent
    this.running = 0
    this.queue = []
  }

  async add(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject })
      this.process()
    })
  }

  async process() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return
    }

    this.running++
    const { task, resolve, reject } = this.queue.shift()

    try {
      const result = await task()
      resolve(result)
    } catch (error) {
      reject(error)
    } finally {
      this.running--
      this.process()
    }
  }
}
```

---

## 🔧 配置问题

### 环境变量配置错误

**症状表现**
- 功能不正常工作
- 配置未生效
- 服务启动失败

**排查步骤**

```bash
# 1. 检查所有环境变量
wrangler secret list

# 2. 验证配置文件
cat wrangler.toml | grep -A 10 "\[vars\]"

# 3. 测试特定配置
wrangler dev --var ENVIRONMENT=test
```

**解决方案**

**方案1: 重新设置环境变量**
```bash
# 设置必需的环境变量
wrangler secret put JWT_SECRET
wrangler secret put CLOUDFLARE_API_TOKEN
wrangler secret put DATABASE_URL

# 验证设置
wrangler secret list
```

**方案2: 配置验证中间件**
```javascript
// 启动时验证配置
const validateConfig = (env) => {
  const required = ['JWT_SECRET', 'CLOUDFLARE_API_TOKEN']
  const missing = required.filter(key => !env[key])

  if (missing.length > 0) {
    throw new Error(`缺少必需的环境变量: ${missing.join(', ')}`)
  }

  // 验证格式
  if (env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET长度不足')
  }
}
```

### wrangler.toml配置问题

**症状表现**
- 部署失败
- 绑定不正确
- 路由不工作

**解决方案**

**检查配置格式**
```toml
# 正确的配置示例
name = "cf-cms-worker-prod"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# 数据库绑定
[[d1_databases]]
binding = "DB"
database_name = "cms-production"
database_id = "your-database-id"

# KV绑定
[[kv_namespaces]]
binding = "CACHE_KV"
id = "your-kv-namespace-id"

# 环境变量
[vars]
ENVIRONMENT = "production"

# 路由配置
[[routes]]
pattern = "api.yourdomain.com/api/*"
zone_name = "yourdomain.com"
```

---

## 📞 获取帮助

### 日志收集

**收集必要信息**
```bash
# 1. 系统信息
wrangler --version
node --version

# 2. 配置信息
wrangler config list

# 3. 近期日志
wrangler tail --format=json | head -50

# 4. 错误详情
curl -v https://your-domain.com/api/health 2>&1
```

### 联系技术支持

**准备以下信息**
1. 问题详细描述
2. 错误信息和状态码
3. 问题复现步骤
4. 影响范围和紧急程度
5. 已尝试的解决方法

**联系方式**
- 紧急问题: support@yourdomain.com
- 工单系统: https://support.yourdomain.com
- 社区论坛: https://community.yourdomain.com
- 在线客服: 工作时间内可用

### 预防措施

**监控告警**
```yaml
# 建议的监控指标
monitors:
  - name: API可用性
    url: https://your-domain.com/api/health
    interval: 60s

  - name: 响应时间
    threshold: 2000ms
    notification: email

  - name: 错误率
    threshold: 5%
    notification: slack
```

**定期维护**
```bash
#!/bin/bash
# 定期维护脚本

# 1. 数据库优化
wrangler d1 execute cms-production --command="VACUUM;"

# 2. 清理过期缓存
wrangler kv:key delete --namespace-id=YOUR_KV_ID expired_*

# 3. 备份重要数据
wrangler d1 backup create cms-production

# 4. 检查系统健康
./health-check.sh

echo "维护完成"
```

---

*故障排查指南最后更新: 2024年1月1日*