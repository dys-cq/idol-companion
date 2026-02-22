/**
 * MCP 客户端 - 调用 MCP 搜索工具
 * 支持的工具：web-scout, one-search, jina-reader
 */

const { spawn } = require('child_process')

// MCP 工具配置
const MCP_TOOLS = {
  'web-scout': {
    command: 'npx',
    args: ['-y', '@pinkpixel/web-scout-mcp'],
    tools: ['search_web', 'search_news', 'search_videos']
  },
  'one-search': {
    command: 'npx',
    args: ['-y', 'one-search-mcp'],
    tools: ['search']
  },
  'jina-reader': {
    command: 'npx',
    args: ['-y', 'jina-mcp-tools'],
    tools: ['jina_reader', 'jina_search']
  }
}

// 请求ID计数器
let requestId = 1

/**
 * 创建 MCP 进程并通信
 */
function createMcpProcess(toolName) {
  const config = MCP_TOOLS[toolName]
  if (!config) {
    throw new Error(`Unknown MCP tool: ${toolName}`)
  }

  return new Promise((resolve, reject) => {
    const proc = spawn(config.command, config.args, {
      stdio: ['pipe', 'pipe', 'pipe']
    })

    let buffer = ''
    let initialized = false

    proc.stdout.on('data', (data) => {
      buffer += data.toString()
      // 尝试解析 JSON-RPC 响应
      const lines = buffer.split('\n')
      buffer = lines.pop() // 保留不完整的行

      lines.forEach(line => {
        if (line.trim().startsWith('{')) {
          try {
            const response = JSON.parse(line)
            if (initialized) {
              proc.emit('response', response)
            } else if (response.result) {
              initialized = true
              resolve(proc)
            }
          } catch (e) {
            // 忽略非JSON行
          }
        }
      })
    })

    proc.stderr.on('data', (data) => {
      // MCP 工具通常在 stderr 输出日志
      console.log(`[${toolName}] ${data.toString()}`)
    })

    proc.on('error', (err) => {
      reject(err)
    })

    // 初始化 MCP 连接
    const initRequest = {
      jsonrpc: '2.0',
      id: requestId++,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'idol-companion',
          version: '1.0.0'
        }
      }
    }

    proc.stdin.write(JSON.stringify(initRequest) + '\n')

    // 超时处理
    setTimeout(() => {
      if (!initialized) {
        proc.kill()
        reject(new Error('MCP initialization timeout'))
      }
    }, 10000)
  })
}

/**
 * 调用 MCP 工具
 */
async function callMcpTool(proc, toolName, args) {
  return new Promise((resolve, reject) => {
    const request = {
      jsonrpc: '2.0',
      id: requestId++,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    }

    const timeout = setTimeout(() => {
      reject(new Error('MCP call timeout'))
    }, 30000)

    proc.once('response', (response) => {
      clearTimeout(timeout)
      if (response.error) {
        reject(new Error(response.error.message || 'MCP tool error'))
      } else {
        resolve(response.result)
      }
    })

    proc.stdin.write(JSON.stringify(request) + '\n')
  })
}

/**
 * 使用 web-scout 搜索
 */
async function webScoutSearch(query) {
  const proc = await createMcpProcess('web-scout')
  try {
    const result = await callMcpTool(proc, 'search_web', { query })
    return result
  } finally {
    proc.kill()
  }
}

/**
 * 使用 one-search 搜索
 */
async function oneSearch(query) {
  const proc = await createMcpProcess('one-search')
  try {
    const result = await callMcpTool(proc, 'search', { query })
    return result
  } finally {
    proc.kill()
  }
}

/**
 * 使用 jina-reader 读取网页
 */
async function jinaRead(url) {
  const proc = await createMcpProcess('jina-reader')
  try {
    const result = await callMcpTool(proc, 'jina_reader', { url })
    return result
  } finally {
    proc.kill()
  }
}

/**
 * 智能搜索 - 依次尝试多个搜索工具
 */
async function smartSearch(query) {
  const results = {
    query,
    sources: [],
    content: ''
  }

  // 1. 尝试 one-search
  try {
    console.log('🔍 尝试 one-search 搜索...')
    const oneResult = await oneSearch(query)
    if (oneResult?.content) {
      results.sources.push('one-search')
      results.content += oneResult.content + '\n'
    }
  } catch (e) {
    console.log('one-search 搜索失败:', e.message)
  }

  // 2. 尝试 web-scout
  try {
    console.log('🔍 尝试 web-scout 搜索...')
    const scoutResult = await webScoutSearch(query)
    if (scoutResult?.content) {
      results.sources.push('web-scout')
      results.content += scoutResult.content + '\n'
    }
  } catch (e) {
    console.log('web-scout 搜索失败:', e.message)
  }

  results.success = results.sources.length > 0
  return results
}

module.exports = {
  webScoutSearch,
  oneSearch,
  jinaRead,
  smartSearch,
  MCP_TOOLS
}
