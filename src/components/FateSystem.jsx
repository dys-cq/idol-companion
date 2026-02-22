import React, { useState, useEffect } from 'react'
import { useStore } from '../store'
import './FateSystem.css'

// 成就定义
const ACHIEVEMENTS = [
  { id: 'first_chat', name: '初次相遇', desc: '与 Idol 第一次对话', icon: '👋', condition: (stats) => stats.totalChats >= 1 },
  { id: 'chat_10', name: '聊天达人', desc: '累计对话 10 次', icon: '💬', condition: (stats) => stats.totalChats >= 10 },
  { id: 'chat_50', name: '无话不谈', desc: '累计对话 50 次', icon: '🗣️', condition: (stats) => stats.totalChats >= 50 },
  { id: 'first_gift', name: '心意满满', desc: '送出第一份礼物', icon: '🎁', condition: (stats) => stats.totalGifts >= 1 },
  { id: 'gift_10', name: '慷慨之心', desc: '累计送出 10 份礼物', icon: '💝', condition: (stats) => stats.totalGifts >= 10 },
  { id: 'first_dream', name: '入梦者', desc: '编织第一个梦境', icon: '🌙', condition: (stats) => stats.totalDreams >= 1 },
  { id: 'dream_10', name: '梦境旅人', desc: '编织 10 个梦境', icon: '✨', condition: (stats) => stats.totalDreams >= 10 },
  { id: 'streak_3', name: '三日之约', desc: '连续互动 3 天', icon: '🔥', condition: (stats) => stats.streakDays >= 3 },
  { id: 'streak_7', name: '一周相伴', desc: '连续互动 7 天', icon: '🌟', condition: (stats) => stats.streakDays >= 7 },
  { id: 'streak_30', name: '月度守护', desc: '连续互动 30 天', icon: '👑', condition: (stats) => stats.streakDays >= 30 },
  { id: 'affection_50', name: '初识好感', desc: '好感度达到 50', icon: '💕', condition: (stats) => stats.affection >= 50 },
  { id: 'affection_100', name: '心意相通', desc: '好感度达到 100', icon: '❤️', condition: (stats) => stats.affection >= 100 },
  { id: 'affection_200', name: '深情厚谊', desc: '好感度达到 200', icon: '💖', condition: (stats) => stats.affection >= 200 },
  { id: 'affection_500', name: '命中注定', desc: '好感度达到 500', icon: '💗', condition: (stats) => stats.affection >= 500 },
]

// 命运阶段
const FATE_STAGES = [
  { level: 1, name: '陌生人', minAffection: 0, color: '#9CA3AF' },
  { level: 2, name: '相识', minAffection: 30, color: '#60A5FA' },
  { level: 3, name: '朋友', minAffection: 80, color: '#34D399' },
  { level: 4, name: '知己', minAffection: 150, color: '#FBBF24' },
  { level: 5, name: '灵魂伴侣', minAffection: 300, color: '#F472B6' },
  { level: 6, name: '命中注定', minAffection: 500, color: '#A78BFA' },
]

