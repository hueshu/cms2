/**
 * 图片服务高级文字叠加功能使用示例
 *
 * 这个文件展示了如何使用扩展后的ImageService来创建各种类型的文字叠加图片
 */

import { ImageService, AdvancedTextOverlayOptions, TextElement } from './imageService'

// 模拟环境配置
const env = {
  CACHE_KV: {
    get: async () => null,
    getWithMetadata: async () => ({ metadata: null }),
    put: async () => {}
  }
} as any

const imageService = new ImageService(env)

/**
 * 示例1：创建社交媒体分享图片
 */
export async function createSocialMediaPost() {
  const response = await imageService.generateStyledTextOverlay('social-post', {
    title: '🎉 产品发布会邀请',
    subtitle: '全新AI驱动的内容管理系统',
    content: '2024年12月1日 | 上海科技馆 | 免费参与',
    width: 1200,
    height: 630,
    backgroundColor: '#0f172a',
    customColors: {
      primary: '#38bdf8',
      secondary: '#94a3b8',
      accent: '#fbbf24'
    }
  })

  return response
}

/**
 * 示例2：创建文章封面图
 */
export async function createArticleHeader() {
  const response = await imageService.generateStyledTextOverlay('article-header', {
    title: '微服务架构设计原则',
    subtitle: '从单体应用到分布式系统的演进策略',
    author: '架构师小王',
    width: 1200,
    height: 630,
    backgroundImage: 'https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?w=1200&h=630&fit=crop',
    customColors: {
      primary: '#1e40af',
      secondary: '#ffffff',
      accent: '#fbbf24'
    }
  })

  return response
}

/**
 * 示例3：创建复杂的多层文字叠加
 */
export async function createComplexTextOverlay() {
  const textElements: TextElement[] = [
    // 主标题
    {
      text: 'AI技术峰会',
      style: {
        fontSize: 72,
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#ffffff',
        fontWeight: 'bold',
        gradient: {
          type: 'linear',
          colors: ['#3b82f6', '#8b5cf6', '#ec4899'],
          direction: 45
        },
        shadow: {
          offsetX: 0,
          offsetY: 4,
          blur: 12,
          color: 'rgba(0,0,0,0.5)'
        }
      },
      position: {
        x: '50%',
        y: '25%',
        anchor: 'middle',
        baseline: 'middle',
        maxWidth: 1000
      },
      type: 'title',
      zIndex: 10
    },

    // 副标题
    {
      text: '探索人工智能的未来边界',
      style: {
        fontSize: 36,
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#e2e8f0',
        fontWeight: '500',
        letterSpacing: 1,
        lineHeight: 1.3
      },
      position: {
        x: '50%',
        y: '40%',
        anchor: 'middle',
        baseline: 'middle',
        maxWidth: 900
      },
      type: 'subtitle',
      zIndex: 9
    },

    // 时间地点信息
    {
      text: '2024年12月15-16日 • 北京国家会议中心',
      style: {
        fontSize: 24,
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#94a3b8',
        fontWeight: '400',
        textTransform: 'uppercase',
        letterSpacing: 2
      },
      position: {
        x: '50%',
        y: '55%',
        anchor: 'middle',
        baseline: 'middle'
      },
      type: 'caption',
      zIndex: 8
    },

    // 讲者阵容
    {
      text: '特邀讲者：OpenAI、Google、百度、阿里巴巴技术专家',
      style: {
        fontSize: 20,
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#cbd5e1',
        fontWeight: '400',
        lineHeight: 1.4
      },
      position: {
        x: '50%',
        y: '68%',
        anchor: 'middle',
        baseline: 'middle',
        maxWidth: 800
      },
      type: 'caption',
      zIndex: 7
    },

    // CTA按钮样式的文字
    {
      text: '立即报名参加',
      style: {
        fontSize: 28,
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#0f172a',
        fontWeight: 'bold',
        stroke: {
          width: 2,
          color: '#fbbf24'
        }
      },
      position: {
        x: '50%',
        y: '85%',
        anchor: 'middle',
        baseline: 'middle'
      },
      type: 'custom',
      zIndex: 15
    },

    // 水印
    {
      text: 'AI Summit 2024',
      style: {
        fontSize: 24,
        fontFamily: 'Arial, sans-serif',
        color: '#475569',
        fontWeight: 'bold',
        stroke: {
          width: 1,
          color: '#ffffff'
        }
      },
      position: {
        x: '95%',
        y: '95%',
        anchor: 'end',
        baseline: 'bottom',
        rotation: -15
      },
      type: 'watermark',
      opacity: 0.4,
      zIndex: 100
    }
  ]

  const options: AdvancedTextOverlayOptions = {
    width: 1200,
    height: 800,
    backgroundColor: '#1e293b',
    textElements,
    format: 'png',
    quality: 95,
    globalTextSettings: {
      antialiasing: true,
      hinting: 'full',
      subpixelPositioning: true
    }
  }

  return await imageService.generateAdvancedTextOverlay(options)
}

/**
 * 示例4：创建产品宣传海报
 */
