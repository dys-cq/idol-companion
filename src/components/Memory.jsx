import { useState, useEffect } from 'react'
import { useStore } from '../store'
import './Memory.css'

function Memory({ onClose }) {
  const { currentIdol } = useStore()
  const [allMemories, setAllMemories] = useState({})
  const [selectedIdol, setSelectedIdol] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  // 加载所有 Idol 的记忆
  useEffect(() => {
    // 从 localStorage 加载所有会话
    const storage = localStorage.getItem('idol-companion-storage')
    if (storage) {
      try {
        const data = JSON.parse(storage)
        // 获取自定义 idols 列表
        const customIdols = JSON.parse(localStorage.getItem('custom-idols') || '[]')
        
        const memories = {}
        
        // 当前 Idol 的消息
        if (data.state?.currentIdol && data.state?.messages) {
          memories[data.state.currentIdol.id] = {
            idol: data.state.currentIdol,
            messages: data.state.messages || []
          }
        }
        
        // 自定义 idols（如果有存储的历史）
        customIdols.forEach(idol => {
          if (!memories[idol.id]) {
            memories[idol.id] = {
              idol: idol,
              messages: []
            }
          }
        })
        
        setAllMemories(memories)
        if (currentIdol && !selectedIdol) {
          setSelectedIdol(currentIdol.id)
        }
      } catch (e) {
        console.error('加载记忆失败', e)
      }
    }
  }, [currentIdol])

  // 获取选中 Idol 的消息
  const getSelectedMessages = () => {
    if (!selectedIdol || !allMemories[selectedIdol]) return []
    let msgs = allMemories[selectedIdol].messages || []
    
    // 搜索过滤
    if (searchQuery.trim()) {
      msgs = msgs.filter(m => 
        m.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    return msgs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  }

  // 格式化时间
  const formatTime = (iso) => {
    const d = new Date(iso)
    return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  // 格式化日期分组
  const formatDateGroup = (iso) => {
    const d = new Date(iso)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    const isYesterday = new Date(now - 86400000).toDateString() === d.toDateString()
    
    if (isToday) return '今天'
    if (isYesterday) return '昨天'
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }

  // 按日期分组
  const groupedMessages = () => {
    const messages = getSelectedMessages()
    const groups = {}
    
    messages.forEach(m => {
      const date = formatDateGroup(m.timestamp)
      if (!groups[date]) groups[date] = []
      groups[date].push(m)
    })
    
    return groups
  }

  const idolList = Object.values(allMemories)
  const messages = getSelectedMessages()
  const groups = groupedMessages()

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content memory-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🧠 记忆</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="memory-content">
          {/* Idol 选择器 */}
          {idolList.length > 1 && (
            <div className="idol-selector">
              {idolList.map(item => (
                <button
                  key={item.idol.id}
                  className={`idol-btn ${selectedIdol === item.idol.id ? 'active' : ''}`}
                  onClick={() => setSelectedIdol(item.idol.id)}
                >
                  {item.idol.avatar} {item.idol.name}
                </button>
              ))}
            </div>
          )}

          {/* 搜索 */}
          <div className="search-box">
            <input
              type="text"
              placeholder="🔍 搜索对话内容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* 消息列表 */}
          {idolList.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💭</div>
              <p>还没有任何对话记录</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <p>没有找到相关内容</p>
            </div>
          ) : (
            <div className="messages-timeline">
              {Object.entries(groups).map(([date, msgs]) => (
                <div key={date} className="date-group">
                  <div className="date-label">{date}</div>
                  {msgs.map(m => (
                    <div key={m.id} className={`memory-item ${m.role}`}>
                      <div className="item-role">
                        {m.role === 'user' ? '👤 我' : `${allMemories[selectedIdol]?.idol.avatar || '🎭'}`}
                      </div>
                      <div className="item-content">{m.content}</div>
                      <div className="item-time">{formatTime(m.timestamp)}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Memory
