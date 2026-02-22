import './AvatarView.css'

function AvatarView({ idol, isLoading }) {
  return (
    <div className="avatar-view">
      <div className={`avatar-container ${isLoading ? 'thinking' : ''}`}>
        <div className="avatar-bg" style={{ 
          background: `radial-gradient(circle, ${idol?.color || '#E94560'}40 0%, transparent 70%)` 
        }} />
        
        <div className="avatar-emoji">
          {idol?.avatar || '🎭'}
        </div>
        
        <div className="avatar-glow" style={{
          background: idol?.color || '#E94560'
        }} />
        
        {isLoading && (
          <div className="thinking-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}
      </div>
      
      <div className="avatar-name">{idol?.name}</div>
      
      {isLoading && (
        <div className="avatar-status">正在思考中...</div>
      )}
    </div>
  )
}

export default AvatarView
