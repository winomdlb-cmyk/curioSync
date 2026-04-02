'use client'

import { useLocalRuntime, AssistantRuntimeProvider } from '@assistant-ui/react'
import {
  ThreadPrimitive,
  ComposerPrimitive,
  type AssistantRuntime,
} from '@assistant-ui/react'
import { useState, useCallback, useMemo } from 'react'
import { CurioMessage } from './CurioMessage'
import { createCurioChatModelAdapter, type InterventionCallback } from './CurioChatModelAdapter'
import { InterventionOverlay, type InterventionData } from './intervention/InterventionOverlay'

interface CurioThreadProps {
  conversationId: string
  topicId: string
  initialMessages?: any[]
  onNewMessage?: (message: any) => void
}

function CurioThreadContent({
  runtime,
  intervention,
  onDismissIntervention,
  onInterventionOption,
  onInterventionDirection,
}: {
  runtime: AssistantRuntime
  intervention: InterventionData | null
  onDismissIntervention: () => void
  onInterventionOption: (option: string) => void
  onInterventionDirection: (label: string) => void
}) {
  return (
    <div className="flex flex-col h-full">
      <ThreadPrimitive.Root className="flex flex-col h-full">
        <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto px-4 py-6">
          <ThreadPrimitive.Messages>
            {() => <CurioMessage />}
          </ThreadPrimitive.Messages>
        </ThreadPrimitive.Viewport>

        <div
          className="shrink-0 border-t px-4 py-4"
          style={{
            backgroundColor: 'var(--color-background)',
            borderColor: 'var(--color-border)'
          }}
        >
          <div className="max-w-3xl mx-auto">
            <div
              className="flex items-end gap-3 rounded-2xl px-4 py-3"
              style={{
                backgroundColor: 'var(--color-input)',
                border: '1px solid var(--color-border)'
              }}
            >
              <ComposerPrimitive.Input
                placeholder="问点什么吧..."
                className="flex-1 bg-transparent resize-none focus:outline-none text-sm"
                style={{
                  color: 'var(--color-foreground)',
                }}
              />
              <ComposerPrimitive.Send
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:opacity-90 disabled:opacity-50 shrink-0"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-primary-foreground)'
                }}
              >
                ↑
              </ComposerPrimitive.Send>
            </div>
            <p className="text-xs text-center mt-2" style={{ color: 'var(--color-muted-foreground)' }}>
              按 Enter 发送，Shift+Enter 换行
            </p>
          </div>
        </div>
      </ThreadPrimitive.Root>

      <InterventionOverlay
        intervention={intervention}
        onDismiss={onDismissIntervention}
        onOptionSelect={onInterventionOption}
        onDirectionClick={onInterventionDirection}
      />
    </div>
  )
}

export function CurioThread({
  conversationId,
  topicId,
  initialMessages = [],
  onNewMessage,
}: CurioThreadProps) {
  const [intervention, setIntervention] = useState<InterventionData | null>(null)

  const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/api/conversations/${conversationId}/chat`

  const handleIntervention: InterventionCallback = useCallback((interventionData) => {
    if (interventionData) {
      setIntervention({
        type: interventionData.type as 'converge' | 'transition' | 'bookmark',
        content: interventionData.content || {},
      })
    }
  }, [])

  const adapter = useMemo(
    () => createCurioChatModelAdapter(apiUrl, conversationId, topicId, handleIntervention),
    [apiUrl, conversationId, topicId, handleIntervention]
  )

  const runtime: AssistantRuntime = useLocalRuntime(adapter, {
    initialMessages: initialMessages,
  })

  const handleInterventionOption = useCallback((option: string) => {
    if (option.includes('整理') || option.includes('回顾')) {
      runtime.thread.append({
        content: [{ type: 'text', text: '请帮我整理一下目前学到的知识点' }],
        startRun: true,
      })
    }
  }, [runtime])

  const handleInterventionDirection = useCallback((label: string) => {
    runtime.thread.append({
      content: [{ type: 'text', text: `给我讲讲${label}` }],
      startRun: true,
    })
  }, [runtime])

  const handleDismissIntervention = useCallback(() => {
    setIntervention(null)
  }, [])

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <CurioThreadContent
        runtime={runtime}
        intervention={intervention}
        onDismissIntervention={handleDismissIntervention}
        onInterventionOption={handleInterventionOption}
        onInterventionDirection={handleInterventionDirection}
      />
    </AssistantRuntimeProvider>
  )
}
