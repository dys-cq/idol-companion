import React, { useState, useEffect } from 'react'
import { useStore } from '../store'
import './IdolTheater.css'

// 预设剧场场景
const THEATER_SCENES = [
  {
    id: 'court',
    name: '法庭辩论',
    desc: '一场激烈的法庭对决',
    icon: '⚖️',
    roles: ['原告律师', '被告律师', '法官'],
    setting: '庄严的法庭内，双方律师正在为一个重要案件展开激烈辩论...'
  },
  {
    id: 'talkshow',
    name: '深夜脱口秀',
    desc: '轻松幽默的访谈节目',
    icon: '🎤',
    roles: ['主持人', '嘉宾'],
    setting: '深夜演播室，灯光温暖，主持人准备开始采访...'
  },
  {
    id: 'rival',
    name: '情敌对决',
    desc: '两个角色争夺爱情',
    icon: '💔',
    roles: ['追求者A', '追求者B', '心上人'],
    setting: '街角咖啡店外，两位追求者不期而遇...'
  },
  {
    id: 'reunion',
    name: '久别重逢',
    desc: '多年后的意外相遇',
    icon: '🥹',
    roles: ['主角', '老友'],
    setting: '机场候机大厅，两个熟悉的身影相遇了...'
  },
  {
    id: 'mystery',
    name: '悬疑探案',
    desc: '揭开真相的推理',
    icon: '🔍',
    roles: ['侦探', '嫌疑人', '助手'],
    setting: '深夜的书房，侦探正在审问嫌疑人...'
  },
  {
    id: 'radio',
    name: '深夜电台',
    desc: '温暖的电台节目',
    icon: '📻',
    roles: ['DJ', '听众'],
    setting: '深夜电台直播间，DJ正在接听听众来电...'
  }
]

