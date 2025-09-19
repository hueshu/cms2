# Multi-Site CMS 多站点内容管理系统

基于Cloudflare全家桶构建的多站点CMS系统，支持管理数十个独立网站，提供SEO优化、内容管理和自动化发布功能。

## 🚀 特性

- **多站点管理** - 一套系统管理多个独立网站
- **SEO优化** - 内置完整SEO解决方案
- **API驱动** - 纯API架构，支持自动化集成
- **边缘计算** - 基于Cloudflare Workers，全球加速
- **低成本运营** - 利用Cloudflare免费/低成本服务

## 📁 项目结构

```
cms2/
├── cf-cms-worker/      # Workers后端服务
│   ├── src/
│   │   ├── api/        # API路由
│   │   ├── models/     # 数据模型
│   │   ├── services/   # 业务服务
│   │   └── utils/      # 工具函数
│   └── wrangler.toml   # Workers配置
│
├── cf-cms-site/        # Pages前端
│   ├── src/
│   │   ├── styles/     # 样式文件
│   │   ├── js/         # JavaScript
│   │   └── templates/  # 页面模板
│   └── vite.config.ts  # Vite配置
│
└── .claude/            # 项目管理文件
    └── pm/
        └── epics/      # Epic和任务追踪
```

## 🛠 技术栈

- **后端**: Cloudflare Workers + Hono框架
- **前端**: Cloudflare Pages + Vite
- **数据库**: Cloudflare D1 (SQLite)
- **缓存**: Cloudflare KV
- **CDN**: Cloudflare CDN

## 📦 安装

### 前置要求

- Node.js 18+
- Cloudflare账号
- Wrangler CLI

### 安装步骤

1. 克隆仓库
```bash
git clone https://github.com/hueshu/cms2.git
cd cms2
```

2. 安装Workers项目依赖
```bash
cd cf-cms-worker
npm install
```

3. 安装Pages项目依赖
```bash
cd ../cf-cms-site
npm install
```

## 🔧 配置

### Workers配置

编辑 `cf-cms-worker/wrangler.toml`:

```toml
name = "cf-cms-worker"
# 添加你的KV和D1配置
```

### 环境变量

创建 `.env` 文件:

```env
# API密钥
API_KEY=your-api-key

# 其他配置
```

## 💻 开发

### 启动Workers开发服务器

```bash
cd cf-cms-worker
npm run dev
```

### 启动Pages开发服务器

```bash
cd cf-cms-site
npm run dev
```

## 🚀 部署

### 部署Workers

```bash
cd cf-cms-worker
npm run deploy
```

### 部署Pages

```bash
cd cf-cms-site
npm run deploy
```

## 📖 API文档

### 站点管理

- `POST /api/sites` - 创建站点
- `GET /api/sites` - 获取站点列表
- `PUT /api/sites/{siteId}` - 更新站点配置

### 内容管理

- `POST /api/sites/{siteId}/articles` - 创建文章
- `GET /api/sites/{siteId}/articles` - 获取文章列表
- `PUT /api/sites/{siteId}/articles/{id}` - 更新文章
- `DELETE /api/sites/{siteId}/articles/{id}` - 删除文章

## 🗺 开发路线图

- [x] 项目初始化与基础架构
- [ ] 数据库设计与初始化
- [ ] 核心API框架
- [ ] 站点管理功能
- [ ] 内容管理系统
- [ ] 模板与页面生成
- [ ] SEO优化套件
- [ ] 图片生成服务
- [ ] 性能优化
- [ ] 测试与文档

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可

MIT License

## 👥 作者

- HueShu (hueshu@gmail.com)

---

Built with ❤️ using Cloudflare