export async function createProductPoster() {
  const textElements: TextElement[] = [
    // 产品名称
    {
      text: 'CloudCMS Pro',
      style: {
        fontSize: 84,
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#1f2937',
        fontWeight: 'bold',
        gradient: {
          type: 'linear',
          colors: ['#059669', '#0891b2'],
          direction: 135
        }
      },
      position: {
        x: '50%',
        y: '20%',
        anchor: 'middle',
        baseline: 'middle'
      },
      type: 'title',
      zIndex: 10
    },

    // 产品描述
    {
      text: '下一代云原生内容管理系统',
      style: {
        fontSize: 32,
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#374151',
        fontWeight: '500',
        fontStyle: 'italic'
      },
      position: {
        x: '50%',
        y: '30%',
        anchor: 'middle',
        baseline: 'middle'
      },
      type: 'subtitle',
      zIndex: 9
    },

    // 特性列表
    {
      text: '✨ AI智能推荐\n🚀 秒级部署\n🔒 企业级安全\n📱 移动优先设计',
      style: {
        fontSize: 24,
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#1f2937',
        fontWeight: '500',
        lineHeight: 1.8
      },
      position: {
        x: '30%',
        y: '55%',
        anchor: 'start',
        baseline: 'middle'
      },
      type: 'custom',
      zIndex: 8
    },

    // 价格信息
    {
      text: '限时优惠',
      style: {
        fontSize: 20,
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#dc2626',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 2
      },
      position: {
        x: '70%',
        y: '45%',
        anchor: 'middle',
        baseline: 'middle'
      },
      type: 'custom',
      zIndex: 12
    },

    {
      text: '¥999/月',
      style: {
        fontSize: 48,
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#dc2626',
        fontWeight: 'bold'
      },
      position: {
        x: '70%',
        y: '55%',
        anchor: 'middle',
        baseline: 'middle'
      },
      type: 'custom',
      zIndex: 11
    },

    {
      text: '原价 ¥1999/月',
      style: {
        fontSize: 20,
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#6b7280',
        fontWeight: 'normal',
        textDecoration: 'line-through'
      },
      position: {
        x: '70%',
        y: '62%',
        anchor: 'middle',
        baseline: 'middle'
      },
      type: 'custom',
      zIndex: 10
    },

    // 联系方式
    {
      text: '联系我们：sales@cloudcms.com | 400-123-4567',
      style: {
        fontSize: 18,
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#6b7280',
        fontWeight: '400'
      },
      position: {
        x: '50%',
        y: '85%',
        anchor: 'middle',
        baseline: 'middle'
      },
      type: 'caption',
      zIndex: 5
    }
  ]

  const options: AdvancedTextOverlayOptions = {
    width: 1080,
    height: 1350, // 9:16 比例，适合移动端分享
    backgroundColor: '#f8fafc',
    textElements,
    format: 'png',
    quality: 90
  }

  return await imageService.generateAdvancedTextOverlay(options)
}

/**
 * 示例5：创建引用卡片
 */
export async function createQuoteCard() {
  return await imageService.generateStyledTextOverlay('quote', {
    content: '设计不只是看起来如何，感觉如何。设计的工作原理才是关键。',
    author: '史蒂夫·乔布斯',
    width: 800,
    height: 600,
    backgroundColor: '#f1f5f9',
    customColors: {
      primary: '#1e293b',
      secondary: '#64748b',
      accent: '#0ea5e9'
    }
  })
}

/**
 * 示例6：创建公告通知
 */
export async function createAnnouncement() {
  return await imageService.generateStyledTextOverlay('announcement', {
    title: '系统升级通知',
    content: '为了提供更好的服务体验，我们将于2024年12月1日凌晨2:00-4:00进行系统升级维护。期间服务可能短暂中断，请您谅解。',
    width: 1000,
    height: 600,
    backgroundColor: '#fef3c7',
    customColors: {
      primary: '#b45309',
      secondary: '#92400e',
      accent: '#f59e0b'
    }
  })
}

/**
 * 示例7：使用自动布局创建多段落内容
 */
export async function createAutoLayoutContent() {
  const textElements: TextElement[] = [
    {
      text: '关于我们',
      style: {
        fontSize: 48,
        color: '#1f2937',
        fontWeight: 'bold'
      },
      position: { x: '50%', y: 0 },
      type: 'title'
    },
    {
      text: '我们是一家专注于AI技术的创新公司',
      style: {
        fontSize: 28,
        color: '#374151',
        fontWeight: '500'
      },
      position: { x: '50%', y: 0 },
      type: 'subtitle'
    },
    {
      text: '使命：让人工智能技术惠及每一个人',
      style: {
        fontSize: 24,
        color: '#4b5563',
        fontWeight: 'normal'
      },
      position: { x: '50%', y: 0 },
      type: 'caption'
    },
    {
      text: '愿景：成为全球领先的AI解决方案提供商',
      style: {
        fontSize: 24,
        color: '#4b5563',
        fontWeight: 'normal'
      },
      position: { x: '50%', y: 0 },
      type: 'caption'
    },
    {
      text: '价值观：创新、开放、协作、共赢',
      style: {
        fontSize: 24,
        color: '#4b5563',
        fontWeight: 'normal'
      },
      position: { x: '50%', y: 0 },
      type: 'caption'
    }
  ]

  const options: AdvancedTextOverlayOptions = {
    width: 800,
    height: 600,
    backgroundColor: '#ffffff',
    textElements,
    autoLayout: {
      enabled: true,
      distribution: 'space-evenly',
      spacing: 30,
      margin: { top: 60, right: 40, bottom: 60, left: 40 }
    }
  }

  return await imageService.generateAdvancedTextOverlay(options)
}

