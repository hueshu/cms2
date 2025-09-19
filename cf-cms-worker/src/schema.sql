-- Multi-Site CMS Database Schema
-- For Cloudflare D1 (SQLite)

-- Sites table: Store site information
CREATE TABLE IF NOT EXISTS sites (
    id TEXT PRIMARY KEY,
    domain TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    config JSON,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index for domain lookups
CREATE INDEX IF NOT EXISTS idx_sites_domain ON sites(domain);
CREATE INDEX IF NOT EXISTS idx_sites_status ON sites(status);

-- Articles table: Store article content
CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    content TEXT,
    summary TEXT,
    cover_image TEXT,
    meta_title TEXT,
    meta_description TEXT,
    meta_keywords TEXT,
    status TEXT DEFAULT 'draft',
    author TEXT,
    view_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    published_at DATETIME,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
    UNIQUE(site_id, slug)
);

-- Create indexes for articles
CREATE INDEX IF NOT EXISTS idx_articles_site_id ON articles(site_id);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);

-- Tags table: Store tags
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
    UNIQUE(site_id, slug)
);

-- Create indexes for tags
CREATE INDEX IF NOT EXISTS idx_tags_site_id ON tags(site_id);
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);

-- Article-Tag relationship table
CREATE TABLE IF NOT EXISTS article_tags (
    article_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (article_id, tag_id),
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Create indexes for article_tags
CREATE INDEX IF NOT EXISTS idx_article_tags_article_id ON article_tags(article_id);
CREATE INDEX IF NOT EXISTS idx_article_tags_tag_id ON article_tags(tag_id);

-- Site configuration table
CREATE TABLE IF NOT EXISTS site_config (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
    UNIQUE(site_id, key)
);

-- Create index for site_config
CREATE INDEX IF NOT EXISTS idx_site_config_site_id ON site_config(site_id);

-- API keys table for authentication
CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL,
    key_hash TEXT UNIQUE NOT NULL,
    name TEXT,
    permissions JSON,
    last_used_at DATETIME,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- Create index for api_keys
CREATE INDEX IF NOT EXISTS idx_api_keys_site_id ON api_keys(site_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);