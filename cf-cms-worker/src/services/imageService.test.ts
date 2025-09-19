/**
 * 图片服务高级文字叠加功能测试
 */

import { ImageService, AdvancedTextOverlayOptions, TextElement, TextStyle } from './imageService'

// 模拟Env环境
const mockEnv = {
  CACHE_KV: {
    get: jest.fn(),
    getWithMetadata: jest.fn(),
    put: jest.fn()
  }
}

describe('ImageService 高级文字叠加功能', () => {
  let imageService: ImageService

  beforeEach(() => {
    imageService = new ImageService(mockEnv as any)
    // 清除所有模拟
    jest.clearAllMocks()
  })

  describe('基础功能测试', () => {
    test('应该创建基础的高级文字叠加图片', async () => {
      const options: AdvancedTextOverlayOptions = {
        width: 800,
        height: 400,
        backgroundColor: '#ffffff',
        textElements: [
          {
            text: '测试标题',
            style: {
              fontSize: 48,
              color: '#000000',
              fontWeight: 'bold'
            },
            position: {
              x: '50%',
              y: '50%',
              anchor: 'middle',
              baseline: 'middle'
            },
            type: 'title'
          }
        ]
      }

      const response = await imageService.generateAdvancedTextOverlay(options)

      expect(response).toBeInstanceOf(Response)
      expect(response.headers.get('Content-Type')).toContain('image/')
    })

    test('应该处理多个文字元素', async () => {
      const options: AdvancedTextOverlayOptions = {
        width: 1200,
        height: 630,
        backgroundColor: '#f8fafc',
        textElements: [
          {
            text: '主标题',
            style: {
              fontSize: 64,
              color: '#1f2937',
              fontWeight: 'bold'
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
            text: '副标题文字',
            style: {
              fontSize: 32,
              color: '#6b7280',
              fontWeight: '500'
            },
            position: {
              x: '50%',
              y: '50%',
              anchor: 'middle',
              baseline: 'middle'
            },
            type: 'subtitle',
            zIndex: 9
          },
          {
            text: '版权信息',
            style: {
              fontSize: 16,
              color: '#9ca3af',
              fontWeight: 'normal'
            },
            position: {
              x: '95%',
              y: '95%',
              anchor: 'end',
              baseline: 'bottom'
            },
            type: 'watermark',
            zIndex: 5,
            opacity: 0.7
          }
        ]
      }

      const response = await imageService.generateAdvancedTextOverlay(options)

      expect(response).toBeInstanceOf(Response)
    })

    test('应该支持阴影效果', async () => {
      const textElement: TextElement = {
        text: '带阴影的文字',
        style: {
          fontSize: 48,
          color: '#ffffff',
          fontWeight: 'bold',
          shadow: {
            offsetX: 2,
            offsetY: 2,
            blur: 4,
            color: 'rgba(0,0,0,0.5)'
          }
        },
        position: {
          x: '50%',
          y: '50%',
          anchor: 'middle',
          baseline: 'middle'
        }
      }

      const options: AdvancedTextOverlayOptions = {
        width: 800,
        height: 400,
        backgroundColor: '#2563eb',
        textElements: [textElement]
      }

      const response = await imageService.generateAdvancedTextOverlay(options)
      expect(response).toBeInstanceOf(Response)
    })

    test('应该支持描边效果', async () => {
      const textElement: TextElement = {
        text: '带描边的文字',
        style: {
          fontSize: 48,
          color: '#ffffff',
          fontWeight: 'bold',
          stroke: {
            width: 2,
            color: '#000000'
          }
        },
        position: {
          x: '50%',
          y: '50%',
          anchor: 'middle',
          baseline: 'middle'
        }
      }

      const options: AdvancedTextOverlayOptions = {
        width: 800,
        height: 400,
        backgroundColor: '#f59e0b',
        textElements: [textElement]
      }

      const response = await imageService.generateAdvancedTextOverlay(options)
      expect(response).toBeInstanceOf(Response)
    })

    test('应该支持渐变效果', async () => {
      const textElement: TextElement = {
        text: '渐变文字',
        style: {
          fontSize: 48,
          color: '#000000', // 当有渐变时，这个会被覆盖
          fontWeight: 'bold',
          gradient: {
            type: 'linear',
            colors: ['#3b82f6', '#8b5cf6', '#ec4899'],
            direction: 45
          }
        },
        position: {
          x: '50%',
          y: '50%',
          anchor: 'middle',
          baseline: 'middle'
        }
      }

      const options: AdvancedTextOverlayOptions = {
        width: 800,
        height: 400,
        backgroundColor: '#ffffff',
        textElements: [textElement]
      }

      const response = await imageService.generateAdvancedTextOverlay(options)
      expect(response).toBeInstanceOf(Response)
    })
  })

  describe('预设样式测试', () => {
    test('应该生成社交媒体帖子样式', async () => {
      const response = await imageService.generateStyledTextOverlay('social-post', {
        title: '分享一个好消息',
        subtitle: '我们的产品正式发布了！',
        content: '经过数月的努力开发，终于可以和大家见面了。',
        width: 1200,
        height: 630
      })

      expect(response).toBeInstanceOf(Response)
    })

    test('应该生成文章标题样式', async () => {
      const response = await imageService.generateStyledTextOverlay('article-header', {
        title: '深入理解现代前端架构',
        subtitle: '从微前端到云原生的演进之路',
        author: '张三',
        width: 1200,
        height: 630,
        customColors: {
          primary: '#1e40af',
          secondary: '#64748b',
          accent: '#f59e0b'
        }
      })

      expect(response).toBeInstanceOf(Response)
    })

    test('应该生成水印样式', async () => {
      const response = await imageService.generateStyledTextOverlay('watermark', {
        content: '公司机密',
        width: 800,
        height: 600
      })

      expect(response).toBeInstanceOf(Response)
    })

    test('应该生成公告样式', async () => {
      const response = await imageService.generateStyledTextOverlay('announcement', {
        title: '系统维护通知',
        content: '系统将于今晚23:00-24:00进行维护，期间服务可能中断。',
        width: 1000,
        height: 500,
        backgroundColor: '#fef3c7'
      })

      expect(response).toBeInstanceOf(Response)
    })

    test('应该生成引用样式', async () => {
      const response = await imageService.generateStyledTextOverlay('quote', {
        content: '设计不只是看起来如何，感觉如何。设计的工作原理才是关键。',
        author: '史蒂夫·乔布斯',
        width: 800,
        height: 600
      })

      expect(response).toBeInstanceOf(Response)
    })
  })

  describe('自动布局测试', () => {
    test('应该支持垂直居中布局', async () => {
      const options: AdvancedTextOverlayOptions = {
        width: 800,
        height: 600,
        backgroundColor: '#ffffff',
        textElements: [
          {
            text: '第一行文字',
            style: { fontSize: 32, color: '#000000' },
            position: { x: '50%', y: 0 },
            type: 'title'
          },
          {
            text: '第二行文字',
            style: { fontSize: 28, color: '#333333' },
            position: { x: '50%', y: 0 },
            type: 'subtitle'
          },
          {
            text: '第三行文字',
            style: { fontSize: 24, color: '#666666' },
            position: { x: '50%', y: 0 },
            type: 'caption'
          }
        ],
        autoLayout: {
          enabled: true,
          distribution: 'center',
          spacing: 20,
          margin: { top: 50, right: 50, bottom: 50, left: 50 }
        }
      }

      const response = await imageService.generateAdvancedTextOverlay(options)
      expect(response).toBeInstanceOf(Response)
    })

    test('应该支持空间分布布局', async () => {
      const options: AdvancedTextOverlayOptions = {
        width: 800,
        height: 600,
        backgroundColor: '#f8fafc',
        textElements: [
          {
            text: '顶部标题',
            style: { fontSize: 36, color: '#1f2937', fontWeight: 'bold' },
            position: { x: '50%', y: 0 },
            type: 'title'
          },
          {
            text: '中间内容',
            style: { fontSize: 24, color: '#374151' },
            position: { x: '50%', y: 0 },
            type: 'subtitle'
          },
          {
            text: '底部信息',
            style: { fontSize: 18, color: '#6b7280' },
            position: { x: '50%', y: 0 },
            type: 'caption'
          }
        ],
        autoLayout: {
          enabled: true,
          distribution: 'space-between',
          margin: { top: 80, right: 40, bottom: 80, left: 40 }
        }
      }

      const response = await imageService.generateAdvancedTextOverlay(options)
      expect(response).toBeInstanceOf(Response)
    })
  })

  describe('文字换行和溢出处理测试', () => {
    test('应该正确处理长文本换行', async () => {
      const longText = '这是一段很长的文字，需要测试自动换行功能是否正常工作，文字应该在合适的位置进行换行，而不是超出指定的宽度范围。'

      const options: AdvancedTextOverlayOptions = {
        width: 800,
        height: 400,
        backgroundColor: '#ffffff',
        textElements: [
          {
            text: longText,
            style: {
              fontSize: 24,
              color: '#000000',
              lineHeight: 1.5
            },
            position: {
              x: '50%',
              y: '50%',
              anchor: 'middle',
              baseline: 'middle',
              maxWidth: 600 // 设置最大宽度
            }
          }
        ]
      }

      const response = await imageService.generateAdvancedTextOverlay(options)
      expect(response).toBeInstanceOf(Response)
    })

    test('应该支持文字变换', async () => {
      const options: AdvancedTextOverlayOptions = {
        width: 800,
        height: 400,
        backgroundColor: '#ffffff',
        textElements: [
          {
            text: 'uppercase text',
            style: {
              fontSize: 32,
              color: '#000000',
              textTransform: 'uppercase',
              fontWeight: 'bold'
            },
            position: {
              x: '50%',
              y: '30%',
              anchor: 'middle',
              baseline: 'middle'
            }
          },
          {
            text: 'Capitalize Each Word',
            style: {
              fontSize: 28,
              color: '#333333',
              textTransform: 'capitalize'
            },
            position: {
              x: '50%',
              y: '70%',
              anchor: 'middle',
              baseline: 'middle'
            }
          }
        ]
      }

      const response = await imageService.generateAdvancedTextOverlay(options)
      expect(response).toBeInstanceOf(Response)
    })
  })

  describe('批量生成测试', () => {
    test('应该支持批量生成多个图片', async () => {
      const batches = [
        {
          id: 'image1',
          options: {
            width: 800,
            height: 400,
            backgroundColor: '#ffffff',
            textElements: [
              {
                text: '图片1',
                style: { fontSize: 48, color: '#000000' },
                position: { x: '50%', y: '50%', anchor: 'middle', baseline: 'middle' }
              }
            ]
          } as AdvancedTextOverlayOptions
        },
        {
          id: 'image2',
          options: {
            width: 800,
            height: 400,
            backgroundColor: '#f3f4f6',
            textElements: [
              {
                text: '图片2',
                style: { fontSize: 48, color: '#1f2937' },
                position: { x: '50%', y: '50%', anchor: 'middle', baseline: 'middle' }
              }
            ]
          } as AdvancedTextOverlayOptions
        }
      ]

      const results = await imageService.generateBatchTextOverlay(batches)

      expect(results).toHaveLength(2)
      expect(results[0].id).toBe('image1')
      expect(results[1].id).toBe('image2')
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(true)
    })
  })

  describe('样式模板测试', () => {
    test('应该创建正确的文字样式模板', () => {
      const headingStyle = ImageService.createTextStyleTemplate('heading')
      expect(headingStyle.fontSize).toBe(48)
      expect(headingStyle.fontWeight).toBe('bold')
      expect(headingStyle.lineHeight).toBe(1.2)

      const bodyStyle = ImageService.createTextStyleTemplate('body')
      expect(bodyStyle.fontSize).toBe(24)
      expect(bodyStyle.fontWeight).toBe('normal')
      expect(bodyStyle.lineHeight).toBe(1.5)

      const codeStyle = ImageService.createTextStyleTemplate('code')
      expect(codeStyle.fontFamily).toContain('Monaco')
    })
  })

  describe('工具方法测试', () => {
    test('应该正确验证颜色格式', () => {
      expect(ImageService.isValidColor('#ffffff')).toBe(true)
      expect(ImageService.isValidColor('#fff')).toBe(true)
      expect(ImageService.isValidColor('#123456')).toBe(true)
      expect(ImageService.isValidColor('invalid')).toBe(false)
      expect(ImageService.isValidColor('#gggggg')).toBe(false)
    })

    test('应该正确验证图片尺寸', () => {
      expect(ImageService.isValidDimension(100)).toBe(true)
      expect(ImageService.isValidDimension(4096)).toBe(true)
      expect(ImageService.isValidDimension(0)).toBe(false)
      expect(ImageService.isValidDimension(-1)).toBe(false)
      expect(ImageService.isValidDimension(5000)).toBe(false)
    })

    test('应该正确验证图片格式', () => {
      expect(ImageService.isValidFormat('png')).toBe(true)
      expect(ImageService.isValidFormat('jpeg')).toBe(true)
      expect(ImageService.isValidFormat('webp')).toBe(true)
      expect(ImageService.isValidFormat('invalid')).toBe(false)
    })
  })

  describe('缓存功能测试', () => {
    test('应该生成正确的缓存键', () => {
      const cacheKey = imageService.generateCacheKey('test', { width: 800, height: 400 })
      expect(cacheKey).toMatch(/^image:test:/)
      expect(typeof cacheKey).toBe('string')
    })

    test('应该从缓存获取图片', async () => {
      const mockArrayBuffer = new ArrayBuffer(100)
      mockEnv.CACHE_KV.get.mockResolvedValue(mockArrayBuffer)
      mockEnv.CACHE_KV.getWithMetadata.mockResolvedValue({
        metadata: { contentType: 'image/png' }
      })

      const cached = await imageService.getFromCache('test-key')

      expect(cached).toBeInstanceOf(Response)
      expect(cached?.headers.get('Content-Type')).toBe('image/png')
      expect(cached?.headers.get('X-Cache')).toBe('HIT')
    })

    test('应该保存图片到缓存', async () => {
      const imageData = new ArrayBuffer(100)

      await imageService.saveToCache('test-key', imageData, 'image/png', { ttl: 3600 })

      expect(mockEnv.CACHE_KV.put).toHaveBeenCalledWith(
        'test-key',
        imageData,
        {
          expirationTtl: 3600,
          metadata: {
            contentType: 'image/png',
            timestamp: expect.any(Number)
          }
        }
      )
    })
  })
})