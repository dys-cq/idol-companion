import { useState, useEffect } from 'react'
import { useStore } from '../store'
import './Anniversary.css'

function Anniversary({ onClose }) {
  const { currentIdol } = useStore()
  const [anniversaries, setAnniversaries] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [newAnniversary, setNewAnniversary] = useState({
    name: '',
    date: '',
    type: 'birthday',
    remind: true
  })

  // 加载数据
  useEffect(() => {
    if (currentIdol) {
      const storageKey = `anniversaries_${currentIdol.id}`
      const data = JSON.parse(localStorage.getItem(storageKey) || '[]')
      setAnniversaries(data)
    }
  }, [currentIdol])

  // 保存数据
  const saveAnniversaries = (data) => {
    if (!currentIdol) return
    const storageKey = `anniversaries_${currentIdol.id}`
    localStorage.setItem(storageKey, JSON.stringify(data))
    setAnniversaries(data)
  }

  // 添加纪念日
  const addAnniversary = () => {
    if (!newAnniversary.name.trim() || !newAnniversary.date) return
    const anniversary = {
      id: Date.now(),
      ...newAnniversary,
      createdAt: new Date().toISOString()
    }
    saveAnniversaries([...anniversaries, anniversary])
    setNewAnniversary({ name: '', date: '', type: 'birthday', remind: true })
    setShowAdd(false)
  }

  // 删除纪念日
  const deleteAnniversary = (id) => {
    saveAnniversaries(anniversaries.filter(a => a.id !== id))
  }

  // 计算距离天数
  const getDaysUntil = (dateStr) => {
    const today = new Date()
    const target = new Date(dateStr)
    target.setFullYear(today.getFullYear())
    
    // 如果今年的日期已过，计算明年的
    if (target < today) {
      target.setFullYear(today.getFullYear() + 1)
    }
    
    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24))
    return diff
  }

  // 格式化日期
  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }

  // 类型标签
  const typeLabels = {
    birthday: '🎂 生日',
    founding: '🎉 诞辰',
    fansDay: '💜 粉丝日',
    special: '⭐ 特殊日子',
    other: '📅 其他'
  }

  // 排序：按距离天数
  const sortedAnniversaries = [...anniversaries].sort((a, b) => 
    getDaysUntil(a.date) - getDaysUntil(b.date)
  )

  if (!currentIdol) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>❤️ 纪念日</h2>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>
          <div className="empty-state">请先选择一个 Idol</div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content anniversary-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>❤️ 与 {currentIdol.name} 的纪念日</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="anniversary-content">
          {/* 即将到来的纪念日 */}
          {anniversaries.length > 0 && (
            <div className="upcoming-section">
              <h3>📅 即将到来</h3>
              {sortedAnniversaries.slice(0, 3).map(a => {
                const days = getDaysUntil(a.date)
                return (
                  <div key={a.id} className={`upcoming-card ${days <= 7 ? 'soon' : ''}`}>
                    <div className="upcoming-type">{typeLabels[a.type]}</div>
                    <div className="upcoming-name">{a.name}</div>
                    <div className="upcoming-date">{formatDate(a.date)}</div>
                    <div className="upcoming-countdown">
                      {days === 0 ? '🎉 今天！' : `还有 ${days} 天`}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* 添加按钮 */}
          <button 
            className="add-anniversary-btn"
            onClick={() => setShowAdd(!showAdd)}
          >
            {showAdd ? '取消' : '➕ 添加纪念日'}
          </button>

          {/* 添加表单 */}
          {showAdd && (
            <div className="add-form">
              <input
                type="text"
                placeholder="纪念日名称"
                value={newAnniversary.name}
                onChange={(e) => setNewAnniversary({ ...newAnniversary, name: e.target.value })}
              />
              <input
                type="date"
                value={newAnniversary.date}
                onChange={(e) => setNewAnniversary({ ...newAnniversary, date: e.target.value })}
              />
              <select
                value={newAnniversary.type}
                onChange={(e) => setNewAnniversary({ ...newAnniversary, type: e.target.value })}
              >
                <option value="birthday">🎂 生日</option>
                <option value="founding">🎉 诞辰</option>
                <option value="fansDay">💜 粉丝日</option>
                <option value="special">⭐ 特殊日子</option>
                <option value="other">📅 其他</option>
              </select>
              <label className="remind-check">
                <input
                  type="checkbox"
                  checked={newAnniversary.remind}
                  onChange={(e) => setNewAnniversary({ ...newAnniversary, remind: e.target.checked })}
                />
                <span>开启提醒</span>
              </label>
              <button className="save-btn" onClick={addAnniversary}>保存</button>
            </div>
          )}

          {/* 所有纪念日列表 */}
          <div className="anniversary-list">
            <h3>📋 所有纪念日</h3>
            {anniversaries.length === 0 ? (
              <div className="empty-hint">还没有添加纪念日</div>
            ) : (
              sortedAnniversaries.map(a => (
                <div key={a.id} className="anniversary-item">
                  <div className="item-left">
                    <span className="item-type">{typeLabels[a.type]}</span>
                    <span className="item-name">{a.name}</span>
                  </div>
                  <div className="item-right">
                    <span className="item-date">{formatDate(a.date)}</span>
                    <span className="item-countdown">{getDaysUntil(a.date)}天</span>
                    <button 
                      className="delete-btn"
                      onClick={() => deleteAnniversary(a.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Anniversary