function FateSystem({ onClose }) {
  const { currentIdol } = useStore()
  const [stats, setStats] = useState({
    affection: 0,
    totalChats: 0,
    totalGifts: 0,
    totalDreams: 0,
    streakDays: 0,
    lastInteractionDate: null
  })
  const [achievements, setAchievements] = useState([])
  const [showDetail, setShowDetail] = useState(null)

  useEffect(() => {
    loadStats()
    loadAchievements()
    updateStreak()
  }, [currentIdol?.name])

  const getStorageKey = () => `fate-${currentIdol?.name || 'default'}`

  const loadStats = () => {
    const key = getStorageKey()
    const saved = JSON.parse(localStorage.getItem(key) || '{}')
    setStats(prev => ({
      ...prev,
      ...saved,
      affection: saved.affection || 0,
      totalChats: saved.totalChats || 0,
      totalGifts: saved.totalGifts || 0,
      totalDreams: saved.totalDreams || 0,
      streakDays: saved.streakDays || 0
    }))
  }

  const saveStats = (newStats) => {
    const key = getStorageKey()
    localStorage.setItem(key, JSON.stringify(newStats))
  }

  const loadAchievements = () => {
    const key = `achievements-${currentIdol?.name || 'default'}`
    const saved = JSON.parse(localStorage.getItem(key) || '[]')
    setAchievements(saved)
  }

  const saveAchievements = (newAchievements) => {
    const key = `achievements-${currentIdol?.name || 'default'}`
    localStorage.setItem(key, JSON.stringify(newAchievements))
  }

  const updateStreak = () => {
    const today = new Date().toDateString()
    const lastDate = stats.lastInteractionDate
    
    if (lastDate) {
      const last = new Date(lastDate)
      const now = new Date()
      const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24))
      
      if (diffDays > 1) {
        // 连续中断
        const newStats = { ...stats, streakDays: 1, lastInteractionDate: today }
        setStats(newStats)
        saveStats(newStats)
      }
    }
  }

  const checkAchievements = (newStats) => {
    const unlocked = [...achievements]
    let newUnlock = false

    ACHIEVEMENTS.forEach(achievement => {
      if (!unlocked.includes(achievement.id) && achievement.condition(newStats)) {
        unlocked.push(achievement.id)
        newUnlock = true
        setShowDetail(achievement)
      }
    })

    if (newUnlock) {
      saveAchievements(unlocked)
      setAchievements(unlocked)
    }
  }

  const getCurrentStage = () => {
    for (let i = FATE_STAGES.length - 1; i >= 0; i--) {
      if (stats.affection >= FATE_STAGES[i].minAffection) {
        return FATE_STAGES[i]
      }
    }
    return FATE_STAGES[0]
  }

  const getNextStage = () => {
    const current = getCurrentStage()
    const nextIndex = FATE_STAGES.findIndex(s => s.level === current.level) + 1
    return nextIndex < FATE_STAGES.length ? FATE_STAGES[nextIndex] : null
  }

  const currentStage = getCurrentStage()
  const nextStage = getNextStage()
  const progress = nextStage 
    ? ((stats.affection - currentStage.minAffection) / (nextStage.minAffection - currentStage.minAffection)) * 100
    : 100

  const unlockedCount = achievements.length
  const totalCount = ACHIEVEMENTS.length

  return (
    <div className="fate-overlay">
      <div className="fate-container">
        {/* 头部 */}
        <header className="fate-header">
          <button className="back-btn" onClick={onClose}>◀</button>
          <h2>🔮 命运交织</h2>
          <div className="achievement-count">
            {unlockedCount}/{totalCount}
          </div>
        </header>

        {/* 好感度卡片 */}
        <div className="affection-card" style={{ borderColor: currentStage.color }}>
          <div className="affection-header">
            <div className="stage-badge" style={{ background: currentStage.color }}>
              Lv.{currentStage.level}
            </div>
            <div className="stage-name" style={{ color: currentStage.color }}>
              {currentStage.name}
            </div>
          </div>

          <div className="affection-value">
            <span className="heart-icon">❤️</span>
            <span className="value">{stats.affection}</span>
            {nextStage && (
              <span className="next-hint">→ {nextStage.name}</span>
            )}
          </div>

          {nextStage && (
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ 
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, ${currentStage.color}, ${nextStage.color})`
                }}
              />
              <span className="progress-text">
                {stats.affection} / {nextStage.minAffection}
              </span>
            </div>
          )}
        </div>

        {/* 统计数据 */}
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-icon">💬</span>
            <span className="stat-value">{stats.totalChats}</span>
            <span className="stat-label">对话</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">🎁</span>
            <span className="stat-value">{stats.totalGifts}</span>
            <span className="stat-label">礼物</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">🌙</span>
            <span className="stat-value">{stats.totalDreams}</span>
            <span className="stat-label">梦境</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">🔥</span>
            <span className="stat-value">{stats.streakDays}</span>
            <span className="stat-label">连续天数</span>
          </div>
        </div>

        {/* 命运阶段 */}
        <div className="fate-stages">
          <h3>💝 关系发展</h3>
          <div className="stages-list">
            {FATE_STAGES.map((stage, index) => {
              const isUnlocked = stats.affection >= stage.minAffection
              const isCurrent = currentStage.level === stage.level
              return (
                <div 
                  key={stage.level}
                  className={`stage-item ${isUnlocked ? 'unlocked' : ''} ${isCurrent ? 'current' : ''}`}
                  style={{ '--stage-color': stage.color }}
                >
                  <div className="stage-icon">
                    {isUnlocked ? '💫' : '🔒'}
                  </div>
                  <div className="stage-info">
                    <span className="stage-title">{stage.name}</span>
                    <span className="stage-requirement">
                      {stage.minAffection} 好感度
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 成就系统 */}
        <div className="achievements-section">
          <h3>🏆 成就徽章</h3>
          <div className="achievements-grid">
            {ACHIEVEMENTS.map(achievement => {
              const isUnlocked = achievements.includes(achievement.id)
              return (
                <div 
                  key={achievement.id}
                  className={`achievement-badge ${isUnlocked ? 'unlocked' : 'locked'}`}
                  onClick={() => setShowDetail(achievement)}
                >
                  <span className="badge-icon">{isUnlocked ? achievement.icon : '❓'}</span>
                  <span className="badge-name">{isUnlocked ? achievement.name : '???'}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* 成就详情弹窗 */}
        {showDetail && (
          <div className="achievement-detail-overlay" onClick={() => setShowDetail(null)}>
            <div className="achievement-detail-card" onClick={e => e.stopPropagation()}>
              <div className="detail-icon">{showDetail.icon}</div>
              <h4>{showDetail.name}</h4>
              <p>{showDetail.desc}</p>
              <button onClick={() => setShowDetail(null)}>太棒了！</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// 导出用于其他组件调用的方法
export const updateFateStats = (idolName, type, value = 1) => {
  const key = `fate-${idolName || 'default'}`
  const stats = JSON.parse(localStorage.getItem(key) || '{}')
  const today = new Date().toDateString()
  
  // 更新统计数据
  const newStats = {
    ...stats,
    affection: (stats.affection || 0) + (type === 'chat' ? 2 : type === 'gift' ? 10 : type === 'dream' ? 5 : value),
    totalChats: (stats.totalChats || 0) + (type === 'chat' ? 1 : 0),
    totalGifts: (stats.totalGifts || 0) + (type === 'gift' ? 1 : 0),
    totalDreams: (stats.totalDreams || 0) + (type === 'dream' ? 1 : 0),
    lastInteractionDate: today
  }

  // 连续天数计算
  if (stats.lastInteractionDate !== today) {
    const lastDate = new Date(stats.lastInteractionDate)
    const now = new Date()
    const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) {
      newStats.streakDays = (stats.streakDays || 0) + 1
    } else if (diffDays > 1) {
      newStats.streakDays = 1
    }
  }

  localStorage.setItem(key, JSON.stringify(newStats))

  // 检查成就
  const achKey = `achievements-${idolName || 'default'}`
  const achievements = JSON.parse(localStorage.getItem(achKey) || '[]')
  
  ACHIEVEMENTS.forEach(achievement => {
    if (!achievements.includes(achievement.id) && achievement.condition(newStats)) {
      achievements.push(achievement.id)
    }
  })
  
  localStorage.setItem(achKey, JSON.stringify(achievements))
  
  return newStats
}

export default FateSystem
