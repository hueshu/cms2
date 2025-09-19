-- 创建新网站 site-002 for bwg87.com
INSERT INTO sites (id, domain, name, description, config, status, created_at, updated_at)
VALUES (
  'site-002',
  'bwg87.com',
  '搬瓦工VPS',
  '高速稳定的VPS服务，支持支付宝付款',
  '{}',
  'active',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- 添加域名映射
INSERT INTO domain_mappings (id, site_id, domain, is_primary, created_at)
VALUES
  (lower(hex(randomblob(16))), 'site-002', 'bwg87.com', true, CURRENT_TIMESTAMP),
  (lower(hex(randomblob(16))), 'site-002', 'www.bwg87.com', false, CURRENT_TIMESTAMP),
  (lower(hex(randomblob(16))), 'site-002', 'cms.bwg87.com', false, CURRENT_TIMESTAMP);

-- 查看新增的网站和域名映射
SELECT * FROM sites WHERE id = 'site-002';
SELECT * FROM domain_mappings WHERE site_id = 'site-002';