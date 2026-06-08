/**
 * ICP备案信息配置
 * 根据域名返回对应的备案信息
 */

export interface ICPInfo {
  company: string
  icp: string
}

// 域名到备案信息的映射
const icpMapping: Record<string, ICPInfo> = {
  // 犀牛剪辑
  'xiniujianji.com': {
    company: '上海卷糖科技有限公司',
    icp: '沪ICP备2022016551号'
  },
  'www.xiniujianji.com': {
    company: '上海卷糖科技有限公司',
    icp: '沪ICP备2022016551号'
  },
  'xiniujianji.nocopy.net': {
    company: '嘉兴福思网络科技有限公司',
    icp: '浙ICP备16029135号'
  },

  // ALLCUT
  'allcut.cn': {
    company: '上海卷糖科技有限公司',
    icp: '沪ICP备2022016551号'
  },
  'cms.allcut.cn': {
    company: '上海卷糖科技有限公司',
    icp: '沪ICP备2022016551号'
  },
  'allcut.nocopy.net': {
    company: '嘉兴福思网络科技有限公司',
    icp: '浙ICP备16029135号'
  },

  // 万剪
  'wanjian666.com': {
    company: '上海卷糖科技有限公司',
    icp: '沪ICP备2022016551号'
  },
  'cms.wanjian666.com': {
    company: '上海卷糖科技有限公司',
    icp: '沪ICP备2022016551号'
  },
  'wanjian.nocopy.net': {
    company: '嘉兴福思网络科技有限公司',
    icp: '浙ICP备16029135号'
  }
}

/**
 * 根据域名获取备案信息
 * @param domain 当前访问的域名
 * @returns 备案信息，如果域名未配置则返回null
 */
export function getICPInfo(domain: string): ICPInfo | null {
  // 移除可能的端口号
  const cleanDomain = domain.split(':')[0]
  return icpMapping[cleanDomain] || null
}

/**
 * 生成备案信息HTML
 * @param domain 当前访问的域名
 * @returns 备案信息HTML字符串，如果域名未配置则返回空字符串
 */
export function renderICPFooter(domain: string): string {
  const info = getICPInfo(domain)
  if (!info) {
    return ''
  }

  return `<p>${info.company}</p>
<p><a href="https://beian.miit.gov.cn/" target="_blank" style="color: inherit; opacity: 0.8;">${info.icp}</a></p>`
}