/**
 * 示例8：批量生成系列图片
 */
export async function generateImageSeries() {
  const topics = [
    { title: 'JavaScript基础', subtitle: '第一课：变量与数据类型' },
    { title: 'JavaScript基础', subtitle: '第二课：函数与作用域' },
    { title: 'JavaScript基础', subtitle: '第三课：对象与数组' },
    { title: 'JavaScript基础', subtitle: '第四课：异步编程' }
  ]

  const batches = topics.map((topic, index) => ({
    id: `lesson-${index + 1}`,
    options: {
      width: 1200,
      height: 630,
      backgroundColor: `hsl(${210 + index * 10}, 70%, 95%)`,
      textElements: [
        {
          text: topic.title,
          style: {
            fontSize: 56,
            color: '#1e40af',
            fontWeight: 'bold'
          },
          position: {
            x: '50%',
            y: '35%',
            anchor: 'middle',
            baseline: 'middle'
          },
          type: 'title'
        },
        {
          text: topic.subtitle,
          style: {
            fontSize: 32,
            color: '#3730a3',
            fontWeight: '500'
          },
          position: {
            x: '50%',
            y: '55%',
            anchor: 'middle',
            baseline: 'middle'
          },
          type: 'subtitle'
        },
        {
          text: 'JavaScript学习系列',
          style: {
            fontSize: 18,
            color: '#6366f1',
            fontWeight: '400'
          },
          position: {
            x: '95%',
            y: '95%',
            anchor: 'end',
            baseline: 'bottom'
          },
          type: 'watermark',
          opacity: 0.7
        }
      ]
    } as AdvancedTextOverlayOptions
  }))

  return await imageService.generateBatchTextOverlay(batches)
}

/**
 * 示例9：创建带背景图片的文字叠加
 */
export async function createTextOverlayWithBackground() {
  const textElements: TextElement[] = [
    {
      text: '探索未知世界',
      style: {
        fontSize: 64,
        color: '#ffffff',
        fontWeight: 'bold',
        shadow: {
          offsetX: 2,
          offsetY: 2,
          blur: 8,
          color: 'rgba(0,0,0,0.7)'
        },
        stroke: {
          width: 2,
          color: '#000000'
        }
      },
      position: {
        x: '50%',
        y: '30%',
        anchor: 'middle',
        baseline: 'middle'
      },
      type: 'title',
      zIndex: 10
    },
    {
      text: '勇敢踏出第一步，世界将为你展开全新的篇章',
      style: {
        fontSize: 28,
        color: '#f1f5f9',
        fontWeight: '500',
        shadow: {
          offsetX: 1,
          offsetY: 1,
          blur: 4,
          color: 'rgba(0,0,0,0.8)'
        }
      },
      position: {
        x: '50%',
        y: '50%',
        anchor: 'middle',
        baseline: 'middle',
        maxWidth: 800
      },
      type: 'subtitle',
      zIndex: 9
    }
  ]

  const options: AdvancedTextOverlayOptions = {
    width: 1200,
    height: 800,
    backgroundImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=800&fit=crop',
    textElements,
    format: 'jpeg',
    quality: 85
  }

  return await imageService.generateAdvancedTextOverlay(options)
}

/**
 * 使用示例
 */
export async function runExamples() {
  console.log('开始生成示例图片...')

  try {
    // 生成各种类型的图片
    const socialPost = await createSocialMediaPost()
    const articleHeader = await createArticleHeader()
    const complexOverlay = await createComplexTextOverlay()
    const productPoster = await createProductPoster()
    const quoteCard = await createQuoteCard()
    const announcement = await createAnnouncement()
    const autoLayoutContent = await createAutoLayoutContent()
    const backgroundOverlay = await createTextOverlayWithBackground()

    // 批量生成
    const imageSeries = await generateImageSeries()

    console.log('所有示例图片生成完成！')
    console.log(`批量生成结果：${imageSeries.filter(r => r.success).length}/${imageSeries.length} 成功`)

    return {
      socialPost,
      articleHeader,
      complexOverlay,
      productPoster,
      quoteCard,
      announcement,
      autoLayoutContent,
      backgroundOverlay,
      imageSeries
    }
  } catch (error) {
    console.error('生成示例图片时出错：', error)
    throw error
  }
}

// 导出样式模板创建函数
export function createCustomTextStyle(template: 'heading' | 'body' | 'caption' | 'emphasis' | 'code') {
  return ImageService.createTextStyleTemplate(template)
}