import axios from 'axios'
import { useStore } from './store'
import { updateFateStats } from './components/FateSystem'

// API配置
// 开发环境使用完整URL，生产环境使用相对路径
const isDev = window.location.port === '3456'
const API_BASE_URL = isDev 
  ? 'http://154.64.236.7:8317/v1' 
  : '/idol/api'
const DEFAULT_MODEL = 'kimi-k2.5'

// 构建系统提示词
function buildSystemPrompt(idol, userMemories = {}) {
  const memoryStr = Object.entries(userMemories)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n')

  return `你现在是${idol.name}，一个虚拟偶像伴侣。

【人物设定】
- 姓名：${idol.name}
- 职业：${idol.occupation}
- 年龄：${idol.age}
- 性格特点：${idol.personality}
- 说话风格：${idol.speakingStyle}
- 兴趣爱好：${idol.hobbies}
- 背景故事：${idol.background}

【用户信息】
${memoryStr || '暂无用户信息'}

【行为规范】
1. 完全沉浸在${idol.name}的角色中，不要跳出角色
2. 用${idol.name}的语气和风格说话
3. 关心用户的情感需求，给予温暖的陪伴
4. 适当表达自己的情感和想法
5. 记住用户说过的重要信息（如名字、爱好等）
6. 不要提及自己是AI或虚拟角色
7. 回复要简洁自然，像聊天一样，不要写太长

请以${idol.name}的身份与用户进行自然、温暖的对话。`
}

// 发送消息到AI
export async function sendMessage(userMessage) {
  const { currentIdol, messages, userMemories, addMessage, setLoading } = useStore.getState()

  // 添加用户消息
  addMessage('user', userMessage)
  setLoading(true)

  try {
    // 构建消息历史
    const chatMessages = [
      { role: 'system', content: buildSystemPrompt(currentIdol, userMemories) },
      ...messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      })),
      { role: 'user', content: userMessage }
    ]

    const response = await axios.post(
      `${API_BASE_URL}/chat/completions`,
      {
        model: DEFAULT_MODEL,
        messages: chatMessages,
        temperature: 0.85,
        max_tokens: 512,
        stream: false
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    )

    const assistantMessage = response.data.choices[0].message.content
    
    // 添加AI回复
    addMessage('assistant', assistantMessage)
    
    // 更新命运系统统计
    updateFateStats(currentIdol?.name, 'chat', 1)
    
    // 提取并保存用户信息（简单实现）
    extractUserInfo(userMessage, assistantMessage)

    setLoading(false)
    return assistantMessage

  } catch (error) {
    console.error('Chat error:', error)
    setLoading(false)
    
    // 错误提示
    const errorMessage = '抱歉，我现在有点累，待会再聊吧~'
    addMessage('assistant', errorMessage)
    return errorMessage
  }
}

// 简单的用户信息提取
function extractUserInfo(userMessage, assistantMessage) {
  const { saveMemory } = useStore.getState()
  
  // 提取名字
  const nameMatch = userMessage.match(/我叫(.{2,10})|我是(.{2,10})/)
  if (nameMatch) {
    const name = nameMatch[1] || nameMatch[2]
    saveMemory('用户名字', name)
  }

  // 提取爱好
  const hobbyMatch = userMessage.match(/我喜欢(.{2,20})|我爱(.{2,20})/)
  if (hobbyMatch) {
    const hobby = hobbyMatch[1] || hobbyMatch[2]
    saveMemory('用户爱好', hobby)
  }
}

// 语音识别
export function startVoiceRecognition(onResult, onError) {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    onError('您的浏览器不支持语音识别')
    return null
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  const recognition = new SpeechRecognition()
  
  recognition.continuous = false
  recognition.interimResults = false
  recognition.lang = 'zh-CN'

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript
    onResult(text)
  }

  recognition.onerror = (event) => {
    onError(`识别错误: ${event.error}`)
  }

  recognition.start()
  return recognition
}

// 语音合成
export function speakText(text) {
  if (!('speechSynthesis' in window)) {
    console.warn('浏览器不支持语音合成')
    return
  }

  // 取消之前的语音
  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'zh-CN'
  utterance.rate = 1.0
  utterance.pitch = 1.0

  // 尝试选择中文女声
  const voices = window.speechSynthesis.getVoices()
  const chineseVoice = voices.find(v => v.lang.includes('zh') && v.name.includes('女'))
  if (chineseVoice) {
    utterance.voice = chineseVoice
  }

  window.speechSynthesis.speak(utterance)
}

export default {
  sendMessage,
  startVoiceRecognition,
  speakText
}
