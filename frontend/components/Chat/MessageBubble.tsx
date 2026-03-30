'use client'

import { Message } from '@/lib/types'

interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
}

// 处理消息内容，确保换行正确显示
function processContent(content: string): string {
  if (!content) return ''
  // 处理 literal \n (两个字符) -> 实际换行
  let result = content.replace(/\\n/g, '\n')
  result = result.replace(/\\t/g, '\t')
  result = result.replace(/\\r/g, '\r')
  return result
}

export default function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] px-4 py-3 rounded-2xl ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-4px'
            : 'bg-gray-100 text-gray-900 rounded-bl-4px'
        } ${isUser ? 'rounded-tl-[18px] rounded-tr-[18px] rounded-br-[4px] rounded-bl-[18px]' : 'rounded-tl-[18px] rounded-tr-[18px] rounded-br-[18px] rounded-bl-[4px]'}`}
      >
        <pre className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${isStreaming && !isUser ? 'cursor-blink' : ''}`}>
          {processContent(message.content)}
        </pre>

        {/* AI 生成中状态指示器 */}
        {isStreaming && !isUser && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs text-gray-400">生成中</span>
            <span className="flex gap-0.5">
              <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
              <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
              <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
