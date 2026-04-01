'use client'

import { Message } from '@/lib/types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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
            ? 'bg-[--color-primary] text-[--color-primary-foreground] rounded-br-4px'
            : 'bg-[--color-accent] text-[--color-foreground] rounded-bl-4px'
        } ${isUser ? 'rounded-tl-[18px] rounded-tr-[18px] rounded-br-[4px] rounded-bl-[18px]' : 'rounded-tl-[18px] rounded-tr-[18px] rounded-br-[18px] rounded-bl-[4px]'}`}
      >
        {message.role === 'assistant' ? (
          <div className={isStreaming ? 'cursor-blink' : ''}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="text-sm leading-relaxed mb-2 last:mb-0">{children}</p>,
                h1: ({ children }) => <h1 className="text-lg font-semibold mb-2 mt-4 first:mt-0">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-semibold mb-2 mt-3 first:mt-0">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0">{children}</h3>,
                ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                code: ({ className, children }) => {
                  const isInline = !className?.includes('language-')
                  return isInline
                    ? <code className="bg-muted/50 px-1.5 py-0.5 rounded font-mono text-[0.85em]">{children}</code>
                    : <code className="block bg-muted/30 p-3 rounded-lg font-mono text-xs overflow-x-auto">{children}</code>
                },
                pre: ({ children }) => <pre className="bg-muted/30 p-3 rounded-lg font-mono text-xs overflow-x-auto mb-2 last:mb-0">{children}</pre>,
                blockquote: ({ children }) => <blockquote className="border-l-2 border-muted-foreground/30 pl-3 italic text-muted-foreground mb-2 last:mb-0">{children}</blockquote>,
                a: ({ href, children }) => <a href={href} className="text-primary underline underline-offset-2 hover:text-primary/80">{children}</a>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
              }}
            >
              {processContent(message.content)}
            </ReactMarkdown>
          </div>
        ) : (
          <pre className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {processContent(message.content)}
          </pre>
        )}

        {/* AI 生成中状态指示器 */}
        {isStreaming && !isUser && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs text-[--color-muted-foreground]">生成中</span>
            <span className="flex gap-0.5">
              <span className="w-1 h-1 bg-[--color-muted-foreground] rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
              <span className="w-1 h-1 bg-[--color-muted-foreground] rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
              <span className="w-1 h-1 bg-[--color-muted-foreground] rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
