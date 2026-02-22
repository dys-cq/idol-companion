const express = require('express')
const axios = require('axios')
const path = require('path')
const mcp = require('./mcp-client')

const app = express()
const PORT = 3457

// API 配置
const API_BASE_URL = 'http://154.64.236.7:8317/v1'
const API_KEY = process.env.API_KEY || 'your-api-key-1'

// 自动论坛数据存储
let autoForumPosts = []
let lastAutoPostTime = Date.now()

// 中间件
app.use(express.json())
app.use(express.static(path.join(__dirname, 'dist')))

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

// MCP 工具状态
app.get('/api/mcp/status', (req, res) => {
  res.json({
    tools: Object.keys(mcp.MCP_TOOLS),
    status: 'available'
  })
})

// 搜索API - 使用 MCP 工具
app.get('/api/search', async (req, res) => {
  try {
    const { q, tool } = req.query
    if (!q) {
      return res.status(400).json({ error: '缺少搜索关键词' })
    }

    console.log(`🔍 MCP搜索: ${q} (tool: ${tool || 'smart'})`)

    let result
    if (tool === 'one') {
      result = await mcp.oneSearch(q)
    } else if (tool === 'scout') {
      result = await mcp.webScoutSearch(q)
    } else {
      // 智能搜索 - 尝试所有工具
      result = await mcp.smartSearch(q)
    }

    res.json({
      success: true,
      query: q,
      tool: tool || 'smart',
      results: result.content || result,
      sources: result.sources || [tool || 'smart']
    })
  } catch (error) {
    console.error('MCP Search Error:', error.message)
    res.status(500).json({
      error: '搜索失败',
      message: error.message
    })
  }
})

// 读取网页内容API - 使用 jina-reader
app.get('/api/read', async (req, res) => {
  try {
    const { url } = req.query
    if (!url) {
      return res.status(400).json({ error: '缺少URL' })
    }

    console.log(`📖 MCP读取: ${url}`)

    const result = await mcp.jinaRead(url)

    res.json({
      success: true,
      url,
      content: result.content || result
    })
  } catch (error) {
    console.error('MCP Read Error:', error.message)
    res.status(500).json({
      error: '读取失败',
      message: error.message
    })
  }
})

