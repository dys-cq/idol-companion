import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 预设Idol模板（已清空）
export const idolTemplates = []

// 状态管理
export const useStore = create(
  persist(
    (set, get) => ({
      // 当前Idol
      currentIdol: null,
      
      // 聊天消息
      messages: [],
      
      // 是否正在加载
      isLoading: false,
      
      // 是否正在录音
      isRecording: false,
      
      // 用户记忆
      userMemories: {},
      
      // 设置
      settings: {
        voiceEnabled: true,
        autoPlayVoice: false,
        darkMode: true
      },

      // 设置当前Idol
      setCurrentIdol: (idol) => {
        set({ currentIdol: idol, messages: [] })
        // 添加打招呼消息
        get().addMessage('assistant', idol.greeting)
      },

      // 添加消息
      addMessage: (role, content) => {
        const newMessage = {
          id: Date.now(),
          role,
          content,
          timestamp: new Date().toISOString()
        }
        set(state => ({
          messages: [...state.messages, newMessage]
        }))
        return newMessage
      },

      // 设置加载状态
      setLoading: (loading) => set({ isLoading: loading }),

      // 设置录音状态
      setRecording: (recording) => set({ isRecording: recording }),

      // 保存用户记忆
      saveMemory: (key, value) => {
        set(state => ({
          userMemories: {
            ...state.userMemories,
            [key]: value
          }
        }))
      },

      // 清除聊天记录
      clearMessages: () => set({ messages: [] }),

      // 更新设置
      updateSettings: (newSettings) => {
        set(state => ({
          settings: { ...state.settings, ...newSettings }
        }))
      }
    }),
    {
      name: 'idol-companion-storage',
      partialize: (state) => ({
        currentIdol: state.currentIdol,
        messages: state.messages.slice(-50), // 只保存最近50条
        userMemories: state.userMemories,
        settings: state.settings
      })
    }
  )
)
