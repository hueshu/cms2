# 域名配置指南 - cmsceshi.xiniujianji.com

## 已完成的配置

✅ **数据库配置**
- 站点域名已更新为：cmsceshi.xiniujianji.com
- 域名记录已添加到domains表
- 站点名称：CMS测试站点

## 需要配置的DNS记录

### 1. 在你的域名DNS管理面板添加以下记录：

#### 方案A：直接CNAME到Workers（推荐）
```
类型: CNAME
名称: cmsceshi
值: cf-cms-worker.hueshu.workers.dev
代理状态: 已代理（橙色云朵）
```

#### 方案B：使用A记录（如果CNAME不可用）
```
类型: A
名称: cmsceshi
值: 192.0.2.1 （Cloudflare Workers的占位IP）
代理状态: 已代理（橙色云朵）
```

### 2. 配置Workers路由

在Cloudflare Dashboard中：

1. 进入你的域名管理
2. 点击 "Workers 路由"
3. 添加路由：
   - 路由: `cmsceshi.xiniujianji.com/*`
   - Worker: `cf-cms-worker`

或者使用命令行：
```bash
wrangler route add cmsceshi.xiniujianji.com/* cf-cms-worker
```

## 验证配置

### 1. DNS解析测试
```bash
# 测试DNS解析
nslookup cmsceshi.xiniujianji.com

# 测试HTTPS连接
curl -I https://cmsceshi.xiniujianji.com/api/v1/health
```

### 2. API测试
```bash
# 获取站点信息
curl -X GET "https://cmsceshi.xiniujianji.com/api/v1/sites" \
  -H "X-API-Key: test-api-key-2024"

# 获取文章列表
curl -X GET "https://cmsceshi.xiniujianji.com/api/v1/articles/site-001" \
  -H "X-API-Key: test-api-key-2024"
```

### 3. 浏览器访问测试

打开测试页面并修改API URL为新域名：
- API URL: https://cmsceshi.xiniujianji.com
- API Key: test-api-key-2024

## SSL证书

Cloudflare会自动为代理的域名提供SSL证书，无需额外配置。

## 故障排查

### 如果域名无法访问：

1. **检查DNS记录**
   - 确保CNAME或A记录已正确添加
   - 确保Cloudflare代理已启用（橙色云朵）

2. **检查Workers路由**
   - 确保路由规则已正确配置
   - 确保Worker名称正确

3. **等待DNS传播**
   - DNS更改可能需要几分钟到几小时才能生效

4. **检查Worker状态**
   ```bash
   wrangler tail
   ```

## 多域名支持

如需添加更多域名，可以：

1. 在数据库中添加新站点：
```sql
INSERT INTO sites (id, domain, name, status)
VALUES ('site-002', 'another.domain.com', 'Another Site', 'active');
```

2. 配置对应的DNS和Workers路由

## 自定义域名API访问

配置完成后，你可以通过以下方式访问API：

- 健康检查: https://cmsceshi.xiniujianji.com/api/v1/health
- 站点管理: https://cmsceshi.xiniujianji.com/api/v1/sites
- 文章管理: https://cmsceshi.xiniujianji.com/api/v1/articles/site-001
- 标签管理: https://cmsceshi.xiniujianji.com/api/v1/tags/site-001

## 前端页面部署

后续可以部署Pages前端到：
- https://cmsceshi.xiniujianji.com/ （主站）
- 或使用子路径: https://cmsceshi.xiniujianji.com/admin （管理后台）