-- 清除ALLCUT站点的现有文章
DELETE FROM articles WHERE site_id = 'site-004';

-- 插入新文章
INSERT INTO articles (id, site_id, title, slug, content, summary, status, author, view_count, created_at, updated_at, published_at, meta_title, meta_description, meta_keywords, cover_image) VALUES
('article-allcut-001', 'site-004', 'ALLCUT批量视频处理功能详解', 'allcut-batch-video-processing', '<h2>批量视频处理的革命性工具</h2><p>ALLCUT的批量视频处理功能是其最核心的特性之一。通过先进的算法和优化的处理流程，ALLCUT可以同时处理数百甚至数千个视频文件。</p>', '详细介绍ALLCUT的批量视频处理功能，包括调色、画中画、镜像、帧率调整等核心功能。', 'published', 'ALLCUT团队', 156, DATETIME('now', '-10 days'), DATETIME('now', '-10 days'), DATETIME('now', '-10 days'), 'ALLCUT批量视频处理功能详解', '了解ALLCUT的批量视频处理功能', 'ALLCUT,批量视频处理,视频剪辑', 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800'),

('article-allcut-002', 'site-004', '视频批量分割与组合技巧', 'video-batch-split-combine', '<h2>掌握批量分割与组合的艺术</h2><p>视频的分割与组合是内容创作中最常见的需求之一。ALLCUT提供了多种智能分割和组合方案。</p>', '深入了解ALLCUT的视频分割与组合功能，掌握高效的批量视频处理技巧。', 'published', 'ALLCUT团队', 234, DATETIME('now', '-9 days'), DATETIME('now', '-9 days'), DATETIME('now', '-9 days'), '视频批量分割与组合技巧', '学习使用ALLCUT进行视频批量分割与组合', '视频分割,视频组合,ALLCUT教程', 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=800'),

('article-allcut-003', 'site-004', '水印处理的高级技巧', 'watermark-advanced-techniques', '<h2>专业的水印处理解决方案</h2><p>水印是保护版权和品牌展示的重要手段。ALLCUT提供了全方位的水印处理功能。</p>', '深入了解ALLCUT的水印处理功能，包括批量添加、智能去除等高级技巧。', 'published', 'ALLCUT团队', 267, DATETIME('now', '-7 days'), DATETIME('now', '-7 days'), DATETIME('now', '-7 days'), '水印处理的高级技巧', '学习ALLCUT的水印处理技术', '水印处理,去水印,ALLCUT', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800'),

('article-allcut-004', 'site-004', '自动字幕功能完全解析', 'auto-subtitle-complete-guide', '<h2>让字幕制作变得简单高效</h2><p>字幕是提升视频可访问性和观看体验的重要元素。ALLCUT的自动字幕功能，让字幕制作变得前所未有的简单。</p>', '全面了解ALLCUT的自动字幕功能，包括语音识别、多语言支持、样式定制等。', 'published', 'ALLCUT团队', 312, DATETIME('now', '-6 days'), DATETIME('now', '-6 days'), DATETIME('now', '-6 days'), '自动字幕功能完全解析', '深入了解ALLCUT的自动字幕功能', '自动字幕,语音识别,ALLCUT', 'https://images.unsplash.com/photo-1517180102446-f3c20b9c5295?w=800'),

('article-allcut-005', 'site-004', '电商带货视频批量制作方案', 'ecommerce-video-batch-solution', '<h2>打造爆款带货视频的秘密武器</h2><p>在电商直播和短视频带货盛行的今天，如何高效制作大量优质的带货视频成为了关键。</p>', '专为电商从业者打造的视频批量制作方案，提升带货效率。', 'published', 'ALLCUT团队', 428, DATETIME('now', '-5 days'), DATETIME('now', '-5 days'), DATETIME('now', '-5 days'), '电商带货视频批量制作方案', '了解如何使用ALLCUT批量制作电商带货视频', '电商视频,带货视频,ALLCUT', 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800'),

('article-allcut-006', 'site-004', 'ALLCUT V3.0重大更新', 'allcut-v3-ai-upgrade', '<h2>ALLCUT V3.0带来革命性升级</h2><p>经过数月的研发，ALLCUT V3.0正式发布！这次更新带来了全面升级的AI智能剪辑功能。</p>', 'ALLCUT V3.0重大更新，AI智能剪辑功能全面升级，带来更强大的视频处理能力。', 'published', 'ALLCUT团队', 892, DATETIME('now', '-2 days'), DATETIME('now', '-2 days'), DATETIME('now', '-2 days'), 'ALLCUT V3.0重大更新', '了解ALLCUT V3.0的重大更新', 'ALLCUT更新,V3.0,AI剪辑', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800');

-- 更新站点信息
UPDATE sites
SET
    name = 'ALLCUT官网',
    description = '批量视频剪辑神器，AI批量剪辑，视频消重去重',
    updated_at = DATETIME('now')
WHERE id = 'site-004';