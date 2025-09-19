// 测试条件评估
function isTruthy(value) {
  if (value === null || value === undefined) return false
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') return value.length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  return Boolean(value)
}

function evaluateCondition(condition, context) {
  try {
    // 解析简单的条件表达式
    const value = resolveVariable(condition, context)
    return isTruthy(value)
  } catch {
    return false
  }
}

function resolveVariable(path, context) {
  try {
    const parts = path.split('.')
    let value = context

    for (const part of parts) {
      if (value === null || value === undefined) {
        return ''
      }
      value = value[part]
    }

    return value !== undefined && value !== null ? value.toString() : ''
  } catch {
    return ''
  }
}

// 测试
const context1 = { showContent: true }
const context2 = { showContent: false }

console.log('showContent=true:', evaluateCondition('showContent', context1))
console.log('showContent=false:', evaluateCondition('showContent', context2))
console.log('resolveVariable showContent=true:', resolveVariable('showContent', context1))
console.log('resolveVariable showContent=false:', resolveVariable('showContent', context2))
console.log('isTruthy "true":', isTruthy('true'))
console.log('isTruthy "false":', isTruthy('false'))
console.log('isTruthy "":', isTruthy(''))
console.log('isTruthy true:', isTruthy(true))
console.log('isTruthy false:', isTruthy(false))