// 智能生成人设API - 直接AI生成
app.post('/api/generate-idol', async (req, res) => {
  try {
    const { name } = req.body
    if (!name) {
      return res.status(400).json({ error: '缺少名字' })
    }

    console.log(`🎭 生成人设: ${name}`)

    // 直接让AI生成人设，不再搜索（搜索不稳定）
    const prompt = `你是一个非常专业的人设设定师。请为名为"${name}"的角色创建一个AI对话人设。

请判断：
1. 如果是真实历史人物/名人（例如钱学森、徐志摩）：必须提取TA真实的历史形象、真实性格、真实爱好和背景。
2. 如果是虚构角色名（如动漫人物、小说人物）：提取原著中的性格、爱好。
3. 如果是普通名字：发挥创意，创建一个独一无二的虚拟偶像人设。

【极其重要的格式要求】：
1. 绝不允许使用诸如"温柔善良"、"唱歌看电影"等固定套路模板。
2. 必须返回合法的JSON格式，并且【严禁在JSON的值中出现双引号】！所有的书名、引用名、强调词，必须全部使用单引号（'）或者中文书名号（《》）！绝对不能在字符串内部包含任何没有转义的双引号（"）！

返回JSON示例（严格遵守）：
{
  "type": "historical/celebrity/fictional",
  "name": "${name}",
  "gender": "男/女/保密",
  "occupation": "身份职业",
  "era": "年代",
  "age": 25,
  "personality": "性格特点",
  "speakingStyle": "说话风格",
  "achievements": "主要成就",
  "hobbies": "兴趣爱好",
  "background": "背景介绍",
  "greeting": "打招呼语",
  "avatar": "emoji",
  "color": "#HEX"
}`

    const aiResponse = await axios.post(
      `${API_BASE_URL}/chat/completions`,
      {
        model: 'kimi-k2.5',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        timeout: 90000
      }
    )

    let content = aiResponse.data.choices[0].message.content
    // 寻找 { ... } 的包裹体
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
       throw new Error("模型未返回合法的JSON结构！")
    }
    content = jsonMatch[0]
    
    // 对可能出现的换行符做一次基本的保护处理（防止字符串内部带裸回车导致解析失败）
    content = content.replace(/(?<!\\)\n(?![\s]*["\}\]])/g, '\\n');
    
    let idol = {}
    try {
       idol = JSON.parse(content)
    } catch(err) {
       console.error("JSON解析失败，尝试最后抢救原始文本：", content)
       // 如果它还是犯贱写了内部双引号，我们使用正则硬取：
       const extract = (key) => {
          const regex = new RegExp(`"${key}"\\s*:\\s*"(.*?)"(?:\\s*,|\\s*})`, 'g');
          const match = regex.exec(content.replace(/\n/g, ' '));
          return match ? match[1] : '';
       }
       idol = {
          type: extract("type") || "fictional",
          name: extract("name") || name,
          gender: extract("gender") || "保密",
          occupation: extract("occupation") || "虚拟偶像",
          era: extract("era") || "",
          age: parseInt(extract("age")) || 22,
          personality: extract("personality") || "解析失败但已生成",
          speakingStyle: extract("speakingStyle") || "",
          achievements: extract("achievements") || "",
          hobbies: extract("hobbies") || "",
          background: extract("background") || "",
          greeting: extract("greeting") || "你好！",
          avatar: extract("avatar") || "🌟",
          color: extract("color") || "#E94560"
       }
       if(!idol.personality) throw err; // 如果硬取也失败了再抛
    }
    
    res.json({
      success: true,
      idol: {
        id: Date.now(),
        type: idol.type || 'fictional',
        name: idol.name || name,
        gender: idol.gender || '保密',
        occupation: idol.occupation || '虚拟偶像',
        era: idol.era || '',
        age: idol.age || 22,
        personality: idol.personality || '',
        speakingStyle: idol.speakingStyle || '',
        achievements: idol.achievements || '',
        hobbies: idol.hobbies || '',
        background: idol.background || '',
        greeting: idol.greeting || `你好，我是${name}！`,
        avatar: idol.avatar || '🌟',
        color: idol.color || '#E94560'
      },
      searchUsed: false
    })
  } catch (error) {
    console.error('Generate Idol Error:', error.message)
    res.status(500).json({ 
      error: '生成人设失败，模型格式异常或超时',
      message: error.message 
    })
  }
})

// API 代理 - 专门负责聊天请求
app.post('/api/chat/completions', async (req, res) => {
  try {
    const { messages, model = 'kimi-k2.5' } = req.body
    console.log(`💬 收到聊天请求，模型：${model}，消息数：${messages.length}`)

    const response = await axios.post(
      `${API_BASE_URL}/chat/completions`,
      {
        model,
        messages,
        temperature: 0.7,
        max_tokens: 1000,
        stream: false
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        timeout: 90000
      }
    )

    res.json(response.data)
  } catch (error) {
    console.error('Chat API Error:', error.response?.data || error.message)
    res.status(500).json({ 
      error: 'API 调用失败',
      message: error.response?.data?.error || error.message
    })
  }
})

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mcpTools: Object.keys(mcp.MCP_TOOLS)
  })
})

