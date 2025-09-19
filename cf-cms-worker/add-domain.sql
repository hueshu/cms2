-- Update the test site with the actual domain
UPDATE sites
SET
    domain = 'cmsceshi.xiniujianji.com',
    name = 'CMS测试站点',
    description = 'CMS系统测试站点 - cmsceshi.xiniujianji.com',
    updated_at = datetime('now')
WHERE id = 'site-001';

-- Add domain record for DNS management
INSERT INTO domains (id, site_id, domain, is_primary, verification_status, dns_configured, created_at, updated_at)
VALUES (
    'domain-001',
    'site-001',
    'cmsceshi.xiniujianji.com',
    1,
    'pending',
    0,
    datetime('now'),
    datetime('now')
);