function IdolTheater({ onClose }) {
  const { currentIdol } = useStore()
  const [selectedScene, setSelectedScene] = useState(null)
  const [actors, setActors] = useState([])
  const [dialogue, setDialogue] = useState([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [userInput, setUserInput] = useState('')
  const [loading, setLoading] = useState(false)

  // 加载可用的 Idol 作为演员
  useEffect(() => {
    const customIdols = JSON.parse(localStorage.getItem('custom-idols') || '[]')
    if (currentIdol) {
      setActors([currentIdol, ...customIdols.filter(i => i.name !== currentIdol.name)])
    } else {
      setActors(customIdols)
    }
  }, [currentIdol])

  const startScene = async (scene) => {
    setSelectedScene(scene)
    setDialogue([])
    setIsPlaying(true)
    await generateOpening(scene)
  }

  const generateOpening = async (scene) => {
    setLoading(true)
    try {
      // 随机选择演员分配角色
      const shuffledActors = [...actors].sort(() => Math.random() - 0.5)
      const cast = scene.roles.map((role, idx) => ({
        role,
        actor: shuffledActors[idx % shuffledActors.length] || { name: '神秘人', avatar: '🎭' }
      }))

      const response = await fetch('/idol/api/theater/scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scene,
          cast,
          currentIdol
        })
      })
      const data = await response.json()
      
      if (data.dialogue && data.dialogue.length > 0) {
        setDialogue(data.dialogue.map((line, idx) => ({
          ...line,
          id: Date.now() + idx
        })))
      } else {
        // 使用默认开场白
        generateFallbackOpening(scene, cast)
      }
    } catch (error) {
      console.error('生成开场失败:', error)
      // 使用默认开场白
      const shuffledActors = [...actors].sort(() => Math.random() - 0.5)
      const cast = scene.roles.map((role, idx) => ({
        role,
        actor: shuffledActors[idx % shuffledActors.length] || { name: '神秘人', avatar: '🎭' }
      }))
      generateFallbackOpening(scene, cast)
    }
    setLoading(false)
  }

  const generateFallbackOpening = (scene, cast) => {
    const openingLines = [
      { content: `${scene.setting}`, isNarrator: true },
      { content: '各位，今天我们聚在这里...', actor: cast[0]?.actor, role: cast[0]?.role },
      { content: '是啊，这可真是个特别的时刻。', actor: cast[1]?.actor, role: cast[1]?.role }
    ]
    
    setDialogue(openingLines.map((line, idx) => ({
      ...line,
      id: Date.now() + idx,
      role: line.role || '旁白',
      actor: line.actor || { name: '旁白', avatar: '📖' }
    })))
  }

  const continueDialogue = async () => {
    if (!userInput.trim() || loading) return

    setLoading(true)
    const userLine = {
      id: Date.now(),
      role: '观众',
      actor: { name: '你', avatar: '👤' },
      content: userInput,
      isUser: true
    }
    
    setDialogue(prev => [...prev, userLine])
    setUserInput('')

    try {
      const response = await fetch('/idol/api/theater/continue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scene: selectedScene,
          dialogue: [...dialogue, userLine],
          userInput: userLine.content,
          currentIdol
        })
      })
      const data = await response.json()
      
      if (data.responses && data.responses.length > 0) {
        const newLines = data.responses.map((line, idx) => ({
          ...line,
          id: Date.now() + idx + 1
        }))
        setDialogue(prev => [...prev, ...newLines])
      } else {
        // 使用默认回复
        generateFallbackResponse()
      }
    } catch (error) {
      console.error('继续对话失败:', error)
      // 使用默认回复
      generateFallbackResponse()
    }
    setLoading(false)
  }

  const generateFallbackResponse = () => {
    const fallbackLines = [
      { content: '嗯...让我想想...', actor: currentIdol, role: '主角' },
      { content: '你说得很有道理，我同意你的看法。', actor: currentIdol, role: '主角' }
    ]
    const randomLine = fallbackLines[Math.floor(Math.random() * fallbackLines.length)]
    
    setDialogue(prev => [...prev, {
      ...randomLine,
      id: Date.now(),
      role: randomLine.role || '角色',
      actor: randomLine.actor || { name: currentIdol?.name || 'Idol', avatar: currentIdol?.avatar || '🎭' }
    }])
  }

  const endScene = () => {
    setSelectedScene(null)
    setDialogue([])
    setIsPlaying(false)
    setUserInput('')
  }

  return (
    <div className="theater-overlay">
      <div className="theater-container">
        {/* 头部 */}
        <header className="theater-header">
          <button className="back-btn" onClick={onClose}>◀</button>
          <h2>🎪 Idol 剧场</h2>
          {isPlaying && (
            <button className="end-btn" onClick={endScene}>结束</button>
          )}
        </header>

        {/* 场景选择 */}
        {!isPlaying && (
          <div className="scene-selection">
            <h3>🎭 选择场景</h3>
            <p className="scene-hint">选择一个场景，Idol们将为你演绎精彩的故事</p>
            
            <div className="scenes-grid">
              {THEATER_SCENES.map(scene => (
                <div 
                  key={scene.id}
                  className="scene-card"
                  onClick={() => startScene(scene)}
                >
                  <div className="scene-icon">{scene.icon}</div>
                  <h4>{scene.name}</h4>
                  <p>{scene.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 剧场演出 */}
        {isPlaying && selectedScene && (
          <div className="theater-stage">
            {/* 场景信息 */}
            <div className="scene-info">
              <span className="scene-icon-large">{selectedScene.icon}</span>
              <div className="scene-details">
                <h3>{selectedScene.name}</h3>
                <p>{selectedScene.setting}</p>
              </div>
            </div>

            {/* 对话区域 */}
            <div className="dialogue-area">
              {dialogue.length === 0 && !loading && (
                <div className="empty-dialogue">
                  <p>🎭 剧情即将开始...</p>
                </div>
              )}
              
              {dialogue.map(line => (
                <div 
                  key={line.id} 
                  className={`dialogue-line ${line.isUser ? 'user-line' : ''}`}
                >
                  <div className="speaker">
                    <span className="speaker-avatar">{line.actor?.avatar || '🎭'}</span>
                    <span className="speaker-name">
                      {line.role ? `${line.role} - ` : ''}{line.actor?.name || '神秘人'}
                    </span>
                  </div>
                  <div className="speech">
                    {line.content}
                  </div>
                </div>
              ))}
              
              {loading && (
                <div className="loading-line">
                  <span></span><span></span><span></span>
                </div>
              )}
            </div>

            {/* 观众互动 */}
            <div className="audience-input">
              <textarea
                placeholder="作为观众，你也可以参与剧情发展..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                disabled={loading}
              />
              <button 
                onClick={continueDialogue}
                disabled={!userInput.trim() || loading}
              >
                发送 🎬
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default IdolTheater
