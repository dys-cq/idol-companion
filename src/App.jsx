import { useState, useEffect, useRef } from 'react'
import { useStore, idolTemplates } from './store'
import { sendMessage, startVoiceRecognition, speakText } from './api'
import ChatMessage from './components/ChatMessage'
import IdolSelector from './components/IdolSelector'
import AvatarView from './components/AvatarView'
import Settings from './components/Settings'
import Home from './components/Home'
import './App.css'

function App() {
  const { 
    currentIdol, 
    messages, 
    isLoading, 
    isRecording,
    setCurrentIdol,
    clearMessages 
  } = useStore()

  const [currentView, setCurrentView] = useState('home') // 'home' | 'chat'
  const [inputText, setInputText] = useState('')
  const [showIdolSelector, setShowIdolSelector] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const recognitionRef = useRef(null)

  // 初始化时检测默认Idol
  useEffect(() => {
    if (!currentIdol) {
      // 检查是否有自定义的
      const customIdols = JSON.parse(localStorage.getItem('custom-idols') || '[]')
      if (customIdols.length > 0) {
        setCurrentIdol(customIdols[0])
      } else {
        setShowIdolSelector(true)
      }
    }
  }, [])

  // 自动滚动到底部
  useEffect(() => {
    if (currentView === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, currentView])

  // 发送消息
  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return

    const text = inputText.trim()
    setInputText('')
    await sendMessage(text)
  }

  // 键盘事件
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 语音识别
  const handleVoice = () => {
    if (isRecording) {
      recognitionRef.current?.stop()
      useStore.getState().setRecording(false)
      return
    }

    useStore.getState().setRecording(true)
    
    recognitionRef.current = startVoiceRecognition(
      (text) => {
        setInputText(text)
        useStore.getState().setRecording(false)
      },
      (error) => {
        console.error(error)
        useStore.getState().setRecording(false)
      }
    )
  }

  return (
    <div className="app-container">
      <div className="mobile-mockup">
        {currentView === 'home' ? (
          <Home 
            onNavigate={(view) => {
              if(view === 'settings') setShowSettings(true)
              else if(view === 'selector') setShowIdolSelector(true)
              else setCurrentView(view)
            }} 
          />
        ) : (
          <div className="app chat-app">
            {/* 顶部栏 */}
            <header className="header">
              <div className="header-left">
                <button 
                  className="icon-btn back-btn"
                  onClick={() => setCurrentView('home')}
                >
                  ◀
                </button>
                <div 
                  className="idol-info" 
                  onClick={() => setShowIdolSelector(true)}
                >
                  <span className="idol-avatar">
                    {currentIdol?.avatarImg ? (
                      <img src={currentIdol.avatarImg} alt="avatar" className="custom-avatar-img" />
                    ) : (
                      currentIdol?.avatar || '✨'
                    )}
                  </span>
                  <div className="idol-details">
                    <span className="idol-name">{currentIdol?.name || '创建新偶像'}</span>
                    <span className="idol-status">{currentIdol?.occupation || '点击此处开始'}</span>
                  </div>
                </div>
              </div>
              <div className="header-right">
                <button 
                  className="icon-btn"
                  onClick={() => clearMessages()}
                  title="清除聊天"
                >
                  🗑️
                </button>
                <button 
                  className="icon-btn"
                  onClick={() => setShowSettings(true)}
                  title="设置"
                >
                  ⚙️
                </button>
              </div>
            </header>

            {/* 聊天区域 */}
            <div className="chat-section full-chat">
              <div className="messages-container">
                {messages.length === 0 && (
                  <div className="chat-empty-state">
                    与 {currentIdol?.name} 的对话将在这里显示
                  </div>
                )}
                {messages.map((msg) => (
                  <ChatMessage 
                    key={msg.id} 
                    message={msg} 
                    idol={currentIdol}
                  />
                ))}
                {isLoading && (
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* 输入区域 */}
            <div className="input-section">
              <button 
                className={`voice-btn ${isRecording ? 'recording' : ''}`}
                onClick={handleVoice}
                disabled={isLoading}
              >
                {isRecording ? '🔴' : '🎤'}
              </button>
              
              <input
                ref={inputRef}
                type="text"
                className="message-input"
                placeholder="说点什么..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
              />
              
              <button 
                className="send-btn"
                onClick={handleSend}
                disabled={!inputText.trim() || isLoading}
              >
                📤
              </button>
            </div>
          </div>
        )}

        {/* Idol选择器 */}
        {showIdolSelector && (
          <IdolSelector 
            onClose={() => setShowIdolSelector(false)} 
          />
        )}

        {/* 设置面板 */}
        {showSettings && (
          <Settings 
            onClose={() => setShowSettings(false)} 
          />
        )}
      </div>
    </div>
  )
}

export default App
