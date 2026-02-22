import { useState, useEffect } from 'react'
import { useStore, idolTemplates } from '../store'
import CreateIdol from './CreateIdol'
import './Settings.css'

function Settings({ onClose }) {
  const { settings, updateSettings, userMemories, clearMessages, currentIdol, setCurrentIdol } = useStore()
  const [showCreateIdol, setShowCreateIdol] = useState(false)
  const [customIdols, setCustomIdols] = useState([])

  // 加载自定义偶像
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('custom-idols') || '[]')
    setCustomIdols(saved)
  }, [])

  const handleClearData = () => {
    if (confirm('确定要清除所有聊天记录吗？')) {
      clearMessages()
      localStorage.clear()
      window.location.reload()
    }
  }

  // 切换偶像
  const handleSwitchIdol = (idol) => {
    setCurrentIdol(idol)
  }

  // 删除偶像
  const handleDeleteIdol = (idolId) => {
    if (!confirm('确定要删除这个偶像吗？')) return
    
    const updated = customIdols.filter(idol => idol.id !== idolId)
    setCustomIdols(updated)
    localStorage.setItem('custom-idols', JSON.stringify(updated))
    
    // 如果删除的是当前偶像，切换到第一个可用的
    if (currentIdol?.id === idolId) {
      if (updated.length > 0) {
        setCurrentIdol(updated[0])
      } else {
        setCurrentIdol(null)
      }
    }
  }

  const allIdols = [...idolTemplates, ...customIdols]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content settings-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>设置</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="settings-content">
          {/* 偶像切换 */}
          <div className="settings-section">
            <h3>切换偶像</h3>
            {allIdols.length > 0 ? (
              <div className="idol-switch-list">
                {allIdols.map(idol => (
                  <div 
                    key={idol.id} 
                    className={`idol-switch-item ${currentIdol?.id === idol.id ? 'active' : ''}`}
                    onClick={() => handleSwitchIdol(idol)}
                  >
                    <div className="idol-switch-avatar">
                      {idol.avatarImg ? (
                        <img src={idol.avatarImg} alt={idol.name} />
                      ) : (
                        idol.avatar
                      )}
                    </div>
                    <div className="idol-switch-info">
                      <span className="idol-switch-name">{idol.name}</span>
                      <span className="idol-switch-occupation">{idol.occupation}</span>
                    </div>
                    {currentIdol?.id === idol.id && (
                      <span className="current-badge">当前</span>
                    )}
                    {idol.id >= 1000000000000 && (
                      <button 
                        className="delete-idol-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteIdol(idol.id)
                        }}
                        title="删除"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-idol">还没有偶像，先创建一个吧！</p>
            )}
          </div>

          {/* 偶像管理 */}
          <div className="settings-section">
            <h3>偶像管理</h3>
            <button 
              className="create-idol-btn"
              onClick={() => setShowCreateIdol(true)}
            >
              ✨ 创建自定义偶像
            </button>
          </div>

          {/* 语音设置 */}
          <div className="settings-section">
            <h3>语音功能</h3>
            
            <label className="setting-item">
              <span>启用语音识别</span>
              <input
                type="checkbox"
                checked={settings.voiceEnabled}
                onChange={(e) => updateSettings({ voiceEnabled: e.target.checked })}
              />
            </label>

            <label className="setting-item">
              <span>自动播放语音回复</span>
              <input
                type="checkbox"
                checked={settings.autoPlayVoice}
                onChange={(e) => updateSettings({ autoPlayVoice: e.target.checked })}
              />
            </label>
          </div>

          {/* 用户信息 */}
          <div className="settings-section">
            <h3>关于我</h3>
            {Object.keys(userMemories).length > 0 ? (
              <div className="memory-list">
                {Object.entries(userMemories).map(([key, value]) => (
                  <div key={key} className="memory-item">
                    <span className="memory-key">{key}</span>
                    <span className="memory-value">{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-memory">还没有记录你的信息，多聊聊吧~</p>
            )}
          </div>

          {/* 数据管理 */}
          <div className="settings-section">
            <h3>数据管理</h3>
            <button className="danger-btn" onClick={handleClearData}>
              清除所有数据
            </button>
          </div>

          {/* 关于 */}
          <div className="settings-section about">
            <p>AI伴侣 Web版 v1.0.0</p>
            <p className="copyright">© 2026 OpenClaw AI Team</p>
          </div>
        </div>
      </div>

      {showCreateIdol && (
        <CreateIdol onClose={() => setShowCreateIdol(false)} />
      )}
    </div>
  )
}

export default Settings
