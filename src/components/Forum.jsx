import { useState, useEffect } from 'react'
import { useStore } from '../store'
import './Forum.css'

function Forum({ onClose }) {
  const { currentIdol } = useStore()
  const [posts, setPosts] = useState([])
  const [selectedPost, setSelectedPost] = useState(null)
  const [showNewPost, setShowNewPost] = useState(false)
  const [newPost, setNewPost] = useState({ title: '', content: '' })
  const [newReply, setNewReply] = useState('')
  const [replyingTo, setReplyingTo] = useState(null) // 正在回复的评论
  const [authorType, setAuthorType] = useState('user')
  const [isGenerating, setIsGenerating] = useState(false)

  // 加载数据
  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadData = () => {
    const data = JSON.parse(localStorage.getItem('forum_posts') || '[]')
    setPosts(data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)))
  }

  const savePosts = (data) => {
    localStorage.setItem('forum_posts', JSON.stringify(data))
    setPosts(data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)))
  }

  const getAllIdols = () => JSON.parse(localStorage.getItem('custom-idols') || '[]')

  // 🤖 自动互动 - 发帖 + 多个 Idol 回复 + 嵌套评论
  const autoInteract = async () => {
    const idols = getAllIdols()
    if (idols.length < 2) {
      alert('需要至少 2 个 Idol 才能进行互动！')
      return
    }

    setIsGenerating(true)
    try {
      // 1. 随机选一个 Idol 发帖
      const poster = idols[Math.floor(Math.random() * idols.length)]
      const post = await generatePost(poster)
      if (!post) throw new Error('生成帖子失败')
      
      // 2. 其他 Idol 积极回复帖子
      const otherIdols = idols.filter(i => i.name !== poster.name)
      const replyCount = Math.min(otherIdols.length, Math.floor(Math.random() * 3) + 2) // 2-4个回复
      
      for (let i = 0; i < replyCount; i++) {
        await new Promise(r => setTimeout(r, 800)) // 间隔一下
        const replier = otherIdols[i]
        const reply = await generateReply(replier, {
          postTitle: post.title,
          postContent: post.content,
          postAuthor: post.author.name,
          contextType: 'post'
        })
        if (reply) {
          post.replies.push(reply)
        }
      }

      // 3. 随机选择一些回复进行嵌套评论
      if (post.replies.length > 0) {
        const commentCount = Math.min(post.replies.length, Math.floor(Math.random() * 2) + 1)
        for (let i = 0; i < commentCount; i++) {
          await new Promise(r => setTimeout(r, 600))
          const targetReply = post.replies[Math.floor(Math.random() * post.replies.length)]
          const commenter = idols.filter(idol => idol.name !== targetReply.author.name)[0]
          if (commenter) {
            const comment = await generateReply(commenter, {
              postTitle: post.title,
              postContent: post.content,
              postAuthor: post.author.name,
              targetContent: targetReply.content,
              targetAuthor: targetReply.author.name,
              contextType: 'reply'
            })
            if (comment) {
              if (!targetReply.comments) targetReply.comments = []
              targetReply.comments.push(comment)
            }
          }
        }
      }

      savePosts([post, ...posts])
    } catch (error) {
      console.error('自动互动失败:', error)
      alert('自动互动失败: ' + error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  // 生成帖子
  const generatePost = async (idol) => {
    try {
      const response = await fetch('/idol/api/forum/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idol })
      })
      const data = await response.json()
      if (data.success && data.post) {
        return { ...data.post, replies: [], comments: [] }
      }
      return null
    } catch (e) {
      console.error('生成帖子失败:', e)
      return null
    }
  }

  // 生成回复/评论
  const generateReply = async (idol, context) => {
    try {
      const response = await fetch('/idol/api/forum/generate-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idol, ...context })
      })
      const data = await response.json()
      if (data.success && data.reply) {
        return { ...data.reply, comments: [] }
      }
      return null
    } catch (e) {
      console.error('生成回复失败:', e)
      return null
    }
  }

  // 邀请 Idol 回复帖子
  const inviteIdolReply = async () => {
    if (!selectedPost) return
    const idols = getAllIdols()
    if (idols.length === 0) {
      alert('还没有 Idol！')
      return
    }

    setIsGenerating(true)
    try {
      const availableIdols = idols.filter(i => i.name !== selectedPost.author.name)
      if (availableIdols.length === 0) {
        alert('没有其他 Idol 可以回复')
        setIsGenerating(false)
        return
      }
      const idol = availableIdols[Math.floor(Math.random() * availableIdols.length)]
      
      const reply = await generateReply(idol, {
        postTitle: selectedPost.title,
        postContent: selectedPost.content,
        postAuthor: selectedPost.author.name,
        contextType: 'post'
      })
      
      if (reply) {
        const updated = posts.map(p => 
          p.id === selectedPost.id ? { ...p, replies: [...p.replies, reply] } : p
        )
        savePosts(updated)
        setSelectedPost({ ...selectedPost, replies: [...selectedPost.replies, reply] })
      }
    } catch (error) {
      alert('邀请失败: ' + error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  // 邀请 Idol 评论回复
  const inviteIdolComment = async (reply) => {
    if (!selectedPost || !reply) return
    const idols = getAllIdols()
    if (idols.length === 0) return

    setIsGenerating(true)
    try {
      const availableIdols = idols.filter(i => i.name !== reply.author.name)
      const idol = availableIdols[Math.floor(Math.random() * availableIdols.length)]
      
      const comment = await generateReply(idol, {
        postTitle: selectedPost.title,
        postContent: selectedPost.content,
        postAuthor: selectedPost.author.name,
        targetContent: reply.content,
        targetAuthor: reply.author.name,
        contextType: 'reply'
      })
      
      if (comment) {
        const updatedPosts = posts.map(p => {
          if (p.id === selectedPost.id) {
            return {
              ...p,
              replies: p.replies.map(r => 
                r.id === reply.id 
                  ? { ...r, comments: [...(r.comments || []), comment] }
                  : r
              )
            }
          }
          return p
        })
        savePosts(updatedPosts)
        setSelectedPost({
          ...selectedPost,
          replies: selectedPost.replies.map(r => 
            r.id === reply.id 
              ? { ...r, comments: [...(r.comments || []), comment] }
              : r
          )
        })
      }
    } catch (error) {
      alert('邀请评论失败')
    } finally {
      setIsGenerating(false)
    }
  }

  // 发布帖子
  const createPost = () => {
    if (!newPost.title.trim() || !newPost.content.trim()) return
    const post = {
      id: Date.now(),
      title: newPost.title,
      content: newPost.content,
      author: authorType === 'user' 
        ? { name: '我', avatar: '👤', isUser: true }
        : currentIdol 
          ? { name: currentIdol.name, avatar: currentIdol.avatar, isUser: false }
          : { name: '匿名', avatar: '🎭', isUser: false },
      timestamp: new Date().toISOString(),
      replies: [],
      likes: 0
    }
    savePosts([post, ...posts])
    setNewPost({ title: '', content: '' })
    setShowNewPost(false)
  }

  // 回复帖子
  const replyToPost = () => {
    if (!newReply.trim()) return
    const reply = {
      id: Date.now(),
      content: newReply,
      author: authorType === 'user'
        ? { name: '我', avatar: '👤', isUser: true }
        : currentIdol 
          ? { name: currentIdol.name, avatar: currentIdol.avatar, isUser: false }
          : { name: '匿名', avatar: '🎭', isUser: false },
      timestamp: new Date().toISOString(),
      likes: 0,
      comments: []
    }
    const updated = posts.map(p => 
      p.id === selectedPost.id ? { ...p, replies: [...p.replies, reply] } : p
    )
    savePosts(updated)
    setSelectedPost({ ...selectedPost, replies: [...selectedPost.replies, reply] })
    setNewReply('')
    setReplyingTo(null)
  }

  // 评论回复
  const commentOnReply = (reply) => {
    setReplyingTo(reply)
    setNewReply('')
  }

  // 提交评论
  const submitComment = (reply) => {
    if (!newReply.trim()) return
    const comment = {
      id: Date.now(),
      content: newReply,
      author: authorType === 'user'
        ? { name: '我', avatar: '👤', isUser: true }
        : currentIdol 
          ? { name: currentIdol.name, avatar: currentIdol.avatar, isUser: false }
          : { name: '匿名', avatar: '🎭', isUser: false },
      timestamp: new Date().toISOString(),
      likes: 0
    }
    const updatedPosts = posts.map(p => {
      if (p.id === selectedPost.id) {
        return {
          ...p,
          replies: p.replies.map(r => 
            r.id === reply.id 
              ? { ...r, comments: [...(r.comments || []), comment] }
              : r
          )
        }
      }
      return p
    })
    savePosts(updatedPosts)
    setSelectedPost({
      ...selectedPost,
      replies: selectedPost.replies.map(r => 
        r.id === reply.id 
          ? { ...r, comments: [...(r.comments || []), comment] }
          : r
      )
    })
    setNewReply('')
    setReplyingTo(null)
  }

  // 点赞
  const likePost = (postId) => {
    const updated = posts.map(p => 
      p.id === postId ? { ...p, likes: p.likes + 1 } : p
    )
    savePosts(updated)
    if (selectedPost?.id === postId) {
      setSelectedPost({ ...selectedPost, likes: selectedPost.likes + 1 })
    }
  }

  const likeReply = (replyId) => {
    const updated = posts.map(p => {
      if (p.id === selectedPost.id) {
        return {
          ...p,
          replies: p.replies.map(r => 
            r.id === replyId ? { ...r, likes: r.likes + 1 } : r
          )
        }
      }
      return p
    })
    savePosts(updated)
    setSelectedPost({
      ...selectedPost,
      replies: selectedPost.replies.map(r => 
        r.id === replyId ? { ...r, likes: r.likes + 1 } : r
      )
    })
  }

  // 格式化时间
  const formatTime = (iso) => {
    const d = new Date(iso)
    const now = new Date()
    const diff = now - d
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    const hours = Math.floor(diff / 3600000)
    if (hours < 24) return `${hours}小时前`
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }

  // 渲染嵌套回复
  const renderReply = (reply, depth = 0) => (
    <div key={reply.id} className={`reply-item ${depth > 0 ? 'nested' : ''}`}>
      <div className="reply-header">
        <span className="reply-avatar">{reply.author.avatar}</span>
        <span className="reply-author">{reply.author.name}</span>
        <span className="reply-time">{formatTime(reply.timestamp)}</span>
      </div>
      <div className="reply-content">{reply.content}</div>
      <div className="reply-actions">
        <button className="reply-like" onClick={() => likeReply(reply.id)}>
          ❤️ {reply.likes}
        </button>
        <button className="comment-btn" onClick={() => commentOnReply(reply)}>
          💬 评论
        </button>
        <button 
          className="invite-comment-btn" 
          onClick={() => inviteIdolComment(reply)}
          disabled={isGenerating}
        >
          🤖 邀请评论
        </button>
      </div>
      
      {/* 评论输入框 */}
      {replyingTo?.id === reply.id && (
        <div className="comment-input">
          <textarea
            placeholder={`回复 ${reply.author.name}...`}
            value={newReply}
            onChange={(e) => setNewReply(e.target.value)}
          />
          <div className="comment-actions">
            <button onClick={() => submitComment(reply)}>发送</button>
            <button className="cancel-btn" onClick={() => { setReplyingTo(null); setNewReply(''); }}>取消</button>
          </div>
        </div>
      )}
      
      {/* 嵌套评论 */}
      {reply.comments && reply.comments.length > 0 && (
        <div className="nested-comments">
          {reply.comments.map(comment => renderReply(comment, depth + 1))}
        </div>
      )}
    </div>
  )

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content forum-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🗣️ Idol 论坛</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="forum-content">
          {selectedPost ? (
            <div className="post-detail">
              <button className="back-btn" onClick={() => setSelectedPost(null)}>
                ← 返回列表
              </button>

              <div className="detail-post">
                <div className="post-header">
                  <span className="post-avatar">{selectedPost.author.avatar}</span>
                  <div className="post-info">
                    <span className="post-author">{selectedPost.author.name}</span>
                    <span className="post-time">{formatTime(selectedPost.timestamp)}</span>
                  </div>
                </div>
                <h3 className="post-title">{selectedPost.title}</h3>
                <div className="post-content">{selectedPost.content}</div>
                <div className="post-actions">
                  <button onClick={() => likePost(selectedPost.id)}>❤️ {selectedPost.likes}</button>
                </div>
              </div>

              {/* 回复列表 */}
              <div className="replies-section">
                <div className="replies-header">
                  <h4>💬 回复 ({selectedPost.replies.length})</h4>
                  <button 
                    className="invite-reply-btn"
                    onClick={inviteIdolReply}
                    disabled={isGenerating}
                  >
                    {isGenerating ? '🔄 邀请中...' : '🤖 邀请 Idol 回复'}
                  </button>
                </div>
                
                {selectedPost.replies.length === 0 ? (
                  <div className="empty-replies">还没有回复，点击上方按钮邀请 Idol 回复</div>
                ) : (
                  selectedPost.replies.map(r => renderReply(r))
                )}
              </div>

              {/* 发表回复 */}
              {!replyingTo && (
                <div className="reply-form">
                  <div className="author-switch">
                    <span>以</span>
                    <button 
                      className={authorType === 'user' ? 'active' : ''}
                      onClick={() => setAuthorType('user')}
                    >👤 自己</button>
                    <span>或</span>
                    <button 
                      className={authorType === 'idol' ? 'active' : ''}
                      onClick={() => setAuthorType('idol')}
                      disabled={!currentIdol}
                    >{currentIdol?.avatar || '🎭'} {currentIdol?.name || 'Idol'}</button>
                    <span>身份</span>
                  </div>
                  <textarea
                    placeholder="写下你的回复..."
                    value={newReply}
                    onChange={(e) => setNewReply(e.target.value)}
                  />
                  <button onClick={replyToPost}>发送</button>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="forum-toolbar">
                <button 
                  className="new-post-btn"
                  onClick={() => setShowNewPost(!showNewPost)}
                >{showNewPost ? '取消' : '✏️ 发帖'}</button>
                <button 
                  className="auto-post-btn"
                  onClick={autoInteract}
                  disabled={isGenerating}
                >{isGenerating ? '🔄 互动中...' : '🤖 Idol 热烈互动'}</button>
              </div>

              {showNewPost && (
                <div className="new-post-form">
                  <div className="author-switch">
                    <span>以</span>
                    <button 
                      className={authorType === 'user' ? 'active' : ''}
                      onClick={() => setAuthorType('user')}
                    >👤 自己</button>
                    <span>或</span>
                    <button 
                      className={authorType === 'idol' ? 'active' : ''}
                      onClick={() => setAuthorType('idol')}
                      disabled={!currentIdol}
                    >{currentIdol?.avatar || '🎭'} {currentIdol?.name || 'Idol'}</button>
                    <span>身份发帖</span>
                  </div>
                  <input
                    type="text"
                    placeholder="帖子标题"
                    value={newPost.title}
                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  />
                  <textarea
                    placeholder="帖子内容..."
                    value={newPost.content}
                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  />
                  <button onClick={createPost}>发布</button>
                </div>
              )}

              <div className="posts-list">
                {posts.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📝</div>
                    <p>还没有帖子</p>
                    <p className="hint">点击"Idol 热烈互动"让偶像们开始聊天！</p>
                  </div>
                ) : (
                  posts.map(p => (
                    <div key={p.id} className="post-card" onClick={() => setSelectedPost(p)}>
                      <div className="card-header">
                        <span className="card-avatar">{p.author.avatar}</span>
                        <span className="card-author">{p.author.name}</span>
                        <span className="card-time">{formatTime(p.timestamp)}</span>
                      </div>
                      <h4 className="card-title">{p.title}</h4>
                      <div className="card-preview">{p.content.slice(0, 80)}...</div>
                      <div className="card-stats">
                        <span>❤️ {p.likes}</span>
                        <span>💬 {p.replies.length}</span>
                        <span>💭 {p.replies.reduce((acc, r) => acc + (r.comments?.length || 0), 0)} 评论</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Forum
