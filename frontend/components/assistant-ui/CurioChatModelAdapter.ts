'use client'

import type { ChatModelAdapter, ChatModelRunOptions } from '@assistant-ui/react'

type CurioMetadata = {
  node_hint?: {
    new_nodes: any[]
    updated_nodes: any[]
  }
  intervention?: {
    type: string
    content: any
  }
}

export type InterventionCallback = (intervention: CurioMetadata['intervention']) => void

export function createCurioChatModelAdapter(
  apiUrl: string,
  conversationId: string,
  topicId: string,
  onIntervention?: InterventionCallback
): ChatModelAdapter {
  return {
    async *run(options: ChatModelRunOptions) {
      const { abortSignal } = options

      // Extract user message from options
      const userMessages = options.messages.filter(m => m.role === 'user')
      const lastUserMessage = userMessages[userMessages.length - 1]
      const userContent = lastUserMessage?.content[0]?.type === 'text'
        ? (lastUserMessage.content[0] as any).text
        : ''

      if (!userContent) {
        return
      }

      // Call our backend API with streaming
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: userContent,
          topic_id: topicId,
          conversation_id: conversationId
        }),
        signal: abortSignal,
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      if (!response.body) {
        throw new Error('Response body is null')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let textContent = ''
      let curioMetadata: CurioMetadata = {}

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          buffer += chunk

          // Process complete lines
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmedLine = line.trim()
            if (!trimmedLine) continue

            const colonIndex = trimmedLine.indexOf(':')
            if (colonIndex === -1) continue

            const type = trimmedLine.slice(0, colonIndex)
            const jsonStr = trimmedLine.slice(colonIndex + 1)

            try {
              if (type === 'g') {
                // Reasoning delta - skip for now, handled by UI
              } else if (type === '0') {
                // Text delta
                const parsed = JSON.parse(jsonStr)
                const textDelta = parsed.textDelta || parsed
                textContent += textDelta

                // Yield running state with accumulated text
                yield {
                  content: [{ type: 'text' as const, text: textContent }],
                  status: { type: 'running' as const },
                }
              } else if (type === 'd') {
                // Done
                const data = JSON.parse(jsonStr)
                if (data.finishReason === 'stop') {
                  const usage = data.usage || {}
                  curioMetadata = usage.curioMetadata || {}

                  if (curioMetadata.intervention && onIntervention) {
                    onIntervention(curioMetadata.intervention)
                  }
                }
              } else if (type === '3') {
                // Error
                const errorMsg = JSON.parse(jsonStr)
                throw new Error(errorMsg)
              }
            } catch {
              // JSON parse error, skip
            }
          }
        }
      } finally {
        reader.releaseLock()
      }

      // Final complete message
      yield {
        content: textContent
          ? [{ type: 'text' as const, text: textContent }]
          : [],
        status: { type: 'complete' as const, reason: 'stop' as const },
        metadata: {
          unstable_state: curioMetadata,
        },
      }
    },
  }
}
