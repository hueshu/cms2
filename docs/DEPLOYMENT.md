# 部署指南

多站点CMS系统基于Cloudflare全家桶构建，本指南将详细介绍如何将系统部署到生产环境。

## 📋 部署概览

### 架构组件
- **Cloudflare Workers**: 后端API服务
- **Cloudflare Pages**: 前端管理界面
- **Cloudflare D1**: SQLite数据库
- **Cloudflare KV**: 缓存存储
- **Cloudflare CDN**: 全球内容分发

### 部署流程
1. [环境准备](#环境准备)
2. [数据库配置](#数据库配置)
3. [Workers部署](#workers部署)
4. [Pages部署](#pages部署)
5. [域名配置](#域名配置)
6. [SSL证书配置](#ssl证书配置)
7. [生产优化](#生产优化)

---

## 🔧 环境准备

### 前置要求

#### 系统要求
- Node.js 18+
- npm 8+ 或 yarn 1.22+
- Git 2.30+

#### Cloudflare账号
- Cloudflare账号（免费计划即可开始）
- 域名管理权限
- Workers付费计划（推荐，更多资源限制）

#### 开发工具
```bash
# 安装Wrangler CLI
npm install -g wrangler

# 验证安装
wrangler --version

# 登录Cloudflare账号
wrangler auth login
```

### 项目初始化

```bash
# 克隆项目
git clone https://github.com/your-org/cms2.git
cd cms2

# 安装Workers依赖
cd cf-cms-worker
npm install

# 安装Pages依赖
cd ../cf-cms-site
npm install

# 返回项目根目录
cd ..
```

---

## 🗄️ 数据库配置

### 创建D1数据库

```bash
# 进入Workers目录
cd cf-cms-worker

# 创建D1数据库
wrangler d1 create cms-production

# 记录数据库ID，将在wrangler.toml中使用
# Database created with ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 配置数据库连接

编辑 `cf-cms-worker/wrangler.toml`:

```toml
name = "cf-cms-worker-prod"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# D1数据库配置
[[d1_databases]]
binding = "DB"
database_name = "cms-production"
database_id = "your-database-id-here"

# KV存储配置
[[kv_namespaces]]
binding = "CACHE_KV"
id = "your-kv-namespace-id"
preview_id = "your-kv-preview-id"

# 环境变量
[vars]
ENVIRONMENT = "production"

# 生产环境密钥（使用wrangler secret put设置）
# JWT_SECRET
# CLOUDFLARE_API_TOKEN
# CLOUDFLARE_API_EMAIL
```

### 创建KV命名空间

```bash
# 创建生产环境KV
wrangler kv:namespace create "CACHE_KV"

# 创建预览环境KV
wrangler kv:namespace create "CACHE_KV" --preview

# 记录返回的ID，更新到wrangler.toml
```

### 初始化数据库结构

```bash
# 执行数据库迁移
wrangler d1 execute cms-production --file=./src/schema.sql

# 验证表结构
wrangler d1 execute cms-production --command="SELECT name FROM sqlite_master WHERE type='table';"
```

---

## ⚡ Workers部署

### 配置环境变量

```bash
cd cf-cms-worker

# 设置JWT密钥
wrangler secret put JWT_SECRET
# 输入强密码，建议使用随机生成的64位字符串

# 设置Cloudflare API凭据
wrangler secret put CLOUDFLARE_API_TOKEN
wrangler secret put CLOUDFLARE_API_EMAIL

# 验证配置
wrangler secret list
```

### 部署到生产环境

```bash
# 构建并部署
npm run deploy

# 或使用详细命令
wrangler deploy --env production

# 查看部署状态
wrangler deployments list
```

### 验证Workers部署

```bash
# 测试健康检查端点
curl https://your-worker-domain.workers.dev/api/health

# 预期响应
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

---

## 🌐 Pages部署

### 配置Pages项目

```bash
cd cf-cms-site

# 创建Pages项目
wrangler pages project create cms-frontend

# 配置构建设置
cat > .pages.toml << EOF
[build]
command = "npm run build"
destination = "dist"

[build.environment]
NODE_VERSION = "18"

[[headers]]
for = "/*"
[headers.values]
X-Frame-Options = "DENY"
X-Content-Type-Options = "nosniff"
X-XSS-Protection = "1; mode=block"
EOF
```

### 环境变量配置

```bash
# 设置API端点
wrangler pages secret put API_BASE_URL
# 输入: https://your-worker-domain.workers.dev/api/v1

# 设置其他环境变量
wrangler pages secret put SITE_TITLE
wrangler pages secret put SITE_DESCRIPTION
```

### 部署前端

```bash
# 构建项目
npm run build

# 部署到Pages
wrangler pages deploy dist --project-name=cms-frontend

# 或使用自动部署
wrangler pages project create cms-frontend --production-branch=main
```

---

## 🌍 域名配置

### 自定义域名设置

#### Workers域名配置

```bash
# 添加自定义域名到Workers
wrangler route put api.yourdomain.com/api/* cms-production

# 或通过Cloudflare仪表板配置
# 1. 登录Cloudflare仪表板
# 2. 选择域名
# 3. 转到Workers Routes
# 4. 添加路由: api.yourdomain.com/api/* -> cms-production
```

#### Pages域名配置

```bash
# 添加自定义域名到Pages
wrangler pages domain add yourdomain.com --project-name=cms-frontend

# 配置CNAME记录
# yourdomain.com -> cms-frontend.pages.dev
```

### DNS配置示例

在Cloudflare DNS设置中添加以下记录：

```
类型    名称        目标                        TTL     代理状态
A       @           192.0.2.1                   Auto    已代理
CNAME   www         yourdomain.com              Auto    已代理
CNAME   api         cms-production.workers.dev  Auto    已代理
CNAME   admin       cms-frontend.pages.dev      Auto    已代理
```

---

## 🔐 SSL证书配置

### 自动SSL证书

Cloudflare会自动为代理的域名提供SSL证书：

1. 确保DNS记录状态为"已代理"（橙色云朵）
2. 在SSL/TLS设置中选择"完全"或"完全（严格）"模式
3. 启用"始终使用HTTPS"
4. 启用"HSTS"增强安全性

### 验证SSL配置

```bash
# 检查SSL证书
curl -I https://yourdomain.com

# 预期响应头包含
# HTTP/2 200
# strict-transport-security: max-age=31536000; includeSubDomains
```

---

## 🚀 生产优化

### 性能优化

#### 缓存配置

```javascript
// 在wrangler.toml中配置缓存规则
[env.production.vars]
CACHE_TTL_ARTICLES = "3600"      # 1小时
CACHE_TTL_SITES = "7200"         # 2小时
CACHE_TTL_IMAGES = "86400"       # 24小时
```

#### 压缩和优化

```toml
# 在wrangler.toml中启用压缩
[env.production]
compatibility_flags = ["nodejs_compat"]
minify = true

[env.production.build]
command = "npm run build:production"
```

### 安全配置

#### 安全头设置

```javascript
// 在Workers中配置安全头
app.use('*', secureHeaders({
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'"]
  }
}))
```

#### API安全

```bash
# 轮换API密钥
wrangler secret put API_MASTER_KEY

# 设置IP白名单（如需要）
wrangler secret put ALLOWED_IPS
```

### 监控配置

#### 日志记录

```javascript
// 配置结构化日志
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  level: 'info',
  message: 'Request processed',
  userId: user.id,
  duration: endTime - startTime
}))
```

#### 错误追踪

```bash
# 集成Sentry或其他错误追踪服务
wrangler secret put SENTRY_DSN
```

---

## 📊 部署验证

### 功能验证清单

```bash
# 1. API健康检查
curl https://api.yourdomain.com/api/health

# 2. 认证功能测试
curl -X POST https://api.yourdomain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass"}'

# 3. 站点创建测试
curl -X POST https://api.yourdomain.com/api/v1/sites \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Site","domain":"test.example.com"}'

# 4. 图片生成测试
curl -X POST https://api.yourdomain.com/api/v1/images/generate \
  -H "Content-Type: application/json" \
  -d '{"text":"Test Image","width":800,"height":600}'

# 5. 前端访问测试
curl -I https://yourdomain.com
```

### 性能基准测试

```bash
# 使用Apache Bench进行负载测试
ab -n 1000 -c 10 https://api.yourdomain.com/api/health

# 使用wrk进行压力测试
wrk -t12 -c400 -d30s https://api.yourdomain.com/api/health

# 监控关键指标
# - 响应时间 < 500ms
# - 错误率 < 1%
# - 缓存命中率 > 90%
```

---

## 🔧 故障排查

### 常见问题

#### Workers部署失败

```bash
# 检查配置文件
wrangler config list

# 验证权限
wrangler auth whoami

# 查看详细错误
wrangler deploy --verbose

# 检查资源限制
wrangler dev --inspect
```

#### 数据库连接问题

```bash
# 测试D1连接
wrangler d1 execute cms-production --command="SELECT 1"

# 检查KV访问
wrangler kv:key list --namespace-id=YOUR_KV_ID

# 验证绑定配置
wrangler bindings list
```

#### 域名解析问题

```bash
# 检查DNS传播
dig yourdomain.com
nslookup api.yourdomain.com

# 验证SSL证书
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# 检查路由配置
curl -H "Host: yourdomain.com" http://workers.dev/test
```

### 日志分析

```bash
# 查看Workers日志
wrangler tail

# 过滤错误日志
wrangler tail --format=pretty | grep ERROR

# 实时监控
wrangler tail --format=json | jq '.events[] | select(.outcome == "exception")'
```

---

## 🔄 持续部署

### GitHub Actions配置

创建 `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare

on:
  push:
    branches: [main]

jobs:
  deploy-worker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: cf-cms-worker/package-lock.json

      - name: Install dependencies
        run: |
          cd cf-cms-worker
          npm ci

      - name: Run tests
        run: |
          cd cf-cms-worker
          npm test

      - name: Deploy Worker
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: 'cf-cms-worker'

  deploy-pages:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: cf-cms-site/package-lock.json

      - name: Install and Build
        run: |
          cd cf-cms-site
          npm ci
          npm run build

      - name: Deploy Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: cms-frontend
          directory: cf-cms-site/dist
```

### 环境变量设置

在GitHub仓库设置中添加以下Secrets：

- `CLOUDFLARE_API_TOKEN`: Cloudflare API令牌
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare账户ID
- `JWT_SECRET`: JWT密钥
- `DATABASE_ID`: D1数据库ID
- `KV_NAMESPACE_ID`: KV命名空间ID

---

## 📈 扩展配置

### 多环境部署

#### 环境配置

```toml
# wrangler.toml - 多环境配置
[env.staging]
name = "cf-cms-worker-staging"
[[env.staging.d1_databases]]
binding = "DB"
database_name = "cms-staging"
database_id = "staging-db-id"

[env.production]
name = "cf-cms-worker-prod"
[[env.production.d1_databases]]
binding = "DB"
database_name = "cms-production"
database_id = "production-db-id"
```

#### 部署命令

```bash
# 部署到staging环境
wrangler deploy --env staging

# 部署到生产环境
wrangler deploy --env production

# 查看环境列表
wrangler deployments list --env production
```

### 负载均衡配置

#### 地理分布

```javascript
// 基于地理位置的路由
const getRegion = (request) => {
  const country = request.cf.country

  if (['US', 'CA', 'MX'].includes(country)) {
    return 'americas'
  } else if (['GB', 'DE', 'FR', 'IT'].includes(country)) {
    return 'europe'
  } else {
    return 'asia'
  }
}
```

#### 故障转移

```javascript
// 健康检查和故障转移
const healthCheck = async (endpoint) => {
  try {
    const response = await fetch(`${endpoint}/health`, {
      timeout: 5000
    })
    return response.ok
  } catch {
    return false
  }
}
```

---

## 🛡️ 安全最佳实践

### 访问控制

```javascript
// IP白名单中间件
const ipWhitelist = (allowedIPs) => {
  return async (c, next) => {
    const clientIP = c.req.header('CF-Connecting-IP')

    if (!allowedIPs.includes(clientIP)) {
      return c.json({ error: 'Access denied' }, 403)
    }

    await next()
  }
}
```

### 数据保护

```bash
# 数据库备份
wrangler d1 backup create cms-production

# 定期备份脚本
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
wrangler d1 backup create cms-production --name "backup_$DATE"
```

### 审计日志

```javascript
// 操作审计中间件
const auditLogger = async (c, next) => {
  const start = Date.now()
  const user = c.get('user')

  await next()

  const log = {
    timestamp: new Date().toISOString(),
    userId: user?.id,
    method: c.req.method,
    path: c.req.path,
    duration: Date.now() - start,
    statusCode: c.res.status
  }

  // 发送到日志服务
  await sendAuditLog(log)
}
```

---

## 💰 成本优化

### 资源使用监控

```bash
# 查看Workers使用情况
wrangler metrics --env production

# 监控D1使用量
wrangler d1 info cms-production

# KV使用统计
wrangler kv:key list --namespace-id=YOUR_KV_ID | wc -l
```

### 成本控制策略

1. **缓存优化**: 提高缓存命中率减少数据库查询
2. **请求优化**: 合并API调用减少请求数量
3. **数据压缩**: 启用gzip压缩减少带宽使用
4. **智能路由**: 使用地理位置路由减少延迟

### 免费额度管理

- **Workers**: 100,000请求/天
- **D1**: 100,000行读取/天
- **KV**: 100,000读取操作/天
- **Pages**: 500次构建/月

---

## 📞 支持和维护

### 监控设置

```yaml
# alerts.yml - 告警配置
alerts:
  - name: High Error Rate
    condition: error_rate > 5%
    notification: email, slack

  - name: High Response Time
    condition: avg_response_time > 1000ms
    notification: email

  - name: Database Connection Issues
    condition: db_connection_failures > 10
    notification: slack, pager
```

### 维护任务

```bash
# 定期维护脚本
#!/bin/bash

# 清理过期缓存
wrangler kv:key delete --namespace-id=YOUR_KV_ID expired_cache_key

# 优化数据库
wrangler d1 execute cms-production --command="VACUUM;"

# 备份重要数据
wrangler d1 backup create cms-production

# 检查系统健康
curl -f https://api.yourdomain.com/api/health || exit 1
```

### 技术支持

- **文档**: https://docs.yourdomain.com
- **问题反馈**: GitHub Issues
- **紧急支持**: support@yourdomain.com
- **社区讨论**: Discord/Slack

---

*部署指南最后更新: 2024年1月1日*