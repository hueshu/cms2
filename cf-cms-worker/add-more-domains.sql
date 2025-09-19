-- 为站点 site-001 添加额外的域名
-- 这些域名都会显示同样的内容

-- 添加额外的域名映射
INSERT INTO domain_mappings (id, site_id, domain, is_primary, created_at)
VALUES
  (lower(hex(randomblob(16))), 'site-001', 'xiniujianji.com', false, CURRENT_TIMESTAMP),
  (lower(hex(randomblob(16))), 'site-001', 'www.xiniujianji.com', false, CURRENT_TIMESTAMP),
  (lower(hex(randomblob(16))), 'site-001', 'test.xiniujianji.com', false, CURRENT_TIMESTAMP);

-- 查看所有域名映射
SELECT dm.*, s.name as site_name
FROM domain_mappings dm
JOIN sites s ON dm.site_id = s.id
ORDER BY dm.site_id, dm.is_primary DESC;