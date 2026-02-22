import { useState, useEffect } from 'react'
import { useStore, idolTemplates } from '../store'
import CreateIdol from './CreateIdol'
import './IdolSelector.css'

function IdolSelector({ onClose }) {
  const { currentIdol, setCurrentIdol } = useStore()
  const [selectedId, setSelectedId] = useState(currentIdol?.id)
  const [customIdols, setCustomIdols] = useState([])
  const [showCreateIdol, setShowCreateIdol] = useState(false)

  // 加载自定义偶像
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('custom-idols') || '[]')
    setCustomIdols(saved)
  }, [])

  const handleSelect = (idol) => {
    setSelectedId(idol.id)
    setCurrentIdol(idol)
    setTimeout(onClose, 300)
  }

  const allIdols = [...idolTemplates, ...customIdols]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>选择你的偶像</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="idol-grid">
          {allIdols.length > 0 ? (
            allIdols.map(idol => (
              <div
                key={idol.id}
                className={`idol-card ${selectedId === idol.id ? 'selected' : ''}`}
                onClick={() => handleSelect(idol)}
                style={{ '--idol-color': idol.color }}
              >
                <div className="idol-card-avatar">
                  {idol.avatarImg ? (
                    <img src={idol.avatarImg} alt={idol.name} className="selector-avatar-img" />
                  ) : (
                    idol.avatar
                  )}
                </div>
                <div className="idol-card-name">{idol.name}</div>
                <div className="idol-card-occupation">{idol.occupation}</div>
                <div className="idol-card-personality">{idol.personality}</div>
                {selectedId === idol.id && (
                  <div className="selected-badge">✓</div>
                )}
              </div>
            ))
          ) : (
            <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)'}}>
              还没有任何偶像，点击下方按钮创建一个吧！
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button 
            className="create-idol-btn"
            onClick={() => setShowCreateIdol(true)}
          >
            ✨ 创建自定义偶像
          </button>
          <p className="hint">点击选择你想陪伴的偶像</p>
        </div>
      </div>

      {showCreateIdol && (
        <CreateIdol onClose={() => setShowCreateIdol(false)} />
      )}
    </div>
  )
}

export default IdolSelector
