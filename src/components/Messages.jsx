import { useState, useEffect } from 'react'
import { useStore } from '../store'
import './Messages.css'

function Messages({ onClose }) {
  const { currentIdol } = useStore()
  const [messages, setMessages] = useState([])
  const [selectedMessage, setSelectedMessage] = useState(null)

  // 加载数据
  useEffect(() => {
    if (currentIdol) {
      const storageKey = `sms_${currentIdol.id}`
      const data = JSON.parse(localStorage.getItem(storageKey) || '[]')
      setMessages(data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)))
    }
  }, [currentIdol])

  // 格式化时间
  const formatTime = (iso) => {
    const d = new Date(iso)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    
    if (isToday) {
      return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
    }
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }

  // 格式化完整时间
  const formatFullTime = (iso) => {
    const d = new Date(iso)
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  // 生成模拟短信（如果还没有）
  const generateInitialMessages = () => {
    if (!currentIdol || messages.length > 0) return
    
    const initialMessages = [
      {
        id: Date.now() - 86400000,
        from: currentIdol.name,
        avatar: currentIdol.avatar,
        content: `嗨！我是${currentIdol.name}，很高兴认识你！有什么想聊的吗？`,
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        read: false
      }
    ]
    
    const storageKey = `sms_${currentIdol.id}`
    localStorage.setItem(storageKey, JSON.stringify(initialMessages))
    setMessages(initialMessages)
  }

  // 标记已读
  const markAsRead = (id) => {
    const updated = messages.map(m => 
      m.id === id ? { ...m, read: true } : m
    )
    setMessages(updated)
    const storageKey = `sms_${currentIdol.id}`
    localStorage.setItem(storageKey, JSON.stringify(updated))
  }

  // 未读数量
  const unreadCount = messages.filter(m => !m.read).length

  useEffect(() => {
    generateInitialMessages()
  }, [currentIdol])

  if (!currentIdol) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>📩 短信</h2>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>
          <div className="empty-state">请先选择一个 Idol</div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content messages-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📩 {currentIdol.name} 的私信</h2>
          {unreadCount > 0 && (
            <span className="unread-badge">{unreadCount} 条未读</span>
          )}
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="messages-content">
          {selectedMessage ? (
            // 短信详情
            <div className="message-detail">
              <button 
                className="back-btn"
                onClick={() => {
                  markAsRead(selectedMessage.id)
                  setSelectedMessage(null)
                }}
              >
                ← 返回
              </button>
              
              <div className="detail-header">
                <span className="detail-avatar">{currentIdol.avatar}</span>
                <div className="detail-info">
                  <span className="detail-name">{currentIdol.name}</span>
                  <span className="detail-time">{formatFullTime(selectedMessage.timestamp)}</span>
                </div>
              </div>
              
              <div className="detail-content">
                {selectedMessage.content}
              </div>
            </div>
          ) : (
            // 短信列表
            <div className="messages-list">
              {messages.length === 0 ? (
                <div className="empty-hint">
                  <div className="empty-icon">📭</div>
                  <p>还没有收到私信</p>
                </div>
              ) : (
                messages.map(m => (
                  <div 
                    key={m.id} 
                    className={`message-item ${!m.read ? 'unread' : ''}`}
                    onClick={() => setSelectedMessage(m)}
                  >
                    <div className="item-avatar">
                      {currentIdol.avatar}
                      {!m.read && <span className="unread-dot"></span>}
                    </div>
                    <div className="item-content">
                      <div className="item-header">
                        <span className="item-name">{currentIdol.name}</span>
                        <span className="item-time">{formatTime(m.timestamp)}</span>
                      </div>
                      <div className="item-preview">
                        {m.content.slice(0, 50)}...
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Messages
