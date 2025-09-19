# 🚀 快速部署到Cloudflare

## 前置准备

1. **Cloudflare账号**：确保已注册并登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. **Wrangler CLI**：已安装（`npm install -g wrangler`）
3. **Node.js**：版本 >= 18

## 第一步：配置环境变量

创建 `.env` 文件（基于 `.env.example`）：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的配置：

```env
# JWT密钥（生成一个随机密钥）
JWT_SECRET=your-super-secret-jwt-key-here

# Cloudflare配置
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token
CLOUDFLARE_EMAIL=your-email@example.com
```

## 第二步：部署Workers后端

```bash
# 进入Workers目录
cd cf-cms-worker

# 安装依赖
npm install

# 登录Cloudflare
wrangler login

# 创建D1数据库
wrangler d1 create cms-db

# 创建KV命名空间
wrangler kv:namespace create CACHE_KV
wrangler kv:namespace create CONFIG_KV

# 初始化数据库
wrangler d1 execute cms-db --file=./src/schema.sql

# 部署到Cloudflare Workers
wrangler deploy
```

部署成功后，你会得到一个Worker URL，类似：
`https://cf-cms-worker.your-subdomain.workers.dev`

## 第三步：部署Pages前端

```bash
# 进入Pages目录
cd ../cf-cms-pages

# 安装依赖
npm install

# 构建项目
npm run build

# 部署到Cloudflare Pages
wrangler pages deploy dist --project-name=cf-cms-pages
```

## 第四步：配置域名（可选）

1. 在Cloudflare Dashboard中添加自定义域名
2. 配置DNS记录指向Workers和Pages
3. 等待SSL证书自动配置

## 第五步：初始化系统

### 1. 创建管理员API Key

```bash
# 使用wrangler执行SQL命令
wrangler d1 execute cms-db --command="INSERT INTO api_keys (key, name, permissions) VALUES ('your-admin-api-key', 'Admin Key', 'admin')"
```

### 2. 创建第一个站点

```bash
curl -X POST https://your-worker-url/api/v1/sites \
  -H "X-API-Key: your-admin-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "example.com",
    "name": "我的第一个站点",
    "description": "测试站点"
  }'
```

### 3. 创建测试文章

```bash
# 替换 {site-id} 为上一步返回的站点ID
curl -X POST https://your-worker-url/api/v1/articles/{site-id} \
  -H "X-API-Key: your-admin-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "欢迎使用CF-CMS",
    "content": "这是你的第一篇文章内容...",
    "status": "published",
    "tags": ["测试", "欢迎"]
  }'
```

## 🧪 测试验证

### API健康检查
```bash
curl https://your-worker-url/api/v1/health
```

### 查看所有站点
```bash
curl https://your-worker-url/api/v1/sites \
  -H "X-API-Key: your-admin-api-key"
```

### 查看文章列表
```bash
curl https://your-worker-url/api/v1/articles/{site-id} \
  -H "X-API-Key: your-admin-api-key"
```

## 📊 监控和日志

1. **Workers日志**：在Cloudflare Dashboard > Workers > Logs查看
2. **性能监控**：访问 `/api/v1/performance/metrics`
3. **缓存状态**：访问 `/api/v1/performance/cache-stats`

## 🔧 常见问题

### 1. D1数据库连接失败
- 检查 `wrangler.toml` 中的数据库绑定配置
- 确保数据库已创建并初始化

### 2. KV存储不工作
- 检查KV命名空间是否正确创建
- 验证 `wrangler.toml` 中的KV绑定

### 3. API认证失败
- 确保API Key正确设置在请求头中
- 检查API Key在数据库中的权限配置

## 📚 下一步

- 查看完整文档：[用户指南](./docs/USER_GUIDE.md)
- API文档：[API参考](./docs/API.md)
- 故障排查：[问题解决](./docs/TROUBLESHOOTING.md)

## 🆘 需要帮助？

- GitHub Issues: https://github.com/hueshu/cms2/issues
- 文档站点：查看 `/docs` 目录

---

**提示**：首次部署建议使用测试环境，验证所有功能正常后再部署到生产环境。