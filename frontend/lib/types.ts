export interface Topic {
  id: string
  title: string
  description?: string
  conversation_count: number
  node_count: number
  bookmark_count?: number
  updated_at?: string
}

export interface Conversation {
  id: string
  topic_id: string
  title: string
  message_count: number
  updated_at?: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  message_type: 'normal' | 'intervention_converge' | 'intervention_transition' | 'intervention_bookmark'
  metadata: Record<string, unknown>
  created_at: string
}

export interface KnowledgeNode {
  id: string
  label: string
  description?: string
  mastery_level: 'UNAWARE' | 'EXPOSED' | 'UNDERSTOOD'
  position: { x: number; y: number }
}

export interface KnowledgeEdge {
  id: string
  source: string
  target: string
  relation?: string
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[]
  edges: KnowledgeEdge[]
}

export interface NodeHint {
  label: string
  is_new?: boolean
  mastery_upgraded?: boolean
}

export interface InterventionData {
  type: 'converge' | 'transition' | 'bookmark'
  content: {
    summary?: string
    options?: string[]
    stage_summary?: string
    next_directions?: { label: string; description: string }[]
    bookmark_title?: string
    bookmark_description?: string
  }
}
