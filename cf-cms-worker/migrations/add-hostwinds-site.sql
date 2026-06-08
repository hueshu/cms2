-- 添加Hostwinds VPS站点
INSERT INTO sites (id, domain, name, description, config, created_at, updated_at)
VALUES (
    'site-003',
    'cmd.hostwindsvps.cn',
    'Hostwinds VPS',
    'Hostwinds VPS服务器官网，提供高性价比的VPS主机服务',
    json_object(
        'theme', 'default',
        'template', 'hostwinds',
        'seo', json_object(
            'defaultTitle', 'HostWinds VPS官网 - HostWinds服务器，HostWinds教程',
            'defaultDescription', '目前最便宜的Hostwinds VPS方案是Unmanaged Linux VPS（非托管Linux VPS）',
            'defaultKeywords', json_array('Hostwinds', 'VPS', '服务器', '云主机', 'Linux VPS', 'Windows VPS')
        ),
        'features', json_object(
            'enableComments', false,
            'enableSearch', true,
            'enableSitemap', true
        )
    ),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- 添加域名映射
-- 主域名
INSERT INTO domain_mappings (site_id, domain, is_primary)
VALUES ('site-003', 'cmd.hostwindsvps.cn', true);

-- 备用域名
INSERT INTO domain_mappings (site_id, domain, is_primary)
VALUES ('site-003', 'hostwindsvps.cn', false);

-- 添加默认标签
INSERT INTO tags (site_id, name, slug, description)
VALUES
    ('site-003', 'VPS教程', 'vps-tutorial', 'VPS使用教程和指南'),
    ('site-003', 'Hostwinds', 'hostwinds', 'Hostwinds相关内容'),
    ('site-003', '优惠活动', 'promotions', '最新优惠和折扣信息'),
    ('site-003', '技术支持', 'support', '技术支持和常见问题');