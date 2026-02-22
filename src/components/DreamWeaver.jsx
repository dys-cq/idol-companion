import React, { useState, useEffect } from 'react'
import { useStore } from '../store'
import './DreamWeaver.css'

function DreamWeaver({ onClose }) {
  const { currentIdol, userMemories } = useStore()
  const [dreams, setDreams] = useState([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [currentDream, setCurrentDream] = useState(null)
  const [dreamInput, setDreamInput] = useState('')
  const [dailyEvent, setDailyEvent] = useState(null)
  const [view, setView] = useState('main') // 'main' | 'new' | 'journal' | 'daily'

  // 获取稳定的存储 key（基于 idol name）
  const getStorageKey = () => `dreams-${currentIdol?.name || 'default'}`

  useEffect(() => {
    if (currentIdol?.name) {
      loadDreams()
      checkDailyEvent()
    }
  }, [currentIdol?.name])

  const loadDreams = () => {
    const key = getStorageKey()
    const savedDreams = JSON.parse(localStorage.getItem(key) || '[]')
    console.log('📖 加载梦境:', key, savedDreams.length, '条')
    setDreams(savedDreams)
  }

  const saveDreams = (newDreams) => {
    const key = getStorageKey()
    localStorage.setItem(key, JSON.stringify(newDreams))
    console.log('💾 保存梦境:', key, newDreams.length, '条')
  }

  const checkDailyEvent = () => {
    const today = new Date().toDateString()
    const eventKey = `daily-event-${currentIdol?.name || 'default'}`
    const lastEvent = localStorage.getItem(`daily-event-date-${currentIdol?.name || 'default'}`)
    
    if (lastEvent !== today) {
      generateDailyEvent()
      localStorage.setItem(`daily-event-date-${currentIdol?.name || 'default'}`, today)
    } else {
      const savedEvent = JSON.parse(localStorage.getItem(eventKey) || 'null')
      setDailyEvent(savedEvent)
    }
  }

  const generateDailyEvent = async () => {
    const hour = new Date().getHours()
    let eventType, eventPrompt

    if (hour >= 5 && hour < 12) {
      eventType = 'morning'
      eventPrompt = '早间问候'
    } else if (hour >= 18 || hour < 5) {
      eventType = 'night'
      eventPrompt = '晚安祝福'
    } else {
      eventType = 'afternoon'
      eventPrompt = '午间问候'
    }

    try {
      const response = await fetch('/idol/api/daily-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          idol: currentIdol, 
          eventType,
          userName: userMemories['用户名字'] || '你'
        })
      })
      const data = await response.json()
      
      const event = {
        type: eventType,
        content: data.content || getDefaultEvent(eventType),
        timestamp: new Date().toISOString()
      }
      
      setDailyEvent(event)
      const eventKey = `daily-event-${currentIdol?.name || 'default'}`
      localStorage.setItem(eventKey, JSON.stringify(event))
    } catch (error) {
      const event = {
        type: eventType,
        content: getDefaultEvent(eventType),
        timestamp: new Date().toISOString()
      }
      setDailyEvent(event)
    }
  }

  const getDefaultEvent = (type) => {
    const defaults = {
      morning: '早上好！新的一天开始了，今天也要元气满满哦~ ☀️',
      afternoon: '下午好！记得休息一下，喝杯水~ 🌤️',
      night: '晚安，做个好梦~ 梦里见 🌙'
    }
    return defaults[type]
  }

  const generateDream = async () => {
    if (!dreamInput.trim()) return

    setGenerating(true)
    try {
      const response = await fetch('/idol/api/dream/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          idol: currentIdol, 
          userDream: dreamInput,
          userMemories
        })
      })
      const data = await response.json()
      
      const newDream = {
        id: Date.now(),
        userDream: dreamInput,
        dreamStory: data.dreamStory || '在一片星空中，我们相遇了...',
        interpretation: data.interpretation || '这个梦象征着美好的希望',
        timestamp: new Date().toISOString(),
        starred: false
      }

      setCurrentDream(newDream)
      
      // 保存到梦境本
      const updatedDreams = [newDream, ...dreams]
      setDreams(updatedDreams)
      saveDreams(updatedDreams)  // 使用新的保存函数
      
      setDreamInput('')
    } catch (error) {
      console.error('生成梦境失败:', error)
      const newDream = {
        id: Date.now(),
        userDream: dreamInput,
        dreamStory: `在${currentIdol?.name}的陪伴下，你走进了一个美丽的梦境...星星在周围闪烁，仿佛整个宇宙都在为你歌唱。`,
        interpretation: '这是一个充满希望的梦，预示着美好的未来',
        timestamp: new Date().toISOString(),
        starred: false
      }
      setCurrentDream(newDream)
      // 即使出错也保存
      const updatedDreams = [newDream, ...dreams]
      setDreams(updatedDreams)
      saveDreams(updatedDreams)
    }
    setGenerating(false)
  }

  const generateRandomDream = async () => {
    setGenerating(true)
    setDreamInput('')
    try {
      const response = await fetch('/idol/api/dream/random', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idol: currentIdol, userMemories })
      })
      const data = await response.json()
      
      const newDream = {
        id: Date.now(),
        userDream: '(随机梦境)',
        dreamStory: data.dreamStory || '今晚的星空格外美丽...',
        interpretation: data.interpretation || '让梦境带你进入奇幻世界',
        timestamp: new Date().toISOString(),
        starred: false
      }

      setCurrentDream(newDream)
      
      const updatedDreams = [newDream, ...dreams]
      setDreams(updatedDreams)
      saveDreams(updatedDreams)  // 使用新的保存函数
    } catch (error) {
      console.error('生成随机梦境失败:', error)
    }
    setGenerating(false)
  }

  const toggleStar = (dreamId) => {
    const updatedDreams = dreams.map(d => 
      d.id === dreamId ? { ...d, starred: !d.starred } : d
    )
    setDreams(updatedDreams)
    saveDreams(updatedDreams)
  }

  const deleteDream = (dreamId) => {
    const updatedDreams = dreams.filter(d => d.id !== dreamId)
    setDreams(updatedDreams)
    saveDreams(updatedDreams)
    if (currentDream?.id === dreamId) {
      setCurrentDream(null)
    }
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
  }

  return (
    <div className="dream-overlay">
      <div className="dream-container">
        {/* 头部 */}
        <header className="dream-header">
          <button className="back-btn" onClick={onClose}>◀</button>
          <h2>🌙 梦境编织者</h2>
          <div className="dream-nav">
            <button 
              className={`nav-btn ${view === 'main' ? 'active' : ''}`}
              onClick={() => setView('main')}
            >
              今夜
            </button>
            <button 
              className={`nav-btn ${view === 'journal' ? 'active' : ''}`}
              onClick={() => setView('journal')}
            >
              梦境本
            </button>
          </div>
        </header>

        {/* 今日事件卡片 */}
        {view === 'main' && dailyEvent && (
          <div className={`daily-event-card ${dailyEvent.type}`}>
            <div className="event-icon">
              {dailyEvent.type === 'morning' && '☀️'}
              {dailyEvent.type === 'afternoon' && '🌤️'}
              {dailyEvent.type === 'night' && '🌙'}
            </div>
            <div className="event-content">
              <p>{dailyEvent.content}</p>
              <span className="event-time">{formatTime(dailyEvent.timestamp)}</span>
            </div>
          </div>
        )}

        {view === 'main' && (
          <div className="dream-main">
            {/* 梦境生成区 */}
            <div className="dream-input-section">
              <h3>✨ 编织今夜的梦</h3>
              <p className="dream-hint">描述你想做的梦，{currentIdol?.name} 会为你编织一个独特的梦境故事...</p>
              
              <textarea
                className="dream-textarea"
                placeholder="例如：我想在星空下飞翔..."
                value={dreamInput}
                onChange={(e) => setDreamInput(e.target.value)}
                disabled={generating}
              />

              <div className="dream-actions">
                <button 
                  className="generate-btn"
                  onClick={generateDream}
                  disabled={generating}
                >
                  {generating ? '编织中...' : '🌙 开始编织'}
                </button>
                <button 
                  className="random-btn"
                  onClick={generateRandomDream}
                  disabled={generating}
                >
                  🎲 随机梦境
                </button>
              </div>
            </div>

            {/* 当前梦境展示 */}
            {currentDream && (
              <div className="current-dream-card">
                <div className="dream-card-header">
                  <span className="dream-date">{formatTime(currentDream.timestamp)}</span>
                  <button 
                    className={`star-btn ${currentDream.starred ? 'starred' : ''}`}
                    onClick={() => toggleStar(currentDream.id)}
                  >
                    {currentDream.starred ? '⭐' : '☆'}
                  </button>
                </div>
                
                {currentDream.userDream !== '(随机梦境)' && (
                  <div className="user-dream">
                    <span className="label">你的愿望：</span>
                    <p>{currentDream.userDream}</p>
                  </div>
                )}

                <div className="dream-story">
                  <span className="label">📖 梦境故事：</span>
                  <p>{currentDream.dreamStory}</p>
                </div>

                <div className="dream-interpretation">
                  <span className="label">🔮 解梦：</span>
                  <p>{currentDream.interpretation}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 梦境本 */}
        {view === 'journal' && (
          <div className="dream-journal">
            <h3>📔 我的梦境本</h3>
            
            {dreams.length === 0 ? (
              <div className="empty-journal">
                <span className="empty-icon">🌙</span>
                <p>还没有记录的梦境</p>
                <p className="empty-hint">今夜开始编织你的第一个梦吧</p>
              </div>
            ) : (
              <div className="dreams-list">
                {dreams.map(dream => (
                  <div 
                    key={dream.id} 
                    className={`dream-item ${dream.starred ? 'starred' : ''}`}
                    onClick={() => setCurrentDream(dream)}
                  >
                    <div className="dream-item-header">
                      <span className="dream-date">{formatTime(dream.timestamp)}</span>
                      <div className="dream-item-actions">
                        <button 
                          className="star-btn"
                          onClick={(e) => { e.stopPropagation(); toggleStar(dream.id); }}
                        >
                          {dream.starred ? '⭐' : '☆'}
                        </button>
                        <button 
                          className="delete-btn"
                          onClick={(e) => { e.stopPropagation(); deleteDream(dream.id); }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <p className="dream-preview">
                      {dream.dreamStory.slice(0, 60)}...
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 选中梦境详情 */}
        {view === 'journal' && currentDream && (
          <div className="dream-detail-overlay" onClick={() => setCurrentDream(null)}>
            <div className="dream-detail-card" onClick={e => e.stopPropagation()}>
              <button className="close-detail" onClick={() => setCurrentDream(null)}>✕</button>
              
              <div className="dream-detail-content">
                <span className="dream-date">{formatTime(currentDream.timestamp)}</span>
                
                {currentDream.userDream !== '(随机梦境)' && (
                  <div className="user-dream">
                    <span className="label">你的愿望：</span>
                    <p>{currentDream.userDream}</p>
                  </div>
                )}

                <div className="dream-story">
                  <span className="label">📖 梦境故事：</span>
                  <p>{currentDream.dreamStory}</p>
                </div>

                <div className="dream-interpretation">
                  <span className="label">🔮 解梦：</span>
                  <p>{currentDream.interpretation}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DreamWeaver
