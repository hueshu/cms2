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

-- Domains table: Store custom domain configurations
CREATE TABLE IF NOT EXISTS domains (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL,
    domain TEXT UNIQUE NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    verification_status TEXT DEFAULT 'pending', -- pending, verified, failed
    verification_method TEXT DEFAULT 'dns', -- dns, file, email
    verification_token TEXT,
    verification_record TEXT,
    ssl_status TEXT DEFAULT 'pending', -- pending, active, failed, disabled
    ssl_certificate_id TEXT,
    ssl_expires_at DATETIME,
    cf_zone_id TEXT,
    cf_zone_status TEXT,
    dns_configured BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    verified_at DATETIME,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- Create indexes for domains
CREATE INDEX IF NOT EXISTS idx_domains_site_id ON domains(site_id);
CREATE INDEX IF NOT EXISTS idx_domains_domain ON domains(domain);
CREATE INDEX IF NOT EXISTS idx_domains_verification_status ON domains(verification_status);
CREATE INDEX IF NOT EXISTS idx_domains_ssl_status ON domains(ssl_status);
CREATE INDEX IF NOT EXISTS idx_domains_is_primary ON domains(is_primary);

-- Domain verification history table
CREATE TABLE IF NOT EXISTS domain_verification_logs (
    id TEXT PRIMARY KEY,
    domain_id TEXT NOT NULL,
    verification_type TEXT NOT NULL, -- dns_check, ssl_check, cf_api_check
    status TEXT NOT NULL, -- success, failed, pending
    details JSON,
    error_message TEXT,
    checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
);

-- Create indexes for domain verification logs
CREATE INDEX IF NOT EXISTS idx_domain_verification_logs_domain_id ON domain_verification_logs(domain_id);
CREATE INDEX IF NOT EXISTS idx_domain_verification_logs_checked_at ON domain_verification_logs(checked_at);

-- SEO configuration table
CREATE TABLE IF NOT EXISTS seo_configs (
    id TEXT PRIMARY KEY,
    site_id TEXT UNIQUE NOT NULL,
    meta_settings JSON NOT NULL,
    sitemap_settings JSON NOT NULL,
    internal_link_settings JSON NOT NULL,
    robots_txt TEXT NOT NULL,
    schema_org_settings JSON NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- Create indexes for seo_configs
CREATE INDEX IF NOT EXISTS idx_seo_configs_site_id ON seo_configs(site_id);

-- Redirect rules table
CREATE TABLE IF NOT EXISTS redirect_rules (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL,
    from_path TEXT NOT NULL,
    to_path TEXT NOT NULL,
    redirect_type INTEGER DEFAULT 301, -- 301, 302, 307, 308
    is_regex BOOLEAN DEFAULT FALSE,
    enabled BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- Create indexes for redirect_rules
CREATE INDEX IF NOT EXISTS idx_redirect_rules_site_id ON redirect_rules(site_id);
CREATE INDEX IF NOT EXISTS idx_redirect_rules_from_path ON redirect_rules(from_path);
CREATE INDEX IF NOT EXISTS idx_redirect_rules_enabled ON redirect_rules(enabled);

-- Internal links table
CREATE TABLE IF NOT EXISTS internal_links (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL,
    from_article_id TEXT NOT NULL,
    to_article_id TEXT,
    to_tag_id TEXT,
    to_url TEXT,
    anchor_text TEXT NOT NULL,
    context TEXT,
    position INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    click_count INTEGER DEFAULT 0,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
    FOREIGN KEY (from_article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (to_article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (to_tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Create indexes for internal_links
CREATE INDEX IF NOT EXISTS idx_internal_links_site_id ON internal_links(site_id);
CREATE INDEX IF NOT EXISTS idx_internal_links_from_article_id ON internal_links(from_article_id);
CREATE INDEX IF NOT EXISTS idx_internal_links_to_article_id ON internal_links(to_article_id);
CREATE INDEX IF NOT EXISTS idx_internal_links_to_tag_id ON internal_links(to_tag_id);
CREATE INDEX IF NOT EXISTS idx_internal_links_created_at ON internal_links(created_at);