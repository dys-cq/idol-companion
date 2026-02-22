import React, { useState, useEffect } from 'react'
import { useStore } from '../store'
import WorldBook from './WorldBook'
import Anniversary from './Anniversary'
import Messages from './Messages'
import Memory from './Memory'
import Forum from './Forum'
import IdolMoments from './IdolMoments'
import DreamWeaver from './DreamWeaver'
import './Home.css'

function Home({ onNavigate }) {
  const { currentIdol, messages } = useStore()
  const [time, setTime] = useState(new Date())
  const [showWorldBook, setShowWorldBook] = useState(false)
  const [showAnniversary, setShowAnniversary] = useState(false)
  const [showMessages, setShowMessages] = useState(false)
  const [showMemory, setShowMemory] = useState(false)
  const [showForum, setShowForum] = useState(false)
  const [showMoments, setShowMoments] = useState(false)
  const [showDream, setShowDream] = useState(false)

  // 更新时间
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (date) => {
    const h = date.getHours().toString().padStart(2, '0')
    const m = date.getMinutes().toString().padStart(2, '0')
    return `${h}:${m}`
  }

  const formatDate = (date) => {
    const m = date.getMonth() + 1
    const d = date.getDate()
    const days = ['日', '一', '二', '三', '四', '五', '六']
    const day = days[date.getDay()]
    return `${m}月${d}日星期${day}`
  }

  const bgStyle = currentIdol?.color ? {
    background: `linear-gradient(135deg, ${currentIdol.color}20, #E0F2FE)`
  } : {}

  return (
    <>
      <div className="home-screen" style={bgStyle}>
        {/* 顶部状态栏和��知胶囊 */}
        <div className="home-top">
          <div className="status-capsule">
            <span>当前模式：{currentIdol ? `已连接 ${currentIdol.name}` : '未连接 Idol'}</span>
          </div>
          <div className="date-display">{formatDate(time)}</div>
          <div className="time-display">{formatTime(time)}</div>
        </div>

        {/* 桌面主要网格区域 */}
        <div className="desktop-grid">
          {/* 左侧大头像卡片 */}
          <div 
            className="widget-card avatar-widget" 
            onClick={() => onNavigate('selector')}
          >
            {currentIdol?.avatarImg ? (
              <img src={currentIdol.avatarImg} alt="avatar" className="widget-avatar-img" />
            ) : (
               <div className="widget-emoji-avatar" style={{backgroundColor: currentIdol?.color || '#a2d2ff'}}>
                  {currentIdol?.avatar || '✨'}
               </div>
            )}
            <div className="avatar-edit-hint">点击切换/编辑 Idol</div>
          </div>

          {/* 右侧应用图标 */}
          <div className="app-icons-grid">
            <div className="app-icon-wrapper" onClick={() => onNavigate('chat')}>
              <div className="app-icon bg-light-blue">
                <span>💬</span>
              </div>
              <span className="app-name">Chat</span>
            </div>

            <div className="app-icon-wrapper" onClick={() => setShowWorldBook(true)}>
              <div className="app-icon bg-light-blue">
                <span>🌍</span>
              </div>
              <span className="app-name">世界书</span>
            </div>

            <div className="app-icon-wrapper" onClick={() => setShowAnniversary(true)}>
              <div className="app-icon bg-light-blue">
                <span>❤️</span>
              </div>
              <span className="app-name">纪念日</span>
            </div>

            <div className="app-icon-wrapper" onClick={() => setShowForum(true)}>
              <div className="app-icon bg-light-blue">
                <span>🗣️</span>
              </div>
              <span className="app-name">论坛</span>
            </div>

            <div className="app-icon-wrapper" onClick={() => setShowMoments(true)}>
              <div className="app-icon bg-light-blue">
                <span>🎭</span>
              </div>
              <span className="app-name">朋友圈</span>
            </div>

            <div className="app-icon-wrapper" onClick={() => setShowDream(true)}>
              <div className="app-icon bg-light-blue">
                <span>🌙</span>
              </div>
              <span className="app-name">梦境</span>
            </div>
          </div>

          {/* 右下角卡片：最近一条消息 */}
          <div className="widget-card info-widget" onClick={() => onNavigate('chat')}>
             <div className="widget-header">
                <span className="widget-icon">❤️</span>
                <span className="widget-title">最近记录</span>
             </div>
             <div className="widget-body">
                {messages.length > 0 ? (
                   <p className="latest-msg">{messages[messages.length - 1].content.slice(0, 30)}...</p>
                ) : (
                   <p className="empty-msg">暂无聊天记录</p>
                )}
             </div>
          </div>
        </div>

        {/* 底部 Dock 栏 */}
        <div className="home-dock">
          <div className="dock-icon-wrapper" onClick={() => setShowMessages(true)}>
            <div className="dock-icon">
              <span>📩</span>
            </div>
            <span className="dock-name">短信</span>
          </div>

          <div className="dock-icon-wrapper" onClick={() => onNavigate('settings')}>
            <div className="dock-icon">
              <span>⚙️</span>
            </div>
            <span className="dock-name">设置</span>
          </div>

          <div className="dock-icon-wrapper" onClick={() => setShowMemory(true)}>
            <div className="dock-icon">
              <span>🧠</span>
            </div>
            <span className="dock-name">记忆</span>
          </div>
        </div>
      </div>

      {/* 弹窗组件 */}
      {showWorldBook && <WorldBook onClose={() => setShowWorldBook(false)} />}
      {showAnniversary && <Anniversary onClose={() => setShowAnniversary(false)} />}
      {showMessages && <Messages onClose={() => setShowMessages(false)} />}
      {showMemory && <Memory onClose={() => setShowMemory(false)} />}
      {showForum && <Forum onClose={() => setShowForum(false)} />}
      {showMoments && <IdolMoments onClose={() => setShowMoments(false)} />}
      {showDream && <DreamWeaver onClose={() => setShowDream(false)} />}
    </>
  )
}

export default Home
