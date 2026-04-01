'use client'

import { useState, useRef, useEffect } from 'react'
import { Message } from '@/lib/types'
import MessageBubble from './MessageBubble'
import InputBar from './InputBar'
import { Reasoning } from '@/components/assistant-ui/reasoning'

interface ChatViewProps {
  topicTitle: string
  messages: Message[]
  reasoningText?: string
  isStreaming?: boolean
  onSendMessage: (content: string) => void
  retryMessage?: string | null
  onRetry?: () => void
}

export default function ChatView({ topicTitle, messages, reasoningText = '', isStreaming = false, onSendMessage, retryMessage, onRetry }: ChatViewProps) {
  const [inputValue, setInputValue] = useState('')
  const [isAIThinking, setIsAIThinking] = useState(false) // 刚发送还未开始输出
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isStreamingRef = useRef(isStreaming)

  useEffect(() => {
    const hasTempAI = messages.some(
      m => m.role === 'assistant' && m.id.startsWith('temp-ai-')
    )
    const lastAssistant = messages.filter(m => m.role === 'assistant').pop()
    const hasContent = lastAssistant && lastAssistant.content.length > 0

    const streaming = hasTempAI || isStreaming
    isStreamingRef.current = streaming
    // 刚发送（temp消息存在）但还没有内容时，显示"思考中"
    setIsAIThinking(streaming && !hasContent)
  }, [messages, isStreaming])

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
            <div className="text-[--color-muted-foreground] text-lg mb-2">
              你好！这是关于「{topicTitle}」的对话
            </div>
            <div className="text-[--color-muted-foreground]">
              从任何一个你好奇的问题开始吧 ✦
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((message, index) => {
              const isLastAssistantMessage = isStreamingRef.current && index === messages.length - 1 && message.role === 'assistant'
              return (
                <div key={message.id}>
                  {isLastAssistantMessage && reasoningText && (
                    <Reasoning.Root defaultOpen={true}>
                      <Reasoning.Trigger active={isStreaming} />
                      <Reasoning.Content>
                        <Reasoning.Text>
                          <div className="text-muted-foreground text-sm">
                            {reasoningText}
                          </div>
                        </Reasoning.Text>
                      </Reasoning.Content>
                    </Reasoning.Root>
                  )}
                  <MessageBubble
                    message={message}
                    isStreaming={isLastAssistantMessage}
                  />
                </div>
              )
            })}
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
