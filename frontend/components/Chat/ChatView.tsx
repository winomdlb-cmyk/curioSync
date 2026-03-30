'use client'

import { useState, useRef, useEffect } from 'react'
import { Message } from '@/lib/types'
import MessageBubble from './MessageBubble'
import InputBar from './InputBar'

interface ChatViewProps {
  topicTitle: string
  messages: Message[]
  onSendMessage: (content: string) => void
  retryMessage?: string | null
  onRetry?: () => void
}

export default function ChatView({ topicTitle, messages, onSendMessage, retryMessage, onRetry }: ChatViewProps) {
  const [inputValue, setInputValue] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isAIThinking, setIsAIThinking] = useState(false) // 刚发送还未开始输出
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isStreamingRef = useRef(false)

  useEffect(() => {
    const hasTempAI = messages.some(
      m => m.role === 'assistant' && m.id.startsWith('temp-ai-')
    )
    const lastAssistant = messages.filter(m => m.role === 'assistant').pop()
    const hasContent = lastAssistant && lastAssistant.content.length > 0

    isStreamingRef.current = hasTempAI
    setIsStreaming(hasTempAI)
    // 刚发送（temp消息存在）但还没有内容时，显示"思考中"
    setIsAIThinking(hasTempAI && !hasContent)
  }, [messages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // AI 回复结束后自动聚焦输入框
  useEffect(() => {
    if (!isStreaming && inputValue === '') {
      const textarea = document.querySelector('textarea')
      textarea?.focus()
    }
  }, [isStreaming, inputValue])

  function handleSend() {
    if (!inputValue.trim() || isStreaming) return
    onSendMessage(inputValue.trim())
    setInputValue('')
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="text-gray-400 text-lg mb-2">
              你好！这是关于「{topicTitle}」的对话
            </div>
            <div className="text-gray-400">
              从任何一个你好奇的问题开始吧 ✦
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                isStreaming={isStreamingRef.current && index === messages.length - 1 && message.role === 'assistant'}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <InputBar
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSend}
        disabled={isStreaming}
        isThinking={isAIThinking}
        retryMessage={retryMessage}
        onRetry={onRetry}
      />
    </div>
  )
}
