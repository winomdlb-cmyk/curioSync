'use client'

import { useState, useRef, KeyboardEvent } from 'react'

interface InputBarProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled?: boolean
  isThinking?: boolean // AI 刚发送还未开始输出
  retryMessage?: string | null
  onRetry?: () => void
}

export default function InputBar({ value, onChange, onSend, disabled, isThinking, retryMessage, onRetry }: InputBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  function adjustHeight() {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3">
      {retryMessage && (
        <div className="max-w-3xl mx-auto mb-2">
          <div className="flex items-center gap-2 text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <span>⚠ AI 回复失败</span>
            <button
              onClick={onRetry}
              className="ml-auto text-blue-600 hover:text-blue-700 font-medium"
            >
              重试
            </button>
          </div>
        </div>
      )}
      {isThinking && (
        <div className="max-w-3xl mx-auto mb-2">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="animate-pulse">AI 正在思考中...</span>
          </div>
        </div>
      )}
      <div className="max-w-3xl mx-auto flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => {
            onChange(e.target.value)
            adjustHeight()
          }}
          onKeyDown={handleKeyDown}
          placeholder="问点什么吧..."
          disabled={disabled}
          rows={1}
          className="flex-1 px-4 py-3 bg-gray-100 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-sm max-h-[120px] overflow-y-auto"
          style={{ minHeight: '48px' }}
        />
        <button
          onClick={onSend}
          disabled={!value.trim() || disabled}
          className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          ↑
        </button>
      </div>
    </div>
  )
}