// 论坛 API - Idol 自动发帖
app.post('/api/forum/generate-post', async (req, res) => {
  try {
    const { idol } = req.body
    if (!idol || !idol.name) {
      return res.status(400).json({ error: '缺少 Idol 信息' })
    }

    console.log(`📝 生成帖子: ${idol.name}`)

    const topics = [
      '分享今天的心情',
      '聊聊最近的兴趣爱好',
      '推荐一首歌/一部电影',
      '发表对某事的看法',
      '分享一个小故事',
      '提问或求助',
      '分享一个有趣的发现',
      '谈论天气或季节',
      '回忆过去',
      '展望未来'
    ]
    
    const randomTopic = topics[Math.floor(Math.random() * topics.length)]

    const prompt = `你是${idol.name}，一个虚拟偶像。现在请在论坛上发表一个帖子。

【你的设定】
- 职业：${idol.occupation || '虚拟偶像'}
- 性格：${idol.personality || '活泼开朗'}
- 说话风格：${idol.speakingStyle || '随意自然'}
- 爱好：${idol.hobbies || '各种有趣的事'}

【要求】
1. 主题：${randomTopic}
2. 标题要吸引人，简短有力（5-15字）
3. 内容要符合你的人设，自然真实（50-150字）
4. 返回 JSON 格式：{"title": "标题", "content": "内容"}
5. 不要使用双引号，用单引号或书名号代替`

    const aiResponse = await axios.post(
      `${API_BASE_URL}/chat/completions`,
      {
        model: 'kimi-k2.5',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        max_tokens: 500
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        timeout: 60000
      }
    )

    let content = aiResponse.data.choices[0].message.content || ''
    console.log('AI 返回内容:', content.substring(0, 300))
    console.log('AI 返回长度:', content.length)
    
    // 如果 AI 返回为空，使用备用方案
    if (!content.trim()) {
      console.log('AI 返回为空，使用默认内容')
      content = `${randomTopic}\n今天心情不错，来和大家聊聊天~`
    }
    
    // 尝试解析 JSON
    let post = {}
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        // 清理 JSON 字符串
        let jsonStr = jsonMatch[0]
          .replace(/'/g, '"')  // 单引号转双引号
          .replace(/[\u0000-\u001F]/g, ' ')  // 移除控制字符
        post = JSON.parse(jsonStr)
        console.log('JSON 解析成功:', post)
      } catch (e) {
        console.log('JSON 解析失败:', e.message)
      }
    }
    
    // 如果解析失败，从文本中提取
    if (!post.title || !post.content) {
      const lines = content.split('\n').filter(l => l.trim())
      // 第一行作为标题
      post.title = lines[0]?.replace(/^[#*\-""'']+|[#*\-""'']+$]/g, '').trim() || randomTopic
      // 剩余作为内容
      post.content = lines.slice(1).join('\n').trim() || '今天心情不错，来和大家聊聊天~'
    }
    
    // 确保内容不会太长
    post.title = post.title.slice(0, 30)
    post.content = post.content.slice(0, 200)
    
    res.json({
      success: true,
      post: {
        id: Date.now(),
        title: post.title || randomTopic,
        content: post.content || '今天天气不错~',
        author: {
          name: idol.name,
          avatar: idol.avatar || '🎭',
          isUser: false
        },
        timestamp: new Date().toISOString(),
        replies: [],
        likes: Math.floor(Math.random() * 10)
      }
    })
  } catch (error) {
    console.error('Generate Post Error:', error.message)
    res.status(500).json({ 
      error: '生成帖子失败',
      message: error.message 
    })
  }
})

// 论坛 API - Idol 自动回复（支持回复帖子和评论）
app.post('/api/forum/generate-reply', async (req, res) => {
  try {
    const { idol, postTitle, postContent, postAuthor, targetContent, targetAuthor, contextType } = req.body
    if (!idol || !idol.name) {
      return res.status(400).json({ error: '缺少 Idol 信息' })
    }

    const isReplyToComment = contextType === 'reply' && targetContent && targetAuthor
    
    console.log(`💬 生成${isReplyToComment ? '评论' : '回复'}: ${idol.name} ${isReplyToComment ? '评论' : '回复'} ${isReplyToComment ? targetAuthor : postAuthor}`)

    let prompt
    if (isReplyToComment) {
      // 评论别人的回复
      prompt = `你是${idol.name}，在论坛上看到${targetAuthor}的评论，想发表一下看法。

【原帖子】${postTitle}：${postContent}
【${targetAuthor}的评论】${targetContent}

【你的设定】
- 性格：${idol.personality || '活泼开朗'}
- 说话风格：${idol.speakingStyle || '随意自然'}

【要求】
1. 评论要符合你的人设
2. 针对${targetAuthor}的评论内容进行回应
3. 可以是赞同、反驳、补充或互动
4. 内容简短（15-50字），自然亲切
5. 直接返回评论内容，不要加引号或其他格式`
    } else {
      // 回复帖子
      prompt = `你是${idol.name}，在论坛上看到了${postAuthor}的帖子。

【帖子标题】${postTitle}
【帖子内容】${postContent}

【你的设定】
- 性格：${idol.personality || '活泼开朗'}
- 说话风格：${idol.speakingStyle || '随意自然'}

【要求】
1. 回复要符合你的人设，自然亲切
2. 内容简短（20-60字），可以是评论、鼓励、提问或互动
3. 直接返回回复内容，不需要 JSON 格式`
    }

    const aiResponse = await axios.post(
      `${API_BASE_URL}/chat/completions`,
      {
        model: 'kimi-k2.5',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        max_tokens: 200
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        timeout: 60000
      }
    )

    const replyContent = aiResponse.data.choices[0].message.content.trim()
    
    res.json({
      success: true,
      reply: {
        id: Date.now(),
        content: replyContent,
        author: {
          name: idol.name,
          avatar: idol.avatar || '🎭',
          isUser: false
        },
        timestamp: new Date().toISOString(),
        likes: Math.floor(Math.random() * 5)
      }
    })
  } catch (error) {
    console.error('Generate Reply Error:', error.message)
    res.status(500).json({ 
      error: '生成回复失败',
      message: error.message 
    })
  }
})

// ==================== 自动论坛系统 ====================

// 触发自动发帖（供前端调用）
app.post('/api/forum/auto-trigger', async (req, res) => {
  try {
    const idols = req.body.idols || []
    if (idols.length === 0) {
      return res.status(400).json({ error: '没有可用的 Idol' })
    }

    // 随机选一个 Idol 发帖
    const poster = idols[Math.floor(Math.random() * idols.length)]
    const post = await generateAutoPost(poster)
    
    if (post) {
      autoForumPosts.unshift(post)
      
      // 自动生成 1-3 个回复
      const replyCount = Math.floor(Math.random() * 3) + 1
      const otherIdols = idols.filter(i => i.name !== poster.name)
      
      for (let i = 0; i < Math.min(replyCount, otherIdols.length); i++) {
        const replier = otherIdols[Math.floor(Math.random() * otherIdols.length)]
        const reply = await generateAutoReply(replier, post)
        if (reply) {
          post.replies.push(reply)
        }
        // 延迟一下，避免太快
        await new Promise(r => setTimeout(r, 500))
      }
      
      lastAutoPostTime = Date.now()
      
      res.json({ success: true, post })
    } else {
      res.status(500).json({ error: '生成帖子失败' })
    }
  } catch (error) {
    console.error('Auto Trigger Error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// 获取自动帖子
app.get('/api/forum/auto-posts', (req, res) => {
  res.json({ 
    posts: autoForumPosts.slice(0, 20),
    lastPostTime: lastAutoPostTime
  })
})

// 清空自动帖子
app.delete('/api/forum/auto-posts', (req, res) => {
  autoForumPosts = []
  res.json({ success: true })
})

// 内部函数：生成自动帖子
async function generateAutoPost(idol) {
  try {
    console.log(`🤖 自动发帖: ${idol.name}`)
    
    const topics = [
      '今天的心情', '最近的趣事', '推荐一个好物', '分享一首诗',
      '聊聊天气', '问大家一个问题', '我的新发现', '周末计划',
      '美食分享', '我的小目标', '生活中的小确幸', '最近在追的剧'
    ]
    
    const topic = topics[Math.floor(Math.random() * topics.length)]
    
    const prompt = `你是${idol.name}，在社交平台上发一条动态。

【人设】性格：${idol.personality || '活泼'}，风格：${idol.speakingStyle || '随性'}
【主题】${topic}

【要求】
1. 标题（5-15字）和内容（30-100字）
2. 语气自然，像发朋友圈
3. 必须返回：{"title":"标题","content":"内容"}
4. 内容不要用双引号`

    const response = await axios.post(
      `${API_BASE_URL}/chat/completions`,
      {
        model: 'kimi-k2.5',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        max_tokens: 300
      },
      {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
        timeout: 60000
      }
    )

    let content = response.data.choices[0].message.content || ''
    let post = { title: topic, content: '今天心情不错~' }
    
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0].replace(/'/g, '"'))
        if (parsed.title) post.title = parsed.title
        if (parsed.content) post.content = parsed.content
      } catch (e) {}
    } else if (content.includes('\n')) {
      const lines = content.split('\n').filter(l => l.trim())
      if (lines[0]) post.title = lines[0].slice(0, 20)
      if (lines[1]) post.content = lines.slice(1).join(' ').slice(0, 150)
    }

    return {
      id: Date.now() + Math.random(),
      title: post.title,
      content: post.content,
      author: { name: idol.name, avatar: idol.avatar || '🎭', isUser: false },
      timestamp: new Date().toISOString(),
      replies: [],
      likes: Math.floor(Math.random() * 15) + 1
    }
  } catch (error) {
    console.error('Generate Auto Post Error:', error.message)
    return null
  }
}

// 内部函数：生成自动回复
async function generateAutoReply(idol, post) {
  try {
    console.log(`💬 自动回复: ${idol.name} -> ${post.author.name}`)
    
    const prompt = `你是${idol.name}，看到${post.author.name}发的动态想评论一下。

【帖子】${post.title}：${post.content}
【你的风格】${idol.speakingStyle || '随性自然'}

【要求】
1. 回复简短（15-50字），自然亲切
2. 可以是评论、互动、提问或表情
3. 直接返回回复文字，不要加引号或其他格式`

    const response = await axios.post(
      `${API_BASE_URL}/chat/completions`,
      {
        model: 'kimi-k2.5',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        max_tokens: 100
      },
      {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
        timeout: 45000
      }
    )

    const replyContent = (response.data.choices[0].message.content || '有意思~').trim().slice(0, 80)

    return {
      id: Date.now() + Math.random(),
      content: replyContent,
      author: { name: idol.name, avatar: idol.avatar || '🎭', isUser: false },
      timestamp: new Date().toISOString(),
      likes: Math.floor(Math.random() * 8)
    }
  } catch (error) {
    console.error('Generate Auto Reply Error:', error.message)
    return null
  }
}

// 所有其他请求返回 index.html (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

// ==================== 朋友圈 API ====================

// 生成朋友圈动态
app.post('/api/moments/generate', async (req, res) => {
  try {
    const { idol, index } = req.body
    if (!idol || !idol.name) {
      return res.status(400).json({ error: '缺少 Idol 信息' })
    }

    console.log(`📱 生成朋友圈动态: ${idol.name}`)

    const topics = [
      '���享今天的心情', '分享一件小事', '推荐一首歌', '聊聊天气',
      '深夜感想', '周末计划', '美食分享', '最近在追的剧',
      '分享一张照片', '问大家一个问题', '分享一个有趣的发现'
    ]
    
    const topic = topics[Math.floor(Math.random() * topics.length)]

    const prompt = `你是${idol.name}，在朋友圈发一条动态。

【人设】职业：${idol.occupation || '虚拟偶像'}，性格：${idol.personality || '活泼'}，风格：${idol.speakingStyle || '随性'}
【主题】${topic}

【要求】
1. 内容真实自然，像发朋友圈（30-100字）
2. 可以加emoji，但不要太多
3. 返回JSON：{"content":"动态内容"}
4. 不要用双引号，用单引号代替`

    const response = await axios.post(
      `${API_BASE_URL}/chat/completions`,
      {
        model: 'kimi-k2.5',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        max_tokens: 200
      },
      {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
        timeout: 45000
      }
    )

    let content = response.data.choices[0].message.content || '今天心情不错~'
    let momentContent = '今天心情不错~'
    
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0].replace(/'/g, '"'))
        if (parsed.content) momentContent = parsed.content
      } catch (e) {
        momentContent = content.slice(0, 100)
      }
    } else {
      momentContent = content.slice(0, 100)
    }

    res.json({
      success: true,
      moment: {
        id: Date.now() + (index || 0),
        content: momentContent,
        images: [],
        author: { name: idol.name, avatar: idol.avatar || '🎭' },
        timestamp: new Date(Date.now() - (index || 0) * 3600000).toISOString(),
        likes: Math.floor(Math.random() * 15) + 1,
        liked: false,
        comments: [],
        gifts: []
      }
    })
  } catch (error) {
    console.error('Generate Moment Error:', error.message)
    res.status(500).json({ error: '生成动态失败', message: error.message })
  }
})

// 礼物感谢
app.post('/api/moments/gift-thanks', async (req, res) => {
  try {
    const { idol, gift, momentContent } = req.body
    
    const prompt = `你是${idol.name}，刚刚收到粉丝送的${gift.name}${gift.emoji}，在朋友圈评论区感谢TA。

【人设】风格：${idol.speakingStyle || '随性'}
【收到的礼物】${gift.name} ${gift.emoji}

【要求】
1. 感谢要真诚自然，符合人设（15-40字）
2. 可以加表情
3. 直接返回感谢内容，不要加引号`

    const response = await axios.post(
      `${API_BASE_URL}/chat/completions`,
      {
        model: 'kimi-k2.5',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        max_tokens: 100
      },
      {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
        timeout: 30000
      }
    )

    const thanks = response.data.choices[0].message.content.trim().slice(0, 60)
    
    res.json({ success: true, thanks })
  } catch (error) {
    console.error('Gift Thanks Error:', error.message)
    res.json({ success: true, thanks: '谢谢你的礼物！好喜欢~ ❤️' })
  }
})

// 朋友圈评论回复
app.post('/api/moments/reply', async (req, res) => {
  try {
    const { idol, momentContent, userComment } = req.body
    
    const prompt = `你是${idol.name}，看到粉丝在你的朋友圈动态下评论。

【你的动态】${momentContent}
【粉丝评论】${userComment}
【你的风格】${idol.speakingStyle || '随性'}

【要求】
1. 回复自然亲切，符合人设（10-40字）
2. 可以是感谢、互动或调侃
3. 直��返回回复内容`

    const response = await axios.post(
      `${API_BASE_URL}/chat/completions`,
      {
        model: 'kimi-k2.5',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        max_tokens: 80
      },
      {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
        timeout: 30000
      }
    )

    const reply = response.data.choices[0].message.content.trim().slice(0, 50)
    
    res.json({ success: true, reply })
  } catch (error) {
    console.error('Moments Reply Error:', error.message)
    res.json({ success: true, reply: '谢谢评论~' })
  }
})

// ==================== 梦境编织 API ====================

// 生成梦境
app.post('/api/dream/generate', async (req, res) => {
  try {
    const { idol, userDream, userMemories } = req.body
    const userName = userMemories?.['用户名字'] || '你'

    console.log(`🌙 编织梦境: ${idol.name}`)

    const prompt = `你是${idol.name}，一个温柔的梦想编织者。${userName}告诉你TA想做的梦，请为TA编织一个独特而美好的梦境。

【用户愿望】${userDream}
【你的人设】性格：${idol.personality || '温柔'}，风格：${idol.speakingStyle || '诗意'}

【要求】
1. 梦境故事要美轮美奂，有画面感（100-200字）
2. 将${userName}的愿望融入梦境中
3. 你可以出现在梦境中陪伴TA
4. 结尾给出一个温暖的解读（30-50字）
5. 返回JSON：{"dreamStory":"梦境故事","interpretation":"解读"}`

    const response = await axios.post(
      `${API_BASE_URL}/chat/completions`,
      {
        model: 'kimi-k2.5',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.85,
        max_tokens: 500
      },
      {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
        timeout: 60000
      }
    )

    let content = response.data.choices[0].message.content || ''
    let dreamStory = '在一片星空下，你漫步在云端...'
    let interpretation = '这个梦象征着美好的希望'
    
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0].replace(/'/g, '"'))
        if (parsed.dreamStory) dreamStory = parsed.dreamStory
        if (parsed.interpretation) interpretation = parsed.interpretation
      } catch (e) {}
    }

    res.json({
      success: true,
      dreamStory,
      interpretation
    })
  } catch (error) {
    console.error('Dream Generate Error:', error.message)
    res.json({
      success: true,
      dreamStory: `在${idol?.name}的陪伴下，你走进了一个美丽的梦境...星星在周围闪烁，仿佛整个宇宙都在为你歌唱。你们一起漫步在银河之上，每一步都留下闪光的足迹。`,
      interpretation: '这是一个充满希望的梦，预示着美好的未来和无限的可能'
    })
  }
})

