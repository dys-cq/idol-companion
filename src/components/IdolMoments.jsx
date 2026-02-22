import React, { useState, useEffect } from 'react'
import { useStore } from '../store'
import './IdolMoments.css'

// 礼物列表
const GIFTS = [
  { id: 'flower', name: '鲜花', emoji: '🌹', price: 10, rarity: 'common' },
  { id: 'cake', name: '蛋糕', emoji: '🎂', price: 20, rarity: 'common' },
  { id: 'star', name: '星星', emoji: '⭐', price: 50, rarity: 'rare' },
  { id: 'diamond', name: '钻石', emoji: '💎', price: 100, rarity: 'epic' },
  { id: 'crown', name: '皇冠', emoji: '👑', price: 200, rarity: 'legendary' },
  { id: 'heart', name: '爱心', emoji: '❤️', price: 30, rarity: 'rare' },
  { id: 'rocket', name: '火箭', emoji: '🚀', price: 150, rarity: 'epic' },
  { id: 'rainbow', name: '彩虹', emoji: '🌈', price: 80, rarity: 'rare' },
]

function IdolMoments({ onClose }) {
  const { currentIdol, userMemories, saveMemory } = useStore()
  const [moments, setMoments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showGiftPanel, setShowGiftPanel] = useState(false)
  const [selectedMoment, setSelectedMoment] = useState(null)
  const [userCoins, setUserCoins] = useState(() => {
    return parseInt(localStorage.getItem('user-coins') || '500')
  })
  const [newComment, setNewComment] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    loadMoments()
  }, [currentIdol])

  const loadMoments = async () => {
    setLoading(true)
    try {
      // 从 localStorage 加载已有动态
      const savedMoments = JSON.parse(localStorage.getItem(`moments-${currentIdol?.id}`) || '[]')
      
      if (savedMoments.length === 0) {
        // 生成初始动态
        const initialMoments = await generateInitialMoments()
        setMoments(initialMoments)
        localStorage.setItem(`moments-${currentIdol?.id}`, JSON.stringify(initialMoments))
      } else {
        setMoments(savedMoments)
      }
    } catch (error) {
      console.error('加载动态失败:', error)
    }
    setLoading(false)
  }

  const generateInitialMoments = async () => {
    // 生成 3-5 条初始动态
    const count = Math.floor(Math.random() * 3) + 3
    const generatedMoments = []
    
    for (let i = 0; i < count; i++) {
      const moment = await generateMoment(i)
      if (moment) generatedMoments.push(moment)
    }
    
    return generatedMoments
  }

  const generateMoment = async (index) => {
    try {
      const response = await fetch('/idol/api/moments/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idol: currentIdol, index })
      })
      const data = await response.json()
      return data.moment
    } catch (error) {
      // 备用方案：返回默认动态
      return {
        id: Date.now() + index,
        content: getRandomMomentContent(),
        images: [],
        author: {
          name: currentIdol?.name || 'Idol',
          avatar: currentIdol?.avatar || '🎭'
        },
        timestamp: new Date(Date.now() - index * 3600000).toISOString(),
        likes: Math.floor(Math.random() * 20),
        liked: false,
        comments: [],
        gifts: []
      }
    }
  }

  const getRandomMomentContent = () => {
    const contents = [
      '今天天气真好，心情也很棒~ ☀️',
      '刚学会了一首新歌，好开心！🎵',
      '有人在吗？想聊聊天~ 💬',
      '分享一下今天的穿搭 ✨',
      '最近在追一部超好看的剧，推荐给大家！',
      '晚安，明天又是新的一天 🌙',
      '周末有什么好推荐的吗？',
      '今天吃了好吃的，幸福感满满 🍰'
    ]
    return contents[Math.floor(Math.random() * contents.length)]
  }

  const handleLike = (momentId) => {
    setMoments(prev => {
      const updated = prev.map(m => {
        if (m.id === momentId) {
          return {
            ...m,
            liked: !m.liked,
            likes: m.liked ? m.likes - 1 : m.likes + 1
          }
        }
        return m
      })
      localStorage.setItem(`moments-${currentIdol?.id}`, JSON.stringify(updated))
      return updated
    })
  }

  const handleGift = async (gift) => {
    if (userCoins < gift.price) {
      alert('金币不足！')
      return
    }

    const newCoins = userCoins - gift.price
    setUserCoins(newCoins)
    localStorage.setItem('user-coins', newCoins.toString())

    // 更新动态，添加礼物记录
    setMoments(prev => {
      const updated = prev.map(m => {
        if (m.id === selectedMoment.id) {
          return {
            ...m,
            gifts: [...(m.gifts || []), {
              ...gift,
              from: userMemories['用户名字'] || '粉丝',
              timestamp: new Date().toISOString()
            }]
          }
        }
        return m
      })
      localStorage.setItem(`moments-${currentIdol?.id}`, JSON.stringify(updated))
      return updated
    })

    // 生成感谢回复
    try {
      const response = await fetch('/idol/api/moments/gift-thanks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          idol: currentIdol, 
          gift,
          momentContent: selectedMoment.content 
        })
      })
      const data = await response.json()
      
      // 添加感谢评论
      if (data.thanks) {
        setMoments(prev => {
          const updated = prev.map(m => {
            if (m.id === selectedMoment.id) {
              return {
                ...m,
                comments: [...m.comments, {
                  id: Date.now(),
                  content: data.thanks,
                  author: { name: currentIdol?.name, avatar: currentIdol?.avatar },
                  timestamp: new Date().toISOString()
                }]
              }
            }
            return m
          })
          localStorage.setItem(`moments-${currentIdol?.id}`, JSON.stringify(updated))
          return updated
        })
      }
    } catch (error) {
      console.error('生成感谢失败:', error)
    }

    setShowGiftPanel(false)
    setSelectedMoment(null)
  }

  const handleComment = async (momentId) => {
    if (!newComment.trim() || sending) return

    setSending(true)
    
    // 添加用户评论
    const userComment = {
      id: Date.now(),
      content: newComment,
      author: { name: userMemories['用户名字'] || '我', avatar: '👤', isUser: true },
      timestamp: new Date().toISOString()
    }

    setMoments(prev => {
      const updated = prev.map(m => {
        if (m.id === momentId) {
          return { ...m, comments: [...m.comments, userComment] }
        }
        return m
      })
      return updated
    })

    setNewComment('')

    // 生成 Idol 回复
    try {
      const moment = moments.find(m => m.id === momentId)
      const response = await fetch('/idol/api/moments/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          idol: currentIdol, 
          momentContent: moment.content,
          userComment: userComment.content
        })
      })
      const data = await response.json()
      
      if (data.reply) {
        setMoments(prev => {
          const updated = prev.map(m => {
            if (m.id === momentId) {
              return {
                ...m,
                comments: [...m.comments, {
                  id: Date.now() + 1,
                  content: data.reply,
                  author: { name: currentIdol?.name, avatar: currentIdol?.avatar },
                  timestamp: new Date().toISOString()
                }]
              }
            }
            return m
          })
          localStorage.setItem(`moments-${currentIdol?.id}`, JSON.stringify(updated))
          return updated
        })
      }
    } catch (error) {
      console.error('生成回复失败:', error)
    }

    setSending(false)
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }

  return (
    <div className="moments-overlay">
      <div className="moments-container">
        {/* 头部 */}
        <header className="moments-header">
          <button className="back-btn" onClick={onClose}>◀</button>
          <h2>🎭 {currentIdol?.name} 的朋友圈</h2>
          <div className="coins-display">
            <span>💰</span>
            <span>{userCoins}</span>
          </div>
        </header>

        {/* Idol 头像卡片 */}
        <div className="idol-profile-card">
          <div className="idol-avatar-large">
            {currentIdol?.avatarImg ? (
              <img src={currentIdol.avatarImg} alt="avatar" />
            ) : (
              <span>{currentIdol?.avatar || '🎭'}</span>
            )}
          </div>
          <div className="idol-profile-info">
            <h3>{currentIdol?.name}</h3>
            <p>{currentIdol?.occupation || '虚拟偶像'}</p>
          </div>
        </div>

        {/* 动态列表 */}
        <div className="moments-list">
          {loading ? (
            <div className="loading-state">加载中...</div>
          ) : moments.length === 0 ? (
            <div className="empty-state">暂无动态</div>
          ) : (
            moments.map(moment => (
              <div key={moment.id} className="moment-card">
                {/* 作者信息 */}
                <div className="moment-author">
                  <div className="author-avatar">
                    {currentIdol?.avatarImg ? (
                      <img src={currentIdol.avatarImg} alt="avatar" />
                    ) : (
                      <span>{moment.author.avatar}</span>
                    )}
                  </div>
                  <div className="author-info">
                    <span className="author-name">{moment.author.name}</span>
                    <span className="moment-time">{formatTime(moment.timestamp)}</span>
                  </div>
                </div>

                {/* 内容 */}
                <div className="moment-content">{moment.content}</div>

                {/* 图片 */}
                {moment.images?.length > 0 && (
                  <div className="moment-images">
                    {moment.images.map((img, idx) => (
                      <img key={idx} src={img} alt="" />
                    ))}
                  </div>
                )}

                {/* 礼物展示 */}
                {moment.gifts?.length > 0 && (
                  <div className="gifts-display">
                    <span className="gifts-label">收到的礼物：</span>
                    <div className="gifts-list">
                      {moment.gifts.map((g, idx) => (
                        <span key={idx} className="gift-item" title={`${g.from} 送的 ${g.name}`}>
                          {g.emoji}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 互动栏 */}
                <div className="moment-actions">
                  <button 
                    className={`action-btn ${moment.liked ? 'liked' : ''}`}
                    onClick={() => handleLike(moment.id)}
                  >
                    {moment.liked ? '❤️' : '🤍'} {moment.likes}
                  </button>
                  <button className="action-btn">
                    💬 {moment.comments.length}
                  </button>
                  <button 
                    className="action-btn gift-btn"
                    onClick={() => {
                      setSelectedMoment(moment)
                      setShowGiftPanel(true)
                    }}
                  >
                    🎁 送礼物
                  </button>
                </div>

                {/* 评论区 */}
                {moment.comments.length > 0 && (
                  <div className="comments-section">
                    {moment.comments.map(comment => (
                      <div key={comment.id} className="comment-item">
                        <span className="comment-author">
                          {comment.author.isUser ? '👤' : comment.author.avatar} 
                          {comment.author.name}:
                        </span>
                        <span className="comment-content">{comment.content}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 评论输入 */}
                <div className="comment-input-row">
                  <input
                    type="text"
                    placeholder="写评论..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleComment(moment.id)}
                  />
                  <button 
                    onClick={() => handleComment(moment.id)}
                    disabled={!newComment.trim() || sending}
                  >
                    发送
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 礼物面板 */}
        {showGiftPanel && (
          <div className="gift-panel-overlay" onClick={() => setShowGiftPanel(false)}>
            <div className="gift-panel" onClick={e => e.stopPropagation()}>
              <h3>🎁 选择礼物</h3>
              <div className="gift-grid">
                {GIFTS.map(gift => (
                  <div 
                    key={gift.id}
                    className={`gift-card ${gift.rarity}`}
                    onClick={() => handleGift(gift)}
                  >
                    <span className="gift-emoji">{gift.emoji}</span>
                    <span className="gift-name">{gift.name}</span>
                    <span className="gift-price">💰 {gift.price}</span>
                  </div>
                ))}
              </div>
              <button className="close-gift-btn" onClick={() => setShowGiftPanel(false)}>
                取消
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default IdolMoments
