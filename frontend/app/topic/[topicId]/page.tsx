'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Topic, Conversation, Message, KnowledgeGraph } from '@/lib/types'
import { getTopic, getConversations, createConversation, deleteConversation, getMessages, sendMessage } from '@/lib/api'
import ChatView from '@/components/Chat/ChatView'
import KnowledgeMapView from '@/components/KnowledgeMap/KnowledgeMapView'
import ConvergeCard from '@/components/Intervention/ConvergeCard'
import TransitionCard from '@/components/Intervention/TransitionCard'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

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
  const [error, setError] = useState<string | null>(null)
  const [retryMessage, setRetryMessage] = useState<string | null>(null)
  const [reasoningText, setReasoningText] = useState<string>('')
  const failedMessageRef = useRef<string>('')

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
    // 根据选项内容判断行为
    if (option.includes('整理') || option.includes('回顾')) {
      handleSendMessage('请帮我整理一下目前学到的知识点')
    }
    // "继续探索" 类选项不需要发消息，对话自然继续
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

    // 清除之前的错误和重试消息
    setError(null)
    setRetryMessage(null)
    failedMessageRef.current = content

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

    // 清除之前的 reasoning
    setReasoningText('')

    // 调用流式 API
    await sendMessage(
      currentConversation.id,
      topicId,
      content,
      {
        onReasoning: (text) => {
          setReasoningText(prev => prev + text)
        },
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
            toast(data.content.bookmark_title || '已加入书签', {
              description: data.content.bookmark_description || '',
              duration: 5000,
            })
          } else if (data.type === 'converge' || data.type === 'transition') {
            setIntervention({ type: data.type, content: data.content })
          }
        },
        onGraphUpdate: (data) => {
          // TODO: 更新图谱
          console.log('graph_update', data)
        },
        onDone: (data) => {
          // 只更新对话标题，消息已在本地正确更新
          getConversations(topicId).then(res => {
            setConversations(res.conversations || [])
            // 更新当前对话的标题（如果有变化）
            if (currentConversation && res.conversations) {
              const updated = res.conversations.find((c: any) => c.id === currentConversation.id)
              if (updated) {
                setCurrentConversation(updated)
              }
            }
          })
        },
        onError: (error) => {
          console.error('Chat error:', error)
          // 存储失败的消息内容用于重试
          if (failedMessageRef.current) {
            setRetryMessage(failedMessageRef.current)
          }
        },
      }
    )
  }, [currentConversation, topicId])

  const handleRetry = useCallback(() => {
    if (retryMessage) {
      handleSendMessage(retryMessage)
    }
  }, [retryMessage, handleSendMessage])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="text-[--color-muted-foreground]">加载中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="rounded-lg px-6 py-4 mb-4 max-w-md" style={{ backgroundColor: 'color-mix(in oklch, var(--color-destructive) 10%, transparent)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'color-mix(in oklch, var(--color-destructive) 20%, transparent)' }}>
          <div className="flex items-start gap-3">
            <span style={{ color: 'var(--color-destructive)' }} className="text-lg">⚠</span>
            <div>
              <p className="font-medium mb-1" style={{ color: 'var(--color-destructive)' }}>出错了</p>
              <p className="text-sm" style={{ color: 'var(--color-destructive)', opacity: 0.8 }}>{error}</p>
            </div>
          </div>
        </div>
        <button
          onClick={loadTopicData}
          className="px-4 py-2 rounded-lg hover:opacity-90 transition-colors"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
        >
          重试
        </button>
      </div>
    )
  }

  if (!topic) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="text-[--color-muted-foreground]">主题不存在</div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Top Bar */}
      <header className="h-14 flex items-center px-4 shrink-0" style={{ backgroundColor: 'var(--color-background)', borderBottom: '1px solid var(--color-border)' }}>
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-2 rounded-lg transition-colors mr-2"
          style={{}}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          ≡
        </button>
        <h1 className="text-lg font-semibold truncate" style={{ color: 'var(--color-foreground)' }}>{topic.title}</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`flex flex-col transition-all duration-200 h-full ${
            sidebarCollapsed ? 'w-12' : 'w-56'
          } shrink-0`}
          style={{ backgroundColor: 'var(--color-sidebar)', borderRight: '1px solid var(--color-sidebar-border)' }}
        >
          {/* Sidebar Header */}
          <div className={`p-3 ${sidebarCollapsed ? 'text-center' : ''}`} style={{ borderBottom: '1px solid var(--color-sidebar-border)' }}>
            {viewMode === 'chat' ? (
              <button
                onClick={() => setViewMode('graph')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${sidebarCollapsed ? 'justify-center' : ''}`}
                title="知识图谱"
                style={{ color: 'var(--color-sidebar-foreground)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-sidebar-accent)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                ◈
                {!sidebarCollapsed && <span className="text-sm">知识图谱</span>}
              </button>
            ) : (
              <button
                onClick={() => setViewMode('chat')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${sidebarCollapsed ? 'justify-center' : ''}`}
                title="返回对话"
                style={{ backgroundColor: 'var(--color-sidebar-accent)', color: 'var(--color-sidebar-accent-foreground)' }}
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
                <div className="text-xs font-medium uppercase mb-2" style={{ color: 'var(--color-muted-foreground)' }}>对话</div>
                <div className="space-y-1">
                  {conversations.map(conv => (
                    <div
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv)}
                      className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                        currentConversation?.id === conv.id ? '' : ''
                      }`}
                      style={{
                        backgroundColor: currentConversation?.id === conv.id ? 'var(--color-sidebar-accent)' : 'transparent',
                        color: currentConversation?.id === conv.id ? 'var(--color-sidebar-accent-foreground)' : 'var(--color-sidebar-foreground)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-sidebar-accent)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = currentConversation?.id === conv.id ? 'var(--color-sidebar-accent)' : 'transparent'}
                    >
                      <span className="truncate text-sm flex-1 mr-2">{conv.title}</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 rounded-md hover:bg-[--color-sidebar-accent]">
                          ···
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => handleDeleteConversation(e, conv.id)}
                            className="text-destructive"
                          >
                            删除对话
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* New Conversation Button */}
          <div className={`p-3 ${sidebarCollapsed ? 'text-center' : ''}`} style={{ borderTop: '1px solid var(--color-sidebar-border)' }}>
            <button
              onClick={handleNewConversation}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                sidebarCollapsed ? 'w-full' : ''
              }`}
              title="新建对话"
              style={{ color: 'var(--color-primary)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-sidebar-accent)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {sidebarCollapsed ? '+' : '+ 新建对话'}
            </button>
          </div>

          {/* Back to Home */}
          {!sidebarCollapsed && (
            <div className="p-3" style={{ borderTop: '1px solid var(--color-sidebar-border)' }}>
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors w-full"
                style={{ color: 'var(--color-sidebar-foreground)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-sidebar-accent)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
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
              reasoningText={reasoningText}
              isStreaming={messages.some(m => m.id.startsWith('temp-ai-'))}
              onSendMessage={handleSendMessage}
              retryMessage={retryMessage}
              onRetry={handleRetry}
            />
          ) : (
            <KnowledgeMapView topicId={topicId} />
          )}

          {/* Intervention Overlay */}
          {intervention.type === 'converge' && (
            <div className="absolute inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-10">
              <ConvergeCard
                summary={intervention.content.summary}
                options={intervention.content.options}
                onOptionSelect={handleConvergeOption}
                onDismiss={handleDismissIntervention}
              />
            </div>
          )}

          {intervention.type === 'transition' && (
            <div className="absolute inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-10">
              <TransitionCard
                stageSummary={intervention.content.stage_summary}
                nextDirections={intervention.content.next_directions}
                onDirectionClick={handleTransitionDirection}
                onDismiss={handleDismissIntervention}
              />
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
