-- Create test site
INSERT INTO sites (id, domain, name, description, config, status, created_at, updated_at)
VALUES (
    'site-001',
    'test.example.com',
    'Test Site',
    'A test site for CMS development',
    '{"theme": "default", "language": "zh-CN"}',
    'active',
    datetime('now'),
    datetime('now')
);

-- Create API key for the test site
INSERT INTO api_keys (id, site_id, key_hash, name, permissions, created_at)
VALUES (
    'key-001',
    'site-001',
    'test-api-key-2024', -- In production, this should be hashed
    'Test API Key',
    '["read", "write", "admin"]',
    datetime('now')
);

-- Create sample article
INSERT INTO articles (id, site_id, title, slug, content, summary, author, status, view_count, published_at, created_at, updated_at)
VALUES (
    'article-001',
    'site-001',
    'Welcome to CF-CMS',
    'welcome-to-cf-cms',
    '# Welcome to CF-CMS\n\nThis is a powerful multi-site CMS built on Cloudflare Workers.',
    'This is a powerful multi-site CMS',
    'Admin',
    'published',
    0,
    datetime('now'),
    datetime('now'),
    datetime('now')
);

-- Create sample tags
INSERT INTO tags (id, site_id, name, slug, created_at)
VALUES
    ('tag-001', 'site-001', 'Technology', 'technology', datetime('now')),
    ('tag-002', 'site-001', 'Tutorial', 'tutorial', datetime('now'));

-- Link tags to article
INSERT INTO article_tags (article_id, tag_id)
VALUES
    ('article-001', 'tag-001'),
    ('article-001', 'tag-002');