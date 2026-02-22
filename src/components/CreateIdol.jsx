import { useState, useRef } from 'react'
import { useStore } from '../store'
import './CreateIdol.css'

function CreateIdol({ onClose }) {
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState(1) // 1: 输入名字, 2: 生成中, 3: 预览
  const [generatedIdol, setGeneratedIdol] = useState(null)
  
  // 图片上传相关的状态
  const fileInputRef = useRef(null)
  const [avatarImg, setAvatarImg] = useState(null)

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setAvatarImg(event.target.result)
        // 同步更新 generatedIdol
        if (generatedIdol) {
          setGeneratedIdol({ ...generatedIdol, avatarImg: event.target.result })
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const { setCurrentIdol } = useStore()

  // 生成 Idol 人设 - 调用后端搜索+AI生成
  const generateIdolPersona = async (idolName) => {
    try {
      const response = await fetch('/idol/api/generate-idol', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: idolName })
      })

      const data = await response.json()
      
      if (data.success && data.idol) {
        return data.idol
      }
      
      throw new Error(data.error || '生成失败')
    } catch (error) {
      console.error('生成人设失败:', error)
      alert('生成失败，请重试：' + error.message)
      throw error;
    }
  }

  const handleSubmit = async () => {
    if (!name.trim()) return
    
    setIsLoading(true)
    setStep(2)
    
    try {
      const idol = await generateIdolPersona(name.trim())
      setGeneratedIdol(idol)
      setStep(3)
    } catch (err) {
      setStep(1)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirm = () => {
    if (generatedIdol) {
      // 保存到本地存储
      const customIdols = JSON.parse(localStorage.getItem('custom-idols') || '[]')
      customIdols.push(generatedIdol)
      localStorage.setItem('custom-idols', JSON.stringify(customIdols))
      
      // 设为当前 idol
      setCurrentIdol(generatedIdol)
      onClose()
    }
  }

  const handleRegenerate = async () => {
    setStep(2)
    setIsLoading(true)
    try {
      const idol = await generateIdolPersona(name.trim())
      setGeneratedIdol(idol)
      setStep(3)
    } catch (err) {
      setStep(1)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content create-idol-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>✨ 创建你的偶像</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="create-idol-content">
          {step === 1 && (
            <div className="step-input">
              <p className="hint-text">输入人物名字，AI将联网搜索真实资料并生成人设</p>
              <input
                type="text"
                className="name-input"
                placeholder="输入名字（如：钱学森、李白、小雪）..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                autoFocus
              />
              <button 
                className="generate-btn"
                onClick={handleSubmit}
                disabled={!name.trim()}
              >
                🔍 搜索并生成人设
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="step-loading">
              <div className="loading-spinner"></div>
              <p>🔍 正在搜索 "{name}" 的相关信息...</p>
              <p className="sub-hint">AI将根据真实资料生成人设</p>
            </div>
          )}

          {step === 3 && generatedIdol && (
            <div className="step-preview">
              <div className="preview-card">
                
                <div 
                  className="preview-avatar uploadable" 
                  style={{ 
                    background: avatarImg ? 'transparent' : generatedIdol.color + '30' 
                  }}
                  onClick={() => fileInputRef.current.click()}
                  title="点击上传自定义头像"
                >
                  {avatarImg ? (
                    <img src={avatarImg} alt="avatar" className="custom-avatar-img" />
                  ) : (
                    generatedIdol.avatar
                  )}
                  <div className="upload-hint">上传头像</div>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                />

                <h3 className="preview-name">{generatedIdol.name}</h3>
                <p className="preview-occupation">
                  {generatedIdol.gender !== '保密' && <span>{generatedIdol.gender} · </span>}
                  {generatedIdol.occupation}
                  {generatedIdol.type === 'historical' && generatedIdol.era && (
                    <span className="era"> · {generatedIdol.era}</span>
                  )}
                </p>
                
                <div className="preview-details">
                  {generatedIdol.type === 'historical' && generatedIdol.achievements && (
                    <div className="detail-item highlight">
                      <span className="label">成就</span>
                      <span className="value">{generatedIdol.achievements}</span>
                    </div>
                  )}
                  <div className="detail-item">
                    <span className="label">性格</span>
                    <span className="value">{generatedIdol.personality}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">风格</span>
                    <span className="value">{generatedIdol.speakingStyle}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">爱好</span>
                    <span className="value">{generatedIdol.hobbies}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">背景</span>
                    <span className="value">{generatedIdol.background}</span>
                  </div>
                </div>

                <div className="preview-greeting">
                  <span className="quote">"</span>
                  {generatedIdol.greeting}
                  <span className="quote">"</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部固定按钮区 */}
        {step === 3 && generatedIdol && (
          <div className="preview-actions fixed-actions">
            <button className="regenerate-btn" onClick={handleRegenerate}>
              🔄 重新生成
            </button>
            <button className="confirm-btn" onClick={handleConfirm}>
              ✓ 确认创建
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default CreateIdol