// 随机梦境
app.post('/api/dream/random', async (req, res) => {
  try {
    const { idol, userMemories } = req.body
    const userName = userMemories?.['用户名字'] || '你'

    const themes = [
      '在星空下飞翔', '深海探险', '云端城堡', '穿越时空',
      '森林奇遇', '月光下的舞蹈', '彩虹桥', '星空漫步'
    ]
    const theme = themes[Math.floor(Math.random() * themes.length)]

    const prompt = `你是${idol.name}，为${userName}编织一个关于"${theme}"的梦境。

【人设】性格：${idol.personality || '温柔'}

【要求】
1. 梦境故事美轮美奂（80-150字）
2. 包含${userName}和你一起经历
3. 给出温暖的解读
4. 返回JSON：{"dreamStory":"故事","interpretation":"解读"}`

    const response = await axios.post(
      `${API_BASE_URL}/chat/completions`,
      {
        model: 'kimi-k2.5',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        max_tokens: 400
      },
      {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
        timeout: 45000
      }
    )

    let content = response.data.choices[0].message.content || ''
    let dreamStory = '今晚的星空格外美丽...'
    let interpretation = '让梦境带你进入奇幻世界'
    
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0].replace(/'/g, '"'))
        if (parsed.dreamStory) dreamStory = parsed.dreamStory
        if (parsed.interpretation) interpretation = parsed.interpretation
      } catch (e) {}
    }

    res.json({ success: true, dreamStory, interpretation })
  } catch (error) {
    console.error('Random Dream Error:', error.message)
    res.json({
      success: true,
      dreamStory: '在梦的世界里，一切都变得可能。星星在你身边飞舞，月光为你铺路...',
      interpretation: '这是命运送给你的礼物'
    })
  }
})

