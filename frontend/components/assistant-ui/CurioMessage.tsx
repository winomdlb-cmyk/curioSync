'use client'

import { memo } from 'react'
import { MessagePrimitive } from '@assistant-ui/react'
import { useAuiState } from '@assistant-ui/store'
import { cn } from '@/lib/utils'

const CurioMessageImpl = () => {
  const role = useAuiState((s) => s.message.role)
  const isUser = role === 'user'
  const isRunning = useAuiState((s) => s.message.status?.type === 'running')

  return (
    <MessagePrimitive.Root
      className={cn(
        'max-w-3xl mx-auto',
        isUser ? 'flex justify-end' : 'flex justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[70%] px-4 py-3 rounded-2xl rounded-tl-[18px] rounded-tr-[18px] shadow-sm',
          isUser
            ? 'rounded-br-4px'
            : 'rounded-bl-4px'
        )}
        style={{
          backgroundColor: isUser ? 'var(--color-primary)' : 'var(--color-card)',
          color: isUser ? 'var(--color-primary-foreground)' : 'var(--color-card-foreground)',
        }}
      >
        <MessagePrimitive.Content />

        {/* AI 生成中状态指示器 */}
        {isRunning && !isUser && (
          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-current/10">
            <span className="text-xs opacity-70">生成中</span>
            <span className="flex gap-0.5">
              <span className="w-1 h-1 rounded-full animate-bounce opacity-70" style={{ backgroundColor: 'currentColor', animationDelay: '0ms' }} />
              <span className="w-1 h-1 rounded-full animate-bounce opacity-70" style={{ backgroundColor: 'currentColor', animationDelay: '150ms' }} />
              <span className="w-1 h-1 rounded-full animate-bounce opacity-70" style={{ backgroundColor: 'currentColor', animationDelay: '300ms' }} />
            </span>
          </div>
        )}
      </div>
    </MessagePrimitive.Root>
  )
}

export const CurioMessage = memo(CurioMessageImpl)
CurioMessage.displayName = 'CurioMessage'
