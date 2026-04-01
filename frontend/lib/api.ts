const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

export interface StreamCallbacks {
  onReasoning: (text: string) => void
  onContent: (text: string) => void
  onNodeHint: (nodes: { new_nodes: any[]; updated_nodes: any[] }) => void
  onIntervention: (data: { type: string; content: any }) => void
  onGraphUpdate: (data: any) => void
  onDone: (data: { message_id: string; title_updated: boolean }) => void
  onError: (error: Error) => void
}

// Topics API
export async function getTopics(): Promise<{ topics: any[] }> {
  const res = await fetch(`${API_BASE_URL}/api/topics`)
  if (!res.ok) throw new Error('Failed to fetch topics')
  return res.json()
}

export async function getTopic(topicId: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/topics/${topicId}`)
  if (!res.ok) throw new Error('Failed to fetch topic')
  return res.json()
}

export async function createTopic(title: string, description?: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/topics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description }),
  })
  if (!res.ok) throw new Error('Failed to create topic')
  return res.json()
}

export async function deleteTopic(topicId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/topics/${topicId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete topic')
}

// Conversations API
export async function getConversations(topicId: string): Promise<{ conversations: any[] }> {
  const res = await fetch(`${API_BASE_URL}/api/conversations?topic_id=${topicId}`)
  if (!res.ok) throw new Error('Failed to fetch conversations')
  return res.json()
}

export async function createConversation(topicId: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic_id: topicId }),
  })
  if (!res.ok) throw new Error('Failed to create conversation')
  return res.json()
}

export async function getMessages(conversationId: string): Promise<{ messages: any[] }> {
  const res = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}/messages`)
  if (!res.ok) throw new Error('Failed to fetch messages')
  return res.json()
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete conversation')
}

// Chat API with SSE
export async function sendMessage(
  conversationId: string,
  topicId: string,
  content: string,
  callbacks: StreamCallbacks
): Promise<void> {
  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/conversations/${conversationId}/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, topic_id: topicId }),
      }
    )
  } catch (error) {
    callbacks.onError(new Error('网络错误，请检查连接'))
    return
  }

  if (!response.ok) {
    callbacks.onError(new Error('请求失败'))
    return
  }

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let currentEvent = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    const lines = chunk.split('\n')

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7).trim()
      } else if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6))
          switch (currentEvent) {
            case 'reasoning':
              callbacks.onReasoning(data.text)
              break
            case 'content':
              callbacks.onContent(data.text)
              break
            case 'node_hint':
              callbacks.onNodeHint(data)
              break
            case 'intervention':
              callbacks.onIntervention(data)
              break
            case 'graph_update':
              callbacks.onGraphUpdate(data)
              break
            case 'done':
              callbacks.onDone(data)
              break
          }
        } catch (e) {
          // JSON 解析失败，忽略
        }
      }
    }
  }
}

// Knowledge Graph API
export async function getKnowledgeGraph(topicId: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/knowledge/graph?topic_id=${topicId}`)
  if (!res.ok) throw new Error('Failed to fetch knowledge graph')
  return res.json()
}

export async function getNodeDetail(nodeId: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/knowledge/nodes/${nodeId}`)
  if (!res.ok) throw new Error('Failed to fetch node detail')
  return res.json()
}

export interface RelatedConversationItem {
  id: string
  title: string
  snippet: string
}

export async function getRelatedConversations(
  topicId: string,
  nodeLabel: string
): Promise<{ conversations: RelatedConversationItem[] }> {
  const encodedLabel = encodeURIComponent(nodeLabel)
  const res = await fetch(
    `${API_BASE_URL}/api/conversations/related?topic_id=${topicId}&node_label=${encodedLabel}`
  )
  if (!res.ok) throw new Error('Failed to fetch related conversations')
  return res.json()
}