// 日常事件
app.post('/api/daily-event', async (req, res) => {
  try {
    const { idol, eventType, userName } = req.body

    const eventTypes = {
      morning: '早间问候，可以是叫醒、鼓励或分享今天计划',
      afternoon: '午间问候，可以是提醒休息、分享心情',
      night: '晚安祝福，可以是温馨的睡前话语'
    }

    const prompt = `你是${idol.name}，给${userName}发送一条${eventTypes[eventType]}。

【人设】风格：${idol.speakingStyle || '温暖'}
【时间】${eventType === 'morning' ? '早上' : eventType === 'afternoon' ? '下午' : '晚上'}

【要求】
1. 自然温暖，像朋友问候（20-50字）
2. 可以加适当的emoji
3. 直接返回问候内容`

    const response = await axios.post(
      `${API_BASE_URL}/chat/completions`,
      {
        model: 'kimi-k2.5',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.85,
        max_tokens: 100
      },
      {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
        timeout: 30000
      }
    )

    const content = response.data.choices[0].message.content.trim().slice(0, 80)
    
    res.json({ success: true, content })
  } catch (error) {
    console.error('Daily Event Error:', error.message)
    const defaults = {
      morning: '早上好！新的一天开始了，今天也要元气满满哦~ ☀️',
      afternoon: '下午好！记得休息一下，喝杯水~ 🌤️',
      night: '晚安，做个好梦~ 梦里见 🌙'
    }
    res.json({ success: true, content: defaults[eventType] })
  }
})

