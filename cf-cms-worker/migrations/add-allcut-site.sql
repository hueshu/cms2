-- 添加AllCut站点
INSERT INTO sites (id, domain, name, description, config, created_at, updated_at)
VALUES (
    'site-004',
    'cms.allcut.cn',
    'ALLCUT',
    '批量视频剪辑神器，AI批量剪辑，视频消重去重',
    json_object(
        'theme', 'default',
        'template', 'allcut',
        'seo', json_object(
            'defaultTitle', 'ALLCUT官网 - 批量视频剪辑、混剪，AI批量剪辑，视频消重去重',
            'defaultDescription', '批量视频剪辑神器，支持批量剪辑、混剪、AI智能剪辑、视频消重去重等功能',
            'defaultKeywords', json_array('ALLCUT', '视频剪辑', '批量剪辑', 'AI剪辑', '视频消重', '混剪')
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
VALUES ('site-004', 'cms.allcut.cn', true);

-- 备用域名
INSERT INTO domain_mappings (site_id, domain, is_primary)
VALUES ('site-004', 'allcut.cn', false);

-- 添加默认标签
INSERT INTO tags (site_id, name, slug, description)
VALUES
    ('site-004', '功能介绍', 'features', 'ALLCUT功能特性介绍'),
    ('site-004', '使用教程', 'tutorials', '视频剪辑使用教程'),
    ('site-004', '更新日志', 'updates', '软件更新和新功能发布'),
    ('site-004', '用户案例', 'cases', '用户成功案例分享');