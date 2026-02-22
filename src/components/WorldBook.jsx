import { useState, useEffect } from 'react'
import { useStore } from '../store'
import './WorldBook.css'

function WorldBook({ onClose }) {
  const { currentIdol } = useStore()
  const [activeTab, setActiveTab] = useState('moments')
  const [moments, setMoments] = useState([])
  const [stories, setStories] = useState([])
  const [settings, setSettings] = useState({})
  const [newMoment, setNewMoment] = useState('')
  const [newStory, setNewStory] = useState({ title: '', content: '' })
  const [newSetting, setNewSetting] = useState({ key: '', value: '' })

  // 加载数据
  useEffect(() => {
    if (currentIdol) {
      const storageKey = `worldbook_${currentIdol.id}`
      const data = JSON.parse(localStorage.getItem(storageKey) || '{}')
      setMoments(data.moments || [])
      setStories(data.stories || [])
      setSettings(data.settings || {})
    }
  }, [currentIdol])

  // 保存数据
  const saveData = (key, value) => {
    if (!currentIdol) return
    const storageKey = `worldbook_${currentIdol.id}`
    const data = JSON.parse(localStorage.getItem(storageKey) || '{}')
    data[key] = value
    localStorage.setItem(storageKey, JSON.stringify(data))
  }

  // 添加动态
  const addMoment = () => {
    if (!newMoment.trim()) return
    const moment = {
      id: Date.now(),
      content: newMoment,
      timestamp: new Date().toISOString(),
      likes: 0,
      comments: []
    }
    const updated = [moment, ...moments]
    setMoments(updated)
    saveData('moments', updated)
    setNewMoment('')
  }

  // 点赞
  const likeMoment = (id) => {
    const updated = moments.map(m => 
      m.id === id ? { ...m, likes: m.likes + 1 } : m
    )
    setMoments(updated)
    saveData('moments', updated)
  }

  // 添加故事
  const addStory = () => {
    if (!newStory.title.trim() || !newStory.content.trim()) return
    const story = {
      id: Date.now(),
      title: newStory.title,
      content: newStory.content,
      timestamp: new Date().toISOString()
    }
    const updated = [...stories, story]
    setStories(updated)
    saveData('stories', updated)
    setNewStory({ title: '', content: '' })
  }

  // 添加设定
  const addSetting = () => {
    if (!newSetting.key.trim() || !newSetting.value.trim()) return
    const updated = { ...settings, [newSetting.key]: newSetting.value }
    setSettings(updated)
    saveData('settings', updated)
    setNewSetting({ key: '', value: '' })
  }

  // 删除设定
  const deleteSetting = (key) => {
    const updated = { ...settings }
    delete updated[key]
    setSettings(updated)
    saveData('settings', updated)
  }

  // 格式化时间
  const formatTime = (iso) => {
    const d = new Date(iso)
    return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  if (!currentIdol) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>🌍 世界书</h2>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>
          <div className="empty-state">请先选择一个 Idol</div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content worldbook-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🌍 {currentIdol.name} 的世界书</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* 标签页 */}
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'moments' ? 'active' : ''}`}
            onClick={() => setActiveTab('moments')}
          >
            📱 动态
          </button>
          <button 
            className={`tab ${activeTab === 'stories' ? 'active' : ''}`}
            onClick={() => setActiveTab('stories')}
          >
            📖 故事
          </button>
          <button 
            className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            ⚙️ 设定
          </button>
        </div>

        <div className="tab-content">
          {/* 动态 */}
          {activeTab === 'moments' && (
            <div className="moments-panel">
              <div className="add-moment">
                <textarea
                  placeholder="记录一条动态..."
                  value={newMoment}
                  onChange={(e) => setNewMoment(e.target.value)}
                />
                <button onClick={addMoment}>发布</button>
              </div>
              
              <div className="moments-list">
                {moments.length === 0 ? (
                  <div className="empty-hint">还没有动态，记录第一条吧！</div>
                ) : (
                  moments.map(m => (
                    <div key={m.id} className="moment-card">
                      <div className="moment-header">
                        <span className="moment-avatar">{currentIdol.avatar}</span>
                        <span className="moment-name">{currentIdol.name}</span>
                        <span className="moment-time">{formatTime(m.timestamp)}</span>
                      </div>
                      <div className="moment-content">{m.content}</div>
                      <div className="moment-actions">
                        <button onClick={() => likeMoment(m.id)}>
                          ❤️ {m.likes}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 故事 */}
          {activeTab === 'stories' && (
            <div className="stories-panel">
              <div className="add-story">
                <input
                  placeholder="故事标题..."
                  value={newStory.title}
                  onChange={(e) => setNewStory({ ...newStory, title: e.target.value })}
                />
                <textarea
                  placeholder="记录你们的故事..."
                  value={newStory.content}
                  onChange={(e) => setNewStory({ ...newStory, content: e.target.value })}
                />
                <button onClick={addStory}>保存故事</button>
              </div>

              <div className="stories-list">
                {stories.length === 0 ? (
                  <div className="empty-hint">还没有故事，记录第一个吧！</div>
                ) : (
                  stories.map((s, idx) => (
                    <div key={s.id} className="story-card">
                      <div className="story-chapter">第 {idx + 1} 章</div>
                      <h4 className="story-title">{s.title}</h4>
                      <p className="story-content">{s.content}</p>
                      <div className="story-time">{formatTime(s.timestamp)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 设定 */}
          {activeTab === 'settings' && (
            <div className="settings-panel">
              <div className="add-setting">
                <input
                  placeholder="设定项（如：时代背景）"
                  value={newSetting.key}
                  onChange={(e) => setNewSetting({ ...newSetting, key: e.target.value })}
                />
                <textarea
                  placeholder="设定内容..."
                  value={newSetting.value}
                  onChange={(e) => setNewSetting({ ...newSetting, value: e.target.value })}
                />
                <button onClick={addSetting}>添加设定</button>
              </div>

              <div className="settings-list">
                {Object.keys(settings).length === 0 ? (
                  <div className="empty-hint">还没有世界观设定</div>
                ) : (
                  Object.entries(settings).map(([key, value]) => (
                    <div key={key} className="setting-item">
                      <div className="setting-key">{key}</div>
                      <div className="setting-value">{value}</div>
                      <button 
                        className="delete-btn"
                        onClick={() => deleteSetting(key)}
                      >
                        🗑️
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default WorldBook
