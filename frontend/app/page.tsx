'use client'

import { useState, useEffect } from 'react'
import { Topic } from '@/lib/types'
import { getTopics, createTopic, deleteTopic } from '@/lib/api'
import { useRouter } from 'next/navigation'

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">CurioSync</h1>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + 新建主题
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="text-gray-500">加载中...</div>
          </div>
        ) : topics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-gray-400 text-lg mb-4">开始你的第一个学习主题</div>
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + 新建主题
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topics.map(topic => (
              <div
                key={topic.id}
                onClick={() => router.push(`/topic/${topic.id}`)}
                className="bg-white rounded-xl p-6 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer relative group"
              >
                <button
                  onClick={(e) => handleDeleteTopic(e, topic.id)}
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity"
                >
                  ···
                </button>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 pr-6">
                  {topic.title}
                </h3>
                {topic.description && (
                  <p className="text-gray-500 text-sm mb-4 line-clamp-2">
                    {topic.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span>◈ {topic.node_count} 个知识点</span>
                  <span>💬 {topic.conversation_count} 个对话</span>
                </div>
                <div className="mt-3 text-sm text-gray-400">
                  {formatDate(topic.updated_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold mb-4">新建主题</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  主题名称
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="比如：量子力学入门"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  简单描述（选填）
                </label>
                <textarea
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="你想了解什么？"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowModal(false)
                  setNewTitle('')
                  setNewDescription('')
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateTopic}
                disabled={!newTitle.trim() || creating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
