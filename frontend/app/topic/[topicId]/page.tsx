'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Topic, Conversation, Message, KnowledgeGraph } from '@/lib/types'
import { getTopic, getConversations, createConversation, deleteConversation, getMessages, sendMessage } from '@/lib/api'
import ChatView from '@/components/Chat/ChatView'
import KnowledgeMapView from '@/components/KnowledgeMap/KnowledgeMapView'
import ConvergeCard from '@/components/Intervention/ConvergeCard'
import TransitionCard from '@/components/Intervention/TransitionCard'
import BookmarkToast from '@/components/Intervention/BookmarkToast'

type ViewMode = 'chat' | 'graph'

interface InterventionState {
  type: 'converge' | 'transition' | 'bookmark' | null
  content: any
}

export default function TopicPage() {
  const params = useParams()
  const router = useRouter()
  const topicId = params.topicId as string

  const [topic, setTopic] = useState<Topic | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('chat')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [intervention, setIntervention] = useState<InterventionState>({ type: null, content: null })
  const [showBookmarkToast, setShowBookmarkToast] = useState(false)
  const [bookmarkContent, setBookmarkContent] = useState<{ title: string; description: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTopicData()
  }, [topicId])

  async function loadTopicData() {
    try {
      const [topicData, conversationsRes] = await Promise.all([
        getTopic(topicId),
        getConversations(topicId),
      ])

      setTopic(topicData || null)
      setConversations(conversationsRes.conversations || [])

      // 自动选择第一个对话或创建新对话
      if (conversationsRes.conversations?.length > 0) {
        setCurrentConversation(conversationsRes.conversations[0])
        const msgs = await getMessages(conversationsRes.conversations[0].id)
        setMessages(msgs.messages || [])
      } else {
        // 创建第一个对话
        const newConv = await createConversation(topicId)
        setCurrentConversation(newConv)
        setConversations([newConv])
        setMessages([])
      }
      setError(null) // 清除错误
    } catch (err) {
      console.error('Failed to load topic data:', err)
      setError('加载失败，请检查网络连接')
    } finally {
      setLoading(false)
    }
  }

  async function handleNewConversation() {
    try {
      const newConv = await createConversation(topicId)
      setConversations([newConv, ...conversations])
      setCurrentConversation(newConv)
      setMessages([])
      setViewMode('chat')
    } catch (error) {
      console.error('Failed to create conversation:', error)
    }
  }

  async function handleSelectConversation(conv: Conversation) {
    setCurrentConversation(conv)
    try {
      const msgs = await getMessages(conv.id)
      setMessages(msgs.messages || [])
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
    setViewMode('chat')
  }

  async function handleDeleteConversation(e: React.MouseEvent, convId: string) {
    e.stopPropagation()
    if (!confirm('删除后对话内容将无法恢复')) return

    try {
      await deleteConversation(convId)
      const remaining = conversations.filter(c => c.id !== convId)

      if (convId === currentConversation?.id) {
        if (remaining.length > 0) {
          handleSelectConversation(remaining[0])
        } else {
          // 创建新对话
          handleNewConversation()
        }
      }
      setConversations(remaining)
    } catch (error) {
      console.error('Failed to delete conversation:', error)
    }
  }

  const handleConvergeOption = (option: string) => {
    setIntervention({ type: null, content: null })
    if (option === '整理一下') {
      handleSendMessage('请帮我整理一下目前学到的知识点')
    }
  }

  const handleTransitionDirection = (label: string) => {
    setIntervention({ type: null, content: null })
    handleSendMessage(`给我讲讲${label}`)
  }

  const handleDismissIntervention = () => {
    setIntervention({ type: null, content: null })
  }

  const handleSendMessage = useCallback(async (content: string) => {
    if (!currentConversation) return

    // 清除之前的错误
    setError(null)

    // 添加用户消息到列表（乐观更新）
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      message_type: 'normal',
      metadata: {},
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempUserMsg])

    // 调用流式 API
    await sendMessage(
      currentConversation.id,
      topicId,
      content,
      {
        onContent: (text) => {
          // 流式更新 AI 消息
          setMessages(prev => {
            const last = prev[prev.length - 1]
            if (last?.role === 'assistant') {
              return prev.map((m, i) =>
                i === prev.length - 1 ? { ...m, content: m.content + text } : m
              )
            }
            return [
              ...prev,
              {
                id: `temp-ai-${Date.now()}`,
                role: 'assistant' as const,
                content: text,
                message_type: 'normal' as const,
                metadata: {},
                created_at: new Date().toISOString(),
              },
            ]
          })
        },
        onNodeHint: (data) => {
          // TODO: 显示节点提示
          console.log('node_hint', data)
        },
        onIntervention: (data) => {
          if (data.type === 'bookmark') {
            setBookmarkContent({
              title: data.content.bookmark_title || '',
              description: data.content.bookmark_description || '',
            })
            setShowBookmarkToast(true)
          } else if (data.type === 'converge' || data.type === 'transition') {
            setIntervention({ type: data.type, content: data.content })
          }
        },
        onGraphUpdate: (data) => {
          // TODO: 更新图谱
          console.log('graph_update', data)
        },
        onDone: (data) => {
          // 更新消息列表（替换临时消息）
          setMessages(prev => prev.map(m => {
            if (m.id.startsWith('temp-')) {
              return { ...m, id: data.message_id }
            }
            return m
          }))
          // 刷新对话列表（更新标题等）
          loadTopicData()
        },
        onError: (error) => {
          console.error('Chat error:', error)
          setError('AI 回复失败，请稍后重试')
        },
      }
    )
  }, [currentConversation, topicId])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="bg-red-50 border border-red-200 rounded-lg px-6 py-4 mb-4 max-w-md">
          <div className="flex items-start gap-3">
            <span className="text-red-500 text-lg">⚠</span>
            <div>
              <p className="text-red-700 font-medium mb-1">出错了</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        </div>
        <button
          onClick={loadTopicData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          重试
        </button>
      </div>
    )
  }

  if (!topic) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">主题不存在</div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 shrink-0">
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors mr-2"
        >
          ≡
        </button>
        <h1 className="text-lg font-semibold text-gray-900 truncate">{topic.title}</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-200 ${
            sidebarCollapsed ? 'w-12' : 'w-56'
          } shrink-0`}
        >
          {/* Sidebar Header */}
          <div className={`p-3 border-b border-gray-200 ${sidebarCollapsed ? 'text-center' : ''}`}>
            {viewMode === 'chat' ? (
              <button
                onClick={() => setViewMode('graph')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-gray-100 text-gray-600 ${sidebarCollapsed ? 'justify-center' : ''}`}
                title="知识图谱"
              >
                ◈
                {!sidebarCollapsed && <span className="text-sm">知识图谱</span>}
              </button>
            ) : (
              <button
                onClick={() => setViewMode('chat')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors bg-blue-50 text-blue-600 ${sidebarCollapsed ? 'justify-center' : ''}`}
                title="返回对话"
              >
                ←
                {!sidebarCollapsed && <span className="text-sm">返回对话</span>}
              </button>
            )}
          </div>

          {/* Conversation List */}
          {!sidebarCollapsed && (
            <div className="flex-1 overflow-y-auto">
              <div className="px-3 py-2">
                <div className="text-xs font-medium text-gray-400 uppercase mb-2">对话</div>
                <div className="space-y-1">
                  {conversations.map(conv => (
                    <div
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv)}
                      className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                        currentConversation?.id === conv.id
                          ? 'bg-blue-50 text-blue-600'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <span className="truncate text-sm flex-1 mr-2">{conv.title}</span>
                      <button
                        onClick={(e) => handleDeleteConversation(e, conv.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 text-xs"
                      >
                        ···
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* New Conversation Button */}
          <div className={`p-3 border-t border-gray-200 ${sidebarCollapsed ? 'text-center' : ''}`}>
            <button
              onClick={handleNewConversation}
              className={`px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors ${
                sidebarCollapsed ? 'w-full' : ''
              }`}
              title="新建对话"
            >
              {sidebarCollapsed ? '+' : '+ 新建对话'}
            </button>
          </div>

          {/* Back to Home */}
          {!sidebarCollapsed && (
            <div className="p-3 border-t border-gray-200">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors w-full"
              >
                ← 返回主页
              </button>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {viewMode === 'chat' ? (
            <ChatView
              topicTitle={topic.title}
              messages={messages}
              onSendMessage={handleSendMessage}
            />
          ) : (
            <KnowledgeMapView topicId={topicId} />
          )}

          {/* Intervention Overlay */}
          {intervention.type === 'converge' && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center p-4 z-10">
              <ConvergeCard
                summary={intervention.content.summary}
                options={intervention.content.options}
                onOptionSelect={handleConvergeOption}
                onDismiss={handleDismissIntervention}
              />
            </div>
          )}

          {intervention.type === 'transition' && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center p-4 z-10">
              <TransitionCard
                stageSummary={intervention.content.stage_summary}
                nextDirections={intervention.content.next_directions}
                onDirectionClick={handleTransitionDirection}
                onDismiss={handleDismissIntervention}
              />
            </div>
          )}

          {showBookmarkToast && bookmarkContent && (
            <BookmarkToast
              bookmarkTitle={bookmarkContent.title}
              bookmarkDescription={bookmarkContent.description}
              onDismiss={() => setShowBookmarkToast(false)}
            />
          )}
        </main>
      </div>
    </div>
  )
}
