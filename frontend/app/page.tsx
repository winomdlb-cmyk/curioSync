'use client'

import { useState, useEffect } from 'react'
import { Topic } from '@/lib/types'
import { getTopics, createTopic, deleteTopic } from '@/lib/api'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function HomePage() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const router = useRouter()

  useEffect(() => {
    loadTopics()
  }, [])

  // Reload topics when page becomes visible (e.g., after navigating back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadTopics()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  async function loadTopics() {
    try {
      const data = await getTopics()
      setTopics(data.topics || [])
    } catch (error) {
      console.error('Failed to load topics:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateTopic() {
    if (!newTitle.trim()) return
    setCreating(true)
    try {
      const topic = await createTopic(newTitle.trim(), newDescription.trim())
      // 创建主题后自动创建第一个对话并跳转
      router.push(`/topic/${topic.id}`)
    } catch (error) {
      console.error('Failed to create topic:', error)
      setCreating(false)
    }
  }

  async function handleDeleteTopic(e: React.MouseEvent, topicId: string) {
    e.stopPropagation()
    if (!confirm('删除后主题及其所有对话将无法恢复，确定删除？')) return
    try {
      await deleteTopic(topicId)
      setTopics(topics.filter(t => t.id !== topicId))
    } catch (error) {
      console.error('Failed to delete topic:', error)
    }
  }

  function formatDate(dateStr?: string) {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return '今天'
    if (days === 1) return '昨天'
    if (days < 7) return `${days} 天前`
    return date.toLocaleDateString('zh-CN')
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Header */}
      <header className="border-b px-6 py-4" style={{ backgroundColor: 'var(--color-background)', borderColor: 'var(--color-border)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">CurioSync</h1>
          <Button onClick={() => setShowModal(true)}>
            + 新建主题
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="text-[--color-muted-foreground]">加载中...</div>
          </div>
        ) : topics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-[--color-muted-foreground] text-lg mb-4">开始你的第一个学习主题</div>
            <Button onClick={() => setShowModal(true)}>
              + 新建主题
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topics.map(topic => (
              <div
                key={topic.id}
                onClick={() => router.push(`/topic/${topic.id}`)}
                className="rounded-xl p-6 border hover:shadow-md transition-all cursor-pointer relative group"
                style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 h-8 w-8 p-0 rounded-md">
                    ···
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => handleDeleteTopic(e, topic.id)}
                      className="text-destructive"
                    >
                      删除主题
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <h3 className="text-lg font-semibold text-[--color-foreground] mb-2 pr-6">
                  {topic.title}
                </h3>
                {topic.description && (
                  <p className="text-[--color-muted-foreground] text-sm mb-4 line-clamp-2">
                    {topic.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm text-[--color-muted-foreground]">
                  <span>◈ {topic.node_count} 个知识点</span>
                  <span>💬 {topic.conversation_count} 个对话</span>
                </div>
                <div className="mt-3 text-sm text-[--color-muted-foreground]">
                  {formatDate(topic.updated_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
      <Dialog open={showModal} onOpenChange={(open) => {
        if (!open) {
          setShowModal(false)
          setNewTitle('')
          setNewDescription('')
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建主题</DialogTitle>
            <DialogDescription>
              创建一个新的学习主题，开始你的探索之旅
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-[--color-foreground] mb-1">
                主题名称
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="比如：量子力学入门"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 resize-none"
                style={{ backgroundColor: 'var(--color-background)', borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[--color-foreground] mb-1">
                简单描述（选填）
              </label>
              <textarea
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder="你想了解什么？"
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 resize-none"
                style={{ backgroundColor: 'var(--color-background)', borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowModal(false)
                setNewTitle('')
                setNewDescription('')
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleCreateTopic}
              disabled={!newTitle.trim() || creating}
            >
              {creating ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