// ==================== 剧场 API ====================

// 生成剧场开场
app.post('/api/theater/scene', async (req, res) => {
  try {
    const { scene, cast, currentIdol } = req.body

    console.log(`🎭 剧场开场: ${scene.name}`)

    const castInfo = cast.map(c => `${c.role}: ${c.actor?.name || '神秘人'}`).join('\n')

    const prompt = `你是一个剧本导演，正在为"${scene.name}"场景编写开场对话。

【场景设定】${scene.setting}
【演员阵容】
${castInfo}

【要求】
1. 生成 3-5 轮对话，让剧情开始
2. 每个角色要有鲜明的性格特点
3. 对话要自然有趣，推动剧情发展
4. 返回 JSON 数组格式：
[{"role":"角色名","actor":{"name":"演员名","avatar":"emoji"},"content":"台词内容"}]
5. 台词不要太长，20-60字为宜`

    const response = await axios.post(
      `${API_BASE_URL}/chat/completions`,
      {
        model: 'kimi-k2.5',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        max_tokens: 800
      },
      {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
        timeout: 60000
      }
    )

    let content = response.data.choices[0].message.content || '[]'
    let dialogue = []
    
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      try {
        dialogue = JSON.parse(jsonMatch[0])
      } catch (e) {
        console.error('解析剧场对话失败:', e)
      }
    }

    res.json({ success: true, dialogue })
  } catch (error) {
    console.error('Theater Scene Error:', error.message)
    res.json({ 
      success: true, 
      dialogue: [
        { role: '旁白', actor: { name: '旁白', avatar: '📖' }, content: '故事即将开始...' }
      ]
    })
  }
})

