import { speakText } from '../api'

function ChatMessage({ message, idol }) {
  const isUser = message.role === 'user'

  const handleSpeak = () => {
    if (!isUser) {
      speakText(message.content)
    }
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className={`message ${isUser ? 'message-user-wrapper' : 'message-assistant-wrapper'}`}>
      {!isUser && (
        <div className="message-avatar">
          {idol?.avatar || '🎭'}
        </div>
      )}
      
      <div className={`message-bubble ${isUser ? 'message-user' : 'message-assistant'}`}>
        <div className="message-content">{message.content}</div>
        <div className="message-time">{formatTime(message.timestamp)}</div>
        
        {!isUser && (
          <button 
            className="speak-btn"
            onClick={handleSpeak}
            title="朗读"
          >
            🔊
          </button>
        )}
      </div>

      {isUser && (
        <div className="message-avatar user">
          👤
        </div>
      )}
    </div>
  )
}

export default ChatMessage
