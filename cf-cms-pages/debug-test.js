// 简单的测试脚本来调试正则表达式
const template = '{{#if showContent}}Content is visible{{/if}}'

const patterns = [
  { pattern: /\{\{\s*#if\s+([^}]+)\s*\}\}([\s\S]*?)\{\{\s*\/if\s*\}\}/g, type: 'if' },
  { pattern: /\{\{\s*#each\s+([^}]+)\s*\}\}([\s\S]*?)\{\{\s*\/each\s*\}\}/g, type: 'each' },
  { pattern: /\{\{\s*>\s*([^}]+)\s*\}\}/g, type: 'partial' },
  { pattern: /\{\{\{\s*([^}]+)\s*\}\}\}/g, type: 'raw' },
  { pattern: /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s+([^}]+?)\s*\}\}/g, type: 'helper' },
  { pattern: /\{\{\s*([^}]+?)\s*\}\}/g, type: 'variable' }
]

console.log('Testing template:', template)

for (const { pattern, type } of patterns) {
  pattern.lastIndex = 0 // 重置正则表达式
  const match = pattern.exec(template)
  if (match) {
    console.log(`${type} matched:`, match)
    break
  }
}