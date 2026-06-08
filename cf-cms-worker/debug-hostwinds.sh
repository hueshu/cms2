#!/bin/bash

echo "=== 域名映射调试 ==="
echo ""

echo "1. 检查数据库中的域名配置："
npx wrangler d1 execute cms-database --remote --command="SELECT site_id, domain, is_primary FROM domain_mappings WHERE site_id = 'site-003';" 2>/dev/null | grep -A 10 "results"

echo ""
echo "2. 直接访问Worker（模拟反向代理）："
curl -s -H "X-Forwarded-Host: cms.hostwindsvps.cn" https://cf-cms-worker.email777.org/ | head -20

echo ""
echo "3. 访问反向代理服务器："
curl -I https://cms.hostwindsvps.cn/ 2>&1 | head -5

echo ""
echo "4. 测试其他域名（hostwindsvps.cn）："
curl -s -H "X-Forwarded-Host: hostwindsvps.cn" https://cf-cms-worker.email777.org/ | head -20

echo ""
echo "=== 对比犀牛剪辑的配置 ==="
echo ""

echo "5. 犀牛剪辑域名配置："
npx wrangler d1 execute cms-database --remote --command="SELECT site_id, domain, is_primary FROM domain_mappings WHERE site_id = 'site-001';" 2>/dev/null | grep -A 10 "results"

echo ""
echo "6. 犀牛剪辑反向代理测试："
curl -I https://cmsceshi.xiniujianji.com/ 2>&1 | head -5