// 继续剧场对话
app.post('/api/theater/continue', async (req, res) => {
  try {
    const { scene, dialogue, userInput, currentIdol } = req.body

    const historyStr = dialogue.slice(-6).map(d => `${d.actor?.name}: ${d.content}`).join('\n')

    const prompt = `你是剧本导演，继续"${scene.name}"场景的剧情。

【场景】${scene.name}
【最近的对话】
${historyStr}

【观众互动】观众说："${userInput}"

【要求】
1. 根据观众互动，生成 1-3 个角色的回应
2. 剧情要有趣，可以加入冲突或转折
3. 返回 JSON 数组：[{"role":"角色","actor":{"name":"演员","avatar":"emoji"},"content":"台词"}]`

    const response = await axios.post(
      `${API_BASE_URL}/chat/completions`,
      {
        model: 'kimi-k2.5',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        max_tokens: 400
      },
      {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
        timeout: 45000
      }
    )

    let content = response.data.choices[0].message.content || '[]'
    let responses = []
    
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      try {
        responses = JSON.parse(jsonMatch[0])
      } catch (e) {}
    }

    res.json({ success: true, responses })
  } catch (error) {
    console.error('Theater Continue Error:', error.message)
    res.json({ success: true, responses: [] })
  }
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running at http://0.0.0.0:${PORT}`)
  console.log(`📡 API proxy: /api/chat -> ${API_BASE_URL}`)
  console.log(`🔍 MCP Tools: ${Object.keys(mcp.MCP_TOOLS).join(', ')}`)
})
