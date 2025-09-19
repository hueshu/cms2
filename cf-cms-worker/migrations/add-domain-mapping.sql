-- 创建域名映射表，支持一个站点多个域名
CREATE TABLE IF NOT EXISTS domain_mappings (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    site_id TEXT NOT NULL,
    domain TEXT NOT NULL UNIQUE,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX idx_domain_mappings_site_id ON domain_mappings(site_id);
CREATE UNIQUE INDEX idx_domain_mappings_domain ON domain_mappings(domain);

-- 迁移现有sites表的domain数据到domain_mappings
INSERT INTO domain_mappings (site_id, domain, is_primary)
SELECT id, domain, true FROM sites WHERE domain IS NOT NULL;

-- 可以选择保留sites表的domain字段作为主域名，也可以删除
-- ALTER TABLE sites DROP COLUMN domain;