-- 添加万剪网站
INSERT INTO sites (id, name, domain, description, created_at, updated_at)
VALUES (
  'site-005',
  '万剪',
  'wanjian666.com',
  '批量剪辑视频软件、批量混剪，万剪AI批量剪辑',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- 添加万剪网站域名绑定
INSERT INTO domains (id, domain, site_id, created_at, updated_at)
VALUES
  ('domain-009', 'wanjian666.com', 'site-005', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('domain-010', 'cms.wanjian666.com', 'site-005', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);